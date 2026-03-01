/**
 * Large-scale seed data generator for StudentContext AI.
 * Creates a realistic 25,000-student school board (TVDSB) with:
 * - 10 real TVDSB secondary schools
 * - ~1,385 staff across all roles
 * - ~8,000 parents (with sibling grouping)
 * - Ontario curriculum courses (grades 9-12)
 * - ~100,000 course memberships
 * - 25,000 consent records
 * - ~200 sample documents (no embeddings)
 *
 * Deterministic: uses seeded PRNG so re-runs produce identical data.
 * Idempotent: tags generated data with metadata.generated=true, cleans up on re-run.
 * Preserves the 6 demo users from seed.ts.
 *
 * Usage: npm run seed:large
 */

import crypto from 'node:crypto';
import { pool } from './index.js';
import { hashPassword } from '../utils/crypto.js';

// ─── Deterministic PRNG (mulberry32) ─────────────────────────────────────────

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260228;
const rng = mulberry32(SEED);

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  // English/Canadian
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Benjamin',
  'Mia', 'Lucas', 'Charlotte', 'Mason', 'Amelia', 'Ethan', 'Harper', 'Alexander', 'Evelyn', 'Daniel',
  'Abigail', 'Matthew', 'Emily', 'Aiden', 'Elizabeth', 'Henry', 'Sofia', 'Jackson', 'Ella', 'Sebastian',
  'Victoria', 'Jack', 'Scarlett', 'Owen', 'Madison', 'Dylan', 'Luna', 'Caleb', 'Chloe', 'Nathan',
  'Penelope', 'Ryan', 'Layla', 'Adrian', 'Riley', 'Nolan', 'Zoey', 'Connor', 'Hannah', 'Cameron',
  'Lily', 'Leo', 'Eleanor', 'Logan', 'Hazel', 'Adam', 'Grace', 'Wyatt', 'Violet', 'Carter',
  // French-Canadian
  'Amelie', 'Gabriel', 'Genevieve', 'Olivier', 'Camille', 'Antoine', 'Julien', 'Celeste', 'Philippe',
  'Madeleine', 'Etienne', 'Eloise', 'Laurent', 'Simone', 'Maxime', 'Vivienne', 'Benoit', 'Francois',
  'Brigitte', 'Dominique', 'Renaud', 'Colette',
  // South Asian
  'Arjun', 'Priya', 'Ravi', 'Ananya', 'Aarav', 'Diya', 'Vihaan', 'Aisha', 'Rohan', 'Neha',
  'Aditya', 'Ishaan', 'Kavya', 'Nikhil', 'Meera', 'Sanjay', 'Pooja', 'Vikram', 'Anjali', 'Pranav',
  'Divya', 'Sahil', 'Tanvi', 'Harsh', 'Shreya', 'Rishi', 'Nandini',
  // East Asian
  'Wei', 'Yuki', 'Sakura', 'Mei', 'Kenji', 'Li', 'Chen', 'Yuna', 'Jae', 'Hana',
  'Tao', 'Jun', 'Rina', 'Kai', 'Yumi', 'Akira', 'Haruto', 'Mio', 'Ren', 'Sora', 'Jing', 'Zhi',
  // Middle Eastern
  'Omar', 'Fatima', 'Ali', 'Zahra', 'Hassan', 'Leila', 'Yusuf', 'Nour', 'Ahmad', 'Maryam',
  'Khalid', 'Rania', 'Tariq', 'Amira', 'Kareem', 'Faris', 'Huda', 'Ibrahim', 'Samira', 'Bilal',
  'Dina', 'Zara',
  // African
  'Kofi', 'Amara', 'Kwame', 'Nia', 'Chidi', 'Emeka', 'Zuri', 'Obi', 'Ayana', 'Sekou',
  'Imani', 'Tendai', 'Jabari', 'Oluwole', 'Chiamaka', 'Nkem', 'Abeni',
] as const;

const LAST_NAMES = [
  // English
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson',
  'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Robinson', 'Clark', 'Lewis', 'Lee', 'Walker',
  'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson',
  'Hill', 'Campbell', 'Mitchell', 'Roberts', 'Carter',
  // French-Canadian
  'Tremblay', 'Gagnon', 'Roy', 'Cote', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagne',
  'Pelletier', 'Dubois', 'Poirier', 'Girard', 'Bergeron', 'Leclerc', 'Boucher', 'Lefebvre', 'Fournier',
  'Beaulieu', 'Dion', 'Picard',
  // South Asian
  'Patel', 'Singh', 'Sharma', 'Kumar', 'Gupta', 'Desai', 'Shah', 'Agarwal', 'Reddy', 'Nair',
  'Joshi', 'Verma', 'Mehta', 'Iyer', 'Rao', 'Malhotra', 'Chopra', 'Bhatia', 'Kapoor',
  // East Asian
  'Chen', 'Li', 'Wang', 'Zhang', 'Liu', 'Yang', 'Kim', 'Nguyen', 'Tanaka', 'Suzuki',
  'Yamamoto', 'Watanabe', 'Park', 'Wu', 'Lin', 'Huang', 'Choi', 'Nakamura',
  // Middle Eastern
  'Al-Rashid', 'Hassan', 'Ibrahim', 'Mohammed', 'Khalil', 'Abbas', 'Nasser', 'Farouk', 'Mansour', 'Khoury',
  // African
  'Okafor', 'Mensah', 'Asante', 'Nwosu', 'Diallo', 'Osei', 'Toure', 'Abara', 'Adeyemi', 'Nkosi',
  'Mwangi', 'Kimani',
] as const;

