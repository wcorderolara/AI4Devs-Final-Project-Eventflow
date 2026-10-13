// FR-I18N-001/004 — Paridad de catálogos: todo namespace y toda clave de `es-LATAM` (locale base)
// debe existir en `es-ES`, `pt` y `en`. El fallback a es-LATAM de `request.ts` oculta los huecos en
// runtime (la UI sale en español en vez de fallar), así que sólo un test los detecta.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MESSAGES_DIR = join(process.cwd(), 'src/messages');
const BASE_LOCALE = 'es-LATAM';
const LOCALES = ['es-ES', 'pt', 'en'] as const;

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function catalogKeys(locale: string): Set<string> {
  const dir = join(MESSAGES_DIR, locale);
  return new Set(
    readdirSync(dir)
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => {
        const namespace = file.replace(/\.json$/, '');
        const json: unknown = JSON.parse(readFileSync(join(dir, file), 'utf8'));
        return flattenKeys(json).map((key) => `${namespace}:${key}`);
      }),
  );
}

describe('i18n — paridad de catálogos entre locales', () => {
  const baseKeys = catalogKeys(BASE_LOCALE);

  it.each(LOCALES)('%s tiene exactamente las mismas claves que es-LATAM', (locale) => {
    const keys = catalogKeys(locale);
    const missing = Array.from(baseKeys).filter((key) => !keys.has(key));
    const extra = Array.from(keys).filter((key) => !baseKeys.has(key));

    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });
});
