# Suite de contract tests — US-127 · PB-P2-015

Frontend contract tests (MSW + Zod) alineados al contrato real de la API
del backend. Cubren los Acceptance Criteria AC-01..AC-05 de US-127 y
complementan a US-126 (backend unit + integration) protegiendo el
contrato frontend↔backend antes de E2E (PB-P2-016).

## TL;DR

```bash
npm run test:contract   # Solo suite de contract.
npm test                # Full suite (incluye contract).
```

Ambos comandos ejecutan la suite localmente. En CI, el job `test-frontend`
de `.github/workflows/pr.yml` corre `npm test` y bloquea el merge si algún
test de contrato falla (AC-05).

## Estructura

```
web/src/tests/contract/
├── README.md                       (este archivo · DOC-001)
├── schemas.ts                      (FE-001 · Zod schemas compartidos + KEY_ENDPOINTS)
├── openapi-source.ts               (QA-003 · loader best-effort de backend/openapi.json)
├── endpoints.test.ts               (QA-001 · validación de forma vía Zod)
├── drift.test.ts                   (QA-002 · detección de drift · NT-01/NT-02)
├── openapi-alignment.test.ts       (QA-003 · integración OpenAPI best-effort)
├── determinism.test.ts             (QA-004 · sin red real, reset entre tests)
└── authorization-errors.test.ts    (SEC-001 · contratos 401/403 · SEC-04)
```

Los handlers MSW viven en `web/src/tests/msw/handlers/**` y se comparten
con las suites unit/integration. El server MSW se levanta globalmente en
`web/vitest.setup.ts` con `onUnhandledRequest: 'error'` — las requests no
manejadas caen en el catch-all `web/src/tests/msw/handlers/index.ts` que
devuelve HTTP 501 `NOT_MOCKED`.

## Endpoints clave cubiertos

La lista canónica está en `schemas.ts:KEY_ENDPOINTS` y es la fuente única
que consumen todos los tests. Cualquier cambio a un endpoint clave debe
actualizar esta lista + su schema en el mismo commit.

| Método | Endpoint                                | 2xx | Notas de contrato                                                             |
| ------ | --------------------------------------- | --- | ----------------------------------------------------------------------------- |
| GET    | `/api/v1/health`                        | 200 | DTO plano (`status`, `version`, `uptimeMs`, `timestamp`) — excepción ADR-API-004. Fuera del snapshot OpenAPI por diseño. |
| GET    | `/api/v1/users/me`                      | 200 | Envelope `{ data: AuthUser, meta }`. Default handler MSW = 401 anónimo — el shape del 200 se cubre con override MSW en `endpoints.test.ts`. |
| POST   | `/api/v1/auth/register`                 | 201 | Envelope `{ data: AuthUser, meta }`. Docs/16 §Auth · US-001.                     |
| POST   | `/api/v1/auth/login`                    | 200 | Envelope `{ data: AuthUser, meta }`. Docs/16 §Auth · US-003.                     |
| POST   | `/api/v1/auth/logout`                   | 204 | Sin body. Docs/16 §Auth · US-005.                                                |
| POST   | `/api/v1/auth/password/reset-request`   | 202 | Envelope `{ data: { message }, meta }` — respuesta genérica anti-enumeración · US-004. |
| POST   | `/api/v1/auth/password/reset`           | 204 | Sin body. Docs/16 §Auth · US-004.                                                |

Además, todos los tests de contrato validan la forma canónica del envelope
de error `{ error: { code, message, correlationId?, details? } }` para 401
(anónimo), 403 (denegado) y 422 (validación) — cubierto en
`authorization-errors.test.ts` (SEC-001).

Los endpoints clave se seleccionaron por:

1. **Superficie de riesgo real**: el auth flow es la primera integración
   frontend↔backend en cualquier login/registro; drift silencioso aquí
   rompe todo el resto.
