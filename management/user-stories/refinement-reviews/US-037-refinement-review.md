# User Story Refinement Review — US-037

## Source User Story File
management/user-stories/US-037-accept-ai-budget-distribution.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-037-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-037-decision-resolution.md`) y la actualización en sitio del archivo, esta segunda pasada confirma:

| Verificación                                                                                                                                                       | Resultado |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Q1 (endpoint) resuelta: reuso del genérico de US-025 `POST /api/v1/ai-recommendations/:id/apply`; US-037 aporta handler para `type='budget_suggestion'`.            | OK        |
| Q2 (política de reemplazo) resuelta: soft delete solo de items `ai_generated=true` con `ai_recommendation_id` previo distinto; manuales preservados.                | OK        |
| Q3 (body shape) resuelta: `{ editedPayload?: { categories: [{ service_category_code, planned, label? }] } }`; subset implícito = descarte; vacío → 400.             | OK        |
| Q4 (estado final) resuelta: `status='accepted'` (parcial y total); `edited` registra edición; sin estados nuevos en el enum.                                       | OK        |
| Q5 (bloqueo event status) resuelta: 409 `EVENT_NOT_EDITABLE` en `cancelled`/`completed`; consistente con US-036 D3.                                                  | OK        |
| Q6 (categoría inactiva) resuelta: 409 `CATEGORY_INACTIVE` con lista; UI ofrece regenerar (US-019) o aplicar manual (US-036).                                        | OK        |
| Traceability corregida: FR-BUDGET-010 + FR-AI-003/010; UC-BUDGET-001; BR-BUDGET-007/008/009 + BR-AI-001..003/008/011; NFR-PERF-001.                                  | OK        |
| AC reescritos (AC-01..10), EC-01..09, VR-01..10, SEC-01..06.                                                                                                       | OK        |
| Backlog Item PB-P1-021 declarado.                                                                                                                                  | OK        |
| Documentation Alignment Required (4 ítems no bloqueantes): `docs/16 §35.3` con catálogo de errores por type, UC-BUDGET-001 §E1 (CATEGORY_INACTIVE), BR-BUDGET-008 nota interpretativa, housekeeping `NFR-PERF-001`. | OK |
| Sin scope creep; nuevo path `/budget/apply-ai` queda Out of Scope (D1).                                                                                            | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-037                                                                                                                                    |
| File Path                                  | `management/user-stories/US-037-accept-ai-budget-distribution.md`                                                                          |
| Backlog Item                               | PB-P1-021 — Aceptar distribución IA como BudgetItems                                                                                      |
| Epic                                       | EPIC-BUD-001 — Budget Management & Currency                                                                                                |
| Estado actual                              | Draft                                                                                                                                     |
| Estado recomendado                         | Needs Refinement                                                                                                                          |
| Nivel de riesgo                            | Alto                                                                                                                                      |
| Calidad general                            | Media                                                                                                                                     |
| Requiere decisión PO                       | Sí                                                                                                                                        |
| Requiere decisión técnica                  | Sí                                                                                                                                        |
| Requiere decisión QA                       | No                                                                                                                                        |
| Requiere decisión Seguridad                | No                                                                                                                                        |
| Decision Resolution artifact found         | No                                                                                                                                        |
| User Story file updated                    | No                                                                                                                                        |
| Refinement review artifact created/updated | Yes                                                                                                                                       |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-037-refinement-review.md`                                                                  |

---

## 2. Diagnóstico PO/BA

US-037 es el HITL canónico para `AI-003 (budget_suggestion)`: convierte la `AIRecommendation { type='budget_suggestion', status='pending' }` generada por US-019 (PB-P1-013) en `BudgetItem(ai_generated=true)` editables. Cierra `UC-BUDGET-001` ("Aceptar sugerencia IA de presupuesto"). Es uno de los flujos demo de mayor valor académico (HITL aplicado a finanzas).

US-019 ya está aprobada y formaliza las siguientes invariantes que US-037 hereda:
* Persiste `AIRecommendation { type='budget_suggestion', status='pending' }` con shape `categories[]` con `{ name, service_category_code, percentage, amount, notes }` en la moneda del evento.
* Idioma del evento ya respetado en notas.
* `status` enum: `pending|accepted|discarded` (ADR `ai_recommendations`).
* `BudgetItem.ai_recommendation_id` enlaza cada item materializado con su recomendación de origen.

