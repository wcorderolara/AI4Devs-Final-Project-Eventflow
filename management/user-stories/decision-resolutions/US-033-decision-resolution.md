# PO/BA Decision Resolution — US-033

## Source User Story File
management/user-stories/US-033-view-progress-dashboard.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-033-refinement-review.md

## Decision Date
2026-06-26

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-033                                                                                                         |
| User Story file path                         | `management/user-stories/US-033-view-progress-dashboard.md`                                                    |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-033-refinement-review.md`                                       |
| Existing decision resolution found           | No                                                                                                             |
| Backlog Item                                 | PB-P1-019 — Filtros y progreso del checklist                                                                   |
| Epic                                         | EPIC-TASK-001                                                                                                  |
| Estado antes de decisiones                   | Needs Refinement                                                                                               |
| Cantidad de preguntas revisadas              | 4 (Q1, Q2, Q3, Q4)                                                                                             |
| Decisiones PO/BA tomadas                     | 4                                                                                                              |
| Decisiones técnicas recomendadas             | 0 (Q1 se resuelve con apoyo de US-032 tech spec y US-014 tech spec, ambos aprobados)                            |
| ¿Desbloquea aprobación?                      | Sí                                                                                                             |
| User Story file updated                      | Yes                                                                                                            |
| Decision Resolution artifact created/updated | Yes                                                                                                            |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-033-decision-resolution.md`                                   |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                                            |

---

## 2. Decisiones Respondidas

## Decisión 1 — Endpoint del agregado de progreso

### Pregunta original

> ¿El `% done` se expone como nuevo endpoint `GET /api/v1/events/:eventId/tasks/progress`, como campo agregado en el response existente de `GET /api/v1/events/:eventId/tasks` (extensión consistente con US-032), o se calcula en frontend desde la lista cruda (opción b de US-014)?

### Respuesta PO/BA

Se extiende el endpoint canónico `GET /api/v1/events/:eventId/tasks` de US-027/US-032 con un campo agregado `progress` en el response. No se introduce nuevo endpoint ni nuevo verbo HTTP. El cálculo se realiza en backend para garantizar source-of-truth (NFR-PERF-001, BR-TASK-009) y para que US-014 (dashboard) y futuras surfaces consuman el agregado de un único contrato.

### Decisión formal

```text
US-033 expone `% done` como campo agregado `progress` embebido en el response de `GET /api/v1/events/:eventId/tasks` (extensión del endpoint canónico de US-027 ya extendido por US-032 con `range`). No se crea endpoint nuevo. El agregado se calcula sobre el universo completo de tareas del evento (no sobre la página devuelta) en la misma ejecución del use case existente.
```

### Rationale

1. **Coherencia con US-032 tech spec (aprobado)** — `management/technical-specs/P1/PB-P1-019/US-032-technical-spec.md` §32 declara: "Ambas extienden el endpoint canónico `GET /api/v1/events/:eventId/tasks` de US-027 sin introducir nuevos verbos HTTP". US-033 es la segunda historia del Backlog item PB-P1-019 y debe respetar el contrato ya formalizado por su predecesora.
2. **Coherencia con US-014 tech spec (aprobado)** — `management/technical-specs/P1/PB-P1-008/US-014-technical-spec.md` §255 anticipa este patrón: "si TaskApi devuelve agregados, esta query puede omitirse y consumir el agregado expuesto por PB-P1-019". US-014 ya consume el response del listado.
3. **Performance** — un único round-trip cumple `NFR-PERF-001` (P95 < 1.5 s). Cálculo via `COUNT(*) FILTER (...)` sobre `event_tasks` filtrados por `event_id`, reusando `idx_event_tasks_event_status_due` declarado en US-032 tech spec §426.
4. **Backend como source of truth** — Principio EventFlow #5; evita drift entre dashboard, filtros y futuras superficies.
5. **MVP-first** — sin endpoints nuevos, sin migraciones, sin OpenAPI snapshot fragmentado.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar decisión D1 (extensión del endpoint canónico, no nuevo endpoint).                                                                                                                                                                     |
| Traceability            | `API Endpoint(s)` → `GET /api/v1/events/:eventId/tasks` (extensión; reusa el endpoint de US-027/US-032).                                                                                                                                       |
| Scope Guardrails        | Añadir a `Explicitly Out of Scope`: endpoint dedicado `/tasks/progress` y endpoint agregado `/events/:id/dashboard` (Future).                                                                                                                  |
| Acceptance Criteria     | Reescribir AC-01 para describir el agregado en el response existente. Añadir AC-04 (contrato API).                                                                                                                                             |
| Technical Notes         | Backend: extensión de `ListEventTasksUseCase` con `EventTaskProgressCalculator`. Sin nuevo controller, sin nueva ruta. Frontend: `useEventTasks` ya entrega `progress`; `useTaskProgress` se implementa como selector sobre el mismo query key. |
| Notes                   | Documentar handoff a US-014 (consumo desde dashboard) y referencia a snapshot OpenAPI por US-098.                                                                                                                                              |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional. La decisión es consistente con dos Technical Specifications aprobadas (US-032, US-014) y con `docs/16-API-Design-Specification.md`.

