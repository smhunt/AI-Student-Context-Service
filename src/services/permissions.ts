import { findUserById } from '../db/queries/users.js';
import {
  currentAcademicYear, previousAcademicYear,
  getStudentIdsForTeacher, getSchoolStudentIds,
  getChildrenIds,
} from '../db/queries/staff-scope.js';
import type { DocumentSource, SensitivityLevel, UserRole } from '../types/index.js';

export interface ContextScope {
  studentIds: string[];
  sensitivityMax: SensitivityLevel;
  dataSources: DocumentSource[];
  academicYears?: string[];
}

const STUDENT_VISIBLE_SOURCES: DocumentSource[] = [
  'google_classroom_assignment', 'google_classroom_submission',
  'google_classroom_grade', 'sis_report_card', 'sis_transcript',
  'assessment_eqao', 'assessment_board',
];

const PARENT_VISIBLE_SOURCES: DocumentSource[] = [
  'google_classroom_assignment', 'google_classroom_grade',
  'sis_report_card', 'sis_transcript',
  'assessment_eqao', 'assessment_board',
];

const ALL_ACADEMIC_SOURCES: DocumentSource[] = [
  'google_classroom_assignment', 'google_classroom_submission',
  'google_classroom_grade', 'google_classroom_comment',
  'sis_report_card', 'sis_transcript', 'sis_attendance',
  'assessment_eqao', 'assessment_board',
  'teacher_note',
];

const ALL_SOURCES: DocumentSource[] = [
  ...ALL_ACADEMIC_SOURCES,
  'sis_iep', 'library_record', 'guidance_note',
];

const BASIC_ACADEMIC_SOURCES: DocumentSource[] = [
  'google_classroom_assignment', 'google_classroom_submission',
  'google_classroom_grade', 'sis_report_card',
];

export async function resolvePermissionScope(
  userId: string,
  boardId: string
): Promise<ContextScope> {
  const user = await findUserById(userId);
  if (!user || user.board_id !== boardId) {
    return { studentIds: [], sensitivityMax: 'standard', dataSources: [] };
  }

  const year = currentAcademicYear();
  const prevYear = previousAcademicYear();

  switch (user.role as UserRole) {
    case 'student':
      return {
        studentIds: [userId],
        sensitivityMax: 'standard',
        dataSources: STUDENT_VISIBLE_SOURCES,
      };

    case 'teacher': {
      const studentIds = await getStudentIdsForTeacher(userId, [year, prevYear]);
      return {
        studentIds,
        sensitivityMax: 'sensitive',
        dataSources: ALL_ACADEMIC_SOURCES,
        academicYears: [year, prevYear],
      };
    }

    case 'educational_assistant': {
      // EAs get same scope as teachers via course memberships
      const studentIds = await getStudentIdsForTeacher(userId, [year]);
      // Fall back to school scope if no course memberships
      if (studentIds.length === 0) {
        const schoolStudents = await getSchoolStudentIds(userId, year);
        return {
          studentIds: schoolStudents,
          sensitivityMax: 'sensitive',
          dataSources: ALL_ACADEMIC_SOURCES,
        };
      }
      return {
        studentIds,
        sensitivityMax: 'sensitive',
        dataSources: ALL_ACADEMIC_SOURCES,
      };
    }

    case 'guidance_counsellor': {
      // School-wide scope with all sensitivity
      const studentIds = await getSchoolStudentIds(userId, year);
      return {
        studentIds,
        sensitivityMax: 'restricted',
        dataSources: ALL_SOURCES,
      };
    }

    case 'vice_principal':
    case 'principal': {
      const studentIds = await getSchoolStudentIds(userId, year);
      return {
        studentIds,
        sensitivityMax: 'restricted',
        dataSources: ALL_SOURCES,
      };
    }

    case 'supply_teacher': {
      // Today's class — falls back to course memberships for current year
      const studentIds = await getStudentIdsForTeacher(userId, [year]);
      return {
        studentIds,
        sensitivityMax: 'standard',
        dataSources: BASIC_ACADEMIC_SOURCES,
        academicYears: [year],
      };
    }

    case 'parent': {
      const childrenIds = await getChildrenIds(userId);
      return {
        studentIds: childrenIds,
        sensitivityMax: 'standard',
        dataSources: PARENT_VISIBLE_SOURCES,
      };
    }

    case 'board_admin':
      // No individual student context — aggregate only
      return {
        studentIds: [],
        sensitivityMax: 'standard',
        dataSources: [],
      };

    default:
      return { studentIds: [], sensitivityMax: 'standard', dataSources: [] };
  }
}
