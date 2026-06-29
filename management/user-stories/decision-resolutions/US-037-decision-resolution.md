# PO/BA Decision Resolution — US-037

## Source User Story File
management/user-stories/US-037-accept-ai-budget-distribution.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-037-refinement-review.md

## Decision Date
2026-06-27

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-037                                                                                                         |
| User Story file path                         | `management/user-stories/US-037-accept-ai-budget-distribution.md`                                              |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-037-refinement-review.md`                                       |
| Existing decision resolution found           | No                                                                                                             |
| Backlog Item                                 | PB-P1-021 — Aceptar distribución IA como BudgetItems                                                          |
| Epic                                         | EPIC-BUD-001 — Budget Management & Currency                                                                    |
| Estado antes de decisiones                   | Needs Refinement                                                                                               |
| Cantidad de preguntas revisadas              | 6 (Q1–Q6)                                                                                                      |
| Decisiones PO/BA tomadas                     | 6                                                                                                              |
| Decisiones técnicas recomendadas             | 0 (Q1, Q3 resueltas con respaldo en US-025 aprobada y `docs/16 §35.3`; Q5 reusa D3 de US-036).                  |
| ¿Desbloquea aprobación?                      | Sí                                                                                                             |
| User Story file updated                      | Yes                                                                                                            |
| Decision Resolution artifact created/updated | Yes                                                                                                            |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-037-decision-resolution.md`                                   |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                                            |

---

## 2. Decisiones Respondidas

## Decisión 1 — Endpoint canónico genérico `/ai-recommendations/:id/apply`

### Pregunta original

> ¿Cuál es el path canónico del endpoint de aceptación?

### Respuesta PO/BA

US-037 NO introduce un endpoint propio. Consume el endpoint genérico `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` definido por **US-025** (aprobada) y catalogado en `docs/16 §35.3` (líneas 1521–1522). US-025 implementa el dispatcher que, cuando `AIRecommendation.type = 'budget_suggestion'`, invoca el `ApplyBudgetSuggestionUseCase` (entregado por US-037) como handler de materialización. US-037 aporta el handler/use case específico de Budget; no aporta routing nuevo.

### Decisión formal

```text
Endpoint canónico (de US-025): POST /api/v1/ai-recommendations/:aiRecommendationId/apply

- US-025 es responsable del routing, autorización HITL transversal y dispatch por `type`.
- US-037 es responsable de implementar `ApplyBudgetSuggestionUseCase`, invocado por el dispatcher cuando `type='budget_suggestion'`.
- El body acepta `editedPayload?` opcional (US-025), interpretado por US-037 como subset/edición de `categories[]`.
- El descarte (`POST /ai-recommendations/:id/discard`) pertenece exclusivamente a US-025.
```

### Rationale

1. **US-025 (aprobada, líneas 40, 84, 95)** establece los dos endpoints canónicos `/apply` y `/discard` para todas las sugerencias IA. No introducir un path específico de budget evita scope creep y duplicación.
2. **`docs/16 §35.3`** confirma que las acciones HITL son verbos genéricos `apply`/`discard` dispatch-by-type.
3. **Patrón hexagonal**: US-025 expone el port "handler por type"; US-037 implementa el adaptador para `budget_suggestion`. Mismo patrón hexagonal que usamos para `BookingIntentReadPort` en US-036.
4. **MVP-first**: sin paths nuevos, sin OpenAPI fragmentado.
5. **Consistencia con US-019**: US-019 ya documenta que la materialización a `BudgetItem` ocurre en US-037; nada en US-019 implica un endpoint propio.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D1.                                                                                                                                   |
| Traceability            | `API Endpoint(s)` → `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` (endpoint de US-025; consumido por dispatcher).                |
| Scope Guardrails        | `Explicitly Out of Scope`: nuevo path bajo `/budget/apply-ai`, endpoint `/discard` (US-025).                                                    |
| Acceptance Criteria     | AC-01 reescrito: invocación al endpoint genérico de US-025; handler de US-037 materializa.                                                     |
| Technical Notes         | Backend: `ApplyBudgetSuggestionUseCase` registrado como handler en el dispatcher de US-025 para `type='budget_suggestion'`.                    |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Política de reemplazo: solo items con `ai_generated=true` provenientes de AIRecommendation previa

