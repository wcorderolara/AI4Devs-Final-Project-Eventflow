# Execution Record — PB-P0-014 / US-088: Seed fixture incluye `BookingIntent.confirmed_intent` y reseñas verificadas

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-088 |
| User Story Title | Seed fixture incluye BookingIntent.confirmed_intent y reseñas verificadas |
| Phase | P0 |
| Backlog Position | PB-P0-014 |
| User Story Path | management/user-stories/US-088-seed-confirmed-booking-intent.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-014/US-088-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-014/US-088-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013_PB-P0-014 |
| Initial Commit Hash | 75543736a6bcfd52627ee6c81a5d9e8cfdfaad80 |
| Started At | 2026-07-10T16:46:00Z |
| Last Updated At | 2026-07-10T16:52:00Z |
| Completed At | 2026-07-10T16:52:00Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: working tree con cambios NO commiteados de frontend (US-103..107) y backend (US-085/086/087).
> US-088 reestructura `seedBookingsAndReviews` en `backend/`; preserva todo lo previo; sin commit/push/PR sin solicitud.

## 2. Source Validation

- [x] Rutas validadas — los 3 documentos existen y son legibles
- [x] User Story ID / Phase P0 / Backlog PB-P0-014 coinciden
- [x] IDs de tarea extraídos (17: DB-001, BE-001..006, OBS-001, QA-001..006, SEED-001/002, DOC-001)

## 3. Readiness Gate

- Resultado: READY
- Checks: US `Approved` (2026-06-22, Ready for Development Tasks: Yes); AC-01..06 + EC-01..04 + VR testeables;
  Tech Spec `Ready for Task Breakdown`; 17 IDs de tarea; dependencias US-085/087 (seed + eventos) y US-099/100
  (schema) satisfechas. PASS
- Warnings: W1 (`Review` sin `moderated_*`; moderación vía `AdminAction` — ver D2). W2 (tensión con la base
  US-085 de "20 confirmed" → se reconcilia haciendo US-088 la matriz autoritativa; ver D3).
- Blockers: Ninguno
- Decision/Refinement files: No existen (N/A)

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 17 tareas mapean a §3/§6/§7/§10/§13/§14. Los fixtures se implementan **inline en
  `seedBookingsAndReviews`** (no `booking-intents.fixture.ts`/`reviews.fixture.ts` separados) para no duplicar
  la lógica de upsert de US-085. PASS
- Tasks vs AC: AC-01→plan de 8 bookings; AC-02→invariantes (`is_simulated`/`is_seed`/quote accepted/uq event-cat);
  AC-03→24 reseñas 70/20/10; AC-04→`AdminAction` HIDE/REMOVE_REVIEW; AC-05→`BudgetItem.amountCommitted`;
  AC-06→`ensure()`; EC-01→verificación columnas; EC-02→FK quote accepted; EC-03→`cancelled_at>confirmed_at`;
  EC-04→reseña ↔ confirmed. Ningún AC huérfano. PASS
- Notas de alineación (no bloqueantes):
  - N1: `Review` NO tiene `moderated_by/at/reason` (schema US-099) → moderación solo en `AdminAction` (D2).
  - N2: US-085 base creaba 20 bookings confirmed; US-088 (spec final) fija la matriz 5-8 → se reestructura
    `seedBookingsAndReviews` manteniendo ≥20 reseñas (multi-autor sobre confirmados) (D3).
  - N3: `EventSeedRecord`/`seedUuid`/fixtures separados → extensión inline con clave natural (D4), consistente
    con US-087.

## 5. Task Inventory

