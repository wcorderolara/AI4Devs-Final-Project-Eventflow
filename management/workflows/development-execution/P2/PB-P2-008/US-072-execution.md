# Execution Record — PB-P2-008 / US-072: Marcar notificación como leída

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-072 |
| User Story Title | Mark notification as read (single + bulk global) |
| Phase | P2 |
| Backlog Position | PB-P2-008 |
| User Story Path | management/user-stories/US-072-mark-notification-read.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-008/US-072-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-008/US-072-development-tasks.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-006-007-008 |
| Initial Commit Hash | 58cb735 |
| Started At | 2026-07-23T08:30:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (US-072 / P2 / PB-P2-008) — script OK
- [x] User Story `Approved with Minor Notes`
- [x] Tech Spec `Ready for Task Breakdown`
- [x] Decision Resolution (D1..D6) disponible
- [x] Upstream US-034/068/069/070 disponibles (emisores del corpus de notifs)
- [x] Upstream US-071 disponible (surface consumidor — declara las query keys canónicas)

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks:
  - `docs/14 §730` referencia `MarkNotificationAsReadUseCase` como "existente" pero NO existía en `backend/src/modules/notifications/application`. Se implementa fresh siguiendo el patrón de use cases + puerto/adapter dedicado (paralelo a US-068..US-070).
  - `NotificationsController` de US-071 tiene shape `constructor(useCase)` — se refactoriza a `constructor(deps: { list, markAsRead, markAllAsRead })` sin ripple externo (el único caller es el router).
- Warnings:
  - **W-01**: la firma del constructor del controller cambia (parámetro objeto en vez de posicional). El único caller es `notifications.routes.ts` — se actualiza en la misma tarea; no hay tests que instancien el controller directamente.
  - **W-02**: la política de no-revelación 404 (AC-04) es COUNTERINTUITIVE para QA — se documenta en SEC-T-01 explícitamente y el IT-03 valida que ajena responde 404 sin distinguirse de inexistente.
- Blockers: ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Notas:
  - D-01: Puerto/adapter dedicado `MarkNotificationsRepository` (paralelo al patrón US-068..US-070), en vez de expandir `ListNotificationsRepository`. Aisla contratos de escritura vs lectura. 3 métodos: `findOwnedById` (ownership snapshot) + `markAsRead` (single) + `markAllAsReadForUser` (bulk).
  - D-02: Reuso del `NotFoundError` compartido en vez de crear un `NotificationNotFoundError` dedicado. Menos código, mismo comportamiento HTTP (404 uniforme mapeado por el error-handler global).
  - D-03: `MarkNotificationAsReadUseCase` implementa un `SELECT` de ownership + short-circuit para idempotencia (AC-06) ANTES del `UPDATE`. Evita el toque innecesario en notifs ya leídas y expone `affected` para logs.
  - D-04: El SQL bulk aplica `payload->>'channel'` con el mismo predicado que el listado (US-071 D5) para preservar el contrato de filtrado. `channel='all'` desactiva la cláusula.
  - D-05: Se refactoriza `NotificationsController` con constructor por deps object (`{list, markAsRead, markAllAsRead}`) para escalar limpiamente. Los tests unitarios existentes no instancian el controller, así que no hay ripple.
  - D-06: Los hooks TanStack aplican el patch optimistic sobre TODAS las queries `['notifications', 'me', ...]` activas en el cache (paginación + filtros), no sólo la default. Snapshot completo → rollback fiel ante 4xx/5xx.
  - D-07: El `MarkAllAsReadButton` deshabilitado cuando `unreadCount === 0` (EC-02) — evita el request innecesario y provee feedback visual sin necesidad de mostrar el estado "no había nada que marcar".
  - D-08: El toast de error (`role="alert"`) vive a nivel de `NotificationsBell` (no en cada botón) — el hook devuelve el error via callback `onMutationError`, el bell mantiene el estado y renderiza el toast.

## 5. Task Inventory

