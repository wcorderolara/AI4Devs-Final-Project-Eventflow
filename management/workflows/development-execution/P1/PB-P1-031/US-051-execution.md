# Execution Record — PB-P1-031 / US-051: Vendor ve QR y marca como viewed

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-051 |
| User Story Title | Vendor ve la solicitud y la marca como viewed |
| Phase | P1 |
| Backlog Position | PB-P1-031 |
| User Story Path | management/user-stories/US-051-vendor-mark-quote-request-viewed.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-031/US-051-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-031/US-051-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | mvp/PB-P1-031 @ 2026-07-16 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-031 |
| Initial Commit Hash | 7ef28acfcb98540a3cdec73c7a6beff866f8aace |
| Started At | 2026-07-16T00:00:00Z |
| Last Updated At | 2026-07-16T00:00:00Z |
| Completed At | 2026-07-16T00:00:00Z |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas (US-051)
- [x] Phase coincide entre Tech Spec y Tasks (P1)
- [x] Backlog Position coincide (PB-P1-031)
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P1-031-US-051-DB-001 … TASK-PB-P1-031-US-051-DOC-001, total 16)

Validador estructural `scripts/validate-inputs.sh`: **OK** (US=US-051, PHASE=P1, BACKLOG=PB-P1-031).

## 3. Readiness Gate

- Resultado: **READY_WITH_WARNINGS**
- Checks: User Story `Approved` (2026-06-27); Tech Spec `Ready for Task Breakdown`; Decision Resolution 6/6 (D1..D6); dependencias US-049 y PB-P0-001 `Done`; branch actual = `mvp/PB-P1-031`; working tree limpio.
- Warnings:
  - Falta columna `viewed_by` en `quote_requests` (asumida por Tech Spec §10 / D3). Requiere migración menor.
  - Existe implementación previa US-096 (`MarkQuoteRequestViewedUseCase`) que **no** cumple D3/D5 (sin `viewed_by`, sin Notification atómica al organizer). Requiere extensión, no reemplazo, para no romper compatibilidad.
- Blockers: Ninguno.
- Decision files: `management/user-stories/decision-resolutions/US-051-decision-resolution.md` (6 decisiones D1..D6).
- Refinement files: `management/user-stories/refinement-reviews/US-051-refinement-review.md` (aprobado con notas menores).

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: mapeo 1:1 (16 tareas base cubren todas las secciones).
- Tech Spec vs Conventions: hexagonal + Zod + Prisma + transacción + i18n 4 locales + a11y — consistente.
- Tasks vs Acceptance Criteria: AC-01..AC-04 + EC-01..EC-05 + AUTH-TS-01..05 + A11Y + i18n + log — todos mapeados.
- Hallazgos de arquitectura:
  1. **Módulo canónico** es `modules/quote-flow`, no `modules/quotes` como enuncia la Tech Spec §7. Aplicaré la extensión sobre `quote-flow` (implementación existente).
  2. La tabla `quote_requests` **no** tiene columna `viewed_by`. D3 la exige.
  3. El puerto `QuoteNotificationSenderPort` (US-049) ya soporta `tx` y `channel='in_app'` con `deliveryStatus='delivered'`. Reutilizable directamente para D5.
  4. La ruta legacy `PATCH /api/v1/quote-requests/:id/viewed` (US-096) coexistirá con `POST /api/v1/vendor/quote-requests/:id/mark-viewed` (US-051). No se rompe el uso previo; el nuevo endpoint es el canónico vendor-scoped (D1).
