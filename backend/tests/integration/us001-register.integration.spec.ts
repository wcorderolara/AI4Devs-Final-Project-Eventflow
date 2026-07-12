// US-001 / QA-002 — Integration tests del flujo de registro SIN HTTP (use case + repositorio
// Prisma + Postgres de test). Cubre AC-01 (persistencia con hash argon2id + sesión), AC-02
// (preferred_language) y AC-03 (unicidad case-insensitive vía constraint funcional LOWER(email)).
// Patrón del repo: skip limpio si no hay BD alcanzable (`describe.skipIf(!dbUp)`).
import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../../src/infrastructure/persistence/prisma-user.repository.js';
import { PrismaSessionRepository } from '../../src/infrastructure/persistence/prisma-session.repository.js';
import { Argon2idPasswordHasher } from '../../src/infrastructure/security/argon2id-password-hasher.js';
import { SystemClock } from '../../src/infrastructure/time/system-clock.js';
import { RegisterUserUseCase } from '../../src/modules/identity-access/application/register-user.use-case.js';
import { EmailTakenError } from '../../src/shared/domain/errors/email-taken.error.js';
import type { AuthEventName, AuthEventLogger, WelcomeEmailNotifier } from '../../src/shared/auth/ports.js';

const prisma = new PrismaClient();

let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

class CapturingEvents implements AuthEventLogger {
  emitted: AuthEventName[] = [];
  emit(event: AuthEventName): void {
    this.emitted.push(event);
  }
}
class NoopWelcome implements WelcomeEmailNotifier {
  deliver(): Promise<void> {
    return Promise.resolve();
  }
}

const uniq = (): string => `us001_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

function buildUseCase(): { uc: RegisterUserUseCase; events: CapturingEvents } {
  const events = new CapturingEvents();
  const uc = new RegisterUserUseCase(
    new PrismaUserRepository(prisma),
    new Argon2idPasswordHasher(),
    new PrismaSessionRepository(prisma),
    new SystemClock(),
    events,
    new NoopWelcome(),
  );
  return { uc, events };
}

describe.skipIf(!dbUp)('US-001 QA-002 — registro end-to-end sin HTTP (Postgres test)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'us001_%')`,
    );
    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE email LIKE 'us001_%'`);
  });

  it('AC-01: crea User organizer con hash argon2id, sesión persistida y evento de éxito', async () => {
    const { uc, events } = buildUseCase();
    const email = uniq();
    const { user, sessionId } = await uc.execute({
      email,
      password: 'segura12345',
      name: 'Organizadora Test',
      role: 'organizer',
      preferredLanguage: 'es-LATAM',
    });

    const row = await prisma.user.findUnique({ where: { email } });
    expect(row).not.toBeNull();
    expect(row?.role).toBe('organizer');
    expect(row?.status).toBe('active');
    expect(row?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(row?.passwordHash).toContain('m=19456,t=2,p=1');

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(session?.userId).toBe(user.id);
    expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(events.emitted).toContain('auth.register.success');
  });

  it('AC-02: persiste preferred_language inferido (es-LATAM ↔ enum es_LATAM)', async () => {
    const { uc } = buildUseCase();
    const email = uniq();
    await uc.execute({ email, password: 'segura12345', name: 'Lang Test', role: 'organizer', preferredLanguage: 'pt' });
    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.preferredLanguage).toBe('pt');
  });

  it('AC-03: email duplicado con distinto casing → EmailTakenError (constraint LOWER(email))', async () => {
    const { uc, events } = buildUseCase();
    const email = uniq();
    await uc.execute({ email, password: 'segura12345', name: 'Original', role: 'organizer' });
    await expect(
      uc.execute({ email: email.toUpperCase(), password: 'segura12345', name: 'Copia', role: 'organizer' }),
    ).rejects.toBeInstanceOf(EmailTakenError);
    expect(events.emitted).toContain('auth.register.failure');
  });

  it('AC-03 (defensa en profundidad): el constraint funcional uq_users_email_lower existe en la BD', async () => {
    const rows = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname = 'uq_users_email_lower'`,
    );
    expect(rows).toHaveLength(1);
  });
});
