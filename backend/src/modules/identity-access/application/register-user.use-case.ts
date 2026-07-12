// RegisterUserUseCase (US-094 / BE-004; extendido en US-001 / BE-001). AC-01/AC-02/AC-03,
// EC-01..03; SEC-01..07. Flujo: normaliza email → verifica duplicado (EMAIL_TAKEN) → hashea
// password (argon2id) → crea usuario activo (organizer|vendor) → crea sesión server-side →
// email de bienvenida simulado. Captcha y rate limit los aplican los middlewares antes de
// llegar aquí (SEC-03/SEC-04). El controller emite la cookie HTTP-only firmada con el `sid`.
// La creación del User es una única operación atómica (insert); la sesión se crea después:
// si fallara, se propaga 500 y la cuenta queda utilizable vía login (mitigación Tech Spec §17).
import type {
  UserRepository,
  PasswordHasher,
  SessionRepository,
  AuthEventLogger,
  WelcomeEmailNotifier,
} from '../../../shared/auth/ports.js';
import type { AuthUser, PublicRegistrationRole } from '../../../shared/auth/types.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { EmailTakenError } from '../../../shared/domain/errors/email-taken.error.js';
import { config } from '../../../config/env.js';

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

export interface RegisterUserResult {
  user: AuthUser;
  sessionId: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionRepository,
    private readonly clock: ClockPort,
    private readonly events: AuthEventLogger,
    private readonly welcomeEmail: WelcomeEmailNotifier,
  ) {}

  async execute(input: RegisterUserInput, ctx: AuthUseCaseContext = {}): Promise<RegisterUserResult> {
    const startedAt = this.clock.now().getTime();
    const email = input.email.toLowerCase();

    const existing = await this.users.findByEmailNormalized(email);
    if (existing) {
      this.events.emit('auth.register.failure', {
        correlationId: ctx.correlationId,
        reason: 'email_taken',
        role: input.role,
        latencyMs: this.clock.now().getTime() - startedAt,
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
      // AC-02: el controller infiere el idioma desde `Accept-Language`; fallback es-LATAM.
      preferredLanguage: input.preferredLanguage ?? 'es-LATAM',
    });

    // AC-01: primera sesión emitida en el registro (vigencia alineada al Max-Age de la cookie).
    const sessionMaxAgeMs = config.SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(this.clock.now().getTime() + sessionMaxAgeMs);
    const session = await this.sessions.create({ userId: user.id, expiresAt });

    // Email de bienvenida simulado (MVP): nunca bloquea el registro si falla el canal de log.
    try {
      await this.welcomeEmail.deliver({
        userId: user.id,
        email: user.email,
        role: input.role,
        correlationId: ctx.correlationId,
      });
    } catch {
      // Canal simulado: el fallo no altera el resultado del registro.
    }

    this.events.emit('auth.register.success', {
      correlationId: ctx.correlationId,
      userId: user.id,
      role: input.role,
      latencyMs: this.clock.now().getTime() - startedAt,
    });
    return { user, sessionId: session.id };
  }
}
