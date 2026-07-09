// US-094 / QA-001 — Unit tests de use cases de AUTH con fakes en memoria (sin BD).
// Verifican la lógica de aplicación: anti-enumeración, EMAIL_TAKEN, sesión, consumo de token,
// verificación de contraseña. Cubre AC-01/02/05/06/07 y AC-03/04 (profile).
import { describe, it, expect, beforeEach } from 'vitest';
import type {
  UserRepository,
  SessionRepository,
  PasswordResetTokenRepository,
  PasswordHasher,
  ResetTokenGenerator,
  PasswordResetNotifier,
  AuthEventLogger,
  AuthEventName,
} from '../../src/shared/auth/ports.js';
import type { AuthUser, AuthUserWithSecret, CreateUserInput, UpdateProfileInput, ResolvedSession } from '../../src/shared/auth/types.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import { EmailTakenError } from '../../src/shared/domain/errors/email-taken.error.js';
import { UnauthorizedError } from '../../src/shared/domain/errors/unauthorized.error.js';
import { RegisterUserUseCase } from '../../src/modules/identity-access/application/register-user.use-case.js';
import { LoginUserUseCase } from '../../src/modules/identity-access/application/login-user.use-case.js';
import { LogoutUserUseCase } from '../../src/modules/identity-access/application/logout-user.use-case.js';
import { RequestPasswordResetUseCase } from '../../src/modules/identity-access/application/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../../src/modules/identity-access/application/reset-password.use-case.js';
import { GetCurrentUserUseCase } from '../../src/modules/user-profile/application/get-current-user.use-case.js';
import { ChangePasswordUseCase } from '../../src/modules/user-profile/application/change-password.use-case.js';

const FIXED_NOW = new Date('2026-07-09T00:00:00.000Z');
const clock: ClockPort = { now: () => FIXED_NOW };

class FakeHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }
  verify(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}

function baseUser(over: Partial<AuthUserWithSecret> = {}): AuthUserWithSecret {
  return {
    id: over.id ?? 'u-1',
    email: over.email ?? 'ana@example.com',
    name: over.name ?? 'Ana',
    phone: over.phone ?? null,
    role: over.role ?? 'organizer',
    status: over.status ?? 'active',
    preferredLanguage: over.preferredLanguage ?? 'es-LATAM',
    createdAt: over.createdAt ?? FIXED_NOW,
    updatedAt: over.updatedAt ?? FIXED_NOW,
    passwordHash: over.passwordHash ?? 'hashed:Secret1234',
  };
}

class FakeUserRepo implements UserRepository {
  private byId = new Map<string, AuthUserWithSecret>();
  private seq = 0;

  seed(u: AuthUserWithSecret): void {
    this.byId.set(u.id, u);
  }
  findByEmailNormalized(email: string): Promise<AuthUserWithSecret | null> {
    const found = [...this.byId.values()].find((u) => u.email === email.toLowerCase());
    return Promise.resolve(found ?? null);
  }
  findById(id: string): Promise<AuthUser | null> {
    const u = this.byId.get(id);
    if (!u) return Promise.resolve(null);
    const { passwordHash: _h, ...pub } = u;
    return Promise.resolve(pub);
  }
  findByIdWithSecret(id: string): Promise<AuthUserWithSecret | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
  create(input: CreateUserInput): Promise<AuthUser> {
    if ([...this.byId.values()].some((u) => u.email === input.email.toLowerCase())) {
      return Promise.reject(new EmailTakenError());
    }
    const u = baseUser({
      id: `u-${++this.seq}`,
      email: input.email.toLowerCase(),
      name: input.name,
      phone: input.phone ?? null,
      role: input.role,
      preferredLanguage: input.preferredLanguage,
      passwordHash: input.passwordHash,
    });
    this.byId.set(u.id, u);
    const { passwordHash: _h, ...pub } = u;
    return Promise.resolve(pub);
  }
  updateProfile(userId: string, fields: UpdateProfileInput): Promise<AuthUser> {
    const u = this.byId.get(userId)!;
    if (fields.name !== undefined) u.name = fields.name;
    if (fields.phone !== undefined) u.phone = fields.phone;
    if (fields.preferredLanguage !== undefined) u.preferredLanguage = fields.preferredLanguage;
    const { passwordHash: _h, ...pub } = u;
    return Promise.resolve(pub);
  }
  updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    this.byId.get(userId)!.passwordHash = passwordHash;
    return Promise.resolve();
  }
}

