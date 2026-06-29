# PO/BA Decision Resolution — US-038

## Source User Story File
management/user-stories/US-038-budget-overcommitted-warning.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-038-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-038                                                                                                         |
| User Story file path                         | `management/user-stories/US-038-budget-overcommitted-warning.md`                                              |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-038-refinement-review.md`                                       |
| Existing decision resolution found           | No                                                                                                             |
| Backlog Item                                 | PB-P1-022 — Warning de overcommit del presupuesto                                                            |
| Epic                                         | EPIC-BUD-001 — Budget Management & Currency                                                                    |
| Estado antes de decisiones                   | Needs Refinement                                                                                               |
| Cantidad de preguntas revisadas              | 4 (Q1–Q4)                                                                                                      |
| Decisiones PO/BA tomadas                     | 4                                                                                                              |
| Decisiones técnicas recomendadas             | 0                                                                                                              |
| ¿Desbloquea aprobación?                      | Sí                                                                                                             |
| User Story file updated                      | Yes                                                                                                            |
| Decision Resolution artifact created/updated | Yes                                                                                                            |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-038-decision-resolution.md`                                   |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                                            |

---

## 2. Decisiones Respondidas

## Decisión 1 — US-038 EXTIENDE el contrato de US-035 con delta y badges per-item

### Pregunta original

> ¿US-038 se subsume en US-035 o extiende el contrato?

### Respuesta PO/BA

US-038 **extiende incrementalmente** el contrato server-side ya entregado por US-035 (D4: `summary.over_committed`) con tres elementos diferenciales que el backlog item PB-P1-022 ("UI muestra mensaje claro y delta") y la `Assumption` de US-038 ("badge a nivel item") declaran y que US-035 no entregó:

1. `summary.overcommitted_amount: number` — monto del exceso (`total_committed - total_planned`) expuesto server-side.
2. `items[].over_committed: boolean` — bandera per-item server-side.
3. `items[].overcommitted_amount: number` — monto del exceso por fila (`item.committed - item.planned`).

US-038 NO introduce endpoint nuevo: extiende `GetBudgetUseCase` (US-035) reusando el mismo `GET /api/v1/events/:eventId/budget`. La UI extiende `BudgetSummary` y `BudgetItemsTable` (US-035) sin duplicar el `OvercommitWarning`.

### Decisión formal

```text
Extensión incremental del response de GET /api/v1/events/:eventId/budget (US-035):

  summary: {
    ... (campos existentes de US-035)
    overcommitted_amount: number (≥ 0, en moneda del evento)   // NUEVO US-038
  },
  items: [
    {
      ... (campos existentes de US-035)
      over_committed: boolean,                                  // NUEVO US-038
      overcommitted_amount: number (≥ 0)                        // NUEVO US-038
    }
  ]

Reglas:
- `summary.overcommitted_amount = max(0, total_committed - total_planned - tolerance_summary)`.
- `item.over_committed = item.committed > item.planned + tolerance_item`.
- `item.overcommitted_amount = max(0, item.committed - item.planned)` (sin tolerancia en el monto, solo en la condición booleana).
- Cálculo server-side; UI NO recalcula (consistente con US-035 VR-05).
- US-038 NO introduce endpoint; reusa GET /budget.
- US-038 NO duplica el banner del summary (vive en US-035 AC-03); SÍ añade visualización del delta dentro del banner.
- US-038 SÍ introduce badge per-item nuevo en `BudgetItemsTable`.
```

### Rationale

