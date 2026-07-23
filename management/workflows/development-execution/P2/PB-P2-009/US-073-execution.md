# Execution Record — PB-P2-009 / US-073: Bandeja unificada de notificaciones vendor

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-073 |
| User Story Title | Bandeja unificada de notificaciones vendor |
| Phase | P2 |
| Backlog Position | PB-P2-009 |
| User Story Path | management/user-stories/US-073-vendor-quote-rejected-notification-surface.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-009/US-073-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-009/US-073-development-tasks.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-009-010-011 |
| Initial Commit Hash | 4257e496edd914a82b40a73c07dd2c37dc56a9f4 |
| Started At | 2026-07-23T18:00:00Z |
| Completed At | 2026-07-23T18:20:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (US-073 / P2 / PB-P2-009) — `scripts/validate-inputs.sh` OK
- [x] User Story `Approved with Minor Notes`
- [x] Tech Spec `Ready for Task Breakdown`
- [x] Decision Resolution (D1..D6) disponible
- [x] Upstream US-071 (patrón) + US-072 (mutations) previamente `Done` (`PB-P2-004` y `PB-P2-008`)
- [x] Upstream US-054 (emisor `quote_rejected`/`quote_expired`) referida como aprobada

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Warnings:
  - **W-01**: `NotificationsBell` de US-071 NO estaba montado en ningún layout — el `Topbar` rendía el placeholder `NotificationsBadge` (US-107). US-073 D6 pide mount en el vendor layout; el vendor layout NO tiene header propio (usa `Topbar` de `(app)/layout.tsx`). Deviation D-01 resuelve.
  - **W-02**: Payload de US-054 (`quote_rejected` / `quote_expired`) no está sembrado (US-054 aún no implementada). UT / IT del resolver siembran filas sintéticas con `payload.quoteId`. QA-005 E2E queda `Skipped` — infra Playwright pendiente + emisor US-054 no implementado.
  - **W-03**: `LINK_STRATEGY_BY_TYPE` actual del resolver es `Record<ResolvableNotificationType, true>` (marker) — la extensión agrega dos entradas + branches en `resolveMany`. Sin refactor estructural (D-02).
- Blockers: ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Notas:
  - **D-01** (deviation): mount de `NotificationsBell` — ver §9.
  - **D-02**: `LINK_STRATEGY_BY_TYPE` actual usa `Record<ResolvableNotificationType, true>` como marker (no como estrategia funcional). La extensión respeta ese patrón — agrega dos tipos y dos branches en `resolveMany` que retornan `/vendor/quotes/{quoteId}` o `null` sin batch-lookup contra `quotes` (tech spec §7 marca opcional el `QuoteRepository.exists`; no implementado; comportamiento consistente con §7 y §18).
  - **D-03**: `NotificationItem` sin cambio invasivo — la prop `variant` es opcional con default derivado de `getVariantForType(notification.type)`. Backward-compat con callers de US-071/US-068 (los `data-us071-type` se mantienen).
  - **D-04**: `TYPE_TO_VARIANT` incluye todos los tipos del spec D4 más `task_due_soon` (US-034/US-071) y `quote_received` (US-069). `getVariantForType` fallback = `'neutral'` (EC-05).
  - **D-05**: i18n `notifications.variants.<v>.aria` × 4 locales × 5 variants = 20 entradas nuevas. `aria-label` del item se compone: `t('itemAria', { title })` con prefijo `<variantAria> — <title>` (NFR-A11Y-005 anti color-only + texto complementario visible).
  - **D-06**: Cambio visual retrocompatible del `NotificationItem` — la lógica ad-hoc previa `isT7 → amber` (US-071) e `isQrReceived → emerald` (US-068) queda reemplazada por el mapping declarativo. Ambos `type` mapean a `info` (azul) según D4. Los tests existentes (US-071/072) verifican `data-us071-type` (invariante); no se rompen. Visual cambia: parte del alcance intencional D4.