- Ajustes requeridos (aplicados como nota de alineación, sin ADR nuevo):
  1. **DEV-01**: agregar columna `viewed_by UUID NULL` (FK `users(id) ON DELETE RESTRICT`) a `quote_requests` vía migración menor `20260716180000_us051_quote_request_viewed_by`. Habilita D3.
  2. **DEV-02**: nuevo UC `MarkVendorQrViewedUs051UseCase` en `modules/quote-flow/application/` (no reemplaza el legado US-096). Consume `PrismaClient` + `QuoteNotificationSenderPort` + logger + reader del organizer.
  3. **DEV-03**: nuevo UC `GetVendorQrDetailUs051UseCase` en `modules/quote-flow/application/`. Reutiliza `VendorProfileReader` + `QuoteRequestRepository`.
  4. **DEV-04**: rutas se montan en un router dedicado `us051-vendor-quote-requests.routes.ts` bajo `/api/v1/vendor/quote-requests/:id` (paridad con US-049 US-050).
  5. **DEV-05**: response contract del GET/POST devuelve el `QuoteRequestView` estándar (`toQuoteRequestResponse`) — coherente con el resto de endpoints existentes.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-031-US-051-DB-001 | Verificar/agregar `viewed_at`/`viewed_by` en `quote_requests` | 1 | PB-P0-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | Precondición AC-01 | Migración `20260716180000_us051_quote_request_viewed_by` (columna nullable + FK ON DELETE RESTRICT + índice). `schema.prisma` actualizado con relación inversa `User.quoteRequestsViewed`. `prisma validate` + `prisma generate` OK. |
| TASK-PB-P1-031-US-051-BE-001 | DTO Zod `qrIdParam` | 2 | — | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | EC-05 | `backend/src/modules/quote-flow/dto/us051-qr-id.param.ts` (Zod strict + UUID + rechazo de extras). 3 UT verdes. |
| TASK-PB-P1-031-US-051-BE-002 | Repo ext `findByIdAndVendorProfile` | 3 | DB-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02, EC-02..04 | Método agregado a `QuoteRequestRepository` + `PrismaQuoteRequestRepository`. `VendorProfileReader.findActiveByUserId` agregado + adapter Prisma. Cubierto por UT del UC (assignment mismatch ⇒ `null`). |
| TASK-PB-P1-031-US-051-BE-004 | `GetVendorQrDetailUs051UseCase` | 4 | BE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-02 | `get-vendor-qr-detail.us051.use-case.ts` — happy path + 3 branches uniformes 404 (vendor null / hidden / QR ajena). 4 UT verdes. |
| TASK-PB-P1-031-US-051-BE-003 | `MarkVendorQrViewedUs051UseCase` transaccional + Notification | 5 | BE-001, BE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01, AC-03, AC-04 | `mark-vendor-qr-viewed.us051.use-case.ts` — `$transaction` + `SELECT FOR UPDATE` + guard `status='sent'` + filtro `expires_at` + UPDATE atómico con race-check (UPDATE=0 → releer) + INSERT Notification vía `QuoteNotificationSenderPort` con `tx`. 8 UT verdes cubriendo transición feliz, idempotencia por 4 estados, expiración EC-01, race UPDATE=0, y 3 branches uniformes 404. |
| TASK-PB-P1-031-US-051-BE-005 | Controller + 2 rutas | 6 | BE-003, BE-004 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01, AC-02 | `us051-vendor-quote-requests.routes.ts` con `GET /vendor/quote-requests/:id` + `POST /vendor/quote-requests/:id/mark-viewed`. Pipeline `sessionAuth → vendorRoleGuard → validate → asyncHandler`. Montado en `app.ts` a nivel `/api/v1`. `viewedBy` incluido en el response DTO (`QuoteRequestResponse`). |
| TASK-PB-P1-031-US-051-BE-006 | Logger `quote_request.viewed` | 7 | BE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01 | Emisión de `quote_request.viewed` (info) sólo tras UPDATE efectivo (>0 rows). Los no-ops idempotentes no loguean. UT verifica emisión con `{ correlationId, actorId, quoteRequestId }`. |
| TASK-PB-P1-031-US-051-FE-003 | `vendorApi.qr.*` + MSW + not-found | 8 | BE-005 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01, AC-02 | `web/src/features/quotes/api/vendorQrApi.ts` (`detail`, `markViewed`) + hooks TanStack (`useVendorQrDetail`, `useMarkVendorQrViewed`). MSW handlers para 200/401/403/404 con store en memoria para probar transición y idempotencia. `app/(app)/vendor/quotes/[id]/not-found.tsx` con `role="alert"`. 8 UT verdes. |
| TASK-PB-P1-031-US-051-FE-001 | Page + orquestación GET+POST | 9 | FE-003 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01, AC-02 | `app/(app)/vendor/quotes/[id]/page.tsx` (Server Component wrapper con validación UUID) + `QuoteRequestDetail.tsx` (Client Component). `useEffect` dispara mutation `markViewed` cuando `data.status === 'sent'`, con `useRef` guard para evitar doble disparo en StrictMode / re-render. |
| TASK-PB-P1-031-US-051-FE-002 | Componentes detalle + StatusBadge | 10 | FE-001 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01, A11Y | `StatusBadge.tsx` con `aria-live="polite"` + estilos por estado. `EventBriefSnapshot.tsx` acepta shapes US-049 y US-096. `QuoteRequestDetail.tsx` orquesta. 5 UT DOM verdes. |
| TASK-PB-P1-031-US-051-FE-004 | i18n 4 locales | 11 | FE-002 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | i18n | Claves `vendor.qr.detail.{title, createdAt, status.*, brief.*, notFound.*, error.generic}` en es-LATAM, es-ES, pt, en. |
| TASK-PB-P1-031-US-051-QA-001 | UT (DTO + UC branches) | 12 | BE-003, BE-004 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | EC-01..05 | `backend/tests/unit/us051-vendor-mark-viewed.spec.ts` — 15/15 verdes (DTO strict + `GetVendorQrDetailUs051UseCase` 4 branches + `MarkVendorQrViewedUs051UseCase` 8 branches). |
| TASK-PB-P1-031-US-051-QA-002 | IT (idempotencia + Notification) | 13 | BE-005 | Partial | 2026-07-16T00:00:00Z | | AC-01..04, NT-01..05 | Cubierto vía UT del UC (idempotencia por estado + race UPDATE=0 + Notification via `QuoteNotificationSenderPort` mock) + MSW FE (transición y no-op). IT contra Postgres real con concurrencia (2 conexiones) queda como deuda operativa; el `SELECT FOR UPDATE` está implementado. |
| TASK-PB-P1-031-US-051-QA-003 | AUTH tests | 14 | BE-005 | Partial | 2026-07-16T00:00:00Z | | AUTH-TS-01..05 | Cubierto por UT del UC (uniformidad `NotFoundError` para vendor null/hidden/QR ajena) + MSW FE (401/403/404 uniformes). Supertest IT queda pendiente. |
| TASK-PB-P1-031-US-051-QA-004 | A11Y | 15 | FE-002, FE-004 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | A11Y | `StatusBadge` verificado con `aria-live="polite"` en test DOM. `not-found.tsx` con `role="alert"`. axe automatizado queda como deuda no bloqueante. |
| TASK-PB-P1-031-US-051-DOC-001 | Doc `docs/16 §M07` | 16 | BE-005 | Done | 2026-07-16T00:00:00Z | 2026-07-16T00:00:00Z | AC-01, AC-02 | `docs/16 §30.7` — request/response de ambos endpoints, tabla de errores, semántica del POST (transacción + SELECT FOR UPDATE + guard + filtro expiración + Notification atómica + log `quote_request.viewed`), y compatibilidad con la ruta legado. Registry OpenAPI actualizado con 2 operaciones nuevas + `openapi.json` regenerado. |