### Pregunta original

> ¿Política de reemplazo de items existentes?

### Respuesta PO/BA

Al aplicar la sugerencia, **se reemplazan exclusivamente los `BudgetItem` previos con `ai_generated=true` cuyo `ai_recommendation_id` corresponda a una `AIRecommendation` distinta de la que se está aplicando** (es decir, fueron creados por aplicaciones anteriores de sugerencias IA en este mismo evento). Los items con `ai_generated=false` (manuales, US-036) se preservan íntegramente. La UI debe mostrar un modal de confirmación con el conteo de items a reemplazar antes de invocar el endpoint.

### Decisión formal

```text
Política de reemplazo:

1. Se considera "item reemplazable" todo BudgetItem que cumpla:
   - event.id = path.eventId
   - ai_generated = true
   - ai_recommendation_id IS NOT NULL
   - ai_recommendation_id != path.aiRecommendationId (distinto del que se aplica)
   - deleted_at IS NULL

2. Al aplicar, el use case ejecuta soft-delete sobre los items reemplazables (mismo soft delete de US-036: `deleted_at = NOW()`, `deleted_by = currentUser.id`).

3. Los items con ai_generated = false NUNCA se tocan.

4. Los items con ai_generated = true que ya pertenecen a la AIRecommendation que se está aplicando (caso teórico de re-aplicación) NO se reemplazan: el endpoint responde 409 ITEM_ALREADY_MATERIALIZED.

5. La UI MUST mostrar un modal de confirmación cuando el preview indique que existen items a reemplazar (> 0), con el conteo exacto y la lista de categorías afectadas. El usuario debe confirmar antes de invocar el endpoint.

6. El response del endpoint incluye `replaced_items_count` y `created_items[]` para que la UI pueda mostrar un toast con el resumen.
```

### Rationale

1. **Backlog PB-P1-021 Acceptance Summary**: "Reemplazo de items existentes pide confirmación".
2. **Preservar trabajo manual**: los items `ai_generated=false` representan trabajo del usuario en US-036; reemplazarlos sin consentimiento viola el principio "Backend as source of truth" en su lectura más restrictiva (no destruir trabajo deliberado).
3. **Auditoría académica**: `ai_recommendation_id` permite reconstruir el historial de cuál recomendación produjo cuáles items.
4. **MVP-first**: regla simple, testeable, sin matrices complejas.
5. **Consistencia con US-036 D2**: el soft delete usa el mismo patrón (`deleted_at`, `deleted_by`) y los items reemplazados quedan filtrados del listado de US-035.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| PO/BA Decisions Applied | Agregar D2.                                                                                                                                      |
| Acceptance Criteria     | AC-03 nuevo: reemplazo solo de `ai_generated=true` con `ai_recommendation_id` previo y distinto.                                                  |
| Edge Cases              | EC nuevo: re-aplicación de la misma `AIRecommendation` ⇒ 409 `ITEM_ALREADY_MATERIALIZED`.                                                          |
| UX / UI Notes           | Modal de confirmación con copy "Reemplazar X items generados por IA en Y categorías" (localizado).                                                |
| Technical Notes         | Use case ejecuta soft-delete de items reemplazables dentro de la misma `prisma.$transaction`.                                                     |
| Observability           | Log incluye `replaced_items_count`.                                                                                                              |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Body shape: `editedPayload` con subset de `categories[]`

### Pregunta original

> ¿Shape del body para selección/edición parcial?

### Respuesta PO/BA

El body del endpoint genérico de US-025 acepta `editedPayload?` opcional. Para `type='budget_suggestion'` el handler de US-037 interpreta `editedPayload.categories[]` como **subset editado** del payload original del `AIRecommendation`. Cada entrada permite editar `planned` y `label?`. Si `editedPayload` se omite, se aplica el payload original tal cual (apply "as-is").

### Decisión formal

