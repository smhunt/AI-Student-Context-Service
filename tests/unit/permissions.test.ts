import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB query modules before importing
vi.mock('../../src/db/queries/users.js', () => ({
  findUserById: vi.fn(),
}));
vi.mock('../../src/db/queries/staff-scope.js', () => ({
  currentAcademicYear: vi.fn(() => '2025-2026'),
  previousAcademicYear: vi.fn(() => '2024-2025'),
  getStudentIdsForTeacher: vi.fn(),
  getSchoolStudentIds: vi.fn(),
  getChildrenIds: vi.fn(),
}));

import { resolvePermissionScope } from '../../src/services/permissions.js';
import { findUserById } from '../../src/db/queries/users.js';
import { getStudentIdsForTeacher, getSchoolStudentIds, getChildrenIds } from '../../src/db/queries/staff-scope.js';

const BOARD_ID = 'board-001';

function mockUser(role: string, id = 'user-001') {
  (findUserById as any).mockResolvedValue({ id, board_id: BOARD_ID, role });
}

describe('resolvePermissionScope', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('student can only access own data with standard sensitivity', async () => {
    mockUser('student');
    const scope = await resolvePermissionScope('user-001', BOARD_ID);
    expect(scope.studentIds).toEqual(['user-001']);
    expect(scope.sensitivityMax).toBe('standard');
  });

  it('teacher gets course students with sensitive access', async () => {
    mockUser('teacher');
    (getStudentIdsForTeacher as any).mockResolvedValue(['s1', 's2', 's3']);
    const scope = await resolvePermissionScope('user-001', BOARD_ID);
    expect(scope.studentIds).toEqual(['s1', 's2', 's3']);
    expect(scope.sensitivityMax).toBe('sensitive');
    expect(scope.academicYears).toContain('2025-2026');
    expect(scope.academicYears).toContain('2024-2025');
  });

  it('guidance counsellor gets school-wide with restricted access', async () => {
    mockUser('guidance_counsellor');
    (getSchoolStudentIds as any).mockResolvedValue(['s1', 's2', 's3', 's4']);
    const scope = await resolvePermissionScope('user-001', BOARD_ID);
    expect(scope.studentIds).toHaveLength(4);
    expect(scope.sensitivityMax).toBe('restricted');
    expect(scope.dataSources).toContain('sis_iep');
    expect(scope.dataSources).toContain('guidance_note');
  });

  it('principal gets school-wide with restricted access', async () => {
    mockUser('principal');
    (getSchoolStudentIds as any).mockResolvedValue(['s1', 's2']);
    const scope = await resolvePermissionScope('user-001', BOARD_ID);
    expect(scope.sensitivityMax).toBe('restricted');
    expect(scope.dataSources).toContain('sis_iep');
  });

  it('parent can only access own children with standard sensitivity', async () => {
    mockUser('parent');
    (getChildrenIds as any).mockResolvedValue(['child-1', 'child-2']);
    const scope = await resolvePermissionScope('user-001', BOARD_ID);
    expect(scope.studentIds).toEqual(['child-1', 'child-2']);
    expect(scope.sensitivityMax).toBe('standard');
    expect(scope.dataSources).not.toContain('sis_iep');
    expect(scope.dataSources).not.toContain('guidance_note');
  });

  it('supply teacher gets standard sensitivity, current year only', async () => {
    mockUser('supply_teacher');
    (getStudentIdsForTeacher as any).mockResolvedValue(['s1']);
    const scope = await resolvePermissionScope('user-001', BOARD_ID);
    expect(scope.sensitivityMax).toBe('standard');
    expect(scope.academicYears).toEqual(['2025-2026']);
  });

  it('board_admin gets no individual student access', async () => {
    mockUser('board_admin');
    const scope = await resolvePermissionScope('user-001', BOARD_ID);
    expect(scope.studentIds).toEqual([]);
    expect(scope.dataSources).toEqual([]);
  });

  it('returns empty scope for wrong board', async () => {
    mockUser('teacher');
    const scope = await resolvePermissionScope('user-001', 'wrong-board');
    expect(scope.studentIds).toEqual([]);
  });

  it('returns empty scope for non-existent user', async () => {
    (findUserById as any).mockResolvedValue(null);
    const scope = await resolvePermissionScope('ghost', BOARD_ID);
    expect(scope.studentIds).toEqual([]);
  });
});