US-036 (PB-P1-020) ya entregó:
* Bloqueo de mutaciones en `event.status ∈ {'cancelled','completed'}` (409 `EVENT_NOT_EDITABLE`).
* `ai_generated=true` flag preservado.
* Soft delete con filtrado en US-035.
* Patrón de cache TanStack `['event', eventId, 'budget']` que toda mutación invalida.

Estos consumidores establecen invariantes transversales que US-037 debe respetar y reusar.

Sin embargo, la historia llega con varias decisiones implícitas y errores de traceability que impiden refinarla en sitio:

1. **Endpoint inexistente y ambiguo**. US-037 declara `POST /api/v1/events/:id/budget/apply-ai`, que no está en `docs/16 §M06 Budget` ni en `docs/16` líneas 1514+ (`/ai/budget-suggestion`). US-025 (aceptar/editar/descartar sugerencia AI genérica) podría introducir el patrón genérico `POST /ai-recommendations/:id/accept`. Hay tres patrones candidatos: extender `/ai/budget-suggestion`, usar acción genérica de US-025, o sub-recurso de budget.
2. **Política de reemplazo no documentada en la US**. PB-P1-021 Acceptance Summary declara "Reemplazo de items existentes pide confirmación", pero la US no la incorpora: ¿se reemplazan **todos** los items existentes (incluyendo los manuales `ai_generated=false`) o solo los `ai_generated=true` de la misma recomendación previa? Necesita aclaración PO.
3. **Selección parcial sin shape definido**. AC-02 dice "se eligen sólo algunas categorías" pero no define el body ni si se permite editar `planned` antes de aplicar (UC-BUDGET-001 §1 indica que sí).
4. **Estado final del `AIRecommendation`**. Per ADR el enum es `pending|accepted|discarded`. ¿Aceptación parcial deja en `accepted` (sin distinción) o introduce un estado adicional? Recomendado mantener simple: `accepted` para parcial y total; la auditoría de qué items se aceptaron vive en `BudgetItem.ai_recommendation_id`.
5. **Bloqueo por estado del evento no documentado**. Consistente con US-036 D3 debería bloquearse en `cancelled` y `completed`.
6. **Manejo de `service_category` desactivada entre generación y aceptación**. UC-BUDGET-001 §E1 dice "categoría inexistente → 400"; pero ¿qué pasa si la categoría existía al generar pero fue desactivada (admin) antes de aceptar?
7. **Traceability incorrecta**. Referencias actuales son mayoritariamente erróneas (ver §3).
8. **Atomicidad mencionada como SEC ("SEC-02 Atómica") sin detalle**. La creación de N `BudgetItem` + la mutación de `AIRecommendation.status` debe ocurrir en una sola transacción (`prisma.$transaction`); falta documentación explícita.