const SCHOOLS = [
  { code: 'MHS', name: 'Medway High School' },
  { code: 'CECI', name: 'Central Elgin Collegiate Institute' },
  { code: 'SSS', name: 'Saunders Secondary School' },
  { code: 'SFBS', name: 'Sir Frederick Banting Secondary School' },
  { code: 'CRSS', name: 'Clarke Road Secondary School' },
  { code: 'MSS', name: 'Montcalm Secondary School' },
  { code: 'ABLS', name: 'A.B. Lucas Secondary School' },
  { code: 'WSS', name: 'Westminster Secondary School' },
  { code: 'OAK', name: 'Oakridge Secondary School' },
  { code: 'PCI', name: 'Parkside Collegiate Institute' },
] as const;

interface CourseTemplate {
  code: string;
  name: string;
  grade: number;
  subject: string;
  compulsory: boolean;
  stream: 'D' | 'P' | 'U' | 'C' | 'M' | 'O';
}

const COURSE_TEMPLATES: CourseTemplate[] = [
  // Grade 9
  { code: 'MPM1D', name: 'Principles of Mathematics', grade: 9, subject: 'Mathematics', compulsory: true, stream: 'D' },
  { code: 'MFM1P', name: 'Foundations of Mathematics', grade: 9, subject: 'Mathematics', compulsory: true, stream: 'P' },
  { code: 'SNC1D', name: 'Science', grade: 9, subject: 'Science', compulsory: true, stream: 'D' },
  { code: 'SNC1P', name: 'Science', grade: 9, subject: 'Science', compulsory: true, stream: 'P' },
  { code: 'ENG1D', name: 'English', grade: 9, subject: 'English', compulsory: true, stream: 'D' },
  { code: 'ENG1P', name: 'English', grade: 9, subject: 'English', compulsory: true, stream: 'P' },
  { code: 'FSF1D', name: 'Core French', grade: 9, subject: 'French', compulsory: true, stream: 'D' },
  { code: 'CGC1D', name: 'Issues in Canadian Geography', grade: 9, subject: 'Geography', compulsory: true, stream: 'D' },
  { code: 'CGC1P', name: 'Issues in Canadian Geography', grade: 9, subject: 'Geography', compulsory: true, stream: 'P' },
  { code: 'PPL1O', name: 'Healthy Active Living Education', grade: 9, subject: 'Physical Education', compulsory: true, stream: 'O' },
  { code: 'TIJ1O', name: 'Exploring Technologies', grade: 9, subject: 'Technology', compulsory: false, stream: 'O' },
  { code: 'AVI1O', name: 'Visual Arts', grade: 9, subject: 'Arts', compulsory: false, stream: 'O' },
  { code: 'AMU1O', name: 'Music', grade: 9, subject: 'Arts', compulsory: false, stream: 'O' },
  // Grade 10
  { code: 'MPM2D', name: 'Principles of Mathematics', grade: 10, subject: 'Mathematics', compulsory: true, stream: 'D' },
  { code: 'MFM2P', name: 'Foundations of Mathematics', grade: 10, subject: 'Mathematics', compulsory: true, stream: 'P' },
  { code: 'SNC2D', name: 'Science', grade: 10, subject: 'Science', compulsory: true, stream: 'D' },
  { code: 'SNC2P', name: 'Science', grade: 10, subject: 'Science', compulsory: true, stream: 'P' },
  { code: 'ENG2D', name: 'English', grade: 10, subject: 'English', compulsory: true, stream: 'D' },
  { code: 'ENG2P', name: 'English', grade: 10, subject: 'English', compulsory: true, stream: 'P' },
  { code: 'CHC2D', name: 'Canadian History Since World War I', grade: 10, subject: 'History', compulsory: true, stream: 'D' },
  { code: 'CHC2P', name: 'Canadian History Since World War I', grade: 10, subject: 'History', compulsory: true, stream: 'P' },
  { code: 'GLC2O', name: 'Career Studies', grade: 10, subject: 'Guidance', compulsory: true, stream: 'O' },
  { code: 'CHV2O', name: 'Civics and Citizenship', grade: 10, subject: 'Social Sciences', compulsory: true, stream: 'O' },
  { code: 'PPL2O', name: 'Healthy Active Living Education', grade: 10, subject: 'Physical Education', compulsory: true, stream: 'O' },
  { code: 'AVI2O', name: 'Visual Arts', grade: 10, subject: 'Arts', compulsory: false, stream: 'O' },
  { code: 'TIK2O', name: 'Computer Technology', grade: 10, subject: 'Technology', compulsory: false, stream: 'O' },
  // Grade 11
  { code: 'MCR3U', name: 'Functions', grade: 11, subject: 'Mathematics', compulsory: false, stream: 'U' },
  { code: 'MBF3C', name: 'Foundations for College Mathematics', grade: 11, subject: 'Mathematics', compulsory: false, stream: 'C' },
  { code: 'MCF3M', name: 'Functions and Applications', grade: 11, subject: 'Mathematics', compulsory: false, stream: 'M' },
  { code: 'ENG3U', name: 'English', grade: 11, subject: 'English', compulsory: true, stream: 'U' },
  { code: 'ENG3C', name: 'English', grade: 11, subject: 'English', compulsory: true, stream: 'C' },
  { code: 'SBI3U', name: 'Biology', grade: 11, subject: 'Science', compulsory: false, stream: 'U' },
  { code: 'SCH3U', name: 'Chemistry', grade: 11, subject: 'Science', compulsory: false, stream: 'U' },
  { code: 'SPH3U', name: 'Physics', grade: 11, subject: 'Science', compulsory: false, stream: 'U' },
  { code: 'FSF3U', name: 'Core French', grade: 11, subject: 'French', compulsory: false, stream: 'U' },
  { code: 'ICS3U', name: 'Introduction to Computer Science', grade: 11, subject: 'Computer Science', compulsory: false, stream: 'U' },
  { code: 'HSP3U', name: 'Anthropology, Psychology, and Sociology', grade: 11, subject: 'Social Sciences', compulsory: false, stream: 'U' },
  { code: 'BAF3M', name: 'Financial Accounting Fundamentals', grade: 11, subject: 'Business', compulsory: false, stream: 'M' },
  { code: 'PPL3O', name: 'Healthy Active Living Education', grade: 11, subject: 'Physical Education', compulsory: false, stream: 'O' },
  // Grade 12
  { code: 'MHF4U', name: 'Advanced Functions', grade: 12, subject: 'Mathematics', compulsory: false, stream: 'U' },
  { code: 'MCV4U', name: 'Calculus and Vectors', grade: 12, subject: 'Mathematics', compulsory: false, stream: 'U' },
  { code: 'MDM4U', name: 'Mathematics of Data Management', grade: 12, subject: 'Mathematics', compulsory: false, stream: 'U' },
  { code: 'MAP4C', name: 'Foundations for College Mathematics', grade: 12, subject: 'Mathematics', compulsory: false, stream: 'C' },
  { code: 'ENG4U', name: 'English', grade: 12, subject: 'English', compulsory: true, stream: 'U' },
  { code: 'ENG4C', name: 'English', grade: 12, subject: 'English', compulsory: true, stream: 'C' },
  { code: 'SBI4U', name: 'Biology', grade: 12, subject: 'Science', compulsory: false, stream: 'U' },
  { code: 'SCH4U', name: 'Chemistry', grade: 12, subject: 'Science', compulsory: false, stream: 'U' },
  { code: 'SPH4U', name: 'Physics', grade: 12, subject: 'Science', compulsory: false, stream: 'U' },
  { code: 'ICS4U', name: 'Computer Science', grade: 12, subject: 'Computer Science', compulsory: false, stream: 'U' },
  { code: 'HSB4U', name: 'Challenge and Change in Society', grade: 12, subject: 'Social Sciences', compulsory: false, stream: 'U' },
  { code: 'BOH4M', name: 'Business Leadership', grade: 12, subject: 'Business', compulsory: false, stream: 'M' },
  { code: 'FSF4U', name: 'Core French', grade: 12, subject: 'French', compulsory: false, stream: 'U' },
  { code: 'PPL4O', name: 'Healthy Active Living Education', grade: 12, subject: 'Physical Education', compulsory: false, stream: 'O' },
];

