// US-116 (PB-P2-013 / BE-004). GetHealthUseCase — DTO plano para `/health`
// (AC-01, §7.5). Sin I/O: sólo proceso vivo + metadata local.
import { getAppVersion } from '../../../../shared/config/app-version.js';
import type { HealthResponseDto } from '../../domain/types.js';

export class GetHealthUseCase {
  execute(): HealthResponseDto {
    return {
      status: 'ok',
      version: getAppVersion(),
      uptimeMs: Math.floor(process.uptime() * 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