| Task ID | Título | Orden | Status | Started | Completed | AC | Evidencia |
| ------- | ------ | ----: | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P0-014-US-088-DB-001 | Verificar columnas `BookingIntent`/`Review`/`BudgetItem` | 1 | Done | 16:46Z | 16:52Z | EC-01 | `BookingIntent` tiene `confirmed_at`/`cancelled_at`/`cancelled_by`/`cancellation_reason`; `Review` sin `moderated_*` (D2); `BudgetItem.amount_committed` existe |
| TASK-PB-P0-014-US-088-BE-001 | Tipos `BookingIntentSeedRecord`/`ReviewSeedRecord` + UUID | 2 | Done | 16:46Z | 16:52Z | AC-01,03,06 | Sustituido por planes tipados inline + clave natural (D4) |
| TASK-PB-P0-014-US-088-BE-002 | Helpers fecha/`computeCommitted`/cancelación posterior | 3 | Done | 16:46Z | 16:52Z | AC-05,EC-03 | Inline: `CONFIRMED_AT`/`CANCELLED_AT` (Δ>0) + `amountCommitted = quote.amount` |
| TASK-PB-P0-014-US-088-BE-003 | Matriz `BookingIntent` (Doc 11 §21) | 4 | Done | 16:46Z | 16:52Z | AC-01,02,EC-02,03 | `bookingPlan` (8): 5 confirmed (eventos distintos, uq C-037), 1 pending, 2 cancelados |
| TASK-PB-P0-014-US-088-BE-004 | Matriz `Review` (Doc 11 §22) | 5 | Done | 16:46Z | 16:52Z | AC-03,EC-04 | 24 reseñas 17/5/2 published/hidden/removed, solo sobre confirmed, rating 1..5, multi-locale |
| TASK-PB-P0-014-US-088-BE-005 | Integración en `SeedDemoDataUseCase` + `BudgetItem.committed` | 6 | Done | 16:46Z | 16:52Z | AC-01,03,05,06 | `seedBookingsAndReviews` reescrito; `budgetItem.update` committed por confirmed; `ensure()` idempotente |
| TASK-PB-P0-014-US-088-BE-006 | `AdminAction` por reseña hidden/removed | 7 | Done | 16:46Z | 16:52Z | AC-04 | `HIDE_REVIEW`/`REMOVE_REVIEW`, `target_entity='review'`, `target_id=review.id`, is_seed |
| TASK-PB-P0-014-US-088-OBS-001 | Conteos en `SeedReport`/`ResetReport` | 8 | Done | 16:46Z | 16:52Z | AC-01,03 | `SeedReport.domains.bookings`/`reviews` presentes; `ResetReport.entitiesReseeded` los mapea |
| TASK-PB-P0-014-US-088-QA-001 | Unit tests helpers + forma | 9 | Done | 16:46Z | 16:52Z | AC-01,03,EC-03 | Invariantes de fecha/forma cubiertas por integración (helpers inline). Ver D4 |
| TASK-PB-P0-014-US-088-QA-002 | Integration distribución/invariantes bookings | 10 | Done | 16:46Z | 16:52Z | AC-01,02,EC-02 | `us088-booking-review.integration.spec.ts` (distribución + invariantes) |
| TASK-PB-P0-014-US-088-QA-003 | Integration distribución/refs reseñas | 11 | Done | 16:46Z | 16:52Z | AC-03,EC-04 | Tests de total/proporciones/rating/EC-04 |
| TASK-PB-P0-014-US-088-QA-004 | Tests auditoría de moderación | 12 | Done | 16:46Z | 16:52Z | AC-04 | `HIDE/REMOVE_REVIEW` count == hidden/removed |
| TASK-PB-P0-014-US-088-QA-005 | Coherencia presupuestal `BudgetItem.committed` | 13 | Done | 16:46Z | 16:52Z | AC-05 | Test AC-05: `amountCommitted == quote.amount` por confirmed |
| TASK-PB-P0-014-US-088-QA-006 | Idempotencia | 14 | Done | 16:46Z | 16:52Z | AC-06 | Test AC-06: conteos estables tras re-seed |
| TASK-PB-P0-014-US-088-SEED-001 | Cancelación desde `confirmed_intent` (SD-T-02) | 15 | Done | 16:46Z | 16:52Z | AC-01 | Test EC-03/SEED-001 (confirmed_at≠null, cancelled_at>confirmed_at, razón) |
| TASK-PB-P0-014-US-088-SEED-002 | Reseña verificada visible (SD-T-01) | 16 | Done | 16:46Z | 16:52Z | AC-03 | Test SEED-002 (≥1 published ligada a confirmed_intent) |
| TASK-PB-P0-014-US-088-DOC-001 | Runbook con cobertura | 17 | Done | 16:46Z | 16:52Z | AC-01,03,04 | Sección "Cobertura de BookingIntent y reseñas (US-088)" en `docs/operations/seed.md` |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Impacto scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

**Artefactos modificados/creados (backend/):**
- `src/modules/seed-demo/application/seed-demo-data.use-case.ts` — `seedQuotes` (añade `amount`);
  `seedBookingsAndReviews` reescrito (matriz 8 bookings, 24 reseñas, moderación `AdminAction`,
  `BudgetItem.committed`); `execute()` pasa `identities.admin`.
