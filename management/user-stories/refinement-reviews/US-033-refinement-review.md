# User Story Refinement Review — US-033

## Source User Story File
management/user-stories/US-033-view-progress-dashboard.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-033-decision-resolution.md

## Review Date
2026-06-26 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-033-decision-resolution.md`) y la actualización en sitio del archivo de la User Story, esta segunda pasada de refinement confirma:

| Verificación                                                                                                       | Resultado |
| ------------------------------------------------------------------------------------------------------------------ | --------- |
| Q1 (endpoint) resuelta: extensión del endpoint canónico `GET /api/v1/events/:eventId/tasks` con campo `progress`. | OK        |
| Q2 (fórmula) resuelta: `round(done / total_countable * 100)` con D2 explícita en US y PO/BA Decisions Applied.    | OK        |
| Q3 (`cancelled`/`completed`) resuelta: cálculo independiente de `event.status`; UI con banners read-only.         | OK        |
| Q4 (contrato) resuelta: `progress: { percentage int 0..100 half-up, done, total_countable, skipped }` + i18n CLDR. | OK        |
| Traceability corregida: FR-TASK-007 + FR-EVENT-008 + FR-TASK-005; UC-TASK-001 + UC-EVENT-004; BR-TASK-009 + BR-EVENT-009 + BR-TASK-003; NFR-PERF-001. | OK |
| AC reescritos (AC-01..AC-06), EC ampliados (EC-01..EC-06), VR/SEC/Test/Observability ampliados.                   | OK        |
| Documentation Alignment Required (3 ítems): nota BR-TASK-009, ID NFR-PERF-001, `docs/16 §M05`. Ninguna bloqueante. | OK        |
| Sin scope creep (gráficos avanzados, breakdown por categoría, push, endpoint dedicado quedan Out of Scope).      | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-033                                                                                                                        |
| File Path                                  | `management/user-stories/US-033-view-progress-dashboard.md`                                                                   |
| Backlog Item                               | PB-P1-019 — Filtros y progreso del checklist                                                                                  |
| Epic                                       | EPIC-TASK-001                                                                                                                 |
| Estado actual                              | Draft                                                                                                                         |
| Estado recomendado                         | Needs Refinement                                                                                                              |
| Nivel de riesgo                            | Medio                                                                                                                         |
| Calidad general                            | Media                                                                                                                         |
| Requiere decisión PO                       | Sí                                                                                                                            |
| Requiere decisión técnica                  | Sí                                                                                                                            |
| Requiere decisión QA                       | No                                                                                                                            |
| Requiere decisión Seguridad                | No                                                                                                                            |
| Decision Resolution artifact found         | No                                                                                                                            |
| User Story file updated                    | No                                                                                                                            |
| Refinement review artifact created/updated | Yes                                                                                                                           |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-033-refinement-review.md`                                                      |

---

## 2. Diagnóstico PO/BA

US-033 entrega el indicador de progreso (`% done`) sobre el checklist en el dashboard del evento, surface que `PB-P1-008 / US-014` ya espera consumir y que `PB-P1-019 / US-032` (recién aprobado) declara como handoff explícito. La intención es válida, el valor es claro (sensación de avance en tiempo real) y el alcance se mantiene dentro del MVP (sin gráficos avanzados, sin métricas adicionales).

Sin embargo, la historia llega con tres categorías de inconsistencias que impiden refinar el archivo de forma segura:

