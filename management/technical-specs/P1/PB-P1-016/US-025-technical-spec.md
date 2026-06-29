# Technical Specification — US-025: Aplicar, editar o descartar una sugerencia IA (HITL transversal)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-025 |
| Source User Story | `management/user-stories/US-025-accept-edit-discard-ai-suggestion.md` |
| Decision Resolution Artifact | No requerido (decisiones HITL formalizadas en `BR-AI-001..004`, `FR-AI-019`, PO 8.1 nota canónica UC-AI-001..009, `/docs/16` §35.3) |
| Priority | P1 |
| Backlog ID | PB-P1-016 |
| Backlog Title | HITL Accept / Edit / Discard transversal |
| Backlog Execution Order | 34 (P0: 18 + posición 16 en P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-025 |
| Epic | EPIC-AIP-001 — AI-Assisted Event Planning |
| Backlog Item Dependencies | PB-P0-010 (fundación AI). Consumido por PB-P1-012..015, PB-P1-017, PB-P1-030 |
| Feature | HITL transversal sobre `AIRecommendation` |
| Module / Domain | AI / Cross-cutting |
| User Story Status | Approved (with Minor Notes) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-016` — API y UX común para que el usuario actúe sobre cualquier `AIRecommendation`. Pieza central de HITL del MVP: define los endpoints comunes `POST /apply` y `POST /discard`, el strategy registry de side effects por `type` y el componente reusable `HITLActions`. Dependencia directa: `PB-P0-010` (fundación AI). Es consumida por `PB-P1-012` (checklist), `PB-P1-013` (budget), `PB-P1-014` (categorías), `PB-P1-015` (brief), `PB-P1-017` (confirmación en bloque de tareas IA) y `PB-P1-030` (creación de `QuoteRequest`).

### Execution Order Rationale

Ejecutar inmediatamente después de los flujos de generación IA (`US-017..US-021`) porque:

* Los flujos de generación (`US-017..US-021`) ya persisten `AIRecommendation { status='pending' }` y delegan explícitamente el cierre HITL a esta historia.
* `US-021` (recién procesada) y `US-020` referencian explícitamente este endpoint para descarte y click-through.
* Cualquier integración HITL adicional (`US-022`, `US-023`, `US-024`, `US-031`) depende del strategy registry definido aquí.
* No introduce migraciones nuevas: reusa columnas y enums sembrados por la fundación AI-001 (`US-017`, `/docs/18`).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-025 | Único integrante de PB-P1-016 (define la API HITL transversal, el strategy registry y el componente reusable `HITLActions`) | 1 |

---

## 3. Executive Technical Summary

Implementar dos endpoints HTTP idempotentes para el cierre del ciclo HITL sobre cualquier `AIRecommendation { status='pending' }`:

* `POST /api/v1/ai-recommendations/:aiRecommendationId/apply` — admite `editedPayload` opcional (validado contra el `*OutputDto` correspondiente al `type`), invoca la `ApplyStrategy` registrada para el `type`, materializa los side effects y devuelve `200` con el `AIRecommendationResponseDto` actualizado.
* `POST /api/v1/ai-recommendations/:aiRecommendationId/discard` — actualiza `status='discarded'` y devuelve `204` sin efectos colaterales.

El núcleo es un **strategy pattern** (`AIRecommendationApplyStrategyRegistry`) con 8 implementaciones MVP (`event_plan`, `checklist`, `budget_suggestion`, `vendor_categories`, `quote_brief`, `quote_comparison`, `vendor_bio`, `task_prioritization`). Cada strategy implementa la materialización del side effect dentro de una transacción atómica (`PrismaService.$transaction`) que también ejecuta el `UPDATE` condicional `WHERE status='pending'` para garantizar idempotencia natural ante concurrencia. La autorización es ownership backend-only por `ai_recommendation.requested_by_user_id`; admin queda excluido del flujo (`FR-ADMIN-010`). No se introducen migraciones nuevas: todas las columnas (`status`, `edited`, `applied_entity_type`, `applied_entity_id`, `decided_by_user_id`, `decided_at`, `correlation_id`) y el enum `ai_recommendation_status` ya están sembrados por la fundación AI-001 (`US-017`). El frontend entrega el componente reusable `HITLActions` (botonera Aplicar / Editar / Descartar) y los hooks `useApplyAIRecommendation` / `useDiscardAIRecommendation`. La observabilidad incluye logs estructurados (`ai.recommendation.applied|discarded|apply_failed|type_unsupported|conflict|payload_invalid`) y métricas (`hitl_apply_total`, `hitl_discard_total`, `hitl_apply_latency_ms`).

---

## 4. Scope Boundary

### In Scope

* Endpoints `POST /apply` y `POST /discard` con autenticación y ownership policy.
* `ApplyAIRecommendationUseCase` y `DiscardAIRecommendationUseCase`.
* `AIRecommendationApplyStrategyRegistry` con 8 strategies registradas.
* Transacción atómica `PrismaService.$transaction` para `UPDATE ai_recommendations WHERE status='pending'` + side effect.
* Validación Zod (`aiRecommendationIdParamSchema`, `applyRequestBodySchema`, unión dinámica de `*OutputDto` por `type`).
* Detección y redacción de PII en logs reutilizando `OrganizerPiiDetector` (definido por US-021).
* Componente reusable `HITLActions` + `HITLEditModal` (envuelve editores específicos por `type`).
* Hooks `useApplyAIRecommendation`, `useDiscardAIRecommendation` con invalidación de queries origen.
* Observabilidad: logs estructurados, métricas por `type`, correlation IDs.
* Tests: unitarios por strategy, integración para atomicidad y concurrencia, autorización por rol, E2E para 2 flujos representativos.

### Out of Scope

* Decisiones autónomas IA o autoaplicación tras N segundos.
* Moderación o validación semántica IA del `editedPayload` (solo schema).
* Regeneración (cada feature IA mantiene su propio botón "Regenerar" que dispara una nueva generación con un nuevo `AIRecommendation`).
* Cache de salidas IA (`BR-AI-013`).
* Bulk apply / discard transversal (el bulk para tareas IA lo cubre `US-031` / `PB-P1-017`).
* `If-Match` / `ETag` para concurrencia (resuelta por update condicional canónico).
* `AdminAction` y endpoints admin (admin no participa en HITL).
* Edición posterior al `apply` (cada entidad oficial usa su propio endpoint de edición — `FR-EVENT-004`, `FR-TASK-003`, `FR-BUDGET-003`).
* Persistencia del brief final en `QuoteRequest.brief` (delegada a `US-023` / `PB-P1-030`).

### Explicit Non-Goals

* No invocar al `LLMProvider` desde estos endpoints.
* No introducir migraciones nuevas.
* No reabrir la decisión canónica de `/docs/16` §35.3 (dos POST, no PATCH).
* No introducir un `status='edited'`: la edición se modela como flag boolean (`edited=true`) sobre `status='accepted'`.
* No moderar el contenido del `editedPayload` más allá de schema y tamaño.

---

## 5. Architecture Alignment

### Backend Architecture

* **Modular Monolith** alineado con `/docs/14`: nuevo módulo `modules/ai/recommendations/hitl/` que reúne use cases, registry, strategies y controller.
* **Clean / Hexagonal**: capas `controllers` (thin), `application` (use cases), `domain` (registry + strategy contract), `infrastructure` (Prisma repositories).
* **Express.js + TypeScript** con thin controllers que delegan en `ApplyAIRecommendationUseCase` y `DiscardAIRecommendationUseCase`.
* **Zod** para validación de path params y body (`applyRequestBodySchema`).
* **PrismaService.$transaction** para envolver `UPDATE ai_recommendations` + side effect en una sola transacción Postgres.

### Frontend Architecture

* **Next.js App Router** (consumido por cada vista IA existente).
* **Client Components**: `HITLActions`, `HITLEditModal`, `AIBadge` (reusado de `US-017`).
* **TanStack Query mutations**: `useApplyAIRecommendation`, `useDiscardAIRecommendation`; invalidan queries origen (`['event', eventId]`, `['budget', eventId]`, etc.) declaradas por el consumidor.
* **React Hook Form + Zod** para el editor por `type`; cada US dueña del `type` provee el schema y el editor.
* **next-intl** para copy en 4 locales.

### Database Architecture

* Modelo `AIRecommendation` ya existente con columnas requeridas (`status`, `edited`, `applied_entity_type`, `applied_entity_id`, `decided_by_user_id`, `decided_at`, `correlation_id`).
* Enum `ai_recommendation_status` ya sembrado: `pending | accepted | rejected | discarded | failed | expired`.
* Reuso de índice `ai_recommendations(requested_by_user_id, status, created_at)`.
* Sin migraciones nuevas.

### API Architecture

* REST JSON bajo `/api/v1/`.
* Dos POST canónicos en `/docs/16` §35.3 (líneas 1521–1522).
* Códigos de error documentados: `RECOMMENDATION_NOT_PENDING` (409), `EDITED_PAYLOAD_INVALID` (400), `RECOMMENDATION_TYPE_NOT_APPLICABLE` (422), `PAYLOAD_TOO_LARGE` (413), `SIDE_EFFECT_FAILED` (5xx).

### AI / PromptOps Architecture

* **No se invoca al `LLMProvider`**: el HITL es post-generación.
* Reusa `AIRecommendation` y enums sembrados por la fundación AI-001 (`US-017`).
* Reusa `OrganizerPiiDetector` (`US-021`) para redactar PII en logs antes de persistirlos.

### Security Architecture

* **HTTP-only cookies** para autenticación (alineado con `/docs/19`).
* **Backend como source of truth** para autorización.
* **Ownership policy**: `actor.id === ai_recommendation.requested_by_user_id`.
* **No-revelación**: `404` para recursos ajenos (no se distingue de inexistente).
* **Admin excluido** del flujo (`FR-ADMIN-010`).
* **Audit columns**: `decided_by_user_id`, `decided_at`, `correlation_id`.
* **Sin secretos**: este endpoint no maneja `OPENAI_API_KEY`.

### Testing Architecture

* **Vitest** para unit tests de strategies y use cases.
* **Supertest** para integración del controller y validación end-to-end del transaction wrapping.
* **Playwright + MSW** para E2E de 2 flujos representativos (plan → editar → aplicar; brief → editar → aplicar → handoff a US-023).
* **MockAIProvider** no aplica (el LLM no se invoca).
* Tests de concurrencia: dos `apply` simultáneos sobre la misma recomendación.
* Tests de accesibilidad para `HITLActions`.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Apply sin edición | `ApplyAIRecommendationUseCase` resuelve strategy desde registry; ejecuta `prisma.$transaction([updateAIRecommendation, ...sideEffectOps])`; log `ai.recommendation.applied`. | Backend, DB, Observability |
| AC-02: Apply con `editedPayload` válido | Zod valida `editedPayload` contra `*OutputDto` resuelto en runtime según `recommendation.type`; reemplaza `output` antes de invocar la strategy; marca `edited=true`. | Backend, Validation |
| AC-03: Discard | `DiscardAIRecommendationUseCase` ejecuta `UPDATE WHERE status='pending'` con `status='discarded'`; log `ai.recommendation.discarded`; responde `204`. | Backend, DB, Observability |
| AC-04: Trazabilidad bidireccional | La strategy poblará `applied_entity_type`/`applied_entity_id` cuando es entidad única, o lo dejará `NULL` para efectos múltiples; cada side effect inserta `ai_recommendation_id` en la entidad destino. | Backend, DB |
| AC-05: Strategy extensible | `AIRecommendationApplyStrategyRegistry.resolve(type)` lanza error tipado cuando no hay strategy; controller lo mapea a `422 RECOMMENDATION_TYPE_NOT_APPLICABLE`. | Backend |
| AC-06: Idioma propagado en logs | El logger estructurado incluye `language_code` desde `AIRecommendation.language_code` propagado por la generación original. | Observability |
| EC-01: No pending | `UPDATE WHERE status='pending'` retorna 0 filas afectadas ⇒ controller emite `409 RECOMMENDATION_NOT_PENDING` con el `status` actual. | Backend, DB |
| EC-02: Ajena | `AIRecommendationOwnershipPolicy` retorna `not_found`; controller emite `404`. | Backend, Security |
| EC-03: Schema inválido | Zod falla; controller emite `400 EDITED_PAYLOAD_INVALID` con detalles. | Backend, Validation |
| EC-04: Side effect falla | `$transaction` revierte; controller emite `5xx SIDE_EFFECT_FAILED` con `correlation_id`; `status` permanece `pending`. | Backend, DB, Observability |
| EC-05: Type sin strategy | Registry lanza `TypeNotApplicableError`; controller emite `422`. | Backend |
| EC-06: Payload >256 KB | Middleware Express con `limit=256kb` para body de `/apply`; emite `413` antes de Zod. | Backend, API |
| EC-07: Concurrencia | `UPDATE ai_recommendations SET status='accepted' WHERE id=? AND status='pending'` garantiza atomicidad; el segundo request afecta 0 filas y emite `409`. | Backend, DB |
| EC-08: Discard con body | Controller ignora el body en `/discard` por diseño (no se parsea). | Backend, API |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

```text
backend/src/modules/ai/recommendations/hitl/
├── application/
│   ├── apply-ai-recommendation.use-case.ts
│   ├── discard-ai-recommendation.use-case.ts
│   └── errors/
│       ├── recommendation-not-pending.error.ts
│       ├── recommendation-type-not-applicable.error.ts
│       ├── edited-payload-invalid.error.ts
│       └── side-effect-failed.error.ts
├── domain/
│   ├── ai-recommendation-apply-strategy.contract.ts
│   ├── ai-recommendation-apply-strategy-registry.ts
│   └── policies/
│       └── ai-recommendation-ownership.policy.ts
├── infrastructure/
│   ├── prisma/
│   │   └── ai-recommendation.hitl.repository.ts
│   └── strategies/
│       ├── event-plan.apply-strategy.ts          // delega a EventAiPlanRepository (US-017)
│       ├── checklist.apply-strategy.ts           // delega a EventTaskRepository (US-018)
│       ├── budget-suggestion.apply-strategy.ts   // delega a BudgetItemRepository (US-019)
│       ├── vendor-categories.apply-strategy.ts   // no-op + adopción (US-020)
│       ├── quote-brief.apply-strategy.ts         // no-op marker; handoff a US-023
│       ├── quote-comparison.apply-strategy.ts    // no-op + adopción
│       ├── vendor-bio.apply-strategy.ts          // delega a VendorProfileRepository (US-024)
│       └── task-prioritization.apply-strategy.ts // delega a EventTaskRepository (US-031)
├── presentation/
│   ├── ai-recommendation-hitl.controller.ts
│   ├── schemas/
│   │   ├── ai-recommendation-id-param.schema.ts
│   │   ├── apply-request-body.schema.ts
│   │   └── output-dto-resolver.ts                // unión dinámica de *OutputDto por type
│   └── routes/
│       └── ai-recommendation-hitl.routes.ts
└── index.ts
```

### Use Cases / Application Services

* `ApplyAIRecommendationUseCase.execute({ aiRecommendationId, actorId, editedPayload? }) → AIRecommendationResponseDto`
  * Carga la `AIRecommendation` con ownership policy.
  * Resuelve la strategy por `type` (`registry.resolve(recommendation.type)`).
  * Si hay `editedPayload`, valida con `OutputDtoResolver.schemaFor(type)` y reemplaza `output`.
  * Ejecuta `prismaService.$transaction(async (tx) => { strategy.applyInTransaction(tx, recommendation, finalOutput); await tx.aiRecommendation.update(...) })`. El update usa `WHERE status='pending'`; si afecta 0 filas, lanza `RecommendationNotPendingError`.
  * Persiste log `ai.recommendation.applied` con `type`, `edited`, `applied_entity_type`, `latency_ms`, `language_code`, `correlation_id`.
* `DiscardAIRecommendationUseCase.execute({ aiRecommendationId, actorId }) → void`
  * Ownership policy.
  * `UPDATE ai_recommendations SET status='discarded', decided_by_user_id=?, decided_at=NOW() WHERE id=? AND status='pending'`.
  * Si afecta 0 filas ⇒ `RecommendationNotPendingError`.
  * Log `ai.recommendation.discarded`.

### Controllers / Routes

```text
POST /api/v1/ai-recommendations/:aiRecommendationId/apply    → AIRecommendationHITLController.apply
POST /api/v1/ai-recommendations/:aiRecommendationId/discard  → AIRecommendationHITLController.discard
```

* Thin controllers que delegan en los use cases.
* Body limit del `apply` configurado a `256kb` vía middleware Express (`express.json({ limit: '256kb' })` scoped al subrouter).
* `discard` no parsea body.

### DTOs / Schemas

* `aiRecommendationIdParamSchema = z.object({ aiRecommendationId: z.string().uuid() })`.
* `applyRequestBodySchema = z.object({ editedPayload: z.unknown().optional() })` (el schema fuerte por `type` se resuelve en el use case mediante `OutputDtoResolver`).
* `OutputDtoResolver.schemaFor(type)` retorna el `*OutputDto` registrado por cada feature IA (`EventPlanOutputDto`, `EventChecklistOutputDto`, `BudgetSuggestionOutputDto`, `VendorCategoriesOutputDto`, `QuoteBriefOutputDto`, `QuoteComparisonOutputDto`, `VendorBioOutputDto`, `TaskPrioritizationOutputDto`).
* `AIRecommendationResponseDto`: serializa `AIRecommendation` con campos públicos (id, type, status, edited, applied_entity_type, applied_entity_id, decided_at, language_code, output, correlation_id).

### Repository / Persistence

* `AIRecommendationHITLRepository` con métodos:
  * `findOwnedById(id, actorId): Promise<AIRecommendation | null>` (verifica ownership).
  * `markAccepted(tx, { id, finalOutput, edited, appliedEntityType?, appliedEntityId?, actorId }): Promise<{ updatedCount: number }>`. Usa `UPDATE ... WHERE id=? AND status='pending'` para idempotencia.
  * `markDiscarded(tx, { id, actorId }): Promise<{ updatedCount: number }>`.

### Validation Rules

| VR | Schema / Lugar | Comportamiento |
|---|---|---|
| VR-01 | `aiRecommendationIdParamSchema` | `400 VALIDATION` |
| VR-02 | `OwnershipPolicy` + repo `findOwnedById` | `404 NOT_FOUND` |
| VR-03 | `markAccepted/markDiscarded WHERE status='pending'` | `409 RECOMMENDATION_NOT_PENDING` |
| VR-04 | `registry.resolve(type)` | `422 RECOMMENDATION_TYPE_NOT_APPLICABLE` |
| VR-05 | `OutputDtoResolver.schemaFor(type).safeParse(editedPayload)` | `400 EDITED_PAYLOAD_INVALID` |
| VR-06 | `express.json({ limit: '256kb' })` | `413 PAYLOAD_TOO_LARGE` |
| VR-07 | Controller `/discard` no parsea body | sin error |
| VR-08 | `prismaService.$transaction` | `5xx SIDE_EFFECT_FAILED` con rollback |
| VR-09 | `OwnershipPolicy` rechaza rol `admin` | `403 FORBIDDEN` |

### Error Handling

* Errores tipados (`RecommendationNotPendingError`, `RecommendationTypeNotApplicableError`, `EditedPayloadInvalidError`, `SideEffectFailedError`, `OwnershipDeniedError`) mapeados por un error-handler centralizado a códigos HTTP y `error.code` documentado.
* `correlation_id` siempre presente en la respuesta de error.

### Transactions

* `prismaService.$transaction(async (tx) => { ... })` envuelve:
  1. La operación de side effect (insert/update entidades destino).
  2. El `UPDATE ai_recommendations` condicional.
* Si el side effect lanza error ⇒ rollback automático; el `status` permanece `pending`.
* Postgres serializable garantiza atomicidad para concurrencia.

### Observability

* Logs estructurados:
  * `ai.recommendation.applied { aiRecommendationId, type, edited, appliedEntityType?, latencyMs, languageCode, correlationId, actorId }`
  * `ai.recommendation.discarded { aiRecommendationId, type, correlationId, actorId }`
  * `ai.recommendation.apply_failed { aiRecommendationId, type, errorCode, correlationId }`
  * `ai.recommendation.type_unsupported { type, aiRecommendationId, correlationId }` (alerta de drift)
  * `ai.recommendation.conflict { aiRecommendationId, currentStatus, correlationId }`
  * `ai.recommendation.payload_invalid { aiRecommendationId, type, zodIssues, correlationId }`
* Métricas Prometheus:
  * `hitl_apply_total{type, edited}` — counter
  * `hitl_discard_total{type}` — counter
  * `hitl_apply_failure_total{type, error_code}` — counter
  * `hitl_apply_latency_ms{type}` — histogram
* PII redaction: el logger pasa el `editedPayload` por `OrganizerPiiDetector.redact()` antes de incluirlo en cualquier log de error.

---

## 8. Frontend Technical Design

### Routes / Pages

`HITLActions` se monta dentro de las vistas IA existentes (no introduce rutas nuevas). Las US dueñas de cada `type` integran el componente en:

* `/[locale]/organizer/events/:id/plan` (US-017)
* `/[locale]/organizer/events/:id/checklist` (US-018)
* `/[locale]/organizer/events/:id/budget` (US-019)
* `/[locale]/organizer/events/:id/vendors/categories` (US-020)
* `/[locale]/organizer/events/:id/quotes/new` (US-021)
* etc.

### Components

* `HITLActions` — botonera reutilizable `{ recommendation, onApplied?, onDiscarded? }`.
* `HITLEditModal` — modal genérico que recibe `{ recommendation, EditorComponent }`; la US dueña del `type` provee el `EditorComponent` con su `useForm` específico.
* `AIBadge` — reusado de `US-017`.
* `HITLConfirmDiscardDialog` — confirmación de descarte.

### Forms

* React Hook Form + Zod por `type`; el schema es el `*OutputDto` correspondiente (resuelto por la US dueña).
* Estado de edición controlado por `HITLEditModal`.

### State Management

* `useApplyAIRecommendation(aiRecommendationId)`:
  ```ts
  useMutation({
    mutationFn: ({ editedPayload }: { editedPayload?: unknown }) =>
      aiApi.applyRecommendation(aiRecommendationId, { editedPayload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendation', aiRecommendationId] });
      // El consumidor pasa queryKey adicionales para invalidar la vista origen.
    },
  });
  ```
* `useDiscardAIRecommendation(aiRecommendationId)` análogo.

### Data Fetching

* No introduce queries nuevas; reutiliza las queries origen de cada vista IA.

### Loading / Empty / Error / Success States

| Estado | Comportamiento |
|---|---|
| Loading | Spinner en el botón disparado; el resto se deshabilita; `aria-live="polite"` anuncia "Aplicando sugerencia IA…". |
| Empty | No aplica (el componente solo se monta cuando hay una `AIRecommendation pending`). |
| Error | Toast con `error.code` traducido; botón "Reintentar"; preserva el `editedPayload` editado en memoria local. |
| Success | Toast "Sugerencia aplicada" / "Sugerencia descartada"; revalidación de queries origen; desmonte del componente. |

### Accessibility

* Botones con `aria-label` explícito (`"Aplicar sugerencia de plan"`, `"Editar sugerencia"`, `"Descartar sugerencia"`).
* Orden de tab: Aplicar → Editar → Descartar.
* Modal de edición captura el foco y lo restaura al cerrar.
* `aria-live="polite"` anuncia el resultado.
* Contraste mínimo AA en botones y badge.

### i18n

* `next-intl` con keys `hitl.actions.*`, `hitl.errors.*`, `hitl.toasts.*` en 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`).
* El `editedPayload` mantiene el `language_code` del `AIRecommendation`.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/ai-recommendations/:aiRecommendationId/apply` | Aceptar (con edición opcional) y materializar side effects | Sí (cookie de sesión; rol Organizer u Vendor según `type`) | Path: `aiRecommendationId` (UUID). Body: `{ editedPayload?: <type-specific JSON> }` (≤256KB) | `200` `AIRecommendationResponseDto` | `400 VALIDATION`, `400 EDITED_PAYLOAD_INVALID`, `401 UNAUTHORIZED`, `403 FORBIDDEN` (admin), `404 NOT_FOUND` (ajena o inexistente), `409 RECOMMENDATION_NOT_PENDING`, `413 PAYLOAD_TOO_LARGE`, `422 RECOMMENDATION_TYPE_NOT_APPLICABLE`, `5xx SIDE_EFFECT_FAILED` |
| POST | `/api/v1/ai-recommendations/:aiRecommendationId/discard` | Descartar sin efectos | Sí | Path: `aiRecommendationId` (UUID). Body: ignorado | `204 No Content` | `400 VALIDATION`, `401`, `403`, `404`, `409 RECOMMENDATION_NOT_PENDING` |

`AIRecommendationResponseDto`:

```jsonc
{
  "id": "uuid",
  "type": "event_plan | checklist | budget_suggestion | vendor_categories | quote_brief | quote_comparison | vendor_bio | task_prioritization",
  "status": "pending | accepted | rejected | discarded | failed | expired",
  "edited": true,
  "languageCode": "es | en | pt | fr",
  "output": { /* validado contra *OutputDto del type */ },
  "appliedEntityType": "event | event_task | budget_item | vendor_profile | vendor_service | null",
  "appliedEntityId": "uuid | null",
  "decidedAt": "ISO-8601 | null",
  "decidedByUserId": "uuid | null",
  "correlationId": "uuid",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

---

## 10. Database / Prisma Design

### Models Impacted

* `AIRecommendation` (update; sin cambios de schema).
* Modelos destino (insert/update vía strategies; los repositorios de cada modelo viven en sus US dueñas y se inyectan en las strategies):
  * `Event` (`event_plan` → `ai_plan`, `ai_recommendation_id`)
  * `EventTask` (`checklist`, `task_prioritization`)
  * `BudgetItem` (`budget_suggestion`)
  * `VendorProfile` (`vendor_bio` → `bio`)
  * `VendorService` (`vendor_bio` → `description`)

### Fields / Columns

* `ai_recommendations.status` — enum `ai_recommendation_status`.
* `ai_recommendations.edited` — boolean (ya existe; flag de payload editado).
* `ai_recommendations.applied_entity_type` — text nullable.
* `ai_recommendations.applied_entity_id` — uuid nullable.
* `ai_recommendations.decided_by_user_id` — uuid nullable.
* `ai_recommendations.decided_at` — timestamptz nullable.
* `ai_recommendations.correlation_id` — uuid (heredado de la generación).

### Relations

* `AIRecommendation.requested_by_user_id → User.id` (ownership).
* `AIRecommendation.decided_by_user_id → User.id`.
* Trazabilidad inversa: cada entidad destino expone `ai_recommendation_id` nullable que apunta a `AIRecommendation.id`.

### Indexes

* Reusa `ai_recommendations(requested_by_user_id, status, created_at)`.
* No se crean índices nuevos.

### Constraints

* Enum `ai_recommendation_status` ya cubre los estados canónicos.
* Check constraint sugerido (verificar implementación contra `/docs/18`): `status='accepted' ⇒ applied_entity_type IS NOT NULL OR type IN ('vendor_categories','quote_brief','quote_comparison')`.

### Migrations Impact

* **Ninguna migración nueva.** Toda la estructura está sembrada por la fundación AI-001 (`US-017`) según `/docs/18`.
* Tareas DB: verificación y, si fuese necesario, registro de la check constraint mencionada (clasificada como verificación, no como migración nueva).

### Seed Impact

* No requiere semillas nuevas: el enum y los `*OutputDto` viven en las US dueñas.
* No requiere prompts (`PromptRegistry` no se invoca).

---

## 11. AI / PromptOps Design

### AI Feature

HITL transversal (cierre del ciclo de toda `AIRecommendation`).

### Provider

**No aplica.** El `LLMProvider` no se invoca desde este flujo.

### Prompt Version

**No aplica.** No se genera contenido IA en estos endpoints.

### Input Schema

`applyRequestBodySchema = { editedPayload?: unknown }`. La validación fuerte por `type` se resuelve dinámicamente con `OutputDtoResolver.schemaFor(type)`.

### Output Schema

`AIRecommendationResponseDto` (descrito en sección 9).

### Human-in-the-loop

Esta historia **ES** el HITL canónico. Todo lo que la IA produce (`status='pending'`) se cierra exclusivamente por estos endpoints.

### Fallback

No aplica al HITL: el LLM no se invoca. Si el side effect falla, el `status` permanece `pending` (no se marca `failed`).

### Persistence

`AIRecommendation` se actualiza atómicamente con la entidad oficial creada/modificada. Trazabilidad bidireccional vía `applied_entity_*` y `ai_recommendation_id` en la entidad destino.

### Safety Rules

* `BR-AI-001..004`: validación humana obligatoria; sin decisiones autónomas IA; editabilidad pre-confirmación enforced.
* PII redaction en logs reutilizando `OrganizerPiiDetector` (US-021).
* El contenido del `editedPayload` no es moderado por IA; el usuario es responsable (`BR-AI-004`).

---

## 12. Security & Authorization Design

### Authentication

* HTTP-only cookies de sesión.
* `requireAuthenticated` middleware antes de cualquier handler HITL.

### Authorization

* `AIRecommendationOwnershipPolicy.assertOwnership({ aiRecommendation, actor })`:
  * Verifica `actor.id === aiRecommendation.requested_by_user_id`.
  * Si actor es admin ⇒ `OwnershipDeniedError('admin_excluded')` ⇒ `403`.
  * Si no es dueño ⇒ `OwnershipDeniedError('not_owner')` ⇒ controller traduce a `404` (no-revelación).

### Ownership Rules

* `type ∈ {event_plan, checklist, budget_suggestion, vendor_categories, quote_brief, quote_comparison, task_prioritization}` ⇒ dueño es el organizador del evento asociado (`requested_by_user_id === event.organizer_id`).
* `type ∈ {vendor_bio}` ⇒ dueño es el vendor titular del perfil.

### Role Rules

* Admin: excluido del flujo (`FR-ADMIN-010`).
* Organizer: dueño solo de sus `type` propios.
* Vendor: dueño solo de `type='vendor_bio'`.

### Negative Authorization Scenarios

| Escenario | Respuesta |
|---|---|
| Actor no dueño | `404 NOT_FOUND` |
| Admin autenticado | `403 FORBIDDEN` |
| Vendor sobre `type` del organizador | `404 NOT_FOUND` |
| Organizer sobre `type='vendor_bio'` | `404 NOT_FOUND` |
| Anónimo / sesión inválida | `401 UNAUTHORIZED` |

### Audit Requirements

* `decided_by_user_id`, `decided_at`, `correlation_id` persistidos en `AIRecommendation`.
* Logs estructurados con `actorId`, `correlationId`, `type`, `errorCode` cuando aplique.
* `AdminAction` no requerido (no es flujo admin).

### Sensitive Data Handling

* `editedPayload` puede contener PII del organizador; el logger redacta antes de loguear vía `OrganizerPiiDetector.redact()`.
* No se persisten tokens ni secretos.
* No se incluye PII completa en logs de error.

---

## 13. Testing Strategy

### Unit Tests

* `AIRecommendationApplyStrategyRegistry`:
  * `resolve(type)` retorna la strategy registrada.
  * `resolve(unknownType)` lanza `RecommendationTypeNotApplicableError`.
* Cada strategy (8): unit test con mock del repository destino verificando la mutación esperada.
* `AIRecommendationOwnershipPolicy`: matriz de roles (organizer dueño, organizer ajeno, vendor dueño, vendor ajeno, admin, anónimo).
* `OutputDtoResolver.schemaFor(type)`: cobertura por `type` y caso `unknown`.

### Integration Tests

* `ApplyAIRecommendationUseCase`:
  * AC-01: apply sin `editedPayload` sobre `checklist` crea N `EventTask` con `ai_recommendation_id`.
  * AC-02: apply con `editedPayload` válido marca `edited=true` y aplica el contenido editado.
  * EC-04: side effect falla ⇒ rollback ⇒ `status` permanece `pending`.
  * EC-07: dos `apply` quasi-simultáneos (modelo: ejecutar dos use cases concurrentemente con la misma `aiRecommendationId`) ⇒ primero `200`, segundo `409`.
* `DiscardAIRecommendationUseCase`:
  * AC-03: `discard` actualiza `status='discarded'` sin side effects.
  * EC-08: `discard` con body es aceptado.
* `AIRecommendationHITLRepository`:
  * `markAccepted`/`markDiscarded` retornan 0 filas afectadas cuando `status ≠ 'pending'`.

### API Tests

* `POST /apply`:
  * `200` happy path con todos los `type` MVP (8 tests).
  * `400 VALIDATION` con `aiRecommendationId` no UUID.
  * `400 EDITED_PAYLOAD_INVALID` con schema inválido.
  * `401` anónimo.
  * `403` admin.
  * `404` ajena.
  * `409 RECOMMENDATION_NOT_PENDING` sobre cada estado terminal.
  * `413 PAYLOAD_TOO_LARGE` con body >256KB.
  * `422 RECOMMENDATION_TYPE_NOT_APPLICABLE` con `type` sin strategy registrada (simulado deregistrando una strategy en el test).
  * `5xx SIDE_EFFECT_FAILED` con strategy mockeada para fallar.
* `POST /discard`:
  * `204` happy path.
  * Errores análogos.

### E2E Tests

* **Plan IA completo**: organizer genera plan (US-017) → edita en modal → aplica → tareas/fases visibles en la vista.
* **Brief IA**: organizer genera brief (US-021) → edita → aplica → handoff a US-023 (creación de `QuoteRequest`); verificar invalidación de queries.
* **Descartar categorías**: organizer ve categorías sugeridas (US-020) → descarta → vista vuelve a estado vacío.

### Security Tests

* Matriz roles × `type` (organizer/vendor/admin/anónimo).
* No-revelación: comparar respuestas `404` ajena vs `404` inexistente (deben ser indistinguibles).
* Test de PII redaction: log emitido tras error contiene `[REDACTED]` en lugar de email/teléfono/dirección.

### Accessibility Tests

* `HITLActions`: navegación por teclado, `aria-label`, contraste AA (Playwright + axe).
* `HITLEditModal`: captura y restauración de foco.
* `aria-live="polite"` verificado.

### AI Tests

(Definidas en la US como AI-TS-01..07.)

* AI-TS-01..05: cada strategy materializa la entidad esperada con trazabilidad.
* AI-TS-06: concurrencia (cubierto en integration).
* AI-TS-07: PII en `editedPayload` ⇒ logs redactados, side effect respeta el contenido del usuario.

### Seed / Demo Tests

* Verificar que el flujo demo (organizer fixture + AIRecommendation seed pending) puede ser aplicado y descartado sin errores.

### CI Checks

* Lint, typecheck, unit + integration + API + E2E + accessibility.
* Cobertura mínima 85% en `modules/ai/recommendations/hitl/`.
* `pnpm test:hitl` script dedicado.

---

## 14. Observability & Audit

### Logs

Eventos estructurados (JSON):

* `ai.recommendation.applied`
* `ai.recommendation.discarded`
* `ai.recommendation.apply_failed`
* `ai.recommendation.type_unsupported`
* `ai.recommendation.conflict`
* `ai.recommendation.payload_invalid`

Campos comunes: `timestamp`, `level`, `correlationId`, `actorId`, `aiRecommendationId`, `type`, `languageCode`. Campos extra según evento (`edited`, `appliedEntityType`, `latencyMs`, `errorCode`, `zodIssues` redactados).

### Correlation ID

* Heredado desde `AIRecommendation.correlation_id` (poblado en la generación).
* Propagado en todos los logs y en `error.correlationId` en respuestas de error.

### AdminAction

**No aplica** (HITL no es flujo admin).

### Error Tracking

* Sentry (o equivalente alineado con `/docs/21`) recibe errores `5xx SIDE_EFFECT_FAILED` con `correlationId`, `type`, `actorId` (sin PII).

### Metrics

* `hitl_apply_total{type, edited}` — counter
* `hitl_discard_total{type}` — counter
* `hitl_apply_failure_total{type, error_code}` — counter
* `hitl_apply_latency_ms{type}` — histogram
* Dashboard "HITL Adoption": apply/discard ratio por `type`, P50/P95 latencia, error rate.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* No requiere seeds nuevos (el enum y la estructura ya están sembrados por US-017).
* La demo asume `AIRecommendation pending` generadas por los flujos de cada US dueña (US-017..US-021); no es responsabilidad de US-025 sembrarlas.

### Demo Scenario Supported

* "Generate AI plan → edit → apply → tasks materialized" (US-017 + US-025).
* "Generate AI quote brief → edit → apply → handoff to QuoteRequest" (US-021 + US-025 + US-023).
* "Suggest vendor categories → discard" (US-020 + US-025).

### Reset / Isolation Notes

* El reset de demo reinicializa `ai_recommendations.status='pending'` para las fixtures relevantes; este endpoint solo opera sobre lo existente.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/9-FRD.md` | La versión original de US-025 referenciaba `FR-AI-015/016` (AnthropicProvider stub / `LLM_PROVIDER` config); el canónico es `FR-AI-019` (aceptar/editar/regenerar) + `FR-AI-018` (prompt versionado). | Trazabilidad canónica: `FR-AI-019` + `FR-AI-018`. | Cleanup editorial en `/docs/9` referencias cruzadas. | No |
| `/docs/8-Use-Cases-Specification.md` | `UC-AI-009` modelado como HITL aislado; el canónico vigente cubre `UC-AI-001..008` con `UC-AI-002` como ancla. | Traza apunta a `UC-AI-002` + transversal `UC-AI-001..008`. | Aclaración liviana en `/docs/8`; opcional UC dedicado a HITL transversal. | No |
| `/docs/16-API-Design-Specification.md` | El snapshot OpenAPI debe regenerarse para reflejar los dos POST (`/apply` y `/discard`) ya documentados en §35.3. | Endpoints canónicos vigentes en §35.3 líneas 1521–1522. | Coordinar regeneración del snapshot OpenAPI vía `US-098`. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Strategy nueva no registrada al introducir un nuevo `type` IA | Medio (apply fallaría con `422` en producción) | Test que enumera todos los `type` del enum y verifica que cada uno tiene strategy registrada; CI lo bloquea. |
| `editedPayload` malicioso con schema válido pero contenido problemático (XSS al renderizar) | Medio | La responsabilidad de sanitización corresponde a cada vista consumidora; el HITL solo valida schema y tamaño. Documentar en `/docs/15`. |
| Concurrencia mal manejada en tests | Bajo (lógica DB correcta) | Test explícito de concurrencia: dos use cases ejecutados en paralelo con `Promise.all`. |
| Side effect parcial sin transacción | Alto (state inconsistente) | Lint custom o code review que prohíba operaciones de repository fuera de `$transaction` dentro de strategies. |
| PII en logs sin redactar | Alto (compliance) | `OrganizerPiiDetector` reusado; test que verifica logs redactados ante payload con email/teléfono. |
| Frontend invalida queries equivocadas | Bajo (UX confuso) | El consumidor pasa explícitamente las `queryKey` a invalidar; tipos garantizan que se especifiquen. |
| Body limit configurado globalmente y no por ruta | Medio | Subrouter HITL con `express.json({ limit: '256kb' })` propio; test que envía 257KB y espera `413`. |

---

## 18. Implementation Guidance for Coding Agents

### Files / Folders Likely Impacted

* Nuevo módulo: `backend/src/modules/ai/recommendations/hitl/` con la estructura descrita en §7.
* Nuevo archivo de rutas Express registrando el subrouter `/api/v1/ai-recommendations/:id/(apply|discard)`.
* Nuevo componente: `frontend/src/features/ai/hitl/HITLActions.tsx`, `HITLEditModal.tsx`, `HITLConfirmDiscardDialog.tsx`.
* Nuevos hooks: `frontend/src/features/ai/hitl/use-apply-ai-recommendation.ts`, `use-discard-ai-recommendation.ts`.
* Cliente API: extensión de `frontend/src/lib/api/ai-api.ts` con `applyRecommendation` y `discardRecommendation`.
* i18n: nuevos namespaces `hitl.*` en los 4 locales.
* Dashboards/alertas observabilidad (Grafana / Prometheus rules).

### Recommended Order of Implementation

1. Definir contratos `domain/` (`ApplyStrategy`, `Registry`, errors).
2. Implementar `AIRecommendationHITLRepository` con `markAccepted`/`markDiscarded`.
3. Implementar use cases (`ApplyAIRecommendationUseCase`, `DiscardAIRecommendationUseCase`).
4. Implementar las 8 strategies (delegan a repositorios de US-017..US-024 / US-031 — definir interfaces locales si los repositorios destino aún no existen, para descalzar dependencias).
5. Implementar `OwnershipPolicy` y `OutputDtoResolver`.
6. Implementar controller + routes + middleware con body limit.
7. Tests unitarios e integración por capa.
8. Implementar componente y hooks frontend.
9. Integrar `HITLActions` en las vistas IA existentes (puede hacerse en oleadas por US).
10. Configurar logs y métricas.
11. Tests E2E + accesibilidad.

### Decisions That Must Not Be Reopened

* Dos endpoints POST (`/apply` y `/discard`), no un único PATCH.
* `edited` es flag boolean, no estado.
* Idempotencia por update condicional `WHERE status='pending'`, sin `If-Match`/`ETag` en MVP.
* Admin excluido del HITL.
* `404` para ajena (no-revelación).
* `status` permanece `pending` si side effect falla (no se marca `failed`).
* Sin moderación IA del `editedPayload`.

### What Must Not Be Implemented

* Endpoint `PATCH` único.
* Bulk transversal.
* Cache de salidas IA.
* Regeneración inline (queda en la US dueña del `type`).
* `AdminAction` para HITL.
* Edición posterior al `apply`.

### Assumptions to Preserve

* La `AIRecommendation` fue creada por el flujo de generación correspondiente (`status='pending'`).
* El `editedPayload`, cuando se provee, cumple el mismo schema (`*OutputDto`) que valida la generación.
* Los repositorios destino de cada `type` viven en sus US dueñas; las strategies se inyectan con interfaces.

---

## 19. Task Generation Notes

### Suggested Task Groups

* **BE (Use cases + Strategies)**: `ApplyAIRecommendationUseCase`, `DiscardAIRecommendationUseCase`, `AIRecommendationApplyStrategyRegistry`, 8 strategies (event_plan, checklist, budget_suggestion, vendor_categories, quote_brief, quote_comparison, vendor_bio, task_prioritization), errores tipados.
* **API**: subrouter Express con body limit, controller, schemas Zod, error handler mapping.
* **SEC**: `AIRecommendationOwnershipPolicy`, redacción PII en logs, tests de no-revelación.
* **DB**: verificación de columnas y check constraint en `ai_recommendations` (sin migración nueva).
* **FE**: `HITLActions`, `HITLEditModal`, `HITLConfirmDiscardDialog`, hooks `useApplyAIRecommendation`, `useDiscardAIRecommendation`, cliente `aiApi.applyRecommendation/discardRecommendation`, i18n 4 locales, telemetría frontend.
* **OBS**: logs estructurados, métricas Prometheus, dashboard "HITL Adoption", alerta sobre `hitl_apply_failure_total`.
* **QA**: unit tests por capa, integration tests (atomicidad, concurrencia, rollback), API tests (matriz de errores), E2E (2 flujos), accesibilidad, security.
* **DOC**: cleanup editorial en `/docs/8`, `/docs/9`, coordinación con `US-098` para snapshot OpenAPI.

### Required QA Tasks

* Suite de tests por strategy (8).
* Test de concurrencia (`Promise.all` de dos `apply`).
* Test de rollback ante side effect fallido.
* Test de body limit 256KB.
* Test de accesibilidad `HITLActions` (Playwright + axe).
* E2E plan completo y brief con handoff a US-023.

### Required Security Tasks

* `OwnershipPolicy` con matriz roles × `type`.
* No-revelación: respuestas indistinguibles `404` ajena/inexistente.
* PII redaction en logs (test verifica `[REDACTED]`).
* Admin excluido (`403`).

### Required Seed / Demo Tasks

* Verificación de demo: organizer fixture con `AIRecommendation pending` por cada `type` puede ser aplicado/descartado en la demo end-to-end.

### Required Documentation Tasks

* Cleanup editorial `/docs/9` (traza `FR-AI-019` + `FR-AI-018`).
* Aclaración `/docs/8` (UC-AI-002 como ancla HITL).
* Coordinación con `US-098` para snapshot OpenAPI.

### Dependencies Between Tasks

* Contratos `domain/` antes de strategies.
* Repository antes de use cases.
* Use cases antes de controller.
* Backend listo antes de E2E.
* Componente reusable `HITLActions` antes de la integración en cada vista IA (las integraciones pueden ser tareas separadas o coordinadas con cada US dueña).

### Consolidated tasks.md for Backlog Item

`PB-P1-016` agrupa únicamente `US-025`; el archivo `US-025-development-tasks.md` también funciona como `tasks.md` del backlog item. No es necesario consolidar.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass |
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

La especificación cubre los dos endpoints canónicos, el strategy registry con 8 implementaciones MVP, la transacción atómica con idempotencia por update condicional, la ownership policy con admin excluido y no-revelación, la redacción PII en logs, la observabilidad (logs + métricas + dashboard), la cobertura de tests (unit, integration, API, E2E, accesibilidad, security) y las dependencias hacia las US consumidoras. No se introducen migraciones nuevas. Las 3 alineaciones documentales son no bloqueantes y se cierran como cleanup editorial. Lista para `eventflow-user-story-to-development-tasks`.