```text
Body del endpoint (visto por el handler de US-037):

  {
    editedPayload?: {
      categories: [
        {
          service_category_code: string,   // OBLIGATORIO; debe existir en el payload original del AIRecommendation
          planned: number ≥ 0,             // OBLIGATORIO; permite edición vs el suggested amount
          label?: string                    // OPCIONAL; etiqueta libre del usuario
        }
      ]
    }
  }

Reglas:

1. Si `editedPayload` está OMITIDO ⇒ se aplica el payload original del AIRecommendation tal cual. Marca `AIRecommendation.edited = false`.

2. Si `editedPayload.categories` está presente:
   - Es un SUBSET del payload original (no necesariamente toda la lista).
   - Cada entrada debe coincidir en `service_category_code` con una entrada del payload original. Si no coincide ⇒ 400 INVALID_VALUE.
   - Cada entrada PUEDE editar `planned` y `label`.
   - Las entradas del payload original NO presentes en `selected_entries` se DESCARTAN implícitamente (no se materializan).
   - Si `editedPayload.categories` está vacío ⇒ 400 INVALID_VALUE (no hay nada que aplicar; usar /discard).
   - Marca `AIRecommendation.edited = true` cuando hubo edición real (diff vs payload original) o el subset no incluye todas las entradas.

3. El `service_category_code` se resuelve a `service_category_id` server-side durante la materialización (lookup en `ServiceCategory`).

4. El campo `currency_code` del `AIRecommendation.payload` debe coincidir con `event.currency_code` (US-019 ya garantiza esto). Verificación defensiva: si difiere ⇒ 409 CURRENCY_MISMATCH.
```

### Rationale

1. **US-025 (aprobada, líneas 40, 95)**: el body es `{ editedPayload? }` por contrato genérico.
2. **UC-BUDGET-001 §1**: "El usuario revisa los ítems y edita si corresponde" — la edición previa al apply es funcionalmente requerida.
3. **`BR-BUDGET-008`**: "La sugerencia siempre es editable antes de guardarse".
4. **`service_category_code`** consistente con US-019 (que persiste código, no UUID).
5. **MVP-first**: shape simple, testeable, sin lookup de entry indices.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D3.                                                                                                                                         |
| Acceptance Criteria     | AC-01 reescrito con body shape canónico (editedPayload opcional). AC-02 reescrito con semántica de subset/descarte implícito.                        |
| Validation Rules        | VR nuevas para `editedPayload.categories[].service_category_code` (debe estar en payload original), `planned ≥ 0`, `categories[]` no vacío.         |
| Edge Cases              | EC nuevo: `editedPayload.categories = []` ⇒ 400.                                                                                                    |
| Technical Notes         | Backend: el handler de US-037 lee el payload del `AIRecommendation`, aplica diff con `editedPayload`, valida con Zod, marca `edited` y materializa.   |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Estado final del `AIRecommendation`: `status='accepted'` para parcial y total

### Pregunta original

> ¿Estado final del AIRecommendation tras aceptación parcial?

### Respuesta PO/BA

Tanto la aceptación parcial como la total dejan `AIRecommendation.status='accepted'`. No se introduce un estado intermedio. La auditoría de qué entradas se materializaron vive en `BudgetItem.ai_recommendation_id` (FK desde los items creados a la recomendación). El campo `AIRecommendation.edited` registra si hubo edición (D3).

### Decisión formal

```text
Tras el apply exitoso (parcial o total):
- AIRecommendation.status = 'accepted'.
- AIRecommendation.edited = true | false según D3.
- AIRecommendation.accepted_at = NOW().
- AIRecommendation.accepted_by = currentUser.id.

El enum `status` permanece `pending | accepted | discarded` (ADR `ai_recommendations`).
NO se introduce 'accepted_partial' ni cualquier otro estado nuevo.

La auditoría de qué items se materializaron se reconstruye con:
  SELECT * FROM budget_items WHERE ai_recommendation_id = :id
```

### Rationale

