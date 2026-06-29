# Technical Specification — US-031: Confirmar tareas IA en bloque

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-031 |
| Source User Story | `management/user-stories/US-031-confirm-ai-tasks-bulk.md` |
| Decision Resolution Artifact | No aplica (no requerido) |
| Priority | P1 |
| Backlog ID | PB-P1-017 |
| Backlog Title | Confirmar hasta 50 tareas IA en una sola operación |
| Backlog Execution Order | 35 (P0: 18 + posición 17 en P1) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-031 |
| Epic | EPIC-TASK-001 |
| Backlog Item Dependencies | PB-P1-012 (US-018 checklist IA), PB-P1-016 (US-025 HITL transversal) |
| Feature | HITL bulk para tareas IA (AI-002 / checklist) |
| Module / Domain | Tasks / AI |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-26 |
| Last Updated | 2026-06-26 |

---

## 2. Backlog Execution Context

### Product Backlog Item

`PB-P1-017 — Confirmar hasta 50 tareas IA en una sola operación`. Habilita el cierre HITL en bloque del checklist IA generado por US-018/PB-P1-012 y materializado por la strategy `checklist` de US-025/PB-P1-016. Cubre la decisión PO formalizada: máx. 50 IDs por request, reporte por ID `{ taskId, accepted, error? }`, semántica de éxito parcial controlado (no all-or-nothing).

### Execution Order Rationale

US-031 se ejecuta en la posición 35 del orden global porque depende de:
1. La generación del checklist IA (`PB-P1-012` / US-018) que crea la `AIRecommendation type='checklist'`.
2. El HITL transversal (`PB-P1-016` / US-025) que materializa `EventTask` con `ai_generated=true`, `status='pending'`, `ai_recommendation_id` vía la strategy `checklist`.

US-031 cierra el ciclo activando esas tareas con un endpoint dedicado de bulk confirm; opera exclusivamente sobre `EventTask` (no toca `AIRecommendation`).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-031 | Único entregable funcional del backlog item | 1 |

---

## 3. Executive Technical Summary

US-031 implementa un endpoint REST dedicado `POST /api/v1/events/:eventId/tasks/confirm-bulk` que recibe una lista de hasta 50 `taskIds` y transiciona cada `EventTask` IA `pending → active`. La operación **no** es transaccional global: cada `taskId` se procesa de forma independiente dentro de su propia micro-transacción usando un `UPDATE` condicional `WHERE id=$id AND event_id=$eventId AND ai_generated=TRUE AND status='pending'`. El response es siempre `200 OK` (mientras pasen las validaciones globales) con un arreglo `{ results, summary }` que reporta el resultado por ítem. Las validaciones globales (`UUID`, límite 50 post-dedup, ownership del evento, `event.status` mutable, admin excluido) corren antes de cualquier `UPDATE` y devuelven un único error HTTP. La trazabilidad IA se preserva: cada `EventTask` confirmada mantiene su `ai_recommendation_id`, y la `AIRecommendation` padre permanece intacta (ya quedó `accepted` durante el `apply` de US-025). No se invoca al `LLMProvider` ni se consume cuota `SEC-POL-AI-007`. No se introducen migraciones nuevas; todas las columnas requeridas (`status`, `ai_generated`, `ai_recommendation_id`, `confirmed_by_user_id`, `confirmed_at`) ya están sembradas por la fundación AI-001 (US-017) y la gestión de tareas (`PB-P1-018`). Se agrega telemetría granular: 5 logs estructurados y 5 métricas Prometheus. El frontend agrega un componente reusable `BulkConfirmBar` sticky con multi-select y un `BulkResultBanner` con desglose por `error.code` traducido en 4 locales.

---

## 4. Scope Boundary

### In Scope

* Endpoint `POST /api/v1/events/:eventId/tasks/confirm-bulk`.
* `ConfirmAITasksBulkUseCase` con dedup, validaciones globales y agregación de resultados.
* `AITaskBulkRepository.confirmConditional(taskId, eventId)` con `UPDATE` condicional y diagnóstico de errores por ítem.
* Zod schemas para path (`confirmAITasksBulkParamsSchema`) y body (`confirmAITasksBulkBodySchema`).
* Ownership policy sobre `Event` + guardia anti-admin.
* Telemetría: 5 logs estructurados + 5 métricas.
* Frontend: `AITasksPendingSection`, `BulkConfirmBar` sticky, `BulkResultBanner`, hook `useConfirmAITasksBulk` con invalidación de TanStack queries.
* i18n para 4 locales (`es`, `en`, `pt`, `fr`).
* Tests funcionales, negativos, AI, autorización, performance y accesibilidad.

### Out of Scope

* Bulk discard / bulk reject de tareas IA (Future).
* Edición masiva del contenido de las tareas (usar `PATCH /events/:eventId/tasks/:taskId` cuando esté disponible).
* Bulk transversal sobre otros tipos de `AIRecommendation` (cada tipo decide su propio bulk si aplica).
* `If-Match` / `ETag` para concurrencia (el `UPDATE` condicional cubre el caso).
* `AdminAction` y endpoints admin (admin no participa en HITL).
* Reordenamiento masivo de tareas.
* Notificación push o email tras la confirmación (Future).
* Modificación de la `AIRecommendation` padre (su lifecycle se cerró en US-025).
* Invocación al `LLMProvider`.

