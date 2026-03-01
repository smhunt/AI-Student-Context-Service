import type { SISProvider } from './sis-provider.js';
import { MockSISProvider } from './mock-sis-provider.js';
import { AspenSISProvider } from './aspen-sis-provider.js';
import { OneRosterSISProvider } from './oneroster-sis-provider.js';
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
 * Reads `config.sisProvider` (env: `SIS_PROVIDER`) for the vendor,
 * and `config.sisProtocol` (env: `SIS_PROTOCOL`) for the API protocol:
 *
 *  - 'mock' (default) — uses existing mock-data.ts
 *  - 'aspen' — real Aspen REST API (requires ASPEN_BASE_URL, ASPEN_CLIENT_ID, ASPEN_CLIENT_SECRET)
 *
 * When `SIS_PROTOCOL=oneroster`, uses the OneRoster 1.1 provider regardless of vendor.
 * OneRoster works with Aspen, PowerSchool, Veracross, and any IMS Global compliant SIS.
 */
export function createSISProvider(): SISProvider {
  if (_instance) return _instance;

  // OneRoster protocol takes precedence if configured
  if (config.sisProtocol === 'oneroster') {
    if (!config.onerosterBaseUrl || !config.onerosterClientId || !config.onerosterClientSecret) {
      throw new Error('OneRoster requires ONEROSTER_BASE_URL, ONEROSTER_CLIENT_ID, and ONEROSTER_CLIENT_SECRET');
    }
    _instance = new OneRosterSISProvider({
      baseUrl: config.onerosterBaseUrl,
      clientId: config.onerosterClientId,
      clientSecret: config.onerosterClientSecret,
    });
    return _instance;
  }

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