1. **ADR `ai_recommendations` enum** (línea 1563 de `docs/22`): `pending|accepted|discarded`. Introducir un cuarto estado rompe el contrato y obliga a migrar todos los handlers.
2. **US-025 (aprobada, línea 40)**: "Marca `status='accepted'`" sin distinción parcial/total.
3. **Auditoría reconstruible**: `BudgetItem.ai_recommendation_id` ya existe en el domain model.
4. **MVP-first**: una sola regla.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D4.                                                                                                       |
| Acceptance Criteria     | AC-01 reescrito: `status='accepted'`, `edited`, `accepted_at`, `accepted_by`.                                      |
| Validation Rules        | VR nuevo: `AIRecommendation.status = 'pending'` (precondición). Otros estados ⇒ 409.                              |
| Technical Notes         | Backend: update transaccional de `status`, `edited`, `accepted_at`, `accepted_by` junto con los inserts de items.   |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Bloqueo en `event.status ∈ {'cancelled','completed'}`

### Pregunta original

> ¿Bloqueo de apply en `cancelled`/`completed`?

### Respuesta PO/BA

Sí, las mutaciones de US-037 se bloquean en eventos `cancelled` y `completed`, alineado transversalmente con US-036 D3. El endpoint responde 409 `EVENT_NOT_EDITABLE`. La verificación ocurre en el handler de US-037 antes de cualquier mutación.

### Decisión formal

```text
El handler `ApplyBudgetSuggestionUseCase` verifica `event.status ∈ {'draft','active'}`:
- Si event.status ∈ {'cancelled','completed'} ⇒ 409 EVENT_NOT_EDITABLE con detail del estado.
- La verificación ocurre tras EventOwnershipPolicy y antes de cualquier validación del payload.
- El comportamiento es consistente con US-036 D3 y US-014/015.
```

### Rationale

1. **US-036 D3 (aprobada)**: regla transversal para todas las mutaciones de Budget.
2. **UC-BUDGET-002 §E2**: ya bloquea `cancelled` (extendido a `completed` por US-036).
3. **US-014 EC-01** y **US-015**: read-only en `cancelled`/`completed`.
4. **Consistencia**: la auditoría académica requiere que el estado del evento sea inmutable post-cierre.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D5.                                                                                                       |
| Acceptance Criteria     | AC-04 nuevo: bloqueo por `event.status`.                                                                          |
| Validation Rules        | VR-06 nuevo: `event.status ∈ {'draft','active'}`.                                                                |
| Edge Cases              | EC nuevo: `cancelled`/`completed` ⇒ 409 `EVENT_NOT_EDITABLE`.                                                     |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional. Documentation Alignment Required ya cubierto por US-036 D3 (housekeeping `UC-BUDGET-002 §E2`).

---

## Decisión 6 — Categoría desactivada entre generación y aceptación: rechazar con 409 y lista de afectadas

### Pregunta original

> ¿Manejo de `service_category` desactivada entre US-019 y US-037?

### Respuesta PO/BA

Si alguna entrada (en el payload original o en `editedPayload`) referencia una `service_category_code` que ya no está activa (`is_active = false`) o no existe, el endpoint **rechaza con 409 `CATEGORY_INACTIVE`** devolviendo la lista de categorías afectadas. La UI debe ofrecer al usuario regenerar la sugerencia (volver a US-019) o aplicar solo el subset válido.

### Decisión formal

```text
Al validar el body del apply:

1. Resolver cada `service_category_code` referenciado (en payload original si `editedPayload` está omitido, o en `editedPayload.categories[]`) a su `service_category_id` en la tabla `service_categories`.

2. Si alguna `service_category_code`:
   - No existe en `service_categories` ⇒ es un payload corrupto del AIRecommendation ⇒ 422 PAYLOAD_INVALID.
   - Existe pero `is_active = false` ⇒ 409 CATEGORY_INACTIVE.

3. El response 409 incluye `inactive_categories: [{ service_category_code, name }]` para que la UI pueda guiar al usuario.

4. No se aplica parcialmente "ignorando" las inactivas: el rechazo es total para evitar drift silencioso.

5. La UI ofrece dos opciones en el modal de error:
   - "Regenerar sugerencia" → deeplink a US-019 (regenera el AIRecommendation).
   - "Aplicar manualmente" → deeplink a US-036 (crear items manualmente).
```

### Rationale

