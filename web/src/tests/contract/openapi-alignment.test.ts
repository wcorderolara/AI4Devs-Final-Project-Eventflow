// US-127 · PB-P2-015 · QA-003 · AC-04
// Integración best-effort con el snapshot OpenAPI (PB-P0-005 / US-098).
//
// Modo primario: si `backend/openapi.json` existe, cada endpoint clave DEBE
// estar documentado allí con la respuesta esperada. Si el snapshot documenta
// un endpoint clave con un código distinto, es drift entre contrato real y
// KEY_ENDPOINTS — la suite falla ruidosamente para forzar el reajuste.
//
// Modo fallback (EC-01): si el snapshot no existe (dependency PB-P0-005 no
// entregada), el test hace `skipIf` y deja un `console.info` para trazabilidad
// — la suite se apoya en los esquemas Zod compartidos como fuente. Ver
// `web/src/tests/contract/README.md` para la política best-effort.

import { describe, expect, it } from 'vitest';
import { KEY_ENDPOINTS } from './schemas';
import { isOperationDocumented, loadOpenApiSnapshot } from './openapi-source';

const snapshot = loadOpenApiSnapshot();

describe('US-127 · contract · OpenAPI best-effort', () => {
  it.skipIf(!snapshot.available)(
    'snapshot disponible: cada endpoint clave está documentado con su status esperado',
    () => {
      if (!snapshot.available) return; // narrow para TS.

      const missing: string[] = [];
      for (const endpoint of KEY_ENDPOINTS) {
        if (endpoint.openApiExempt) continue; // Excepción explícita ADR-API-004.
        const documented = isOperationDocumented(
          snapshot,
          endpoint.method,
          endpoint.path,
          endpoint.successStatus,
        );
        if (!documented) {
          missing.push(
            `${endpoint.method} ${endpoint.path} → ${endpoint.successStatus}`,
          );
        }
      }
      expect(
        missing,
        `Endpoints clave NO documentados en ${snapshot.path}: ${missing.join(' | ')}`,
      ).toEqual([]);
    },
  );

  it.skipIf(snapshot.available)(
    'snapshot ausente: fallback documentado, la suite sigue verde',
    () => {
      if (snapshot.available) return;
      // eslint-disable-next-line no-console
      console.info(
        `[US-127 · QA-003] OpenAPI snapshot ausente (${snapshot.reason}). ` +
          'Fallback a esquemas Zod compartidos — modo best-effort documentado en ' +
          'web/src/tests/contract/README.md.',
      );
      expect(snapshot.available).toBe(false);
    },
  );
});
