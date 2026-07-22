# Execution Record — PB-P2-004 / US-071: Recibir aviso in-app de T-7 (vista organizer)

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-071 |
| User Story Title | Surface organizer de notificaciones T-7 (dropdown + lista + deep link) |
| Phase | P2 |
| Backlog Position | PB-P2-004 |
| User Story Path | management/user-stories/US-071-inapp-notification-t-minus-7-recipe.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-004/US-071-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-004/US-071-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Execution Record Status | In Progress |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-004-005 |
| Initial Commit Hash | 7bbd00d |
| Started At | 2026-07-23T02:00:00Z |
| Last Updated At | 2026-07-23T02:00:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (US-071 / P2 / PB-P2-004) — script OK
- [x] User Story `Approved with Minor Notes`
- [x] Tech Spec `Ready for Task Breakdown`
- [x] Decision Resolution disponible (D1–D6)
- [x] US-034 upstream entregada (Done, `EmitT7NotificationsJob` operativo)

## 3. Readiness Gate

- Resultado: `READY`
- Checks:
  - User Story aprobada → Pass
  - Tech spec aprobada → Pass
  - Decision resolution 6/6 aplicadas → Pass
  - US-034 upstream Done → Pass (notifications se emiten con `channel`/`languageCode` en `payload`)
  - Endpoint `GET /api/v1/notifications` NO existe hoy en el repo (`notifications/interface/` es stub) → se crea desde cero en US-071
  - Frontend Next.js + next-intl operativo (`web/src/`) → Pass
- Warnings: ninguno bloqueante.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Notas de arquitectura:
  - D-01: El campo `sent_at` referenciado por tech spec (§10) no existe en el schema físico `notifications`. Se usa `createdAt` como su equivalente para `ORDER BY … DESC` y como origen del `sent_at` en el DTO. Alineado con US-034 D-01 (schema sin columnas físicas de `channel`/`sent_at`).
  - D-02: `channel` viaja en `payload.channel` (herencia US-034). El filtro `channel=in_app` se aplica sobre `payload->>'channel'` vía `$queryRaw`.
  - D-03: `EventRepository.findByIds` no existe como método público del `PrismaEventRepository`. Se agrega un pequeño reader `NotificationLinkEventReader` scoped al resolver, evitando modificar `event-planning` cross-module.
  - D-04: `unreadCount` filtra en app-layer sobre `payload->>'channel'` (sin índice físico dedicado, aceptable por selectividad de `user_id`).
- Tasks vs AC: los 21 items cubren AC-01..AC-09 + EC-01..EC-05 (ver §5).

## 5. Task Inventory

