// US-003 / QA-001 + QA-005(timing conductual) — Unit tests del login (PB-P1-003). Sin BD/red.
// Cubre: LoginRequestSchema (BE-001), InMemoryAuthAttemptTracker (BE-004: frontera N=3, reset,
// expiración de ventana), LoginUserUseCase (BE-002/BE-003: tiempo constante con hash dummy,
// contador, eventos con latencia) y config (SEC-001/OPS-001).
import { describe, it, expect, vi } from 'vitest';
import { LoginUserRequestSchema } from '../../src/modules/identity-access/dto/index.js';
import { InMemoryAuthAttemptTracker } from '../../src/infrastructure/security/in-memory-auth-attempt-tracker.js';
import {
  LoginUserUseCase,
  TIMING_DUMMY_HASH,
} from '../../src/modules/identity-access/application/login-user.use-case.js';
import { UnauthorizedError } from '../../src/shared/domain/errors/unauthorized.error.js';
import { Argon2idPasswordHasher } from '../../src/infrastructure/security/argon2id-password-hasher.js';
import { config } from '../../src/config/env.js';
import type {
  UserRepository,
  PasswordHasher,
  SessionRepository,
  AuthEventLogger,
  AuthEventName,
} from '../../src/shared/auth/ports.js';
import type { AuthUserWithSecret } from '../../src/shared/auth/types.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

