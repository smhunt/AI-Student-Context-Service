import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/db/queries/consent.js', () => ({
  findActiveConsent: vi.fn(),
  getConsentedSources: vi.fn(),
}));

import { verifyConsent } from '../../src/services/consent.js';
import { findActiveConsent } from '../../src/db/queries/consent.js';

describe('verifyConsent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns not allowed when no consent exists', async () => {
    (findActiveConsent as any).mockResolvedValue(null);
    const result = await verifyConsent('student-1', ['sis_report_card']);
    expect(result.allowed).toBe(false);
    expect(result.filteredSources).toEqual([]);
  });

  it('returns allowed with source intersection', async () => {
    (findActiveConsent as any).mockResolvedValue({
      status: 'granted',
      data_sources: ['sis_report_card', 'google_classroom_grade'],
    });
    const result = await verifyConsent('student-1', [
      'sis_report_card', 'sis_iep', 'google_classroom_grade'
    ]);
    expect(result.allowed).toBe(true);
    expect(result.filteredSources).toEqual(['sis_report_card', 'google_classroom_grade']);
    expect(result.filteredSources).not.toContain('sis_iep');
  });

  it('treats empty data_sources as blanket consent', async () => {
    (findActiveConsent as any).mockResolvedValue({
      status: 'granted',
      data_sources: [],
    });
    const result = await verifyConsent('student-1', ['sis_report_card', 'sis_iep']);
    expect(result.allowed).toBe(true);
    expect(result.filteredSources).toHaveLength(2);
  });

  it('returns not allowed when no sources overlap', async () => {
    (findActiveConsent as any).mockResolvedValue({
      status: 'granted',
      data_sources: ['google_classroom_assignment'],
    });
    const result = await verifyConsent('student-1', ['sis_iep']);
    expect(result.allowed).toBe(false);
    expect(result.filteredSources).toEqual([]);
  });
});