1. **Backlog PB-P1-022** declara explícitamente "UI muestra mensaje claro y **delta**" — el delta es entregable diferenciador no cubierto por US-035.
2. **Assumption original de US-038**: "Banner amarillo y **badge a nivel item**" — el badge no existe en US-035.
3. **MVP-first**: extender el response de un endpoint existente vs crear US/endpoint nuevos.
4. **Coherencia con US-035 D1/D4**: única ruta `GET /budget`, cálculos server-side.
5. **No scope creep**: el bloqueo de gastos se mantiene Out of Scope (BR-BUDGET-004).
6. **Auditoría**: el delta enriquece el log `budget.viewed` ya emitido por US-035.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metadata                | `Backlog Item: PB-P1-022`.                                                                                                                                                |
| Business Context        | Reformular: extensión incremental de US-035; sin endpoint nuevo; cálculo server-side.                                                                                      |
| Dependencies            | Añadir US-035 (productor), US-036 (mutaciones invalidan cache), US-039 (BookingIntent confirm actualiza committed).                                                        |
| PO/BA Decisions Applied | Agregar D1.                                                                                                                                                               |
| Traceability            | API: reuso de `GET /api/v1/events/:eventId/budget` (sin endpoint nuevo).                                                                                                  |
| Scope Guardrails        | Out of Scope: endpoint nuevo, persistir `over_committed` en BD, bloqueo de gastos.                                                                                          |
| Acceptance Criteria     | AC-01 reescrito: extensión del response con delta y badges.                                                                                                                |
| Technical Notes         | Extensión de `GetBudgetUseCase`, `BudgetSummary`, `BudgetItemsTable`. Sin migraciones.                                                                                      |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — CTAs: "Editar items" en el banner; scroll/focus en el badge per-item

### Pregunta original

> ¿Qué CTAs muestra el banner/badge?

### Respuesta PO/BA

El banner del summary (entregado por US-035) gana **un solo CTA**: "Editar items" como deeplink a la primera fila de `BudgetItemsTable` con `over_committed = true` (anchor + focus). Esto reemplaza la CTA "Ajustar total" del draft original, descartada por D1 de US-035 (`total` es derivado y no se muta directamente). El badge per-item NO tiene CTA propio: es informativo y se complementa con el botón "Editar" de US-036 que ya existe en cada fila.

### Decisión formal

```text
- Banner del summary (US-035 AC-03 + extensión US-038):
  - CTA único: "Editar items" → scroll suave + focus en la primera fila con `over_committed = true`.
  - Si no hay items individuales con over_committed (caso teórico: el summary excede pero no por una fila particular sino por suma de varias dentro de tolerancia), el CTA hace scroll a la tabla sin focus específico.

- Badge per-item:
  - Solo informativo (sin CTA propio).
  - `aria-label` localizado con el delta: "Categoría sobrecomprometida por {amount} {currency}".
  - Se complementa con el botón "Editar" de la fila ya entregado por US-036.

- Botón "Ajustar total" del draft original: ELIMINADO.
```

### Rationale

1. **D1 de US-035**: `total` es derivado (`SUM(planned)`); no existe acción "Ajustar total".
2. **Consistencia con US-036**: la edición de items es el camino canónico para reducir `committed` o aumentar `planned`.
3. **MVP-first**: una sola CTA en el banner reduce ruido; el badge informativo evita duplicar acciones.
4. **A11Y**: `aria-label` del badge transmite el delta sin requerir interacción.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D2.                                                                                                       |
| Acceptance Criteria     | AC reescrito: CTA "Editar items" + comportamiento de scroll/focus.                                                |
| UX / UI Notes           | Primary Action: "Editar items". Eliminar "Ajustar total".                                                          |
| Accessibility           | `aria-label` del badge con delta localizado.                                                                       |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Tolerancia adaptativa por `currency.decimal_places`

### Pregunta original

> ¿Política exacta de tolerancia?

### Respuesta PO/BA

La tolerancia se calcula como `10^(-decimal_places)` donde `decimal_places` es el número de decimales canónicos de la moneda del evento (catálogo `Currency`). Esto cubre correctamente USD/EUR/MXN/COP (2 decimales ⇒ tolerancia 0.01) y monedas sin decimales como CLP/JPY (0 decimales ⇒ tolerancia 1). La misma tolerancia se aplica al summary y a los items.

### Decisión formal

