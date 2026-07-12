// Composition root de auth (US-094 / API-001). Instancia los adapters concretos (Prisma, bcrypt,
// crypto, clock, logging) como singletons. Vive en app-infra para que tanto `identity-access` como
// `user-profile` los reutilicen sin violar boundaries (los módulos pueden importar app-infra).
// La instanciación no abre conexión a BD (Prisma conecta perezosamente en la primera query).
import { PrismaUserRepository } from './persistence/prisma-user.repository.js';
import { PrismaSessionRepository } from './persistence/prisma-session.repository.js';
import { PrismaPasswordResetTokenRepository } from './persistence/prisma-password-reset-token.repository.js';
import { Argon2idPasswordHasher } from './security/argon2id-password-hasher.js';
import { Sha256ResetTokenGenerator } from './security/sha256-reset-token.generator.js';
import { SystemClock } from './time/system-clock.js';
import { StructuredAuthEventLogger } from './observability/structured-auth-event-logger.js';
import { LoggingPasswordResetNotifier } from './notifications/logging-password-reset-notifier.js';
import { LoggingWelcomeEmailNotifier } from './notifications/logging-welcome-email-notifier.js';
import { InMemoryAuthAttemptTracker } from './security/in-memory-auth-attempt-tracker.js';

export const userRepository = new PrismaUserRepository();
export const sessionRepository = new PrismaSessionRepository();
export const passwordResetTokenRepository = new PrismaPasswordResetTokenRepository();
// US-001 / BE-005 (Doc 19 §11.1, ADR-SEC-003): argon2id default; verify mantiene fallback bcrypt
// para hashes legados (seed y cuentas creadas antes de US-001).
export const passwordHasher = new Argon2idPasswordHasher();
export const resetTokenGenerator = new Sha256ResetTokenGenerator();
export const clock = new SystemClock();
export const authEventLogger = new StructuredAuthEventLogger();
export const passwordResetNotifier = new LoggingPasswordResetNotifier();
export const welcomeEmailNotifier = new LoggingWelcomeEmailNotifier();
// US-003 / BE-004 (DB-001): contador In-Memory de fallos IP+email para captcha condicional N=3.
export const authAttemptTracker = new InMemoryAuthAttemptTracker(clock);
