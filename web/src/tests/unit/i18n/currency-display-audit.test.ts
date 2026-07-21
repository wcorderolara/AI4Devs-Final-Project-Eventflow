// US-083 (PB-P1-048) — QA-004 Audit lint/test: bloquea que se agreguen usos de
// `Intl.NumberFormat({ style: 'currency' })` (o equivalentes: `toLocaleString(..., { style:
// 'currency' })`, `new Intl.NumberFormat(..., 'currency')`) fuera del helper compartido
// `@/shared/i18n/format.ts` y del componente `Money` (que ya llama al helper).
//
// Excepciones permitidas:
//   - `src/shared/i18n/format.ts` — la definición canónica del helper.
//   - `src/tests/` — los propios tests del helper y del componente pueden hacer aserciones
//     sobre el formato usando `Intl.NumberFormat` directamente.
//
// Cualquier nueva superficie que muestre cifras monetarias debe hacerlo vía `<Money>` o
// `formatCurrency` importados desde `@/shared/i18n`. Rompiendo esta regla se rompe:
//   - AC-05 (audit surface: cero raw display fuera del componente).
//   - AC-03 (desambiguación USD-en).
//   - A11Y (aria-label con nombre completo de la moneda).
//
// Si una nueva superficie requiere formateo de moneda con opciones especiales (por ejemplo
// `maximumFractionDigits: 0` para vistas IA), usa `<Money formatOptions={...} />` o llama a
// `formatCurrency(..., opts)`; ambos preservan la política del componente.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(__dirname, '../../../..', 'src');

// Rutas que NO deben rastrearse: la propia definición del helper y las suites de tests
// (que sí necesitan referenciar `Intl.NumberFormat` como sujeto de aserción).
const ALLOWED_PATH_PREFIXES = [
  path.join(SRC_ROOT, 'shared', 'i18n', 'format.ts'),
  path.join(SRC_ROOT, 'tests'),
];

// Patrones que indican formateo directo de moneda fuera del helper.
const FORBIDDEN_PATTERNS: RegExp[] = [
  /new\s+Intl\.NumberFormat\s*\([^)]*\)[\s\S]{0,200}?style\s*:\s*['"]currency['"]/,
  /Intl\.NumberFormat\s*\([^)]*\)[\s\S]{0,200}?style\s*:\s*['"]currency['"]/,
  /\.toLocaleString\s*\([^)]*style\s*:\s*['"]currency['"]/,
];

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      // Skip node_modules por si aparece dentro (no debería en src/).
      if (entry === 'node_modules') continue;
      walk(p, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.d\.ts$/.test(entry)) {
      out.push(p);
    }
  }
}

function isAllowed(filePath: string): boolean {
  return ALLOWED_PATH_PREFIXES.some((prefix) => filePath === prefix || filePath.startsWith(prefix + path.sep));
}

describe('QA-004 audit — no raw currency formatting outside @/shared/i18n', () => {
  it('ningún archivo bajo src/ formatea moneda directamente con Intl fuera del helper', () => {
    const files: string[] = [];
    walk(SRC_ROOT, files);

    const offenders: string[] = [];
    for (const file of files) {
      if (isAllowed(file)) continue;
      const content = readFileSync(file, 'utf8');
      for (const rx of FORBIDDEN_PATTERNS) {
        if (rx.test(content)) {
          offenders.push(path.relative(SRC_ROOT, file));
          break;
        }
      }
    }

    if (offenders.length > 0) {
      const msg = [
        'Se encontraron surfaces que formatean moneda fuera de @/shared/i18n:',
        ...offenders.map((f) => `  - src/${f}`),
        '',
        'Usa el componente <Money> o el helper `formatCurrency` de @/shared/i18n.',
      ].join('\n');
      throw new Error(msg);
    }

    expect(offenders).toEqual([]);
  });
});
