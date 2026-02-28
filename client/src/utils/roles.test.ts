import { describe, it, expect } from 'vitest';
import { isStaffRole, getRoleLabel } from './roles.js';

describe('isStaffRole', () => {
  it('returns true for teacher', () => expect(isStaffRole('teacher')).toBe(true));
  it('returns true for principal', () => expect(isStaffRole('principal')).toBe(true));
  it('returns true for guidance_counsellor', () => expect(isStaffRole('guidance_counsellor')).toBe(true));
  it('returns true for vice_principal', () => expect(isStaffRole('vice_principal')).toBe(true));
  it('returns true for supply_teacher', () => expect(isStaffRole('supply_teacher')).toBe(true));
  it('returns true for educational_assistant', () => expect(isStaffRole('educational_assistant')).toBe(true));
  it('returns false for student', () => expect(isStaffRole('student')).toBe(false));
  it('returns false for parent', () => expect(isStaffRole('parent')).toBe(false));
  it('returns false for board_admin', () => expect(isStaffRole('board_admin')).toBe(false));
  it('returns false for unknown role', () => expect(isStaffRole('unknown')).toBe(false));
});

describe('getRoleLabel', () => {
  it('formats teacher', () => expect(getRoleLabel('teacher')).toBe('Teacher'));
  it('formats student', () => expect(getRoleLabel('student')).toBe('Student'));
  it('formats guidance_counsellor', () => expect(getRoleLabel('guidance_counsellor')).toBe('Guidance Counsellor'));
  it('formats board_admin', () => expect(getRoleLabel('board_admin')).toBe('Board Admin'));
  it('formats vice_principal', () => expect(getRoleLabel('vice_principal')).toBe('Vice Principal'));
  it('formats educational_assistant', () => expect(getRoleLabel('educational_assistant')).toBe('Educational Assistant'));
  it('formats supply_teacher', () => expect(getRoleLabel('supply_teacher')).toBe('Supply Teacher'));
  it('formats parent', () => expect(getRoleLabel('parent')).toBe('Parent'));
  it('formats principal', () => expect(getRoleLabel('principal')).toBe('Principal'));
  it('returns raw role string for unknown role', () => {
    expect(getRoleLabel('unknown_role')).toBe('unknown_role');
  });
});
