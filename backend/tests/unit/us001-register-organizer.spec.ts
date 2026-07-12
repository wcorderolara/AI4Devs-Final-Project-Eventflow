// US-001 / QA-001 — Unit tests del registro de organizador (PB-P1-001). Sin BD, sin red.
// Cubre: PasswordHasher argon2id (BE-005, AC-01), RegisterOrganizerDTO/RegisterUserRequestSchema
// (BE-003; VR-01..VR-06, EC-02/EC-03), inferencia Accept-Language (BE-001, AC-02) y redacción del
// welcome simulado (OBS-001, SEC-07).
import { describe, it, expect } from 'vitest';
import {
  Argon2idPasswordHasher,
  ARGON2ID_OPTIONS,
} from '../../src/infrastructure/security/argon2id-password-hasher.js';
import { BcryptPasswordHasher } from '../../src/infrastructure/security/bcrypt-password-hasher.js';
import { RegisterUserRequestSchema } from '../../src/modules/identity-access/dto/index.js';
import { resolvePreferredLanguage } from '../../src/shared/interface/http/accept-language.js';
import { redactEmailForLog } from '../../src/infrastructure/notifications/logging-welcome-email-notifier.js';
import { passwordEqualsEmailLocalpart } from '../../src/shared/validation/password.js';

describe('US-001 BE-005 — Argon2idPasswordHasher (AC-01, Doc 19 §11.1)', () => {
  const hasher = new Argon2idPasswordHasher();

  it('usa argon2id con parámetros mínimos OWASP (m=19MiB, t=2, p=1)', async () => {
    const hash = await hasher.hash('Secret1234');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).toContain('m=19456,t=2,p=1');
    expect(ARGON2ID_OPTIONS.memoryCost).toBe(19 * 1024);
    expect(ARGON2ID_OPTIONS.timeCost).toBe(2);
    expect(ARGON2ID_OPTIONS.parallelism).toBe(1);
  });

  it('verify acepta la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hasher.hash('Secret1234');
    expect(await hasher.verify('Secret1234', hash)).toBe(true);
    expect(await hasher.verify('WrongPass99', hash)).toBe(false);
  });

  it('verify mantiene compatibilidad con hashes bcrypt legados (fallback documentado)', async () => {
    const bcryptHash = await new BcryptPasswordHasher(4).hash('Secret1234');
    expect(bcryptHash.startsWith('$2')).toBe(true);
    expect(await hasher.verify('Secret1234', bcryptHash)).toBe(true);
    expect(await hasher.verify('WrongPass99', bcryptHash)).toBe(false);
  });

  it('verify con hash malformado → false (sin lanzar)', async () => {
    expect(await hasher.verify('Secret1234', 'not-a-hash')).toBe(false);
  });
});

describe('US-001 BE-003 — RegisterOrganizerDTO (VR-01..VR-06, EC-02/EC-03)', () => {
  const valid = {
    email: 'Orga@Example.com',
    password: 'segura12345',
    name: 'Ana Pérez',
    role: 'organizer',
    acceptedTerms: true,
    captchaToken: 'tok',
  };

  it('acepta el payload canónico y normaliza email (VR-01)', () => {
    const r = RegisterUserRequestSchema.parse(valid);
    expect(r.email).toBe('orga@example.com');
    expect(r.role).toBe('organizer');
  });

  it('EC-02: rechaza contraseña débil (sin número)', () => {
    const r = RegisterUserRequestSchema.safeParse({ ...valid, password: 'sinnumeros' });
    expect(r.success).toBe(false);
  });

  it('EC-02/VR-02: rechaza contraseña igual al localpart del email (case-insensitive)', () => {
    const r = RegisterUserRequestSchema.safeParse({
      ...valid,
      email: 'Password12@example.com',
      password: 'password12',
    });
    expect(r.success).toBe(false);
    expect(passwordEqualsEmailLocalpart('password12', 'Password12@example.com')).toBe(true);
  });

  it('EC-03: rechaza email mal formado sin tocar persistencia', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...valid, email: 'no-es-email' }).success).toBe(false);
  });

  it('VR-03: nombre 2..120 caracteres', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
    expect(RegisterUserRequestSchema.safeParse({ ...valid, name: 'A'.repeat(121) }).success).toBe(false);
    expect(RegisterUserRequestSchema.safeParse({ ...valid, name: 'Al' }).success).toBe(true);
  });

  it('VR-04: acceptedTerms debe ser exactamente true', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...valid, acceptedTerms: false }).success).toBe(false);
    const { acceptedTerms: _omit, ...sinTerms } = valid;
    expect(RegisterUserRequestSchema.safeParse(sinTerms).success).toBe(false);
  });

  it('VR-06/SEC-02: role=admin se rechaza (jamás se persiste admin por registro)', () => {
    expect(RegisterUserRequestSchema.safeParse({ ...valid, role: 'admin' }).success).toBe(false);
  });
});

describe('US-001 BE-001 — resolvePreferredLanguage (AC-02)', () => {
  it('es-LATAM directo y variantes regionales de español → es-LATAM', () => {
    expect(resolvePreferredLanguage('es-LATAM')).toBe('es-LATAM');
    expect(resolvePreferredLanguage('es-419,es;q=0.9')).toBe('es-LATAM');
    expect(resolvePreferredLanguage('es-MX')).toBe('es-LATAM');
  });

  it('es-ES exacto se preserva', () => {
    expect(resolvePreferredLanguage('es-ES,es;q=0.8')).toBe('es-ES');
  });

  it('pt y en (con región) mapean a su código soportado', () => {
    expect(resolvePreferredLanguage('pt-BR,pt;q=0.9')).toBe('pt');
    expect(resolvePreferredLanguage('en-US,en;q=0.9')).toBe('en');
  });

  it('respeta q-values (mayor calidad primero)', () => {
    expect(resolvePreferredLanguage('en;q=0.5,pt;q=0.9')).toBe('pt');
  });

  it('header ausente, vacío o sin match → fallback es-LATAM', () => {
    expect(resolvePreferredLanguage(undefined)).toBe('es-LATAM');
    expect(resolvePreferredLanguage('')).toBe('es-LATAM');
    expect(resolvePreferredLanguage('fr-FR,de;q=0.8')).toBe('es-LATAM');
    expect(resolvePreferredLanguage('*')).toBe('es-LATAM');
  });
});

describe('US-001 OBS-001/SEC-002 — redacción del destinatario en welcome simulado (SEC-07)', () => {
  it('trunca el local-part y preserva el dominio', () => {
    expect(redactEmailForLog('karla.lopez@eventflow.demo')).toBe('ka***@eventflow.demo');
    expect(redactEmailForLog('a@x.com')).toBe('a***@x.com');
  });
});
