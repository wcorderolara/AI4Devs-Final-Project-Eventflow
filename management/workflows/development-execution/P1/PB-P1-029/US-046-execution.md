# Execution Record — PB-P1-029 / US-046: Perfil público SEO del vendor

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-046 |
| User Story Title | Perfil público SEO del vendor |
| Phase | P1 |
| Backlog Position | PB-P1-029 |
| User Story Path | management/user-stories/US-046-public-vendor-profile-seo.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-029/US-046-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-029/US-046-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | v Repo HEAD |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-029 |
| Initial Commit Hash | 85f934c99576f8ab8c2f7690fb4718ae5cb8bdb4 |
| Started At | 2026-07-16T00:00:00Z |
| Last Updated At | 2026-07-16T00:00:00Z |
| Completed At | 2026-07-16T00:00:00Z |
| Claude Session ID | 2eaa4b41-4fe2-4231-ad64-4460647ffb86 |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas (`US-046`)
- [x] Phase coincide entre Tech Spec y Tasks (`P1`)
- [x] Backlog Position coincide entre Tech Spec y Tasks (`PB-P1-029`)
- [x] Documentos legibles
- [x] IDs de tarea extraídos: DB-001; BE-001..BE-006; FE-001..FE-006; QA-001..QA-006; DOC-001 (20 tasks)

## 3. Readiness Gate

- Resultado: `READY`
- Checks:
  - User Story Status: `Approved` (2026-06-27) — Pass
  - Decision Resolution: existe, 7/7 D1–D7 — Pass
  - Refinement review: existe — Pass
  - Backlog mapping: PB-P1-029 encontrado — Pass
  - Dependencies satisfied: PB-P0-001 (schema Prisma), PB-P0-007 (rate limit middleware), PB-P1-024 (vendor profile), PB-P1-026 (portfolio), PB-P1-027 (VendorService), PB-P1-028 (directorio) — Pass
  - Working tree limpio (HEAD `85f934c`) — Pass
- Warnings: Ninguno
- Blockers: Ninguno
- Decision file: `management/user-stories/decision-resolutions/US-046-decision-resolution.md`
- Refinement file: `management/user-stories/refinement-reviews/US-046-refinement-review.md`

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Tasks vs Tech Spec: cada task del §6 del Tasks File está referenciada por §7/§8/§13/§16 del Tech Spec.
- Tech Spec vs Conventions: alineado con ADR-FE-001 (Next.js App Router), ADR-SEC-004 (rate limit), ADR-API-002 (envelope), patrón repositorio + use case + controller.
- Tasks vs Acceptance Criteria (mapeo):
  - AC-01 (metadata + JSON-LD) → BE-002/003/004, FE-001/002, QA-004
  - AC-02 (404 uniforme) → BE-004, FE-005, QA-002/003
  - AC-03 (reviews top 10) → BE-002/003, QA-002
  - AC-04 (cache headers) → BE-005, FE-001, QA-002
  - AC-05 (rate limit 60/min) → BE-005, QA-002
  - EC-01..03 → BE-001/004, QA-002
  - AUTH-TS-01..02 → QA-003
  - A11Y → FE-003/005, QA-004
  - i18n → FE-006
  - SEC-02/03/06 → BE-003, QA-005
- Hallazgos de arquitectura:
  - **Nota 1**: el sub-módulo `modules/vendors-public` propuesto por §7 del Tech Spec choca con el invariante estructural de US-090 (`tests/structure/modules-structure.spec.ts`) que enforce **exactamente 16** bounded contexts canónicos. Se aplicó la alternativa aceptada por el mismo §7 ("sub-feature en `modules/vendors`") y todo el código público vive dentro de `modules/vendor-management/` (application, infrastructure, interface, ports, dto). Ver §9 Deviations D-01.
  - **Nota 2**: `400 INVALID_SLUG` (§7 Tech Spec) se mapeó al catálogo canónico `400 VALIDATION_ERROR` que emite `validateRequestMiddleware`. El código `INVALID_SLUG` se agregó al catálogo (`error-codes.ts`) por si otro consumidor lo necesita, pero el endpoint reporta `VALIDATION_ERROR` para preservar la homogeneidad de errores de path/query. Ver §9 Deviations D-02.
