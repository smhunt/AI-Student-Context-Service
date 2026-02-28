/**
 * SIS (Student Information System) Mock Data
 *
 * Realistic Ontario student data following Aspen (Follett) / OnSIS field formats.
 * TVDSB (Thames Valley District School Board) — Board code 66.
 *
 * Reference frameworks:
 *   - Ontario Growing Success (2010) — assessment & evaluation policy
 *   - Ontario Student Transcript (OST) — credit tracking
 *   - Ontario Provincial Report Card templates
 *   - IPRC / IEP standards
 *   - EQAO assessment reporting
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Ontario Education Number — 9-digit unique student identifier */
export type OEN = string;

export type LearningSkillRating = 'E' | 'G' | 'S' | 'N';

export interface LearningSkills {
  responsibility: LearningSkillRating;
  organization: LearningSkillRating;
  independent_work: LearningSkillRating;
  collaboration: LearningSkillRating;
  initiative: LearningSkillRating;
  self_regulation: LearningSkillRating;
}

export type AchievementLevel = 'Level 4' | 'Level 3' | 'Level 2' | 'Level 1' | 'Below Level 1';

export type AttendanceStatus = 'present' | 'late' | 'absent_excused' | 'absent_unexcused';

export type ConsentStatusSIS = 'pending' | 'granted' | 'denied' | 'revoked';

// ---------------------------------------------------------------------------
// Student demographics
// ---------------------------------------------------------------------------

export interface SISStudent {
  oen: OEN;
  legal_first_name: string;
  legal_last_name: string;
  preferred_first_name: string | null;
  date_of_birth: string; // ISO date
  gender: string;
  address: {
    street: string;
    city: string;
    province: string;
    postal_code: string;
  };
  phone_home: string;
  emergency_contacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    priority: number;
  }>;
  current_school: {
    board_code: string;
    school_code: string;
    school_name: string;
    school_bsid: string; // Board School Identification Number
  };
  grade: number;
  homeroom: string;
  status: 'active' | 'inactive' | 'transferred' | 'graduated';
  enrollment_date: string;
  first_language: string;
  canadian_citizen: boolean;
  indigenous_self_identification: boolean;
  french_immersion: boolean;
  transportation: boolean;
  photo_consent: boolean;
}

// ---------------------------------------------------------------------------
// Report card
// ---------------------------------------------------------------------------

export interface ReportCardStrand {
  strand: string;
  achievement_level: AchievementLevel;
  percentage: number;
  comment: string;
}

export interface ReportCardSubject {
  course_code: string;
  course_name: string;
  teacher_name: string;
  strands: ReportCardStrand[];
  overall_percentage: number;
  overall_level: AchievementLevel;
  learning_skills: LearningSkills;
  teacher_comment: string;
  median_class_mark: number;
}

export interface ReportCard {
  oen: OEN;
  student_name: string;
  school_name: string;
  school_year: string;
  grade: number;
  term: 'Term 1' | 'Term 2' | 'Final' | 'Midterm';
  semester: number;
  reporting_period: string; // e.g. "September 2025 - January 2026"
  subjects: ReportCardSubject[];
  days_absent: number;
  times_late: number;
  principal_name: string;
  generated_date: string;
}

// ---------------------------------------------------------------------------
// Ontario Student Transcript (OST)
// ---------------------------------------------------------------------------

export interface TranscriptEntry {
  course_code: string;
  course_name: string;
  grade_level: number;
  credit_value: number;
  final_mark: number | null; // null = in progress
  credit_earned: boolean;
  compulsory: boolean;
  school_year: string;
  semester: number;
  school_name: string;
  note: string | null; // e.g. 'Repeated', 'Withdrawn', 'Transfer'
}

