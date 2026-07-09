// Adapter — ResetTokenGenerator con node:crypto (US-094 / BE-002). AC-06/AC-07; EC-06.
// El token crudo (256 bits, base64url) se entrega SOLO por canal simulado; se persiste únicamente
// su hash SHA-256 (ADR-SEC-001: nunca almacenar el token crudo — riesgo de account takeover).
import { randomBytes, createHash } from 'node:crypto';
import type { ResetTokenGenerator } from '../../shared/auth/ports.js';

export class Sha256ResetTokenGenerator implements ResetTokenGenerator {
  generate(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('base64url');
    return { raw, hash: this.hash(raw) };
  }

  hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
