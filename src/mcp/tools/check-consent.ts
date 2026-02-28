import { z } from 'zod/v4';
import { findActiveConsent } from '../../db/queries/consent.js';

export const checkConsentSchema = {
  name: 'check_consent',
  description:
    'Check if a student has active parental consent for AI context retrieval. Returns consent status and approved data sources.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      student_id: { type: 'string', description: 'Student ID to check consent for' },
      consent_type: { type: 'string', description: 'Type of consent (default: ai_context)' },
    },
    required: ['student_id'],
  },
};

const inputValidator = z.object({
  student_id: z.string().uuid(),
  consent_type: z.string().optional(),
});

export async function handleCheckConsent(args: Record<string, unknown>) {
  const parsed = inputValidator.parse(args);
  const consent = await findActiveConsent(
    parsed.student_id,
    parsed.consent_type || 'ai_context'
  );

  if (!consent) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          student_id: parsed.student_id,
          has_consent: false,
          status: 'none',
        }),
      }],
    };
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        student_id: parsed.student_id,
        has_consent: consent.status === 'granted',
        status: consent.status,
        data_sources: consent.data_sources,
        granted_at: consent.granted_at,
      }),
    }],
  };
}
