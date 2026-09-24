// US-008 (PB-P4-001 / BE-003) — HandleGoogleCallbackUseCase: resolución login/signup/link + negativos.
// Usa el `MockOAuthProvider` (code sintético) y fakes en memoria de User/Session. Cubre AC-01/02/03,
// EC-01 (email_verified=false), NT-01 (expirado), NT-02 (state inválido) y conflicto de vinculación.
import { describe, it, expect, beforeEach } from 'vitest';
import { MockOAuthProvider, encodeMockOAuthCode } from '../../src/infrastructure/oauth/mock-oauth-provider.js';
import { HandleGoogleCallbackUseCase } from '../../src/modules/identity-access/application/handle-google-callback.use-case.js';
import type { UserRepository, SessionRepository, AuthEventLogger, AuthEventName } from '../../src/shared/auth/ports.js';
import type { AuthUser, AuthUserWithSecret, OAuthAccount } from '../../src/shared/auth/types.js';
import type { VerifiedGoogleIdentity } from '../../src/shared/auth/oauth.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import {
  OAuthStateInvalidError,
  OAuthVerificationError,
  OAuthAccountConflictError,
} from '../../src/shared/domain/errors/oauth.errors.js';

const NONCE = 'nonce-xyz';
const STATE = 'state-abc';
const FIXED_NOW = new Date('2026-08-13T00:00:00Z');

const clock: ClockPort = { now: () => FIXED_NOW };

function makeUser(over: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u-1', email: 'user@gmail.com', name: 'User', phone: null, role: 'organizer',
    status: 'active', preferredLanguage: 'es-LATAM', createdAt: FIXED_NOW, updatedAt: FIXED_NOW, ...over,
  };
}

/** Fake mínimo de UserRepository parametrizable por escenario. */
class FakeUsers implements UserRepository {
  byGoogleSub = new Map<string, AuthUser>();
  byEmail = new Map<string, OAuthAccount>();
  findByEmailNormalized(): Promise<AuthUserWithSecret | null> { return Promise.resolve(null); }
  findById(): Promise<AuthUser | null> { return Promise.resolve(null); }
  findByIdWithSecret(): Promise<AuthUserWithSecret | null> { return Promise.resolve(null); }
  create(): Promise<AuthUser> { return Promise.reject(new Error('unused')); }
  updateProfile(): Promise<AuthUser> { return Promise.reject(new Error('unused')); }
  updatePasswordHash(): Promise<void> { return Promise.resolve(); }
  findByGoogleSub(sub: string): Promise<AuthUser | null> { return Promise.resolve(this.byGoogleSub.get(sub) ?? null); }
  findOAuthAccountByEmail(email: string): Promise<OAuthAccount | null> { return Promise.resolve(this.byEmail.get(email) ?? null); }
  linkGoogleSub(): Promise<AuthUser> { return Promise.reject(new Error('unused')); }
  createOAuthUser(): Promise<AuthUser> { return Promise.reject(new Error('unused')); }
}

const sessions: SessionRepository = {
  create: () => Promise.resolve({ id: 'sess-1' }),
  findValid: () => Promise.resolve(null),
  revoke: () => Promise.resolve(),
};

function makeEvents(): { events: AuthEventLogger; emitted: Array<{ event: AuthEventName; reason?: string }> } {
  const emitted: Array<{ event: AuthEventName; reason?: string }> = [];
  return { events: { emit: (event, data) => emitted.push({ event, reason: data.reason }) }, emitted };
}

const identity: VerifiedGoogleIdentity = { sub: 'gsub-1', email: 'user@gmail.com', emailVerified: true, name: 'User' };

function provider(defaultIdentity = identity): MockOAuthProvider {
  return new MockOAuthProvider({ redirectUri: 'http://localhost:3000/api/v1/auth/google/callback', defaultIdentity });
}

function code(over: Partial<{ identity: VerifiedGoogleIdentity; nonce: string; fail: 'expired' | 'email_not_verified' | 'invalid' }> = {}): string {
  return encodeMockOAuthCode({ identity: over.identity ?? identity, nonce: over.nonce ?? NONCE, fail: over.fail });
}