2. **Cobertura de los tres shapes principales**: envelope `{ data, meta }`
   (register/login/users-me/reset-request), envelope de error `{ error }`
   (SEC-001) y DTO plano exempto (health · ADR-API-004).
3. **Estabilidad del contrato**: no crecen ni cambian con features
   nuevas — probarlos aquí es alto valor / bajo mantenimiento.

Los endpoints CRUD de negocio (events, vendors, quotes, notifications,
etc.) tienen handlers MSW propios y son ejercitados indirectamente por
las suites unit/integration — este documento no los enumera para
mantener la lista clave pequeña y estable.

## Fuente de contrato (AC-04)

**Modo primario — snapshot OpenAPI** (`backend/openapi.json`, US-098):

- Cuando existe, `openapi-alignment.test.ts` valida que cada endpoint
  clave está documentado allí con el status esperado. Si el snapshot
  documenta un endpoint clave con un código distinto (o no lo documenta
  en absoluto), la suite falla con un mensaje que enumera los endpoints
  no documentados.
- Excepción: los endpoints marcados `openApiExempt: true` en `KEY_ENDPOINTS`
  (hoy `/health`) están fuera del snapshot por decisión explícita
  documentada en ADR-API-004 y docs/16 §21.3. La suite los omite del
  chequeo OpenAPI para no marcar drift falso positivo.

**Modo fallback — esquemas Zod compartidos** (EC-01):

- Si `backend/openapi.json` no existe (dependency PB-P0-005 no entregada
  aún), `openapi-alignment.test.ts` hace `skipIf` sobre la validación
  primaria, emite un `console.info` para trazabilidad y la suite sigue
  verde apoyándose únicamente en los schemas Zod de `schemas.ts` como
  fuente de contrato. La documentación del modo best-effort está en la
  descripción de US-127 (`management/user-stories/US-127-contract-tests-with-msw.md`).

## Cómo agregar un endpoint clave

1. Definir su schema Zod en `schemas.ts` (envelope + shape del `data` o
   error).
2. Agregar la entrada a `KEY_ENDPOINTS` con `method`, `path`,
   `successStatus`, `successSchema` (o `null` si es 204) y `errorStatuses`.
3. Si el endpoint tiene default handler diferente al éxito (ej.
   `/users/me` responde 401 por defecto), agregar override en
   `endpoints.test.ts:applySuccessOverride`.
4. Verificar que el handler MSW en `web/src/tests/msw/handlers/**` refleja
   la forma del contrato real (AC-01). Si no, sincronizarlo — sin ocultar
   contratos de error (SEC-04).
5. Correr `npm run test:contract` y confirmar verde.

## Determinismo (AC-05)

- MSW en memoria (`msw/node.setupServer` en `web/src/tests/msw/server.ts`).
  Nunca sale a la red.
- `onUnhandledRequest: 'error'` activo (`web/vitest.setup.ts`) — cualquier
  request `/api/v1/*` sin handler dedicado cae en el catch-all 501
  `NOT_MOCKED`, capturado por `determinism.test.ts`.
- `afterEach → server.resetHandlers()` garantiza que overrides con
  `server.use()` no filtran entre tests. Verificado con el par de tests
  "aislamiento" en `determinism.test.ts`.
- Suite estable en corridas repetidas: 21 tests + 1 skipped (branch de
  fallback OpenAPI) — 100% determinístico bajo Vitest 4.1.

## Referencias

- User Story: `management/user-stories/US-127-contract-tests-with-msw.md`
- Tech Spec: `management/technical-specs/P2/PB-P2-015/US-127-technical-spec.md`
- Development Tasks: `management/development-tasks/P2/PB-P2-015/US-127-development-tasks.md`
- Execution Record: `management/workflows/development-execution/P2/PB-P2-015/US-127-execution.md`
- Docs 16 §13, §21 (API design), Docs 20 §6.4 (contract tests), ADR-TEST-001, ADR-API-004.