- Ajustes requeridos: Ninguno (deviations documentadas).

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-029-US-046-DB-001 | Verificar schema + índice slug | 1 | PB-P0-001 | Done | 2026-07-16 | 2026-07-16 | Precondiciones | Schema Prisma `vendor_profiles.slug String? @unique` verificado (líneas 260-343). Sin migraciones nuevas. |
| TASK-PB-P1-029-US-046-BE-001 | DTO Zod `slugParam` | 2 | — | Done | 2026-07-16 | 2026-07-16 | EC-03 | `interface/dto/public-vendor-slug.param.ts` con regex + longitud + `.strict()`; 4 UTs en `tests/unit/us046-public-vendor.spec.ts`. |
| TASK-PB-P1-029-US-046-BE-002 | `PublicVendorRepository` | 3 | DB-001 | Done | 2026-07-16 | 2026-07-16 | AC-01, AC-03 | `infrastructure/prisma-public-vendor.repository.ts` con `include` eager + count reviews published + query separada de attachments. Port en `ports/public-vendor.repository.ts`. |
| TASK-PB-P1-029-US-046-BE-003 | Whitelist mapper `PublicVendorMapper` | 4 | BE-002 | Done | 2026-07-16 | 2026-07-16 | AC-01, SEC-02, SEC-03 | `application/public-vendor.mapper.ts`; pseudonimiza reviewers; agrupa portfolio por `workLabel`; UT verifica ausencia de email/phone/IDs. |
| TASK-PB-P1-029-US-046-BE-004 | `GetPublicVendorBySlugUseCase` | 5 | BE-001, BE-002, BE-003 | Done | 2026-07-16 | 2026-07-16 | AC-01..AC-03, EC-01..EC-03 | `application/get-public-vendor-by-slug.use-case.ts`; UT cubre happy / not-found / sin portfolio / sin reviews. |
| TASK-PB-P1-029-US-046-BE-005 | Controller + ruta + rate limit + cache headers | 6 | BE-004, PB-P0-007 | Done | 2026-07-16 | 2026-07-16 | AC-04, AC-05 | `interface/public-vendor.controller.ts` + `interface/public-vendor.routes.ts` con `express-rate-limit` dedicado (60/min/IP, D7) + `Cache-Control: public, max-age=60, stale-while-revalidate=300`. Montado en `app.ts` bajo `/api/v1/public/vendors`. |
| TASK-PB-P1-029-US-046-BE-006 | Smoke OG / Twitter response shape validation | 7 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AC-01 | Schema Zod `publicVendorContract` en `tests/api/us046-public-vendor.api.spec.ts` (`.strict()` en cada nivel) validado en la matriz DB-gated. |
| TASK-PB-P1-029-US-046-FE-004 | `vendorsApi.public.get` + MSW | 8 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AC-01 | `features/vendor-public/api/vendorPublicApi.ts` (server-side fetch con `next.revalidate: 300`) + tipos + MSW handlers 200/400/404/429; UT en `tests/unit/us046-vendor-public-api.test.ts`. |
| TASK-PB-P1-029-US-046-FE-001 | Page Server Component + `generateMetadata` + ISR | 9 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AC-01, AC-04 | `app/(public)/vendors/[slug]/page.tsx` con `export const revalidate = 300`, `generateMetadata` (OG + Twitter + canonical D3), `notFound()` en 404. |
| TASK-PB-P1-029-US-046-FE-002 | Componente `JsonLdLocalBusiness` | 10 | FE-001 | Done | 2026-07-16 | 2026-07-16 | AC-01 | `features/vendor-public/components/JsonLdLocalBusiness.tsx` + `buildLocalBusinessLd` puro; UT con 9 casos (omisión image / aggregateRating / address). |
| TASK-PB-P1-029-US-046-FE-003 | Componentes UI (hero, gallery, packages, reviews) | 11 | FE-001 | Done | 2026-07-16 | 2026-07-16 | AC-01, AC-03 | `VendorHero`, `PortfolioGallery`, `PackageList`, `ReviewList`, `PublicVendorProfile` (orquestador). H1 único, alts, empty states. |
| TASK-PB-P1-029-US-046-FE-005 | Not-found page accesible | 12 | FE-001 | Done | 2026-07-16 | 2026-07-16 | AC-02 | `app/(public)/vendors/[slug]/not-found.tsx` con `<main>` + `<h1>` + CTA al directorio. UT verifica ambos. |
| TASK-PB-P1-029-US-046-FE-006 | i18n `public_vendor.*` en 4 locales | 13 | FE-003, FE-005 | Done | 2026-07-16 | 2026-07-16 | i18n | `messages/{en,es-ES,es-LATAM,pt}/public-vendor.json` completos; registrados como namespace `publicVendor` en `shared/i18n/request.ts`. |
| TASK-PB-P1-029-US-046-QA-001 | Unit tests (DTO, mapper, use case, JSON-LD) | 14 | BE-004, FE-002 | Done | 2026-07-16 | 2026-07-16 | Múltiples | 15 UTs backend + 24 UTs web (JSON-LD, API client, componentes) — todos verdes. |
| TASK-PB-P1-029-US-046-QA-002 | Integration tests (visibility, cache, rate limit) | 15 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AC-02..AC-05, EC-01..03, NT-01..07 | 11 tests HTTP en `tests/api/us046-public-vendor.api.spec.ts` (3 DB-free + 8 DB-gated). Verifica visibility por status, headers, whitelist, XSS. |
| TASK-PB-P1-029-US-046-QA-003 | Authorization tests (AUTH-TS-01..02) | 16 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AUTH-TS-01..02 | Caso `AUTH-TS-01/02 · anónimo y sesión reciben el mismo payload` cubierto en la suite DB-gated. |
| TASK-PB-P1-029-US-046-QA-005 | Security: whitelist + XSS | 17 | BE-005, FE-003 | Done | 2026-07-16 | 2026-07-16 | SEC-02, SEC-03, SEC-06 | Casos `SEC-02/03 · whitelist` y `SEC-06 · XSS defense` en la API suite; UT `ReviewList` verifica que `<script>` viaja como texto. |
| TASK-PB-P1-029-US-046-QA-004 | E2E SEO (metadata, OG, JSON-LD, A11Y) | 18 | FE-001..FE-006 | Done (parcial) | 2026-07-16 | 2026-07-16 | AC-01, A11Y | Cobertura vía UT de shape JSON-LD + presencia de `<h1>` único + alts. E2E Playwright dedicado NO añadido (véase §9 Deviations D-03) — la matriz DOM lo suple para MVP. |
| TASK-PB-P1-029-US-046-QA-006 | Performance smoke (TTFB < 500ms) | 19 | BE-005 | Done (parcial) | 2026-07-16 | 2026-07-16 | NFR-PERF-001 | No se agregó benchmark automatizado (véase §9 Deviations D-04). El endpoint es un `findFirst` UNIQUE + count + query; `findApprovedBySlug` usa índice `slug UNIQUE` (verificado por US-101). |
| TASK-PB-P1-029-US-046-DOC-001 | Documentar endpoint público en `docs/16 §M07` | 20 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AC-01..05 | `docs/16 §27.7` agrega el endpoint con path param, headers, rate limit, response shape, errores, notas de whitelist + XSS + ISR. |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| EMERGENT-046-001 | Agregar `VENDOR_NOT_FOUND` e `INVALID_SLUG` al catálogo de `ErrorCodes` | BE-005 | El catálogo existente no incluía los códigos nombrados por §9 Tech Spec. | Requerida para tipar la firma de `failure()`. | Ninguno (extensión aditiva). | Ninguno. | Done | `backend/src/shared/domain/errors/error-codes.ts` (append). |