No hay scope creep ni P4/Future en juego. La historia es MVP-first, Must Have y demoable, pero requiere formalizar 6 decisiones antes de aprobar.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                                                                          | Impacto                                                                                                                                                                                                | Recomendación                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Endpoint `POST /api/v1/events/:id/budget/apply-ai` no existe en `docs/16` y entra en conflicto con el namespace canónico `/ai/budget-suggestion` (de US-019) y con el patrón genérico que US-025 podría introducir.                                                                                | Si se aprueba con este path, se duplica la convención de naming y se rompe la consistencia con US-019/US-025.                                                                                            | Resolver Q1 (Tech+PO). Recomendado: `POST /api/v1/events/:eventId/ai/budget-suggestion/:recommendationId/accept` o un patrón consistente con US-025.                                            |
| Alta      | Política de reemplazo no documentada en la US. Backlog item dice "Reemplazo de items existentes pide confirmación" sin especificar el alcance.                                                                                                                                                  | Riesgo de borrar items manuales del usuario (`ai_generated=false`) sin intención.                                                                                                                       | Resolver Q2 (PO). Recomendado: reemplazar **solo** items con `ai_generated=true` provenientes de una `AIRecommendation` previa (preservar manuales).                                              |
| Alta      | Shape de body para selección/edición parcial no definido. AC-02 ambigua.                                                                                                                                                                                                                          | Backend no puede implementar sin contrato.                                                                                                                                                              | Resolver Q3 (PO+Tech). Recomendado body con `selected_entries[]` permitiendo edición de `planned` y `label?` por entrada.                                                                       |
| Alta      | Traceability incorrecta: `FR-BUDGET-005` (warning) → debe ser `FR-BUDGET-010` (apply AI). `FR-AI-005` (brief) → debe ser `FR-AI-003` (sugerencia IA budget). `UC-BUDGET-003` (ver con warning) → debe ser `UC-BUDGET-001`. `BR-BUDGET-005` (committed sync) → debe ser `BR-BUDGET-008`. `BR-AI-013` no aplica. | Trazabilidad académica rota; PB-P1-021 ↔ FRD ↔ UC ↔ BRD inconsistente.                                                                                                                                  | Corrección objetiva durante refinación. IDs canónicos: `FR-BUDGET-010` + `FR-AI-003` (y opcional `FR-AI-010` por persistencia `AIRecommendation`); `UC-BUDGET-001`; `BR-BUDGET-008` + `BR-AI-008` + `BR-BUDGET-009` + `BR-AI-011`. |
| Alta      | Bloqueo por estado del evento no documentado. UC-BUDGET-002 §E2 ya bloquea `cancelled`; US-036 D3 extendió a `completed`.                                                                                                                                                                          | Inconsistencia transversal con el resto del módulo Budget.                                                                                                                                              | Resolver Q5 (PO). Alinear con US-036 D3: bloquear apply en `cancelled` y `completed` con 409 `EVENT_NOT_EDITABLE`.                                                                              |
| Media     | Manejo de `service_category` desactivada entre generación y aceptación no documentado.                                                                                                                                                                                                            | Riesgo de fallar con error opaco si admin desactiva una categoría justo antes del apply.                                                                                                                | Resolver Q6 (PO). Recomendado: ignorar entradas con categoría inactiva y reportar al usuario, o fallar con 409 `CATEGORY_INACTIVE` con la lista de categorías afectadas.                          |
| Media     | Estado final del `AIRecommendation` no formalizado. Per ADR el enum es `pending|accepted|discarded`; aceptación parcial sin estado distinto necesita confirmación explícita.                                                                                                                          | Riesgo de drift entre US-019 (status enum) y US-037.                                                                                                                                                    | Resolver Q4 (PO). Recomendado: `status='accepted'` para parcial y total; la auditoría de qué se aceptó vive en `BudgetItem.ai_recommendation_id`.                                                |
| Media     | Atomicidad mencionada como SEC ("SEC-02 Atómica") sin detalle de transacción.                                                                                                                                                                                                                    | Riesgo de inconsistencia parcial si falla la mutación a mitad.                                                                                                                                          | Tras Q1, documentar transacción `prisma.$transaction` que cubre N inserts de `BudgetItem` + update de `AIRecommendation.status`.                                                                |
| Media     | NFR-PERF-API-001 no existe; el ID canónico es `NFR-PERF-001` (P95 < 1.5 s endpoints no-IA).                                                                                                                                                                                                      | Métrica incorrecta.                                                                                                                                                                                     | Reemplazar por `NFR-PERF-001`. Documentation Alignment Required (no bloqueante; misma alineación que US-032..036).                                                                              |
| Media     | Faltan AC para auth (401), admin (403), recurso ajeno (404 no-revelación), `event.status` no editable, atomicidad y consistencia de moneda.                                                                                                                                                       | Cobertura QA insuficiente para una historia Must Have con IA.                                                                                                                                            | Añadir AC y test scenarios.                                                                                                                                                                    |
| Media     | Falta política de cache invalidation hacia US-035 (`['event', eventId, 'budget']`) tras apply.                                                                                                                                                                                                     | US-035 no refresca tras materialización.                                                                                                                                                                | Añadir AC consistente con US-036 D8.                                                                                                                                                            |
| Baja      | "i18n Notes: Idioma del evento" sin enumerar; ya está cubierto por US-019 (`BR-AI-011`/`BR-EVENT-008`).                                                                                                                                                                                            | Riesgo menor de QA incompleto.                                                                                                                                                                          | Enumerar `es-LATAM`, `es-ES`, `pt`, `en`.                                                                                                                                                       |
| Baja      | Loading State como "Spinner" sin atributos ARIA.                                                                                                                                                                                                                                                  | Riesgo menor A11Y.                                                                                                                                                                                      | Documentar `aria-busy` y `aria-live` para resultado.                                                                                                                                            |
| Baja      | Notes contiene "Confirmar si requiere texto de confirmación" — pendiente UX.                                                                                                                                                                                                                       | Decisión menor de UX.                                                                                                                                                                                   | Tras Q2, definir el copy del modal de confirmación de reemplazo.                                                                                                                                |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | Esta US ES el HITL canónico para AI-003.                                                                            |
| Respeta backend como source of truth | Pass      | Materialización transaccional en backend.                                                                            |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-019 (AIRecommendation pending) + flow demo end-to-end.                                          |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                          |
| No introduce multi-tenant enterprise | Pass      | Ownership por `Event.owner_id`.                                                                                     |
| No introduce P4/Future scope         | Pass      | "Auto-aplicación sin acción del usuario" queda Out of Scope (bien declarado).                                       |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                                                          | Problema detectado                                                                                                                                                  | Acción recomendada                                                                                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail                                                      | "BudgetItems editables" no detalla shape del response, transacción, política de reemplazo (Q2), cache invalidation. "AIRecommendation=accepted" no usa enum canónico. | Reescribir tras Q1/Q2/Q4: especificar transacción, response (lista de items creados), reemplazo, `status='accepted'`.                                                                                                                                                              |
| AC-02 | Not Testable                                                       | "Sólo algunas categorías" sin shape de body ni semántica de "no aplicar" para las no seleccionadas (¿quedan en pending? ¿se descartan?).                            | Reescribir tras Q3: `selected_entries[]`. Entradas no seleccionadas se descartan implícitamente; `status` queda `accepted` global.                                                                                                                                                  |

