// Validación estructural OpenAPI 3.x (US-098 / QA-003). Valida backend/openapi.json con
// swagger-parser (equivalente a redocly lint, offline). Falla con exit != 0 si es inválido.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import SwaggerParser from '@apidevtools/swagger-parser';

const here = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(here, '../openapi.json');

async function main(): Promise<void> {
  const doc = JSON.parse(readFileSync(specPath, 'utf8')) as Record<string, unknown>;
  await SwaggerParser.validate(structuredClone(doc));
  const paths = Object.keys((doc.paths as Record<string, unknown>) ?? {}).length;
  console.info(`[openapi] lint OK — OpenAPI ${String((doc as { openapi?: string }).openapi)} válido, ${paths} paths`);
}
main().catch((err: unknown) => {
  console.error('[openapi] lint FAILED:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