### Explicit Non-Goals

* All-or-nothing: el endpoint **no** revierte el batch si un ítem falla. Esa decisión está formalizada en `PB-P1-017`.
* Crear nuevas `AIRecommendation`: este endpoint no genera artefactos IA.
* Filtrar existencia ajena con `403`/`404`: el endpoint usa `error.code` por ítem como mecanismo de no-revelación granular (`SEC-05`).

---

## 5. Architecture Alignment

### Backend Architecture

Modular Monolith bajo `src/modules/tasks/`. Se agrega submódulo `bulk-confirm/` con la arquitectura hexagonal estándar:

* `application/use-cases/confirm-ai-tasks-bulk.use-case.ts`
* `application/dtos/confirm-ai-tasks-bulk.dto.ts`
* `domain/errors/confirm-ai-tasks-bulk.errors.ts`
* `infrastructure/repositories/ai-task-bulk.repository.ts`
* `interface/http/controllers/confirm-ai-tasks-bulk.controller.ts`
* `interface/http/schemas/confirm-ai-tasks-bulk.schema.ts`

El use case orquesta dedup, validación global, llamada al repositorio por ítem y agregación. El repositorio expone un método único `confirmConditional` que ejecuta el `UPDATE` condicional y, si `affected = 0`, hace una segunda query de diagnóstico para mapear el `error.code` específico.

### Frontend Architecture

Next.js App Router. Vista `app/[locale]/(organizer)/events/[id]/tasks/page.tsx`. Se agregan:

* `features/tasks/components/AITasksPendingSection.tsx` (Server Component que SSR-renderiza la lista IA pending).
* `features/tasks/components/BulkConfirmBar.tsx` (Client Component sticky con conteo + acciones).
* `features/tasks/components/BulkResultBanner.tsx` (Client Component con desglose por `error.code`).
* `features/tasks/hooks/useConfirmAITasksBulk.ts` (TanStack mutation con invalidación de queries).
* `features/tasks/api/tasksApi.ts` se extiende con `confirmBulk(eventId, body)`.
* `features/tasks/state/bulkSelectionStore.ts` (Zustand opcional o `useState` local con `Set<string>`).

Selección con checkboxes accesibles, navegación por teclado, `aria-live="polite"` para el resumen post-confirmación.

### Database Architecture

Postgres + Prisma. Reusa el esquema sembrado por la fundación:

* Tabla `event_tasks` con columnas requeridas (`id`, `event_id`, `ai_generated`, `ai_recommendation_id`, `status`, `confirmed_by_user_id`, `confirmed_at`, `correlation_id` opcional, `created_at`, `updated_at`).
* Enum `event_task_status` con los valores `(pending, active, in_progress, done, skipped, deleted)` o equivalente; se verifica el valor canónico contra `/docs/18`.
* Índice existente `(event_id, ai_generated, status)` cubre el listado de "Sugeridas por IA — pendientes".

Migración: **ninguna**. Se incluye una task de verificación del schema actual.

### API Architecture

REST JSON `/api/v1`. Endpoint canónico:

```
POST /api/v1/events/:eventId/tasks/confirm-bulk
```

Body validado con Zod. Response `200 OK` con `{ results, summary }`. Códigos globales (`400`, `401`, `403`, `404`, `409`) cubren validaciones que aplican a todo el batch; códigos por ítem (`TASK_NOT_FOUND`, `TASK_NOT_IN_EVENT`, `TASK_NOT_AI`, `TASK_NOT_PENDING`) cubren validaciones por elemento. Patrón consistente con `P-API-08` HITL en `/docs/16`.

### AI / PromptOps Architecture

No aplica como invocación: este endpoint no llama al `LLMProvider`, no usa `MockAIProvider` y no persiste nuevas `AIRecommendation`. Sí mantiene **trazabilidad IA**: cada `EventTask` confirmada preserva `ai_recommendation_id` y `ai_generated=true`. La `AIRecommendation` padre permanece `accepted` (heredado del `apply` de US-025) y no se altera.

### Security Architecture

* Authentication: cookie HTTP-only de sesión (reusa `AuthGuard` de la fundación de auth).
* Authorization: `EventOwnershipPolicy.assert(actor, event)` antes de procesar; `actor.role !== 'admin'` (guardia explícita anti-admin, `FR-ADMIN-010`).
* No-revelación: evento ajeno → `404 NOT_FOUND` global; ítems ajenos/ inexistentes/ no IA → `error.code` neutral por ítem.
* Logs: redacción de PII en `task.title` y `task.description` cuando la política de auditoría lo requiera (hash determinístico).

### Testing Architecture

