// Drift gate (US-098 / QA-003, OPS-001). Regenera el spec desde código y lo compara contra el
// backend/openapi.json versionado. Falla con instrucción clara si difieren (AC-03, EC-02).
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { buildOpenApiDocument, serializeOpenApiDocument } from '../src/openapi/openapi.js';

const here = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(here, '../openapi.json');

const generated = serializeOpenApiDocument(buildOpenApiDocument());
let committed = '';
try {
  committed = readFileSync(specPath, 'utf8');
} catch {
  console.error('[openapi] backend/openapi.json no existe. Ejecuta: npm run openapi:generate');
  process.exit(1);
}

if (generated !== committed) {
  console.error('[openapi] DRIFT: backend/openapi.json difiere del contrato generado desde código.');
  console.error('[openapi] Si el cambio es intencional: npm run openapi:generate && git add backend/openapi.json');
  process.exit(1);
}
console.info('[openapi] check OK — snapshot sincronizado con el código, sin drift');