const DEPARTMENTS = [
  'Mathematics', 'Science', 'English', 'French', 'Social Sciences',
  'Physical Education', 'Arts', 'Technology', 'Business', 'Computer Science',
] as const;

const CONSENT_SOURCES = [
  'google_classroom_assignment', 'google_classroom_submission',
  'google_classroom_grade', 'sis_report_card',
];

const STUDENTS_PER_SCHOOL = 2500;
const STUDENTS_PER_GRADE = Math.floor(STUDENTS_PER_SCHOOL / 4); // 625

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserRow {
  email: string;
  name_first: string;
  name_last: string;
  role: string;
  external_id: string;
  metadata: Record<string, unknown>;
}

interface EnrollmentRow {
  studentIdx: number; // index into returned user IDs
  schoolIdx: number;
  grade: number;
}

interface StaffAssignmentRow {
  staffIdx: number;
  schoolIdx: number;
  department: string | null;
  role_scope: string;
}

interface CourseRow {
  schoolIdx: number;
  name: string;
  course_code: string;
  grade: number;
  subject: string;
  semester: string;
}

interface MembershipRow {
  courseIdx: number;
  userIdx: number;
  role: string;
}

interface ConsentRow {
  studentIdx: number;
  parentIdx: number | null; // null = no parent user
  status: string;
}