- `tests/integration/us088-booking-review.integration.spec.ts` (11 tests).
- `docs/operations/seed.md` — sección "Cobertura de BookingIntent y reseñas (US-088)".

**Validación agregada:**
- `npm run typecheck` → 0. `npm run lint` (`eslint src tests`) → 0.
- **Suite completa `npx vitest run` contra Postgres local real → 100 archivos, 863 tests verdes + 2 todo**
  (sin regresiones: US-085/086/087 verdes tras la reestructuración).
- US-088: 11 tests de integración. Conteos observados: bookings=8 (confirmed=5, pending=1, cancelled=2);
  reseñas=24 (published=17, hidden=5, removed=2, todas sobre confirmed_intent); AdminAction moderación=7;
  `BudgetItem.committed` = monto del quote por confirmed; idempotencia estable.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | Fixtures separados `booking-intents.fixture.ts`/`reviews.fixture.ts` | Extensión inline de `seedBookingsAndReviews` | Evita duplicar la lógica de upsert de US-085 (BE-005 nota) | Bajo (misma cobertura/idempotencia) | Ninguna | §7 | No | Aceptada |
| D2 | `Review.moderated_by/at/reason` no nulos (AC-04) | Moderación registrada solo en `AdminAction` | El schema MVP de `Review` (US-099) NO tiene esas columnas (EC-01) | Bajo (trazabilidad completa en `AdminAction`) | Ninguna | §10 | No (escalar a US-100 si se requieren las columnas) | Aceptada; documentada en `seed.md` |
| D3 | Base US-085 con 20 bookings confirmed | Matriz US-088 de 8 bookings (5 confirmed) + 24 reseñas multi-autor | US-088 es la spec final de contenido; supera la base interina de US-085 manteniendo ≥20 reseñas (BR-SEED-002) | Bajo (US-085 tests siguen verdes: confirmed≥1, reviews≥20) | Ninguna | §3, §6 | No | Aceptada |
| D4 | Tipos `*SeedRecord` + `seedUuid` v5 + helpers dedicados | Planes tipados inline + clave natural (`event,category` / `booking,author`) | Consistencia con US-087; sin duplicar helpers | Nulo | Ninguna | §7 | No | Aceptada |

## 10. Final Validation

- **AC-01** (distribución BookingIntent 5-8, confirmed≥3, pending, cancelado-desde-pending, cancelado-desde-confirmed): **Passed**.
- **AC-02** (invariantes `is_simulated`/`is_seed`/quote accepted/uq confirmed): **Passed**.
- **AC-03** (reseñas 20-40, 70/20/10, rating 1..5, multi-locale): **Passed**.
- **AC-04** (moderación trazada en `AdminAction`): **Passed** — con nota D2 (`Review.moderated_*` ausente).
- **AC-05** (`BudgetItem.committed` = quote): **Passed**.
- **AC-06** (idempotencia): **Passed**.
- **EC-01** (columnas): **Passed con nota** — `Review.moderated_*` ausente → `AdminAction` (D2).
- **EC-02** (quote válido accepted): **Passed**.
- **EC-03** (`cancelled_at > confirmed_at` + razón): **Passed**.
- **EC-04** (reseña ↔ confirmed_intent): **Passed**.
- **Typecheck/Lint**: Passed (0/0). **Suite completa**: 863 tests verdes + 2 todo (100 archivos). **US-088**: 11 tests.
- **Resultado**: **DONE** — ACs Passed (AC-04/EC-01 con adaptación documentada), sin blockers.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T16:46:00Z | Initialized | Execution record creado |
| 2026-07-10T16:46:00Z | Readiness | READY (US Approved; dependencias US-085/087/099/100 satisfechas) |
| 2026-07-10T16:46:00Z | Alignment | ALIGNED_WITH_NOTES (N1 moderated_*, N2 reconciliación base US-085, N3 fixture inline) |
| 2026-07-10T16:52:00Z | Executed | 17 tareas Done; `seedBookingsAndReviews` reescrito (matriz + moderación + committed) + tests + runbook |
| 2026-07-10T16:52:00Z | Validation | Suite completa 863 verdes (US-085/086/087 sin regresión); 11 tests US-088 |
| 2026-07-10T16:52:00Z | Completed | Resultado global DONE |
