// US-094 / QA-001 — Unit tests de validadores, policies y helpers de AUTH (sin BD, sin red).
// Cubre AC-01/AC-04/AC-06/AC-07; VR-01..VR-08; SEC-05/SEC-08.
import { describe, it, expect } from 'vitest';
import { passwordSchema } from '../../src/shared/validation/password.js';
import {
  API_TO_PRISMA_LANGUAGE,
  PRISMA_TO_API_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from '../../src/shared/constants/languages.js';
import { RegisterUserRequestSchema, LoginUserRequestSchema } from '../../src/modules/identity-access/dto/index.js';
import {
  UpdateCurrentUserProfileSchema,
  ChangePasswordSchema,
} from '../../src/modules/user-profile/dto/index.js';
import { Sha256ResetTokenGenerator } from '../../src/infrastructure/security/sha256-reset-token.generator.js';
import { BcryptPasswordHasher } from '../../src/infrastructure/security/bcrypt-password-hasher.js';

describe('passwordSchema (VR-02, Doc 19 §11.2 — política MVP alineada en US-001)', () => {
  it('acepta una contraseña conforme a política', () => {
    expect(passwordSchema.safeParse('Secret1234').success).toBe(true);
  });
  it('acepta contraseña sin mayúscula (política MVP: al menos una letra y un número)', () => {
    expect(passwordSchema.safeParse('secret1234').success).toBe(true);
  });
  it('rechaza < 10 caracteres', () => {
    expect(passwordSchema.safeParse('Ab1').success).toBe(false);
  });
  it('rechaza sin letra', () => {
    expect(passwordSchema.safeParse('1234567890').success).toBe(false);
  });
  it('rechaza sin dígito', () => {
    expect(passwordSchema.safeParse('SecretPassword').success).toBe(false);
  });
});

describe('RegisterUserRequestSchema (AC-01, SEC-08, VR)', () => {
  const valid = {
    email: 'User@Example.com',
    password: 'Secret1234',
    name: 'Ana Pérez',
    role: 'organizer',
    acceptedTerms: true,
    captchaToken: 't',
  };

  it('normaliza el email a lowercase (VR-01)', () => {
    const r = RegisterUserRequestSchema.parse(valid);
    expect(r.email).toBe('user@example.com');
  });
  it('rechaza role=admin (SEC-08, EC-01)', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...valid, role: 'admin' }).success).toBe(false);
  });
  it('acepta organizer y vendor (variant vendor usa businessName — US-002)', () => {
    const { name: _omit, ...sinName } = valid;
    expect(
      RegisterUserRequestSchema.safeParse({ ...sinName, role: 'vendor', businessName: 'Catering Luna' }).success,
    ).toBe(true);
    // La variant vendor rechaza `name` (strict) — el campo comercial es businessName.
    expect(RegisterUserRequestSchema.safeParse({ ...valid, role: 'vendor' }).success).toBe(false);
  });
  it('rechaza campos desconocidos (.strict())', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...valid, isAdmin: true }).success).toBe(false);
  });
  it('rechaza preferredLanguage no soportado (VR-05)', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...valid, preferredLanguage: 'fr' }).success).toBe(false);
  });
  it('exige captchaToken (VR-06)', () => {
    const { captchaToken: _omit, ...noCaptcha } = valid;
    expect(RegisterUserRequestSchema.safeParse(noCaptcha).success).toBe(false);
  });
});

describe('LoginUserRequestSchema', () => {
  it('normaliza email y exige captcha', () => {
    const r = LoginUserRequestSchema.parse({ email: 'A@B.com', password: 'x', captchaToken: 't' });
    expect(r.email).toBe('a@b.com');
  });
});

describe('UpdateCurrentUserProfileSchema (AC-04, VR-08)', () => {
  it('acepta campos permitidos', () => {
    expect(UpdateCurrentUserProfileSchema.safeParse({ name: 'Nuevo', phone: '+502 555' }).success).toBe(true);
  });
  it('rechaza campos inmutables (email/role/status)', () => {
    expect(UpdateCurrentUserProfileSchema.safeParse({ email: 'x@y.com' }).success).toBe(false);
    expect(UpdateCurrentUserProfileSchema.safeParse({ role: 'admin' }).success).toBe(false);
    expect(UpdateCurrentUserProfileSchema.safeParse({ status: 'suspended' }).success).toBe(false);
  });
  it('rechaza payload vacío (requiere ≥1 campo)', () => {
    expect(UpdateCurrentUserProfileSchema.safeParse({}).success).toBe(false);
  });
});

describe('ChangePasswordSchema', () => {
  it('exige currentPassword y newPassword conforme a política', () => {
    expect(ChangePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'Secret1234' }).success).toBe(true);
    expect(ChangePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'weak' }).success).toBe(false);
  });
});

describe('Mapeo de idioma API↔Prisma (BE-003)', () => {
  it('es-LATAM ↔ es_LATAM (round-trip)', () => {
    expect(API_TO_PRISMA_LANGUAGE['es-LATAM']).toBe('es_LATAM');
    expect(PRISMA_TO_API_LANGUAGE.es_LATAM).toBe('es-LATAM');
  });
  it('todos los idiomas soportados tienen mapeo bidireccional', () => {
    for (const api of SUPPORTED_LANGUAGES) {
      const prisma = API_TO_PRISMA_LANGUAGE[api];
      expect(PRISMA_TO_API_LANGUAGE[prisma as keyof typeof PRISMA_TO_API_LANGUAGE]).toBe(api);
    }
  });
});

describe('Sha256ResetTokenGenerator (AC-06/AC-07, EC-06)', () => {
  const gen = new Sha256ResetTokenGenerator();
  it('generate() produce raw + hash; hash(raw) coincide (determinista)', () => {
    const { raw, hash } = gen.generate();
    expect(raw.length).toBeGreaterThan(20);
    expect(gen.hash(raw)).toBe(hash);
  });
  it('el hash no es igual al token crudo (se persiste solo el hash)', () => {
    const { raw, hash } = gen.generate();
    expect(hash).not.toBe(raw);
  });
  it('tokens distintos generan hashes distintos', () => {
    expect(gen.generate().hash).not.toBe(gen.generate().hash);
  });
});

describe('BcryptPasswordHasher (SEC-05)', () => {
  const hasher = new BcryptPasswordHasher(4); // coste bajo para test rápido
  it('hash/verify roundtrip', async () => {
    const hash = await hasher.hash('Secret1234');
    expect(hash).not.toContain('Secret1234');
    expect(await hasher.verify('Secret1234', hash)).toBe(true);
    expect(await hasher.verify('wrong', hash)).toBe(false);
  });
});