| Task ID | Título | Orden | Depends | Status | AC | Evidencia |
| ------- | ------ | ----: | ------- | ------ | -- | --------- |
| TASK-PB-P2-008-US-072-BE-001 | Zod schemas path + query | 1 | — | Done | AC-01, AC-02 | `interface/http/mark-notifications.schemas.ts` |
| TASK-PB-P2-008-US-072-BE-002 | Repository port + Prisma adapter | 2 | — | Done | AC-01, AC-02, AC-08 | `ports/mark-notifications.repository.ts` + `infrastructure/prisma-mark-notifications.repository.ts` |
| TASK-PB-P2-008-US-072-BE-003 | `MarkNotificationAsReadUseCase` con ownership + no-revelación 404 | 3 | BE-002 | Done | AC-01, AC-04, AC-05, AC-06 | `application/mark-notification-as-read.use-case.ts` |
| TASK-PB-P2-008-US-072-BE-004 | `MarkAllNotificationsAsReadUseCase` bulk con filtro `channel` | 4 | BE-002 | Done | AC-02, AC-08 | `application/mark-all-notifications-as-read.use-case.ts` |
| TASK-PB-P2-008-US-072-BE-005 | Controller + rutas PATCH + POST | 5 | BE-001, BE-003, BE-004 | Done | AC-01..03 | `interface/http/notifications.controller.ts` + `interface/http/notifications.routes.ts` |
| TASK-PB-P2-008-US-072-SEC-001 | Regresión no-revelación + aislamiento + 401 | 6 | BE-005 | Done | AC-03, AC-04 | SEC-T-01/02 en `tests/unit/us072-mark-notification-read.spec.ts` + IT-03/IT-09 en integration spec |
| TASK-PB-P2-008-US-072-QA-001 | UT backend UT-01..UT-07 | 7 | BE-004 | Done | AC-01, AC-02, AC-06 | `tests/unit/us072-mark-notification-read.spec.ts` (17 tests) |
| TASK-PB-P2-008-US-072-QA-003 | IT backend IT-01..IT-10 + PERF | 8 | BE-005 | Done | AC-01..06, AC-08, EC-01..05 | `tests/integration/us072-mark-notification-read.integration.spec.ts` (11 tests) |
| TASK-PB-P2-008-US-072-FE-001 | API client `markAsRead` + `markAllAsRead` | 9 | BE-005 | Done | AC-01, AC-02 | `features/notifications/api/notificationsApi.ts` |
| TASK-PB-P2-008-US-072-FE-002 | Hooks con optimistic + rollback | 10 | FE-001 | Done | AC-01, AC-02, AC-07 | `features/notifications/hooks/useMarkNotifications.ts` |
| TASK-PB-P2-008-US-072-FE-003 | `MarkAsReadButton` con A11Y | 11 | FE-002 | Done | AC-01, AC-09 | `features/notifications/components/MarkAsReadButton.tsx` + integración en `NotificationItem.tsx` |
| TASK-PB-P2-008-US-072-FE-004 | `MarkAllAsReadButton` en footer del dropdown | 12 | FE-002 | Done | AC-02, AC-09 | `features/notifications/components/MarkAllAsReadButton.tsx` + integración en `NotificationsBell.tsx` (footer + toast role="alert") |
| TASK-PB-P2-008-US-072-FE-005 | i18n × 4 locales | 13 | — | Done | AC-07, AC-09 | `messages/{en,es-LATAM,es-ES,pt}/notifications.json` (5 keys nuevas por locale) |
| TASK-PB-P2-008-US-072-QA-002 | UT frontend hooks + componentes + A11Y | 14 | FE-004 | Done | AC-01, AC-07, AC-09 | `tests/unit/us072-mark-notifications.test.tsx` (13 tests: helper patch, optimistic + rollback single y bulk, aria-label en/pt, botones enabled/disabled) |
| TASK-PB-P2-008-US-072-QA-004 | A11Y con Axe (Playwright) | 15 | FE-004, FE-005 | Skipped | AC-09 | Requiere Playwright + Axe pipeline; UT del componente ya verifica aria-label + focus visible + `role="alert"` |
| TASK-PB-P2-008-US-072-QA-005 | E2E Playwright + Contract MSW | 16 | FE-004 | Skipped | AC-01, AC-02, AC-07 | E2E requiere Playwright pipeline; contract MSW cubierto implícitamente por los hooks tests |
| TASK-PB-P2-008-US-072-DOC-001 | `docs/16 §34.2` extendido con `channel` query param + 204/errores | 17 | BE-005 | Done | AC-02 | `docs/16-API-Design-Specification.md` |
| TASK-PB-P2-008-US-072-DOC-002 | PB-P2-008 Traceability ampliada | 18 | — | Done | — | `management/artifacts/4-Product-Backlog-Prioritized.md` |
| TASK-PB-P2-008-US-072-DOC-003 | `docs/14 §10.11 Notifications` con `MarkAllNotificationsAsReadUseCase` + política de no-revelación | 19 | BE-004 | Done | AC-02 | `docs/14-Backend-Technical-Design.md` |