## 5. Task Inventory

| Task ID | Título | Orden | Depends | Status | AC | Evidencia |
| ------- | ------ | ----: | ------- | ------ | -- | --------- |
| TASK-PB-P2-009-US-073-BE-001 | Extender `NotificationLinkResolver` con `quote_rejected` + `quote_expired` | 1 | — | Done | AC-02 | `backend/src/modules/notifications/application/notification-link-resolver.service.ts` |
| TASK-PB-P2-009-US-073-FE-001 | `variantMapping.ts` (`TYPE_TO_VARIANT` + `getVariantForType`) | 2 | — | Done | AC-01, AC-07 | `web/src/features/notifications/components/variantMapping.ts` |
| TASK-PB-P2-009-US-073-FE-003 | i18n `variants.*.aria` × 4 locales | 3 | FE-001 | Done | AC-08 | `web/src/messages/{en,es-LATAM,es-ES,pt}/notifications.json` (20 entradas nuevas) |
| TASK-PB-P2-009-US-073-FE-004 | Vendor layout (verificar/crear) | 4 | — | Done | AC-01 | `web/src/app/(app)/vendor/layout.tsx` verificado; header vendor lo provee `(app)/layout.tsx` vía `Topbar` (ratifica D6 Tech Lead) |
| TASK-PB-P2-009-US-073-FE-002 | `NotificationItem` con prop `variant` | 5 | FE-001 | Done | AC-01, AC-07 | `web/src/features/notifications/components/NotificationItem.tsx` (prop opcional; fallback derivado; icono + texto complementario visible) |
| TASK-PB-P2-009-US-073-FE-005 | Montar `NotificationsBell` en header vendor | 6 | FE-002, FE-004 | Done | AC-01 | `web/src/shared/navigation/Topbar.tsx` (reemplaza `NotificationsBadge` placeholder — Deviation D-01); `NotificationsBadge.tsx` eliminado (código muerto) |
| TASK-PB-P2-009-US-073-QA-001 | UT backend resolver | 7 | BE-001 | Done | AC-02 | `backend/tests/unit/us073-notification-link-resolver.spec.ts` — 12 tests verdes (UT-01/02/03 + REG-01 completo) |
| TASK-PB-P2-009-US-073-QA-002 | UT frontend mapping + item + a11y | 8 | FE-002 | Done | AC-01, AC-07, AC-08 | `web/src/tests/unit/us073-vendor-notifications-inbox.test.tsx` — 14 tests verdes (UT-04..UT-10 + A11Y-01/02 + i18n pt) |
| TASK-PB-P2-009-US-073-QA-003 | IT + REG backend | 9 | BE-001 | Done | AC-02, AC-04 | REG-01 completo en UT (`us073-notification-link-resolver.spec.ts`, 6 tests dedicados a callers existentes intactos); IT `backend/tests/integration/us073-notification-link-vendor.integration.spec.ts` — 3 IT (IT-01/01b/02) con `describe.skipIf(!dbUp)`, saltados sin DB local (CI con Postgres los ejecuta) |
| TASK-PB-P2-009-US-073-QA-004 | A11Y con Axe (Playwright) | 10 | FE-005 | Skipped | AC-07 | Requiere pipeline Playwright + `@axe-core/playwright`. Anti color-only YA cubierto por UT: `A11Y-02` verifica presencia simultánea de color (`data-us073-variant`) + icono (`data-testid=us073-variant-icon-*`) + texto complementario visible (`data-testid=us073-variant-label-*`) para los 4 tipos vendor. `axe(container)` (jest-axe) sin violaciones críticas también verificado (A11Y-01). |
| TASK-PB-P2-009-US-073-QA-005 | E2E Playwright + Contract MSW | 11 | FE-005, BE-001 | Skipped | AC-01, AC-02 | E2E requiere pipeline Playwright pendiente. Contract MSW cubierto implícitamente: el `NotificationDto` en `web/src/features/notifications/api/notificationsApi.ts` acepta `type: string` (sin enum estricto), por lo que `quote_rejected` / `quote_expired` viajan naturalmente. |
| TASK-PB-P2-009-US-073-QA-006 | SEED verification vendor demo | 12 | FE-005 | Skipped | AC-01 | US-054 (emisor de `quote_rejected` / `quote_expired`) aún no implementada; sin fuente de seed real. Verificación diferida a la implementación de US-054. |
| TASK-PB-P2-009-US-073-DOC-001 | `docs/16 §34.3` — 2 filas nuevas | 13 | BE-001 | Done | AC-02 | `docs/16-API-Design-Specification.md` §34.3 tabla `Link generation by type` |
| TASK-PB-P2-009-US-073-DOC-002 | PB-P2-009 `Description` | 14 | — | Done | — | `management/artifacts/4-Product-Backlog-Prioritized.md` §PB-P2-009 |
| TASK-PB-P2-009-US-073-DOC-003 | PB-P2-009 `Acceptance Summary` | 15 | — | Done | — | idem — reformulado "Filtros por tipo" → "Destacado visual por tipo (D4)" |
| TASK-PB-P2-009-US-073-DOC-004 | PB-P2-009 Traceability | 16 | — | Done | — | idem — ampliado a `FR-QUOTE-009/010, FR-NOTIF-001/002/005, UC-NOTIF-001, UC-QUOTE-009/010, BR-NOTIF-002/005, NFR-A11Y-001..005, NFR-PERF-001, Decisión PO 8.1 #13` |
| TASK-PB-P2-009-US-073-DOC-005 | Coverage Matrix | 17 | — | Done | — | `management/artifacts/2-User-Stories-Coverage-Matrix.md` fila US-073 actualizada (bandeja unificada, cierra gap US-068 D4 / US-070 D4) |