describe('US-003 BE-001 — LoginRequestSchema (VR-01/VR-02, captcha opcional)', () => {
  it('acepta email+password sin captchaToken (condicional pre-umbral)', () => {
    const r = LoginUserRequestSchema.safeParse({ email: 'A@B.com', password: 'x' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe('a@b.com');
  });
  it('acepta captchaToken presente y rechaza campos extra (.strict())', () => {
    expect(LoginUserRequestSchema.safeParse({ email: 'a@b.com', password: 'x', captchaToken: 't' }).success).toBe(true);
    expect(LoginUserRequestSchema.safeParse({ email: 'a@b.com', password: 'x', admin: true }).success).toBe(false);
  });
  it('VR-01/VR-02: email malformado o password vacío → rechazo', () => {
    expect(LoginUserRequestSchema.safeParse({ email: 'no-email', password: 'x' }).success).toBe(false);
    expect(LoginUserRequestSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('US-003 BE-004/DB-001 — InMemoryAuthAttemptTracker (N=3, ventana 10 min)', () => {
  function makeClock(startMs: number): { clock: ClockPort; advance: (ms: number) => void } {
    let now = startMs;
    return { clock: { now: () => new Date(now) }, advance: (ms) => (now += ms) };
  }

  it('frontera N=3: 2 fallos no exigen captcha; el 3.º sí', () => {
    const { clock } = makeClock(0);
    const tracker = new InMemoryAuthAttemptTracker(clock, 3, 600_000);
    tracker.recordFailure('1.1.1.1', 'Ana@X.com');
    tracker.recordFailure('1.1.1.1', 'ana@x.com'); // case-insensitive → misma clave
    expect(tracker.isCaptchaRequired('1.1.1.1', 'ana@x.com')).toBe(false);
    tracker.recordFailure('1.1.1.1', 'ana@x.com');
    expect(tracker.isCaptchaRequired('1.1.1.1', 'ANA@x.com')).toBe(true);
  });

  it('clave compuesta: otra IP u otro email no comparten contador', () => {
    const { clock } = makeClock(0);
    const tracker = new InMemoryAuthAttemptTracker(clock, 3, 600_000);
    for (let i = 0; i < 3; i++) tracker.recordFailure('1.1.1.1', 'ana@x.com');
    expect(tracker.isCaptchaRequired('2.2.2.2', 'ana@x.com')).toBe(false);
    expect(tracker.isCaptchaRequired('1.1.1.1', 'otra@x.com')).toBe(false);
  });

  it('reset en éxito y expiración de ventana reinician el contador', () => {
    const { clock, advance } = makeClock(0);
    const tracker = new InMemoryAuthAttemptTracker(clock, 3, 600_000);
    for (let i = 0; i < 3; i++) tracker.recordFailure('1.1.1.1', 'ana@x.com');
    tracker.resetOnSuccess('1.1.1.1', 'ana@x.com');
    expect(tracker.isCaptchaRequired('1.1.1.1', 'ana@x.com')).toBe(false);

    for (let i = 0; i < 3; i++) tracker.recordFailure('1.1.1.1', 'ana@x.com');
    expect(tracker.isCaptchaRequired('1.1.1.1', 'ana@x.com')).toBe(true);
    advance(600_001); // ventana deslizante expirada
    expect(tracker.isCaptchaRequired('1.1.1.1', 'ana@x.com')).toBe(false);
    // Un nuevo fallo tras expirar arranca cuenta desde 1.
    tracker.recordFailure('1.1.1.1', 'ana@x.com');
    expect(tracker.isCaptchaRequired('1.1.1.1', 'ana@x.com')).toBe(false);
  });

  it('config: threshold y ventana con defaults 3 / 600000 (OPS-001)', () => {
    expect(config.AUTH_LOGIN_CAPTCHA_THRESHOLD).toBe(3);
    expect(config.AUTH_LOGIN_ATTEMPT_WINDOW_MS).toBe(600_000);
  });
});

const FIXED_NOW = new Date('2026-07-10T00:00:00.000Z');
const clock: ClockPort = { now: () => FIXED_NOW };

function buildDeps(user: AuthUserWithSecret | null): {
  users: UserRepository;
  hasher: PasswordHasher;
  verifySpy: ReturnType<typeof vi.fn>;
  sessions: SessionRepository;
  events: Array<{ event: AuthEventName; latencyMs?: number }>;
  eventLogger: AuthEventLogger;
} {
  const verifySpy = vi.fn((plain: string, hash: string) =>
    Promise.resolve(hash === `h:${plain}`),
  );
  const events: Array<{ event: AuthEventName; latencyMs?: number }> = [];
  return {
    users: {
      findByEmailNormalized: () => Promise.resolve(user),
      findById: () => Promise.resolve(null),
      findByIdWithSecret: () => Promise.resolve(null),
      create: () => Promise.reject(new Error('unused')),
      updateProfile: () => Promise.reject(new Error('unused')),
      updatePasswordHash: () => Promise.resolve(),
    },
    hasher: { hash: (p) => Promise.resolve(`h:${p}`), verify: verifySpy },
    verifySpy,
    sessions: {
      create: () => Promise.resolve({ id: 'sess-1' }),
      findValid: () => Promise.resolve(null),
      revoke: () => Promise.resolve(),
    },
    events,
    eventLogger: {
      emit: (event, data) => {
        events.push({ event, latencyMs: data.latencyMs });
      },
    },
  };
}

const activeUser: AuthUserWithSecret = {
  id: 'u1',
  email: 'ana@x.com',
  name: 'Ana',
  phone: null,
  role: 'organizer',
  status: 'active',
  preferredLanguage: 'es-LATAM',
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  passwordHash: 'h:Secret1234',
};

describe('US-003 BE-002/BE-003 — LoginUserUseCase (tiempo constante + contador)', () => {
  it('SEC-08: con email INEXISTENTE el hasher.verify SE EJECUTA igualmente (hash dummy)', async () => {
    const deps = buildDeps(null);
    const tracker = new InMemoryAuthAttemptTracker(clock, 3, 600_000);
    const uc = new LoginUserUseCase(deps.users, deps.hasher, deps.sessions, clock, deps.eventLogger, tracker);
    await expect(uc.execute({ email: 'ghost@x.com', password: 'x' }, { ip: '9.9.9.9' })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(deps.verifySpy).toHaveBeenCalledTimes(1);
    expect(deps.verifySpy).toHaveBeenCalledWith('x', TIMING_DUMMY_HASH);
    expect(deps.events).toContainEqual(expect.objectContaining({ event: 'auth.login.failure' }));
  });

  it('EC-02: 3 fallos alimentan el tracker; éxito posterior resetea', async () => {
    const tracker = new InMemoryAuthAttemptTracker(clock, 3, 600_000);
    const deps = buildDeps(activeUser);
    const uc = new LoginUserUseCase(deps.users, deps.hasher, deps.sessions, clock, deps.eventLogger, tracker);

    for (let i = 0; i < 3; i++) {
      await expect(
        uc.execute({ email: 'ana@x.com', password: 'wrong' }, { ip: '1.1.1.1' }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    }
    expect(tracker.isCaptchaRequired('1.1.1.1', 'ana@x.com')).toBe(true);

    const result = await uc.execute({ email: 'ana@x.com', password: 'Secret1234' }, { ip: '1.1.1.1' });
    expect(result.sessionId).toBe('sess-1');
    expect(tracker.isCaptchaRequired('1.1.1.1', 'ana@x.com')).toBe(false);
    expect(deps.events).toContainEqual(expect.objectContaining({ event: 'auth.login.success' }));
  });

  it('el hash dummy es un argon2id verificable (no rompe el hasher real)', async () => {
    expect(TIMING_DUMMY_HASH.startsWith('$argon2id$')).toBe(true);
    expect(TIMING_DUMMY_HASH).toContain('m=19456,t=2,p=1');
    // Un password arbitrario jamás valida contra el dummy.
    expect(await new Argon2idPasswordHasher().verify('cualquier-cosa1', TIMING_DUMMY_HASH)).toBe(false);
  });
});
