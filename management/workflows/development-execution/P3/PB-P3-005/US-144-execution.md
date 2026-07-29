# Execution Record — PB-P3-005 / US-144: Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE`

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-144 |
| User Story Title | Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE` |
| Phase | P3 |
| Backlog Position | PB-P3-005 |
| User Story Path | management/user-stories/US-144-toggle-mock-openai-provider.md |
| Tech Spec Path | management/technical-specs/P3/PB-P3-005/US-144-technical-spec.md |
| Tasks Path | management/development-tasks/P3/PB-P3-005/US-144-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | Current state = documentación/planificación (repo con backend/web reales parciales) |
| Execution Record Status | Partially Completed |
| Readiness Status | READY |
| Alignment Status | ALIGNED_WITH_NOTES |
| Branch | mvp/PB-P3-004 |
| Initial Commit Hash | ea51b92 |
| Started At | 2026-07-28T18:42:22Z |
| Last Updated At | 2026-07-28T18:55:00Z |
| Completed At | null |
| Claude Session ID | n/d |
| Executor Type | Claude Code |

## 2. Source Validation

- [x] Rutas validadas (3 argumentos, existen, dentro del repo)
- [x] User Story ID coincide en las 3 rutas (nombre + contenido): US-144
- [x] Phase coincide entre Tech Spec y Tasks: P3
- [x] Backlog Position coincide entre Tech Spec y Tasks: PB-P3-005
- [x] Documentos legibles
- [x] IDs de tarea extraídos (rango: TASK-PB-P3-005-US-144-DOC-001 … TASK-PB-P3-005-US-144-DOC-009 + QA-001/QA-002)

## 3. Readiness Gate

- Resultado: **READY**
- Checks:
  - User Story existe y legible — OK. Status `Approved with Minor Notes` (2026-07-08), `Ready for Development Tasks: Yes` → habilita implementación.
  - Acceptance Criteria (AC-01..06) presentes y testeables (dry-run/documental).
  - Tech Spec legible, `Ready for Task Breakdown`.
  - Tasks File con IDs `TASK-...` identificables (11 tareas).
  - Pertenece al backlog priorizado (PB-P3-005, EPIC-DEMO-001).
  - Dependencias comprendidas: PB-P0-009..011 (fundación IA, implementadas en `backend/src/modules/ai-assistance/*`), PB-P2-022 (deploy Demo).
  - No hay decision-resolution ni refinement-review para US-144 (no requeridos).
  - No hay execution record previo (creación nueva).
- Warnings: Ninguno bloqueante.
- Blockers: Ninguno.
- Decision files relacionados: `management/user-stories/decision-resolutions/US-144-decision-resolution.md` → No existe (no requerido).
- Refinement files relacionados: No existe (no requerido).

## 4. Alignment Gate

- Resultado: **ALIGNED_WITH_NOTES**
- Tasks vs Tech Spec: cada tarea DOC/QA deriva de la Tech Spec §18 (estructura del runbook) y §13 (validación documental + dry-run). Sin scope no aprobado.
- Tech Spec vs Conventions: historia documental; entregable markdown en `management/artifacts/` (misma convención que US-142 `Demo-Script.md`, US-143 `Pre-Demo-Checklist.md`). Sin violación de límites de capa (no toca código de producto).
- Tasks vs Acceptance Criteria (mapeo): AC-01 → DOC-001/DOC-008; AC-02 → DOC-002/DOC-003/DOC-007; AC-03 → DOC-004; AC-04 → DOC-005/DOC-007; AC-05 → DOC-006; AC-06 → QA-002/DOC-009. Cada AC cubierto.
- Hallazgos de arquitectura: Ninguno (no reabre ADR-AI-001..004 ni ADR-DEVOPS-001).
- Ajustes requeridos: Ninguno.
- **Notas de alineación (registradas, no bloqueantes):**
  - **N-01 (comportamiento real vs. Doc 21 §13.2).** `backend/src/config/env.ts` hace **fail-fast** y prohíbe `AI_USE_MOCK_FALLBACK=true`, `AI_DEMO_MODE=true` y `CAPTCHA_PROVIDER=mock` cuando `NODE_ENV=production`. Por ello las configuraciones "Demo" de Doc 21 §13.2 sólo son arrancables si el servicio Demo corre con `NODE_ENV≠production`. El runbook documenta esta precondición explícitamente (cabecera + §3 + §6.2). Recomendado alinear Doc 21 §13.2 / definición de entorno Demo.
  - **N-02 (nomenclatura de logs).** Los AC/Doc 21 nombran `fallback_used`/`provider`; el campo real en el log es `fallbackUsed` (camelCase) y el evento `ai.fallback_used` (`ai-execution-logger.ts`). El runbook documenta ambos para ejecutabilidad.

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P3-005-US-144-DOC-001 | Crear skeleton del runbook (título, propósito, estructura) | 1 | — | Done | 2026-07-28 | 2026-07-28 | AC-01 | Archivo creado con 8 secciones + índice |
| TASK-PB-P3-005-US-144-DOC-002 | Redactar la tabla de referencia de variables de entorno IA | 2 | DOC-001 | Done | 2026-07-28 | 2026-07-28 | AC-02, VR-01/02, SEC-01..03 | §1 tabla 6 env vars, sólo nombres |
| TASK-PB-P3-005-US-144-DOC-003 | Redactar el procedimiento de toggle `openai`↔`mock` paso a paso | 3 | DOC-002 | Done | 2026-07-28 | 2026-07-28 | AC-02 | §2 pasos numerados ambas direcciones |
| TASK-PB-P3-005-US-144-DOC-004 | Redactar la configuración del modo demo seguro | 4 | DOC-003 | Done | 2026-07-28 | 2026-07-28 | AC-03 | §3 tabla preferido/contingencia/CI + cita Doc 21 §13.2 |
| TASK-PB-P3-005-US-144-DOC-005 | Redactar la sección de verificación del cambio | 5 | DOC-004 | Done | 2026-07-28 | 2026-07-28 | AC-04 | §4 healthcheck/logs/determinismo + SEC-04 |
| TASK-PB-P3-005-US-144-DOC-006 | Redactar el procedimiento de reversión | 6 | DOC-005 | Done | 2026-07-28 | 2026-07-28 | AC-05 | §5 pasos reversión + ref. cruzada US-140 |
| TASK-PB-P3-005-US-144-DOC-007 | Redactar la sección de escenarios de contingencia | 7 | DOC-006 | Done | 2026-07-28 | 2026-07-28 | AC-02/04, EC-01/02, NT-01/02, VR-01 | §6 fallback vs toggle manual + fail-fast |
| TASK-PB-P3-005-US-144-DOC-008 | Enlazar el runbook desde el Pre-Demo Checklist (US-143) | 8 | DOC-007 | Done | 2026-07-28 | 2026-07-28 | AC-01 | 3 enlaces markdown al runbook en Pre-Demo-Checklist |
| TASK-PB-P3-005-US-144-QA-001 | Revisión documental de higiene de secretos | 9 | DOC-002/003/007 | Done | 2026-07-28 | 2026-07-28 | TS-03, VR-02, SEC-01..04 | Scan sin valores de secretos; SEC-02/03/04 presentes |
| TASK-PB-P3-005-US-144-QA-002 | Dry-run del toggle y la reversión en el entorno Demo | 10 | DOC-001..007 | Blocked | 2026-07-28 | — | AC-06, TS-01/02, NT-01/02 | **Not Run** — requiere entorno Demo corriendo con seed; no se fabrican resultados (BLK-001) |
| TASK-PB-P3-005-US-144-DOC-009 | Registrar el resultado del dry-run en el runbook | 11 | QA-002 | Implemented | 2026-07-28 | — | AC-06 | §7 plantilla DR-01/DR-02 lista; resultados pendientes de QA-002 en vivo |

> IDs y títulos copiados verbatim del Tasks File; no se renumeran.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| — | Ninguna | — | — | — | — | — | — | — |

## 7. Evidence by Task

### Tareas DOC-001..DOC-007 (redacción del runbook)
- Files created: `management/artifacts/AI-Provider-Toggle-Runbook.md`
- Files modified: — (para estas tareas)
- Files deleted: —
- Migrations created: N/A (historia documental)
- Tests created/modified: N/A
- Commands executed:
  - `grep -nE "LLM_PROVIDER|OPENAI|AI_TIMEOUT|AI_DEMO|AI_USE_MOCK|anthropic|mock" backend/src/config/env.ts` → exit 0 → confirma enum `openai|mock|anthropic`, defaults y fail-fast en `production`.
  - lectura de `llm-provider.factory.ts`, `ai-execution-logger.ts`, `ai-provider.probe.ts`, `platform-health.router.ts` → grounding de comportamiento real (selectProvider, campos de log, probe, rutas `/health`+`/health/ready`).
  - `sed -n '505,535p' docs/21-Deployment-and-DevOps-Design.md` → tabla §13.1 y reglas §13.2 verbatim.
- Lint: Not Applicable (markdown; no hay markdownlint configurado en el repo).
- Typecheck: Not Applicable (documentación).
- Tests: Not Applicable (documentación).
- Build: Not Applicable.
- DB validation: Not Applicable.
- Security checks: Passed (higiene documental — ver QA-001).
- Acceptance Criteria cubiertos: AC-01..AC-05 (documental), soporte AC-02/04 vía §6.
- Convenciones verificadas: entregable en `management/artifacts/` (coherente con US-142/US-143); español LATAM + identificadores en inglés; sólo nombres de variables.
- Deviations: Ninguna (ver Notas de alineación N-01/N-02 en §4).
- Technical debt: Ninguna.
- Commit / PR: (se registra en el commit de esta ejecución)

### TASK-PB-P3-005-US-144-DOC-008 (enlace desde Pre-Demo Checklist)
- Files modified: `management/artifacts/Pre-Demo-Checklist.md` (3 enlaces markdown al runbook: ítem **g** acción correctiva + fuente, §3 DR-02, §4 Referencias). Sin cambios funcionales adicionales.
- Acceptance Criteria cubiertos: AC-01 (runbook referenciado desde el Pre-Demo Checklist).
- Security checks: Passed (los enlaces no exponen secretos).
- Deviations: Ninguna. El checklist ya citaba el runbook por texto; DOC-008 lo convierte en enlace clicable al archivo.

### TASK-PB-P3-005-US-144-QA-001 (revisión de higiene de secretos)
- Commands executed:
  - `grep -nE "sk-[A-Za-z0-9]|Bearer |OPENAI_API_KEY=[^ \`]|api[_-]?key..." AI-Provider-Toggle-Runbook.md` → **NONE FOUND** (sin valores de secretos).
  - `grep -c "Secrets Manager"` → 4; `grep -c "frontend"` → 2 (SEC-03 presente); `grep -c "SEC-04"` → 3.
- Lint/Typecheck/Tests/Build: Not Applicable (revisión documental).
- Security checks: **Passed** — sólo nombres de variables (SEC-01/VR-02); advertencia SEC-03 (frontend nunca recibe `OPENAI_API_KEY`) y nota SEC-04 presentes.
- Acceptance Criteria cubiertos: TS-03/VR-02/SEC-01..04; soporte documental a AC-02.
- Deviations: Ninguna.

### TASK-PB-P3-005-US-144-QA-002 (dry-run en Demo) — Blocked / Not Run
- Commands executed: Ninguno.
- Lint/Typecheck/Tests/Build: Not Run — el dry-run requiere el **entorno Demo corriendo** (backend + BD + seed) con acceso a la configuración de env vars del servicio y a los logs; no está disponible en esta ejecución.
- DB validation: Not Applicable.
- Security checks: Not Run.
- Acceptance Criteria cubiertos: AC-06 → **pendiente** (ejecución en vivo).
- Deviations: Ninguna; **no se fabrican resultados** (regla de honestidad de evidencia). Ver BLK-001.
- Technical debt: Ejecutar el dry-run `openai`→`mock`→`openai` + NT-01/NT-02 en Demo y completar §7 del runbook (DOC-009).

### TASK-PB-P3-005-US-144-DOC-009 (registro del dry-run) — Implemented
- Files modified: `management/artifacts/AI-Provider-Toggle-Runbook.md` §7 (plantilla DR-01/DR-02 con columnas fecha/responsable/paso/acción/esperado/observado).
- Estado: estructura de registro **presente y lista**; los resultados quedan pendientes de QA-002 en vivo. No `Done` porque no hay evidencia real de corrida (sin fabricar timings/resultados).
- Acceptance Criteria cubiertos: AC-06 (estructura de registro); resultado end-to-end pendiente.

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| BLK-001 | TASK-PB-P3-005-US-144-QA-002 | Dependency | El dry-run requiere el entorno Demo corriendo (backend + BD + seed) con acceso a env vars del servicio y logs. No disponible en esta ejecución; no se fabrican resultados. | 2026-07-28T18:50:00Z | Ejecutar el ensayo `openai`→`mock`→`openai` + NT-01/NT-02 en Demo y completar §7 del runbook | QA / DevOps | Open |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |
| N-01 | Doc 21 §13.2: Demo = `openai`+`AI_USE_MOCK_FALLBACK=true` / `mock`+`AI_DEMO_MODE=true` | Runbook documenta que esas flags son **fail-fast en `NODE_ENV=production`** (env.ts) y sólo arrancan con `NODE_ENV≠production` | El código real impone la restricción; el runbook debe ser ejecutable | Bajo (documental; se advierte al operador) | — | §11, §16 (fila `anthropic`/env) | No | Nota no bloqueante; recomendado alinear Doc 21 §13.2 |
| N-02 | AC/Doc 21: `fallback_used`/`provider` | Runbook documenta también los nombres reales `fallbackUsed`/evento `ai.fallback_used` | Ejecutabilidad de la verificación | Bajo | — | §14 | No | Nota no bloqueante |

## 10. Final Validation

- Task completion: 9/11 `Done` · 1 `Implemented` (DOC-009) · 1 `Blocked/Not Run` (QA-002)
- Acceptance Criteria coverage: AC-01..AC-05 cubiertos y verificados (documental); AC-06 **parcial** (estructura de registro lista; corrida en vivo pendiente)
- Lint: Not Applicable (markdown; sin markdownlint en el repo)
- Typecheck: Not Applicable (documentación)
- Tests: Not Applicable (documentación)
- Build: Not Applicable
- Migrations: Not Applicable
- Seed: Not Applicable (no crea/modifica seed)
- Authorization: Not Applicable (sin runtime authorization)
- Security: Passed (higiene documental — sólo nombres de variables; SEC-01..04)
- Accessibility: Not Applicable (sin UI; markdown legible y estructurado)
- i18n: Passed (español LATAM neutral; identificadores técnicos en inglés)
- Documentation: Passed (runbook completo, 8 secciones; enlazado desde Pre-Demo-Checklist)
- Unresolved debt: dry-run en vivo (BLK-001) → completar §7 del runbook (DOC-009) tras QA-002
- Final status: **Partially Completed** — el runbook (entregable central) y la revisión de higiene de secretos están completos y verificados; el dry-run en vivo queda pendiente de un entorno Demo corriendo. Consistente con el patrón de US-142/US-143 (historias documentales cuyo ensayo en vivo queda pendiente sin fabricar resultados).

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-28T18:42:22Z | Initialized | Execution record creado; validación estructural OK (US-144/P3/PB-P3-005) |
| 2026-07-28T18:43:00Z | Readiness | READY |
| 2026-07-28T18:44:00Z | Alignment | ALIGNED_WITH_NOTES (N-01 fail-fast prod; N-02 nomenclatura logs) |
| 2026-07-28T18:50:00Z | DOC-001..007 | Not Started → Done (runbook `AI-Provider-Toggle-Runbook.md` redactado, 8 secciones) |
| 2026-07-28T18:51:00Z | DOC-008 | Not Started → Done (3 enlaces al runbook en Pre-Demo-Checklist) |
| 2026-07-28T18:52:00Z | QA-001 | Not Started → Done (higiene de secretos: sin valores; SEC-02/03/04 presentes) |
| 2026-07-28T18:53:00Z | QA-002 | Not Started → Blocked (BLK-001: sin entorno Demo; no se fabrican resultados) |
| 2026-07-28T18:54:00Z | DOC-009 | Not Started → Implemented (plantilla §7 lista; resultados pendientes) |
| 2026-07-28T18:55:00Z | Story | Partially Completed |