---

## Decisión 2 — Fórmula canónica del progreso y tratamiento de tareas IA no confirmadas

### Pregunta original

> ¿Cuál es la fórmula canónica del progreso? Definir denominador (todas las tareas, solo confirmadas, exclusión de `skipped`), tratamiento de tareas IA no confirmadas (FR-TASK-005), y política para denominador 0.

### Respuesta PO/BA

Se formaliza la fórmula `progress = round(done / total_countable * 100)` donde `total_countable = pending + in_progress + done` (excluye `skipped`) sobre tareas "contables", definidas como `ai_generated=false ∨ (ai_generated=true ∧ confirmed=true)`. Las tareas IA no confirmadas y las tareas soft-deleted no cuentan. Cuando `total_countable = 0`, `progress = 0`.

### Decisión formal

```text
Fórmula canónica:
  progress = ROUND(done / total_countable * 100)  cuando total_countable > 0
  progress = 0                                    cuando total_countable = 0

Donde:
- Tarea contable ⇔ deleted_at IS NULL ∧ (ai_generated = false ∨ (ai_generated = true ∧ confirmed = true)).
- total_countable = tareas contables cuyo status ∈ {'pending', 'in_progress', 'done'} (excluye 'skipped').
- done            = tareas contables cuyo status = 'done'.
- skipped         = tareas contables cuyo status = 'skipped' (se exponen para auditoría, no entran al denominador).
- Redondeo: half-up; resultado entero en el rango 0..100.
```

### Rationale

1. **Consistencia con BR-TASK-009** — "El porcentaje de progreso del evento se calcula a partir del estado de las tareas confirmadas (`done` / total confirmado)". "Confirmadas" se interpreta como tareas que pasaron por HITL cuando son IA (FR-TASK-005, BR-TASK-003).
2. **Consistencia con US-014 (aprobado)** — AC-01 declara `done / (total - skipped)`. Esta decisión es la generalización exacta: `total - skipped = total_countable` cuando `total` excluye AI no confirmadas y soft-deleted.
3. **Consistencia con FR-TASK-005** — "solo tras confirmación se vuelven oficiales en el dashboard"; por tanto IA no confirmadas no afectan el % de progreso oficial.
4. **Manejo de denominador 0** — devolver `0` (y no `null` ni `NaN`) es la opción más simple para la UI, evita ramas adicionales y cumple EC-01 actual.
5. **Soft-delete** — `docs/6-Domain-Data-Model.md` formaliza `deleted_at`; las tareas eliminadas no deben aparecer en métricas oficiales.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar decisión D2 (fórmula canónica completa).                                                                          |
| Business Context        | Reformular `Context Summary` y `Assumptions` con la fórmula final.                                                        |
| Acceptance Criteria     | Reescribir AC-01 con la fórmula completa.                                                                                 |
| Edge Cases              | Reescribir EC-01 (`total_countable=0` ⇒ 0%). Añadir EC-02 (todas skipped), EC-03 (solo IA no confirmadas), EC-04 (mix).   |
| Validation Rules        | Añadir nota: el cálculo se hace server-side; la UI no recalcula localmente para evitar drift.                              |
| Technical Notes         | Documentar el cálculo SQL (`COUNT(*) FILTER (...)`) y los predicados de "tarea contable".                                  |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional. Esta decisión también extiende BR-TASK-009 con criterios HITL ya documentados (FR-TASK-005, BR-TASK-003); se registra como Documentation Alignment Required (no bloqueante) contra `docs/4 §BR-TASK-009`.