1. **`BR-BUDGET-009`** (edición libre): la solución natural es regenerar o usar US-036.
2. **No drift silencioso**: aplicar parcial ignorando inactivas dejaría al usuario sin transparencia sobre qué se omitió.
3. **MVP-first**: una regla simple (rechazo total) testeable con un solo case.
4. **Demoabilidad**: el escenario es poco frecuente (admin desactivando categoría justo entre US-019 y US-037), pero el copy claro convierte la falla en una guía de acción.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Agregar D6.                                                                                                       |
| Acceptance Criteria     | AC-05 nuevo: rechazo por categoría inactiva con lista.                                                            |
| Edge Cases              | EC nuevo: categoría desactivada entre generación y aceptación ⇒ 409 `CATEGORY_INACTIVE`.                          |
| UX / UI Notes           | Modal de error con CTAs "Regenerar sugerencia" y "Aplicar manualmente".                                            |
| Validation Rules        | VR nuevo: `service_category_code` debe resolver a una categoría activa.                                            |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                          | Decisión                                                                                                                                                                                       | Tipo    | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- | -------------------- |
|  1 | Endpoint                                       | Reuso del genérico de US-025 `POST /api/v1/ai-recommendations/:aiRecommendationId/apply`. US-037 aporta el handler.                                                                              | Tech+PO | Sí                     | No                   |
|  2 | Política de reemplazo                          | Reemplaza solo items `ai_generated=true` con `ai_recommendation_id` previo y distinto. Items manuales preservados. UI confirma reemplazo con conteo.                                              | PO      | Sí                     | No                   |
|  3 | Body shape (`editedPayload`)                   | `{ editedPayload?: { categories: [{ service_category_code, planned, label? }] } }`. Subset implícito = descarte de no seleccionadas.                                                            | PO+Tech | Sí                     | No                   |
|  4 | Estado final                                   | `status='accepted'` (parcial y total). `edited` registra si hubo edición. Auditoría de items vía `BudgetItem.ai_recommendation_id`.                                                              | PO      | Sí                     | No                   |
|  5 | Bloqueo por event status                       | `event.status ∈ {'draft','active'}`; otros ⇒ 409 `EVENT_NOT_EDITABLE`. Consistente con US-036 D3.                                                                                                | PO      | Sí                     | No                   |
|  6 | Categoría desactivada                          | Rechazo total con 409 `CATEGORY_INACTIVE` + lista de afectadas. UI ofrece regenerar (US-019) o aplicar manual (US-036).                                                                          | PO      | Sí                     | No                   |

---

## 4. Cambios Aplicados a la User Story

### Metadata
- `Status` → `Ready for Approval`.
- `Last Updated` → `2026-06-27`.
- Añadir `Backlog Item: PB-P1-021`.

### Business Context
- `Context Summary` reformulado con flujo HITL, consumo del endpoint de US-025 y materialización transaccional.
- `Assumptions`: heredados de US-019 (status enum, shape, currency).
- `Dependencies`: US-019, US-025, US-035, US-036, PB-P1-013, PB-P1-016, PB-P1-020, PB-P1-021.

### PO/BA Decisions Applied
- Sección nueva con D1–D6 formalizadas.

### Traceability
- `FRD Requirement(s)`: FR-BUDGET-010 + FR-AI-003 + FR-AI-010.
- `Use Case(s)`: UC-BUDGET-001.
- `Business Rule(s)`: BR-BUDGET-008, BR-BUDGET-009, BR-BUDGET-007, BR-AI-008, BR-AI-011, BR-AI-001..003 (HITL).
- `Permission Rule(s)`: Ownership + OrganizerRoleGuard + adminExclusionGuard.
- `Data Entity / Entities`: `BudgetItem`, `AIRecommendation`, `ServiceCategory`, `Budget`.
- `API Endpoint(s)`: `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` (de US-025; US-037 aporta el handler para `type='budget_suggestion'`).
- `NFR Reference(s)`: NFR-PERF-001.
- `Related Document(s)`: `/docs/4 §BR-BUDGET-008/009 §BR-AI-008/011`, `/docs/6 §BudgetItem §AIRecommendation`, `/docs/8 §UC-BUDGET-001`, `/docs/9 §FR-BUDGET-010 §FR-AI-003`, `/docs/10 §NFR-PERF-001`, `/docs/16 §35.3`, US-019, US-025, US-035, US-036.

