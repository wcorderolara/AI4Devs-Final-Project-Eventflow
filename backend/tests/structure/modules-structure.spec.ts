// Test estructural de US-090 (EMERGENT): hace durable en `npm test` el invariante de AC-01/AC-02.
// Verifica los bounded contexts × 5 capas (US-076 añadió `event-catalog`; US-116 añadió
// `platform-health` como módulo de infraestructura horizontal), el shared kernel y los 14
// middleware stubs.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../src');

const MODULES = [
  'identity-access', 'user-profile', 'event-planning', 'task-management',
  'budget-management', 'vendor-management', 'service-catalog', 'event-catalog',
  'quote-flow', 'booking-intent', 'reviews-moderation', 'notifications',
  'ai-assistance', 'admin-governance', 'attachments', 'localization', 'seed-demo',
  // US-116 (PB-P2-013): módulo de infraestructura horizontal para healthcheck/readiness.
  'platform-health',
] as const;
const LAYERS = ['interface', 'application', 'domain', 'ports', 'infrastructure'] as const;

const SHARED_DOMAIN = [
  'result.ts', 'id.ts', 'correlation-id.ts', 'clock.port.ts',
  'errors/app.error.ts', 'errors/validation.error.ts', 'errors/authorization.error.ts',
];

const MIDDLEWARES = [
  'correlation-id', 'request-logger', 'json-body-parser', 'cors', 'helmet', 'rate-limit',
  'auth', 'captcha-verification', 'role', 'ownership', 'validate-request', 'file-upload',
  'not-found', 'error-handler',
];

describe('US-090 estructura de módulos (AC-01)', () => {
  it(`existen exactamente los ${MODULES.length} bounded contexts canónicos (Doc 14 §9 + US-116 platform-health)`, () => {
    const dirs = readdirSync(resolve(srcDir, 'modules'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(dirs).toEqual([...MODULES].sort());
  });

  it(`cada módulo contiene las 5 capas (${MODULES.length * LAYERS.length} directorios)`, () => {
    let layerCount = 0;
    for (const m of MODULES) {
      for (const l of LAYERS) {
        const p = resolve(srcDir, 'modules', m, l);
        expect(existsSync(p) && statSync(p).isDirectory(), `${m}/${l} debe existir`).toBe(true);
        layerCount++;
      }
    }
    expect(layerCount).toBe(MODULES.length * LAYERS.length);
  });
});

describe('US-090 shared kernel (AC-02)', () => {
  it('src/shared/domain/ contiene los 7 tipos/errores base', () => {
    for (const f of SHARED_DOMAIN) {
      expect(existsSync(resolve(srcDir, 'shared/domain', f)), `${f} debe existir`).toBe(true);
    }
  });

  it('existen las 4 capas del shared kernel', () => {
    for (const l of ['domain', 'application', 'infrastructure', 'interface']) {
      expect(existsSync(resolve(srcDir, 'shared', l)), `shared/${l} debe existir`).toBe(true);
    }
  });

  it('src/shared/interface/middlewares/ contiene exactamente 14 stubs', () => {
    const dir = resolve(srcDir, 'shared/interface/middlewares');
    const files = readdirSync(dir).filter((f) => f.endsWith('.middleware.ts'));
    expect(files.length).toBe(14);
    for (const m of MIDDLEWARES) {
      expect(files).toContain(`${m}.middleware.ts`);
    }
  });
});
