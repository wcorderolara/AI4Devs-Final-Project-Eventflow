# Referencia — Plantilla y Contrato del Execution Record

Ruta (fallback):
`management/workflows/development-execution/<PHASE>/<BACKLOG-ID>/<US-ID>-execution.md`
Ejemplo: `management/workflows/development-execution/P0/PB-P0-001/US-099-execution.md`

El execution record es el **único log mutable de implementación**. El Tasks File original es la
línea base inmutable. Los IDs de tarea originales (`TASK-PB-P0-001-US-099-...`) **nunca** se
renumeran. Las fechas se registran en ISO 8601. Los literales de estado se conservan **verbatim**.

Copia la plantilla siguiente y complétala; conserva todas las secciones. Los detalles verbosos
(cada lectura de archivo) **no** van en el Change History — solo transiciones significativas.

---

```markdown
# Execution Record — <BACKLOG-ID> / <US-ID>: <título>

## 1. Metadata

| Field | Value |
| ----- | ----- |
| User Story ID | US-XXX |
| User Story Title | ... |
| Phase | P0 |
| Backlog Position | PB-P0-XXX |
| User Story Path | management/user-stories/US-XXX-....md |
| Tech Spec Path | management/technical-specs/P0/PB-P0-XXX/US-XXX-technical-spec.md |
| Tasks Path | management/development-tasks/P0/PB-P0-XXX/US-XXX-development-tasks.md |
| Conventions Path | DEVELOPMENT_CONVENTIONS.md |
| Conventions Ref | <versión o last-modified cuando esté disponible> |
| Execution Record Status | Initialized \| Ready \| In Progress \| Blocked \| Validation \| Done \| Partially Completed \| Cancelled |
| Readiness Status | READY \| READY_WITH_WARNINGS \| BLOCKED_BY_* \| INVALID_INPUT |
| Alignment Status | ALIGNED \| ALIGNED_WITH_NOTES \| REQUIRES_* \| ARCHITECTURE_DECISION_REQUIRED \| BLOCKED |
| Branch | <rama actual, si hay repo Git> |
| Initial Commit Hash | <hash inicial, si disponible> |
| Started At | 2026-07-08T00:00:00Z |
| Last Updated At | 2026-07-08T00:00:00Z |
| Completed At | <fecha o null> |
| Claude Session ID | <si disponible> |
| Executor Type | Claude Code |

> No inventes nombre humano de ejecutor.

## 2. Source Validation

- [ ] Rutas validadas (3 argumentos, existen, dentro del repo)
- [ ] User Story ID coincide en las 3 rutas (nombre + contenido)
- [ ] Phase coincide entre Tech Spec y Tasks
- [ ] Backlog Position coincide entre Tech Spec y Tasks
- [ ] Documentos legibles
- [ ] IDs de tarea extraídos (rango: TASK-... … TASK-...)

## 3. Readiness Gate

- Resultado: <READY | ...>
- Checks: <lista de checks y su estado>
- Warnings: <lista o "Ninguno">
- Blockers: <lista o "Ninguno">
- Decision files relacionados: <ruta o "No existe">
- Refinement files relacionados: <ruta o "No existe">

## 4. Alignment Gate

- Resultado: <ALIGNED | ...>
- Tasks vs Tech Spec: <hallazgos>
- Tech Spec vs Conventions: <hallazgos>
- Tasks vs Acceptance Criteria (mapeo): <AC-01 → TASK-...; ...>
- Hallazgos de arquitectura: <o "Ninguno">
- Ajustes requeridos: <o "Ninguno">

## 5. Task Inventory

| Task ID | Título original | Orden | Depends On | Status | Started | Completed | AC cubiertos | Evidencia (resumen) |
| ------- | --------------- | ----: | ---------- | ------ | ------- | --------- | ------------ | ------------------- |
| TASK-PB-P0-XXX-US-XXX-FE-001 | ... | 1 | — | Not Started | | | AC-01 | |

> Los IDs y títulos originales se copian **verbatim**; nunca se renumeran.

## 6. Emergent Tasks

| ID | Título | Tarea padre | Razón de descubrimiento | Necesidad | Impacto de scope | Impacto Tech Spec | Status | Evidencia |
| -- | ------ | ----------- | ----------------------- | --------- | ---------------- | ----------------- | ------ | --------- |
| EMERGENT-001 | ... | TASK-... | ... | ... | ... | ... | Not Started | |

> Las tareas emergentes se mantienen **separadas** de la línea base. No se usan para ocultar
> expansión de scope.

## 7. Evidence by Task

### TASK-PB-P0-XXX-US-XXX-FE-001
- Files created: <lista>
- Files modified: <lista>
- Files deleted: <lista>
- Migrations created: <lista o N/A>
- Tests created/modified: <lista o N/A>
- Commands executed: <comando verbatim → exit status → resumen>
- Lint: Passed | Failed | Not Run | Not Applicable (razón)
- Typecheck: ...
- Tests: ...
- Build: ...
- DB validation: ...
- Security checks: ...
- Acceptance Criteria cubiertos: <AC-...>
- Convenciones verificadas: <...>
- Deviations: <o "Ninguna">
- Technical debt: <o "Ninguna">
- Commit / PR: <solo si existe realmente, o "N/A">

## 8. Blockers

| Blocker ID | Tarea afectada | Tipo | Descripción | Detectado | Decisión requerida | Rol responsable | Estado |
| ---------- | -------------- | ---- | ----------- | --------- | ------------------ | --------------- | ------ |
| BLK-001 | TASK-... | Dependency \| Decision \| Refinement \| Alignment \| Architecture \| Tech Spec | ... | 2026-07-08T..Z | ... | Tech Lead \| PO \| ... | Open \| Resolved |

## 9. Deviations

| # | Comportamiento planeado | Implementado/propuesto | Razón | Impacto | Convención afectada | Sección Tech Spec | ADR requerido | Resolución |
| - | ----------------------- | ---------------------- | ----- | ------- | ------------------- | ----------------- | ------------- | ---------- |

## 10. Final Validation

- Task completion: <n/n>
- Acceptance Criteria coverage: <n/n cubiertos>
- Lint: <resultado>
- Typecheck: <resultado>
- Tests: <resultado>
- Build: <resultado>
- Migrations: <resultado>
- Seed: <resultado>
- Authorization: <resultado>
- Security: <resultado>
- Accessibility: <resultado>
- i18n: <resultado>
- Documentation: <resultado>
- Unresolved debt: <lista o "Ninguna">
- Final status: <Done | Partially Completed | Blocked | Validation | Cancelled>

## 11. Change History

| Timestamp | Evento | Detalle |
| --------- | ------ | ------- |
| 2026-07-08T..Z | Initialized | Execution record creado |
| 2026-07-08T..Z | Readiness | READY |
| 2026-07-08T..Z | TASK-...-FE-001 | Not Started → In Progress |

> Historia compacta de transiciones **significativas**. No una entrada por cada lectura de archivo.
```