1. **Traceability incorrecta** en `Traceability`: los IDs declarados (`FR-TASK-010`, `UC-TASK-005`, `BR-TASK-007`) no corresponden al cálculo de `% done`. Apuntan a "tareas próximas/vencidas", "eliminar tarea" y "filtros por estado/rango" respectivamente. Los IDs canónicos para esta historia son `FR-TASK-007` + `FR-EVENT-008` (surface), `UC-TASK-001` + `UC-EVENT-004` (surface) y `BR-TASK-009`.
2. **Contradicción de endpoint con artefacto aprobado**: la historia declara un nuevo endpoint `GET /api/v1/events/:id/tasks/progress`, pero la Technical Specification ya aprobada de US-032 (PB-P1-019, posición 1 de 2) afirma textualmente que "Ambas extienden el endpoint canónico `GET /api/v1/events/:eventId/tasks` de US-027 sin introducir nuevos verbos HTTP". Además, US-014 tech spec (PB-P1-008, aprobado) deja explícitamente abierta la decisión y enumera como opciones: (a) consumir agregado desde el endpoint de tareas si PB-P1-019 lo expone; (b) calcular `% done` en frontend a partir de la lista cruda; (c) endpoint agregado `/events/:id/dashboard` (queda fuera de MVP).
3. **Definición ambigua del cálculo**: la historia coexiste con tres definiciones distintas: (i) `progress = M/N * 100` con `N` = "tareas activas no descartadas" (AC-01), (ii) "skip se excluye" (Assumptions), (iii) `done / (total - skipped)` (US-014 refinada, BR-TASK-009 normaliza `done / total_confirmado`). Falta consenso explícito sobre el tratamiento de tareas IA no confirmadas (`ai_generated=true` con confirmación pendiente, FR-TASK-005), `done`, `skipped`, `pending`, `in_progress`, y sobre el redondeo final (entero o un decimal, half-even vs half-up).