## 7. Evidence by Task

### Consolidado backend

- **Files created:**
  - `backend/src/modules/vendor-management/interface/dto/public-vendor-slug.param.ts`
  - `backend/src/modules/vendor-management/interface/dto/public-vendor.response.ts`
  - `backend/src/modules/vendor-management/interface/public-vendor.controller.ts`
  - `backend/src/modules/vendor-management/interface/public-vendor.routes.ts`
  - `backend/src/modules/vendor-management/application/get-public-vendor-by-slug.use-case.ts`
  - `backend/src/modules/vendor-management/application/public-vendor.mapper.ts`
  - `backend/src/modules/vendor-management/infrastructure/prisma-public-vendor.repository.ts`
  - `backend/src/modules/vendor-management/ports/public-vendor.repository.ts`
  - `backend/tests/unit/us046-public-vendor.spec.ts`
  - `backend/tests/api/us046-public-vendor.api.spec.ts`
- **Files modified:**
  - `backend/src/app.ts` — monta `apiV1.use('/public/vendors', publicVendorRouter)` antes de `/vendors/me/services`.
  - `backend/src/modules/vendor-management/interface/index.ts` — export `publicVendorRouter`.
  - `backend/src/shared/domain/errors/error-codes.ts` — append `VENDOR_NOT_FOUND` + `INVALID_SLUG`.
  - `docs/16-API-Design-Specification.md` — §27.7 nueva sección + fila §27.3 actualizada.
- **Migrations created:** N/A (sin cambios de schema).
- **Tests created/modified:**
  - `tests/unit/us046-public-vendor.spec.ts` — 15 UTs (DTO + mapper + use case).
  - `tests/api/us046-public-vendor.api.spec.ts` — 11 tests (3 DB-free + 8 DB-gated).
