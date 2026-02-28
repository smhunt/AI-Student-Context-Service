import type {
  SISProvider, SISStudent, SISReportCard, SISTranscript,
  SISAttendance, SISIEP, SISEQAOResult, SISRoster,
} from './sis-provider.js';
import {
  getStudentByOEN, getReportCardsByOEN, getTranscriptByOEN,
  getAttendanceByOEN, getIEPByOEN, getEQAOByOEN,
  getRosterByCourseCode, getSchoolStudentsByCode,
} from '../../sis/mock-data.js';

/**
 * Mock SIS provider wrapping existing mock-data.ts.
 * Used in development when SIS_PROVIDER=mock.
 *
 * Adapts the mock data's Ontario-specific field names to the generic SISProvider interface.
 */
export class MockSISProvider implements SISProvider {
  readonly name = 'mock';

  async getStudent(oen: string): Promise<SISStudent | null> {
    const s = getStudentByOEN(oen);
    if (!s) return null;
    return {
      oen: s.oen,
      legal_first_name: s.legal_first_name,
      legal_last_name: s.legal_last_name,
      preferred_name: s.preferred_first_name || undefined,
      date_of_birth: s.date_of_birth,
      gender: s.gender,
      grade: s.grade,
      school_code: s.current_school.school_code,
      school_name: s.current_school.school_name,
      status: s.status,
      address: s.address,
      emergency_contacts: s.emergency_contacts.map((ec) => ({
        name: ec.name,
        relationship: ec.relationship,
        phone: ec.phone,
      })),
    };
  }

  async getReportCards(oen: string): Promise<SISReportCard[]> {
    const cards = getReportCardsByOEN(oen);
    return cards.map((rc: any) => ({
      school_year: rc.school_year,
      term: rc.term,
      grade: rc.grade,
      subjects: rc.subjects.map((sub: any) => ({
        name: sub.name,
        strand_marks: sub.strand_marks,
        overall_mark: sub.overall_mark,
        learning_skills: sub.learning_skills,
        teacher_comment: sub.teacher_comment,
      })),
      gpa: rc.gpa,
      attendance_summary: rc.attendance_summary,
    }));
  }

  async getTranscript(oen: string): Promise<SISTranscript | null> {
    const t = getTranscriptByOEN(oen) as any;
    if (!t) return null;
    return {
      oen: t.oen,
      credits_earned: t.credits_earned,
      credits_attempted: t.credits_attempted,
      cumulative_gpa: t.cumulative_gpa,
      courses: t.courses.map((c: any) => ({
        code: c.code,
        name: c.name,
        grade_level: c.grade_level,
        final_mark: c.final_mark,
        credit: c.credit,
        completed_date: c.completed_date,
      })),
    };
  }

  async getAttendance(oen: string): Promise<SISAttendance | null> {
    const a = getAttendanceByOEN(oen) as any;
    if (!a) return null;
    return {
      oen: a.oen,
      school_year: a.school_year,
      summary: a.summary,
      days: a.days,
    };
  }

  async getIEP(oen: string): Promise<SISIEP | null> {
    const iep = getIEPByOEN(oen) as any;
    if (!iep) return null;
    return {
      oen: iep.oen,
      exceptionality: iep.exceptionality,
      placement: iep.placement,
      review_date: iep.review_date,
      accommodations: iep.accommodations,
      learning_expectations: iep.learning_expectations,
    };
  }

  async getEQAO(oen: string): Promise<SISEQAOResult | null> {
    const e = getEQAOByOEN(oen) as any;
    if (!e) return null;
    return { oen: e.oen, results: e.results };
  }

  async getRoster(courseCode: string): Promise<SISRoster | null> {
    const r = getRosterByCourseCode(courseCode) as any;
    if (!r) return null;
    return {
      course_code: r.course_code,
      course_name: r.course_name,
      teacher_name: r.teacher_name,
      school_year: r.school_year,
      students: r.students,
    };
  }

  async getSchoolStudents(schoolCode: string): Promise<SISStudent[]> {
    const result = getSchoolStudentsByCode(schoolCode) as any;
    if (!result) return [];
    return result.students.map((s: any) => ({
      oen: s.oen,
      legal_first_name: s.name.split(' ')[0] || '',
      legal_last_name: s.name.split(' ').slice(1).join(' ') || '',
      date_of_birth: '',
      gender: '',
      grade: s.grade,
      school_code: schoolCode,
      school_name: result.school_name,
      status: s.status,
    }));
  }
}
