// RequestPasswordResetUseCase (US-094 / BE-004). AC-06, EC-05; SEC-06.
// SIEMPRE termina de forma genérica (el controller responde 202) exista o no el email
// (anti-enumeración, NT-07). Si el usuario existe, genera un token de un solo uso (hash en BD,
// TTL corto) y lo entrega por canal simulado. Nunca revela existencia ni expone el token crudo.
import type {
  UserRepository,
  PasswordResetTokenRepository,
  ResetTokenGenerator,
  PasswordResetNotifier,
  AuthEventLogger,
} from '../../../shared/auth/ports.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { config } from '../../../config/env.js';
import type { AuthUseCaseContext } from './register-user.use-case.js';

export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: PasswordResetTokenRepository,
    private readonly generator: ResetTokenGenerator,
    private readonly notifier: PasswordResetNotifier,
    private readonly clock: ClockPort,
    private readonly events: AuthEventLogger,
  ) {}

  async execute(input: { email: string }, ctx: AuthUseCaseContext = {}): Promise<void> {
    const email = input.email.toLowerCase();

    const user = await this.users.findByEmailNormalized(email);
    if (!user) {
      // Respuesta HTTP idéntica al caso existente (anti-enumeración). El log interno diferencia
      // con `reason=no_email` (US-004 AC-03) sin exponer nada al cliente.
      this.events.emit('auth.password_reset.requested', {
        correlationId: ctx.correlationId,
        reason: 'no_email',
      });
      return;
    }
    this.events.emit('auth.password_reset.requested', { correlationId: ctx.correlationId });

    const { raw, hash } = this.generator.generate();
    const expiresAt = new Date(
      this.clock.now().getTime() + config.RESET_TOKEN_TTL_MINUTES * 60 * 1000,
    );
    await this.tokens.create({ userId: user.id, tokenHash: hash, expiresAt });
    await this.notifier.deliver({ userId: user.id, email, rawToken: raw });
  }
}
