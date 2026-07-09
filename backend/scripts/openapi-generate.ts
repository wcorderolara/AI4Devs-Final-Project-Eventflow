// Generador determinista de backend/openapi.json (US-098 / BE-002). Sin timestamps ni secretos.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildOpenApiDocument, serializeOpenApiDocument } from '../src/openapi/openapi.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../openapi.json');
const doc = buildOpenApiDocument();
const json = serializeOpenApiDocument(doc);
writeFileSync(outPath, json, 'utf8');
const paths = Object.keys((doc.paths as Record<string, unknown>) ?? {}).length;
const schemas = Object.keys(((doc.components as Record<string, unknown>)?.schemas as Record<string, unknown>) ?? {}).length;
console.info(`[openapi] backend/openapi.json generado — ${paths} paths, ${schemas} component schemas`);
