// US-146 · PB-P3-007 · QA-008 (NT-02) + SEC-001 + VR-01/VR-02
// Unit test determinista del resolvedor de configuración del smoke real-URL. Cubre los negativos
// de configuración (NT-02) sin necesidad de un entorno Demo desplegado: URL faltante (skip),
// localhost/URL inválida (fail-fast VR-01), credenciales ausentes (fail-fast VR-02) y redacción
// segura de URLs (SEC-03). Es la evidencia ejecutable de la guardia "sin falso verde" a nivel config.
import { describe, expect, it } from 'vitest';
import {
  DEMO_SMOKE_ENV,
  isPublicHttpUrl,
  redactUrl,
  resolveDemoSmokeConfig,
} from '../demo-smoke/demo-smoke-config';

const FULL_ENV: Record<string, string | undefined> = {
  [DEMO_SMOKE_ENV.baseUrl]: 'https://demo.eventflow.example',
  [DEMO_SMOKE_ENV.apiUrl]: 'https://api.demo.eventflow.example',
  [DEMO_SMOKE_ENV.email]: 'organizer0@seed.eventflow.test',
  [DEMO_SMOKE_ENV.password]: 'not-a-real-secret-test-value',
};

describe('US-146 · resolveDemoSmokeConfig', () => {
  it('config completa y válida → configured con config normalizada (sin `/` final)', () => {
    const res = resolveDemoSmokeConfig({
      ...FULL_ENV,
      [DEMO_SMOKE_ENV.baseUrl]: 'https://demo.eventflow.example/',
      [DEMO_SMOKE_ENV.apiUrl]: 'https://api.demo.eventflow.example/',
    });
    expect(res.configured).toBe(true);
    expect(res.error).toBeUndefined();
    expect(res.config).toEqual({
      baseUrl: 'https://demo.eventflow.example',
      apiUrl: 'https://api.demo.eventflow.example',
      organizerEmail: 'organizer0@seed.eventflow.test',
      organizerPassword: 'not-a-real-secret-test-value',
    });
  });

  it('sin DEMO_SMOKE_BASE_URL → configured=false (skip limpio, sin error)', () => {
    const res = resolveDemoSmokeConfig({});
    expect(res.configured).toBe(false);
    expect(res.error).toBeUndefined();
    expect(res.config).toBeUndefined();
    expect(res.missing).toContain(DEMO_SMOKE_ENV.baseUrl);
  });

  it('NT-02 / VR-01 · base URL localhost → fail-fast con error (nunca localhost)', () => {
    const res = resolveDemoSmokeConfig({ ...FULL_ENV, [DEMO_SMOKE_ENV.baseUrl]: 'http://localhost:3000' });
    expect(res.configured).toBe(true);
    expect(res.error).toMatch(/VR-01|localhost|pública/);
    expect(res.config).toBeUndefined();
  });

  it('NT-02 / VR-01 · base URL no http(s) → fail-fast', () => {
    const res = resolveDemoSmokeConfig({ ...FULL_ENV, [DEMO_SMOKE_ENV.baseUrl]: 'ftp://demo.example' });
    expect(res.error).toBeTruthy();
    expect(res.config).toBeUndefined();
  });

  it('VR-04 · falta DEMO_SMOKE_API_URL → fail-fast (precheck /health imposible)', () => {
    const env = { ...FULL_ENV, [DEMO_SMOKE_ENV.apiUrl]: undefined };
    const res = resolveDemoSmokeConfig(env);
    expect(res.error).toMatch(/VR-04|API_URL|health/i);
    expect(res.config).toBeUndefined();
  });

  it('NT-02 / VR-02 · faltan credenciales con base URL presente → fail-fast (nunca hardcodeadas)', () => {
    const env = { ...FULL_ENV, [DEMO_SMOKE_ENV.email]: undefined, [DEMO_SMOKE_ENV.password]: undefined };
    const res = resolveDemoSmokeConfig(env);
    expect(res.configured).toBe(true);
    expect(res.error).toMatch(/VR-02|credenciales/i);
    expect(res.missing).toEqual(
      expect.arrayContaining([DEMO_SMOKE_ENV.email, DEMO_SMOKE_ENV.password]),
    );
  });

  it('trim: valores con espacios se normalizan; vacío se trata como ausente', () => {
    const res = resolveDemoSmokeConfig({ ...FULL_ENV, [DEMO_SMOKE_ENV.password]: '   ' });
    expect(res.error).toMatch(/VR-02|credenciales/i);
  });
});

describe('US-146 · isPublicHttpUrl', () => {
  it('acepta URLs públicas http(s)', () => {
    expect(isPublicHttpUrl('https://demo.eventflow.example')).toBe(true);
    expect(isPublicHttpUrl('http://demo.eventflow.example')).toBe(true);
  });

  it('rechaza localhost, loopback y hosts .local / no-web', () => {
    for (const url of [
      'http://localhost:3000',
      'http://127.0.0.1',
      'http://0.0.0.0:8080',
      'https://myhost.local',
      'ftp://demo.example',
      'not-a-url',
    ]) {
      expect(isPublicHttpUrl(url), url).toBe(false);
    }
  });
});

describe('US-146 · redactUrl (SEC-03)', () => {
  it('reduce a protocol//host y descarta credenciales/query', () => {
    expect(redactUrl('https://user:secret@demo.example/path?token=abc')).toBe('https://demo.example');
    expect(redactUrl('nope')).toBe('<invalid-url>');
  });
});
