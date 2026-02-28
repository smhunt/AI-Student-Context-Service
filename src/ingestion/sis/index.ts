import type { SISProvider } from './sis-provider.js';
import { MockSISProvider } from './mock-sis-provider.js';
import { AspenSISProvider } from './aspen-sis-provider.js';
import { config } from '../../config/index.js';

export type { SISProvider } from './sis-provider.js';
export type {
  SISStudent, SISReportCard, SISTranscript, SISAttendance,
  SISIEP, SISEQAOResult, SISRoster,
} from './sis-provider.js';

let _instance: SISProvider | null = null;

/**
 * Factory for SIS providers.
 *
 * Reads `config.sisProvider` (env: `SIS_PROVIDER`):
 *  - 'mock' (default) — uses existing mock-data.ts
 *  - 'aspen' — real Aspen REST API (requires ASPEN_BASE_URL, ASPEN_CLIENT_ID, ASPEN_CLIENT_SECRET)
 */
export function createSISProvider(): SISProvider {
  if (_instance) return _instance;

  switch (config.sisProvider) {
    case 'aspen':
      if (!config.aspenBaseUrl || !config.aspenClientId || !config.aspenClientSecret) {
        throw new Error('Aspen SIS requires ASPEN_BASE_URL, ASPEN_CLIENT_ID, and ASPEN_CLIENT_SECRET');
      }
      _instance = new AspenSISProvider({
        baseUrl: config.aspenBaseUrl,
        clientId: config.aspenClientId,
        clientSecret: config.aspenClientSecret,
      });
      break;
    case 'mock':
    default:
      _instance = new MockSISProvider();
  }

  return _instance;
}
