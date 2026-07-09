// ResetPasswordUseCase (US-094 / BE-004). AC-07, EC-06; SEC-05.
// Deriva el hash del token recibido, valida vigencia/no-consumo, y consume + actualiza el hash de
// contraseña de forma ATÓMICA (una transacción). Token inválido/expirado/consumido → 401 genérico
// (N5: el mapping compartido no soporta 410). Nunca loguea el token (SEC-07).
import type {
  UserRepository,
  PasswordResetTokenRepository,
  ResetTokenGenerator,
  PasswordHasher,
  AuthEventLogger,
} from '../../../shared/auth/ports.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
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

  async execute(
    input: { token: string; newPassword: string },
    ctx: AuthUseCaseContext = {},
  ): Promise<void> {
    const now = this.clock.now();
    const tokenHash = this.generator.hash(input.token);
    const record = await this.tokens.findValidByTokenHash(tokenHash, now);

    if (!record) {
      this.events.emit('auth.password_reset.failed', {
        correlationId: ctx.correlationId,
        reason: 'invalid_or_expired_token',
      });
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.tokens.consumeAndUpdatePassword({
      tokenId: record.id,
      userId: record.userId,
      passwordHash,
      now,
    });

    this.events.emit('auth.password_reset.completed', {
      correlationId: ctx.correlationId,
      userId: record.userId,
    });
  }
}