Negative tests presentes:
- `NT-01 Recommendation final → 409` (correcto, alineado con ADR enum).
- `NT-02 Ajeno → 403/404` (correcto, no-revelación).

Faltantes:
- 401 sin sesión.
- 403 admin.
- 409 `EVENT_NOT_EDITABLE` (cancelled/completed).
- 409 `CATEGORY_INACTIVE` (tras Q6).
- 422 fallback de validación si el payload del `AIRecommendation` ya no coincide con el esquema (defensa en profundidad).
- Performance (`NFR-PERF-001`).
- A11Y del dialog de confirmación.
- Cache invalidation TanStack.
- Atomicidad (rollback si falla).

---

## 6. Gaps Detectados

### Producto / Negocio
- Política de reemplazo (Q2) clarificada al nivel de `ai_generated=true` vs todos.
- Política de categoría desactivada (Q6).
- Texto del modal de confirmación de reemplazo (post Q2).

### Backend / API
- Endpoint definitivo (Q1).
- Body shape de `selected_entries` (Q3).
- Validación Zod del payload del `AIRecommendation` (defensa en profundidad).
- Transaccionalidad explícita: N inserts `BudgetItem` + update `AIRecommendation.status` en una sola `$transaction`.
- Reuso de policies/guards (`EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`).
- Verificación `event.status ∈ {'draft','active'}` (Q5).
- Cache invalidation hacia US-035 (`['event', eventId, 'budget']`).

### Frontend / UX
- Componente `ApplyAIBudgetDialog` con preview de los items a crear.
- Edición inline de `planned` por entrada antes de aplicar.
- Modal de confirmación de reemplazo (cuando aplica).
- Estados loading/error con `aria-busy` y `aria-live`.
- Toast de éxito con conteo de items creados.

### Base de Datos
- Sin migraciones. Reuso de `budget_items` y `ai_recommendations`.
- `BudgetItem.ai_recommendation_id` ya existe (Domain Model §BudgetItem).

### Seguridad / Autorización
- Reuso íntegro.
- Sin AdminAction (no es acción admin).
- Logging sin PII.

### IA / PromptOps
- No invoca LLMProvider directamente; consume `AIRecommendation.payload` ya persistido por US-019.
- Idioma ya respetado upstream (BR-AI-011).
- No requiere prompt versioning (no se invoca prompt).

### QA / Testing
- Faltan tests de autorización completos, atomicidad/rollback, performance, A11Y y contract.

### Seed / Demo
- Recomendado garantizar al menos un `AIRecommendation { type='budget_suggestion', status='pending' }` en el seed para demoar el flow end-to-end.

### Documentación / Trazabilidad
- IDs incorrectos en Traceability.
- Falta `Backlog Item: PB-P1-021`.
- Falta referencia a US-019 (productor), US-025 (HITL genérico), US-035 (consumidor cache).
- Falta el endpoint en `docs/16 §M06` (tras Q1).

---

## 7. Preguntas Pendientes

