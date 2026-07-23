// US-127 · PB-P2-015 · QA-003 · AC-04
// Cargador best-effort del snapshot OpenAPI del backend (US-098). Si existe
// `backend/openapi.json`, se usa como fuente de verdad de contrato para
// verificar que la lista `KEY_ENDPOINTS` está documentada allí; si no existe
// (dependency PB-P0-005 no entregada aún), la suite hace fallback a esquemas
// Zod compartidos SIN bloquear (EC-01 · docs/16-alignment §16).
//
// El módulo NO carga TypeScript-remoto, NO habla con la red y NO añade
// dependencias — usa `fs` con `node:` scheme para dejar claro que el import
// solo funciona bajo el entorno Node de Vitest (correcto: los contract tests
// corren en jsdom pero Node APIs están disponibles vía Vite).

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Punto de anclaje: `web/src/tests/contract/openapi-source.ts` → repo root =
// tres niveles arriba de `web/`.
const OPENAPI_SNAPSHOT_PATH = resolve(process.cwd(), '..', 'backend', 'openapi.json');

interface OpenApiPathItem {
  readonly [method: string]:
    | {
        readonly responses?: Record<string, unknown>;
      }
    | undefined;
}

interface OpenApiDocument {
  readonly openapi?: string;
  readonly info?: { readonly title?: string; readonly version?: string };
  readonly paths?: Record<string, OpenApiPathItem>;
}

export interface OpenApiSnapshot {
  readonly available: true;
  readonly document: OpenApiDocument;
  readonly path: string;
}

export interface OpenApiUnavailable {
  readonly available: false;
  readonly reason: string;
  readonly path: string;
}

/**
 * Carga el snapshot OpenAPI si está disponible. Nunca lanza — si el archivo
 * no existe o es inválido, devuelve `{ available: false, reason }` para que
 * los tests puedan hacer `test.skipIf(!snapshot.available)` sin ruido.
 */
export function loadOpenApiSnapshot(): OpenApiSnapshot | OpenApiUnavailable {
  if (!existsSync(OPENAPI_SNAPSHOT_PATH)) {
    return {
      available: false,
      reason: `Snapshot no encontrado en ${OPENAPI_SNAPSHOT_PATH}`,
      path: OPENAPI_SNAPSHOT_PATH,
    };
  }
  try {
    const raw = readFileSync(OPENAPI_SNAPSHOT_PATH, 'utf8');
    const parsed = JSON.parse(raw) as OpenApiDocument;
    if (!parsed?.paths || typeof parsed.paths !== 'object') {
      return {
        available: false,
        reason: 'Documento OpenAPI sin sección `paths`',
        path: OPENAPI_SNAPSHOT_PATH,
      };
    }
    return { available: true, document: parsed, path: OPENAPI_SNAPSHOT_PATH };
  } catch (error) {
    return {
      available: false,
      reason: `No se pudo parsear el snapshot: ${(error as Error).message}`,
      path: OPENAPI_SNAPSHOT_PATH,
    };
  }
}

/**
 * ¿La operación `<method> <path>` está documentada en el snapshot con la
 * respuesta esperada? Compara case-insensitive para el método y exige que el
 * status esperado esté en `responses[<code>]`.
 */
export function isOperationDocumented(
  snapshot: OpenApiSnapshot,
  method: string,
  path: string,
  expectedStatus: number,
): boolean {
  const pathItem = snapshot.document.paths?.[path];
  if (!pathItem) return false;
  const operation = pathItem[method.toLowerCase()];
  if (!operation) return false;
  return Boolean(operation.responses?.[String(expectedStatus)]);
}