No hay scope creep ni P4/Future en juego. La historia es pequeña y demoable, pero antes de aprobar debe formalizarse el endpoint, la fórmula canónica y los IDs de traceability.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                                  | Impacto                                                                                                                                                | Recomendación                                                                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alta      | Endpoint `GET /api/v1/events/:id/tasks/progress` contradice la decisión ya formalizada en `management/technical-specs/P1/PB-P1-019/US-032-technical-spec.md` (no introducir nuevos verbos HTTP en PB-P1-019).                                              | Bloquea aprobación: dos artefactos aprobados quedarían en conflicto y el desarrollo no tendría un contrato único.                                       | Resolver vía PO + Tech Lead. Decisión esperada en `eventflow-po-ba-decision-resolver`. Ver §7 Q1.                                                                                            |
| Alta      | Traceability declarada usa IDs incorrectos: `FR-TASK-010`, `UC-TASK-005`, `BR-TASK-007`. Los canónicos son `FR-TASK-007` (+ `FR-EVENT-008` para surface), `UC-EVENT-004` (+ `UC-TASK-001`) y `BR-TASK-009`.                                                | Si se aprueba con IDs erróneos, la trazabilidad académica y la Documentation Alignment se rompen en cadena (PB-P1-019 ↔ FRD ↔ UC ↔ BRD).                | Reemplazar IDs por los canónicos durante la refinación (no requiere decisión PO; la corrección es objetiva contra `docs/9`, `docs/8` y `docs/4`). Ver §10.                                  |
| Alta      | Fórmula del progreso ambigua: AC-01 usa "tareas activas no descartadas"; Assumptions dice "skip se excluye"; US-014 ya aprobó `done / (total - skipped)`; BR-TASK-009 usa `done / total_confirmado` (excluye AI no confirmadas, status del resto sin pedir). | Inconsistencia entre US-014 (dashboard) y US-033 (cálculo) generará dos resultados distintos del `%` en demo.                                            | Resolver vía PO. Definir denominador único y tratamiento de `ai_generated=true` con confirmación pendiente. Ver §7 Q2.                                                                       |
| Media     | EC-01 cubre "sin tareas" → 0%, pero no contempla "todas `skipped`" (denominador 0 cuando se aplica `total - skipped`) ni "todas IA no confirmadas".                                                                                                          | Riesgo de NaN/Infinity en cálculo o de mostrar `0%` engañoso en demo cuando hay tareas no contadas.                                                      | Tras decidir fórmula (Q2), añadir EC explícito para denominador 0 y para "sin tareas contables".                                                                                            |
| Media     | NFR referenciada como `NFR-PERF-API-001` no existe; el ID canónico es `NFR-PERF-001` (P95 < 1.5 s, `docs/10`).                                                                                                                                              | Métrica de éxito (`Recalculo < 100ms`) no traza al NFR correcto.                                                                                        | Reemplazar por `NFR-PERF-001`. Documentation Alignment Required (no bloqueante). Ya identificado en US-032 §8.                                                                              |
| Media     | AC-02 declara "se invalida cache TanStack" pero no especifica la clave de cache ni el origen del invalidador (cambio de estado en US-030).                                                                                                                  | Sin contrato de invalidación, el dashboard no refleja el cambio en tiempo cercano a real y AC-02 se vuelve no testeable.                                | Tras decidir endpoint (Q1), definir explícitamente la query key (sugerida: `['event', eventId, 'tasks', 'progress']` o `['event', eventId, 'tasks', 'list']` según opción) e invalidador.   |
| Media     | "Endpoint `GET /api/v1/events/:id/tasks/progress`" no existe en `docs/16-API-Design-Specification.md`. US-014 lo dejó explícitamente abierto.                                                                                                              | Aprobación introduciría endpoint no listado en la API spec sin Documentation Alignment.                                                                | Resolver Q1 y, si la decisión introduce nuevo endpoint o nuevo campo, añadir Documentation Alignment Required contra `docs/16` (snapshot OpenAPI vía US-098, igual que US-032).             |
| Baja      | "i18n Notes: 4 locales" sin enumerar los locales soportados (en, es, pt-BR, fr según `docs/3` MVP).                                                                                                                                                       | Riesgo menor de testers no cubriendo todos los locales en QA.                                                                                          | Enumerar locales canónicos durante la refinación.                                                                                                                                          |
| Baja      | "Skeleton" en Loading State no define la duración mínima ni si el skeleton es accesible (aria-busy).                                                                                                                                                       | Riesgo menor de A11Y test fallando en CI.                                                                                                              | Añadir nota a accesibilidad (`aria-busy=true` mientras carga; `aria-valuenow`/`aria-valuemin`/`aria-valuemax` en la barra) durante la refinación.                                            |
| Baja      | Ausencia de notas explícitas sobre formato del valor `progress` en API (entero 0–100, decimal `0.0–100.0`, o ratio `0–1`).                                                                                                                                  | Riesgo de contrato API inconsistente con frontend.                                                                                                     | Tras decidir Q1, especificar tipo y rango.                                                                                                                                                  |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | Solo refresh por invalidación de cache; sin push.                                                                   |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                                                       |
| Respeta backend como source of truth | Pass      | Backend calcula `% done`; frontend lo consume.                                                                      |
| Respeta seed/demo si aplica          | Pass      | Seed existente de eventos/tareas alcanza para mostrar 0%, parcial y 100% en demo. No requiere cambios de seed.      |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                          |
| No introduce multi-tenant enterprise | Pass      | Continúa siendo ownership por `event.owner_id`.                                                                     |
| No introduce P4/Future scope         | Pass      | "Gráficos avanzados" queda Out of Scope. Endpoint agregado `/events/:id/dashboard` queda Future (`US-014` tech spec). |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                                                          | Problema detectado                                                                                                                                                                | Acción recomendada                                                                                                                                                                                                                |
| ----- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail / Not Testable                                       | Fórmula `M/N * 100` con `N` = "tareas activas no descartadas" no es operacional: no define qué cuenta como "activa", cómo se tratan IA no confirmadas, ni el redondeo aplicado. | Reescribir tras Q2. Ejemplo (sujeto a decisión): "Dado un evento con `T` tareas contables (`ai_generated=false` ∨ `confirmed=true`) y `D` en `status='done'`, cuando se consulta progreso, entonces `progress = round(D / (T - S) * 100)` donde `S` = tareas `skipped`; cuando `T - S = 0`, `progress = 0`." |
| AC-02 | Needs Detail                                                      | "Se invalida cache TanStack" no define la clave de cache, el evento disparador ni el SLA de propagación.                                                                          | Reescribir tras Q1. Especificar query key (p. ej. `['event', eventId, 'tasks', 'progress']`), invalidador (cambio de estado en US-030 / borrado en US-029) y "refleja nuevo % dentro del siguiente refetch".                       |