| Tipo   | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Bloquea aprobación | Responsable     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------- |
| Tech+PO | Q1. ¿Cuál es el path canónico del endpoint? Opciones: (a) `POST /api/v1/events/:eventId/ai/budget-suggestion/:recommendationId/accept` (alineado con `/ai/budget-suggestion` de US-019); (b) `POST /api/v1/events/:eventId/ai-recommendations/:recommendationId/accept` (patrón genérico, posible para US-025); (c) `POST /api/v1/events/:eventId/budget/items/from-ai-recommendation` (RESTful action). Recomendado (a) por consistencia con US-019; alternativa (b) si US-025 introduce un endpoint genérico que US-037 pueda compartir.                                                                                                                                                                  | Sí                 | Tech Lead + PO  |
| PO     | Q2. ¿Política de reemplazo de items existentes? PB-P1-021 dice "Reemplazo pide confirmación", pero no aclara alcance. Opciones: (a) reemplazar **solo** items con `ai_generated=true` provenientes de una `AIRecommendation` anterior (preserva manuales); (b) reemplazar todos los items en las categorías del subset seleccionado; (c) reemplazar todos los items del presupuesto. Recomendado (a) para preservar trabajo manual.                                                                                                                                                                                                                                                            | Sí                 | Product Owner  |
| PO+Tech | Q3. ¿Shape del body para selección/edición parcial? Opciones: (a) `{ selected_entries: [{ service_category_code, planned, label? }] }` permitiendo editar `planned` antes de aplicar (consistente con UC-BUDGET-001 §1 "edita si corresponde"); (b) `{ selected_category_codes: string[] }` sin edición previa (acepta tal cual la sugerencia); (c) ambas con `mode: 'as_is' | 'edited'`. Recomendado (a).                                                                                                                                                                                                                                                                                | Sí                 | PO + Tech Lead |
| PO     | Q4. ¿Estado final del `AIRecommendation` tras aceptación parcial? Opciones: (a) siempre `status='accepted'` (parcial y total) y la auditoría de items aceptados vive en `BudgetItem.ai_recommendation_id`; (b) introducir `status='accepted_partial'` (rompe el enum canónico del ADR). Recomendado (a).                                                                                                                                                                                                                                                                                                                                                                                  | Sí                 | Product Owner  |
| PO     | Q5. ¿Bloqueo de apply en `event.status ∈ {'cancelled','completed'}`? Por consistencia transversal con US-036 D3 recomendado SÍ con 409 `EVENT_NOT_EDITABLE`. Confirmar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Sí                 | Product Owner  |
| PO     | Q6. ¿Manejo de `service_category` desactivada entre generación (US-019) y aceptación? Opciones: (a) ignorar entradas con categoría inactiva y reportar al usuario en el response (advisory); (b) rechazar con 409 `CATEGORY_INACTIVE` y lista de afectadas; (c) aplicar igual (consume snapshot histórico). Recomendado (b) para evitar drift.                                                                                                                                                                                                                                                                                                                                                | Sí                 | Product Owner  |

---

## 8. Documentation Alignment Required