Vitest + Supertest para integración HTTP. Tests unitarios para el use case (mock del repositorio). Playwright para E2E del flujo UI → API → DB. Tests de accesibilidad (axe) para `BulkConfirmBar` y `BulkResultBanner`. Tests de carrera para concurrencia bulk.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Confirmación bulk completa | Validaciones globales OK + `confirmConditional` por ítem retorna `affected=1` para todos | Backend, DB |
| AC-02: Éxito parcial controlado | Use case agrega resultados por ítem; algunos `accepted=true`, otros con `error.code`; HTTP `200 OK` siempre | Backend |
| AC-03: Dedup silencioso | `new Set(taskIds)` antes de validar límite; `summary.deduped` reporta el delta | Backend |
| AC-04: Trazabilidad preservada por tarea | `UPDATE` solo modifica `status`, `confirmed_by_user_id`, `confirmed_at`; preserva `ai_recommendation_id` y `ai_generated` | DB |
| AC-05: Idempotencia por ítem | Cláusula `WHERE status='pending'` no matchea segunda vez; `error.code = TASK_NOT_PENDING` | DB, Backend |
| EC-01: Duplicados | Set dedup pre-Zod limit check | Backend |
| EC-02: Evento ajeno | Ownership policy → `404 NOT_FOUND` global | Backend, Security |
| EC-03: Tarea no IA | `affected=0` → diagnóstico revela `ai_generated=false` → `TASK_NOT_AI` | Backend, DB |
| EC-04: Tarea no pending | `affected=0` → diagnóstico revela `status≠'pending'` → `TASK_NOT_PENDING` | Backend, DB |
| EC-05: Tarea de otro evento | `affected=0` → diagnóstico revela `event_id≠eventId` → `TASK_NOT_IN_EVENT` | Backend, DB |
| EC-06: Tarea inexistente | Diagnóstico `SELECT id WHERE id=$id` retorna 0 → `TASK_NOT_FOUND` | Backend, DB |
| EC-07: >50 post-dedup | Zod `.max(50)` → `400 BULK_LIMIT_EXCEEDED` con `{ limit, received }` | Backend, API |
| EC-08: Body vacío | Zod `.min(1)` → `400 VALIDATION` | Backend, API |
| EC-09: Evento no mutable | Use case verifica `event.status` mutable → `409 EVENT_NOT_MUTABLE` | Backend |
| EC-10: Concurrencia | `UPDATE` condicional row-level lock; segundo bulk recibe `TASK_NOT_PENDING` por los IDs solapados | DB |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* `src/modules/tasks/bulk-confirm/` (nuevo submódulo).
* Dependencias internas: `src/modules/events/` (lectura de evento), `src/modules/auth/` (`AuthGuard`, `EventOwnershipPolicy`), `src/modules/shared/observability/` (logger, métricas), `src/modules/shared/prisma/` (`PrismaService`).

### Use Cases / Application Services

```ts
ConfirmAITasksBulkUseCase
  execute(input: {
    actor: AuthenticatedUser,
    eventId: string,
    taskIds: string[],
    correlationId: string,
  }): Promise<ConfirmAITasksBulkResponseDto>
```

Pasos del use case:

1. Dedup: `const uniqueIds = Array.from(new Set(input.taskIds))`.
2. Validación de límite y forma: ya cubierta por Zod en el controller; defensa adicional `if (uniqueIds.length === 0 || uniqueIds.length > 50)` → lanza `BulkValidationError`.
3. Cargar `event` por `eventId` → si no pertenece al actor (ownership policy) o no existe → `EventNotFoundError` → `404`.
4. Verificar `event.status` mutable → si no → `EventNotMutableError` → `409`.
5. Loop sobre `uniqueIds`: por cada ítem llamar `repository.confirmConditional({ taskId, eventId, actorId, correlationId, confirmedAt: now })`.
6. Agregar `results` y `summary`. Métricas se emiten al final.

### Controllers / Routes

```ts
// confirm-ai-tasks-bulk.controller.ts
router.post(
  '/events/:eventId/tasks/confirm-bulk',
  authGuard,
  adminExclusionGuard,            // 403 si actor.role === 'admin'
  zodValidate({ params: confirmAITasksBulkParamsSchema, body: confirmAITasksBulkBodySchema }),
  async (req, res) => {
    const result = await confirmAITasksBulkUseCase.execute({ ... });
    res.status(200).json(result);
  },
);
```

### DTOs / Schemas

```ts
// confirm-ai-tasks-bulk.schema.ts
export const confirmAITasksBulkParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const confirmAITasksBulkBodySchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(50),
});

// confirm-ai-tasks-bulk.dto.ts
export type ConfirmAITasksBulkResponseDto = {
  results: Array<{
    taskId: string;
    accepted: boolean;
    error?: { code: BulkItemErrorCode; message: string };
  }>;
  summary: {
    requested: number;
    deduped: number;
    accepted: number;
    rejected: number;
  };
};

export type BulkItemErrorCode =
  | 'TASK_NOT_FOUND'
  | 'TASK_NOT_IN_EVENT'
  | 'TASK_NOT_AI'
  | 'TASK_NOT_PENDING';
```

### Repository / Persistence

```ts
// ai-task-bulk.repository.ts
interface AITaskBulkRepository {
  confirmConditional(input: {
    taskId: string;
    eventId: string;
    actorId: string;
    correlationId: string;
    confirmedAt: Date;
  }): Promise<
    | { accepted: true }
    | { accepted: false; code: BulkItemErrorCode }
  >;
}
```

Implementación con `PrismaService.$executeRaw`:

```sql
UPDATE event_tasks
SET status = 'active',
    confirmed_by_user_id = $actorId,
    confirmed_at = $confirmedAt,
    updated_at = NOW()
WHERE id = $taskId
  AND event_id = $eventId
  AND ai_generated = TRUE
  AND status = 'pending';
```

