// RegisterUserUseCase (US-094 / BE-004). AC-01, EC-01/EC-02; SEC-05/SEC-08.
// Flujo: normaliza email → verifica duplicado (EMAIL_TAKEN) → hashea password → crea usuario
// activo (organizer|vendor). Captcha y rate limit los aplican los middlewares antes de llegar aquí.
import type { UserRepository, PasswordHasher, AuthEventLogger } from '../../../shared/auth/ports.js';
import type { AuthUser, PublicRegistrationRole } from '../../../shared/auth/types.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import { EmailTakenError } from '../../../shared/domain/errors/email-taken.error.js';

export interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: PublicRegistrationRole;
  preferredLanguage?: SupportedLanguage;
}

export interface AuthUseCaseContext {
  correlationId?: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly events: AuthEventLogger,
  ) {}

  async execute(input: RegisterUserInput, ctx: AuthUseCaseContext = {}): Promise<AuthUser> {
    const email = input.email.toLowerCase();

    const existing = await this.users.findByEmailNormalized(email);
    if (existing) {
      this.events.emit('auth.register.rejected', {
        correlationId: ctx.correlationId,
        reason: 'email_taken',
      });
      throw new EmailTakenError();
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({
      email,
      passwordHash,
      name: input.name,
      phone: input.phone ?? null,
      role: input.role,
      preferredLanguage: input.preferredLanguage ?? 'es-LATAM',
    });

    this.events.emit('auth.register.succeeded', {
      correlationId: ctx.correlationId,
      userId: user.id,
    });
    return user;
  }
}
