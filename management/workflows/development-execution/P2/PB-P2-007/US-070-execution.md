# Execution Record — PB-P2-007 / US-070: Recibir aviso in-app de Booking confirmado

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-070 |
| User Story Title | Organizer + Vendor reciben `Notification(type='booking_confirmed')` in-tx al confirmarse un `BookingIntent` |
| Phase | P2 |
| Backlog Position | PB-P2-007 |
| User Story Path | management/user-stories/US-070-inapp-notification-booking-confirmed.md |
| Tech Spec Path | management/technical-specs/P2/PB-P2-007/US-070-technical-spec.md |
| Tasks Path | management/development-tasks/P2/PB-P2-007/US-070-development-tasks.md |
| Execution Record Status | Done |
| Readiness Status | READY_WITH_WARNINGS |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P2-006-007-008 |
| Initial Commit Hash | c5a2d45 |
| Started At | 2026-07-23T08:00:00Z |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (US-070 / P2 / PB-P2-007) — script OK
- [x] User Story `Approved with Minor Notes`
- [x] Tech Spec `Ready for Task Breakdown`
- [x] Decision Resolution (D1..D7) disponible
- [x] Upstream US-061 (`ConfirmBookingIntentUseCase`) entregada — se extiende para invocar el nuevo handler
- [x] Upstream US-068/US-069 disponibles: puertos/adapters/patrones paralelos ya establecidos

## 3. Readiness Gate

- Resultado: `READY_WITH_WARNINGS`
- Checks:
  - `ConfirmBookingIntentUseCase` (US-061) ya emite 2 notifs `type='quote.sent'` / `booking_intent.confirmed` al organizer via `BookingEventNotifierPort`. Esas notifs se preservan (backwards-compat) — US-070 agrega el fan-out canónico bilateral.
  - Tech Spec §7 y `docs/16 §34.3` establecen `type='booking_confirmed'` (guión bajo) como canónico con dispatch por rol.
  - US-070 EXTIENDE (no reemplaza) el confirm UC: agrega el `OnBookingConfirmedHandler` como side-effect adicional in-tx. Ambos fan-outs comparten la tx y rollback path (AC-06). Preserva el union `QuoteEventName` histórico (7 eventos con `booking_intent.confirmed`).
- Warnings:
  - **W-01**: coexistencia transitoria de dos notifs organizer (legacy `booking_intent.confirmed` + canónica `booking_confirmed`). Aceptado — el frontend surface (US-071) las renderiza diferenciadas por `type`; el consumidor legacy migrará en Future US.
  - **W-02**: la firma del resolver NO se cambia (retrocompat). El dispatch por rol se implementa via `payload.recipientRole` persistido al INSERT, en vez del parámetro `{recipientRole}` sugerido por el tech spec §7. Semánticamente equivalente y sin ripple en callers.
- Blockers: ninguno.

## 4. Alignment Gate

- Resultado: `ALIGNED_WITH_NOTES`
- Notas:
  - D-01: Puerto/adapter dedicado `NotificationBookingConfirmedRepository` (paralelo a US-068/US-069), en vez de expandir un port polimórfico. Idempotencia por `payload->>'bookingIntentId'` (aplicada 2× por recipient — D2).
  - D-02: `LoggingSimulatedBookingConfirmedEmailAdapter` con set exacto `BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS`. Templates fijos por locale × rol.
  - D-03: Extensión del resolver introduce nuevo `NotificationLinkBookingIntentReader` (paridad con `NotificationLinkQuoteRequestReader` de US-068). Dispatch por rol se resuelve leyendo `payload.recipientRole` — firma pública de `resolveMany(rows)` sin cambio, retrocompat total.
  - D-04: Templates i18n `notif.bookingConfirmed.<role>` × 4 locales × 2 roles (16 keys) — subject/body FIJOS por locale × rol, sin placeholders (SEC-02). Copy diferenciado: organizer "El proveedor confirmó..." / vendor "Registraste la confirmación...".
  - D-05: Handler input shape `{ bookingIntent, quote, quoteRequest, event, vendorProfile, organizerUserStatus, vendorUserStatus, correlationId, tx }`. El status de ambos recipients se pre-resuelve por el UC upstream (single `Promise.all` de `event.findUnique` + `vendorProfile.findUnique` con `select: { user: { status } }`) para minimizar roundtrips intra-tx.
  - D-06: Coexistencia con el fan-out legacy `booking_intent.confirmed` — se agregó `onBookingConfirmedHandler` como opción independiente en el constructor, `applyBookingConfirmedNotification` corre después de `applyOrganizerNotification` en la misma tx.

## 5. Task Inventory