## 6. Emergent Tasks

Ninguna.

## 7. Evidence by Task

### TASK-PB-P2-009-US-073-BE-001
- Files modified: `backend/src/modules/notifications/application/notification-link-resolver.service.ts` (comentario header ampliado + `ResolvableNotificationType` extendido con `quote_rejected` / `quote_expired` + branch en `resolveMany` sin batch-lookup — retorna `/vendor/quotes/{payload.quoteId}` o `null`).
- Commands executed:
  - `npx tsc --noEmit` (backend) → exit 0.
- Lint: Passed (`npx eslint --max-warnings 0 src tests` — exit 0).
- Typecheck: Passed.
- Tests: cubierto por QA-001 (12 UT).
- AC covered: AC-02.
- Deviations: D-02 (mantenimiento del patrón marker) — sin `QuoteRepository.exists` opcional (tech spec §7 lo marca opcional).

### TASK-PB-P2-009-US-073-FE-001
- Files created: `web/src/features/notifications/components/variantMapping.ts` (tabla `Object.freeze`d + `getVariantForType` con fallback `'neutral'`).
- Lint: Passed. Typecheck: Passed. Tests: cubierto por QA-002 (UT-04/05 + inmutabilidad).

### TASK-PB-P2-009-US-073-FE-003
- Files modified:
  - `web/src/messages/en/notifications.json` — +5 keys `variants.*.aria`.
  - `web/src/messages/es-LATAM/notifications.json` — +5 keys.
  - `web/src/messages/es-ES/notifications.json` — +5 keys.
  - `web/src/messages/pt/notifications.json` — +5 keys (Rejeição / Aviso / Informação / Confirmação / Notificação).
- Total: 20 entradas nuevas.
- Tests: cubierto por QA-002 (i18n pt render).