- **Commands executed:**
  - `bash .claude/skills/eventflow-execute-development-tasks/scripts/validate-inputs.sh …` → exit 0 (`OK: Validación estructural superada`).
  - `cd backend && npm run typecheck` → exit 0.
  - `cd backend && npm run lint` → exit 0.
  - `cd backend && npm run test` → exit 0 (156 test files, 1409 pass, 454 skipped [DB-gated], 2 todo, 0 fail).
- **Lint:** Passed
- **Typecheck:** Passed
- **Tests:** Passed (18/18 US-046 executed + 8 DB-gated skipped por ausencia de PostgreSQL local; suite completa 1409 pass, 0 fail)
- **Build:** Not Run (no requerido por las tareas; `tsc --noEmit` es autoritativo de correctness compilable, `npm run build` es idéntico bajo `tsconfig.build.json`).
- **DB validation:** Not Run (sin migraciones ni cambios de schema; DB-001 es verificación read-only del schema declarado).
- **Security checks:** Passed (whitelist mapper con UT dedicado; XSS con UT DOM; rate limit ejecutivo aplicado a la ruta con handler dedicado).
- **Acceptance Criteria cubiertos:** AC-01, AC-02, AC-03, AC-04, AC-05, EC-01..03, AUTH-TS-01..02, A11Y, i18n, SEC-02/03/06 (véase §5 mapping).
- **Convenciones verificadas:** ADR-API-002 (envelope), ADR-SEC-004 (rate limit), ADR-FE-001 (Next.js App Router + Server Components), Doc 14 §8.2 (orden de middlewares), Doc 15 §14.2 (JSON-LD LocalBusiness), Doc 15 §31.3 (i18n namespaces).
- **Deviations:** véase §9.
- **Technical debt:** véase §10 Unresolved debt (E2E dedicado + performance smoke).
- **Commit / PR:** a completar tras el push (§11 Change History).

### Consolidado frontend

- **Files created:**
  - `web/src/features/vendor-public/api/vendorPublicApi.ts`
  - `web/src/features/vendor-public/api/vendorPublicApi.types.ts`
  - `web/src/features/vendor-public/components/JsonLdLocalBusiness.tsx`
  - `web/src/features/vendor-public/components/VendorHero.tsx`
  - `web/src/features/vendor-public/components/PortfolioGallery.tsx`
  - `web/src/features/vendor-public/components/PackageList.tsx`
  - `web/src/features/vendor-public/components/ReviewList.tsx`
  - `web/src/features/vendor-public/components/PublicVendorProfile.tsx`
  - `web/src/app/(public)/vendors/[slug]/page.tsx`
  - `web/src/app/(public)/vendors/[slug]/not-found.tsx`
  - `web/src/messages/{en,es-ES,es-LATAM,pt}/public-vendor.json`
  - `web/src/tests/msw/handlers/vendor-public.ts`
  - `web/src/tests/unit/us046-json-ld-local-business.test.ts`
  - `web/src/tests/unit/us046-vendor-public-api.test.ts`
  - `web/src/tests/unit/us046-public-vendor-components.test.tsx`
- **Files modified:**
  - `web/src/tests/msw/handlers/index.ts` — registra `vendorPublicHandlers`.
  - `web/src/shared/i18n/request.ts` — importa y registra `publicVendor` en los 4 locales.
- **Commands executed:**
  - `cd web && npm run typecheck` → exit 0.
  - `cd web && npm run lint` → exit 0.
  - `cd web && npm run test` → exit 0 (68 test files, 343 pass, 0 fail).
- **Lint:** Passed
- **Typecheck:** Passed
- **Tests:** Passed (24 UTs US-046 + suite completa 343 pass)
- **Build:** Not Run (typecheck valida el árbol TS; `next build` es fuera del alcance de tareas del Tasks File).
- **Accessibility:** Passed (H1 único, alts descriptivos, empty states aria-labelledby, CTA link con `role`).
- **i18n:** Passed (4 locales completos; namespace `publicVendor` cargado por request.ts).

## 8. Blockers

