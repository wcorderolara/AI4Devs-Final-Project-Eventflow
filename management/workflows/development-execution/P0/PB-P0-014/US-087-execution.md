# Execution Record — PB-P0-014 / US-087: Seed fixture garantiza mix de eventos `draft`/`active`/`completed`/`cancelled`

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-087 |
| User Story Title | Seed fixture garantiza mix de eventos draft/active/completed/cancelled |
| Phase | P0 |
| Backlog Position | PB-P0-014 |
| User Story Path | management/user-stories/US-087-seed-event-mix.md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-014/US-087-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-014/US-087-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | last-modified 2026-07-08 |
| Execution Record Status | Done |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | foundation/PB-PO-012_PB-P0-013_PB-P0-014 |
| Initial Commit Hash | 75543736a6bcfd52627ee6c81a5d9e8cfdfaad80 |
| Started At | 2026-07-10T16:40:00Z |
| Last Updated At | 2026-07-10T16:44:30Z |
| Completed At | 2026-07-10T16:44:30Z |
| Claude Session ID | b6f01256-49aa-46ca-a9c2-90b96c289f27 |
| Executor Type | Claude Code |

> Git Safety: working tree con cambios NO commiteados de frontend (US-103..107) y backend (US-085/086).
> US-087 extiende `seedEvents` en `backend/`; preserva todo lo previo; sin commit/push/PR sin solicitud.

## 2. Source Validation

- [x] Rutas validadas — los 3 documentos existen y son legibles
- [x] User Story ID coincide — US-087
- [x] Phase P0 / Backlog PB-P0-014 coinciden
- [x] IDs de tarea extraídos (11: DB-001, BE-001..004, QA-001..004, SEED-001, DOC-001)

## 3. Readiness Gate

- Resultado: READY
- Checks: US `Approved` (2026-06-22, Ready for Development Tasks: Yes); AC-01..05 + EC-01..03 + VR-01..06
  testeables; Tech Spec `Ready for Task Breakdown`; Tasks con 11 IDs; dependencias US-085 (seed) y
  US-099/100 (schema) satisfechas. PASS
- Warnings: W1 (schema sin `cancelled_reason` → EC-01 aplica; se adapta con `notes`, ver D1).
- Blockers: Ninguno
- Decision/Refinement files: No existen (N/A)

## 4. Alignment Gate

- Resultado: ALIGNED_WITH_NOTES
- Tasks vs Tech Spec: 11 tareas mapean a §6/§7/§10/§13. El fixture se implementa **inline en `seedEvents`**
  (no un `events.fixture.ts` separado) para no duplicar la lógica de upsert de US-085 (BE-004 nota). PASS
- Tasks vs AC: AC-01→plan default; AC-02→autoCompleted + `relativeSeedDate(-2)`; AC-03→currency/language por
  paridad; AC-04→organizador ancla; AC-05→`ensure()` idempotente; EC-01→verificación de columnas; EC-02→SEED-001;
  EC-03→`relativeSeedDate`. Ningún AC huérfano. PASS
- Notas de alineación (no bloqueantes):
  - N1: `Event` no tiene columna `cancelled_reason` (schema US-099); la traza va en `notes` (D1).
  - N2: `Currency`/`Language` son enums (no tablas) → VR-03/VR-04 son N/A (siempre válidos), consistente
    con US-085 D1.
  - N3: `EventSeedRecord`/`seedUuid`/`events.fixture.ts` propuestos en tasks se sustituyen por la extensión
    inline de `seedEvents` con claves naturales por `title` (D2).

## 5. Task Inventory

| Task ID | Título | Orden | Status | Started | Completed | AC | Evidencia |
| ------- | ------ | ----: | ------ | ------- | --------- | -- | --------- |
| TASK-PB-P0-014-US-087-DB-001 | Verificar columnas `auto_completed`/`completed_at`/`cancelled_reason` | 1 | Done | 16:40Z | 16:44Z | EC-01 | `auto_completed`/`completed_at` existen; `cancelled_reason` NO existe → se usa `notes` (D1) |
| TASK-PB-P0-014-US-087-BE-001 | Tipo `EventSeedRecord` + UUID determinista | 2 | Done | 16:40Z | 16:44Z | AC-01,05 | Sustituido: plan tipado + clave natural `title` (idempotencia por `ensure()`). Ver D2 |
| TASK-PB-P0-014-US-087-BE-002 | Fixture con la matriz (estados/currency/locale/tipos) | 3 | Done | 16:40Z | 16:44Z | AC-01,02,03,04 | `seedEvents` extendido: plan completed×3/active×5/draft×2/cancelled×2, currency/language por paridad |
| TASK-PB-P0-014-US-087-BE-003 | Fecha relativa `event_date = hoy − 2 días` | 4 | Done | 16:40Z | 16:44Z | AC-02,EC-03 | `relativeSeedDate(daysOffset)` (UTC, dinámico); unit test verde |
| TASK-PB-P0-014-US-087-BE-004 | Integración en `SeedDemoDataUseCase` (upsert idempotente) | 5 | Done | 16:40Z | 16:44Z | AC-01,04,05 | Inline en `seedEvents` con `ensure()` por `title`+`isSeed` |
| TASK-PB-P0-014-US-087-QA-001 | Unit tests fixture + helpers | 6 | Done | 16:40Z | 16:44Z | AC-01,02,EC-03 | `us087-event-mix.spec.ts` (3 tests) verde |
| TASK-PB-P0-014-US-087-QA-002 | Integration por estado/currency/locale/tipos | 7 | Done | 16:40Z | 16:44Z | AC-01,02,03,04 | `us087-event-mix.integration.spec.ts` (8 asserts AC) verde |
| TASK-PB-P0-014-US-087-QA-003 | Integration idempotencia | 8 | Done | 16:40Z | 16:44Z | AC-05 | `groupBy` estable tras re-seed (test AC-05) |
| TASK-PB-P0-014-US-087-QA-004 | Coherencia con `AutoCompleteEventsJob` | 9 | Done | 16:40Z | 16:44Z | AC-02 | Cubierto por el test del evento `active` con `event_date=hoy−2` (el job es historia futura). Ver D3 |
| TASK-PB-P0-014-US-087-SEED-001 | Coexistencia con `is_seed=false` | 10 | Done | 16:40Z | 16:44Z | EC-02 | Test EC-02/SEED-001: evento operativo `is_seed=false` sobrevive al re-seed |
| TASK-PB-P0-014-US-087-DOC-001 | Runbook con cobertura del fixture | 11 | Done | 16:40Z | 16:44Z | AC-01,02,03 | Sección "Cobertura de eventos (US-087)" en `docs/operations/seed.md` |

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón | Necesidad | Impacto scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----- | --------- | ------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

