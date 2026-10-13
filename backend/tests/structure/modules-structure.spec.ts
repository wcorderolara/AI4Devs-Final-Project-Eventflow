// Test estructural de US-090 (EMERGENT): hace durable en `npm test` el invariante de AC-01/AC-02.
// Verifica los bounded contexts (US-076 añadió `event-catalog`; US-116 añadió `platform-health`
// como módulo de infraestructura horizontal), el shared kernel y los middlewares globales/por ruta.
// Las capas (interface/application/domain/ports/infrastructure) sólo existen cuando tienen
// contenido: no se exigen placeholders `export {}` vacíos (YAGNI).
import { existsSync, readdirSync } from 'node:fs';
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

const SHARED_DOMAIN = [
  'clock.port.ts',
  'errors/app.error.ts', 'errors/validation.error.ts', 'errors/authorization.error.ts',
];

const MIDDLEWARES = [
  'correlation-id', 'request-logger', 'json-body-parser', 'cors', 'helmet', 'rate-limit',
  'captcha-verification', 'role', 'validate-request', 'not-found', 'error-handler',
];

/** `true` si el directorio contiene al menos un archivo `.ts` (recursivo). */
function hasTsContent(dir: string): boolean {
  return readdirSync(dir, { withFileTypes: true }).some((e) =>
    e.isDirectory() ? hasTsContent(resolve(dir, e.name)) : e.name.endsWith('.ts'),
  );
}

describe('US-090 estructura de módulos (AC-01)', () => {
  it(`existen exactamente los ${MODULES.length} bounded contexts canónicos (Doc 14 §9 + US-116 platform-health)`, () => {
    const dirs = readdirSync(resolve(srcDir, 'modules'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(dirs).toEqual([...MODULES].sort());
  });

  it('cada módulo y cada una de sus capas tiene contenido (sin directorios vacíos)', () => {
    for (const m of MODULES) {
      const moduleDir = resolve(srcDir, 'modules', m);
      expect(hasTsContent(moduleDir), `${m} debe contener al menos un .ts`).toBe(true);
      for (const layer of readdirSync(moduleDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
        expect(hasTsContent(resolve(moduleDir, layer.name)), `${m}/${layer.name} no debe estar vacío`).toBe(true);
      }
    }
  });
});

describe('US-090 shared kernel (AC-02)', () => {
  it(`src/shared/domain/ contiene los ${SHARED_DOMAIN.length} tipos/errores base`, () => {
    for (const f of SHARED_DOMAIN) {
      expect(existsSync(resolve(srcDir, 'shared/domain', f)), `${f} debe existir`).toBe(true);
    }
  });

  it('existen las 4 capas del shared kernel', () => {
    for (const l of ['domain', 'application', 'infrastructure', 'interface']) {
      expect(existsSync(resolve(srcDir, 'shared', l)), `shared/${l} debe existir`).toBe(true);
    }
  });

  it(`src/shared/interface/middlewares/ contiene exactamente ${MIDDLEWARES.length} middlewares`, () => {
    const dir = resolve(srcDir, 'shared/interface/middlewares');
    const files = readdirSync(dir).filter((f) => f.endsWith('.middleware.ts'));
    expect(files.length).toBe(MIDDLEWARES.length);
    for (const m of MIDDLEWARES) {
      expect(files).toContain(`${m}.middleware.ts`);
    }
  });
});