* Si `affected = 1` → `{ accepted: true }`.
* Si `affected = 0` → diagnóstico:

```sql
SELECT id, event_id, ai_generated, status
FROM event_tasks
WHERE id = $taskId;
```

  - Si no encuentra fila → `TASK_NOT_FOUND`.
  - Si `event_id !== eventId` → `TASK_NOT_IN_EVENT`.
  - Si `ai_generated = FALSE` → `TASK_NOT_AI`.
  - Sino → `TASK_NOT_PENDING`.

### Validation Rules

| ID | Capa | Validación | Resultado |
|---|---|---|---|
| VR-01 | Zod | `eventId` UUID v4 | `400 VALIDATION` |
| VR-02 | Zod | `taskIds` array de UUID v4 | `400 VALIDATION` |
| VR-03 | Zod | `taskIds.length ∈ [1..50]` | `400 VALIDATION` (vacío) / `400 BULK_LIMIT_EXCEEDED` (>50) |
| VR-04 | Use Case | Ownership de `Event` | `404 NOT_FOUND` |
| VR-05 | Use Case | `event.status` mutable | `409 EVENT_NOT_MUTABLE` |
| VR-06..09 | Repository (diagnóstico) | Estado por ítem | `error.code` específico |
| VR-10 | Guard (`adminExclusionGuard`) | `actor.role !== 'admin'` | `403 FORBIDDEN` |

### Error Handling

Errores globales se mapean en el error middleware central a códigos HTTP:

| Error de dominio | HTTP | `code` |
|---|---|---|
| `BulkValidationError` | 400 | `VALIDATION` |
| `BulkLimitExceededError` | 400 | `BULK_LIMIT_EXCEEDED` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `AdminNotAllowedError` | 403 | `FORBIDDEN` |
| `EventNotFoundError` | 404 | `NOT_FOUND` |
| `EventNotMutableError` | 409 | `EVENT_NOT_MUTABLE` |

Los errores por ítem **nunca** se lanzan: se incrustan en `results[i].error`.

### Transactions

* Per-ítem: un statement atómico (`UPDATE` condicional) por ítem. No se envuelve en `$transaction` el batch completo (eso forzaría all-or-nothing).
* Opcional: cada ítem puede correr dentro de `prismaService.$transaction(tx => ...)` cuando el diagnóstico requiera ejecutar `UPDATE` + `SELECT` en la misma conexión; en la práctica, ambos statements en secuencia con autocommit son suficientes porque el `UPDATE` ya tomó row-level lock.

### Observability

5 logs estructurados con nivel `info` (y `warn` para conflict):

* `tasks.bulk_confirm.requested` — al entrar al use case. Campos: `correlation_id`, `event_id`, `actor_id`, `requested_count`.
* `tasks.bulk_confirm.rejected` — global pre-batch (admin, ownership, evento no mutable). Campos: `correlation_id`, `event_id`, `actor_id`, `reason`.
* `tasks.bulk_confirm.succeeded` — todos los ítems aceptados. Campos: `correlation_id`, `event_id`, `actor_id`, `accepted_count`, `latency_ms`.
* `tasks.bulk_confirm.partial_failed` — al menos un ítem rechazado. Campos: `accepted_count`, `rejected_count`, `error_codes_summary`, `latency_ms`.
* `tasks.bulk_confirm.conflict` — `409 EVENT_NOT_MUTABLE`. Campos: `event_id`, `event_status`.

5 métricas Prometheus:

* `tasks_bulk_confirm_total` (counter, labels: `outcome=success|partial|rejected`).
* `tasks_bulk_confirm_accepted_total` (counter).
* `tasks_bulk_confirm_rejected_total` (counter, labels: `error_code`).
* `tasks_bulk_confirm_batch_size` (histogram, buckets `[1,5,10,20,30,40,50]`).
* `tasks_bulk_confirm_latency_ms` (histogram, buckets `[50,100,250,500,1000,1500,3000]`).

---

## 8. Frontend Technical Design

### Routes / Pages

* `app/[locale]/(organizer)/events/[id]/tasks/page.tsx` — agrega la sección `AITasksPendingSection` cuando existen `EventTask` con `ai_generated=true` y `status='pending'`.

### Components

| Componente | Tipo | Responsabilidad |
|---|---|---|
| `AITasksPendingSection` | Server Component | Lista las tareas IA pendientes con checkboxes accesibles. |
| `BulkConfirmBar` | Client Component sticky | Muestra conteo de selección, botón "Confirmar seleccionadas (N)", botón "Limpiar selección", botón "Seleccionar todas las visibles". Disable cuando N=0. Loading spinner durante el submit. |
| `BulkResultBanner` | Client Component | Banner inline con resumen `{ accepted, rejected }` y desglose por `error.code` traducido. |

### Forms

* No usa React Hook Form (no es un formulario clásico). Selección controlada por `Set<string>` en `useState` local.
* Validación cliente: `confirmAITasksBulkBodySchema` (mismo Zod del backend) antes de enviar.

### State Management

* TanStack mutation `useConfirmAITasksBulk(eventId)`:
  * `onMutate`: snapshot del estado de la lista para rollback optimista si se desea.
  * `onSuccess`: parsea `results` y `summary`, dispara toast resumen, muestra `BulkResultBanner` con desglose si hay rechazados, invalida queries `['events', eventId, 'tasks']` y `['events', eventId, 'tasks', 'ai-pending']`.
  * `onError`: toast con `error.code` traducido.