---

## Decisión 3 — Semántica para eventos `completed` y `cancelled`

### Pregunta original

> ¿Qué semántica visual y de API tiene el `%` para eventos en estado `completed` y `cancelled`? Opciones: (a) eventos `completed` muestran `100%`; (b) `completed` muestra el último cálculo congelado; (c) `cancelled` devuelve `0%` o `404`.

### Respuesta PO/BA

El endpoint devuelve el porcentaje calculado actual independientemente del estado del evento. No se fuerza `100%` para `completed` ni se devuelve `404` para `cancelled`. La autorización sigue siendo 200/403/404 según ownership; el estado del evento no altera el contrato del endpoint, solo la UI muestra banners informativos (consistente con US-014 EC-01 para `cancelled` y US-015 para `completed`).

### Decisión formal

```text
- Evento active   ⇒ progress se calcula con la fórmula canónica (D2).
- Evento draft    ⇒ progress se calcula con la fórmula canónica (D2); si no hay tareas, 0%.
- Evento cancelled⇒ progress se calcula con la fórmula canónica (D2) sobre las tareas existentes; la UI muestra banner read-only de cancelación (heredado de US-014 EC-01). No se altera el cálculo.
- Evento completed⇒ progress se calcula con la fórmula canónica (D2) sobre las tareas existentes; típicamente refleja 100% porque US-015 (auto-complete) requiere todas las tareas done, pero no se fuerza el valor desde backend.
- En todos los casos el contrato HTTP es 200 OK; 401/403/404 son los únicos códigos de error de autorización y ownership.
```

### Rationale

1. **Backend como source of truth** — Principio EventFlow #5; el cálculo no se distorsiona por estados de UI.
2. **Auditabilidad** — Un evento `cancelled` con 60% expone información útil para retrospectiva del organizador; ocultarla viola "Academic evidence must remain traceable".
3. **Consistencia con US-014 EC-01** — el dashboard de un `cancelled` "se sigue mostrando para auditoría del propio organizador". US-033 debe alinearse.
4. **Consistencia con US-015** — el auto-complete job solo dispara `event.completed` cuando se cumplen sus condiciones; el `100%` emerge de los datos reales, no de una regla del endpoint.
5. **MVP-first** — sin ramificaciones especiales en el endpoint; la UI controla la presentación (banner, copy).

### Impacto en la User Story

| Sección                       | Cambio requerido                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied       | Agregar decisión D3 (semántica para `cancelled`/`completed`).                                                                                                             |
| Acceptance Criteria           | Añadir AC-05 (estados del evento: el cálculo no depende de `event.status`).                                                                                                 |
| Edge Cases                    | Añadir EC-05 (`cancelled` ⇒ 200 + cálculo + banner read-only en UI), EC-06 (`completed` ⇒ 200 + cálculo; UI muestra "Evento completado").                                  |
| Authorization & Security      | Añadir SEC-02 explicitando: 401 sin auth, 403 admin, 404 ajeno; el estado del evento NO afecta el contrato de autorización.                                                |
| UX / UI Notes                 | Añadir copy/banners para `cancelled`/`completed` (reusa los patrones de US-014 EC-01 y US-015).                                                                            |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional. Decisión alineada con US-014 EC-01 (aprobado) y US-015 (auto-complete event).

---

## Decisión 4 — Tipo, rango y redondeo del valor expuesto

### Pregunta original

> ¿El valor expuesto por API es entero `0..100`, decimal `0.0..100.0`, o ratio `0.0..1.0`? ¿Redondeo `round half-even` o `round half-up`?

