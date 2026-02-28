import { query } from '../../db/index.js';

export const auditLogsResource = {
  uri: 'studentcontext://audit/{board_id}',
  name: 'Audit Logs',
  description: 'Recent audit log entries for a board. Returns the 50 most recent entries.',
  mimeType: 'application/json',
};

export async function readAuditLogs(boardId: string) {
  const result = await query(
    `SELECT al.id, al.actor_id, al.action, al.target_student_id,
            al.details, al.ip_address, al.session_id, al.created_at,
            u.name_first || ' ' || u.name_last AS actor_name
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.actor_id
     WHERE al.board_id = $1
     ORDER BY al.created_at DESC
     LIMIT 50`,
    [boardId]
  );

  return JSON.stringify({
    board_id: boardId,
    entries: result.rows,
    total: result.rows.length,
  });
}
