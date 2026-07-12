// US-004 / QA-001 + QA-004 — Unit tests del reset de contraseña (PB-P1-004). Sin BD/red.
// Cubre: catálogo de estados del token (EC-01..03), TTL 30 min (Decisión PO #4), evento
// `reason=no_email` (AC-03), carrera de doble consumo → TOKEN_USED y redacción del token.
import { describe, it, expect } from 'vitest';
import { ResetPasswordUseCase } from '../../src/modules/identity-access/application/reset-password.use-case.js';
import { RequestPasswordResetUseCase } from '../../src/modules/identity-access/application/request-password-reset.use-case.js';
import {
  TokenInvalidError,
  TokenUsedError,
  TokenExpiredError,
} from '../../src/shared/domain/errors/password-reset.errors.js';
import { config } from '../../src/config/env.js';
import { isSensitiveKey } from '../../src/shared/infrastructure/logger/redact.js';
import type {
  PasswordResetTokenRepository,
  ResetTokenGenerator,
  PasswordHasher,
  AuthEventLogger,
  AuthEventName,
  UserRepository,
  PasswordResetNotifier,
} from '../../src/shared/auth/ports.js';
import type { AuthUserWithSecret } from '../../src/shared/auth/types.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const FIXED_NOW = new Date('2026-07-10T12:00:00.000Z');
const clock: ClockPort = { now: () => FIXED_NOW };

const gen: ResetTokenGenerator = {
  generate: () => ({ raw: 'raw-token', hash: 'h(raw-token)' }),
  hash: (raw) => `h(${raw})`,
};
const hasher: PasswordHasher = {
  hash: (p) => Promise.resolve(`argon2:${p}`),
  verify: () => Promise.resolve(true),
};

function makeTokens(over: Partial<PasswordResetTokenRepository> = {}): PasswordResetTokenRepository & {
  consumed: unknown[];
} {
  const consumed: unknown[] = [];
  return {
    consumed,
    create: () => Promise.resolve(),
    findValidByTokenHash: () => Promise.resolve(null),
    findByTokenHash: () => Promise.resolve(null),
    consumeAndUpdatePassword: (input) => {
      consumed.push(input);
      return Promise.resolve();
    },
    ...over,
  };
}

function makeEvents(): { emitted: Array<{ event: AuthEventName; reason?: string }>; logger: AuthEventLogger } {
  const emitted: Array<{ event: AuthEventName; reason?: string }> = [];
  return {
    emitted,
    logger: {
      emit: (event, data) => {
        emitted.push({ event, reason: data.reason });
      },
    },
  };
}

describe('US-004 BE-003 — ResetPasswordUseCase (catálogo EC-01..03)', () => {
  it('EC-03: hash inexistente → TokenInvalidError + reason token_invalid', async () => {
    const { emitted, logger } = makeEvents();
    const uc = new ResetPasswordUseCase(makeTokens(), gen, hasher, clock, logger);
    await expect(uc.execute({ token: 'x', newPassword: 'segura12345' })).rejects.toBeInstanceOf(TokenInvalidError);
    expect(emitted).toContainEqual({ event: 'auth.password_reset.failed', reason: 'token_invalid' });
  });

  it('EC-02: consumed_at no nulo → TokenUsedError', async () => {
    const tokens = makeTokens({
      findByTokenHash: () =>
        Promise.resolve({ id: 't1', userId: 'u1', expiresAt: new Date(FIXED_NOW.getTime() + 60_000), consumedAt: FIXED_NOW }),
    });
    const { emitted, logger } = makeEvents();
    const uc = new ResetPasswordUseCase(tokens, gen, hasher, clock, logger);
    await expect(uc.execute({ token: 'x', newPassword: 'segura12345' })).rejects.toBeInstanceOf(TokenUsedError);
    expect(emitted).toContainEqual({ event: 'auth.password_reset.failed', reason: 'token_used' });
  });

  it('EC-01: expires_at vencido → TokenExpiredError (410)', async () => {
    const tokens = makeTokens({
      findByTokenHash: () =>
        Promise.resolve({ id: 't1', userId: 'u1', expiresAt: new Date(FIXED_NOW.getTime() - 1), consumedAt: null }),
    });
    const { logger } = makeEvents();
    const uc = new ResetPasswordUseCase(tokens, gen, hasher, clock, logger);
    await expect(uc.execute({ token: 'x', newPassword: 'segura12345' })).rejects.toBeInstanceOf(TokenExpiredError);
  });

  it('carrera de doble consumo (guard atómico lanza) → TokenUsedError', async () => {
    const tokens = makeTokens({
      findByTokenHash: () =>
        Promise.resolve({ id: 't1', userId: 'u1', expiresAt: new Date(FIXED_NOW.getTime() + 60_000), consumedAt: null }),
      consumeAndUpdatePassword: () => Promise.reject(new Error('already consumed')),
    });
    const { logger } = makeEvents();
    const uc = new ResetPasswordUseCase(tokens, gen, hasher, clock, logger);
    await expect(uc.execute({ token: 'x', newPassword: 'segura12345' })).rejects.toBeInstanceOf(TokenUsedError);
  });
});

