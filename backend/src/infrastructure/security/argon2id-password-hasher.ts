// Adapter — PasswordHasher con argon2id (US-001 / BE-005). Doc 19 §11.1; ADR-SEC-003; SEC-05.
// Default MVP: argon2id con parámetros mínimos OWASP (memoryCost=19 MiB, timeCost=2,
// parallelism=1). `verify` despacha por el prefijo del hash almacenado: hashes `$argon2*` se
// verifican con argon2 y hashes bcrypt legados (`$2a$/$2b$/$2y$`, p. ej. seed y cuentas previas)
// se verifican con el fallback bcrypt(12) documentado — sin migración destructiva de hashes.
// El valor plano nunca se loguea ni persiste (SEC-07).
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '../../shared/auth/ports.js';

/** Parámetros mínimos OWASP para argon2id (Doc 19 §11.1): 19 MiB, t=2, p=1. */
export const ARGON2ID_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024, // KiB → 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export class Argon2idPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2ID_OPTIONS);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    // Fallback documentado (Doc 19 §11.1): hashes bcrypt existentes siguen verificando.
    if (hash.startsWith('$2')) {
      return bcrypt.compare(plain, hash);
    }
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // Hash malformado/no reconocido → credencial inválida (nunca lanzar detalles al caller).
      return false;
    }
  }
}
