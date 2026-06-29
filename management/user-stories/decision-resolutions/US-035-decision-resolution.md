# PO/BA Decision Resolution — US-035

## Source User Story File
management/user-stories/US-035-view-edit-budget.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-035-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-035                                                                                                         |
| User Story file path                         | `management/user-stories/US-035-view-edit-budget.md`                                                          |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-035-refinement-review.md`                                       |
| Existing decision resolution found           | No                                                                                                             |
| Backlog Item                                 | PB-P1-020 — Gestión de presupuesto + BudgetItems                                                              |
| Epic                                         | EPIC-BUD-001 — Budget Management & Currency                                                                    |
| Estado antes de decisiones                   | Needs Refinement                                                                                               |
| Cantidad de preguntas revisadas              | 4 (Q1, Q2, Q3, Q4)                                                                                             |
| Decisiones PO/BA tomadas                     | 4                                                                                                              |
| Decisiones técnicas recomendadas             | 0 (Q1 se resuelve con apoyo de `docs/16 §M06`, `BR-BUDGET-003`, `FR-BUDGET-004` y `US-036`, todos aprobados)    |
| ¿Desbloquea aprobación?                      | Sí                                                                                                             |
| User Story file updated                      | Yes                                                                                                            |
| Decision Resolution artifact created/updated | Yes                                                                                                            |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-035-decision-resolution.md`                                   |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                                            |

---

## 2. Decisiones Respondidas

## Decisión 1 — Alcance real de US-035: solo vista

### Pregunta original

> ¿Cuál es el alcance real de US-035? Opciones: (a) solo vista; (b) vista + edición inline delegada a US-036; (c) introducir `PATCH /api/v1/events/:eventId/budget` con semántica distinta.

### Respuesta PO/BA

US-035 es **solo vista**. Expone únicamente `GET /api/v1/events/:eventId/budget`. Todas las mutaciones (CRUD de `BudgetItem`) viven en US-036 vía `POST/PATCH/DELETE /api/v1/events/:eventId/budget/items`. Desde la UI de US-035 se incluyen deeplinks a US-036 (CTA "Crear primera categoría", botones "Editar" y "Eliminar" por fila).

### Decisión formal

```text
US-035 expone solo `GET /api/v1/events/:eventId/budget` y no introduce ningún PATCH/POST/DELETE. Las mutaciones se delegan íntegramente a US-036 (POST/PATCH/DELETE /api/v1/events/:eventId/budget/items). AC-02 "Editar total" se ELIMINA por contradecir BR-BUDGET-003 (total derivado) y la API spec aprobada (docs/16 §M06). La UI de US-035 expone deeplinks/aux UI a US-036; la implementación de los handlers de mutación pertenece a US-036.
```

### Rationale

1. **`BR-BUDGET-003`** establece `total = SUM(BudgetItem.planned)` y `committed = SUM(BudgetItem.committed)`. No existe un `total` editable en el `Budget` por sí mismo.
2. **`FR-BUDGET-004`** confirma el cálculo en vivo de totales.
3. **`docs/16-API-Design-Specification.md §M06`** cataloga solo `GET /events/:eventId/budget`; todas las mutaciones están en `/events/:eventId/budget/items`. Introducir un PATCH nuevo contradice un artefacto aprobado.
4. **`docs/8 §UC-BUDGET-003`** ("Ver presupuesto con warning de exceso") corresponde exactamente al alcance de US-035.
5. **`US-036`** (PB-P1-020, posición 2) cubre el CRUD de BudgetItem; duplicar lógica en US-035 viola "no scope creep" y crea ambigüedad de ownership entre historias.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metadata                | Cambiar título a "Ver mi presupuesto" o aclarar que "editar" implica deeplinks a US-036.                                                                  |
| Business Context        | Reformular `Context Summary` con el modelo derivado y separación clara con US-036.                                                                        |
| PO/BA Decisions Applied | Agregar D1.                                                                                                                                               |
| Dependencies            | Añadir US-036 (CRUD de BudgetItem), PB-P1-020 (backlog item), opcionalmente US-037 (sugerencia IA).                                                        |
| Traceability            | `API Endpoint(s)` → solo `GET /api/v1/events/:eventId/budget`. `Use Case(s)` → `UC-BUDGET-003`. Eliminar PATCH.                                            |
| Scope Guardrails        | Añadir a `Explicitly Out of Scope`: `PATCH /budget`, CRUD de items (US-036), generación IA (US-037), conversión FX, multi-moneda.                          |
| Acceptance Criteria     | Eliminar AC-02. Reescribir AC-01 con shape de vista, warning, formato CLDR. Añadir AC para auth, A11Y, perf, contract.                                    |
| Technical Notes         | Backend: solo `GetBudgetUseCase`. Frontend: deeplinks a US-036. API: única ruta GET.                                                                       |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional. La decisión es consistente con `docs/16 §M06`, `BR-BUDGET-003`, `FR-BUDGET-004` y `UC-BUDGET-003`, todos artefactos aprobados.