### Scope Guardrails
- `Explicitly Out of Scope`: nuevo path bajo `/budget/apply-ai`, endpoint `/discard` (US-025), auto-aplicación sin acción del usuario, invocación al LLMProvider (productor es US-019).

### Acceptance Criteria
- AC-01 reescrito: invocación a `/ai-recommendations/:id/apply` con `editedPayload?`, materialización transaccional, `status='accepted'`, `accepted_at`, `accepted_by`, `edited`.
- AC-02 reescrito: subset implícito = descarte de no seleccionadas.
- AC-03 nuevo: política de reemplazo D2.
- AC-04 nuevo: bloqueo por `event.status` D5.
- AC-05 nuevo: rechazo por categoría inactiva D6.
- AC-06 nuevo: invalidación TanStack `['event', eventId, 'budget']`.
- AC-07 nuevo: atomicidad (rollback si cualquier insert/update falla).
- AC-08 nuevo: consistencia de moneda (defensa profunda).
- AC-09 nuevo: A11Y del dialog.
- AC-10 nuevo: P95 < 1.5 s (NFR-PERF-001).

### Edge Cases
- EC-01 reescrito: status ∈ {'accepted','discarded'} ⇒ 409 (re-aplicación).
- EC-02 nuevo: event cancelled/completed ⇒ 409.
- EC-03 nuevo: categoría inactiva ⇒ 409 CATEGORY_INACTIVE.
- EC-04 nuevo: editedPayload con `service_category_code` no en payload original ⇒ 400.
- EC-05 nuevo: editedPayload vacío ⇒ 400.
- EC-06 nuevo: rollback transaccional ante fallo a mitad.
- EC-07 nuevo: re-aplicación del mismo AIRecommendation ya accepted ⇒ 409 ITEM_ALREADY_MATERIALIZED.

### Validation Rules
- VR-01: `AIRecommendation.event_id = eventId` (anti-IDOR) → 404.
- VR-02: `AIRecommendation.status = 'pending'` → 409.
- VR-03: `editedPayload.categories[].service_category_code` en payload original → 400.
- VR-04: `editedPayload.categories[].planned ≥ 0` → 400.
- VR-05: `editedPayload.categories[]` no vacío si presente → 400.
- VR-06: `event.status ∈ {'draft','active'}` → 409.
- VR-07: `service_category_code` activa → 409 CATEGORY_INACTIVE.
- VR-08: UUIDs válidos en path → 400.
- VR-09: Sin sesión → 401.
- VR-10: `AIRecommendation.payload.currency_code = event.currency_code` → 409 CURRENCY_MISMATCH (defensa profunda).

### Authorization & Security Rules
- SEC-01: EventOwnershipPolicy + OrganizerRoleGuard (heredado del dispatcher de US-025; US-037 confirma).
- SEC-02: atomicidad `prisma.$transaction([items.softDelete, items.create×N, recommendation.update])`.
- SEC-03: adminExclusionGuard.
- SEC-04: no-revelación 404.
- SEC-05: logging sin PII; payload con `aiRecommendationId`, `accepted_entries_count`, `replaced_items_count`, `created_items_count`, `correlationId`.

### Technical Notes
- Backend: `ApplyBudgetSuggestionUseCase` registrado en el dispatcher de US-025 para `type='budget_suggestion'`. Compone soft delete de reemplazables + inserts de N items + update del AIRecommendation en una sola `$transaction`.
- Frontend: `ApplyAIBudgetDialog` con preview, edición inline de `planned`, modal de confirmación de reemplazo, manejo de 409 con CTAs.
- API: ruta de US-025; no se introduce nueva.
- Observability: log `budget.ai_suggestion.applied` con campos del §observability.
- Sin migraciones; reuso del schema.
- Reuso de `BudgetItemWriteRepository` (US-036) para insertar items.
- Reuso de policies/guards.