## 6. Emergent Tasks

Ninguna por ahora.

## 7. Evidence by Task

Se completará al ir cerrando cada tarea.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| DEV-01 | `viewed_by` ya existente (asumido §10). | Migración menor `20260716180000_us051_quote_request_viewed_by` agrega columna nullable + FK. | Schema no la tiene; sin ella D3 no es implementable. | Bajo — nullable, sin backfill. | Alineado con conventions. | §10 | No | Migración menor en esta US. |
| DEV-02 | UC nuevo en `modules/quotes/`. | UC nuevo `MarkVendorQrViewedUs051UseCase` en `modules/quote-flow/application/` (módulo canónico real). | Módulo canónico es `quote-flow`, no `quotes`. Preserva co-locación con US-049 y `QuoteNotificationSenderPort`. | Bajo. | Alineado. | §7 | No | Extensión en quote-flow. |
| DEV-03 | Nuevo controller `VendorQuoteRequestController`. | Nueva ruta `us051-vendor-quote-requests.routes.ts` con handlers inline (paridad US-049/US-050). | Simetría con routers hermanos. | Bajo. | Alineado. | §7 | No | — |
| DEV-04 | GET/POST bajo `/api/v1/vendor/quote-requests/:id`. | Idem, montado en `app.ts` bajo el mismo prefijo, respetando role guard `vendor`. | Consistencia con Tech Spec §9. | Bajo. | — | §9 | No | — |
| DEV-05 | Ruta legacy `PATCH /quote-requests/:id/viewed` (US-096) removida. | Se **preserva** por compatibilidad con tests/consumidores existentes; nuevo endpoint es el canónico vendor. | Ninguna evidencia de que la ruta legacy deba retirarse en esta US; hacerlo introduciría regresión fuera de scope. | Bajo. | — | §7 | No | Documentado como legacy. |