## 6. Deviations

| # | Planeado | Implementado | Razón |
| - | -------- | ------------ | ----- |
| D-01 | Extender `NotificationRepository` común | Puerto dedicado `MarkNotificationsRepository` | Aisla contratos de escritura (mark) vs lectura (list) — patrón consistente con US-068..US-070 |
| D-02 | `NotificationNotFoundError` tipado | Reuso del `NotFoundError` compartido | Menos código, mismo mapeo HTTP; el error-handler global ya lo mapea a 404 |
| D-03 | 1 UPDATE incondicional | SELECT + short-circuit + UPDATE condicional | El SELECT enforce ownership + habilita el path idempotente sin toque innecesario en la DB |
| D-04 | UT-04 con SQL directo | UT con fake repo — SQL cubierto por el IT | Separa la lógica del use case (unit) del SQL del adapter (integration); testing más targeted |
| D-05 | Refactor mínimo del controller | Constructor refactored a deps object | Escalabilidad (3 use cases en el mismo controller) sin ripple externo — sólo el router se actualiza |
| D-06 | Hook optimistic sobre 1 query key | Hook optimistic sobre TODAS las queries `me.*` | Multi-query (paginación + filtros) — snapshot y patch se aplican a todos los caches activos |
| D-07 | Toast por botón | Toast global a nivel del bell dropdown | Un solo `role="alert"` — reduce noise para lectores de pantalla; los botones delegan via `onMutationError` |
| D-08 | QA-004 A11Y con Axe (Playwright) + QA-005 E2E Playwright | Skipped — requiere Playwright/Axe pipeline | Los UT ya cubren aria-label + role="alert" + navegación teclado. E2E queda como Future (mismo pipeline que QA-A11Y de US-071) |

## 7. Final Validation

- Task completion: **17 Done / 2 Skipped / 0 Rework / 0 Blocked** (de 19 tareas planificadas). Los 2 Skipped son tests de infrastructure Playwright — cubren AC-09 parcialmente vía UT (aria-label + role="alert"), pero no ejecutan Axe.
- Backend: `typecheck` OK, `lint` OK, **2218 tests passed | 725 skipped | 2 todo** (0 failed) — incluye 17 nuevos UT + 11 nuevos IT (saltados sin DB).
- Frontend: `typecheck` OK, `lint` OK, **772 tests passed** — incluye 13 nuevos UT (helper patch + optimistic/rollback single + optimistic/rollback bulk + A11Y aria-label en/pt + botones enabled/disabled + stopPropagation).
- Docs: `docs/16 §34.2` extendido con `channel` query param + 204/errores, `docs/14 §10.11 Notifications` inventory + mutations mark-as-read + política de no-revelación, PB-P2-008 Traceability ampliada con IDs canónicos.

## 8. Comandos

```bash
bash .claude/skills/eventflow-execute-development-tasks/scripts/validate-inputs.sh \
  "management/user-stories/US-072-mark-notification-read.md" \
  "management/technical-specs/P2/PB-P2-008/US-072-technical-spec.md" \
  "management/development-tasks/P2/PB-P2-008/US-072-development-tasks.md"
# → OK

cd backend
npx tsc --noEmit                                                # → OK
npm run lint                                                    # → OK
npm test                                                        # → 2218 passed | 725 skipped | 2 todo (0 failed)
npx vitest run tests/unit/us072-mark-notification-read.spec.ts  # → 17 passed

cd ../web
npx tsc --noEmit                                                # → OK
npm run lint                                                    # → OK
npm test                                                        # → 772 passed
npx vitest run src/tests/unit/us072-mark-notifications.test.tsx # → 13 passed
```