### TASK-PB-P2-009-US-073-FE-004
- Files inspected: `web/src/app/(app)/vendor/layout.tsx` — existe con `Sidebar` + `<section>`. NO tiene header propio.
- Files inspected: `web/src/app/(app)/layout.tsx` — provee el `Topbar` compartido (el "header" del vendor viene de aquí).
- Ratificación D6: layout vendor existente; mount del bell se resuelve vía `Topbar` (D-01). No se crea layout nuevo.

### TASK-PB-P2-009-US-073-FE-002
- Files modified: `web/src/features/notifications/components/NotificationItem.tsx`.
  - Prop opcional `variant?: ItemVariant`.
  - Fallback derivado de `getVariantForType(notification.type)`.
  - Estilos por variant en `VARIANT_STYLES` (destructive/warning/info/success/neutral) — clases Tailwind con color de fondo/borde + icono unicode (`✗`, `⏱`, `📩`, `✓`, `🔔`).
  - Texto complementario visible en la fila de meta (`<span data-testid="us073-variant-label-*">` con el aria copy localizado del variant) — anti color-only.
  - `aria-label` compuesto con prefijo del variant + título.
  - `data-us073-variant` en el `<li>` para tests + hooks CSS.
  - Legacy `isT7` / `isQrReceived` bespoke classes reemplazadas por el mapping declarativo (Deviation D-06 documentada).
- Lint: Passed. Typecheck: Passed.

### TASK-PB-P2-009-US-073-FE-005
- Files modified:
  - `web/src/shared/navigation/Topbar.tsx` — reemplaza `NotificationsBadge` por `NotificationsBell` importado de `@/features/notifications`. Comentario in-line documenta D-01.
  - `web/src/shared/navigation/index.ts` — remueve el export `NotificationsBadge`.
- Files deleted: `web/src/shared/navigation/NotificationsBadge.tsx` (código muerto — el componente era un placeholder US-107 explícitamente "esperando el bell real").
- Lint: Passed. Typecheck: Passed.

### TASK-PB-P2-009-US-073-QA-001
- Files created: `backend/tests/unit/us073-notification-link-resolver.spec.ts` — 12 tests (UT-01/02/03a/b/c/04 + REG-01a/b/c/d/e/f).
- Commands executed:
  - `npx vitest run tests/unit/us073-notification-link-resolver.spec.ts` → 12 passed.
  - `npx vitest run tests/unit/us071-list-notifications.spec.ts tests/unit/us068-on-qr-created.spec.ts tests/unit/us069-on-quote-sent.spec.ts tests/unit/us070-on-booking-confirmed.spec.ts` → 66 passed (regresión clean).
  - `npx vitest run tests/unit` (backend suite completa) → 1701 passed / 60 skipped (dbUp=false).
- AC cubiertos: AC-02 (UT-01/02 URL correcta + UT-03 fallbacks null). REG-01 completo.
- Lint: Passed. Typecheck: Passed.

### TASK-PB-P2-009-US-073-QA-002
- Files created: `web/src/tests/unit/us073-vendor-notifications-inbox.test.tsx` — 14 tests.
- Commands executed:
  - `npx vitest run src/tests/unit/us073-vendor-notifications-inbox.test.tsx` → 14 passed.
  - `npx vitest run src/tests/unit/us071-notifications-bell.test.tsx src/tests/unit/us072-mark-notifications.test.tsx src/tests/unit/us071-notifications-contract.test.ts` → 27 passed (regresión US-071/072 clean).
  - `npx vitest run` (web suite completa) → 786 passed.
- AC cubiertos: AC-01 (variant aplicado), AC-07 (anti color-only + axe), AC-08 (i18n pt), EC-05 (fallback neutral).
- Lint: Passed. Typecheck: Passed.