```text
- decimal_places = lookup en catálogo Currency por `event.currency_code`.
- tolerance = 10 ^ (-decimal_places):
  - decimal_places = 2 (USD, EUR, MXN, COP, GTQ) ⇒ tolerance = 0.01.
  - decimal_places = 0 (CLP, JPY, etc.) ⇒ tolerance = 1.
- Aplica a:
  - `summary.over_committed = (total_committed - total_planned) > tolerance`.
  - `item.over_committed = (item.committed - item.planned) > tolerance`.
- El delta expuesto (`overcommitted_amount`) NO aplica tolerancia (es el monto bruto del exceso); solo la bandera booleana usa la tolerancia.
- La tolerancia evita "false positives" por redondeo, no por design.

Fallback defensivo:
- Si `currency_code` no está en el catálogo, asumir `decimal_places = 2` y registrar warning en logs.
```

### Rationale

1. **EC-01 original**: "Tolerancia 0.01 unidad de la moneda" se interpreta literalmente como "una unidad mínima" — para CLP eso es 1, no 0.01.
2. **Correctitud para monedas sin decimales**: usar 0.01 en CLP nunca activaría la tolerancia (no existen centavos).
3. **Catálogo `Currency`**: ya existe en domain model (`docs/6 §Currency`) con campo `decimal_places` (o equivalente).
4. **MVP-first**: una regla simple parametrizada por currency en lugar de matriz de monedas.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D3.                                                                                                       |
| Acceptance Criteria     | AC reescrito con tolerancia adaptativa.                                                                           |
| Edge Cases              | EC-01 reescrito con tolerancia adaptativa; EC nuevo para CLP/JPY.                                                  |
| Technical Notes         | `GetBudgetUseCase` lee `currency.decimal_places` del catálogo y calcula `tolerance`.                              |
| Validation Rules        | Documentar fallback defensivo (`decimal_places = 2` si moneda no catalogada).                                      |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

Documentation Alignment Required (no bloqueante): verificar que el catálogo `Currency` en `docs/6` y la tabla `currencies` (PB-P0-001) expone `decimal_places`. Si falta, abrir tarea DOC.

---

## Decisión 4 — Condición del badge per-item con la tolerancia de D3

### Pregunta original

> ¿Condición exacta del badge per-item?

### Respuesta PO/BA

`item.over_committed = (item.committed - item.planned) > tolerance` donde `tolerance` es la calculada por D3 según `currency.decimal_places`. Es la misma fórmula que el summary, aplicada a nivel de fila.

### Decisión formal

```text
item.over_committed = (item.committed - item.planned) > tolerance

Donde tolerance proviene de D3 según event.currency_code.

Casos límite:
- item.committed = item.planned exactamente ⇒ over_committed = false.
- item.committed - item.planned = tolerance exactamente ⇒ over_committed = false (estricto >).
- item.committed - item.planned = tolerance + epsilon ⇒ over_committed = true.
- item.planned = 0 con item.committed > 0 ⇒ over_committed = true (sobrecompromiso desde cero).
```

### Rationale

