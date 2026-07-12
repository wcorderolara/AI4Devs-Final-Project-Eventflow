// ResetPasswordUseCase (US-094 / BE-004; contrato final US-004 / BE-003). AC-02, EC-01..03.
// Deriva el hash del token recibido y diferencia el estado (Decisión PO US-004):
// hash inexistente → 400 TOKEN_INVALID · consumido → 400 TOKEN_USED · expirado (TTL 30 min) →
// 410 GONE_TOKEN_EXPIRED. Consumo + cambio de hash son ATÓMICOS (una transacción; carrera de
// doble uso → TOKEN_USED). Nunca loguea el token ni la contraseña (SEC-06).
import type {
  UserRepository,
  PasswordResetTokenRepository,
  ResetTokenGenerator,
  PasswordHasher,
  AuthEventLogger,
} from '../../../shared/auth/ports.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import {
  TokenInvalidError,
  TokenUsedError,
  TokenExpiredError,
} from '../../../shared/domain/errors/password-reset.errors.js';
import type { AuthUseCaseContext } from './register-user.use-case.js';

export class ResetPasswordUseCase {
  constructor(
    private readonly tokens: PasswordResetTokenRepository,
    private readonly generator: ResetTokenGenerator,
    private readonly hasher: PasswordHasher,
    private readonly clock: ClockPort,
    private readonly events: AuthEventLogger,
    // Reservado para futuras validaciones de usuario; no se usa en el flujo actual.
    private readonly _users?: UserRepository,
  ) {}

  private fail(
    ctx: AuthUseCaseContext,
    reason: 'token_invalid' | 'token_used' | 'token_expired',
  ): never {
    this.events.emit('auth.password_reset.failed', {
      correlationId: ctx.correlationId,
      reason,
    });
    if (reason === 'token_used') throw new TokenUsedError();
    if (reason === 'token_expired') throw new TokenExpiredError();
    throw new TokenInvalidError();
  }

  async execute(
    input: { token: string; newPassword: string },
    ctx: AuthUseCaseContext = {},
  ): Promise<void> {
    const now = this.clock.now();
    const tokenHash = this.generator.hash(input.token);
    const record = await this.tokens.findByTokenHash(tokenHash);

    if (!record) this.fail(ctx, 'token_invalid'); // EC-03
    if (record.consumedAt !== null) this.fail(ctx, 'token_used'); // EC-02
    if (record.expiresAt.getTime() <= now.getTime()) this.fail(ctx, 'token_expired'); // EC-01

    const passwordHash = await this.hasher.hash(input.newPassword);
    try {
      await this.tokens.consumeAndUpdatePassword({
        tokenId: record.id,
        userId: record.userId,
        passwordHash,
        now,
      });
    } catch {
      // Carrera de doble consumo detectada por el guard atómico → single-use (EC-02).
      this.fail(ctx, 'token_used');
    }

    this.events.emit('auth.password_reset.completed', {
      correlationId: ctx.correlationId,
      userId: record.userId,
    });
  }
}
