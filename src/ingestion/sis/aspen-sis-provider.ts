import type {
  SISProvider, SISStudent, SISReportCard, SISTranscript,
  SISAttendance, SISIEP, SISEQAOResult, SISRoster,
} from './sis-provider.js';

interface AspenConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Real Aspen (Follett) SIS provider — OAuth 2.0 REST API client.
 *
 * Aspen uses:
 * - Microsoft SQL Server backend
 * - RESTful endpoints (district-customizable)
 * - OAuth 2.0 Client Credentials flow
 * - XML/JSON exports (OnSIS-compliant)
 *
 * This provider is ready for credentials — all methods call the Aspen REST API
 * with proper auth headers and retry logic.
 */
export class AspenSISProvider implements SISProvider {
  readonly name = 'aspen';
  private config: AspenConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AspenConfig) {
    this.config = config;
  }

  private async ensureAuth(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const res = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!res.ok) {
      throw new Error(`Aspen OAuth failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    // Refresh 5 minutes before expiry
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    return this.accessToken!;
  }

  private async apiGet<T>(path: string): Promise<T> {
    const token = await this.ensureAuth();
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(`${this.config.baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (res.status === 401 && attempt < maxRetries) {
        // Token expired, refresh
        this.accessToken = null;
        await this.ensureAuth();
        continue;
      }

      if (res.status === 404) {
        return null as T;
      }

      if (!res.ok) {
        throw new Error(`Aspen API error: ${res.status} ${res.statusText} — ${path}`);
      }

      return res.json() as Promise<T>;
    }

    throw new Error(`Aspen API failed after ${maxRetries + 1} attempts: ${path}`);
  }

  async getStudent(oen: string): Promise<SISStudent | null> {
    return this.apiGet<SISStudent>(`/api/v1/students/${oen}`);
  }

  async getReportCards(oen: string): Promise<SISReportCard[]> {
    const result = await this.apiGet<{ report_cards: SISReportCard[] }>(
      `/api/v1/students/${oen}/report-cards`
    );
    return result?.report_cards || [];
  }

  async getTranscript(oen: string): Promise<SISTranscript | null> {
    return this.apiGet<SISTranscript>(`/api/v1/students/${oen}/transcript`);
  }

  async getAttendance(oen: string, schoolYear?: string): Promise<SISAttendance | null> {
    const qs = schoolYear ? `?school_year=${schoolYear}` : '';
    return this.apiGet<SISAttendance>(`/api/v1/students/${oen}/attendance${qs}`);
  }

  async getIEP(oen: string): Promise<SISIEP | null> {
    return this.apiGet<SISIEP>(`/api/v1/students/${oen}/iep`);
  }

  async getEQAO(oen: string): Promise<SISEQAOResult | null> {
    return this.apiGet<SISEQAOResult>(`/api/v1/students/${oen}/eqao`);
  }

  async getRoster(courseCode: string): Promise<SISRoster | null> {
    return this.apiGet<SISRoster>(`/api/v1/courses/${courseCode}/roster`);
  }

  async getSchoolStudents(schoolCode: string): Promise<SISStudent[]> {
    const result = await this.apiGet<{ students: SISStudent[] }>(
      `/api/v1/schools/${schoolCode}/students`
    );
    return result?.students || [];
  }
}
