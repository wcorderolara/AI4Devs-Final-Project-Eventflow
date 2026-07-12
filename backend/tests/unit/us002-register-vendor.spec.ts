// US-002 / QA-001 — Unit tests del registro de proveedor (PB-P1-002). Sin BD, sin red.
// Cubre: discriminated union RegisterUserDTO (BE-001; VR-01..VR-06), flujo vendor del use case
// (BE-002 vía RegisterUserUseCase parametrizado — nota N4) y welcome.vendor (OBS-001).
import { describe, it, expect } from 'vitest';
import {
  RegisterUserRequestSchema,
  RegisterVendorRequestSchema,
} from '../../src/modules/identity-access/dto/index.js';
import { RegisterUserUseCase } from '../../src/modules/identity-access/application/register-user.use-case.js';
import type {
  UserRepository,
  PasswordHasher,
  SessionRepository,
  AuthEventLogger,
  AuthEventName,
  WelcomeEmailNotifier,
} from '../../src/shared/auth/ports.js';
import type { AuthUser, AuthUserWithSecret, CreateUserInput, ResolvedSession } from '../../src/shared/auth/types.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const FIXED_NOW = new Date('2026-07-10T00:00:00.000Z');
const clock: ClockPort = { now: () => FIXED_NOW };

const validVendor = {
  role: 'vendor',
  businessName: 'Catering Luna',
  email: 'Luna@Example.com',
  password: 'segura12345',
  acceptedTerms: true,
  captchaToken: 'tok',
};

describe('US-002 BE-001 — RegisterUserDTO discriminated union (VR-01..VR-06)', () => {
  it('acepta la variant vendor canónica y normaliza email', () => {
    const parsed = RegisterUserRequestSchema.parse(validVendor);
    expect(parsed.role).toBe('vendor');
    expect(parsed.email).toBe('luna@example.com');
  });

  it('VR-03: businessName 2..150', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...validVendor, businessName: 'A' }).success).toBe(false);
    expect(
      RegisterUserRequestSchema.safeParse({ ...validVendor, businessName: 'A'.repeat(151) }).success,
    ).toBe(false);
    expect(RegisterVendorRequestSchema.safeParse(validVendor).success).toBe(true);
  });

  it('VR-06/SEC-06: role=admin no existe en el discriminador → rechazo', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...validVendor, role: 'admin' }).success).toBe(false);
  });

  it('la variant vendor rechaza `name` y la organizer rechaza `businessName` (.strict())', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...validVendor, name: 'Ana' }).success).toBe(false);
    expect(
      RegisterUserRequestSchema.safeParse({
        role: 'organizer',
        name: 'Ana Pérez',
        businessName: 'X SA',
        email: 'a@b.com',
        password: 'segura12345',
        acceptedTerms: true,
        captchaToken: 't',
      }).success,
    ).toBe(false);
  });

  it('EC-03: password débil y VR-02 localpart aplican también a vendor', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...validVendor, password: 'corta1' }).success).toBe(false);
    expect(
      RegisterUserRequestSchema.safeParse({
        ...validVendor,
        email: 'Password12@example.com',
        password: 'password12',
      }).success,
    ).toBe(false);
  });

  it('VR-04: acceptedTerms literal(true) obligatorio en vendor', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...validVendor, acceptedTerms: false }).success).toBe(false);
  });

  it('regression US-001: la variant organizer sigue aceptando su payload canónico', () => {
    expect(
      RegisterUserRequestSchema.safeParse({
        role: 'organizer',
        name: 'Ana Pérez',
        email: 'ana@example.com',
        password: 'segura12345',
        acceptedTerms: true,
        captchaToken: 't',
      }).success,
    ).toBe(true);
  });
});

class MemUsers implements UserRepository {
  created: CreateUserInput[] = [];
  findByEmailNormalized(): Promise<AuthUserWithSecret | null> {
    return Promise.resolve(null);
  }
  findById(): Promise<AuthUser | null> {
    return Promise.resolve(null);
  }
  findByIdWithSecret(): Promise<AuthUserWithSecret | null> {
    return Promise.resolve(null);
  }
  create(input: CreateUserInput): Promise<AuthUser> {
    this.created.push(input);
    return Promise.resolve({
      id: 'u-1',
      email: input.email,
      name: input.name,
      phone: input.phone ?? null,
      role: input.role,
      status: 'active',
      preferredLanguage: input.preferredLanguage,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
  }
  updateProfile(): Promise<AuthUser> {
    return Promise.reject(new Error('not used'));
  }
  updatePasswordHash(): Promise<void> {
    return Promise.resolve();
  }
}

describe('US-002 BE-002/OBS-001 — flujo vendor del use case (N4)', () => {
  it('crea User role=vendor con businessName como name, sesión, welcome.vendor y evento con role', async () => {
    const users = new MemUsers();
    const sessions: SessionRepository = {
      create: () => Promise.resolve({ id: 's-1' }),
      findValid: (): Promise<ResolvedSession | null> => Promise.resolve(null),
      revoke: () => Promise.resolve(),
    };
    const emitted: Array<{ event: AuthEventName; role?: string }> = [];
    const events: AuthEventLogger = {
      emit: (event, data) => {
        emitted.push({ event, role: data.role });
      },
    };
    const welcome: Array<{ role: string }> = [];
    const welcomeNotifier: WelcomeEmailNotifier = {
      deliver: (input) => {
        welcome.push({ role: input.role });
        return Promise.resolve();
      },
    };
    const hasher: PasswordHasher = {
      hash: (p) => Promise.resolve(`h:${p}`),
      verify: () => Promise.resolve(true),
    };

    const uc = new RegisterUserUseCase(users, hasher, sessions, clock, events, welcomeNotifier);
    const { user, sessionId } = await uc.execute({
      email: 'luna@example.com',
      password: 'segura12345',
      name: 'Catering Luna', // el controller mapea businessName → name (BE-003)
      role: 'vendor',
      preferredLanguage: 'pt',
    });

    expect(user.role).toBe('vendor');
    expect(users.created[0]).toMatchObject({ role: 'vendor', name: 'Catering Luna', preferredLanguage: 'pt' });
    expect(sessionId).toBe('s-1');
    expect(welcome).toEqual([{ role: 'vendor' }]);
    expect(emitted).toContainEqual({ event: 'auth.register.success', role: 'vendor' });
  });
});
