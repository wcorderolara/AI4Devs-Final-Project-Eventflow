// US-108 / QA-001 — Tests unitarios de configuración de cookie/session y fail-fast (AC-02, AC-06).
// Cubre VR-01..VR-05, EC-03, EC-04: secret corto, Secure=false no-local, SameSite=None sin Secure,
// SameSite=None sin CORS credentials/allowlist, wildcard CORS con credentials, y defaults 30d/lax.
// Además valida los atributos de la cookie emitida (Max-Age 30 días, HttpOnly, firmada, Path=/).
import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { parseConfig } from '../../src/config/env.js';
import {
  baseCookieOptions,
  issueSessionCookie,
  clearSessionCookie,
  SESSION_MAX_AGE_MS,
} from '../../src/infrastructure/security/session-cookie.js';

/** Base válida mínima (Local/dev). Cada test la extiende para el caso bajo prueba. */
const base = {
  PORT: '3000',
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/eventflow_test?schema=public',
  JWT_SECRET: 'test_jwt_secret_min_32_characters_long_xx',
  SESSION_SECRET: 'test_session_secret_min_32_characters_long_xx',
  LLM_PROVIDER: 'mock',
  CORS_ORIGINS: 'http://localhost:3000',
  CAPTCHA_PROVIDER: 'mock',
} satisfies NodeJS.ProcessEnv;

describe('US-108 QA-001: defaults de cookie/session (AC-02)', () => {
  it('aplica Max-Age 30 días y SameSite=Lax por default', () => {
    const cfg = parseConfig(base);
    expect(cfg.SESSION_COOKIE_MAX_AGE_DAYS).toBe(30);
    expect(cfg.SESSION_COOKIE_SAMESITE).toBe('lax');
    expect(cfg.CORS_CREDENTIALS).toBe(true);
  });

  it('normaliza SameSite case-insensitive (LAX/None → lax/none)', () => {
    expect(parseConfig({ ...base, SESSION_COOKIE_SAMESITE: 'LAX' }).SESSION_COOKIE_SAMESITE).toBe('lax');
    // `none` requiere secure+CORS; se prueba la normalización con config válida cross-site.
    const cross = parseConfig({
      ...base,
      NODE_ENV: 'production',
      SESSION_COOKIE_SECURE: 'true',
      SESSION_COOKIE_SAMESITE: 'None',
      CORS_ORIGINS: 'https://app.eventflow.com',
      CORS_CREDENTIALS: 'true',
      // Producción no admite CAPTCHA_PROVIDER=mock (US-109); usar proveedor real con secret.
      CAPTCHA_PROVIDER: 'recaptcha',
      RECAPTCHA_SECRET_KEY: 'real-recaptcha-secret',
    });
    expect(cross.SESSION_COOKIE_SAMESITE).toBe('none');
  });
});

describe('US-108 QA-001: fail-fast de configuración insegura (AC-06)', () => {
  it('VR-01: SESSION_SECRET < 32 bytes → ZodError', () => {
    expect(() => parseConfig({ ...base, SESSION_SECRET: 'short' })).toThrow(ZodError);
  });

  it('VR-02 (EC-03): NODE_ENV=production con SESSION_COOKIE_SECURE=false → ZodError', () => {
    expect(() =>
      parseConfig({ ...base, NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' }),
    ).toThrow(ZodError);
  });

  it('VR-03: SameSite=None sin Secure → ZodError', () => {
    expect(() =>
      parseConfig({ ...base, SESSION_COOKIE_SAMESITE: 'none', SESSION_COOKIE_SECURE: 'false' }),
    ).toThrow(ZodError);
  });

  it('VR-04: SameSite=None con Secure pero sin CORS_CREDENTIALS → ZodError', () => {
    expect(() =>
      parseConfig({
        ...base,
        NODE_ENV: 'production',
        SESSION_COOKIE_SECURE: 'true',
        SESSION_COOKIE_SAMESITE: 'none',
        CORS_ORIGINS: 'https://app.eventflow.com',
        CORS_CREDENTIALS: 'false',
      }),
    ).toThrow(ZodError);
  });

  it('VR-04: SameSite=None con wildcard CORS → ZodError', () => {
    expect(() =>
      parseConfig({
        ...base,
        NODE_ENV: 'production',
        SESSION_COOKIE_SECURE: 'true',
        SESSION_COOKIE_SAMESITE: 'none',
        CORS_ORIGINS: '*',
        CORS_CREDENTIALS: 'true',
      }),
    ).toThrow(ZodError);
  });

  it('EC-04: wildcard CORS con credentials → ZodError', () => {
    expect(() => parseConfig({ ...base, CORS_ORIGINS: '*', CORS_CREDENTIALS: 'true' })).toThrow(ZodError);
  });

  it('config segura de producción (Secure=true, SameSite=none, CORS explícito+credentials) → OK', () => {
    const cfg = parseConfig({
      ...base,
      NODE_ENV: 'production',
      SESSION_COOKIE_SECURE: 'true',
      SESSION_COOKIE_SAMESITE: 'none',
      CORS_ORIGINS: 'https://app.eventflow.com',
      CORS_CREDENTIALS: 'true',
      // Producción no admite CAPTCHA_PROVIDER=mock (US-109); usar proveedor real con secret.
      CAPTCHA_PROVIDER: 'recaptcha',
      RECAPTCHA_SECRET_KEY: 'real-recaptcha-secret',
    });
    expect(cfg.SESSION_COOKIE_SECURE).toBe(true);
    expect(cfg.SESSION_COOKIE_SAMESITE).toBe('none');
  });
});

describe('US-108 QA-001: atributos de la cookie emitida (AC-01, AC-05)', () => {
  it('baseCookieOptions es HttpOnly, firmada, SameSite=Lax (default test), Path=/', () => {
    const opts = baseCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.signed).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    // En test NODE_ENV!=production y SESSION_COOKIE_SECURE no seteado → Secure=false (HTTP local).
    expect(opts.secure).toBe(false);
  });

  it('issueSessionCookie emite Max-Age de 30 días', () => {
    const cookie = vi.fn();
    issueSessionCookie({ cookie } as unknown as Response, 'sid-opaco');
    expect(SESSION_MAX_AGE_MS).toBe(30 * 24 * 60 * 60 * 1000);
    const [, sid, opts] = cookie.mock.calls[0] as [string, string, { maxAge: number }];
    expect(sid).toBe('sid-opaco');
    expect(opts.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('clearSessionCookie limpia con los mismos atributos base (invalidación)', () => {
    const clearCookie = vi.fn();
    clearSessionCookie({ clearCookie } as unknown as Response);
    const [, opts] = clearCookie.mock.calls[0] as [string, { path: string; httpOnly: boolean }];
    expect(opts.path).toBe('/');
    expect(opts.httpOnly).toBe(true);
  });
});
