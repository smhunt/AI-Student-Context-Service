import { query } from '../index.js';
import type { ConsentRecord } from '../../types/index.js';

export async function findActiveConsent(
  studentId: string,
  consentType = 'ai_context'
): Promise<ConsentRecord | null> {
  const result = await query<ConsentRecord>(
    `SELECT * FROM consent_records
     WHERE student_id = $1 AND consent_type = $2 AND status = 'granted'
     ORDER BY granted_at DESC LIMIT 1`,
    [studentId, consentType]
  );
  return result.rows[0] ?? null;
}

export async function getConsentedSources(
  studentId: string,
  consentType = 'ai_context'
): Promise<string[]> {
  const consent = await findActiveConsent(studentId, consentType);
  if (!consent) return [];
  return consent.data_sources ?? [];
}

/**
 * Find children linked to a parent via consent_records, with user info.
 */
export async function findChildrenWithConsent(
  parentId: string,
  boardId: string
): Promise<Array<{
  id: string;
  name_first: string;
  name_last: string;
  email: string | null;
  consent_id: string | null;
  status: string | null;
  data_sources: string[] | null;
  granted_at: Date | null;
  revoked_at: Date | null;
}>> {
  const result = await query<{
    id: string;
    name_first: string;
    name_last: string;
    email: string | null;
    consent_id: string | null;
    status: string | null;
    data_sources: string[] | null;
    granted_at: Date | null;
    revoked_at: Date | null;
  }>(
    `SELECT DISTINCT ON (u.id)
       u.id, u.name_first, u.name_last, u.email,
       cr.id as consent_id, cr.status, cr.data_sources,
       cr.granted_at, cr.revoked_at
     FROM consent_records cr
     JOIN users u ON u.id = cr.student_id
     WHERE cr.parent_id = $1 AND cr.board_id = $2
     ORDER BY u.id, cr.updated_at DESC`,
    [parentId, boardId]
  );
  return result.rows;
}

/**
 * Find consent record for a specific student and parent.
 */
export async function findConsentForStudent(
  studentId: string,
  parentId: string
): Promise<ConsentRecord | null> {
  const result = await query<ConsentRecord>(
    `SELECT * FROM consent_records
     WHERE student_id = $1 AND parent_id = $2
     ORDER BY updated_at DESC LIMIT 1`,
    [studentId, parentId]
  );
  return result.rows[0] ?? null;
}

/**
 * Grant consent for a student. Upserts — if a record exists for this
 * student/parent/consent_type, it updates; otherwise it inserts.
 */
export async function grantConsent(params: {
  studentId: string;
  parentId: string;
  boardId: string;
  dataSources: string[];
  consentType?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<ConsentRecord> {
  const consentType = params.consentType ?? 'ai_context';

  // Try to find existing record for this student/parent/consent_type
  const existing = await query<ConsentRecord>(
    `SELECT * FROM consent_records
     WHERE student_id = $1 AND parent_id = $2 AND consent_type = $3
     ORDER BY updated_at DESC LIMIT 1`,
    [params.studentId, params.parentId, consentType]
  );

  if (existing.rows.length > 0) {
    // Update existing record
    const result = await query<ConsentRecord>(
      `UPDATE consent_records
       SET status = 'granted',
           data_sources = $1,
           granted_at = NOW(),
           revoked_at = NULL,
           ip_address = $2,
           user_agent = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        params.dataSources,
        params.ipAddress ?? null,
        params.userAgent ?? null,
        existing.rows[0].id,
      ]
    );
    return result.rows[0];
  }

  // Insert new record
  const result = await query<ConsentRecord>(
    `INSERT INTO consent_records
       (student_id, parent_id, board_id, consent_type, status, data_sources,
        granted_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, 'granted', $5, NOW(), $6, $7)
     RETURNING *`,
    [
      params.studentId,
      params.parentId,
      params.boardId,
      consentType,
      params.dataSources,
      params.ipAddress ?? null,
      params.userAgent ?? null,
    ]
  );
  return result.rows[0];
}

/**
 * Revoke consent for a student.
 */
export async function revokeConsent(
  studentId: string,
  parentId: string
): Promise<ConsentRecord | null> {
  const result = await query<ConsentRecord>(
    `UPDATE consent_records
     SET status = 'revoked',
         revoked_at = NOW(),
         updated_at = NOW()
     WHERE student_id = $1 AND parent_id = $2 AND status = 'granted'
     RETURNING *`,
    [studentId, parentId]
  );
  return result.rows[0] ?? null;
}