### Data Fetching

* Query `['events', eventId, 'tasks', 'ai-pending']` para la lista filtrada.
* Refetch automático tras `invalidateQueries`.

### Loading / Empty / Error / Success States

| Estado | Comportamiento UI |
|---|---|
| Loading (lista) | Skeleton de 5 filas. |
| Empty | "No hay tareas IA por confirmar. Genera un checklist con IA o crea tareas manuales." |
| Loading (submit) | `BulkConfirmBar` con spinner; botón disabled. |
| Error (global) | Toast con `error.code` traducido. |
| Partial Success | `BulkResultBanner` inline con desglose; toast "N tareas confirmadas, M rechazadas". |
| Success | Toast "N tareas confirmadas"; lista IA-pending se actualiza removiendo confirmadas. |

### Accessibility

* Checkboxes con `aria-label="Seleccionar tarea: <title>"`.
* `BulkConfirmBar` con `role="region"` y `aria-label="Acciones de selección"`.
* `BulkResultBanner` con `aria-live="polite"` y `role="status"`.
* Navegación por teclado: foco visible, `Tab` lineal, `Space` para marcar checkbox, `Enter` para confirmar.
* Contraste WCAG AA en la barra sticky (fondo distintivo).

### i18n

* `next-intl` con namespaces `tasks.bulk-confirm` y `errors.bulk-confirm`.
* Traducciones para 4 locales: `es`, `en`, `pt`, `fr`.
* Plurales para "N tareas confirmadas".

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/events/:eventId/tasks/confirm-bulk` | Confirmar hasta 50 tareas IA en bloque | Sí (cookie de sesión) | `{ taskIds: string[] }` (1..50 UUID v4) | `200 OK` con `{ results, summary }` | `400 VALIDATION`, `400 BULK_LIMIT_EXCEEDED`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 EVENT_NOT_MUTABLE` (globales); `TASK_NOT_FOUND`, `TASK_NOT_IN_EVENT`, `TASK_NOT_AI`, `TASK_NOT_PENDING` (por ítem) |

Ejemplo de response:

```jsonc
{
  "results": [
    { "taskId": "11111111-1111-1111-1111-111111111111", "accepted": true },
    { "taskId": "22222222-2222-2222-2222-222222222222", "accepted": false,
      "error": { "code": "TASK_NOT_PENDING", "message": "La tarea ya no está pendiente." } }
  ],
  "summary": { "requested": 3, "deduped": 1, "accepted": 1, "rejected": 1 }
}
```

---

## 10. Database / Prisma Design

### Models Impacted

* `event_tasks` (read + per-item conditional update).
* `events` (read para ownership + status).
* `ai_recommendations` (read solo para trazabilidad opcional; no se modifica).

### Fields / Columns

`event_tasks` columnas usadas:

| Columna | Uso |
|---|---|
| `id` | PK; selector del `UPDATE`. |
| `event_id` | Validación de pertenencia al evento. |
| `ai_generated` | Validación IA. |
| `ai_recommendation_id` | Trazabilidad preservada (no se modifica). |
| `status` | Transición `pending → active`. |
| `confirmed_by_user_id` | Auditoría (set). |
| `confirmed_at` | Auditoría (set). |
| `updated_at` | Touch automático por trigger o Prisma. |

### Relations

* `event_tasks.event_id → events.id` (FK existente).
* `event_tasks.ai_recommendation_id → ai_recommendations.id` (FK existente, nullable).
* `event_tasks.confirmed_by_user_id → users.id` (FK existente).

### Indexes

* `event_tasks (event_id, ai_generated, status)` — ya existe; cubre el listado IA-pending.
* `event_tasks (id)` (PK).

### Constraints

* Enum `event_task_status` con `pending`, `active`, etc. (sembrado por la fundación).
* CHECK constraint opcional `ai_generated=TRUE` cuando `ai_recommendation_id IS NOT NULL` (verificar; no se introduce nueva).

### Migrations Impact

**Ninguna**. Se incluye una task de verificación del esquema actual contra `/docs/18`. Si la verificación detecta divergencia (columna faltante), se reporta como bloqueante y se difiere al sprint correspondiente.

### Seed Impact

No requiere semillas nuevas. La demo usa los eventos y `EventTask` IA sembrados por US-017/US-018.

---

## 11. AI / PromptOps Design

### AI Feature

HITL bulk para AI-002 (checklist). Cierre del ciclo HITL en bloque.

### Provider

No aplica. El endpoint **no** invoca al `LLMProvider`.

### Prompt Version

No aplica.

### Input Schema

No aplica (sin LLM).

### Output Schema

No aplica (sin LLM).

### Human-in-the-loop

Esta historia ES el HITL en bloque para tareas IA. La `AIRecommendation` padre ya quedó `accepted` durante el `apply` de US-025; aquí se materializa la activación de las `EventTask` IA en bulk.

### Fallback

No aplica.

### Persistence

Preserva trazabilidad IA en cada `EventTask` confirmada: `ai_generated=true`, `ai_recommendation_id` intacto. La `AIRecommendation` padre no se modifica.

### Safety Rules

