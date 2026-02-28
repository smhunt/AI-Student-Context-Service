import { findActiveConsent } from '../db/queries/consent.js';
import type { ConsentRecord, DocumentSource } from '../types/index.js';

export interface ConsentResult {
  allowed: boolean;
  filteredSources: DocumentSource[];
  consentRecord?: ConsentRecord;
}

/**
 * Verify that a student has active consent for AI context retrieval.
 * If consent exists, returns the intersection of requested sources and consented sources.
 */
export async function verifyConsent(
  studentId: string,
  requestedSources: DocumentSource[]
): Promise<ConsentResult> {
  const consent = await findActiveConsent(studentId, 'ai_context');

  if (!consent) {
    return { allowed: false, filteredSources: [] };
  }

  // If consent has empty data_sources, treat as blanket consent
  if (!consent.data_sources || consent.data_sources.length === 0) {
    return {
      allowed: true,
      filteredSources: requestedSources,
      consentRecord: consent,
    };
  }

  // Intersect requested sources with consented sources
  const consentedSet = new Set(consent.data_sources);
  const filteredSources = requestedSources.filter((s) => consentedSet.has(s));

  return {
    allowed: filteredSources.length > 0,
    filteredSources: filteredSources as DocumentSource[],
    consentRecord: consent,
  };
}
