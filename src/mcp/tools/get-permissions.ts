import { z } from 'zod/v4';
import { resolvePermissionScope } from '../../services/permissions.js';

export const getPermissionsSchema = {
  name: 'get_permission_scope',
  description:
    'Get the permission scope for a user — which students they can access, maximum sensitivity level, and allowed data sources based on their role.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      user_id: { type: 'string', description: 'User ID to resolve permissions for' },
      board_id: { type: 'string', description: 'Board ID for multi-tenant scoping' },
    },
    required: ['user_id', 'board_id'],
  },
};

const inputValidator = z.object({
  user_id: z.string().uuid(),
  board_id: z.string().uuid(),
});

export async function handleGetPermissions(args: Record<string, unknown>) {
  const parsed = inputValidator.parse(args);
  const scope = await resolvePermissionScope(parsed.user_id, parsed.board_id);

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        user_id: parsed.user_id,
        student_count: scope.studentIds.length,
        student_ids: scope.studentIds,
        max_sensitivity: scope.sensitivityMax,
        data_sources: scope.dataSources,
        academic_years: scope.academicYears,
      }),
    }],
  };
}