* No autonomía: cada confirmación requiere acción humana explícita (selección + click).
* Idempotencia natural por `UPDATE` condicional.

---

## 12. Security & Authorization Design

### Authentication

* Cookie HTTP-only de sesión via `AuthGuard`. Anónimo → `401 UNAUTHORIZED`.

### Authorization

* `EventOwnershipPolicy.assert(actor, event)` verifica `actor.id === event.owner_user_id`. Falla → `404 NOT_FOUND` (no-revelación).
* `adminExclusionGuard` antes del policy → si `actor.role === 'admin'` → `403 FORBIDDEN` (`FR-ADMIN-010`).

### Ownership Rules

* Evento ajeno → `404 NOT_FOUND` global.
* Ítem ajeno (otro evento del mismo actor) → `error.code = TASK_NOT_IN_EVENT` (por ítem).
* Ítem ajeno (otro evento de otro actor) → `error.code = TASK_NOT_FOUND` (no se filtra existencia ajena).

### Role Rules

| Rol | Resultado |
|---|---|
| Organizer (dueño) | `200 OK` |
| Organizer (no dueño) | `404 NOT_FOUND` |
| Vendor | `404 NOT_FOUND` |
| Admin | `403 FORBIDDEN` |
| Anónimo | `401 UNAUTHORIZED` |

### Negative Authorization Scenarios

Cubiertos en VR-04, VR-10, SEC-01..09. Ver tabla anterior.

### Audit Requirements

Cada confirmación exitosa persiste `confirmed_by_user_id`, `confirmed_at`, `correlation_id` (cuando la columna exista). No requiere `AdminAction` (no es flujo admin).

### Sensitive Data Handling

* Logs estructurados sin PII; cuando se necesite trazar `task.title`, usar hash determinístico SHA-256 (reusar utilitario de `OrganizerPiiDetector` de US-021 si aplica).
* `OPENAI_API_KEY` y otros secretos no se tocan en este flujo.

---

## 13. Testing Strategy

### Unit Tests

* `ConfirmAITasksBulkUseCase`:
  * Dedup correcto.
  * Validación de límite 50.
  * Validación de body vacío.
  * Manejo de `EventNotFoundError`, `EventNotMutableError`.
  * Agregación correcta de `results` y `summary`.
* `AdminExclusionGuard`: admin → 403; organizer/vendor → pasa.

### Integration Tests

* `AITaskBulkRepository.confirmConditional`:
  * `pending` IA del actor → `{ accepted: true }`.
  * Tarea de otro evento → `TASK_NOT_IN_EVENT`.
  * Tarea no IA → `TASK_NOT_AI`.
  * Tarea ya `active` → `TASK_NOT_PENDING`.
  * Tarea inexistente → `TASK_NOT_FOUND`.

### API Tests (Supertest)

* TS-01: 5 IA pending → 200, todas aceptadas, `summary.accepted=5`.
* TS-02: 3 válidas + 2 inválidas → 200, mix; `summary.accepted=3`, `rejected=2`.
* TS-03: 60 IDs → `400 BULK_LIMIT_EXCEEDED`.
* TS-04: 10 IDs con duplicados → 200, `summary.deduped=5`.
* TS-05: Segundo request idéntico → 200, todos `TASK_NOT_PENDING`.
* NT-01..NT-12: códigos de error globales y por ítem según matriz.
* AUTH-TS-01..05: por rol y ownership.

### E2E Tests (Playwright)

* TS-06: Login → navegar a tasks → multi-select → confirmar → ver tareas en sección "Activas".
* Partial success: ver `BulkResultBanner` con desglose por `error.code`.

### Security Tests

* Admin → 403.
* Vendor → 404.
* Anónimo → 401.
* No-revelación: ítems ajenos no exponen IDs ni nombres.

### Accessibility Tests

* axe sobre `AITasksPendingSection`, `BulkConfirmBar`, `BulkResultBanner`.
* Navegación por teclado completa.
* `aria-live` verificado tras submit.

### AI Tests

* AI-TS-01: Tareas confirmadas mantienen `ai_recommendation_id` y `ai_generated=true`.
* AI-TS-02: Mix IA + manuales → solo IA se procesa; manuales → `TASK_NOT_AI`.
* AI-TS-03: Tareas de 2 `AIRecommendation` distintas en el mismo bulk → ambas aceptadas, cada una preserva su FK.

### Performance Tests

* PERF-01: 50 IDs válidos → P95 ≤ 1.5 s (`NFR-PERF-001`).
* PERF-02: 50 IDs con 30 inválidos → P95 ≤ 1.5 s.

### Seed / Demo Tests

* Verificación de que el seed crea al menos 10 `EventTask` IA `pending` por evento demo del organizador.

### CI Checks

* Lint, type-check, unit tests, integration tests, accesibilidad axe-core.
* Smoke test API contra base efímera.

---

## 14. Observability & Audit

### Logs

5 logs estructurados (ver §7 Observability).

### Correlation ID

Propagado desde el header `X-Correlation-Id` o generado por el middleware. Incluido en todos los logs y persistido en `event_tasks.correlation_id` cuando la columna exista (verificar contra `/docs/18`; si no existe, se omite y solo se registra en logs).

### AdminAction

No aplica (admin no participa).

### Error Tracking