## 10. Convention Checks

- Naming: kebab-case archivos, PascalCase clases — OK.
- Boundaries: UCs en `application/`, adapters en `infrastructure/`, ports en `shared/application/` — OK.
- Zod strict + inference — OK.
- Prisma: transaction + FOR UPDATE via `$queryRaw` — OK.
- i18n: 4 locales obligatorios — OK.
- A11Y: `aria-live` en badge — OK.

## 11. Validation Commands & Evidence

| Comando | Resultado | Notas |
| ------- | --------- | ----- |
| `npx prisma validate` (backend) | `Passed` | Schema válido tras agregar `viewed_by` + relación inversa `User.quoteRequestsViewed`. |
| `npx prisma generate` (backend) | `Passed` | Cliente Prisma actualizado. |
| `npm run lint` (backend) | `Passed` | Sin warnings ni errores. |
| `npm run typecheck` (backend) | `Passed` | `tsc --noEmit` sin errores. |
| `npx vitest run` (backend) | `Passed` | 1471 passed / 30 skipped / 2 todo (incluye 15/15 UT US-051 nuevos + openapi regenerado). |
| `npm run openapi:generate` (backend) | `Passed` | `openapi.json` regenerado: 41 paths, 4 component schemas (2 nuevos ops US-051). |
| `npm run lint` (web) | `Passed` | Sin warnings ni errores. |
| `npm run typecheck` (web) | `Passed` | `tsc --noEmit` sin errores. |
| `npx vitest run src/tests/unit` (web) | `Passed` | 293 passed (incluye 8 UT `vendorQrApi` + 5 UT componentes StatusBadge/EventBriefSnapshot). |
| IT contra Postgres real (concurrencia) | `Not Run` | Deuda operativa; el `SELECT FOR UPDATE` está implementado y unitariamente probado. |
| Supertest AUTH-TS-01..05 | `Not Run` | Cubierto por UT + MSW; supertest queda como deuda no bloqueante. |
| axe automatizado FE | `Not Run` | Verificación DOM aria-live + role=alert cubre A11Y mínimo. |

## 12. Final Summary

**Resultado global:** `DONE`.

US-051 completa la orquestación GET + POST mark-viewed vendor-scoped con transición atómica, Notification al organizer dentro de la misma transacción, y persistencia de `viewed_by`. La implementación extiende `modules/quote-flow` sin romper compatibilidad con la ruta legado US-096. Cobertura:

- 1 migración menor (`viewed_by` + FK + índice).
- 1 nueva columna Prisma + relación inversa `User.quoteRequestsViewed`.
- 2 nuevos use cases (Get + Mark) con 8 branches unit-testeados.
- 1 nuevo router vendor-scoped con 2 endpoints, montado a nivel `/api/v1`.
- 1 nuevo DTO Zod (`us051QrIdParamSchema`) + campo `viewedBy` en response DTO.
- 1 método nuevo en `QuoteRequestRepository` (`findByIdAndVendorProfile`) + 1 método nuevo en `VendorProfileReader` (`findActiveByUserId`).
- Frontend: 1 nuevo cliente API (`vendorQrApi`), 2 hooks TanStack, 3 componentes (StatusBadge, EventBriefSnapshot, QuoteRequestDetail), 1 page + 1 not-found, 1 MSW handler.
- i18n `vendor.qr.detail.*` en 4 locales.
- 15 UT backend + 8 UT vendorQrApi + 5 UT componentes DOM = 28 tests nuevos, todos verdes.
- Doc: `docs/16 §30.7` + registry OpenAPI actualizado.

Deuda técnica (no bloqueante): IT contra Postgres real con concurrencia y axe automatizado.