class FakeSessionRepo implements SessionRepository {
  created: { userId: string; expiresAt: Date }[] = [];
  revoked: string[] = [];
  valid = new Map<string, ResolvedSession>();
  private seq = 0;
  create(input: { userId: string; expiresAt: Date }): Promise<{ id: string }> {
    this.created.push(input);
    const id = `s-${++this.seq}`;
    this.valid.set(id, { userId: input.userId, role: 'organizer' });
    return Promise.resolve({ id });
  }
  findValid(sessionId: string): Promise<ResolvedSession | null> {
    return Promise.resolve(this.valid.get(sessionId) ?? null);
  }
  revoke(sessionId: string): Promise<void> {
    this.revoked.push(sessionId);
    this.valid.delete(sessionId);
    return Promise.resolve();
  }
}

class FakeResetTokenRepo implements PasswordResetTokenRepository {
  stored: { userId: string; tokenHash: string; expiresAt: Date }[] = [];
  consumed: { tokenId: string; userId: string; passwordHash: string }[] = [];
  validByHash = new Map<string, { id: string; userId: string }>();
  create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    this.stored.push(input);
    return Promise.resolve();
  }
  findValidByTokenHash(tokenHash: string): Promise<{ id: string; userId: string } | null> {
    return Promise.resolve(this.validByHash.get(tokenHash) ?? null);
  }
  consumeAndUpdatePassword(input: { tokenId: string; userId: string; passwordHash: string }): Promise<void> {
    this.consumed.push({ tokenId: input.tokenId, userId: input.userId, passwordHash: input.passwordHash });
    return Promise.resolve();
  }
}

class FakeTokenGen implements ResetTokenGenerator {
  private seq = 0;
  generate(): { raw: string; hash: string } {
    const raw = `raw-${++this.seq}`;
    return { raw, hash: this.hash(raw) };
  }
  hash(raw: string): string {
    return `h(${raw})`;
  }
}

class FakeNotifier implements PasswordResetNotifier {
  calls: { userId: string; email: string; rawToken: string }[] = [];
  deliver(input: { userId: string; email: string; rawToken: string }): Promise<void> {
    this.calls.push(input);
    return Promise.resolve();
  }
}

class FakeEvents implements AuthEventLogger {
  emitted: AuthEventName[] = [];
  emit(event: AuthEventName): void {
    this.emitted.push(event);
  }
}

describe('RegisterUserUseCase (AC-01, EC-02)', () => {
  let users: FakeUserRepo;
  let events: FakeEvents;
  let uc: RegisterUserUseCase;
  beforeEach(() => {
    users = new FakeUserRepo();
    events = new FakeEvents();
    uc = new RegisterUserUseCase(users, new FakeHasher(), events);
  });

  it('crea usuario activo organizer con password hasheado; no expone hash', async () => {
    const user = await uc.execute({ email: 'New@X.com', password: 'Secret1234', name: 'New', role: 'organizer' });
    expect(user.email).toBe('new@x.com');
    expect(user.status).toBe('active');
    expect(user).not.toHaveProperty('passwordHash');
    expect(await users.findByIdWithSecret(user.id)).toMatchObject({ passwordHash: 'hashed:Secret1234' });
    expect(events.emitted).toContain('auth.register.succeeded');
  });

  it('rechaza email duplicado con EmailTakenError (EC-02, NT-02)', async () => {
    users.seed(baseUser({ id: 'x', email: 'dup@x.com' }));
    await expect(
      uc.execute({ email: 'DUP@x.com', password: 'Secret1234', name: 'D', role: 'vendor' }),
    ).rejects.toBeInstanceOf(EmailTakenError);
    expect(events.emitted).toContain('auth.register.rejected');
  });
});