**Artefactos modificados/creados (backend/):**
- `src/modules/seed-demo/application/seed-demo-data.use-case.ts` — helper `relativeSeedDate` (exportado) +
  `seedEvents` extendido (plan de estados, currency/language, autoCompleted, event_date dinámico, notes).
- `tests/unit/us087-event-mix.spec.ts` (3) + `tests/integration/us087-event-mix.integration.spec.ts` (10).
- `docs/operations/seed.md` — sección "Cobertura de eventos (US-087)".

**Validación agregada:**
- `npm run typecheck` → 0. `npm run lint` → 0 (verificado en el gate final conjunto).
- US-087: 3 unit + 10 integración verdes contra Postgres local real.
- Regresión US-085: 7/7 integración verdes (sin romper volúmenes/idempotencia/is_seed).
- Conteos observados: draft=2, active=5, completed=3, cancelled=2 (total 12); ≥1 auto_completed;
  ≥1 active con `event_date=hoy−2`; GTQ+USD; es_LATAM+en; ≥4 tipos; organizador ancla con los 4 estados.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| — | — | — | Ninguno | — | — | — | — |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| D1 | Evento cancelado con `cancelled_reason` no nulo (AC-01/VR-06) | Traza de cancelación en `Event.notes` | El schema MVP (US-099) NO tiene columna `cancelled_reason`; migraciones nuevas son de US-100 (EC-01) | Bajo (traza preservada; QA valida `notes` no nulo) | Ninguna | §10 | No (escalar a US-100 si se requiere la columna) | Aceptada; documentada en `seed.md` |
| D2 | `events.fixture.ts` + `EventSeedRecord` + `seedUuid` (v5) | Extensión inline de `seedEvents` con clave natural `title`+`isSeed` | Evita duplicar la lógica de upsert de US-085 (BE-004 nota "coordinar para no duplicar") | Bajo (misma cobertura e idempotencia) | Ninguna | §7 | No | Aceptada |
| D3 | Test de coherencia ejecutando `AutoCompleteEventsJob` | Verificado el dato de entrada (`active` con `event_date=hoy−2`) | El job pertenece a una historia futura (PB-P1-009); US-087 solo garantiza el fixture consumible | Nulo | Ninguna | §13 | No | Aceptada; QA-004 = verificación del dato |

## 10. Final Validation

- **AC-01** (distribución + total 10–15): **Passed**.
- **AC-02** (auto_completed + cercano a auto-completar dinámico): **Passed**.
- **AC-03** (multi-currency GTQ/USD, multi-locale es-LATAM/en, ≥4 tipos): **Passed**.
- **AC-04** (organizador is_seed + ancla con los 4 estados): **Passed**.
- **AC-05** (idempotencia por estado): **Passed**.
- **EC-01** (columnas requeridas): **Passed con nota** — `cancelled_reason` ausente → `notes` (D1).
- **EC-02** (coexistencia is_seed=false): **Passed**.
- **EC-03** (fecha relativa dinámica): **Passed**.
- **Typecheck/Lint**: Passed (0/0). **Tests**: 13 (3 unit + 10 integración). **Regresión US-085**: verde.
- **Resultado**: **DONE** — ACs Passed (EC-01 con adaptación documentada), sin blockers.

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-10T16:40:00Z | Initialized | Execution record creado |
| 2026-07-10T16:40:00Z | Readiness | READY (US Approved; dependencias satisfechas) |
| 2026-07-10T16:40:00Z | Alignment | ALIGNED_WITH_NOTES (N1 cancelled_reason, N2 enums, N3 fixture inline) |
| 2026-07-10T16:44:30Z | Executed | 11 tareas Done; `seedEvents` extendido + tests + runbook. Typecheck/lint 0; 13 tests verdes; US-085 sin regresión |
| 2026-07-10T16:44:30Z | Completed | Resultado global DONE |