// ─── Generation Functions ────────────────────────────────────────────────────

function cleanName(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

function generateStudents(): { students: UserRow[]; enrollments: EnrollmentRow[] } {
  const students: UserRow[] = [];
  const enrollments: EnrollmentRow[] = [];
  let counter = 1;

  for (let schoolIdx = 0; schoolIdx < SCHOOLS.length; schoolIdx++) {
    for (let grade = 9; grade <= 12; grade++) {
      for (let i = 0; i < STUDENTS_PER_GRADE; i++) {
        const firstName = pick(FIRST_NAMES);
        const lastName = pick(LAST_NAMES);
        const extId = `STU-2026-${String(counter).padStart(5, '0')}`;
        const oen = String(300000000 + counter);

        students.push({
          email: `${cleanName(firstName)}.${cleanName(lastName)}${counter}@student.tvdsb.on.ca`,
          name_first: firstName,
          name_last: lastName,
          role: 'student',
          external_id: extId,
          metadata: { generated: true, grade, oen, homeroom: `${grade}${String.fromCharCode(65 + (i % 8))}` },
        });

        enrollments.push({ studentIdx: students.length - 1, schoolIdx, grade });
        counter++;
      }
    }
  }

  return { students, enrollments };
}

function generateStaff(): { staff: UserRow[]; assignments: StaffAssignmentRow[] } {
  const staff: UserRow[] = [];
  const assignments: StaffAssignmentRow[] = [];
  let counter = 100;

  for (let schoolIdx = 0; schoolIdx < SCHOOLS.length; schoolIdx++) {
    // Teachers (~113 per school)
    for (let i = 0; i < 113; i++) {
      const dept = DEPARTMENTS[i % DEPARTMENTS.length];
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      staff.push({
        email: `${cleanName(firstName)}.${cleanName(lastName)}${counter}@tvdsb.on.ca`,
        name_first: firstName,
        name_last: lastName,
        role: 'teacher',
        external_id: `STAFF-${String(counter).padStart(5, '0')}`,
        metadata: { generated: true, department: dept },
      });
      assignments.push({ staffIdx: staff.length - 1, schoolIdx, department: dept, role_scope: 'teacher' });
      counter++;
    }

    // Guidance (6 per school)
    for (let i = 0; i < 6; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      staff.push({
        email: `${cleanName(firstName)}.${cleanName(lastName)}${counter}@tvdsb.on.ca`,
        name_first: firstName,
        name_last: lastName,
        role: 'guidance_counsellor',
        external_id: `STAFF-${String(counter).padStart(5, '0')}`,
        metadata: { generated: true, department: 'Guidance' },
      });
      assignments.push({ staffIdx: staff.length - 1, schoolIdx, department: 'Guidance', role_scope: 'guidance' });
      counter++;
    }

    // EAs (10 per school)
    for (let i = 0; i < 10; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      staff.push({
        email: `${cleanName(firstName)}.${cleanName(lastName)}${counter}@tvdsb.on.ca`,
        name_first: firstName,
        name_last: lastName,
        role: 'educational_assistant',
        external_id: `STAFF-${String(counter).padStart(5, '0')}`,
        metadata: { generated: true, department: 'Special Education' },
      });
      assignments.push({ staffIdx: staff.length - 1, schoolIdx, department: 'Special Education', role_scope: 'support' });
      counter++;
    }

    // VPs (5 per school)
    for (let i = 0; i < 5; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      staff.push({
        email: `${cleanName(firstName)}.${cleanName(lastName)}${counter}@tvdsb.on.ca`,
        name_first: firstName,
        name_last: lastName,
        role: 'vice_principal',
        external_id: `STAFF-${String(counter).padStart(5, '0')}`,
        metadata: { generated: true },
      });
      assignments.push({ staffIdx: staff.length - 1, schoolIdx, department: null, role_scope: 'admin' });
      counter++;
    }

    // Principal (1 per school)
    {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      staff.push({
        email: `${cleanName(firstName)}.${cleanName(lastName)}${counter}@tvdsb.on.ca`,
        name_first: firstName,
        name_last: lastName,
        role: 'principal',
        external_id: `STAFF-${String(counter).padStart(5, '0')}`,
        metadata: { generated: true },
      });
      assignments.push({ staffIdx: staff.length - 1, schoolIdx, department: null, role_scope: 'admin' });
      counter++;
    }

    // Supply teachers (3 per school)
    for (let i = 0; i < 3; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      staff.push({
        email: `${cleanName(firstName)}.${cleanName(lastName)}${counter}@tvdsb.on.ca`,
        name_first: firstName,
        name_last: lastName,
        role: 'supply_teacher',
        external_id: `STAFF-${String(counter).padStart(5, '0')}`,
        metadata: { generated: true },
      });
      assignments.push({ staffIdx: staff.length - 1, schoolIdx, department: null, role_scope: 'supply' });
      counter++;
    }
  }

  // Board admins (5, not school-specific)
  for (let i = 0; i < 5; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    staff.push({
      email: `${cleanName(firstName)}.${cleanName(lastName)}${counter}@tvdsb.on.ca`,
      name_first: firstName,
      name_last: lastName,
      role: 'board_admin',
      external_id: `ADMIN-${String(counter).padStart(3, '0')}`,
      metadata: { generated: true },
    });
    counter++;
  }

  return { staff, assignments };
}

function generateParents(
  students: UserRow[],
  enrollments: EnrollmentRow[],
): { parents: UserRow[]; studentToParent: Map<number, number> } {
  const parents: UserRow[] = [];
  const studentToParent = new Map<number, number>();

  // Group students by (school, lastName) to identify siblings
  const familyGroups = new Map<string, number[]>();
  for (let i = 0; i < students.length; i++) {
    const key = `${enrollments[i].schoolIdx}-${students[i].name_last}`;
    if (!familyGroups.has(key)) familyGroups.set(key, []);
    familyGroups.get(key)!.push(i);
  }

  let counter = 100;
  for (const [, studentIndices] of familyGroups) {
    if (rng() >= 0.80) continue; // 20% have no parent user

    const lastName = students[studentIndices[0]].name_last;
    const firstName = pick(FIRST_NAMES);
    parents.push({
      email: `${cleanName(firstName)}.${cleanName(lastName)}${counter}@tvdsb.on.ca`,
      name_first: firstName,
      name_last: lastName,
      role: 'parent',
      external_id: `PAR-${String(counter).padStart(5, '0')}`,
      metadata: { generated: true },
    });

    const parentIdx = parents.length - 1;
    for (const si of studentIndices) {
      studentToParent.set(si, parentIdx);
    }
    counter++;
  }

  return { parents, studentToParent };
}

function generateCourses(): CourseRow[] {
  const courses: CourseRow[] = [];

  for (let schoolIdx = 0; schoolIdx < SCHOOLS.length; schoolIdx++) {
    for (const tmpl of COURSE_TEMPLATES) {
      // Each course offered in one semester (alternate S1/S2 by index)
      const semester = courses.length % 2 === 0 ? 'S1' : 'S2';
      courses.push({
        schoolIdx,
        name: `${tmpl.code} - ${tmpl.name}`,
        course_code: tmpl.code,
        grade: tmpl.grade,
        subject: tmpl.subject,
        semester,
      });
    }
  }

  return courses;
}

function generateCourseMemberships(
  students: UserRow[],
  enrollments: EnrollmentRow[],
  staff: UserRow[],
  staffAssignments: StaffAssignmentRow[],
  courses: CourseRow[],
): MembershipRow[] {
  const memberships: MembershipRow[] = [];
  const seen = new Set<string>(); // "courseIdx-userIdx"

  // Build index: schoolIdx+grade -> list of course indices
  const coursesBySchoolGrade = new Map<string, number[]>();
  for (let ci = 0; ci < courses.length; ci++) {
    const key = `${courses[ci].schoolIdx}-${courses[ci].grade}`;
    if (!coursesBySchoolGrade.has(key)) coursesBySchoolGrade.set(key, []);
    coursesBySchoolGrade.get(key)!.push(ci);
  }

  // Student memberships: each student takes 4 courses from their grade at their school
  for (let si = 0; si < students.length; si++) {
    const { schoolIdx, grade } = enrollments[si];
    const available = coursesBySchoolGrade.get(`${schoolIdx}-${grade}`) || [];
    if (available.length === 0) continue;

    const selected = pickN(available, Math.min(4, available.length));
    for (const ci of selected) {
      const key = `${ci}-${si}`;
      if (!seen.has(key)) {
        memberships.push({ courseIdx: ci, userIdx: si, role: 'student' });
        seen.add(key);
      }
    }
  }

  // Teacher memberships: assign teachers to courses matching their department at their school
  // Build index: schoolIdx+subject -> list of teacher indices (offset by total students)
  const teachersBySchoolSubject = new Map<string, number[]>();
  for (let ti = 0; ti < staffAssignments.length; ti++) {
    const a = staffAssignments[ti];
    if (a.role_scope !== 'teacher' || !a.department) continue;
    const key = `${a.schoolIdx}-${a.department}`;
    if (!teachersBySchoolSubject.has(key)) teachersBySchoolSubject.set(key, []);
    teachersBySchoolSubject.get(key)!.push(ti);
  }

  for (let ci = 0; ci < courses.length; ci++) {
    const c = courses[ci];
    const key = `${c.schoolIdx}-${c.subject}`;
    const teachers = teachersBySchoolSubject.get(key);
    if (!teachers || teachers.length === 0) continue;

    // Pick one teacher for this course (round-robin)
    const teacherStaffIdx = teachers[ci % teachers.length];
    // Teacher user index is offset: total students + staffIdx
    const teacherUserIdx = staffAssignments[teacherStaffIdx].staffIdx;
    const mk = `${ci}-T${teacherUserIdx}`;
    if (!seen.has(mk)) {
      memberships.push({ courseIdx: ci, userIdx: -1, role: 'teacher' }); // -1 = use staff offset
      // Store the actual staff index in a side channel
      (memberships[memberships.length - 1] as any)._staffIdx = teacherUserIdx;
      seen.add(mk);
    }
  }

  return memberships;
}

function generateConsentRecords(
  students: UserRow[],
  studentToParent: Map<number, number>,
): ConsentRow[] {
  const records: ConsentRow[] = [];

  for (let si = 0; si < students.length; si++) {
    const parentIdx = studentToParent.get(si) ?? null;
    const r = rng();
    let status: string;
    if (r < 0.75) status = 'granted';
    else if (r < 0.90) status = 'pending';
    else status = 'denied';

    records.push({ studentIdx: si, parentIdx, status });
  }

  return records;
}

// ─── Batch Insert Helpers (pool-based, no single transaction for large data) ─

async function batchInsertUsersPool(users: UserRow[], boardId: string, passwordHash: string, batchSize = 500): Promise<string[]> {
  const allIds: string[] = [];

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    batch.forEach((user, idx) => {
      const o = idx * 8;
      placeholders.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8})`);
      values.push(boardId, user.email, passwordHash, user.name_first, user.name_last, user.role, user.external_id, JSON.stringify(user.metadata));
    });

    const result = await pool.query(
      `INSERT INTO users (board_id, email, password_hash, name_first, name_last, role, external_id, metadata)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (board_id, external_id) DO UPDATE SET
         email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
         name_first = EXCLUDED.name_first, name_last = EXCLUDED.name_last,
         role = EXCLUDED.role, metadata = EXCLUDED.metadata
       RETURNING id`,
      values,
    );
    allIds.push(...result.rows.map((r: any) => r.id));

    if ((i + batchSize) % 5000 < batchSize) {
      console.log(`  Users: ${Math.min(i + batchSize, users.length)}/${users.length}`);
    }
  }

  return allIds;
}

async function batchInsertEnrollmentsPool(enrollments: EnrollmentRow[], studentIds: string[], schoolIds: string[], batchSize = 1000): Promise<void> {
  for (let i = 0; i < enrollments.length; i += batchSize) {
    const batch = enrollments.slice(i, i + batchSize);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    batch.forEach((e, idx) => {
      const o = idx * 5;
      placeholders.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5})`);
      values.push(studentIds[e.studentIdx], schoolIds[e.schoolIdx], e.grade, '2025-2026', '2025-09-02');
    });

    await pool.query(
      `INSERT INTO student_enrollments (student_id, school_id, grade, academic_year, start_date) VALUES ${placeholders.join(', ')}`,
      values,
    );
  }
  console.log(`  Enrollments: ${enrollments.length} inserted`);
}