describe('US-004 BE-002 — RequestPasswordResetUseCase (TTL 30 min + no_email)', () => {
  const ghostUsers: UserRepository = {
    findByEmailNormalized: () => Promise.resolve(null),
    findById: () => Promise.resolve(null),
    findByIdWithSecret: () => Promise.resolve(null),
    create: () => Promise.reject(new Error('unused')),
    updateProfile: () => Promise.reject(new Error('unused')),
    updatePasswordHash: () => Promise.resolve(),
  };
  const noopNotifier: PasswordResetNotifier = { deliver: () => Promise.resolve() };

  it('AC-03: email inexistente → evento requested con reason=no_email, sin token ni entrega', async () => {
    const tokens = makeTokens();
    const { emitted, logger } = makeEvents();
    const uc = new RequestPasswordResetUseCase(ghostUsers, tokens, gen, noopNotifier, clock, logger);
    await uc.execute({ email: 'ghost@eventflow.test' });
    expect(emitted).toContainEqual({ event: 'auth.password_reset.requested', reason: 'no_email' });
    expect(tokens.consumed).toHaveLength(0);
  });

  it('SEC-03/OPS: TTL configurado en 30 minutos (Decisión PO US-004 #4)', async () => {
    expect(config.RESET_TOKEN_TTL_MINUTES).toBe(30);
    const created: Array<{ expiresAt: Date }> = [];
    const users: UserRepository = {
      ...ghostUsers,
      findByEmailNormalized: () =>
        Promise.resolve({
          id: 'u1', email: 'real@x.com', name: 'Real', phone: null, role: 'organizer', status: 'active',
          preferredLanguage: 'es-LATAM', createdAt: FIXED_NOW, updatedAt: FIXED_NOW, passwordHash: 'h',
        } as AuthUserWithSecret),
    };
    const tokens = makeTokens({
      create: (input) => {
        created.push(input);
        return Promise.resolve();
      },
    });
    const { logger } = makeEvents();
    const uc = new RequestPasswordResetUseCase(users, tokens, gen, noopNotifier, clock, logger);
    await uc.execute({ email: 'real@x.com' });
    expect(created[0]?.expiresAt.getTime()).toBe(FIXED_NOW.getTime() + 30 * 60 * 1000);
  });
});

describe('US-004 SEC-001/QA-004 — redacción', () => {
  it('las claves de token/contraseña son sensibles para el redactor central', () => {
    expect(isSensitiveKey('rawToken')).toBe(true);
    expect(isSensitiveKey('token_hash')).toBe(true);
    expect(isSensitiveKey('newPassword')).toBe(true);
  });
});