describe('LoginUserUseCase (AC-02, EC-03 anti-enumeración)', () => {
  let users: FakeUserRepo;
  let sessions: FakeSessionRepo;
  let events: FakeEvents;
  let uc: LoginUserUseCase;
  beforeEach(() => {
    users = new FakeUserRepo();
    sessions = new FakeSessionRepo();
    events = new FakeEvents();
    uc = new LoginUserUseCase(users, new FakeHasher(), sessions, clock, events);
  });

  it('email inexistente → UnauthorizedError genérico, sin sesión', async () => {
    await expect(uc.execute({ email: 'nope@x.com', password: 'Secret1234' })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(sessions.created).toHaveLength(0);
    expect(events.emitted).toContain('auth.login.failed');
  });

  it('password incorrecta → mismo UnauthorizedError', async () => {
    users.seed(baseUser({ email: 'a@x.com', passwordHash: 'hashed:Secret1234' }));
    await expect(uc.execute({ email: 'a@x.com', password: 'WrongPass99' })).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('usuario suspendido → UnauthorizedError', async () => {
    users.seed(baseUser({ email: 's@x.com', status: 'suspended', passwordHash: 'hashed:Secret1234' }));
    await expect(uc.execute({ email: 's@x.com', password: 'Secret1234' })).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('credenciales válidas → sesión creada y resultado sin passwordHash', async () => {
    users.seed(baseUser({ id: 'u9', email: 'ok@x.com', passwordHash: 'hashed:Secret1234' }));
    const res = await uc.execute({ email: 'OK@x.com', password: 'Secret1234' });
    expect(res.sessionId).toBeDefined();
    expect(res.user).not.toHaveProperty('passwordHash');
    expect(sessions.created).toHaveLength(1);
    expect(sessions.created[0]?.expiresAt.getTime()).toBeGreaterThan(FIXED_NOW.getTime());
    expect(events.emitted).toContain('auth.login.succeeded');
  });
});

describe('LogoutUserUseCase (AC-05)', () => {
  it('revoca la sesión y emite evento', async () => {
    const sessions = new FakeSessionRepo();
    const events = new FakeEvents();
    await new LogoutUserUseCase(sessions, clock, events).execute({ sessionId: 's-1', userId: 'u1' });
    expect(sessions.revoked).toContain('s-1');
    expect(events.emitted).toContain('auth.logout.succeeded');
  });
});

describe('RequestPasswordResetUseCase (AC-06 anti-enumeración)', () => {
  let users: FakeUserRepo;
  let tokens: FakeResetTokenRepo;
  let notifier: FakeNotifier;
  let events: FakeEvents;
  let uc: RequestPasswordResetUseCase;
  beforeEach(() => {
    users = new FakeUserRepo();
    tokens = new FakeResetTokenRepo();
    notifier = new FakeNotifier();
    events = new FakeEvents();
    uc = new RequestPasswordResetUseCase(users, tokens, new FakeTokenGen(), notifier, clock, events);
  });

  it('email inexistente → no crea token ni notifica; emite evento genérico (NT-07)', async () => {
    await uc.execute({ email: 'ghost@x.com' });
    expect(tokens.stored).toHaveLength(0);
    expect(notifier.calls).toHaveLength(0);
    expect(events.emitted).toContain('auth.password_reset.requested');
  });

  it('email existente → crea token (hash) y notifica con token crudo', async () => {
    users.seed(baseUser({ id: 'u1', email: 'real@x.com' }));
    await uc.execute({ email: 'REAL@x.com' });
    expect(tokens.stored).toHaveLength(1);
    expect(tokens.stored[0]?.tokenHash).toMatch(/^h\(/);
    expect(tokens.stored[0]?.expiresAt.getTime()).toBeGreaterThan(FIXED_NOW.getTime());
    expect(notifier.calls[0]?.rawToken).toMatch(/^raw-/);
  });
});

describe('ResetPasswordUseCase (AC-07, EC-06)', () => {
  let tokens: FakeResetTokenRepo;
  let events: FakeEvents;
  let gen: FakeTokenGen;
  let uc: ResetPasswordUseCase;
  beforeEach(() => {
    tokens = new FakeResetTokenRepo();
    events = new FakeEvents();
    gen = new FakeTokenGen();
    uc = new ResetPasswordUseCase(tokens, gen, new FakeHasher(), clock, events);
  });

  it('token inválido/expirado → UnauthorizedError genérico (N5)', async () => {
    await expect(uc.execute({ token: 'bad', newPassword: 'Secret1234' })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(events.emitted).toContain('auth.password_reset.failed');
  });

  it('token válido → consume y actualiza hash atómicamente', async () => {
    tokens.validByHash.set(gen.hash('good'), { id: 't1', userId: 'u1' });
    await uc.execute({ token: 'good', newPassword: 'NewSecret9' });
    expect(tokens.consumed).toEqual([{ tokenId: 't1', userId: 'u1', passwordHash: 'hashed:NewSecret9' }]);
    expect(events.emitted).toContain('auth.password_reset.completed');
  });
});

describe('GetCurrentUserUseCase / ChangePasswordUseCase (AC-03/AC-04)', () => {
  it('GetCurrentUser: usuario inexistente → UnauthorizedError', async () => {
    await expect(new GetCurrentUserUseCase(new FakeUserRepo()).execute('missing')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('ChangePassword: contraseña actual incorrecta → UnauthorizedError', async () => {
    const users = new FakeUserRepo();
    users.seed(baseUser({ id: 'u1', passwordHash: 'hashed:Secret1234' }));
    const uc = new ChangePasswordUseCase(users, new FakeHasher());
    await expect(uc.execute('u1', { currentPassword: 'wrong', newPassword: 'NewSecret9' })).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('ChangePassword: correcta → actualiza hash', async () => {
    const users = new FakeUserRepo();
    users.seed(baseUser({ id: 'u1', passwordHash: 'hashed:Secret1234' }));
    await new ChangePasswordUseCase(users, new FakeHasher()).execute('u1', {
      currentPassword: 'Secret1234',
      newPassword: 'NewSecret9',
    });
    expect(await users.findByIdWithSecret('u1')).toMatchObject({ passwordHash: 'hashed:NewSecret9' });
  });
});