1. **Consistencia con D3**: misma fórmula del summary aplicada per-item; sin matrices distintas.
2. **MVP-first**: regla simple y testeable boundary-by-boundary.
3. **Caso `planned = 0`**: representa un item creado pero sin presupuesto aún (e.g., AI sugiere categoría y el organizador no le asigna monto); cualquier commitment > 0 debe alertar.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D4.                                                                                                       |
| Acceptance Criteria     | AC nuevo: badge per-item con la condición de D4.                                                                  |
| Edge Cases              | EC nuevo: `item.planned = 0` con `item.committed > 0` ⇒ badge.                                                    |
| Test Scenarios          | TS-boundary y NT-boundary para verificar tolerancia.                                                              |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                          | Decisión                                                                                                                                          | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ---------------------- | -------------------- |
|  1 | Alcance (subsumir vs extender)                 | **Extender** US-035 con `summary.overcommitted_amount`, `items[].over_committed`, `items[].overcommitted_amount`. Sin endpoint nuevo.              | PO+Tech | Sí                     | No                   |
|  2 | CTAs                                           | Banner: "Editar items" (scroll/focus a primera fila over_committed). Badge per-item: solo informativo, `aria-label` con delta. Sin "Ajustar total". | PO      | Sí                     | No                   |
|  3 | Tolerancia                                     | Adaptativa: `tolerance = 10^(-currency.decimal_places)`. Misma para summary e items.                                                              | PO      | Sí                     | Doc Alignment        |
|  4 | Condición badge per-item                       | `item.over_committed = (item.committed - item.planned) > tolerance` con tolerancia de D3.                                                          | PO      | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Status` → `Ready for Approval`.
- `Last Updated` → `2026-06-27`.
- Añadir `Backlog Item: PB-P1-022`.

### Business Context
- `Context Summary` reformulado: extensión incremental de US-035 D4 con delta + badges per-item + tolerancia adaptativa.
- `Assumptions`: tolerancia adaptativa por `currency.decimal_places`; UI no recalcula; cálculo server-side cada request.
- `Dependencies`: añadir US-035 (productor), US-036 (mutaciones invalidan cache), US-039 (BookingIntent confirm actualiza committed).

### PO/BA Decisions Applied
- Sección nueva con D1–D4.

### Traceability
- `FRD Requirement(s)`: FR-BUDGET-005 (warning visible) + FR-BUDGET-004 (cálculo en vivo de totales).
- `Use Case(s)`: UC-BUDGET-003 (Ver presupuesto con warning de exceso).
- `Business Rule(s)`: BR-BUDGET-003 (cálculo) + BR-BUDGET-004 (warning sin bloqueo).
- `Permission Rule(s)`: Ownership + OrganizerRoleGuard + adminExclusionGuard (heredados de US-035).
- `Data Entity / Entities`: Budget, BudgetItem (read-only), Currency (lookup de decimal_places).
- `API Endpoint(s)`: `GET /api/v1/events/:eventId/budget` (reuso US-035; response extendido).
- `NFR Reference(s)`: NFR-PERF-001.
- `Related Document(s)`: `/docs/4 §BR-BUDGET-003/004`, `/docs/6 §Budget §BudgetItem §Currency`, `/docs/8 §UC-BUDGET-003`, `/docs/9 §FR-BUDGET-004/005`, `/docs/10 §NFR-PERF-001`, `/docs/16 §M06`, US-035, US-036, US-039.

### Scope Guardrails
- `Explicitly Out of Scope`: bloqueo de gastos, persistir `over_committed` en BD, CTA "Ajustar total", endpoint nuevo, conversión FX, multi-moneda.

### Acceptance Criteria
- AC-01 reescrito: extensión del response con `summary.overcommitted_amount` y `items[].over_committed` + `items[].overcommitted_amount`.
- AC-02 reescrito: tolerancia adaptativa D3 con boundaries explícitos.
- AC-03 nuevo: badge per-item D4 con `aria-label` localizado.
- AC-04 nuevo: CTA "Editar items" en el banner con scroll/focus a la primera fila over_committed.
- AC-05 nuevo: invalidación TanStack `['event', eventId, 'budget']` tras mutaciones de US-036/US-039 que cambien el estado del warning.
- AC-06 nuevo: P95 < 1.5 s (heredable de US-035 AC-07).
- AC-07 nuevo: A11Y del badge.

### Edge Cases
- EC-01 reescrito: tolerancia adaptativa con boundaries.
- EC-02 nuevo: currencies sin decimales (CLP/JPY) ⇒ tolerance = 1.
- EC-03 nuevo: `item.planned = 0 ∧ item.committed > 0` ⇒ badge.
- EC-04 nuevo: evento `cancelled`/`completed` ⇒ 200 con cálculo real (heredable US-035 SEC-04 → US-033 D3).
- EC-05 nuevo: moneda no catalogada ⇒ fallback `decimal_places = 2` + log warning.

### Validation Rules
- VR-01 reescrita: cálculo server-side; UI no recalcula (consistente con US-035 VR-05).
- VR-02 nuevo: `currency_code` debe existir en catálogo `Currency`; fallback defensivo a `decimal_places = 2`.

### Authorization & Security Rules
- SEC-01: reuso íntegro de US-035 SEC-01..05 (mismo endpoint, mismo middleware).

### Technical Notes
- Backend: extensión de `GetBudgetUseCase` (US-035) con cálculo de `tolerance` desde `Currency.decimal_places` y campos nuevos en la serialización.
- Frontend: extensión de `BudgetSummary` (US-035) con render condicional del `overcommitted_amount`; extensión de `BudgetItemsTable` (US-035) con badge por fila accesible.
- API: shape extendido del response existente.
- Observability: extender log `budget.viewed` (US-035) con `overcommitted_amount` y `over_committed_items_count`.
- Sin migraciones.

### Test Scenarios
- Functional: TS-01 banner + delta visible; TS-02 badge per-item; TS-03 tolerancia boundary (exacto, +epsilon, -epsilon); TS-04 currencies sin decimales (CLP); TS-05 `planned=0` con `committed>0`; TS-06 cache invalidation tras mutación US-036.
- Negative: NT-01 diferencia centavos sin warning; NT-02 moneda no catalogada (fallback).
- AUTH: heredables de US-035.
- A11Y-01 badge accesible; A11Y-02 `aria-label` localizado con delta.
- PERF-01 heredable de US-035.
- CONTRACT-01 shape extendido.

### Definition of Ready
- Marcar `[x] PO/BA validó`.

### Definition of Done
- Añadir: cache invalidation verificada, contract test verde, A11Y verificada, snapshot OpenAPI (US-098 handoff).

### Notes
- Reemplazar "Confirmar diseño visual del banner" por referencia a US-035 (donde vive el banner) + design tokens para el badge.
- Documentar handoff: US-035 (productor del summary), US-036 (mutaciones invalidan cache), US-039 (BookingIntent confirmation actualiza committed → puede disparar warning).

---

## 5. Documentation Alignment Required

| Documento / Fuente                          | Conflicto detectado                                                                                          | Decisión vigente                                                                              | Acción recomendada                                                                                                                              | ¿Bloquea aprobación? |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/16 §M06 Budget`                       | Response no documenta `summary.overcommitted_amount`, `items[].over_committed`, `items[].overcommitted_amount`. | D1 (este artefacto).                                                                          | Actualizar `docs/16 §M06`. Snapshot OpenAPI por US-098. No bloquea.                                                                              | No                   |
| `docs/4 §BR-BUDGET-004`                     | No detalla tolerancia.                                                                                        | D3 (este artefacto).                                                                          | Nota interpretativa en BR-BUDGET-004 referenciando D3.                                                                                          | No                   |
| `docs/6 §Currency` / `docs/18 currencies`   | Confirmar que el catálogo `Currency` expone `decimal_places`.                                                  | D3 depende de este campo.                                                                     | Verificar y, si falta, abrir tarea DOC.                                                                                                          | No                   |
| `docs/10`                                   | Algunas US usan `NFR-PERF-API-001`.                                                                           | `NFR-PERF-001`.                                                                                | Housekeeping en backlog. Ya alineado en US-032..037.                                                                                            | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                         |
| User Story file path                         | `management/user-stories/US-038-budget-overcommitted-warning.md`                            |
| Decision Resolution artifact created/updated | Yes                                                                                         |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-038-decision-resolution.md`                |
| New User Story status                        | Ready for Approval                                                                          |
| Remaining blockers                           | No                                                                                          |
| Reason                                       | 4/4 decisiones bloqueantes resueltas con respaldo en US-035 (D1/D4), BR-BUDGET-003/004, FR-BUDGET-005, catálogo Currency (`docs/6`). 4 Documentation Alignment Required no bloqueantes. |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`

Las 4 decisiones están formalizadas y consistentes con la US-035 aprobada y con las reglas canónicas del catálogo `Currency`. La US queda actualizada en sitio como extensión incremental del contrato server-side ya entregado.

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo actualizado management/user-stories/US-038-budget-overcommitted-warning.md.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Ejecutar `eventflow-user-story-approval`.
4. Tras aprobación, ejecutar `eventflow-user-story-technical-spec` y `eventflow-user-story-to-development-tasks`.
```

---

User Story file updated: Yes
Path: management/user-stories/US-038-budget-overcommitted-warning.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-038-decision-resolution.md
Next step: Run `eventflow-user-story-approval` or run `eventflow-user-story-refinement` again if a second validation pass is desired.