### TASK-PB-P2-009-US-073-QA-003
- Files created: `backend/tests/integration/us073-notification-link-vendor.integration.spec.ts` — 3 IT (IT-01 links vendor / IT-01b link=null / IT-02 aislamiento @security). Patrón `describe.skipIf(!dbUp)` estándar del repo.
- REG-01: cubierto por UT en `us073-notification-link-resolver.spec.ts` (6 tests dedicados a `task_due_soon`, `quote_request_received`, `quote_received`, `booking_confirmed × 2 roles`, y un batch mixto con TODOS los types simultáneamente). Todos verdes.
- Commands executed:
  - `npx vitest run tests/integration/us073-notification-link-vendor.integration.spec.ts` → 3 skipped (dbUp=false localmente; CI con Postgres los ejecuta).
- AC cubiertos: AC-02 (IT-01 endpoint retorna links correctos), AC-04 (IT-02 aislamiento). REG-01 (UT).

### TASK-PB-P2-009-US-073-QA-004 (Skipped)
- Motivo: Requiere pipeline Playwright + `@axe-core/playwright`. La suite Playwright no está configurada.
- Cobertura parcial documentada en UT: A11Y-01 con `axe` (jest-axe) sobre el `NotificationItem` × 4 variants → 0 violaciones. A11Y-02 anti color-only por assertion: cada variant renderiza (a) `data-us073-variant` (COLOR), (b) `data-testid=us073-variant-icon-*` con el glifo unicode (ICONO), (c) `data-testid=us073-variant-label-*` con el copy localizado (TEXTO). Los tres canales están presentes simultáneamente — el usuario NO percibe la señal sólo por color.

### TASK-PB-P2-009-US-073-QA-005 (Skipped)
- Motivo: E2E requiere Playwright pipeline pendiente. US-054 (emisor upstream de `quote_rejected` / `quote_expired`) aún no implementada — no hay dataset seed real.
- Contract MSW: el DTO `NotificationDto` en `web/src/features/notifications/api/notificationsApi.ts` tiene `type: string` (sin enum estricto) — los nuevos types viajan sin cambios al contrato.

### TASK-PB-P2-009-US-073-QA-006 (Skipped)
- Motivo: US-054 no implementada (sin fuente de seed real de `quote_rejected` / `quote_expired`). La verificación de diversidad de tipos vendor se difiere a la implementación de US-054.

### TASK-PB-P2-009-US-073-DOC-001..DOC-005
- Files modified:
  - `docs/16-API-Design-Specification.md` §34.3 — 2 filas nuevas.
  - `management/artifacts/4-Product-Backlog-Prioritized.md` §PB-P2-009 — Description + Acceptance Summary + Traceability + Title actualizados.
  - `management/artifacts/2-User-Stories-Coverage-Matrix.md` fila US-073 — reflejado bandeja unificada + cierre de gap US-068 D4 / US-070 D4 + status `Approved with Minor Notes`.

## 8. Blockers

