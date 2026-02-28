import { query } from '../index.js';
import type { AuditLogEntry } from '../../types/index.js';

export async function createAuditEntry(entry: {
  board_id: string;
  actor_id: string;
  action: string;
  target_student_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  session_id?: string;
}): Promise<AuditLogEntry> {
  const result = await query<AuditLogEntry>(
    `INSERT INTO audit_log (board_id, actor_id, action, target_student_id, details, ip_address, session_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      entry.board_id,
      entry.actor_id,
      entry.action,
      entry.target_student_id ?? null,
      JSON.stringify(entry.details),
      entry.ip_address ?? null,
      entry.session_id ?? null,
    ]
  );
  return result.rows[0];
}

export async function findAuditEntries(filters: {
  board_id: string;
  actor_id?: string;
  target_student_id?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  const conditions = ['board_id = $1'];
  const params: unknown[] = [filters.board_id];
  let idx = 2;

  if (filters.actor_id) {
    conditions.push(`actor_id = $${idx++}`);
    params.push(filters.actor_id);
  }
  if (filters.target_student_id) {
    conditions.push(`target_student_id = $${idx++}`);
    params.push(filters.target_student_id);
  }
  if (filters.action) {
    conditions.push(`action = $${idx++}`);
    params.push(filters.action);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const result = await query<AuditLogEntry>(
    `SELECT * FROM audit_log
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );
  return result.rows;
}