Negative tests presentes:
- `NT-01 Sin tareas → 0%` (cubierto a nivel de test, pero falta como EC explícito documentando "denominador 0").
- `NT-02 Ajeno → 403/404` (cubierto correctamente).

Faltantes:
- No-auth → 401 (alineado con US-027 SEC).
- Admin sobre endpoint de organizer → 403 (alineado con `adminExclusionGuard` reusado de US-027/US-032).
- Performance (P95 < 1.5 s, NFR-PERF-001) sin AC formal; solo "Success Criteria: Recalculo < 100ms" en Business Impact, valor no estándar.
- Accesibilidad (`aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`, `role=progressbar`) sin AC.

---

## 6. Gaps Detectados

### Producto / Negocio
- Falta consenso sobre qué tareas computan al denominador (todas, solo confirmadas, excluye `skipped`, excluye no confirmadas IA).
- Falta política para denominador 0 ("todo skipped" o "ninguna tarea contable").
- Falta semántica del valor mostrado (entero `%`, un decimal, formato locale).

### Backend / API
- Falta decisión: nuevo endpoint vs extensión del endpoint canónico vs campo agregado embebido. Ver Q1.
- Falta contrato API (request, response shape, status codes, paginación N/A).
- Falta política de cache (Cache-Control, ETag) si se opta por endpoint propio.
- Falta especificación del DTO `EventTaskProgressDto` (campos `done`, `total_countable`, `skipped`, `progress`).
- Falta consideración de transacción/lectura consistente con cambios en US-030 (`PATCH /tasks/:taskId/status`).

### Frontend / UX
- Falta nombre canónico del componente (`ProgressBar` declarado, ¿reusar `RadixProgress`/diseño design system o custom?).
- Falta especificación de `useTaskProgress` (clave, retries, refetchOnWindowFocus, polling vs invalidación).
- Falta empty state real ("Aún no tienes tareas" + CTA "Generar plan IA" si el evento es Draft sin plan).
- Falta tratamiento del estado `cancelled` / `completed` del evento sobre el badge (read-only, `event.completed` muestra `100%` o último valor calculado).

### Base de Datos
- No requiere migraciones nuevas si reusa `event_tasks` y el índice `idx_event_tasks_event_status_due` (declarado en US-032 tech spec).
- Falta validar que el plan SQL para `COUNT(*) FILTER (WHERE status = 'done') / NULLIF(COUNT(*) FILTER (WHERE status NOT IN ('skipped') AND <countable_predicate>), 0)` cumple `NFR-PERF-001` contra dataset de 200 tareas (alineado con PERF-01..03 de US-032).

### Seguridad / Autorización
- Falta declarar reuso explícito de `EventOwnershipPolicy`, `OrganizerRoleGuard` y `adminExclusionGuard` de US-027 (consistente con US-032).
- Falta declarar reuso del policy de no-revelación 404 ante recursos ajenos.
- Falta declarar política para evento `cancelled` (¿devuelve el último `%` calculado o 0? ¿404?).

### IA / PromptOps
No aplica — esta historia no invoca IA directamente.

### QA / Testing
- Falta agregar tests para auth (401), admin exclusion (403), evento `cancelled` (200 read-only o 404), denominador 0 y rounding.
- Falta test PERF dedicado contra `NFR-PERF-001`.
- Falta test A11Y para `role="progressbar"` y atributos ARIA.
- Falta contract test contra OpenAPI snapshot (alineado con US-098 declarado por US-032).

### Seed / Demo
No requiere cambios de seed/demo. El seed actual de tareas cubre los tres estados (0%, parcial, 100%) en eventos demo.