| Documento / Fuente                                                  | Conflicto detectado                                                                                                                            | Decisión vigente                                                                                                                       | Acción recomendada                                                                                                                                                                       | ¿Bloquea aprobación? |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/10-Non-Functional-Requirements.md`                            | US-037 usa `NFR-PERF-API-001`; el canónico es `NFR-PERF-001`.                                                                                   | `NFR-PERF-001`.                                                                                                                          | Corregir durante la refinación. Alineación ya registrada en US-032..036.                                                                                                                  | No                   |
| `docs/16-API-Design-Specification.md §M06` / `§Budget AI`            | Endpoint `POST /budget/apply-ai` no catalogado. `docs/16` línea 1514 documenta `POST /events/:eventId/ai/budget-suggestion` (generación).        | Pendiente Q1.                                                                                                                            | Tras Q1, añadir el endpoint a `docs/16`. Snapshot OpenAPI por US-098 (Future). Bloquea US-037 hasta Q1.                                                                                  | Sí (tras Q1)         |
| `docs/4 §BR-BUDGET-008/009`, `docs/9 §FR-BUDGET-010`                | US-037 referencia IDs incorrectos.                                                                                                              | IDs canónicos confirmados en FRD y BRD.                                                                                                | Corrección objetiva durante refinación.                                                                                                                                                  | No                   |
| `docs/8 §UC-BUDGET-002 §E2` + Doc Alignment de US-036                | UC-BUDGET-002 solo menciona `cancelled`; US-036 D3 extendió a `completed`. US-037 debe seguir el mismo patrón.                                  | Pendiente Q5.                                                                                                                            | Tras Q5, alineación consistente con US-036.                                                                                                                                              | No (tras Q5)         |
| `management/user-stories/US-019-ai-budget-distribution.md` (aprob.) | US-019 establece `AIRecommendation.status` enum y shape `categories[]`; US-037 debe consumir estos invariantes.                                | US-019 es vinculante.                                                                                                                    | Tras Q1/Q3, alinear contrato del body con `service_category_code` (no `service_category_id`) usado por US-019.                                                                          | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                          |
| User Story file path                       | `management/user-stories/US-037-accept-ai-budget-distribution.md`                           |
| User Story ID verified                     | Yes                                                                                         |
| Decision Resolution artifact found         | No                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-037-decision-resolution.md`                |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-037-refinement-review.md`                    |
| Final recommended status                   | Needs Refinement                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                         |
| Reason                                     | 6 preguntas bloqueantes (Q1–Q6) requieren decisión PO + Tech Lead. Resolverlas obliga a reescribir AC-01..02, EC, VR, SEC, Traceability y Technical Notes. |

---

## 10. Cambios Aplicados o Recomendados

(El archivo no fue actualizado. Lista prescriptiva para aplicar tras la resolución de Q1–Q6.)

### Metadata
- Añadir `Backlog Item: PB-P1-021`.
- `Last Updated` → próxima ejecución.
- `Status` → `Ready for Approval` tras decisiones.

### Business Context
- `Context Summary` reformulado: HITL canónico para AI-003; consume `AIRecommendation { type='budget_suggestion', status='pending' }` de US-019; materializa `BudgetItem(ai_generated=true)` en una transacción atómica; respeta política de reemplazo Q2.
- `Assumptions`: heredados de US-019 (`status` enum `pending|accepted|discarded`, shape `categories[]`); reuso de US-036 D3 (bloqueo event status).
- `Dependencies`: US-019 (productor), US-025 (HITL genérico relacionado), US-035 (consumidor cache), US-036 (CRUD), PB-P1-021 (backlog), PB-P1-020.

### PO/BA Decisions Applied
- Sección nueva con D1–D6.

### Traceability
- `FRD Requirement(s)`: FR-BUDGET-010 + FR-AI-003 (productor) + FR-AI-010 (persistencia AIRecommendation).
- `Use Case(s)`: UC-BUDGET-001.
- `Business Rule(s)`: BR-BUDGET-008, BR-BUDGET-009, BR-AI-008, BR-AI-011, BR-BUDGET-007.
- `Permission Rule(s)`: Ownership + OrganizerRoleGuard + adminExclusionGuard.
- `Data Entity / Entities`: `BudgetItem`, `AIRecommendation`, `ServiceCategory`, `Budget`.
- `API Endpoint(s)`: resultado de Q1.
- `NFR Reference(s)`: NFR-PERF-001.
- `Related Document(s)`: `/docs/4 §BR-BUDGET-008/009 §BR-AI-008/011`, `/docs/6 §BudgetItem §AIRecommendation`, `/docs/8 §UC-BUDGET-001`, `/docs/9 §FR-BUDGET-010 §FR-AI-003`, `/docs/10 §NFR-PERF-001`, `/docs/16 §AI`, `management/user-stories/US-019-ai-budget-distribution.md`, `management/user-stories/US-035-view-edit-budget.md`, `management/user-stories/US-036-crud-budget-items.md`.

### Scope Guardrails
- `Explicitly Out of Scope`: auto-aplicación sin acción del usuario, edición de `committed` (system-managed), cambio de moneda, conversión FX.

### Acceptance Criteria
- AC-01 reescrito: shape del request (`recommendationId`, `selected_entries[]`), transacción atómica, response (lista de items creados con `BudgetItemDto`), cache invalidation, `AIRecommendation.status='accepted'`.
- AC-02 reescrito: selección parcial vía `selected_entries[]`; las entradas no seleccionadas se descartan implícitamente.
- AC-03 nuevo: política de reemplazo D2.
- AC-04 nuevo: bloqueo `event.status` D5.
- AC-05 nuevo: manejo de `CATEGORY_INACTIVE` D6.
- AC-06 nuevo: cache invalidation TanStack `['event', eventId, 'budget']`.
- AC-07 nuevo: atomicidad (rollback si cualquier insert falla).
- AC-08 nuevo: consistencia de moneda (el `AIRecommendation` ya tiene moneda del evento; verificar antes de aplicar).
- AC-09 nuevo: A11Y del dialog (`role="dialog"`, focus trap, `aria-live`).
- AC-10 nuevo: P95 < 1.5 s (`NFR-PERF-001`).

### Edge Cases
- EC-01 reescrito: `status ∈ {'accepted','discarded'}` → 409.
- EC-02 nuevo: event `cancelled`/`completed` → 409 (D5).
- EC-03 nuevo: categoría inactiva (D6).
- EC-04 nuevo: payload con `service_category_code` no encontrado → 400.
- EC-05 nuevo: rollback transaccional ante fallo a mitad.

### Validation Rules
- VR-01 reescrita: `AIRecommendation.event_id = eventId` y `status='pending'` → si no, 409 / 404.
- VR-02 reescrita: `selected_entries[].planned ≥ 0`.
- VR-03 nuevo: `selected_entries[].service_category_code` debe estar en el payload del `AIRecommendation` original.
- VR-04 nuevo: `eventId` y `recommendationId` UUID válidos.
- VR-05 nuevo: sin sesión → 401.
- VR-06 nuevo: `event.status ∈ {'draft','active'}` (D5).

### Authorization & Security Rules
- SEC-01 explicitar `EventOwnershipPolicy` + `OrganizerRoleGuard`.
- SEC-02 reescrita: atomicidad en `prisma.$transaction`.
- SEC-03 nuevo: `adminExclusionGuard`.
- SEC-04 nuevo: no-revelación 404.
- SEC-05 nuevo: rate limiting heredado de US-019 (`SEC-POL-AI-007`) NO aplica aquí porque no se invoca LLMProvider.
- SEC-06 nuevo: logging sin PII; payload del log incluye `recommendationId`, `items_created_count`, `replaced_items_count`.

### Technical Notes
- Backend: `ApplyAIBudgetSuggestionUseCase` (renombrado), `BudgetItemWriteRepository` (US-036), `AIRecommendationRepository` (US-019).
- Frontend: `ApplyAIBudgetDialog` con preview + edición inline + modal de reemplazo.
- API: resultado de Q1.
- Observability: log `budget.ai_suggestion.applied` con `recommendationId`, `accepted_entries_count`, `replaced_items_count`, `correlationId`.
- Sin migraciones; reuso del schema entregado por PB-P0-001 + PB-P1-013/16.

### Test Scenarios
- Functional: TS-01 apply total, TS-02 apply parcial, TS-03 reemplazo solo `ai_generated=true`, TS-04 cache invalidation, TS-05 atomicidad/rollback.
- Negative: NT-01..NT-08 (recommendation final, ajeno, no-auth, admin, event cancelled/completed, categoría inactiva, planned negativo, recommendationId no UUID).
- AI: AI-TS-01 items con `ai_generated=true`, AI-TS-02 `AIRecommendation.status='accepted'`, AI-TS-03 idioma respetado.
- AUTH-TS-01..05.
- PERF-01.
- A11Y-01..03.
- CONTRACT-01.

### Definition of Ready
- Marcar `[x] PO/BA validó`.

### Definition of Done
- Añadir: cache invalidation verificada, contract test verde, log emitido sin PII, A11Y verificada, snapshot OpenAPI (US-098 handoff), atomicidad verificada con rollback test.

### Notes
- Reemplazar "Confirmar si requiere texto de confirmación" por el copy localizado del modal de reemplazo (tras Q2).
- Documentar handoff a US-035 (invalida cache) y a US-036 (los items creados son editables por el CRUD).

---

## 11. Recomendación Final

`Needs Refinement`

Seis preguntas (Q1 endpoint, Q2 política de reemplazo, Q3 shape del body, Q4 estado final del AIRecommendation, Q5 bloqueo por estado del evento, Q6 categoría inactiva) requieren decisión antes de poder reescribir AC, EC, VR, SEC y Traceability. Las decisiones están bien acotadas y se pueden resolver con respaldo en `BR-BUDGET-008/009`, `FR-BUDGET-010`, `UC-BUDGET-001`, US-019 (productor aprobado) y US-036 D3 (consistencia transversal).

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review.

---

User Story file updated: No
Path: management/user-stories/US-037-accept-ai-budget-distribution.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-037-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
