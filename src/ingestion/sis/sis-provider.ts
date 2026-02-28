/**
 * SIS Provider interface — abstraction over Student Information Systems.
 * Implementations: MockSISProvider (dev), AspenSISProvider (production).
 */

export interface SISStudent {
  oen: string;
  legal_first_name: string;
  legal_last_name: string;
  preferred_name?: string;
  date_of_birth: string;
  gender: string;
  grade: number;
  school_code: string;
  school_name: string;
  status: 'active' | 'inactive' | 'transferred' | 'graduated';
  address?: {
    street: string;
    city: string;
    province: string;
    postal_code: string;
  };
  emergency_contacts?: {
    name: string;
    relationship: string;
    phone: string;
  }[];
}

export interface SISReportCard {
  school_year: string;
  term: string;
  grade: number;
  subjects: {
    name: string;
    strand_marks?: Record<string, string>;
    overall_mark?: string;
    learning_skills?: Record<string, string>;
    teacher_comment?: string;
  }[];
  gpa?: number;
  attendance_summary?: {
    days_absent: number;
    times_late: number;
  };
}

export interface SISTranscript {
  oen: string;
  credits_earned: number;
  credits_attempted: number;
  cumulative_gpa?: number;
  courses: {
    code: string;
    name: string;
    grade_level: number;
    final_mark: number;
    credit: number;
    completed_date: string;
  }[];
}

export interface SISAttendance {
  oen: string;
  school_year: string;
  summary: {
    total_school_days: number;
    present: number;
    late: number;
    absent_excused: number;
    absent_unexcused: number;
    attendance_rate_percent: number;
  };
  days: {
    date: string;
    status: 'present' | 'late' | 'absent_excused' | 'absent_unexcused';
    period?: string;
    reason?: string;
  }[];
}

export interface SISIEP {
  oen: string;
  exceptionality: string;
  placement: string;
  review_date: string;
  accommodations: string[];
  learning_expectations: {
    subject: string;
    expectation: string;
    strategies: string[];
  }[];
}

export interface SISEQAOResult {
  oen: string;
  results: {
    assessment: string;
    year: string;
    grade_level: number;
    score: number;
    level: string;
    percentile?: number;
  }[];
}

export interface SISRoster {
  course_code: string;
  course_name: string;
  teacher_name: string;
  school_year: string;
  students: {
    oen: string;
    name: string;
    grade: number;
  }[];
}

export interface SISProvider {
  readonly name: string;

  getStudent(oen: string): Promise<SISStudent | null>;
  getReportCards(oen: string): Promise<SISReportCard[]>;
  getTranscript(oen: string): Promise<SISTranscript | null>;
  getAttendance(oen: string, schoolYear?: string): Promise<SISAttendance | null>;
  getIEP(oen: string): Promise<SISIEP | null>;
  getEQAO(oen: string): Promise<SISEQAOResult | null>;
  getRoster(courseCode: string): Promise<SISRoster | null>;
  getSchoolStudents(schoolCode: string): Promise<SISStudent[]>;
}
