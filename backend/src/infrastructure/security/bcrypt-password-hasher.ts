// Adapter — PasswordHasher con bcryptjs (US-094 / BE-002). SEC-05: hash bcrypt con coste
// configurable (`BCRYPT_SALT_ROUNDS`). El valor plano nunca se loguea ni persiste (SEC-07).
import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '../../shared/auth/ports.js';
import { config } from '../../config/env.js';

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly saltRounds: number = config.BCRYPT_SALT_ROUNDS) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
