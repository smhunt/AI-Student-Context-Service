import { query } from '../index.js';

export interface StaffStudentRow {
  student_id: string;
  name_first: string;
  name_last: string;
  email: string | null;
  grade: number | null;
  course_id: string;
  course_name: string;
  course_code: string | null;
  subject: string | null;
}

export async function getStudentsWithCourses(
  staffId: string,
  academicYears: string[]
): Promise<StaffStudentRow[]> {
  const result = await query<StaffStudentRow>(
    `SELECT DISTINCT
       u.id as student_id, u.name_first, u.name_last, u.email,
       se.grade,
       c.id as course_id, c.name as course_name, c.course_code, c.subject
     FROM users u
     JOIN course_memberships cm_student ON cm_student.user_id = u.id AND cm_student.role = 'student'
     JOIN courses c ON c.id = cm_student.course_id
     JOIN course_memberships cm_staff ON cm_staff.course_id = c.id AND cm_staff.role = 'teacher'
     LEFT JOIN student_enrollments se ON se.student_id = u.id AND se.status = 'active'
     WHERE cm_staff.user_id = $1
       AND c.academic_year = ANY($2)
     ORDER BY c.name, u.name_last, u.name_first`,
    [staffId, academicYears]
  );
  return result.rows;
}

export async function getSchoolStudentsWithInfo(
  staffId: string,
  academicYear: string
): Promise<StaffStudentRow[]> {
  const result = await query<StaffStudentRow>(
    `SELECT DISTINCT
       u.id as student_id, u.name_first, u.name_last, u.email,
       se.grade,
       c.id as course_id, c.name as course_name, c.course_code, c.subject
     FROM users u
     JOIN student_enrollments se ON se.student_id = u.id AND se.status = 'active'
     JOIN staff_assignments sa ON sa.school_id = se.school_id
     LEFT JOIN course_memberships cm ON cm.user_id = u.id AND cm.role = 'student'
     LEFT JOIN courses c ON c.id = cm.course_id AND c.academic_year = $3
     WHERE sa.staff_id = $1
       AND se.academic_year = $2
     ORDER BY COALESCE(c.name, 'ZZZ'), u.name_last, u.name_first`,
    [staffId, academicYear, academicYear]
  );
  return result.rows;
}

export interface StaffCourseRow {
  id: string;
  name: string;
  course_code: string | null;
  subject: string | null;
  academic_year: string;
  student_count: number;
}

export async function getStaffCourses(
  staffId: string,
  academicYears: string[]
): Promise<StaffCourseRow[]> {
  const result = await query<StaffCourseRow>(
    `SELECT c.id, c.name, c.course_code, c.subject, c.academic_year,
       (SELECT count(*) FROM course_memberships cm2
        WHERE cm2.course_id = c.id AND cm2.role = 'student')::int as student_count
     FROM courses c
     JOIN course_memberships cm ON cm.course_id = c.id
     WHERE cm.user_id = $1 AND cm.role = 'teacher'
       AND c.academic_year = ANY($2)
     ORDER BY c.name`,
    [staffId, academicYears]
  );
  return result.rows;
}

export interface CourseInsightRow {
  student_count: number;
  document_count: number;
  students_with_docs: number;
  students_without_docs: number;
  source_breakdown: Record<string, number>;
}

export async function getCourseInsights(courseId: string): Promise<CourseInsightRow> {
  // Get student count
  const studentResult = await query<{ count: number }>(
    `SELECT count(DISTINCT user_id)::int as count
     FROM course_memberships WHERE course_id = $1 AND role = 'student'`,
    [courseId]
  );
  const studentCount = studentResult.rows[0]?.count ?? 0;

  // Get students in the course
  const studentsResult = await query<{ user_id: string }>(
    `SELECT user_id FROM course_memberships WHERE course_id = $1 AND role = 'student'`,
    [courseId]
  );
  const studentIds = studentsResult.rows.map(r => r.user_id);

  if (studentIds.length === 0) {
    return {
      student_count: 0,
      document_count: 0,
      students_with_docs: 0,
      students_without_docs: 0,
      source_breakdown: {},
    };
  }

  // Get document stats for these students
  const docResult = await query<{ total: number; with_docs: number }>(
    `SELECT
       count(DISTINCT d.id)::int as total,
       count(DISTINCT d.student_id)::int as with_docs
     FROM documents d
     WHERE d.student_id = ANY($1)`,
    [studentIds]
  );
  const docCount = docResult.rows[0]?.total ?? 0;
  const withDocs = docResult.rows[0]?.with_docs ?? 0;

  // Source breakdown
  const sourceResult = await query<{ source: string; count: number }>(
    `SELECT d.source, count(*)::int as count
     FROM documents d
     WHERE d.student_id = ANY($1)
     GROUP BY d.source
     ORDER BY count DESC`,
    [studentIds]
  );
  const sourceBreakdown: Record<string, number> = {};
  for (const r of sourceResult.rows) {
    sourceBreakdown[r.source] = r.count;
  }

  return {
    student_count: studentCount,
    document_count: docCount,
    students_with_docs: withDocs,
    students_without_docs: studentCount - withDocs,
    source_breakdown: sourceBreakdown,
  };
}