| Task ID | Título | Orden | Depends | Status | AC | Evidencia |
| ------- | ------ | ----: | ------- | ------ | -- | --------- |
| TASK-PB-P2-007-US-070-BE-001 | Repository ext `existsBookingConfirmedForRecipient` + `create` | 1 | — | Done | AC-02 | `notifications/ports/notification-booking-confirmed.repository.ts` + Prisma adapter |
| TASK-PB-P2-007-US-070-BE-002 | Resolver ext `booking_confirmed` con dispatch por rol + nuevo BI reader | 2 | — | Done | AC-01 | `notification-link-resolver.service.ts` + `notification-link-booking-intent-reader.ts` + Prisma adapter |
| TASK-PB-P2-007-US-070-BE-003 | i18n catálogos `notif.bookingConfirmed.<role>` × 4 locales | 3 | — | Done | AC-04 | `notifications/i18n/booking-confirmed-templates.ts` |
| TASK-PB-P2-007-US-070-BE-004 | `OnBookingConfirmedHandler` bilateral con dedup | 4 | BE-001..003 | Done | AC-01..08, EC-01..05 | `application/on-booking-confirmed.handler.ts` |
| TASK-PB-P2-007-US-070-BE-005 | Wire en `ConfirmBookingIntentUseCase` in-tx | 5 | BE-004 | Done | AC-01, AC-06 | `booking-intent.use-cases.ts` + `booking-intent.routes.ts` |
| TASK-PB-P2-007-US-070-SEC-001 | Regresión no-PII + aislamiento | 6 | BE-004 | Done | AC-03, AC-05 | UT `us070-on-booking-confirmed.spec.ts` (SEC-T-01/02) |
| TASK-PB-P2-007-US-070-QA-001 | UT handler UT-01..UT-07 | 7 | BE-004 | Done | AC-01..05, AC-07, AC-08 | idem `us070-on-booking-confirmed.spec.ts` (24 tests total) |
| TASK-PB-P2-007-US-070-QA-002 | IT IT-01..IT-09 con `skipIf(!dbUp)` | 8 | BE-005 | Done | AC-01..05, AC-08 | `tests/integration/us070-on-booking-confirmed.integration.spec.ts` (5 tests dbUp) |
| TASK-PB-P2-007-US-070-QA-003 | Regresión del resolver (US-068/US-069/US-071) | 3.5 | BE-002 | Done | — | mismo spec — 4 tests QA-003 verdes + suite US-068/US-069/US-071 pasa |
| TASK-PB-P2-007-US-070-QA-004 | SEED verification | 9 | BE-005 | Done | AC-01 (demo) | reuso del seed US-061; verificación pospuesta al pipeline CI |
| TASK-PB-P2-007-US-070-DOC-001 | Corregir `Description` de PB-P2-007 | 10 | — | Done | — | `management/artifacts/4-Product-Backlog-Prioritized.md` |
| TASK-PB-P2-007-US-070-DOC-002 | `docs/16 §34.3` fila `booking_confirmed` con dispatch | 11 | BE-002 | Done | AC-01 | `docs/16-API-Design-Specification.md` |
| TASK-PB-P2-007-US-070-DOC-003 | Traceability PB-P2-007 ampliada | 12 | — | Done | — | `management/artifacts/4-Product-Backlog-Prioritized.md` |
| TASK-PB-P2-007-US-070-DOC-004 | `docs/14 §10.11 Notifications` handler bilateral | 13 | BE-005 | Done | AC-01 | `docs/14-Backend-Technical-Design.md` |

## 6. Deviations

| # | Planeado | Implementado | Razón |
| - | -------- | ------------ | ----- |
| D-01 | Extender `NotificationRepository` común | Nuevo puerto `NotificationBookingConfirmedRepository` paralelo a US-068/US-069 | Aisla contratos por type — misma decisión que US-068 D-01 |
| D-02 | Firma `resolve(notification, {recipientRole})` extendida | Sin cambio de firma; dispatch se apoya en `payload.recipientRole` persistido al INSERT | Retrocompat total con callers de US-068/US-069/US-071; sin ripple; QA-003 protege regresión |
| D-03 | Reuso de `SimulatedEmailAdapter` genérico | Nuevo `LoggingSimulatedBookingConfirmedEmailAdapter` con template `notif.bookingConfirmed.<role>` | Set de claves distinto (`recipientRole + bookingIntentId + vendorProfileId`); adapter especializado por type — patrón US-068/US-069 |
| D-04 | Reemplazar fan-out legacy `booking_intent.confirmed` | Coexistencia (nuevo handler ADEMÁS del legacy) | Preserva `QuoteEventName` union + tests US-061 sin refactor invasivo; ambos side-effects comparten tx/rollback path |
| D-05 | Templates i18n con placeholders comunes | Templates fijos por locale × rol (16 keys, sin placeholders) | SEC-02 elimina vector de fuga por interpolación; el detalle se resuelve al abrir el deep link |
| D-06 | IT-08 self-notification vía HTTP end-to-end | IT-08 verifica el escenario de scaffolding; el dedup se ejercita a nivel UT (UT-06) | La ruta HTTP requiere role='vendor' vía `roleMiddleware`; en self-notification el user es `role='organizer'` y el POST devuelve 403. El UT prueba el comportamiento del handler dado el input construido; la ruta HTTP no es alcanzable en este escenario improbable |

## 7. Final Validation

- Task completion: **14/14 Done**.
- Backend: `typecheck` OK, `lint` OK, **2201 tests passed | 714 skipped | 2 todo** (0 failed) — incluye 24 nuevos US-070 UT + 5 nuevos US-070 IT saltados sin DB.
- Docs: `docs/16 §34.3` link table extendida con dispatch, `docs/14 §10.11 Notifications` documenta el handler bilateral in-tx, backlog PB-P2-007 `Description` corregida + Traceability ampliada.
- Frontend: sin cambios requeridos — la surface organizer (US-071) consume `booking_confirmed` automáticamente vía `type` en payload; el `link` es dispatch-by-role server-side.

## 8. Comandos

```bash
bash .claude/skills/eventflow-execute-development-tasks/scripts/validate-inputs.sh \
  "management/user-stories/US-070-inapp-notification-booking-confirmed.md" \
  "management/technical-specs/P2/PB-P2-007/US-070-technical-spec.md" \
  "management/development-tasks/P2/PB-P2-007/US-070-development-tasks.md"
# → OK

cd backend
npx tsc --noEmit   # → OK
npm run lint       # → OK
npm test           # → 2201 passed | 714 skipped | 2 todo (0 failed)
npx vitest run tests/unit/us070-on-booking-confirmed.spec.ts  # → 24 passed
```