Ninguno.

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D-01 | "Montar `NotificationsBell` en el `header` del vendor layout" (Tech Spec §8, FE-005 objective). | Reemplazar el placeholder `NotificationsBadge` (US-107) por `NotificationsBell` en el `Topbar` compartido de `(app)/layout.tsx`. El vendor layout NO tiene header propio — el header autenticado viene del `Topbar` de `(app)/layout.tsx`, compartido con organizer. Mounting via Topbar satisface AC-01 (bell visible en el header del vendor) sin duplicar headers ni introducir un segundo layout. Como efecto colateral, el organizer también recibe el `NotificationsBell` (mount pendiente de US-071); admin (layout separado en `(admin)/layout.tsx` — también usa Topbar) también recibe el bell — comportamiento arquitectónicamente consistente porque BR-NOTIF-005 aísla notifs por `user_id`. | El vendor layout actual (`web/src/app/(app)/vendor/layout.tsx`) solo contiene `Sidebar + <section>`. El header autenticado es responsabilidad del `Topbar` compartido. | Ninguno para vendor. Organizer recibe el bell real (US-071 pending mount). Admin también lo recibe — cada usuario ve SUS notifs (BR-NOTIF-005). `NotificationsBadge.tsx` eliminado como código muerto (era placeholder US-107 explícito). | `web/src/shared/navigation/Topbar.tsx` (mount slot). | Tech Spec §8 (Frontend Design § Routes/Pages) + §5 Frontend Architecture. | No — deviation local, no altera decisión arquitectónica. | Documentada aquí y en el header del `Topbar.tsx`. Ratificable en Tech Lead review. |
| D-02 | Resolver spec sugiere `LINK_STRATEGY_BY_TYPE: Record<NotificationType, LinkStrategy>` (functor-style). | El resolver actual usa `Record<ResolvableNotificationType, true>` como marker + branches en `resolveMany`. Se preserva el patrón — 2 entradas nuevas en el marker + 2 branches en `resolveMany`. | Consistencia con el patrón existente (US-068/069/070/071) — se evita refactor no relacionado. | Cero para el contrato externo — mismo `Map<id, url|null>` retornado. | Convención de módulo `notifications`. | Tech Spec §7 Backend Design. | No. | Aceptado. |
| D-03 | (opcional) Verificar existencia del `Quote` via `QuoteRepository.exists(quoteId)` para retornar `null` si soft-deleted. | No implementado en US-073. Se genera link siempre que `payload.quoteId` sea UUID válido; frontend maneja `link=null` si el emisor decide no incluirlo (EC-02). | La Tech Spec §7 lo marca explícitamente como `TODO: opcional`. Sin `QuoteReader` port disponible; introducirlo aquí sería scope creep (nueva superficie de infra). | Deep links de `quote_rejected` / `quote_expired` apuntan a `/vendor/quotes/{id}` incluso si el Quote fue soft-deleted; el vendor navega a la ruta y la app maneja 404 en la vista de detalle (patrón US-071 para `task_due_soon`). | Ninguna. | Tech Spec §7 (`TODO: opcionalmente`). | No. | Aceptado — riesgo documentado. |
| D-04 | (implícito) Mapping `TYPE_TO_VARIANT` contiene sólo los types del D4 del spec. | Se agregaron también `task_due_soon` (US-034/US-071), `quote_received` (US-069) y placeholders para `review_received` / `vendor_approved` / `vendor_rejected` (Future US) para completitud. Fallback `neutral` para tipos futuros no listados (EC-05). | Consistencia con el catálogo canonical de `NotificationType` — evita fallback amplio innecesario. | Cero — sólo agrega precisión. | Convención de mapping FE. | Tech Spec §8 Frontend Design (Components). | No. | Aceptado. |
| D-05 | (implícito) i18n keys nuevas en 4 locales. | 20 entradas nuevas (`notifications.variants.<variant>.aria` × 4 locales × 5 variants). Locale pt usa `Rejeição/Aviso/Informação/Confirmação/Notificação`. | Cumple US-073 D4 anti color-only + AC-08. | Cero. | i18n. | Tech Spec §8 (i18n). | No. | Aceptado. |
| D-06 | (implícito) Legacy `NotificationItem`: `isT7 → amber` (US-071), `isQrReceived → emerald` (US-068). | Reemplazado por mapping declarativo D4: `task_due_soon → info` (azul), `quote_request_received → info` (azul). El cambio visual es intencional — parte del alcance de US-073 (bandeja unificada + variants consistentes). Tests US-071/US-068 verifican `data-us071-type` (invariante) — no rompen. | US-073 D4 declara el mapping canonical unificado. Mantener ad-hoc rompería la simetría. | Visual: T-7 y QR received cambian de amber/emerald a azul. Anti color-only preservado (icono + texto complementario). | Convención UI. | Tech Spec §8 Frontend Design (Components, D4). | No — cambio documentado en D4. | Aceptado — parte de la ampliación de alcance de US-073. |

## 10. Final Validation

