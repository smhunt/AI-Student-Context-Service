export const STAFF_ROLES = [
  'teacher', 'educational_assistant', 'guidance_counsellor',
  'vice_principal', 'principal', 'supply_teacher',
] as const;

export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  educational_assistant: 'Educational Assistant',
  guidance_counsellor: 'Guidance Counsellor',
  vice_principal: 'Vice Principal',
  principal: 'Principal',
  board_admin: 'Board Admin',
  parent: 'Parent',
  supply_teacher: 'Supply Teacher',
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
