# Execution Record — PB-P1-028 / US-045: Directorio autenticado de vendors

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-045 |
| User Story Title | Buscar proveedores en directorio (autenticado) |
| Phase | P1 |
| Backlog Position | PB-P1-028 |
| User Story Path | management/user-stories/US-045-search-vendors.md |
| Tech Spec Path | management/technical-specs/P1/PB-P1-028/US-045-technical-spec.md |
| Tasks Path | management/development-tasks/P1/PB-P1-028/US-045-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P1-028 |
| Initial Commit Hash | a684375eafc41e9121053546e6a5862afedf13ac |
| Started At | 2026-07-16T00:00:00Z |
| Last Updated At | 2026-07-16T00:00:00Z |
| Completed At | 2026-07-16T00:00:00Z |
| Claude Session ID | n/a |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo) — `scripts/validate-inputs.sh` EXIT=0
- [x] User Story ID coincide en las 3 rutas (nombre + contenido): US-045
- [x] Phase coincide entre Tech Spec y Tasks: P1
- [x] Backlog Position coincide entre Tech Spec y Tasks: PB-P1-028
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P1-028-US-045-DB-001 … TASK-PB-P1-028-US-045-DOC-001)

## 3. Readiness Gate

- Resultado: READY_WITH_WARNINGS
- Checks: US Approved (2026-06-27); Tech Spec Ready for Task Breakdown; Tasks Ready for Sprint Planning; PB-P0-001 (schema) + PB-P1-024 (US-040) + PB-P1-027 (US-044) mergeados; decision resolution 8/8 encontrado.
- Warnings: el schema `VendorProfile` no expone `rating_avg`/`reviews_count` y `Location` no expone `code` (slug). El Tech Spec §7/§10 asume estas columnas; el reuso literal es imposible sin migración. Registrado como Deviation #1.
- Blockers: Ninguno.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-045-decision-resolution.md`

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 17 tareas cubren §7/§8/§10/§12/§13 del Tech Spec.
- Tech Spec vs Conventions: reuso del bounded context `vendor-management` (hexagonal). El Tech Spec menciona `modules/vendors`; el canónico del repo es `vendor-management` (mismo hallazgo que US-044).
- Tasks vs Acceptance Criteria: AC-01 → BE-002..005 / QA-002; AC-02 → BE-001 / QA-001 / QA-002; AC-03 → BE-004 / QA-002; AC-04 → QA-003; EC-01..05 → BE-002/004 / QA-001/002; AUTH-TS-01..04 → QA-003; A11Y → FE-002 / QA-005; i18n → FE-004; Performance → QA-004.
- Ajustes requeridos: migración menor aditiva `us045_vendor_search_fields` + actualización del seed (`code` en LOCATIONS + recompute de aggregates); cursor extendido a `{ ratingAvg, createdAt, id }` para alinear predicado keyset con `ORDER BY`. Todo registrado en Deviation #1 y #2.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P1-028-US-045-DB-001 | Verificar índices + decidir índice compuesto | 1 | PB-P0-001 | Done | 2026-07-16 | 2026-07-16 | NFR-PERF-001 | Migración `20260716120000_us045_vendor_search_fields` aplicada: agrega `vendor_profiles.rating_avg/reviews_count`, `locations.code UNIQUE`, `idx_vendor_profiles_directory (rating_avg DESC NULLS LAST, created_at DESC, id DESC) WHERE status='approved' AND deleted_at IS NULL`. Backfill in-migration + recompute batch en seed. |
| TASK-PB-P1-028-US-045-BE-001 | Cursor helper (base64url) | 2 | - | Done | 2026-07-16 | 2026-07-16 | AC-02, EC-05 | `vendor-search-cursor.ts`: encode/decode. 8 UT (roundtrip, NULL rating, base64 basura, shape inválido, UUID inválido, rating fuera de rango, createdAt inválido, vacío). |
| TASK-PB-P1-028-US-045-BE-002 | DTO Zod `searchVendorsQuery` | 3 | BE-001 | Done | 2026-07-16 | 2026-07-16 | EC-01..04, VR-01/04/05 | `search-vendors.query.ts` (Zod `.strict()` + `.superRefine` cross-field). 7 UT (defaults, filtros válidos, priceMin>priceMax, currency_required_with_price, limit fuera de rango, slug con espacios, campos extra). |
| TASK-PB-P1-028-US-045-BE-003 | Repository `VendorSearchRepository` | 4 | DB-001 | Done | 2026-07-16 | 2026-07-16 | AC-01, AC-02 | `prisma-vendor-search.repository.ts`: `$queryRawUnsafe` con predicado keyset (NULLS LAST) parametrizado + subqueries batch para location.code, categorías y priceRange agregado. Evidencia real vía IT 17/17. |
| TASK-PB-P1-028-US-045-BE-004 | `SearchVendorsUseCase` (resolve slugs + branches) | 5 | BE-001, BE-002, BE-003 | Done | 2026-07-16 | 2026-07-16 | AC-01..04, EC-01..05 | `search-vendors.use-case.ts`: resolvers `categoryCode`/`locationCode` → IDs, decode cursor, vendor exclusion (SEC-03), hasNext + cursor de la próxima página. 8 UT (invalid filters, cursor corrupto, exclude vendor propio, no excluye organizer, hasNext true/false, empty state). |
| TASK-PB-P1-028-US-045-BE-005 | Controller + ruta `GET /vendors` | 6 | BE-004 | Done | 2026-07-16 | 2026-07-16 | AC-01..04 | `vendor-search.controller.ts` + `vendor-search.routes.ts` montado en `app.ts` bajo `/vendors` (después de `vendorProfileRouter`/`vendorServiceRouter`; pasa-through en `GET /`). AUTH: sesión firmada + `roleMiddleware(['organizer','vendor','admin'])`. Error handler mapea `InvalidFiltersError`/`InvalidCursorError`. |
| TASK-PB-P1-028-US-045-BE-006 | Mapper card response shape | 7 | BE-003 | Done | 2026-07-16 | 2026-07-16 | AC-01 | `search-vendors.response.ts`: `toVendorCardResponse` (camelCase, priceRange `null` cuando falta currency, `thumbnailUrl` = null MVP). 3 UT. |
| TASK-PB-P1-028-US-045-FE-001 | Page `organizer/vendors` con URL state | 8 | FE-003 | Done | 2026-07-16 | 2026-07-16 | AC-01..03 | `app/(app)/organizer/vendors/page.tsx` + `VendorSearch` orquesta filtros ↔ URL con `useSearchParams`. Build Next reporta `/organizer/vendors 4.85 kB / 130 kB First Load JS`. Ítem en `ORGANIZER_NAV_ITEMS`. |
| TASK-PB-P1-028-US-045-FE-002 | `VendorFilters` + `VendorCard` accesibles | 9 | FE-003 | Done | 2026-07-16 | 2026-07-16 | AC-01, A11Y | 5 UT filtros (labels semánticos, submit/reset propagados, onChange, axe sin violaciones); 5 UT card (aria-labelledby, aria-label rating, sin reviews, sin priceRange, axe). |
| TASK-PB-P1-028-US-045-FE-003 | `vendorsApi.search` + MSW + grid "Cargar más" | 10 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AC-02 | `vendorDirectoryApi.ts` + `vendorDirectoryQueries.ts` (`useInfiniteQuery` keyed por filtros normalizados). MSW handler `vendor-directory.ts` con triggers `msw-invalid-category`/`msw-invalid-cursor`/`msw-unauth` + 2 páginas mockeadas. 5 IT (200 + cursor + INVALID_FILTERS/INVALID_CURSOR/401). Botón "Cargar más" con `aria-busy`. |
| TASK-PB-P1-028-US-045-FE-004 | i18n `directory.*` en 4 locales | 11 | FE-002 | Done | 2026-07-16 | 2026-07-16 | i18n + Empty | Namespace `vendor.directory.*` completo en `es-LATAM`, `es-ES`, `pt`, `en` (title/subtitle/loading/error/empty/CTA/loadMore/filters/card/aria-labels). `sidebar.organizer.vendors` en los 4 locales. |
| TASK-PB-P1-028-US-045-QA-001 | Unit tests (cursor, DTO, mapper, use case branches) | 12 | BE-004 | Done | 2026-07-16 | 2026-07-16 | EC-01..05 | `tests/unit/us045-vendor-search.spec.ts` — 25/25 verdes. Cubre cursor (8), DTO (7), mapper (3), use case (7). |
| TASK-PB-P1-028-US-045-QA-002 | Integration tests (visibilidad + filtros + cursor) | 13 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AC-01..04, EC/NT | `tests/api/us045-vendor-search.api.spec.ts` — 17/17 verdes. Visibilidad (hidden/pending/rejected/soft-deleted excluidos), vendor exclusion, cursor sin duplicados, orden estable, empty state, NT-01..06. |
| TASK-PB-P1-028-US-045-QA-003 | Authorization tests (AUTH-TS-01..04) | 14 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AUTH-TS-01..04 | Mismo spec `us045-vendor-search.api.spec.ts` cubre AUTH-TS-01 organizer, AUTH-TS-02 vendor (no se ve a sí mismo), AUTH-TS-03 admin, AUTH-TS-04 anónimo → 401. |
| TASK-PB-P1-028-US-045-QA-004 | Performance smoke (`< 1s p95` con seed) | 15 | DB-001, BE-005 | Done | 2026-07-16 | 2026-07-16 | NFR-PERF-001 | `scripts/us045-perf-smoke.ts`: N=1000 vendors approved vivos, 100 corridas del use case (repo Postgres real). Reporte: p50=4.1 ms, p95=5.3 ms, p99=18.0 ms → 190× por debajo del umbral 1s. |
| TASK-PB-P1-028-US-045-QA-005 | Accessibility (filtros + cards + cargar más) | 16 | FE-002, FE-003, FE-004 | Done | 2026-07-16 | 2026-07-16 | A11Y | 10 UT web: `us045-vendor-card.test.tsx` (5) + `us045-vendor-filters.test.tsx` (5) con `jest-axe` en cada uno. Filtros con labels semánticos verificados; cards con `aria-labelledby`; botón "Cargar más" ya emite `aria-busy` durante fetch (verificado en el componente). |
| TASK-PB-P1-028-US-045-DOC-001 | Documentar `GET /api/v1/vendors` en `docs/16 §M07` | 17 | BE-005 | Done | 2026-07-16 | 2026-07-16 | AC-01..04 | `docs/16-API-Design-Specification.md`: fila agregada en §27.3 y sección nueva §27.6 con query params, response shape, errores, notas de índice y denormalización. |

## 6. Emergent Tasks

Ninguna. Deviation #1 documenta la migración menor aditiva (no es una tarea emergente sino un ajuste al Tech Spec).

## 7. Evidence by Task

Ver §5 (columna "Evidencia").

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado / propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ----------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| 1 | Tech Spec §7/§10 asume `vendor_profiles.rating_avg`, `reviews_count` y `locations.code` como preexistentes. | Se agrega migración aditiva `20260716120000_us045_vendor_search_fields` con esas 3 columnas + `idx_vendor_profiles_directory` compuesto, más recompute batch en el seed. | El schema real PB-P0-001 no las incluye — el reuso literal es imposible. Preservamos idempotencia del seed y no tocamos features existentes. `rating_avg` empieza NULL para vendors sin reviews (ordena `NULLS LAST`); `reviewsCount` = 0. Se recomputan por US-088 futura o por el batch del seed. | Aditivo y no destructivo. Preserva índices existentes. Actualiza `LOCATIONS` seed data con códigos `GT-GUA`/`MX-CDMX`/`CO-ANT` y hace upsert idempotente por `code`. | Ninguna. | §7 Repository/Cursor, §10 Database, §15 Seed Data Impact | No | Aceptada, documentada aquí y en el commit. |
| 2 | Tech Spec §7 cita cursor `{ created_at, id }` en la firma del helper pero el predicado keyset `(rating_avg, created_at, id) < (?, ?, ?)` requiere los tres campos. | El cursor se extendió a `{ ratingAvg, createdAt, id }`. Documentado en `vendor-search-cursor.ts`. | Sin `ratingAvg` en el cursor, la paginación duplicaría filas cuando dos vendors comparten `created_at`. La extensión no cambia el contrato (cursor es opaque). | Cero — el cliente sólo consume el cursor como opaque string. Impacto en test: el UT del cursor cubre los tres campos. | Ninguna. | §7 Cursor Helper | No | Aceptada, documentada aquí. |

## 10. Final Validation

- Task completion: 17 Done / 0 Rework Required / 0 Blocked. Total 17 tareas.
- Acceptance Criteria coverage: AC-01 Done (búsqueda combinada + shape + orden estable — 5 tests HTTP + 3 UT mapper); AC-02 Done (cursor sin duplicados, ambos sentidos, keyset con NULLS LAST); AC-03 Done (empty state `items:[]` + `cursor:null`, cubierto por IT + FE); AC-04 Done (401 anónimo DB-free + AUTH matrix DB-gated). EC-01..05 y NT-01..07 cubiertos por Zod + use case + IT.
- Lint: Passed — `npm run lint` en backend y `next lint --max-warnings=0` en web, 0 warnings.
- Typecheck: Passed — `tsc --noEmit` en backend y web.
- Tests: Passed — Backend US-045 42/42 verdes (25 UT + 17 IT/AUTH); Frontend US-045 15/15 verdes (10 A11Y + 5 IT api). El resto de la suite: 1071 verdes / 60 skipped en la ejecución vendor-related; las 23 fallas del `npm test` full existen en `main` previo (US-036/US-028/US-027/US-035 IT), NO son regresiones de US-045.
- Build: Passed — Backend `tsc -p tsconfig.build.json`; Web Next reporta `/organizer/vendors 4.85 kB / 130 kB First Load JS`.
- Migrations: Passed — `prisma migrate deploy` aplicó `20260716120000_us045_vendor_search_fields` sin errores.
- Seed: Passed — `seed-demo-data.use-case.ts` upsert idempotente de `locations.code` + recompute batch de `rating_avg`/`reviews_count` al final del pipeline.
- Authorization: Passed — AUTH-TS-01/02/03/04 verdes en `us045-vendor-search.api.spec.ts`.
- Security: Passed — Cursor decode estricto (rechaza JSON malformado, UUID inválido, rating fuera de rango, createdAt inválido); todo SQL parametrizado (`$1`, `$2`, ...); vendor no se ve a sí mismo (SEC-03) validado en test.
- Accessibility: Passed — jest-axe sin violaciones en `VendorCard` y `VendorFilters`; labels semánticos por input; card con `aria-labelledby`; botón "Cargar más" con `aria-busy`.
- Performance: Passed — p95=5.3 ms con N=1000 vendors approved (script `us045-perf-smoke.ts`), 190× bajo umbral NFR-PERF-001 (`< 1s p95`).
- i18n: 4 locales completos (`es-LATAM`, `es-ES`, `pt`, `en`) en `vendor.directory.*` + `navigation.sidebar.organizer.vendors`.
- Documentation: `docs/16-API-Design-Specification.md §27.6` con query params, response shape, errores, notas de índice/denormalización.
- Unresolved debt: `thumbnailUrl` siempre `null` en MVP; se cubre en US-046 (versión pública) con acceso a la "imagen destacada" del portafolio.
- Final status: Done — dominio + HTTP + frontend + tests (UT/IT/AUTH/A11Y/Perf) + docs completos.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-16T00:00:00Z | Initialized | Execution record creado sobre commit a684375 en rama `mvp/PB-P1-028`. |
| 2026-07-16T00:00:00Z | Readiness | READY_WITH_WARNINGS (schema requiere migración menor). |
| 2026-07-16T00:00:00Z | Alignment | ALIGNED_WITH_NOTES (Deviations #1 y #2 registradas). |
| 2026-07-16T00:00:00Z | DB | DB-001 Done — migración `us045_vendor_search_fields` aplicada + seed idempotente + índice compuesto. |
| 2026-07-16T00:00:00Z | Backend | BE-001..006 Done — cursor helper + DTO + repository + use case + mapper + controller/ruta + error mapping. |
| 2026-07-16T00:00:00Z | Frontend | FE-001..004 Done — page `/organizer/vendors` + `VendorSearch`/`VendorFilters`/`VendorCard` + `vendorsApi.search` + MSW + i18n 4 locales + nav item. |
| 2026-07-16T00:00:00Z | QA | QA-001..005 Done — 25 UT + 17 IT/AUTH + 10 A11Y + perf smoke p95=5.3 ms. |
| 2026-07-16T00:00:00Z | Docs | DOC-001 Done — `docs/16 §27.3 + §27.6` documentan `GET /vendors`. |
| 2026-07-16T00:00:00Z | Final Status | Done (17/17). |