async function batchInsertStaffAssignmentsPool(assignments: StaffAssignmentRow[], staffIds: string[], schoolIds: string[], batchSize = 1000): Promise<void> {
  for (let i = 0; i < assignments.length; i += batchSize) {
    const batch = assignments.slice(i, i + batchSize);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    batch.forEach((a, idx) => {
      const o = idx * 5;
      placeholders.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5})`);
      values.push(staffIds[a.staffIdx], schoolIds[a.schoolIdx], '2025-2026', a.department, a.role_scope);
    });

    await pool.query(
      `INSERT INTO staff_assignments (staff_id, school_id, academic_year, department, role_scope) VALUES ${placeholders.join(', ')}`,
      values,
    );
  }
  console.log(`  Staff assignments: ${assignments.length} inserted`);
}

async function batchInsertCoursesPool(courses: CourseRow[], schoolIds: string[], batchSize = 500): Promise<string[]> {
  const allIds: string[] = [];

  for (let i = 0; i < courses.length; i += batchSize) {
    const batch = courses.slice(i, i + batchSize);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    batch.forEach((c, idx) => {
      const o = idx * 9;
      placeholders.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8}, $${o + 9})`);
      values.push(
        schoolIds[c.schoolIdx], c.name, c.course_code, c.grade, c.subject,
        '2025-2026', c.semester, 'sis_sync', JSON.stringify({ generated: true }),
      );
    });

    const result = await pool.query(
      `INSERT INTO courses (school_id, name, course_code, grade, subject, academic_year, semester, source, metadata) VALUES ${placeholders.join(', ')} RETURNING id`,
      values,
    );
    allIds.push(...result.rows.map((r: any) => r.id));
  }
  console.log(`  Courses: ${courses.length} inserted`);
  return allIds;
}