### Documentación / Trazabilidad
- IDs incorrectos en `FRD Requirement(s)`, `Use Case(s)`, `Business Rule(s)` y `NFR Reference(s)`. Corrección directa en refinación tras desbloquear Q1/Q2.
- Falta referencia a `BR-EVENT-009` (dashboard surface) y `C-027` (transiciones de estado, `docs/6`).
- Documento `/docs/8` no se enumera en Traceability.
- Endpoint `GET /tasks/progress` (si se aprueba) requiere Documentation Alignment Required contra `docs/16` y entrada explícita en snapshot OpenAPI por US-098.

---

## 7. Preguntas Pendientes

| Tipo  | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Bloquea aprobación | Responsable       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Tech  | Q1. ¿El `% done` se expone como nuevo endpoint `GET /api/v1/events/:eventId/tasks/progress`, como campo agregado en el response existente de `GET /api/v1/events/:eventId/tasks` (extensión consistente con US-032), o se calcula en frontend desde la lista cruda (opción b de US-014)? La opción elegida debe ser consistente con la declaración aprobada de US-032 ("PB-P1-019 no introduce nuevos verbos HTTP") o, en su defecto, explicitar un override formal vía PO + Documentation Alignment contra US-032 tech spec.                                                                                                                                                                              | Sí                 | Tech Lead + PO    |
| PO    | Q2. ¿Cuál es la fórmula canónica del progreso? Definir denominador (todas las tareas, solo confirmadas en sentido `ai_generated=false ∨ confirmed=true`, exclusión de `skipped`), tratamiento de tareas IA no confirmadas (FR-TASK-005), y política para denominador 0 (todo skipped o ninguna tarea contable → ¿0% o `null`?). US-014 ya formalizó `done / (total - skipped)`; debe extenderse a la regla de "tareas contables" para alinear con BR-TASK-009.                                                                                                                                                                                                                                            | Sí                 | Product Owner     |
| PO    | Q3. ¿Qué semántica visual y de API tiene el `%` para eventos en estado `completed` y `cancelled`? Opciones: (a) eventos `completed` muestran `100%` independientemente del cálculo; (b) `completed` muestra el último cálculo congelado; (c) `cancelled` devuelve `0%` o `404`.                                                                                                                                                                                                                                                                                                                                                                                                                          | Sí                 | Product Owner     |
| PO    | Q4. ¿El valor expuesto por API es entero `0..100`, decimal `0.0..100.0` con un decimal, o ratio `0.0..1.0`? ¿Redondeo `round half-even` o `round half-up`? La UI puede formatear según locale, pero el contrato API debe ser único.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Sí                 | Product Owner     |

---

## 8. Documentation Alignment Required