export interface TranscriptSummary {
  oen: OEN;
  student_name: string;
  date_of_birth: string;
  date_entered_grade_9: string;
  entries: TranscriptEntry[];
  compulsory_credits_earned: number;
  optional_credits_earned: number;
  total_credits_earned: number;
  community_involvement_hours: number;
  community_involvement_complete: boolean; // 40 hours required
  osslt_status: 'completed' | 'deferred' | 'not_yet_eligible' | 'adjudicated';
  ossd_requirements_met: boolean;
  shsm_sector: string | null; // Specialist High Skills Major
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export interface AttendanceDay {
  date: string; // ISO date
  status: AttendanceStatus;
  periods: {
    period: number;
    status: AttendanceStatus;
    course_code: string;
  }[];
  note: string | null;
}

export interface AttendanceRecord {
  oen: OEN;
  student_name: string;
  school_year: string;
  semester: number;
  days: AttendanceDay[];
  summary: {
    total_school_days: number;
    present: number;
    late: number;
    absent_excused: number;
    absent_unexcused: number;
    attendance_rate_percent: number;
  };
}

// ---------------------------------------------------------------------------
// IEP (Individual Education Plan)
// ---------------------------------------------------------------------------

export type OntarioExceptionality =
  | 'Learning Disability'
  | 'Giftedness'
  | 'Autism Spectrum Disorder'
  | 'Developmental Disability'
  | 'Behaviour'
  | 'Speech Impairment'
  | 'Language Impairment'
  | 'Physical Disability'
  | 'Blind and Low Vision'
  | 'Deaf and Hard of Hearing'
  | 'Multiple Exceptionalities'
  | 'Mild Intellectual Disability';

export type PlacementSetting =
  | 'Regular class with indirect support'
  | 'Regular class with resource assistance'
  | 'Regular class with withdrawal assistance'
  | 'Special education class with partial integration'
  | 'Special education class full-time';

export interface IEPAccommodation {
  category: 'instructional' | 'environmental' | 'assessment';
  description: string;
}

export interface IEPGoal {
  subject_area: string;
  current_level: string;
  annual_goal: string;
  specific_expectations: string[];
  assessment_methods: string[];
}

export interface IEPTransitionPlan {
  post_secondary_goals: string[];
  actions: string[];
  responsible_persons: string[];
  timeline: string;
}

export interface IEPRecord {
  oen: OEN;
  student_name: string;
  date_of_birth: string;
  school_name: string;
  grade: number;
  iprc_date: string; // Most recent IPRC meeting date
  iprc_exceptionality: OntarioExceptionality;
  placement: PlacementSetting;
  iep_start_date: string;
  iep_review_date: string;
  case_conference_date: string | null;
  reason_for_iep: string;
  student_strengths: string[];
  student_needs: string[];
  accommodations: IEPAccommodation[];
  goals: IEPGoal[];
  transition_plan: IEPTransitionPlan | null;
  human_resources: Array<{
    name: string;
    role: string;
    allocation: string; // e.g. "2 periods/week"
  }>;
  parent_consultation_date: string;
  student_consultation: boolean;
  principal_name: string;
  iep_developed_by: string;
}

// ---------------------------------------------------------------------------
// EQAO Results
// ---------------------------------------------------------------------------

export type EQAOAssessmentType =
  | 'primary_reading'
  | 'primary_writing'
  | 'primary_mathematics'
  | 'junior_reading'
  | 'junior_writing'
  | 'junior_mathematics'
  | 'grade_9_mathematics'
  | 'osslt';

export interface EQAOResult {
  assessment_type: EQAOAssessmentType;
  assessment_year: string;
  grade_at_time: number;
  level: AchievementLevel | null;
  percentage: number | null;
  status: 'completed' | 'deferred' | 'exempt' | 'absent';
  school_name: string;
}

export interface EQAORecord {
  oen: OEN;
  student_name: string;
  results: EQAOResult[];
}

// ---------------------------------------------------------------------------
// Course roster
// ---------------------------------------------------------------------------

export interface RosterStudent {
  oen: OEN;
  legal_first_name: string;
  legal_last_name: string;
  preferred_first_name: string | null;
  grade: number;
  homeroom: string;
  iep_flag: boolean;
  current_mark: number | null;
}

export interface CourseRoster {
  course_code: string;
  course_name: string;
  section: string;
  teacher_name: string;
  semester: number;
  period: number;
  room: string;
  school_name: string;
  school_year: string;
  students: RosterStudent[];
}

// ---------------------------------------------------------------------------
// School student list
// ---------------------------------------------------------------------------

export interface SchoolStudentSummary {
  oen: OEN;
  legal_first_name: string;
  legal_last_name: string;
  grade: number;
  homeroom: string;
  status: 'active' | 'inactive' | 'transferred';
  iep_flag: boolean;
  attendance_rate_percent: number;
}

export interface SchoolStudentList {
  school_code: string;
  school_name: string;
  school_year: string;
  total_students: number;
  students: SchoolStudentSummary[];
}

// ---------------------------------------------------------------------------
// Webhook payload
// ---------------------------------------------------------------------------

export interface SISWebhookPayload {
  event_type: 'student_updated' | 'grade_posted' | 'attendance_updated' | 'iep_updated' | 'enrollment_changed';
  oen: OEN;
  school_code: string;
  board_code: string;
  timestamp: string;
  changes: Record<string, unknown>;
}

// ============================================================================
// MOCK DATA — Alex Johnson (OEN 123456789)
// ============================================================================

// ---------------------------------------------------------------------------
// Student demographics
// ---------------------------------------------------------------------------

export const MOCK_STUDENT_ALEX: SISStudent = {
  oen: '123456789',
  legal_first_name: 'Alexander',
  legal_last_name: 'Johnson',
  preferred_first_name: 'Alex',
  date_of_birth: '2010-04-15',
  gender: 'M',
  address: {
    street: '142 Fanshawe Park Road East',
    city: 'London',
    province: 'ON',
    postal_code: 'N5X 1L3',
  },
  phone_home: '519-555-0142',
  emergency_contacts: [
    {
      name: 'Maria Johnson',
      relationship: 'Mother',
      phone: '519-555-0143',
      priority: 1,
    },
    {
      name: 'Robert Johnson',
      relationship: 'Father',
      phone: '519-555-0144',
      priority: 2,
    },
  ],
  current_school: {
    board_code: '66',
    school_code: '666301',
    school_name: 'Medway High School',
    school_bsid: '666301',
  },
  grade: 10,
  homeroom: '10A',
  status: 'active',
  enrollment_date: '2024-09-03',
  first_language: 'English',
  canadian_citizen: true,
  indigenous_self_identification: false,
  french_immersion: false,
  transportation: true,
  photo_consent: true,
};

// ---------------------------------------------------------------------------
// Additional mock students for roster / school list
// ---------------------------------------------------------------------------

const MOCK_STUDENT_EMMA: Partial<SISStudent> = {
  oen: '123456790',
  legal_first_name: 'Emma',
  legal_last_name: 'Thompson',
  preferred_first_name: null,
  grade: 10,
  homeroom: '10A',
  status: 'active',
};

const MOCK_STUDENT_JAMAL: Partial<SISStudent> = {
  oen: '123456791',
  legal_first_name: 'Jamal',
  legal_last_name: 'Okafor',
  preferred_first_name: null,
  grade: 10,
  homeroom: '10B',
  status: 'active',
};

const MOCK_STUDENT_PRIYA: Partial<SISStudent> = {
  oen: '123456792',
  legal_first_name: 'Priya',
  legal_last_name: 'Patel',
  preferred_first_name: null,
  grade: 10,
  homeroom: '10A',
  status: 'active',
};

const MOCK_STUDENT_LUCAS: Partial<SISStudent> = {
  oen: '123456793',
  legal_first_name: 'Lucas',
  legal_last_name: 'Martin',
  preferred_first_name: 'Luke',
  grade: 10,
  homeroom: '10B',
  status: 'active',
};

const MOCK_STUDENT_SOPHIE: Partial<SISStudent> = {
  oen: '123456794',
  legal_first_name: 'Sophie',
  legal_last_name: 'Lavoie',
  preferred_first_name: null,
  grade: 10,
  homeroom: '10A',
  status: 'active',
};

// ---------------------------------------------------------------------------
// Report cards — Semester 1 (Fall 2025)
// ---------------------------------------------------------------------------

export const MOCK_REPORT_CARDS_ALEX: ReportCard[] = [
  {
    oen: '123456789',
    student_name: 'Alexander Johnson',
    school_name: 'Medway High School',
    school_year: '2025-2026',
    grade: 10,
    term: 'Midterm',
    semester: 1,
    reporting_period: 'September 2025 - November 2025',
    subjects: [
      {
        course_code: 'MPM2D',
        course_name: 'Principles of Mathematics',
        teacher_name: 'Ms. S. Chen',
        strands: [
          {
            strand: 'Knowledge and Understanding',
            achievement_level: 'Level 3',
            percentage: 75,
            comment: 'Demonstrates understanding of linear and quadratic relations concepts.',
          },
          {
            strand: 'Thinking',
            achievement_level: 'Level 3',
            percentage: 72,
            comment: 'Applies problem-solving strategies with growing consistency.',
          },
          {
            strand: 'Communication',
            achievement_level: 'Level 4',
            percentage: 85,
            comment: 'Communicates mathematical reasoning clearly using appropriate terminology.',
          },
          {
            strand: 'Application',
            achievement_level: 'Level 3',
            percentage: 78,
            comment: 'Connects mathematical concepts to real-world situations effectively.',
          },
        ],
        overall_percentage: 77,
        overall_level: 'Level 3',
        learning_skills: {
          responsibility: 'G',
          organization: 'G',
          independent_work: 'E',
          collaboration: 'E',
          initiative: 'G',
          self_regulation: 'G',
        },
        teacher_comment:
          'Alex has demonstrated a solid understanding of the concepts covered in the linear systems unit. His ability to communicate mathematical reasoning is a notable strength, consistently earning Level 4 in this category. Alex participates actively in class discussions and is always willing to help peers during group work. To continue improving, Alex should focus on showing complete solutions on assessments and verifying answers before submitting. Continued practice with multi-step problems will strengthen his analytical thinking skills. Overall, Alex is on track for a successful semester.',
        median_class_mark: 73,
      },
      {
        course_code: 'ENG2D',
        course_name: 'English',
        teacher_name: 'Mr. R. Blackwell',
        strands: [
          {
            strand: 'Knowledge and Understanding',
            achievement_level: 'Level 3',
            percentage: 74,
            comment: 'Shows understanding of literary elements and text forms.',
          },
          {
            strand: 'Thinking',
            achievement_level: 'Level 3',
            percentage: 76,
            comment: 'Develops interpretations and supports ideas with relevant evidence.',
          },
          {
            strand: 'Communication',
            achievement_level: 'Level 4',
            percentage: 82,
            comment: 'Writes with clarity and demonstrates effective use of language conventions.',
          },
          {
            strand: 'Application',
            achievement_level: 'Level 3',
            percentage: 73,
            comment: 'Makes connections between texts and personal experiences.',
          },
        ],
        overall_percentage: 76,
        overall_level: 'Level 3',
        learning_skills: {
          responsibility: 'G',
          organization: 'S',
          independent_work: 'G',
          collaboration: 'E',
          initiative: 'G',
          self_regulation: 'G',
        },
        teacher_comment:
          'Alex is a thoughtful contributor to class discussions and demonstrates genuine interest in the texts we study. His written work shows strong communication skills, particularly in his persuasive essay on media literacy. Alex would benefit from more consistent organization of his notes and assignment materials. His analysis of character motivation in our novel study showed improving critical thinking skills. I encourage Alex to read independently beyond class requirements to further develop his vocabulary and analytical abilities.',
        median_class_mark: 71,
      },
      {
        course_code: 'SNC2D',
        course_name: 'Science',
        teacher_name: 'Dr. K. Ramirez',
        strands: [
          {
            strand: 'Knowledge and Understanding',
            achievement_level: 'Level 3',
            percentage: 78,
            comment: 'Demonstrates solid understanding of scientific concepts and terminology.',
          },
          {
            strand: 'Thinking and Investigation',
            achievement_level: 'Level 4',
            percentage: 83,
            comment: 'Designs and conducts investigations with thoroughness and precision.',
          },
          {
            strand: 'Communication',
            achievement_level: 'Level 3',
            percentage: 76,
            comment: 'Presents scientific information using appropriate formats and conventions.',
          },
          {
            strand: 'Application',
            achievement_level: 'Level 3',
            percentage: 79,
            comment: 'Applies scientific knowledge to solve problems and make informed decisions.',
          },
        ],
        overall_percentage: 79,
        overall_level: 'Level 3',
        learning_skills: {
          responsibility: 'G',
          organization: 'G',
          independent_work: 'G',
          collaboration: 'E',
          initiative: 'E',
          self_regulation: 'G',
        },
        teacher_comment:
          'Alex has shown excellent initiative in our chemistry unit, particularly during the lab investigations where he demonstrated strong experimental design skills. His lab reports are thorough and well-organized. Alex asks insightful questions during class and is an asset during group laboratory work. He should continue to strengthen his understanding of chemical bonding theory through additional practice problems. Alex has the potential to achieve at the Level 4 standard with continued effort and focus on the knowledge and understanding category.',
        median_class_mark: 74,
      },
      {
        course_code: 'CHC2D',
        course_name: 'Canadian History Since World War I',
        teacher_name: 'Ms. A. Fontaine',
        strands: [
          {
            strand: 'Knowledge and Understanding',
            achievement_level: 'Level 3',
            percentage: 71,
            comment: 'Demonstrates understanding of significant events and developments in Canadian history.',
          },
          {
            strand: 'Thinking',
            achievement_level: 'Level 3',
            percentage: 73,
            comment: 'Analyzes historical events using the concepts of historical thinking.',
          },
          {
            strand: 'Communication',
            achievement_level: 'Level 3',
            percentage: 75,
            comment: 'Communicates ideas and arguments with reasonable clarity.',
          },
          {
            strand: 'Application',
            achievement_level: 'Level 3',
            percentage: 70,
            comment: 'Makes connections between historical and contemporary issues.',
          },
        ],
        overall_percentage: 72,
        overall_level: 'Level 3',
        learning_skills: {
          responsibility: 'G',
          organization: 'S',
          independent_work: 'G',
          collaboration: 'G',
          initiative: 'S',
          self_regulation: 'G',
        },
        teacher_comment:
          'Alex demonstrates a genuine curiosity about Canadian history. He engages well in class discussions about the impact of World War I on Canadian identity. Alex completed his inquiry project on the Winnipeg General Strike with satisfactory depth. Moving forward, Alex should aim to incorporate a wider range of primary sources in his research and dedicate more time to reviewing key terms and dates. His collaborative skills are an asset during group activities, and I encourage him to take on more of a leadership role in these settings.',
        median_class_mark: 70,
      },
    ],
    days_absent: 3,
    times_late: 5,
    principal_name: 'Ms. L. Park',
    generated_date: '2025-11-14',
  },
  {
    oen: '123456789',
    student_name: 'Alexander Johnson',
    school_name: 'Medway High School',
    school_year: '2025-2026',
    grade: 10,
    term: 'Final',
    semester: 1,
    reporting_period: 'September 2025 - January 2026',
    subjects: [
      {
        course_code: 'MPM2D',
        course_name: 'Principles of Mathematics',
        teacher_name: 'Ms. S. Chen',
        strands: [
          {
            strand: 'Knowledge and Understanding',
            achievement_level: 'Level 3',
            percentage: 78,
            comment: 'Demonstrates solid understanding of linear systems and quadratic relations.',
          },
          {
            strand: 'Thinking',
            achievement_level: 'Level 3',
            percentage: 75,
            comment: 'Applies critical thinking and problem-solving strategies consistently.',
          },
          {
            strand: 'Communication',
            achievement_level: 'Level 4',
            percentage: 87,
            comment: 'Communicates mathematical ideas with clarity, precision, and proper notation.',
          },
          {
            strand: 'Application',
            achievement_level: 'Level 4',
            percentage: 80,
            comment: 'Transfers concepts to new contexts and real-world problems effectively.',
          },
        ],
        overall_percentage: 80,
        overall_level: 'Level 4',
        learning_skills: {
          responsibility: 'G',
          organization: 'G',
          independent_work: 'E',
          collaboration: 'E',
          initiative: 'G',
          self_regulation: 'G',
        },
        teacher_comment:
          'Alex demonstrated consistent growth throughout the semester, improving from 77% at midterm to 80% overall. His strongest area remains communication, where he consistently expresses mathematical reasoning with clarity. The quadratic relations unit was a highlight for Alex, where his investigation into parabolic trajectories earned Level 4 standing. Alex has developed stronger habits of checking his work and providing complete solutions. He is well-prepared for Grade 11 Functions (MCR3U) and I am confident he will continue to grow as a mathematical thinker.',
        median_class_mark: 74,
      },
      {
        course_code: 'ENG2D',
        course_name: 'English',
        teacher_name: 'Mr. R. Blackwell',
        strands: [
          {
            strand: 'Knowledge and Understanding',
            achievement_level: 'Level 3',
            percentage: 76,
            comment: 'Demonstrates understanding of literary concepts, text forms, and language conventions.',
          },
          {
            strand: 'Thinking',
            achievement_level: 'Level 3',
            percentage: 78,
            comment: 'Generates and develops ideas with increasing depth and sophistication.',
          },
          {
            strand: 'Communication',
            achievement_level: 'Level 4',
            percentage: 84,
            comment: 'Communicates ideas clearly and effectively across a range of text forms.',
          },
          {
            strand: 'Application',
            achievement_level: 'Level 3',
            percentage: 74,
            comment: 'Makes meaningful connections between texts and broader themes.',
          },
        ],
        overall_percentage: 78,
        overall_level: 'Level 3',
        learning_skills: {
          responsibility: 'G',
          organization: 'G',
          independent_work: 'G',
          collaboration: 'E',
          initiative: 'G',
          self_regulation: 'G',
        },
        teacher_comment:
          'Alex finished the semester strong. His analytical essay on the theme of identity in our novel study was among the strongest in the class. Alex\'s verbal contributions to Socratic seminars are consistently insightful, and he helps create a positive and inclusive discussion environment. His organization improved over the semester, and I commend him for this growth. For continued success in English, I recommend Alex continue to build his vocabulary through independent reading and practice more varied sentence structures in his writing.',
        median_class_mark: 72,
      },
      {
        course_code: 'SNC2D',
        course_name: 'Science',
        teacher_name: 'Dr. K. Ramirez',
        strands: [
          {
            strand: 'Knowledge and Understanding',
            achievement_level: 'Level 4',
            percentage: 81,
            comment: 'Demonstrates thorough understanding of scientific concepts across all units.',
          },
          {
            strand: 'Thinking and Investigation',
            achievement_level: 'Level 4',
            percentage: 86,
            comment: 'Designs, conducts, and reports on investigations with considerable skill.',
          },
          {
            strand: 'Communication',
            achievement_level: 'Level 3',
            percentage: 79,
            comment: 'Uses scientific language and conventions to present findings clearly.',
          },
          {
            strand: 'Application',
            achievement_level: 'Level 4',
            percentage: 82,
            comment: 'Makes connections between science, technology, society, and the environment.',
          },
        ],
        overall_percentage: 82,
        overall_level: 'Level 4',
        learning_skills: {
          responsibility: 'G',
          organization: 'G',
          independent_work: 'E',
          collaboration: 'E',
          initiative: 'E',
          self_regulation: 'G',
        },
        teacher_comment:
          'Alex was a standout student this semester, particularly in the chemistry and optics units. His passion for scientific investigation is evident in the quality of his lab work — his formal lab report on chemical reactions was exceptional. Alex demonstrated strong critical thinking during our ecology unit, where he independently researched local environmental issues. He improved steadily in the knowledge and understanding category. I highly recommend Alex continue in the sciences. He would thrive in Grade 11 Biology, Chemistry, or Physics.',
        median_class_mark: 75,
      },
      {
        course_code: 'CHC2D',
        course_name: 'Canadian History Since World War I',
        teacher_name: 'Ms. A. Fontaine',
        strands: [
          {
            strand: 'Knowledge and Understanding',
            achievement_level: 'Level 3',
            percentage: 73,
            comment: 'Demonstrates understanding of key events, issues, and developments in Canadian history.',
          },
          {
            strand: 'Thinking',
            achievement_level: 'Level 3',
            percentage: 75,
            comment: 'Uses historical thinking concepts to analyze cause-and-consequence relationships.',
          },
          {
            strand: 'Communication',
            achievement_level: 'Level 3',
            percentage: 77,
            comment: 'Communicates historical arguments with clarity and supporting evidence.',
          },
          {
            strand: 'Application',
            achievement_level: 'Level 3',
            percentage: 72,
            comment: 'Applies understanding of historical events to contemporary contexts.',
          },
        ],
        overall_percentage: 74,
        overall_level: 'Level 3',
        learning_skills: {
          responsibility: 'G',
          organization: 'G',
          independent_work: 'G',
          collaboration: 'G',
          initiative: 'G',
          self_regulation: 'G',
        },
        teacher_comment:
          'Alex demonstrated consistent effort throughout the semester and improved his marks from midterm. His culminating research project on Canadian peacekeeping showed improved research skills and stronger use of primary sources. Alex contributed positively to class discussions, particularly when exploring the impacts of immigration policy on Canadian identity. He should continue to develop his analytical writing skills by incorporating more historical evidence and diverse perspectives into his arguments.',
        median_class_mark: 71,
      },
    ],
    days_absent: 5,
    times_late: 8,
    principal_name: 'Ms. L. Park',
    generated_date: '2026-01-30',
  },
];

// ---------------------------------------------------------------------------
// Transcript — Grade 9 completed + Grade 10 Semester 1
// ---------------------------------------------------------------------------

export const MOCK_TRANSCRIPT_ALEX: TranscriptSummary = {
  oen: '123456789',
  student_name: 'Alexander Johnson',
  date_of_birth: '2010-04-15',
  date_entered_grade_9: '2024-09-03',
  entries: [
    // Grade 9 — Semester 1 (completed)
    {
      course_code: 'MTH1W',
      course_name: 'Mathematics',
      grade_level: 9,
      credit_value: 1.0,
      final_mark: 74,
      credit_earned: true,
      compulsory: true,
      school_year: '2024-2025',
      semester: 1,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'ENG1D',
      course_name: 'English',
      grade_level: 9,
      credit_value: 1.0,
      final_mark: 72,
      credit_earned: true,
      compulsory: true,
      school_year: '2024-2025',
      semester: 1,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'SNC1D',
      course_name: 'Science',
      grade_level: 9,
      credit_value: 1.0,
      final_mark: 76,
      credit_earned: true,
      compulsory: true,
      school_year: '2024-2025',
      semester: 1,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'FSF1D',
      course_name: 'Core French',
      grade_level: 9,
      credit_value: 1.0,
      final_mark: 68,
      credit_earned: true,
      compulsory: true,
      school_year: '2024-2025',
      semester: 1,
      school_name: 'Medway High School',
      note: null,
    },
    // Grade 9 — Semester 2 (completed)
    {
      course_code: 'CGC1D',
      course_name: 'Issues in Canadian Geography',
      grade_level: 9,
      credit_value: 1.0,
      final_mark: 71,
      credit_earned: true,
      compulsory: true,
      school_year: '2024-2025',
      semester: 2,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'PPL1O',
      course_name: 'Healthy Active Living Education',
      grade_level: 9,
      credit_value: 1.0,
      final_mark: 82,
      credit_earned: true,
      compulsory: true,
      school_year: '2024-2025',
      semester: 2,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'AVI1O',
      course_name: 'Visual Arts',
      grade_level: 9,
      credit_value: 1.0,
      final_mark: 79,
      credit_earned: true,
      compulsory: false,
      school_year: '2024-2025',
      semester: 2,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'TIJ1O',
      course_name: 'Exploring Technologies',
      grade_level: 9,
      credit_value: 1.0,
      final_mark: 85,
      credit_earned: true,
      compulsory: false,
      school_year: '2024-2025',
      semester: 2,
      school_name: 'Medway High School',
      note: null,
    },
    // Grade 10 — Semester 1 (just completed)
    {
      course_code: 'MPM2D',
      course_name: 'Principles of Mathematics',
      grade_level: 10,
      credit_value: 1.0,
      final_mark: 80,
      credit_earned: true,
      compulsory: true,
      school_year: '2025-2026',
      semester: 1,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'ENG2D',
      course_name: 'English',
      grade_level: 10,
      credit_value: 1.0,
      final_mark: 78,
      credit_earned: true,
      compulsory: true,
      school_year: '2025-2026',
      semester: 1,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'SNC2D',
      course_name: 'Science',
      grade_level: 10,
      credit_value: 1.0,
      final_mark: 82,
      credit_earned: true,
      compulsory: true,
      school_year: '2025-2026',
      semester: 1,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'CHC2D',
      course_name: 'Canadian History Since World War I',
      grade_level: 10,
      credit_value: 1.0,
      final_mark: 74,
      credit_earned: true,
      compulsory: true,
      school_year: '2025-2026',
      semester: 1,
      school_name: 'Medway High School',
      note: null,
    },
    // Grade 10 — Semester 2 (in progress)
    {
      course_code: 'MCR3U',
      course_name: 'Functions',
      grade_level: 11,
      credit_value: 1.0,
      final_mark: null,
      credit_earned: false,
      compulsory: true,
      school_year: '2025-2026',
      semester: 2,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'SBI3U',
      course_name: 'Biology',
      grade_level: 11,
      credit_value: 1.0,
      final_mark: null,
      credit_earned: false,
      compulsory: true,
      school_year: '2025-2026',
      semester: 2,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'PPL2O',
      course_name: 'Healthy Active Living Education',
      grade_level: 10,
      credit_value: 1.0,
      final_mark: null,
      credit_earned: false,
      compulsory: true,
      school_year: '2025-2026',
      semester: 2,
      school_name: 'Medway High School',
      note: null,
    },
    {
      course_code: 'TIJ2O',
      course_name: 'Exploring Technologies',
      grade_level: 10,
      credit_value: 1.0,
      final_mark: null,
      credit_earned: false,
      compulsory: false,
      school_year: '2025-2026',
      semester: 2,
      school_name: 'Medway High School',
      note: null,
    },
  ],
  compulsory_credits_earned: 10, // MTH1W, ENG1D, SNC1D, FSF1D, CGC1D, PPL1O, MPM2D, ENG2D, SNC2D, CHC2D
  optional_credits_earned: 2,    // AVI1O, TIJ1O
  total_credits_earned: 12,
  community_involvement_hours: 18,
  community_involvement_complete: false, // 40 hours required
  osslt_status: 'not_yet_eligible', // Grade 10 — writing OSSLT this year
  ossd_requirements_met: false,
  shsm_sector: null,
};

// ---------------------------------------------------------------------------
// Attendance — Semester 2, current (Feb 2026)
// ---------------------------------------------------------------------------

function generateAttendanceDays(): AttendanceDay[] {
  const days: AttendanceDay[] = [];
  const sem2Start = new Date('2026-02-02'); // Semester 2 start
  const today = new Date('2026-02-27');

  const sem2Courses = ['MCR3U', 'SBI3U', 'PPL2O', 'TIJ2O'];

  let current = new Date(sem2Start);
  while (current <= today) {
    const dayOfWeek = current.getDay();
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const dateStr = current.toISOString().split('T')[0];

    // Generate realistic attendance pattern
    let dayStatus: AttendanceStatus = 'present';
    let note: string | null = null;

    // Feb 10 — absent excused (dentist appointment)
    if (dateStr === '2026-02-10') {
      dayStatus = 'absent_excused';
      note = 'Medical appointment — dentist';
    }
    // Feb 17 — Family Day holiday (skip)
    else if (dateStr === '2026-02-17') {
      // Family Day — no school
      current.setDate(current.getDate() + 1);
      continue;
    }
    // Feb 5 — late period 1
    else if (dateStr === '2026-02-05') {
      dayStatus = 'late';
      note = 'Late arrival — bus delay';
    }
    // Feb 19 — late period 1
    else if (dateStr === '2026-02-19') {
      dayStatus = 'late';
      note = 'Late arrival';
    }

    const periods = sem2Courses.map((code, i) => {
      let periodStatus: AttendanceStatus = dayStatus;
      // If late, only period 1 is late
      if (dayStatus === 'late' && i > 0) {
        periodStatus = 'present';
      }
      return {
        period: i + 1,
        status: periodStatus,
        course_code: code,
      };
    });

    days.push({
      date: dateStr,
      status: dayStatus,
      periods,
      note,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

const attendanceDays = generateAttendanceDays();
const presentDays = attendanceDays.filter(d => d.status === 'present').length;
const lateDays = attendanceDays.filter(d => d.status === 'late').length;
const absentExcused = attendanceDays.filter(d => d.status === 'absent_excused').length;
const absentUnexcused = attendanceDays.filter(d => d.status === 'absent_unexcused').length;

export const MOCK_ATTENDANCE_ALEX: AttendanceRecord = {
  oen: '123456789',
  student_name: 'Alexander Johnson',
  school_year: '2025-2026',
  semester: 2,
  days: attendanceDays,
  summary: {
    total_school_days: attendanceDays.length,
    present: presentDays,
    late: lateDays,
    absent_excused: absentExcused,
    absent_unexcused: absentUnexcused,
    attendance_rate_percent: Math.round(((presentDays + lateDays) / attendanceDays.length) * 100),
  },
};

// ---------------------------------------------------------------------------
// IEP — Alex does NOT have an IEP, but we include a sample for another student
// Alex is a regular-stream student. IEP endpoint returns null for him.
// Providing a sample IEP for Emma Thompson (123456790) for testing purposes.
// ---------------------------------------------------------------------------

export const MOCK_IEP_ALEX: IEPRecord | null = null;

export const MOCK_IEP_EMMA: IEPRecord = {
  oen: '123456790',
  student_name: 'Emma Thompson',
  date_of_birth: '2010-07-22',
  school_name: 'Medway High School',
  grade: 10,
  iprc_date: '2024-10-15',
  iprc_exceptionality: 'Learning Disability',
  placement: 'Regular class with resource assistance',
  iep_start_date: '2024-11-01',
  iep_review_date: '2025-10-15',
  case_conference_date: '2025-09-20',
  reason_for_iep:
    'Emma has been identified with a Learning Disability in the area of written expression by the IPRC. Psycho-educational assessment (Dr. M. Singh, Sept 2024) indicates average to above-average cognitive ability with a significant discrepancy in written output. Emma requires accommodations and modified expectations in Language Arts to access the curriculum at her ability level.',
  student_strengths: [
    'Strong verbal communication skills',
    'Excellent comprehension of oral instructions',
    'Creative problem-solving abilities',
    'Positive peer relationships and collaborative skills',
    'Strong interest and aptitude in science and mathematics',
  ],
  student_needs: [
    'Additional time for written tasks and assessments',
    'Support with organizing written responses',
    'Access to assistive technology for written expression',
    'Frequent check-ins during independent work periods',
    'Graphic organizers for pre-writing activities',
  ],
  accommodations: [
    { category: 'instructional', description: 'Provide oral instructions in addition to written instructions' },
    { category: 'instructional', description: 'Use graphic organizers for planning written tasks' },
    { category: 'instructional', description: 'Allow use of speech-to-text software for extended writing' },
    { category: 'instructional', description: 'Break multi-step tasks into smaller components' },
    { category: 'instructional', description: 'Provide exemplars and rubrics before assessments' },
    { category: 'environmental', description: 'Preferential seating near teacher for direct support' },
    { category: 'environmental', description: 'Reduced-distraction setting for tests and exams' },
    { category: 'environmental', description: 'Access to Chromebook with assistive technology tools' },
    { category: 'assessment', description: 'Extended time — 1.5x for tests and examinations' },
    { category: 'assessment', description: 'Alternative format for demonstrating learning (oral, visual, multimedia)' },
    { category: 'assessment', description: 'Scribe available for exam situations if needed' },
    { category: 'assessment', description: 'Reduced quantity of written response items while maintaining expectations for quality' },
  ],
  goals: [
    {
      subject_area: 'English (ENG2D)',
      current_level: 'Emma is currently achieving at Level 2 (62%) in written communication. She demonstrates strong oral comprehension but struggles to organize and express ideas in written form.',
      annual_goal: 'Emma will improve her written communication skills to consistently achieve Level 3 in paragraph writing, using graphic organizers and assistive technology as supports.',
      specific_expectations: [
        'Write a five-paragraph essay with a clear thesis, supporting paragraphs, and conclusion, using a graphic organizer for planning',
        'Use transition words and varied sentence structures in written responses',
        'Self-edit written work using a checklist before submission',
      ],
      assessment_methods: [
        'Writing samples collected monthly',
        'Rubric-based assessment of paragraph organization',
        'Student self-assessment reflections',
      ],
    },
    {
      subject_area: 'Canadian History (CHC2D)',
      current_level: 'Emma demonstrates Level 3 understanding orally but Level 2 in written historical analysis due to difficulty organizing evidence-based arguments.',
      annual_goal: 'Emma will demonstrate historical thinking through written responses that include a clear argument supported by at least two pieces of evidence, achieving Level 3 consistently.',
      specific_expectations: [
        'Construct a historical argument using a provided framework (claim-evidence-reasoning)',
        'Use point-form notes and graphic organizers to plan written responses',
        'Incorporate primary and secondary sources as evidence in written work',
      ],
      assessment_methods: [
        'Historical response writing samples (bi-weekly)',
        'Performance task: inquiry-based research project with written and oral components',
        'Teacher observation and conferencing notes',
      ],
    },
  ],
  transition_plan: {
    post_secondary_goals: [
      'Explore college and university programs in science and technology',
      'Develop self-advocacy skills for post-secondary accommodations',
      'Explore cooperative education opportunities in Grade 11/12',
    ],
    actions: [
      'Attend TVDSB post-secondary information sessions (Grade 10/11)',
      'Complete Learning Strategies course (GLE2O) in Grade 11',
      'Connect with school Accessibility Services contacts at local post-secondary institutions',
      'Build portfolio of accommodation strategies that work for Emma',
    ],
    responsible_persons: [
      'David Williams (Guidance Counsellor)',
      'Emma Thompson (Student)',
      'Parents/Guardians',
      'Resource Teacher — Ms. J. Nguyen',
    ],
    timeline: 'Ongoing through Grade 12 graduation',
  },
  human_resources: [
    { name: 'Ms. J. Nguyen', role: 'Resource Teacher (Special Education)', allocation: '3 periods/week' },
    { name: 'Mr. D. Williams', role: 'Guidance Counsellor', allocation: 'As needed' },
  ],
  parent_consultation_date: '2025-09-18',
  student_consultation: true,
  principal_name: 'Ms. L. Park',
  iep_developed_by: 'Ms. J. Nguyen, Resource Teacher',
};

// ---------------------------------------------------------------------------
// EQAO Results
// ---------------------------------------------------------------------------

export const MOCK_EQAO_ALEX: EQAORecord = {
  oen: '123456789',
  student_name: 'Alexander Johnson',
  results: [
    // Grade 3 assessments (2018-2019)
    {
      assessment_type: 'primary_reading',
      assessment_year: '2018-2019',
      grade_at_time: 3,
      level: 'Level 3',
      percentage: null,
      status: 'completed',
      school_name: 'Stoneybrook Public School',
    },
    {
      assessment_type: 'primary_writing',
      assessment_year: '2018-2019',
      grade_at_time: 3,
      level: 'Level 2',
      percentage: null,
      status: 'completed',
      school_name: 'Stoneybrook Public School',
    },
    {
      assessment_type: 'primary_mathematics',
      assessment_year: '2018-2019',
      grade_at_time: 3,
      level: 'Level 3',
      percentage: null,
      status: 'completed',
      school_name: 'Stoneybrook Public School',
    },
    // Grade 6 assessments (2021-2022)
    {
      assessment_type: 'junior_reading',
      assessment_year: '2021-2022',
      grade_at_time: 6,
      level: 'Level 3',
      percentage: null,
      status: 'completed',
      school_name: 'Stoneybrook Public School',
    },
    {
      assessment_type: 'junior_writing',
      assessment_year: '2021-2022',
      grade_at_time: 6,
      level: 'Level 3',
      percentage: null,
      status: 'completed',
      school_name: 'Stoneybrook Public School',
    },
    {
      assessment_type: 'junior_mathematics',
      assessment_year: '2021-2022',
      grade_at_time: 6,
      level: 'Level 3',
      percentage: null,
      status: 'completed',
      school_name: 'Stoneybrook Public School',
    },
    // Grade 9 Mathematics (2024-2025)
    {
      assessment_type: 'grade_9_mathematics',
      assessment_year: '2024-2025',
      grade_at_time: 9,
      level: 'Level 3',
      percentage: 73,
      status: 'completed',
      school_name: 'Medway High School',
    },
    // OSSLT — not yet written (Grade 10, Spring 2026)
    {
      assessment_type: 'osslt',
      assessment_year: '2025-2026',
      grade_at_time: 10,
      level: null,
      percentage: null,
      status: 'deferred',
      school_name: 'Medway High School',
    },
  ],
};

// ---------------------------------------------------------------------------
// Course roster — MPM2D Section A
// ---------------------------------------------------------------------------

export const MOCK_ROSTER_MPM2D: CourseRoster = {
  course_code: 'MPM2D',
  course_name: 'Principles of Mathematics',
  section: 'A',
  teacher_name: 'Ms. S. Chen',
  semester: 1,
  period: 2,
  room: '214',
  school_name: 'Medway High School',
  school_year: '2025-2026',
  students: [
    {
      oen: '123456789',
      legal_first_name: 'Alexander',
      legal_last_name: 'Johnson',
      preferred_first_name: 'Alex',
      grade: 10,
      homeroom: '10A',
      iep_flag: false,
      current_mark: 80,
    },
    {
      oen: '123456790',
      legal_first_name: 'Emma',
      legal_last_name: 'Thompson',
      preferred_first_name: null,
      grade: 10,
      homeroom: '10A',
      iep_flag: true,
      current_mark: 68,
    },
    {
      oen: '123456791',
      legal_first_name: 'Jamal',
      legal_last_name: 'Okafor',
      preferred_first_name: null,
      grade: 10,
      homeroom: '10B',
      iep_flag: false,
      current_mark: 85,
    },
    {
      oen: '123456792',
      legal_first_name: 'Priya',
      legal_last_name: 'Patel',
      preferred_first_name: null,
      grade: 10,
      homeroom: '10A',
      iep_flag: false,
      current_mark: 91,
    },
    {
      oen: '123456793',
      legal_first_name: 'Lucas',
      legal_last_name: 'Martin',
      preferred_first_name: 'Luke',
      grade: 10,
      homeroom: '10B',
      iep_flag: false,
      current_mark: 62,
    },
    {
      oen: '123456794',
      legal_first_name: 'Sophie',
      legal_last_name: 'Lavoie',
      preferred_first_name: null,
      grade: 10,
      homeroom: '10A',
      iep_flag: false,
      current_mark: 77,
    },
  ],
};

// ---------------------------------------------------------------------------
// School student list — Medway High School (partial for Grade 10)
// ---------------------------------------------------------------------------

export const MOCK_SCHOOL_STUDENTS_MEDWAY: SchoolStudentList = {
  school_code: '666301',
  school_name: 'Medway High School',
  school_year: '2025-2026',
  total_students: 6,
  students: [
    {
      oen: '123456789',
      legal_first_name: 'Alexander',
      legal_last_name: 'Johnson',
      grade: 10,
      homeroom: '10A',
      status: 'active',
      iep_flag: false,
      attendance_rate_percent: 95,
    },
    {
      oen: '123456790',
      legal_first_name: 'Emma',
      legal_last_name: 'Thompson',
      grade: 10,
      homeroom: '10A',
      status: 'active',
      iep_flag: true,
      attendance_rate_percent: 92,
    },
    {
      oen: '123456791',
      legal_first_name: 'Jamal',
      legal_last_name: 'Okafor',
      grade: 10,
      homeroom: '10B',
      status: 'active',
      iep_flag: false,
      attendance_rate_percent: 98,
    },
    {
      oen: '123456792',
      legal_first_name: 'Priya',
      legal_last_name: 'Patel',
      grade: 10,
      homeroom: '10A',
      status: 'active',
      iep_flag: false,
      attendance_rate_percent: 97,
    },
    {
      oen: '123456793',
      legal_first_name: 'Lucas',
      legal_last_name: 'Martin',
      grade: 10,
      homeroom: '10B',
      status: 'active',
      iep_flag: false,
      attendance_rate_percent: 88,
    },
    {
      oen: '123456794',
      legal_first_name: 'Sophie',
      legal_last_name: 'Lavoie',
      grade: 10,
      homeroom: '10A',
      status: 'active',
      iep_flag: false,
      attendance_rate_percent: 96,
    },
  ],
};

// ---------------------------------------------------------------------------
// Look-up helpers
// ---------------------------------------------------------------------------

const STUDENTS_BY_OEN: Record<string, SISStudent> = {
  '123456789': MOCK_STUDENT_ALEX,
};

const REPORT_CARDS_BY_OEN: Record<string, ReportCard[]> = {
  '123456789': MOCK_REPORT_CARDS_ALEX,
};

const TRANSCRIPTS_BY_OEN: Record<string, TranscriptSummary> = {
  '123456789': MOCK_TRANSCRIPT_ALEX,
};

const ATTENDANCE_BY_OEN: Record<string, AttendanceRecord> = {
  '123456789': MOCK_ATTENDANCE_ALEX,
};

const IEP_BY_OEN: Record<string, IEPRecord | null> = {
  '123456789': MOCK_IEP_ALEX,
  '123456790': MOCK_IEP_EMMA,
};

const EQAO_BY_OEN: Record<string, EQAORecord> = {
  '123456789': MOCK_EQAO_ALEX,
};

const ROSTER_BY_COURSE: Record<string, CourseRoster> = {
  'MPM2D': MOCK_ROSTER_MPM2D,
};

const SCHOOL_STUDENTS_BY_CODE: Record<string, SchoolStudentList> = {
  '666301': MOCK_SCHOOL_STUDENTS_MEDWAY,
  'MHS': MOCK_SCHOOL_STUDENTS_MEDWAY,
};

export function getStudentByOEN(oen: string): SISStudent | undefined {
  return STUDENTS_BY_OEN[oen];
}

export function getReportCardsByOEN(oen: string): ReportCard[] {
  return REPORT_CARDS_BY_OEN[oen] ?? [];
}

export function getTranscriptByOEN(oen: string): TranscriptSummary | undefined {
  return TRANSCRIPTS_BY_OEN[oen];
}

export function getAttendanceByOEN(oen: string): AttendanceRecord | undefined {
  return ATTENDANCE_BY_OEN[oen];
}

export function getIEPByOEN(oen: string): IEPRecord | null | undefined {
  return IEP_BY_OEN[oen];
}

export function getEQAOByOEN(oen: string): EQAORecord | undefined {
  return EQAO_BY_OEN[oen];
}

export function getRosterByCourseCode(courseCode: string): CourseRoster | undefined {
  return ROSTER_BY_COURSE[courseCode];
}

export function getSchoolStudentsByCode(schoolCode: string): SchoolStudentList | undefined {
  return SCHOOL_STUDENTS_BY_CODE[schoolCode];
}