### Respuesta PO/BA

API expone `percentage` como entero `0..100`, con redondeo half-up. Adicionalmente, el agregado expone los componentes (`done`, `total_countable`, `skipped`) para que la UI pueda mostrar tooltip o detalle sin recalcular en cliente.

### Decisión formal

```text
Shape del agregado en el response de GET /api/v1/events/:eventId/tasks:

  progress: {
    percentage: integer (0..100),  // ROUND_HALF_UP(done / total_countable * 100); 0 si total_countable = 0
    done: integer (>= 0),
    total_countable: integer (>= 0),
    skipped: integer (>= 0)
  }

Formateo en UI:
- Locale es-LATAM (default), es-ES: "75 %"  (con espacio, según convención CLDR).
- Locale en: "75%".
- Locale pt: "75 %".
- Locale fr: "75 %".
La UI usa Intl.NumberFormat con style: 'percent' o cadena localizada equivalente.
```

### Rationale

1. **Simplicidad y demo-first** — un entero `0..100` se lee inmediatamente y no requiere lógica de formateo numérico complejo.
2. **Auditabilidad** — exponer `done`, `total_countable` y `skipped` permite trazar el cálculo desde la UI sin segunda llamada (consistente con `docs/19 §observability`).
3. **Half-up** — convención más extendida para porcentajes en interfaces de usuario; coincide con la expectativa visual de "redondeo al más cercano, con desempates hacia arriba".
4. **Locales soportados** — `es-LATAM` (default), `es-ES`, `pt`, `en` heredados de US-014 AC-05 y `docs/3-MVP-Scope-Definition.md`.
5. **NFR-PERF-001** — payload pequeño (≈ 60 bytes adicionales sobre el response existente), no afecta P95.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar decisión D4 (contrato API integer 0..100 + componentes).                                              |
| Acceptance Criteria     | Añadir AC-04 (contrato API: `progress: { percentage, done, total_countable, skipped }`).                       |
| Technical Notes         | Documentar shape del DTO `EventTaskProgressDto`, formateo i18n en frontend, query key TanStack.                |
| UX / UI Notes           | Reescribir `i18n Notes` con los 4 locales canónicos y la cadena formateada por locale.                         |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                              | Decisión                                                                                                                                          | Tipo | ¿Bloqueaba aprobación? | Validación adicional                                |
| -: | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------- | --------------------------------------------------- |
|  1 | Endpoint del agregado                             | Extensión del endpoint canónico `GET /api/v1/events/:eventId/tasks` con campo `progress` embebido. Sin endpoint nuevo.                            | PO   | Sí                     | No                                                  |
|  2 | Fórmula canónica del progreso                     | `progress = round(done / total_countable * 100)` con `total_countable = pending+in_progress+done` sobre tareas contables (excl. IA no confirmadas). | PO   | Sí                     | Documentation Alignment Required (no bloqueante)    |
|  3 | Semántica para `cancelled`/`completed`            | El cálculo no depende de `event.status`; 200 OK siempre; UI muestra banner read-only.                                                              | PO   | Sí                     | No                                                  |
|  4 | Tipo/rango/redondeo + shape del agregado          | `percentage: integer (0..100)` half-up + componentes (`done`, `total_countable`, `skipped`).                                                       | PO   | Sí                     | No                                                  |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Status` → `Ready for Approval`.
- `Last Updated` → `2026-06-26`.

### Business Context
- `Context Summary` reformulado con la fórmula canónica D2.
- `Assumptions` reformulado: política de `skipped`, política de IA no confirmadas, política de soft-delete.
- `Dependencies` añade US-027 (endpoint base), US-032 (extensión `range`), US-014 (consumidor), US-031 (HITL confirmación), US-030 (cambio de estado).

### PO/BA Decisions Applied
- Sección nueva con D1–D4 formalizadas.

### Traceability
- `FRD Requirement(s)`: `FR-TASK-007` (cálculo de % completitud) + `FR-EVENT-008` (surface en dashboard).
- `Use Case(s)`: `UC-TASK-001` (ver checklist) + `UC-EVENT-004` (ver dashboard del evento).
- `Business Rule(s)`: `BR-TASK-009` + `BR-EVENT-009` + `BR-TASK-003` (HITL para `ai_generated=true`).
- `NFR Reference(s)`: `NFR-PERF-001`.
- `API Endpoint(s)`: `GET /api/v1/events/:eventId/tasks` (extensión; reusa de US-027/US-032).
- `Related Document(s)`: `/docs/4 §BR-TASK-009`, `/docs/8 §UC-EVENT-004 §UC-TASK-001`, `/docs/9 §FR-TASK-007 §FR-EVENT-008`, `/docs/10 §NFR-PERF-001`, `/docs/16 §M05`, `management/technical-specs/P1/PB-P1-019/US-032-technical-spec.md`, `management/technical-specs/P1/PB-P1-008/US-014-technical-spec.md`.

### Scope Guardrails
- `Explicitly Out of Scope` añade: endpoint dedicado `/tasks/progress`, endpoint agregado `/events/:id/dashboard`, gráficos avanzados, breakdown por categoría.
- `Scope Notes` reformulado: agregado embebido en el response del listado canónico.

### Acceptance Criteria
- AC-01 reescrito con la fórmula canónica D2.
- AC-02 reescrito con cache TanStack invalidation (query key `['event', eventId, 'tasks']`, invalidación tras mutaciones de US-029/US-030/US-031).
- AC-03 nuevo: contrato del agregado (shape, tipos, rango).
- AC-04 nuevo: locales i18n (es-LATAM, es-ES, pt, en) con formateo CLDR.
- AC-05 nuevo: el cálculo no depende de `event.status`.
- AC-06 nuevo: P95 < 1.5 s contra `NFR-PERF-001` con 200 tareas.

### Edge Cases
- EC-01 reescrito (`total_countable = 0` ⇒ 0%).
- EC-02 nuevo: todas las tareas `skipped` ⇒ 0%.
- EC-03 nuevo: solo tareas IA no confirmadas ⇒ 0% (no entran al agregado).
- EC-04 nuevo: mix de soft-deleted + activas ⇒ se ignoran las soft-deleted.
- EC-05 nuevo: evento `cancelled` ⇒ 200 + cálculo real + banner read-only en UI.
- EC-06 nuevo: evento `completed` ⇒ 200 + cálculo real; típicamente 100% por US-015.

### Validation Rules
- VR-01 mantenido (eventId propio ⇒ 403/404).
- VR-02 nuevo: `eventId` debe ser UUID válido ⇒ 400 (consistente con US-027).
- VR-03 nuevo: sin sesión ⇒ 401.

### Authorization & Security Rules
- SEC-01 explicitado: reuso de `EventOwnershipPolicy` y `OrganizerRoleGuard` de US-027.
- SEC-02 nuevo: `adminExclusionGuard` (admin ⇒ 403; admin no consume este endpoint, usa surface admin de US-016).
- SEC-03 nuevo: no-revelación 404 ante recurso ajeno (consistente con US-027 §SEC).

### Technical Notes
- Backend: extensión de `ListEventTasksUseCase` con un agregador inline (`COUNT(*) FILTER (...)`). Sin nuevo controller, sin nueva ruta, sin nuevo use case dedicado.
- Frontend: `useEventTasks` ya entrega `progress`; se añade selector `useTaskProgress(eventId)` sobre el mismo query key `['event', eventId, 'tasks', { range, page, pageSize }]`.
- API: shape del agregado en el response existente.
- Observability: añadir `progress.percentage`, `progress.done`, `progress.total_countable`, `progress.skipped` al log estructurado `tasks.list.requested` existente.
- Sin migraciones; reusa `idx_event_tasks_event_status_due`.

### QA Notes / Test Scenarios
- TS-01 mantenido (cálculo correcto).
- TS-02 mantenido (refetch tras cambio de estado).
- TS-03 nuevo: auth 401.
- TS-04 nuevo: admin 403.
- TS-05 nuevo: ajeno 404.
- TS-06 nuevo: `cancelled`/`completed` ⇒ 200 + cálculo real.
- TS-07 nuevo: denominador 0 (todas skipped, solo IA no confirmadas, sin tareas).
- TS-08 nuevo: rounding half-up boundary (e.g., 50.5 ⇒ 51).
- TS-09 nuevo: soft-deleted ignoradas.
- PERF-01 nuevo: P95 < 1.5 s con 200 tareas.
- A11Y-01 nuevo: `role="progressbar"`, `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-busy=true` durante loading.
- CONTRACT-01 nuevo: contract test contra OpenAPI snapshot (handoff a US-098).

### Definition of Ready
- Marcar `[x] PO/BA validó` tras esta resolución.

### Definition of Done
- Añadir: A11Y verificada, contract test OpenAPI verde, log extendido emitido, query key TanStack documentada.

### Notes
- Reemplazar nota original por: "Política de `skipped`, IA no confirmadas y `event.status` definidas en D2/D3 (este artefacto)."

---

## 5. Documentation Alignment Required

| Documento / Fuente                       | Conflicto detectado                                                                                                                                                          | Decisión vigente                                                                                                                                       | Acción recomendada                                                                                                                                | ¿Bloquea aprobación? |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/4-Business-Rules-Document.md` BR-TASK-009 | "se calcula a partir de las tareas confirmadas (`done` / total confirmado)" no define explícitamente el manejo de `skipped` ni de IA no confirmadas.                          | D2 (este artefacto) formaliza: `done / total_countable` con `total_countable = pending+in_progress+done` sobre tareas contables (excl. IA no confirmadas). | Actualizar BR-TASK-009 con nota referenciando D2, o crear ADR si se prefiere. No bloquea US-033.                                                  | No                   |
| `docs/10-Non-Functional-Requirements.md` | US-033 original referenciaba `NFR-PERF-API-001`; el ID canónico es `NFR-PERF-001`.                                                                                            | `NFR-PERF-001` (P95 < 1.5 s endpoints no-IA).                                                                                                          | Corregido directamente en US-033 (Traceability). No bloquea. Misma alineación ya registrada por US-032.                                            | No                   |
| `docs/16-API-Design-Specification.md`    | El endpoint extendido amplía el response shape del listado de tareas; no requiere nueva ruta pero sí actualización del DTO en M05 Event Tasks.                                | D1 (este artefacto) confirma extensión del endpoint canónico.                                                                                          | Actualizar `docs/16 §M05` para reflejar el agregado `progress` en el response del listado. Snapshot OpenAPI por US-098 (Future). No bloquea.       | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                         |
| User Story file path                         | `management/user-stories/US-033-view-progress-dashboard.md`                                 |
| Decision Resolution artifact created/updated | Yes                                                                                         |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-033-decision-resolution.md`                |
| New User Story status                        | Ready for Approval                                                                          |
| Remaining blockers                           | No                                                                                          |
| Reason                                       | 4/4 decisiones bloqueantes (Q1–Q4) resueltas con respaldo en US-014 y US-032 tech specs aprobados y en `docs/4/8/9/10/16`. Tres ítems quedan como Documentation Alignment Required, ninguno bloquea. |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`

Las 4 decisiones bloqueantes están formalizadas y consistentes con dos Technical Specifications ya aprobadas (US-032 y US-014). La US se actualiza en sitio con los cambios prescriptos y queda lista para `eventflow-user-story-approval`.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo actualizado management/user-stories/US-033-view-progress-dashboard.md.
2. Ejecutar `eventflow-user-story-refinement` para revalidación opcional (recomendado dado el volumen de cambios).
3. Ejecutar `eventflow-user-story-approval`.
4. Tras aprobación, ejecutar `eventflow-user-story-technical-spec` y luego `eventflow-user-story-to-development-tasks`.
```

---

User Story file updated: Yes
Path: management/user-stories/US-033-view-progress-dashboard.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-033-decision-resolution.md
Next step: Run `eventflow-user-story-approval` or run `eventflow-user-story-refinement` again if a second validation pass is desired.