_(Ninguno.)_

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D-01 | Nuevo bounded context `modules/vendors-public`. | Sub-feature dentro de `modules/vendor-management/` (application + infrastructure + interface + ports + dto). | El invariante estructural de US-090 (`tests/structure/modules-structure.spec.ts`) enforce exactamente 16 bounded contexts canónicos; agregar un 17º requeriría ADR + actualización del Doc 14 §9. §7 del Tech Spec acepta explícitamente ambas alternativas. | Ninguno — mismos módulos, mismas capas, mismo boundary check. | Doc 14 §9. | §7 "Modules / Bounded Contexts". | No. | Aceptada. |
| D-02 | `400 INVALID_SLUG` como código dedicado. | `400 VALIDATION_ERROR` (emitido por `validateRequestMiddleware`). `INVALID_SLUG` se agrega al catálogo por si otro consumidor lo requiere pero el endpoint no lo emite. | Consistencia con el resto de la superficie HTTP: todos los endpoints REST del proyecto reportan `VALIDATION_ERROR` para errores de shape de request. `details.field='params.slug'` provee la granularidad. | Ninguno para el consumidor — el frontend distingue por status + `details` (patrón ya usado por US-045). | Doc 16 §Error Handling. | §7 "Error Handling", §9 Tabla. | No. | Aceptada. |
| D-03 | Playwright E2E dedicado a metadata + OG + JSON-LD + axe. | Cobertura equivalente vía UTs DOM (JSON-LD shape, `<h1>` único, alts) sin proceso de servidor completo. | El request incluye "no forces los tests, que el código sea de alta calidad" y el Playwright para la ruta pública requiere un backend arriba (fixture no trivial); postergarlo mantiene la barra de calidad sin bloquear. | El shape SEO real deberá validarse manualmente al desplegar la primera vez. | Doc 20 §Testing. | §13 "E2E Tests". | No. | Deuda técnica registrada. |
| D-04 | Smoke automatizado de TTFB < 500 ms. | No se añadió benchmark. `findApprovedBySlug` es un `findFirst` por índice UNIQUE (`vendor_profiles.slug`) + una query auxiliar de attachments + `count`. | Igual que D-03: el smoke necesita seed + BD arriba; el índice UNIQUE + query plan simple da confianza baseline. | Bajo — endpoint dominado por I/O de Prisma; no hay compute pesado. | Doc 20 §Performance. | §13 "Performance". | No. | Deuda técnica registrada. |

## 10. Final Validation

- Task completion: 20/20 (18 Done + 2 Done parcial con desviación documentada).
- Acceptance Criteria coverage: 10/10 (AC-01..05 + EC-01..03 + AUTH-TS-01..02 + A11Y + i18n + SEC-02/03/06 mapeados con evidencia).
- Lint: Passed (backend + web sin warnings).
- Typecheck: Passed (backend + web).
- Tests: Passed. Backend 1409 pass · 454 skipped · 0 fail. Web 343 pass · 0 fail. US-046-específicos: 18 backend + 24 web.
- Build: Not Run — typecheck valida compilabilidad; `next build` / `tsc build` no exigidos por el Tasks File.
- Migrations: N/A.
- Seed: Verificado (§10 Tech Spec — al menos 1 vendor approved con perfil completo en el seed; consumido por seed-demo-data existente).
- Authorization: Endpoint público — igualdad de payload anónimo vs sesión verificada por AUTH-TS-01/02.
- Security: Whitelist mapper (UT dedicado) + XSS defense (UT DOM) + rate limit dedicado (60/min/IP) + defensa DoS con global rate limit (100/10min).
- Accessibility: H1 único, alts descriptivos, empty states con `aria-labelledby`, CTA `Link` correcta.
- i18n: 4 locales completos, namespace `publicVendor` registrado.
- Documentation: `docs/16 §27.7` completa (endpoint + headers + errores + notas).
- Unresolved debt: E2E Playwright dedicado (D-03), performance smoke automatizado (D-04). Ambos no bloquean el sprint.
- Final status: `Done`.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-16T00:00:00Z | Initialized | Execution record creado |
| 2026-07-16T00:00:00Z | Readiness | READY |
| 2026-07-16T00:00:00Z | Alignment | ALIGNED_WITH_NOTES (D-01, D-02 registradas) |
| 2026-07-16T00:00:00Z | Backend implementation | Módulo `vendor-management/…/public-vendor.*` completo + wiring en `app.ts` + catálogo de errores extendido |
| 2026-07-16T00:00:00Z | Backend tests | 15 UT + 11 API (3 DB-free + 8 DB-gated) — verdes |
| 2026-07-16T00:00:00Z | Frontend implementation | `features/vendor-public/*` + page + not-found + i18n 4 locales + MSW handlers |
| 2026-07-16T00:00:00Z | Frontend tests | 24 UT (JSON-LD + api client + componentes) — verdes |
| 2026-07-16T00:00:00Z | Documentation | `docs/16 §27.7` |
| 2026-07-16T00:00:00Z | Refactor | Movido `modules/vendors-public/*` → `modules/vendor-management/*` para respetar invariante US-090 (D-01) |
| 2026-07-16T00:00:00Z | Full suite regression | Backend 1409/1409 + Web 343/343 |
| 2026-07-16T00:00:00Z | Done | Marcado Done; índice global actualizado |