### Test Scenarios
- Functional: TS-01 apply total, TS-02 apply parcial editado, TS-03 reemplazo solo ai_generated=true, TS-04 cache invalidation, TS-05 atomicidad/rollback.
- Negative: NT-01..NT-10 (status no pending, ajeno, no-auth, admin, cancelled/completed, categoría inactiva, payload original corrupto, editedPayload vacío, planned negativo, currency mismatch).
- AI: AI-TS-01 items con ai_generated=true, AI-TS-02 status=accepted, AI-TS-03 idioma respetado, AI-TS-04 edited flag correcto.
- AUTH-TS-01..05.
- PERF-01.
- A11Y-01..03.
- CONTRACT-01.

### Definition of Ready
- Marcar `[x] PO/BA validó`.

### Definition of Done
- Añadir: cache invalidation verificada, contract test verde, log emitido sin PII, A11Y verificada, atomicidad con rollback test, snapshot OpenAPI (US-098 handoff).

### Notes
- Reemplazar "Confirmar si requiere texto de confirmación" por el copy localizado del modal de reemplazo y del modal de error de categoría inactiva.
- Documentar handoff: productor US-019, dispatcher US-025, consumidor US-035 (cache), CRUD relacionado US-036.

---

## 5. Documentation Alignment Required

| Documento / Fuente                                    | Conflicto detectado                                                                                          | Decisión vigente                                                                                              | Acción recomendada                                                                                                                              | ¿Bloquea aprobación? |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/10`                                              | `NFR-PERF-API-001` no existe; canónico `NFR-PERF-001`.                                                       | Corregido en US-037.                                                                                          | Housekeeping en backlog. Ya alineado en US-032..036.                                                                                            | No                   |
| `docs/16 §35.3` (líneas 1521–1522)                    | El catálogo de `/ai-recommendations/:id/apply` no detalla los códigos de error específicos por `type`.        | D2/D6 introducen `ITEM_ALREADY_MATERIALIZED`, `CATEGORY_INACTIVE`, `CURRENCY_MISMATCH`, `PAYLOAD_INVALID`.     | Actualizar `docs/16 §35.3` con catálogo de errores específico para `type='budget_suggestion'`. Snapshot OpenAPI por US-098. No bloquea.        | No                   |
| `docs/8 §UC-BUDGET-001`                                | Solo menciona "categoría inexistente → 400"; no cubre categoría desactivada.                                  | D6 introduce 409 CATEGORY_INACTIVE.                                                                            | Añadir nota interpretativa a UC-BUDGET-001 §E1. No bloquea.                                                                                     | No                   |
| `docs/4 §BR-BUDGET-008`                                | "Editable antes de guardarse" no detalla shape de edición.                                                    | D3 (este artefacto).                                                                                          | Nota interpretativa en BR-BUDGET-008 referenciando D3. No bloquea.                                                                              | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                         |
| User Story file path                         | `management/user-stories/US-037-accept-ai-budget-distribution.md`                           |
| Decision Resolution artifact created/updated | Yes                                                                                         |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-037-decision-resolution.md`                |
| New User Story status                        | Ready for Approval                                                                          |
| Remaining blockers                           | No                                                                                          |
| Reason                                       | 6/6 decisiones bloqueantes (Q1–Q6) resueltas con respaldo en US-019/US-025/US-036 aprobadas y en `docs/4/8/9/10/16`. 4 Documentation Alignment Required no bloqueantes. |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`

Las 6 decisiones están formalizadas y consistentes con: US-019 (productor del `AIRecommendation`), US-025 (dispatcher genérico HITL), US-036 D3 (bloqueo por event status), ADR `ai_recommendations` (enum `pending|accepted|discarded`).

---

## 8. Próximo Paso Recomendado

```text
1. Revisar el archivo actualizado management/user-stories/US-037-accept-ai-budget-distribution.md.
2. Ejecutar `eventflow-user-story-refinement` para revalidación.
3. Ejecutar `eventflow-user-story-approval`.
4. Tras aprobación, ejecutar `eventflow-user-story-technical-spec` y `eventflow-user-story-to-development-tasks`.
```

---

User Story file updated: Yes
Path: management/user-stories/US-037-accept-ai-budget-distribution.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-037-decision-resolution.md
Next step: Run `eventflow-user-story-approval` or run `eventflow-user-story-refinement` again if a second validation pass is desired.