describe('US-008 BE-003 — HandleGoogleCallbackUseCase', () => {
  let users: FakeUsers;
  beforeEach(() => { users = new FakeUsers(); });

  it('AC-01 login: google_sub vinculado → sesión + success', async () => {
    users.byGoogleSub.set('gsub-1', makeUser({ id: 'u-1', role: 'vendor' }));
    const { events, emitted } = makeEvents();
    const uc = new HandleGoogleCallbackUseCase(provider(), users, sessions, clock, events);
    const outcome = await uc.execute({ code: code(), stateFromQuery: STATE, stateNonceCookie: { state: STATE, nonce: NONCE } });
    expect(outcome).toMatchObject({ kind: 'login', sessionId: 'sess-1' });
    expect(emitted).toContainEqual({ event: 'auth.oauth.google.success', reason: 'login' });
  });

  it('AC-02 signup_required: email inexistente → continuación sin sesión', async () => {
    const { events } = makeEvents();
    const uc = new HandleGoogleCallbackUseCase(provider(), users, sessions, clock, events);
    const outcome = await uc.execute({ code: code(), stateFromQuery: STATE, stateNonceCookie: { state: STATE, nonce: NONCE } });
    expect(outcome).toEqual({ kind: 'signup_required', continuation: { action: 'signup', googleSub: 'gsub-1', email: 'user@gmail.com', name: 'User' } });
  });

  it('AC-03 link_required: email existente sin google_sub → continuación de vinculación', async () => {
    users.byEmail.set('user@gmail.com', { id: 'u-9', email: 'user@gmail.com', role: 'organizer', status: 'active', hasPassword: true, googleSub: null });
    const { events } = makeEvents();
    const uc = new HandleGoogleCallbackUseCase(provider(), users, sessions, clock, events);
    const outcome = await uc.execute({ code: code(), stateFromQuery: STATE, stateNonceCookie: { state: STATE, nonce: NONCE } });
    expect(outcome).toEqual({ kind: 'link_required', continuation: { action: 'link', userId: 'u-9', googleSub: 'gsub-1', email: 'user@gmail.com' } });
  });

  it('NT-02 state inválido → OAuthStateInvalidError + failure', async () => {
    const { events, emitted } = makeEvents();
    const uc = new HandleGoogleCallbackUseCase(provider(), users, sessions, clock, events);
    await expect(uc.execute({ code: code(), stateFromQuery: 'WRONG', stateNonceCookie: { state: STATE, nonce: NONCE } })).rejects.toBeInstanceOf(OAuthStateInvalidError);
    expect(emitted).toContainEqual({ event: 'auth.oauth.google.failure', reason: 'state_invalid' });
  });

  it('NT-02 cookie ausente → OAuthStateInvalidError', async () => {
    const { events } = makeEvents();
    const uc = new HandleGoogleCallbackUseCase(provider(), users, sessions, clock, events);
    await expect(uc.execute({ code: code(), stateFromQuery: STATE, stateNonceCookie: null })).rejects.toBeInstanceOf(OAuthStateInvalidError);
  });

  it('NT-01 id_token expirado → OAuthVerificationError + failure', async () => {
    const { events, emitted } = makeEvents();
    const uc = new HandleGoogleCallbackUseCase(provider(), users, sessions, clock, events);
    await expect(uc.execute({ code: code({ fail: 'expired' }), stateFromQuery: STATE, stateNonceCookie: { state: STATE, nonce: NONCE } })).rejects.toBeInstanceOf(OAuthVerificationError);
    expect(emitted).toContainEqual({ event: 'auth.oauth.google.failure', reason: 'id_token_expired' });
  });

  it('EC-01 email_verified=false → OAuthVerificationError', async () => {
    const { events } = makeEvents();
    const uc = new HandleGoogleCallbackUseCase(provider(), users, sessions, clock, events);
    await expect(uc.execute({ code: code({ fail: 'email_not_verified' }), stateFromQuery: STATE, stateNonceCookie: { state: STATE, nonce: NONCE } })).rejects.toBeInstanceOf(OAuthVerificationError);
  });

  it('conflicto: email con OTRA identidad Google → OAuthAccountConflictError', async () => {
    users.byEmail.set('user@gmail.com', { id: 'u-9', email: 'user@gmail.com', role: 'organizer', status: 'active', hasPassword: true, googleSub: 'gsub-OTHER' });
    const { events, emitted } = makeEvents();
    const uc = new HandleGoogleCallbackUseCase(provider(), users, sessions, clock, events);
    await expect(uc.execute({ code: code(), stateFromQuery: STATE, stateNonceCookie: { state: STATE, nonce: NONCE } })).rejects.toBeInstanceOf(OAuthAccountConflictError);
    expect(emitted).toContainEqual({ event: 'auth.oauth.google.failure', reason: 'account_conflict' });
  });
});