---

## Decisión 2 — CTA "Sugerir IA" en Empty State

### Pregunta original

> ¿El Empty State debe incluir el CTA "Sugerir IA"? Si sí, ¿deeplink a US-037 o fuera de alcance?

### Respuesta PO/BA

El CTA "Sugerir IA" se mantiene en el Empty State como **deeplink** a US-037 (PB-P1-013). US-035 NO invoca IA directamente. El CTA se renderiza condicionalmente solo si US-037 está disponible (feature flag `ai.budget-suggestion.enabled` o equivalente; si no existe la flag, asumir habilitado por default en MVP).

### Decisión formal

```text
Empty State de US-035 expone dos CTAs:
1. "Crear primera categoría" → deeplink a la UI de US-036 (CRUD BudgetItem).
2. "Sugerir IA" → deeplink a la UI de US-037 (PB-P1-013 — sugerencia AI-003).

Ambos son enlaces de navegación; US-035 NO realiza la mutación ni invoca al LLMProvider. El CTA "Sugerir IA" puede ocultarse vía feature flag si US-037 todavía no está disponible.
```

### Rationale

1. **Demo-first** (Principio #3): el Empty State necesita una llamada de acción clara que motive completar el presupuesto.
2. **Human-in-the-loop** (Principio #4): la generación IA ya tiene su propia historia (US-037) con HITL formal; US-035 solo enlaza.
3. **No scope creep**: el CTA no introduce lógica IA en US-035.
4. **MVP-first**: deeplinks son simples y reusables; la feature flag protege contra rollouts fuera de orden.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D2.                                                                                                                               |
| Acceptance Criteria     | EC-01 reescrito: Empty State con CTAs "Crear primera categoría" → US-036 y "Sugerir IA" → US-037 (condicional a feature flag).             |
| UX / UI Notes           | Documentar Empty State con copy y links destino; mencionar feature flag.                                                                  |
| Dependencies            | Añadir US-037 (opcional, solo si el CTA "Sugerir IA" está habilitado).                                                                     |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Tratamiento de la columna `paid` opcional

### Pregunta original

> ¿Cómo se trata la columna `paid` (opcional en MVP, BR-BUDGET-002)?

### Respuesta PO/BA

La columna `paid` se muestra **siempre**. El backend normaliza `null → 0` en el response. La UI renderiza la columna fija con valor `0` cuando no haya `paid` registrado. Esto evita lógica condicional en la tabla y mantiene la auditoría consistente entre eventos.

### Decisión formal

```text
- En el response del endpoint GET /api/v1/events/:eventId/budget, cada BudgetItem expone `paid: number (>= 0)` siempre presente.
- Si en BD `paid IS NULL`, el backend normaliza a `0` antes de serializar.
- La UI muestra la columna `paid` en todas las filas con formato CLDR de moneda.
- El total `paid_total = SUM(BudgetItem.paid)` se expone en el bloque `summary` del response y se muestra como métrica adicional en el header de la card de presupuesto.
- `paid` sigue siendo opcional en BD (BR-BUDGET-002); la edición de `paid` queda fuera del alcance de US-035 (vista) y pertenece al alcance de edición de BudgetItem (US-036) o a una historia futura.
```

### Rationale

1. **Predictibilidad UI**: una columna fija es más simple, evita CLS (Cumulative Layout Shift) y simplifica los tests A11Y/visual.
2. **MVP-first**: la normalización `null → 0` en backend es trivial y no agrega lógica en frontend.
3. **Consistencia con `BR-BUDGET-002`**: el campo sigue siendo opcional en BD; solo se normaliza el response.
4. **Auditoría**: `paid_total` complementa `total_planned` y `total_committed` en la vista, dando un panorama financiero más completo en demo.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D3.                                                                                                                               |
| Business Context        | Aclarar `Assumptions`: `paid` normalizado a `0` en response; persistencia BD permanece nullable.                                          |
| Acceptance Criteria     | AC-01 reescrito con columna `paid` y `paid_total`.                                                                                        |
| UX / UI Notes           | Tabla con columnas: Categoría, Planned, Committed, Paid, Δ (planned − committed) y notas A11Y (`scope="col"`).                              |
| Technical Notes         | Backend normaliza `null → 0` en serialización; sin migraciones.                                                                            |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Origen del flag `over_committed`

### Pregunta original

> ¿El warning de exceso (`committed > total`) se entrega solo como bandera UI o también como flag server-side?

### Respuesta PO/BA

El flag `over_committed` se calcula **server-side** y se expone en el response. La UI lo lee y muestra el warning sin recalcular. Esto cumple "backend como source of truth" y permite reuso por admin (US-016) y consumidores futuros.

### Decisión formal

```text
El response de GET /api/v1/events/:eventId/budget expone un bloque `summary` con:

  summary: {
    total_planned: number (>= 0),
    total_committed: number (>= 0),
    paid_total: number (>= 0),
    over_committed: boolean,            // = (total_committed > total_planned)
    currency_code: enum CurrencyCode    // moneda del evento, heredada
  }

La UI lee `summary.over_committed` y muestra el banner de warning visible no bloqueante cuando es `true` (FR-BUDGET-005, AC-BUDGET-001). El frontend NO recalcula localmente la condición.
```

### Rationale

1. **Backend como source of truth** (Principio #5): consistente con el patrón aplicado en US-033 (D3) y otros surfaces server-driven.
2. **Reuso por admin**: US-016 (admin view) puede consumir el mismo flag sin duplicar lógica.
3. **Auditoría**: el flag puede formar parte del log estructurado `budget.viewed` para detectar eventos con `over_committed = true` y disparar futuras alertas (Future).
4. **MVP-first**: campo simple, sin breaking changes futuros si se decide enriquecer el flag (`over_committed_by_amount`, etc.).

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D4.                                                                                                                   |
| Acceptance Criteria     | AC-03 nuevo: warning visible si `summary.over_committed = true` (FR-BUDGET-005, AC-BUDGET-001).                                 |
| Technical Notes         | Backend: cálculo en `GetBudgetUseCase`. Frontend: lectura sin recálculo; banner accesible con `role="alert"` o `aria-live`.   |
| Validation Rules        | Añadir VR-05: UI no recalcula `over_committed` localmente.                                                                    |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                  | Decisión                                                                                                                                       | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------- | -------------------- |
|  1 | Alcance: solo vista                    | US-035 expone solo `GET /api/v1/events/:eventId/budget`. Sin PATCH. CRUD delegado a US-036.                                                      | PO   | Sí                     | No                   |
|  2 | CTA "Sugerir IA"                      | Deeplink a US-037 (PB-P1-013), condicionado por feature flag. US-035 NO invoca IA.                                                              | PO   | Sí                     | No                   |
|  3 | Columna `paid`                        | Siempre visible; backend normaliza `null → 0`; `paid_total` en `summary`.                                                                       | PO   | Sí                     | No                   |
|  4 | Flag `over_committed`                 | Calculado server-side y expuesto en `summary.over_committed`. UI lee sin recalcular.                                                            | PO   | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Status` → `Ready for Approval`.
- `Last Updated` → `2026-06-27`.
- Añadir `Backlog Item: PB-P1-020`.

### Business Context
- `Context Summary` reformulado: vista server-driven con totales derivados y flag `over_committed` server-side.
- `Assumptions`: `paid` normalizado a `0` en response; persistencia nullable.
- `Dependencies`: añadir US-036 (CRUD), US-037 (opcional, IA), PB-P1-020 (backlog).

### PO/BA Decisions Applied
- Sección nueva con D1–D4 formalizadas.

### Traceability
- `FRD Requirement(s)`: `FR-BUDGET-001`, `FR-BUDGET-004`, `FR-BUDGET-005`, `FR-BUDGET-007`, `FR-BUDGET-010`.
- `Use Case(s)`: `UC-BUDGET-003`.
- `Business Rule(s)`: `BR-BUDGET-001`, `BR-BUDGET-002`, `BR-BUDGET-003`, `BR-BUDGET-004`, `BR-BUDGET-006`, `BR-BUDGET-007`, `BR-BUDGET-010`.
- `Permission Rule(s)`: Ownership + `OrganizerRoleGuard` + `adminExclusionGuard`.
- `Data Entity / Entities`: `Budget`, `BudgetItem`, `ServiceCategory`.
- `API Endpoint(s)`: solo `GET /api/v1/events/:eventId/budget`.
- `NFR Reference(s)`: `NFR-PERF-001`.
- `Related Document(s)`: `/docs/4 §BR-BUDGET-*`, `/docs/6 §Budget §BudgetItem`, `/docs/8 §UC-BUDGET-003`, `/docs/9 §FR-BUDGET-*`, `/docs/10 §NFR-PERF-001`, `/docs/16 §M06`.

### Scope Guardrails
- `Explicitly Out of Scope`: `PATCH /budget`, CRUD de BudgetItem (US-036), generación IA (US-037), conversión FX, multi-moneda, edición de moneda.

### Acceptance Criteria
- AC-01 reescrito con shape de vista, columnas, formato CLDR, warning visible si over_committed.
- AC-02 ELIMINADO.
- AC-03 nuevo: warning visible y no bloqueante si `summary.over_committed = true` (FR-BUDGET-005).
- AC-04 nuevo: shape canónico del response `{ summary, items[] }`.
- AC-05 nuevo: i18n + currency CLDR en `es-LATAM`, `es-ES`, `pt`, `en`.
- AC-06 nuevo: independencia del cálculo respecto a `event.status` (consistencia con US-033).
- AC-07 nuevo: P95 < 1.5 s (NFR-PERF-001).
- AC-08 nuevo: A11Y de tabla (`role="table"`, `<caption>`, `scope`).

### Edge Cases
- EC-01 reescrito (sin items): Empty State con CTAs "Crear primera categoría" → US-036 y "Sugerir IA" → US-037.
- EC-02 nuevo: `committed > total` ⇒ warning visible.
- EC-03 nuevo: todos los items con `paid IS NULL` ⇒ columna muestra `0` formateado.
- EC-04 nuevo: evento `cancelled` ⇒ 200 + vista read-only con banner.
- EC-05 nuevo: evento `completed` ⇒ 200 + vista read-only con banner.
- EC-06 nuevo: moneda inmutable en encabezado.

### Validation Rules
- VR-01 ownership ⇒ 403/404.
- VR-02 `eventId` UUID válido ⇒ 400.
- VR-03 sin sesión ⇒ 401.
- VR-04 no aceptar cambio de moneda (BR-BUDGET-006).
- VR-05 UI no recalcula `over_committed`.

### Authorization & Security Rules
- SEC-01 `EventOwnershipPolicy` + `OrganizerRoleGuard`.
- SEC-02 `adminExclusionGuard`; admin usa surface auditado (US-016).
- SEC-03 no-revelación 404.
- SEC-04 logging sin PII; montos como atributos numéricos.
- SEC-05 estado del evento NO altera contrato de autorización (consistente con D3 de US-033).

### Technical Notes
- Backend: `GetBudgetUseCase` retorna `{ summary, items }`; normaliza `paid null → 0`; calcula `over_committed`.
- Frontend: `useEventBudget(eventId)` con TanStack key `['event', eventId, 'budget']`; componentes `BudgetView`, `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning`, `EmptyBudgetState`.
- API: única ruta `GET /api/v1/events/:eventId/budget`.
- Observability: log `budget.viewed` con `eventId`, `userId`, `currency_code`, `total_planned`, `total_committed`, `paid_total`, `over_committed`, `items_count`, `correlationId`. Sin PII.

### Test Scenarios
- TS-01 ver budget completo con summary y items.
- TS-02 warning visible cuando `summary.over_committed = true`.
- TS-03 empty state con CTAs correctos.
- TS-04 columna `paid` con normalización `0`.
- TS-05 i18n + currency CLDR en 4 locales.
- TS-06 `cancelled`/`completed` ⇒ 200 + banner.
- AUTH-TS-01 dueño 200.
- AUTH-TS-02 ajeno 404.
- AUTH-TS-03 admin 403.
- AUTH-TS-04 sin sesión 401.
- PERF-01 P95 < 1.5 s.
- A11Y-01 tabla accesible + banner accesible.
- CONTRACT-01 OpenAPI snapshot.

### Definition of Ready
- Marcar `[x] PO/BA validó`.

### Definition of Done
- Añadir: A11Y verificada, contract test verde, log emitido, query key documentada, deeplinks a US-036/US-037 verificados, snapshot OpenAPI (handoff US-098).

### Notes
- Reemplazar nota original por: "Política de `paid`, alcance solo vista, y origen server-side de `over_committed` definidos en D1/D3/D4. Currency formatting CLDR vía `Intl.NumberFormat`."

---

## 5. Documentation Alignment Required

| Documento / Fuente                                    | Conflicto detectado                                                                                                                          | Decisión vigente                                                                                  | Acción recomendada                                                                                                                              | ¿Bloquea aprobación? |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/10-Non-Functional-Requirements.md`              | US-035 original usaba `NFR-PERF-API-001`; el canónico es `NFR-PERF-001`.                                                                      | `NFR-PERF-001` (P95 < 1.5 s).                                                                      | Corregido en US-035 (Traceability). Misma alineación ya registrada por US-032/US-033. No bloquea.                                                | No                   |
| `docs/16-API-Design-Specification.md §M06`            | El response del endpoint se extiende con `summary` (`over_committed`, `paid_total`) y normalización de `paid`. M06 no documenta este shape.    | D1, D3, D4 (este artefacto) confirman extensión del response y normalización.                      | Actualizar `docs/16 §M06` para reflejar el shape extendido. Snapshot OpenAPI por US-098 (Future). No bloquea.                                     | No                   |
| `docs/6-Domain-Data-Model.md §Budget`                  | `total_planned`/`total_committed` declarados como "calculados o materializados". US-035 los consume; no exige decisión BD.                    | Cualquier estrategia (live SUM vs materializado) es compatible con D1.                            | Documentar la elección final en el Technical Spec; sin acción documental.                                                                       | No                   |
| `docs/4 §BR-BUDGET-002`                                | "`paid` opcional en MVP" no clarifica si se muestra en UI. D3 formaliza: visible siempre con `0` por default.                                 | D3 (este artefacto).                                                                              | Añadir nota interpretativa a BR-BUDGET-002 referenciando D3. No bloquea.                                                                         | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                         |
| User Story file path                         | `management/user-stories/US-035-view-edit-budget.md`                                        |
| Decision Resolution artifact created/updated | Yes                                                                                         |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-035-decision-resolution.md`                |
| New User Story status                        | Ready for Approval                                                                          |
| Remaining blockers                           | No                                                                                          |
| Reason                                       | 4/4 decisiones bloqueantes (Q1–Q4) resueltas con respaldo en `docs/4/6/8/9/10/16` y en US-036/US-037 ya aprobados. 4 ítems quedan como Documentation Alignment Required, ninguno bloquea. |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`

Las 4 decisiones bloqueantes están formalizadas y consistentes con la API spec aprobada (`docs/16 §M06`), el modelo de dominio (`docs/6 §Budget`), las reglas de negocio (`BR-BUDGET-001/002/003/004/006/010`) y el patrón ya aplicado por US-033 (D3 server-side). La US queda actualizada en sitio.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo actualizado management/user-stories/US-035-view-edit-budget.md.
2. Ejecutar `eventflow-user-story-refinement` para revalidación opcional.
3. Ejecutar `eventflow-user-story-approval`.
4. Tras aprobación, ejecutar `eventflow-user-story-technical-spec` y `eventflow-user-story-to-development-tasks`.
```

---

User Story file updated: Yes
Path: management/user-stories/US-035-view-edit-budget.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-035-decision-resolution.md
Next step: Run `eventflow-user-story-approval` or run `eventflow-user-story-refinement` again if a second validation pass is desired.