* Errores globales se reportan a Sentry/equivalente (reusar configuración existente).
* Errores por ítem **no** se reportan a error tracking (son flujo de negocio esperado).

### Metrics

5 métricas Prometheus (ver §7). Dashboards reutilizan plantilla existente para `tasks_*`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Seed existente de US-018 debe garantizar al menos un evento demo con un checklist IA generado y aplicado vía US-025 (`AIRecommendation accepted` + `EventTask` IA `pending`).
* Si el seed actual no cubre el caso, se agrega una task de seed que extiende el escenario demo.

### Demo Scenario Supported

1. Demo: organizador navega a "Mis eventos" → entra al evento demo.
2. Sección "Sugeridas por IA — pendientes" muestra 10 tareas IA `pending`.
3. Organizador selecciona 5, hace click en "Confirmar seleccionadas (5)".
4. Tareas pasan a "Activas"; toast resumen muestra "5 tareas confirmadas".
5. Demo opcional: organizador intenta confirmar 60 → ve error `BULK_LIMIT_EXCEEDED`.

### Reset / Isolation Notes

* El seed de tests es idempotente: cada test recrea su evento + tareas.
* La fixture E2E usa eventos aislados por test run.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `/docs/9-FRD.md` | Referencia original era `FR-TASK-006` | Canónico `FR-TASK-005` | Cleanup editorial en `/docs/9` | No |
| `/docs/8-UCS.md` | Listaba `UC-TASK-005` | Canónico `UC-TASK-001` + `UC-AI-002` | Cleanup editorial en `/docs/8` | No |
| `/docs/4-BR.md` | Listaba `BR-AI-013` (cache) y `BR-TASK-005` aislado | Canónico expande a `BR-TASK-003 + BR-TASK-005 + BR-AI-001/002/004/008/010` | Cleanup editorial en `/docs/4` | No |
| `/docs/10-NFR.md` | Referencia original `NFR-PERF-API-001` | Canónico `NFR-PERF-001` | Cleanup editorial en `/docs/10` | No |
| `/docs/16-API-Design-Specification.md` | Snapshot OpenAPI pendiente del endpoint nuevo | Endpoint canónico documentado | Regenerar snapshot vía US-098 | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Diagnóstico por ítem genera N+1 queries adicionales cuando todos fallan | Latencia degradada en casos extremos | El diagnóstico solo corre cuando `affected=0`; en happy path 0 queries extra. Para casos con muchos errores, considerar un `SELECT id, event_id, ai_generated, status WHERE id IN (...)` consolidado en una iteración futura si las métricas lo justifican. |
| Concurrencia de dos bulks solapados del mismo organizador | Posible doble actualización | `UPDATE ... WHERE status='pending'` con row-level lock garantiza idempotencia; el segundo bulk recibe `TASK_NOT_PENDING`. Cubierto por test de carrera. |
| Validación del enum `event_task_status` divergente vs `/docs/18` | Fallo silencioso al transicionar | Task de verificación del schema antes de implementar; bloquea si difiere. |
| Acumulación de tareas IA por demos extensas | Lista IA-pending crece y degrada UX | Paginación de la lista IA-pending (futuro); MVP usa lista plana con límite visual razonable. |
| Logs sin `correlation_id` si la columna no existe en `event_tasks` | Auditoría parcial | Se acepta en MVP: el `correlation_id` siempre va en logs; la columna en DB es opcional. Verificar contra `/docs/18`. |

---

## 18. Implementation Guidance for Coding Agents

**Archivos / carpetas probablemente impactados:**

* Backend (nuevos):
  * `src/modules/tasks/bulk-confirm/application/use-cases/confirm-ai-tasks-bulk.use-case.ts`
  * `src/modules/tasks/bulk-confirm/application/dtos/confirm-ai-tasks-bulk.dto.ts`
  * `src/modules/tasks/bulk-confirm/domain/errors/confirm-ai-tasks-bulk.errors.ts`
  * `src/modules/tasks/bulk-confirm/infrastructure/repositories/ai-task-bulk.repository.ts`
  * `src/modules/tasks/bulk-confirm/interface/http/controllers/confirm-ai-tasks-bulk.controller.ts`
  * `src/modules/tasks/bulk-confirm/interface/http/schemas/confirm-ai-tasks-bulk.schema.ts`
  * `src/modules/tasks/bulk-confirm/__tests__/...`
* Backend (modificados):
  * `src/modules/tasks/routes.ts` (registrar el controller).
  * `src/modules/auth/guards/admin-exclusion.guard.ts` (reusar si existe; sino crear).
* Frontend (nuevos):
  * `apps/web/src/features/tasks/components/AITasksPendingSection.tsx`
  * `apps/web/src/features/tasks/components/BulkConfirmBar.tsx`
  * `apps/web/src/features/tasks/components/BulkResultBanner.tsx`
  * `apps/web/src/features/tasks/hooks/useConfirmAITasksBulk.ts`
  * `apps/web/src/features/tasks/api/tasksApi.ts` (extensión).
  * `apps/web/src/features/tasks/state/bulkSelectionStore.ts`
  * Mensajes i18n bajo `apps/web/messages/{es,en,pt,fr}.json` namespace `tasks.bulk-confirm` y `errors.bulk-confirm`.
* Frontend (modificados):
  * `apps/web/src/app/[locale]/(organizer)/events/[id]/tasks/page.tsx`.