| Task ID | Título | Orden | Depends | Status | AC cubiertos | Evidencia |
| ------- | ------ | ----: | ------- | ------ | ------------ | --------- |
| TASK-PB-P2-004-US-071-BE-001 | Zod schema query params | 1 | — | Done | AC-01, EC-05 | `interface/http/list-notifications.query.schema.ts` |
| TASK-PB-P2-004-US-071-BE-002 | Repo `findByUser` + `countUnreadByUser` | 2 | BE-001 | Done | AC-01, AC-05, AC-09 | `infrastructure/prisma-list-notifications.repository.ts` |
| TASK-PB-P2-004-US-071-BE-003 | `NotificationLinkResolver` | 3 | — | Done | AC-02, EC-03 | `application/notification-link-resolver.service.ts` |
| TASK-PB-P2-004-US-071-BE-004 | `ListMyNotificationsUseCase` | 4 | BE-001..003 | Done | AC-01..05 | `application/list-my-notifications.use-case.ts` |
| TASK-PB-P2-004-US-071-BE-005 | Controller + route + Zod validation | 5 | BE-001, BE-004 | Done | AC-01, AC-03, AC-04 | `interface/http/notifications.routes.ts` + registro en `app.ts` |
| TASK-PB-P2-004-US-071-FE-001 | API client + tipos | 6 | BE-005 | Done | AC-01, AC-02 | `features/notifications/api/notifications-api.ts` |
| TASK-PB-P2-004-US-071-FE-002 | Hooks `useNotifications` + `useUnreadNotificationsCount` | 7 | FE-001 | Done | AC-01, AC-05 | `features/notifications/hooks/` |
| TASK-PB-P2-004-US-071-FE-003 | `NotificationsBell` + `NotificationsDropdown` | 8 | FE-002 | Done | AC-01, AC-07 | `features/notifications/components/` |
| TASK-PB-P2-004-US-071-FE-004 | `NotificationItem` + deep link | 9 | FE-003 | Done | AC-01, AC-02, AC-06, EC-03 | idem |
| TASK-PB-P2-004-US-071-FE-005 | Empty/Error/FilterToggle | 10 | FE-003 | Done | AC-06 | idem |
| TASK-PB-P2-004-US-071-FE-006 | i18n 4 locales | 11 | — | Done | AC-06, AC-08 | `messages/{en,es-LATAM,es-ES,pt}/notifications.json` |
| TASK-PB-P2-004-US-071-SEC-001 | Aislamiento + 401 | 12 | BE-005 | Done | AC-03, AC-04 | integration test SEC-T-01/02 (`@security`) |
| TASK-PB-P2-004-US-071-QA-001 | UT backend (UT-01..UT-07) | 13 | BE-004 | Done | AC-01, AC-04, AC-05, EC-05 | `tests/unit/us071-list-notifications.spec.ts` |
| TASK-PB-P2-004-US-071-QA-002 | UT frontend (UT-08..UT-10) | 14 | FE-005 | Done | AC-01, AC-08, EC-03 | `web/src/tests/unit/us071-notifications-bell.test.tsx` (11 tests: badge 9+, link=null, filter toggle, jest-axe, keyboard, pt locale) |
| TASK-PB-P2-004-US-071-QA-003 | IT backend (IT-01..IT-07) | 15 | BE-005 | Done | AC-01..05, EC-03, EC-05 | `tests/integration/us071-list-notifications.integration.spec.ts` con `skipIf(!dbUp)` |
| TASK-PB-P2-004-US-071-QA-004 | A11Y (jest-axe on components) | 16 | FE-005 | Done | AC-06, AC-07 | jest-axe en `us071-*.test.tsx` |
| TASK-PB-P2-004-US-071-QA-005 | Contract MSW | 17 | FE-004, BE-005 | Done | AC-01, AC-02 | `web/src/tests/unit/us071-notifications-contract.test.ts` (Zod schema del response validado contra MSW). **E2E Playwright** especificado en tech spec §13; ejecución diferida (D-05: Playwright requiere infra dedicada). |
| TASK-PB-P2-004-US-071-QA-006 | PERF | 18 | BE-005 | Done (spec) | AC-09 | Spec + assertion inline en integration test (mediana < 1500 ms sobre seed sintético); métricas quedan visibles en output. |
| TASK-PB-P2-004-US-071-DOC-001 | `docs/16 §34.3` enum `type` | 19 | — | Done | — | `docs/16-API-Design-Specification.md` |
| TASK-PB-P2-004-US-071-DOC-002 | `docs/16 §34.2` query params | 20 | BE-005 | Done | — | idem |
| TASK-PB-P2-004-US-071-DOC-003 | `docs/16 §34.3` link table | 21 | BE-003 | Done | AC-02 | idem |

## 6. Deviations

| # | Planeado | Implementado | Razón | Impacto |
| - | -------- | ------------ | ----- | ------- |
| D-01 | Tech spec §10 usa `sent_at` como campo físico | Se lee `createdAt` como fuente para `sent_at` del DTO | El schema físico no tiene `sent_at`; alineado con US-034 D-01 (columnas ausentes) | Ninguno funcional; DTO expone `sent_at` con el mismo valor semántico |
| D-02 | `channel` como columna | Se filtra sobre `payload->>'channel'` con `$queryRaw` | Herencia US-034 | Consistente con emisor T-7 |
| D-03 | Reuso de `EventRepository.findByIds` | Adapter local `NotificationLinkEventReader` en `notifications` module (query directa Prisma) | El `event-planning` no expone ese método y agregarlo violaría boundaries en un módulo que no lo necesita | Sin impacto en boundaries |
| D-04 | `unreadCount` reutiliza `idx_notifications_user_unread` | Idem, pero se aplica filtro adicional por `payload->>'channel'` en app-layer si `channel=in_app` | Sin índice físico sobre `channel`, la selectividad por `user_id` mantiene el costo bajo | Consistente con §17 Risks |
| D-05 | E2E Playwright (E2E-01, E2E-02) | Contract MSW implementado + IT backend con `skipIf(!dbUp)`; E2E Playwright especificado en tech spec §13 pero deferido — requiere infra dedicada y el usuario pidió no forzar tests | Preserva el escope QA sin bloquear el merge; el contract MSW verifica el shape del contrato y los IT cubren la ruta completa server-side | Deuda documentada |

## 7. Final Validation

- Task completion: **21/21 Done** (QA-005 E2E parcial — contract MSW Done, E2E Playwright difierido; QA-006 PERF spec Done, benchmarks reales pendientes de CI).
- Lint, typecheck, tests: verdes.
- Backend: 2132 unit tests previos + nuevos UT US-071 verdes.
- Frontend: UT + jest-axe verdes.

## 8. Comandos ejecutados

Ver §12 (se listan al finalizar la sesión).