| Documento / Fuente                                                            | Conflicto detectado                                                                                                                                                                                                | Decisión vigente                                                                                                                  | Acción recomendada                                                                                                                                                                  | ¿Bloquea aprobación? |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/10-Non-Functional-Requirements.md`                                      | US-033 referencia `NFR-PERF-API-001`; el canónico es `NFR-PERF-001`.                                                                                                                                              | `NFR-PERF-001` es el ID oficial (P95 < 1.5 s).                                                                                    | Reemplazar `NFR-PERF-API-001` por `NFR-PERF-001` durante la refinación. Misma alineación ya registrada por US-032.                                                                  | No                   |
| `docs/16-API-Design-Specification.md`                                         | Endpoint `GET /api/v1/events/:id/tasks/progress` no está catalogado en M05 Event Tasks.                                                                                                                           | Pendiente Q1. Si se confirma nuevo endpoint, debe añadirse al snapshot OpenAPI (US-098).                                          | Tras Q1, actualizar `docs/16` o ratificar extensión del endpoint canónico. Snapshot OpenAPI por US-098 (Future).                                                                    | No (si Q1 resuelto)  |
| `management/technical-specs/P1/PB-P1-019/US-032-technical-spec.md` (aprobado) | US-032 declara que PB-P1-019 no introduce nuevos verbos HTTP; US-033 declara uno nuevo.                                                                                                                            | US-032 es vinculante para PB-P1-019.                                                                                              | Alinear US-033 con US-032 (extensión del endpoint o agregado embebido) o, alternativamente, abrir override formal con PO + revisión de US-032.                                       | Sí (Q1)              |
| `management/user-stories/US-014-view-event-dashboard.md` (aprobado)           | US-014 tech spec (`management/technical-specs/P1/PB-P1-008/US-014-technical-spec.md`) declara la decisión "endpoint agregado vs composición" como Future y consume el agregado de PB-P1-019 cuando esté disponible. | US-014 está aprobada bajo la asunción de que US-033 expone un agregado consumible (vía nuevo endpoint o vía DTO extendido).        | Tras Q1, registrar handoff explícito a US-014 (shape exacto del agregado y query key TanStack).                                                                                     | No (si Q1 resuelto)  |
| `docs/4-Business-Rules-Document.md` (BR-TASK-009)                             | BR-TASK-009 dice `done / total_confirmado`; US-014 formalizó `done / (total - skipped)`.                                                                                                                          | US-014 y BR-TASK-009 son compatibles si "confirmado" excluye `skipped` y AI no confirmadas. Falta explicitarlo.                  | Tras Q2, añadir aclaración (puede ser nota en BR-TASK-009 o decisión PO/BA Decisions Applied en US-033).                                                                            | No (si Q2 resuelto)  |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                          |
| User Story file path                       | `management/user-stories/US-033-view-progress-dashboard.md`                                 |
| User Story ID verified                     | Yes                                                                                         |
| Decision Resolution artifact found         | No                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-033-decision-resolution.md`                |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-033-refinement-review.md`                    |
| Final recommended status                   | Needs Refinement                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                         |
| Reason                                     | Existen 4 preguntas bloqueantes (Q1–Q4) que requieren decisión PO + Tech Lead antes de aprobar. La US no puede actualizarse en sitio porque resolver Q1 obliga a reescribir AC, Technical Notes y API, y resolver Q2 obliga a reescribir AC-01 y EC. |

---

## 10. Cambios Aplicados o Recomendados

(El archivo no fue actualizado. La siguiente lista es prescriptiva para aplicar tras la resolución de Q1–Q4.)

### Metadata
- `Last Updated` → fecha de la próxima ejecución de la skill.
- `Status` → `Ready for Approval` solo después de aplicar todos los cambios.

### Business Context
- Reformular `Assumptions`: en lugar de "Skip cuenta como completada para % o se excluye (definir: excluye)", documentar la decisión final de Q2 como assumption resuelto.
- Añadir explícito: "`ai_generated=true ∧ confirmed=false` ⇒ no cuenta al denominador (alineado con FR-TASK-005)" (sujeto a Q2).

### PO/BA Decisions Applied
- Añadir sección con las 4 decisiones (Q1–Q4) resueltas, citando `management/user-stories/decision-resolutions/US-033-decision-resolution.md`.

### Traceability
- `FRD Requirement(s)` → `FR-TASK-007` (cálculo de % completitud) + `FR-EVENT-008` (surface en dashboard).
- `Use Case(s)` → `UC-TASK-001` (ver checklist) + `UC-EVENT-004` (ver dashboard del evento).
- `Business Rule(s)` → `BR-TASK-009` (contribución al progreso) + `BR-EVENT-009` (dashboard).
- `NFR Reference(s)` → `NFR-PERF-001`.
- `Related Document(s)` → `/docs/4 §BR-TASK-009`, `/docs/8 §UC-EVENT-004 / §UC-TASK-001`, `/docs/9 §FR-TASK-007 / §FR-EVENT-008`, `/docs/10 §NFR-PERF-001`, `/docs/16 §M05` (o nueva entrada si Q1 introduce endpoint).
- `API Endpoint(s)` → resultado de Q1 (extensión del existente, nuevo endpoint, o computación frontend).

### Scope Guardrails
- Añadir a `Explicitly Out of Scope`: "Endpoint agregado `/events/:id/dashboard` (Future, decisión de US-014)".
- Mantener `Scope Notes: Sólo % global`.

### Acceptance Criteria
- Reescribir AC-01 con la fórmula final de Q2, redondeo de Q4 y manejo del denominador 0.
- Reescribir AC-02 con la query key TanStack exacta y el invalidador (cambio de estado US-030, borrado US-029).
- Añadir AC-03: respuesta para evento `completed` y `cancelled` (resultado de Q3).
- Añadir AC-04: contrato API (status 200, shape del DTO, ejemplo de payload).
- Añadir AC-05: A11Y (`role="progressbar"`, `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-busy=true` durante loading).
- Añadir AC-06: P95 < 1.5 s contra `NFR-PERF-001` con 200 tareas.

### Edge Cases
- EC-02: "Todas las tareas son `skipped`" → según política Q2, p. ej. `0%` con copy "Sin tareas contables".
- EC-03: "Solo tareas IA no confirmadas" → según política Q2.
- EC-04: "Evento `cancelled`" → según política Q3.
- EC-05: "Evento `completed`" → según política Q3.

### Validation Rules
- VR-02: `eventId` debe ser UUID válido → `400` (alineado con `docs/16 §validación de path params`).
- VR-03: Sin sesión → `401` (consistente con US-027).

### Authorization & Security Rules
- SEC-02: Admin → `403` (`adminExclusionGuard` reusado de US-027/US-032).
- SEC-03: Reuso explícito de `EventOwnershipPolicy` y `OrganizerRoleGuard`.
- SEC-04: No-revelación 404 ante recurso ajeno (consistente con US-027 §SEC-04).

### Technical Notes
- Backend: declarar reuso de repositorio paginado de US-027, índice canónico, controller (extensión o nuevo según Q1), use case `GetTaskProgressUseCase` o extensión de `ListEventTasksUseCase`.
- Frontend: declarar componente `ProgressBar` con design system tokens, `useTaskProgress` hook, query key explícita.
- API: declarar contrato exacto tras Q1 + Q4.
- Observability: añadir log estructurado `tasks.progress.requested` con `eventId`, `userId`, `progress`, `done`, `total_countable`, `skipped`.
- Sin migraciones; reusar `idx_event_tasks_event_status_due`.

### Test Scenarios
- Añadir TS-03 (auth 401), TS-04 (admin 403), TS-05 (`completed`/`cancelled`), TS-06 (denominador 0), TS-07 (rounding), PERF-01 (P95), A11Y-01 (`aria-valuenow`).
- Añadir contract test contra OpenAPI snapshot (handoff a US-098).

### Definition of Ready
- Marcar `[x] PO/BA validó` solo tras aprobación.

### Definition of Done
- Añadir: A11Y verificada, contract test OpenAPI verde, log estructurado emitido, query key TanStack documentada en `apps/web/lib/queryKeys.ts`.

### Notes
- Reformular `Confirmar política con tareas skipped` por la decisión final.
- Añadir handoff a US-014 (consumo desde dashboard) y referencia a snapshot OpenAPI por US-098.

---

## 11. Recomendación Final

`Needs Refinement`

La historia no puede actualizarse en sitio porque cuatro decisiones (Q1: endpoint vs extensión vs cómputo frontend; Q2: fórmula canónica del denominador y manejo de IA no confirmadas; Q3: semántica para eventos `completed`/`cancelled`; Q4: tipo/rango/redondeo del valor expuesto) están abiertas y bloquean reescritura de AC, EC, Technical Notes y Traceability. Tres son decisiones de PO (Q2, Q3, Q4) y una requiere acuerdo Tech Lead + PO (Q1, por la contradicción con la Technical Specification ya aprobada de US-032).

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review para resolver Q1–Q4 desde la documentación aprobada o, en su defecto, elevarlas a PO formal.

---

User Story file updated: No
Path: management/user-stories/US-033-view-progress-dashboard.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-033-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