**Orden recomendado de implementación:**

1. Verificar schema (`event_tasks` columnas + enum + índice).
2. Zod schemas (path + body) + DTOs.
3. Errores de dominio.
4. Repository (`confirmConditional` + diagnóstico).
5. Use case (`ConfirmAITasksBulkUseCase`).
6. Guards (`adminExclusionGuard`) + reuso de `EventOwnershipPolicy`.
7. Controller + ruta.
8. Logger + métricas + dashboards.
9. Tests backend (unit, integration, API).
10. API client TypeScript en frontend.
11. Hook TanStack mutation.
12. Componentes `AITasksPendingSection`, `BulkConfirmBar`, `BulkResultBanner`.
13. i18n.
14. Tests frontend (component + a11y).
15. E2E Playwright.

**Decisiones que no se deben reabrir:**

* Semántica de éxito parcial controlado con `{ results, summary }` (Decisión PO PB-P1-017).
* Límite 50 IDs por request (Decisión PO PB-P1-017).
* US-031 **no** modifica `AIRecommendation` (lifecycle cerrado en US-025).
* Admin excluido del HITL (`FR-ADMIN-010`).
* Evento ajeno → `404` global; ítem ajeno → `error.code` por ítem (no-revelación).
* Endpoint canónico `POST /api/v1/events/:eventId/tasks/confirm-bulk` (no PATCH, no namespace bajo `/ai-recommendations`).
* `UPDATE` condicional con `WHERE status='pending'` para idempotencia natural (no `If-Match`/`ETag`).

**Lo que no se debe implementar:**

* Bulk discard / bulk reject (Future).
* Edición masiva del contenido de las tareas.
* `AdminAction` o flujos admin para HITL.
* Notificaciones push o email.
* Invocación al `LLMProvider`.
* Persistencia o modificación de `AIRecommendation` en este flujo.

**Asunciones a preservar:**

* La generación del checklist IA y el `apply` HITL ya ocurrieron (US-018 + US-025).
* Las columnas `confirmed_by_user_id`, `confirmed_at` ya existen en `event_tasks` (verificar contra `/docs/18`).
* El enum `event_task_status` incluye `pending` y `active` con esos nombres exactos (verificar contra `/docs/18`).
* `correlation_id` se propaga vía middleware central.

---

## 19. Task Generation Notes

**Sugerencia de grupos de tareas:**

* **DB**: 1 tarea de verificación del schema (`event_tasks` columnas + enum + índice).
* **BE**: 6 tareas (Zod schemas + DTOs + errores; repository + diagnóstico; use case; admin exclusion guard; controller + ruta; mapper de respuesta y agregación de `summary`).
* **API**: 1 tarea de smoke test del contrato.
* **SEC**: 2 tareas (ownership policy reuso/extensión; admin exclusion guard + tests).
* **FE**: 4 tareas (`AITasksPendingSection` + selección; `BulkConfirmBar` sticky + a11y; `BulkResultBanner` + traducciones; hook + cliente API + invalidación).
* **OBS**: 1 tarea (5 logs + 5 métricas + dashboard delta).
* **QA**: 6 tareas (unit use case, integration repository, API tests Supertest, accesibilidad axe, E2E Playwright, performance smoke).
* **SEED**: 1 tarea (verificación del seed demo + extensión si falta).
* **DOC**: 2 tareas (OpenAPI snapshot vía US-098; cleanup de las 4 alineaciones documentales).

**Total esperado:** ~24 tareas.

**Required QA tasks:** unit, integration, API (Supertest), E2E (Playwright), accesibilidad (axe-core), performance smoke.

**Required security tasks:** admin exclusion guard, no-revelación verification, ownership reuso, audit columns persistence test.

**Required seed/demo tasks:** verificación del estado demo (organizador + evento + 10 tareas IA pending).

**Required documentation tasks:** 1 task para snapshot OpenAPI (coordinar con US-098); 1 task para cleanup de las 4 alineaciones documentales (`/docs/9`, `/docs/8`, `/docs/4`, `/docs/10`).

**Dependencias entre tareas:**

* DB-001 → BE-001..BE-006.
* BE-001 (schemas) → BE-002..BE-005.
* BE-002 (repository) → BE-003 (use case) → BE-005 (controller).
* SEC-002 (admin guard) → BE-005 (controller).
* BE-005 (controller) → QA-003 (API tests) → QA-005 (E2E).
* BE-005 + OBS-001 → QA-006 (performance).
* FE-001..FE-004 dependen de BE-005 + un mock del contrato.

**Consolidated `tasks.md` for parent backlog item:** No requerido (PB-P1-017 contiene solo a US-031).

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

`Ready for Task Breakdown`

US-031 cuenta con decisiones PO formalizadas (PB-P1-017), AC/EC/VR/SEC granulares, contratos API canónicos en `/docs/16`, esquema DB ya sembrado por la fundación (`/docs/18`), y reuso explícito de policies, guards y telemetría existentes. Los 5 Documentation Alignment son no bloqueantes y se cierran como cleanup editorial. Sin migraciones nuevas. Sin invocación a LLM. La especificación es suficiente para que el skill `eventflow-user-story-to-development-tasks` genere las tareas de implementación, QA, seguridad, observabilidad y documentación.
