import { query } from '../index.js';

export function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Academic year starts in September
  if (month >= 8) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

export function previousAcademicYear(): string {
  const current = currentAcademicYear();
  const [startYear] = current.split('-').map(Number);
  return `${startYear - 1}-${startYear}`;
}

/**
 * Get student IDs that a teacher teaches (via course_memberships).
 */
export async function getStudentIdsForTeacher(
  teacherId: string,
  academicYears: string[]
): Promise<string[]> {
  const result = await query<{ student_id: string }>(
    `SELECT DISTINCT cm_student.user_id as student_id
     FROM course_memberships cm_teacher
     JOIN courses c ON c.id = cm_teacher.course_id
     JOIN course_memberships cm_student ON cm_student.course_id = cm_teacher.course_id
     WHERE cm_teacher.user_id = $1
       AND cm_teacher.role = 'teacher'
       AND cm_student.role = 'student'
       AND c.academic_year = ANY($2)`,
    [teacherId, academicYears]
  );
  return result.rows.map((r) => r.student_id);
}

/**
 * Get all student IDs enrolled at a staff member's school(s).
 */
export async function getSchoolStudentIds(
  staffId: string,
  academicYear: string
): Promise<string[]> {
  const result = await query<{ student_id: string }>(
    `SELECT DISTINCT se.student_id
     FROM student_enrollments se
     JOIN staff_assignments sa ON sa.school_id = se.school_id
     WHERE sa.staff_id = $1
       AND se.academic_year = $2
       AND se.status = 'active'`,
    [staffId, academicYear]
  );
  return result.rows.map((r) => r.student_id);
}

/**
 * Get children IDs for a parent via consent_records.
 */
export async function getChildrenIds(parentId: string): Promise<string[]> {
  const result = await query<{ student_id: string }>(
    `SELECT DISTINCT student_id
     FROM consent_records
     WHERE parent_id = $1`,
    [parentId]
  );
  return result.rows.map((r) => r.student_id);
}

/**
 * Get school IDs for a staff member from staff_assignments.
 */
export async function getStaffSchoolIds(
  staffId: string,
  academicYear: string
): Promise<string[]> {
  const result = await query<{ school_id: string }>(
    `SELECT DISTINCT school_id
     FROM staff_assignments
     WHERE staff_id = $1 AND academic_year = $2`,
    [staffId, academicYear]
  );
  return result.rows.map((r) => r.school_id);
}
