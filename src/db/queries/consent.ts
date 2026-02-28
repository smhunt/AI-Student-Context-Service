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
