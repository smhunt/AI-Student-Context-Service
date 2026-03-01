import type {
  SISProvider, SISStudent, SISReportCard, SISTranscript,
  SISAttendance, SISIEP, SISEQAOResult, SISRoster,
} from './sis-provider.js';

interface OneRosterConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

/**
 * OneRoster 1.1 SIS Provider — implements SISProvider via IMS Global OneRoster standard.
 *
 * Works with any SIS that supports OneRoster 1.1 (Aspen, PowerSchool, Veracross, etc.)
 * Uses OAuth 2.0 client credentials for authentication.
 *
 * Standard endpoints:
 *  - /ims/oneroster/v1p1/users
 *  - /ims/oneroster/v1p1/enrollments
 *  - /ims/oneroster/v1p1/classes
 *  - /ims/oneroster/v1p1/results
 *  - /ims/oneroster/v1p1/academicSessions
 */
export class OneRosterSISProvider implements SISProvider {
  readonly name = 'oneroster';

  private config: OneRosterConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: OneRosterConfig) {
    this.config = config;
  }

  async getStudent(oen: string): Promise<SISStudent | null> {
    const token = await this.getToken();

    // OneRoster uses sourcedId — search by identifier (OEN)
    const response = await this.request(token, `/users?filter=identifier='${oen}'`);
    const users = response?.users;

    if (!users || users.length === 0) return null;

    const user = users[0];
    return this.mapUserToStudent(user);
  }

  async getReportCards(oen: string): Promise<SISReportCard[]> {
    const token = await this.getToken();

    // Find student by OEN
    const studentResponse = await this.request(token, `/users?filter=identifier='${oen}'`);
    const student = studentResponse?.users?.[0];
    if (!student) return [];

    // Get results (grades) for this student
    const resultsResponse = await this.request(token, `/students/${student.sourcedId}/results`);
    const results = resultsResponse?.results || [];

    if (results.length === 0) return [];

    // Group results by academic session (term)
    const bySession = new Map<string, any[]>();
    for (const result of results) {
      const sessionId = result.lineItem?.class?.course?.schoolYear?.sourcedId || 'unknown';
      const list = bySession.get(sessionId) ?? [];
      list.push(result);
      bySession.set(sessionId, list);
    }

    const reportCards: SISReportCard[] = [];
    for (const [sessionId, sessionResults] of bySession) {
      const subjects = sessionResults.map((r: any) => ({
        name: r.lineItem?.title || 'Unknown Subject',
        overall_mark: r.score?.toString(),
        teacher_comment: r.comment,
      }));

      reportCards.push({
        school_year: sessionId,
        term: 'Full Year',
        grade: parseInt(student.grades?.[0] || '0', 10),
        subjects,
      });
    }

    return reportCards;
  }

  async getTranscript(oen: string): Promise<SISTranscript | null> {
    const token = await this.getToken();

    const studentResponse = await this.request(token, `/users?filter=identifier='${oen}'`);
    const student = studentResponse?.users?.[0];
    if (!student) return null;

    const resultsResponse = await this.request(token, `/students/${student.sourcedId}/results`);
    const results = resultsResponse?.results || [];

    if (results.length === 0) return null;

    const courses = results
      .filter((r: any) => r.resultStatus === 'final')
      .map((r: any) => ({
        code: r.lineItem?.class?.course?.courseCode || 'N/A',
        name: r.lineItem?.class?.title || 'Unknown',
        grade_level: parseInt(student.grades?.[0] || '0', 10),
        final_mark: parseFloat(r.score || '0'),
        credit: 1,
        completed_date: r.date || '',
      }));

    return {
      oen,
      credits_earned: courses.length,
      credits_attempted: courses.length,
      courses,
    };
  }

  async getAttendance(oen: string, _schoolYear?: string): Promise<SISAttendance | null> {
    // OneRoster 1.1 does not include attendance endpoints
    // Attendance data would come from a custom extension or separate API
    return null;
  }

  async getIEP(oen: string): Promise<SISIEP | null> {
    // IEP data is not part of the OneRoster standard
    // Would need custom extension or separate API
    return null;
  }

  async getEQAO(oen: string): Promise<SISEQAOResult | null> {
    // EQAO results are Ontario-specific and not part of OneRoster
    return null;
  }

  async getRoster(courseCode: string): Promise<SISRoster | null> {
    const token = await this.getToken();

    // Search classes by courseCode
    const classResponse = await this.request(token, `/classes?filter=courseCode='${courseCode}'`);
    const cls = classResponse?.classes?.[0];
    if (!cls) return null;

    // Get enrollments for this class
    const enrollmentResponse = await this.request(token, `/classes/${cls.sourcedId}/enrollments`);
    const enrollments = enrollmentResponse?.enrollments || [];

    const studentEnrollments = enrollments.filter((e: any) => e.role === 'student');
    const teacherEnrollment = enrollments.find((e: any) => e.role === 'teacher');

    const students = studentEnrollments.map((e: any) => ({
      oen: e.user?.identifier || '',
      name: `${e.user?.givenName || ''} ${e.user?.familyName || ''}`.trim(),
      grade: parseInt(e.user?.grades?.[0] || '0', 10),
    }));

    return {
      course_code: courseCode,
      course_name: cls.title || courseCode,
      teacher_name: teacherEnrollment
        ? `${teacherEnrollment.user?.givenName || ''} ${teacherEnrollment.user?.familyName || ''}`.trim()
        : 'Unknown',
      school_year: cls.schoolYear?.title || '',
      students,
    };
  }

  async getSchoolStudents(schoolCode: string): Promise<SISStudent[]> {
    const token = await this.getToken();

    // Find school (org) by identifier
    const orgResponse = await this.request(token, `/orgs?filter=identifier='${schoolCode}'`);
    const org = orgResponse?.orgs?.[0];
    if (!org) return [];

    // Get students enrolled at this school
    const enrollmentResponse = await this.request(
      token,
      `/schools/${org.sourcedId}/enrollments?filter=role='student'&limit=1000`
    );
    const enrollments = enrollmentResponse?.enrollments || [];

    return enrollments.map((e: any) => this.mapUserToStudent(e.user)).filter(Boolean) as SISStudent[];
  }

  // --- Private helpers ---

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 30_000) {
      return this.accessToken;
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'https://purl.imsglobal.org/spec/or/v1p1/scope/roster-core.readonly https://purl.imsglobal.org/spec/or/v1p1/scope/gradebook.readonly',
    });

    const response = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`OneRoster OAuth failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

    return this.accessToken!;
  }

  private async request(token: string, endpoint: string): Promise<any> {
    const url = `${this.config.baseUrl}/ims/oneroster/v1p1${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`OneRoster API error: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  private mapUserToStudent(user: any): SISStudent | null {
    if (!user) return null;

    return {
      oen: user.identifier || '',
      legal_first_name: user.givenName || '',
      legal_last_name: user.familyName || '',
      preferred_name: user.middleName || undefined,
      date_of_birth: user.dateOfBirth || '',
      gender: user.sex || '',
      grade: parseInt(user.grades?.[0] || '0', 10),
      school_code: user.orgs?.[0]?.identifier || '',
      school_name: user.orgs?.[0]?.name || '',
      status: user.status === 'active' ? 'active' : 'inactive',
    };
  }
}