async function batchInsertMembershipsPool(
  memberships: MembershipRow[], studentIds: string[], staffIds: string[], courseIds: string[], batchSize = 1000,
): Promise<void> {
  let inserted = 0;

  for (let i = 0; i < memberships.length; i += batchSize) {
    const batch = memberships.slice(i, i + batchSize);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    batch.forEach((m, idx) => {
      const o = idx * 3;
      placeholders.push(`($${o + 1}, $${o + 2}, $${o + 3})`);

      let userId: string;
      if (m.role === 'teacher') {
        userId = staffIds[(m as any)._staffIdx];
      } else {
        userId = studentIds[m.userIdx];
      }
      values.push(courseIds[m.courseIdx], userId, m.role);
    });

    await pool.query(
      `INSERT INTO course_memberships (course_id, user_id, role) VALUES ${placeholders.join(', ')} ON CONFLICT (course_id, user_id) DO NOTHING`,
      values,
    );
    inserted += batch.length;

    if (inserted % 20000 < batchSize) {
      console.log(`  Memberships: ${Math.min(inserted, memberships.length)}/${memberships.length}`);
    }
  }
}

async function batchInsertConsentPool(
  records: ConsentRow[], studentIds: string[], parentIds: string[], boardId: string, batchSize = 1000,
): Promise<void> {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    batch.forEach((r, idx) => {
      const o = idx * 8;
      placeholders.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8})`);
      const parentId = r.parentIdx !== null ? parentIds[r.parentIdx] : null;
      const grantedAt = r.status === 'granted' ? '2025-10-15' : null;
      values.push(studentIds[r.studentIdx], parentId, boardId, 'ai_context', r.status, `{${CONSENT_SOURCES.join(',')}}`, grantedAt, 'seed-generated');
    });

    await pool.query(
      `INSERT INTO consent_records (student_id, parent_id, board_id, consent_type, status, data_sources, granted_at, notes) VALUES ${placeholders.join(', ')}`,
      values,
    );
  }
  console.log(`  Consent records: ${records.length} inserted`);
}

async function insertSampleDocuments(
  studentIds: string[],
  students: UserRow[],
  enrollments: EnrollmentRow[],
  boardId: string,
): Promise<number> {
  const docsPerStudent = 10;
  const subjects = ['Mathematics', 'Science', 'English', 'History', 'French'];
  const marks = [65, 70, 72, 75, 78, 80, 82, 85, 88, 90, 92, 95];
  let inserted = 0;

  for (let si = 0; si < 20; si++) {
    const student = students[si];
    const grade = enrollments[si].grade;
    const name = `${student.name_first} ${student.name_last}`;

    for (let d = 0; d < docsPerStudent; d++) {
      const subject = subjects[d % subjects.length];
      const mark = marks[randomInt(0, marks.length - 1)];
      const isReportCard = d < 3;

      const content = isReportCard
        ? `Student: ${name}\nCourse: Grade ${grade} ${subject}\nTerm: ${d === 0 ? 'Fall' : d === 1 ? 'Winter' : 'Spring'} 2025-2026\n\nOverall Mark: ${mark}%\n\nTeacher Comments:\n${name} has demonstrated ${mark >= 80 ? 'strong' : mark >= 70 ? 'satisfactory' : 'developing'} understanding in ${subject}. ${mark >= 80 ? 'Excellent participation in class activities.' : 'Continued effort is encouraged.'}\n\nLearning Skills:\n- Responsibility: ${mark >= 80 ? 'Excellent' : 'Good'}\n- Organization: Good\n- Independent Work: ${mark >= 85 ? 'Excellent' : 'Good'}\n- Collaboration: ${mark >= 75 ? 'Excellent' : 'Good'}`
        : `Assignment: ${subject} ${d <= 5 ? 'Quiz' : 'Project'} ${d}\nCourse: Grade ${grade} ${subject}\nStudent: ${name}\nDate: ${2025 + (d > 5 ? 1 : 0)}-${String(9 + (d % 4)).padStart(2, '0')}-${String(10 + d).padStart(2, '0')}\n\nGrade: ${mark}%\nFeedback: ${mark >= 80 ? 'Well done' : 'Keep working hard'}. ${name} showed ${mark >= 80 ? 'excellent' : 'adequate'} understanding of the material.`;

      const hash = sha256(content);
      const source = isReportCard ? 'sis_report_card' : 'google_classroom_assignment';

      await pool.query(
        `INSERT INTO documents (student_id, board_id, source, title, content, hash, sensitivity, academic_year, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          studentIds[si], boardId, source,
          isReportCard ? `Grade ${grade} ${subject} Report Card` : `${subject} ${d <= 5 ? 'Quiz' : 'Project'} ${d}`,
          content, hash, 'standard', '2025-2026',
          JSON.stringify({ generated: true }),
        ],
      );
      inserted++;
    }
  }

  console.log(`  Documents: ${inserted} inserted`);
  return inserted;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seedLarge(): Promise<void> {
  const startTime = Date.now();
  console.log('=== StudentContext AI: Large Seed (25,000 students) ===\n');

  const passwordHash = await hashPassword('devpassword123');

  // Phase 1: Board & Schools
  console.log('Phase 1: Board & Schools...');
  const boardResult = await pool.query(
    `INSERT INTO boards (name, slug, province)
     VALUES ('Thames Valley District School Board', 'tvdsb', 'ON')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  const boardId = boardResult.rows[0].id;
  console.log(`  Board: tvdsb (${boardId})`);

  const schoolIds: string[] = [];
  for (const school of SCHOOLS) {
    const r = await pool.query(
      `INSERT INTO schools (board_id, name, school_code, grades)
       VALUES ($1, $2, $3, '{9,10,11,12}')
       ON CONFLICT (board_id, school_code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [boardId, school.name, school.code],
    );
    schoolIds.push(r.rows[0].id);
  }
  console.log(`  Schools: ${schoolIds.length} created/updated`);

  // Phase 2: Clean up previous generated data
  console.log('\nPhase 2: Cleaning previous generated data...');
  await pool.query(`DELETE FROM consent_records WHERE notes = 'seed-generated'`);
  await pool.query(`DELETE FROM course_memberships WHERE course_id IN (SELECT id FROM courses WHERE metadata->>'generated' = 'true')`);
  await pool.query(`DELETE FROM courses WHERE metadata->>'generated' = 'true'`);
  await pool.query(`DELETE FROM staff_assignments WHERE staff_id IN (SELECT id FROM users WHERE board_id = $1 AND metadata->>'generated' = 'true')`, [boardId]);
  await pool.query(`DELETE FROM student_enrollments WHERE student_id IN (SELECT id FROM users WHERE board_id = $1 AND metadata->>'generated' = 'true')`, [boardId]);
  await pool.query(`DELETE FROM documents WHERE metadata->>'generated' = 'true'`);
  await pool.query(`DELETE FROM users WHERE board_id = $1 AND metadata->>'generated' = 'true'`, [boardId]);
  console.log('  Cleanup complete');

  // Phase 3: Generate data in memory
  console.log('\nPhase 3: Generating data in memory...');
  const { students, enrollments } = generateStudents();
  console.log(`  Students: ${students.length}`);
  const { staff, assignments } = generateStaff();
  console.log(`  Staff: ${staff.length}`);
  const { parents, studentToParent } = generateParents(students, enrollments);
  console.log(`  Parents: ${parents.length}`);
  const courses = generateCourses();
  console.log(`  Courses: ${courses.length}`);

  // Phase 4: Insert users
  console.log('\nPhase 4: Inserting users...');
  const t4 = Date.now();
  const studentIds = await batchInsertUsersPool(students, boardId, passwordHash);
  const staffIds = await batchInsertUsersPool(staff, boardId, passwordHash);
  const parentIds = await batchInsertUsersPool(parents, boardId, passwordHash);
  console.log(`  Users complete: ${studentIds.length + staffIds.length + parentIds.length} (${((Date.now() - t4) / 1000).toFixed(1)}s)`);

  // Phase 5: Enrollments
  console.log('\nPhase 5: Student enrollments...');
  const t5 = Date.now();
  await batchInsertEnrollmentsPool(enrollments, studentIds, schoolIds);
  console.log(`  (${((Date.now() - t5) / 1000).toFixed(1)}s)`);

  // Phase 6: Staff assignments
  console.log('\nPhase 6: Staff assignments...');
  await batchInsertStaffAssignmentsPool(assignments, staffIds, schoolIds);

  // Phase 7: Courses
  console.log('\nPhase 7: Courses...');
  const courseIds = await batchInsertCoursesPool(courses, schoolIds);

  // Phase 8: Course memberships
  console.log('\nPhase 8: Course memberships...');
  const t8 = Date.now();
  const memberships = generateCourseMemberships(students, enrollments, staff, assignments, courses);
  console.log(`  Generated: ${memberships.length} memberships`);
  await batchInsertMembershipsPool(memberships, studentIds, staffIds, courseIds);
  console.log(`  (${((Date.now() - t8) / 1000).toFixed(1)}s)`);

  // Phase 9: Consent records
  console.log('\nPhase 9: Consent records...');
  const consentRecords = generateConsentRecords(students, studentToParent);
  await batchInsertConsentPool(consentRecords, studentIds, parentIds, boardId);

  // Phase 10: Sample documents
  console.log('\nPhase 10: Sample documents...');
  await insertSampleDocuments(studentIds, students, enrollments, boardId);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Seed Complete (${totalTime}s) ===`);
  console.log(`  Board: 1 (tvdsb)`);
  console.log(`  Schools: ${schoolIds.length}`);
  console.log(`  Students: ${studentIds.length}`);
  console.log(`  Staff: ${staffIds.length}`);
  console.log(`  Parents: ${parentIds.length}`);
  console.log(`  Total users: ${studentIds.length + staffIds.length + parentIds.length}`);
  console.log(`  Enrollments: ${enrollments.length}`);
  console.log(`  Staff assignments: ${assignments.length}`);
  console.log(`  Courses: ${courseIds.length}`);
  console.log(`  Course memberships: ${memberships.length}`);
  console.log(`  Consent records: ${consentRecords.length}`);

  await pool.end();
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

seedLarge().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