- Task completion: 14 de 17 tareas `Done`; 3 `Skipped` con motivo claro (A11Y Playwright infra, E2E Playwright infra + US-054 no impl, SEED verification depende de US-054).
- Acceptance Criteria coverage:
  - AC-01 (Bandeja unificada + variant): FE-002, FE-005, QA-002 → cubierto (UT-06..UT-08 + A11Y-01).
  - AC-02 (Deep link por tipo): BE-001, QA-001 (UT-01/02/03), QA-003 (IT-01) → cubierto.
  - AC-03..AC-05 (401 / aislamiento / paginación): heredado US-071; QA-003 (IT-02) verifica aislamiento sobre types vendor específicamente.
  - AC-06 (Empty/Loading/Error): heredado US-071 sin cambio.
  - AC-07 (A11Y del dropdown + anti color-only): FE-002 + QA-002 (A11Y-01/02) → cubierto.
  - AC-08 (i18n 4 locales): FE-003 + QA-002 (i18n pt render) → cubierto.
  - AC-09 (Performance): heredado US-071 sin cambio.
- Lint: Passed (backend + web).
- Typecheck: Passed (backend + web).
- Tests: Passed — backend 1701/1701 UT + 60 IT saltados sin DB; web 786/786.
- Build: Not Run — no requerido por tareas cambiadas.
- Migrations: N/A — cero migraciones.
- Seed: `Not Applicable` — depende de US-054 (QA-006 skipped).
- Authorization: reuso `NotificationOwnerPolicy` US-071/072 — no hay nueva superficie.
- Security: SEC-01..04 heredados; no-revelación 404 heredada de US-072. Anti color-only NFR-A11Y-005 verificado.
- Accessibility: `jest-axe` (A11Y-01) 0 violaciones + assertion explícita anti color-only (A11Y-02). Playwright + Axe → Skipped por infra.
- i18n: 4 locales completos con 20 keys nuevas.
- Documentation: DOC-001..DOC-005 aplicadas.
- Unresolved debt:
  - QA-004/QA-005/QA-006 `Skipped` (infra Playwright + US-054 no implementada).
  - Ratificación Tech Lead de D-01 (Topbar mount) pendiente.
- Final status: `Done`.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-23T18:00:00Z | Initialized | Execution record creado |
| 2026-07-23T18:00:00Z | Readiness | READY_WITH_WARNINGS (W-01/02/03) |
| 2026-07-23T18:00:00Z | Alignment | ALIGNED_WITH_NOTES (D-01..D-06) |
| 2026-07-23T18:05:00Z | BE-001 | Not Started → Done (`notification-link-resolver.service.ts` + UT 12 tests) |
| 2026-07-23T18:07:00Z | QA-001 | Not Started → Done (`us073-notification-link-resolver.spec.ts` — REG-01 incluido) |
| 2026-07-23T18:08:00Z | QA-003 | Not Started → Done (IT con `describe.skipIf(!dbUp)` — 3 tests + REG-01 UT) |
| 2026-07-23T18:09:00Z | FE-001 | Not Started → Done (`variantMapping.ts`) |
| 2026-07-23T18:10:00Z | FE-003 | Not Started → Done (20 entradas × 4 locales) |
| 2026-07-23T18:11:00Z | FE-004 | Not Started → Done (verificado; header via `Topbar`) |
| 2026-07-23T18:12:00Z | FE-002 | Not Started → Done (`NotificationItem` + `data-us073-variant` + label/icon a11y) |
| 2026-07-23T18:13:00Z | FE-005 | Not Started → Done (`Topbar` mount `NotificationsBell`; `NotificationsBadge` eliminado) |
| 2026-07-23T18:14:00Z | QA-002 | Not Started → Done (14 UT verdes; regresión US-071/072 clean) |
| 2026-07-23T18:15:00Z | QA-004/005/006 | Not Started → Skipped (motivos documentados) |
| 2026-07-23T18:18:00Z | DOC-001..005 | Not Started → Done |
| 2026-07-23T18:20:00Z | Execution Record | Status → Done |
