# User Story Refinement Review — US-039

## Source User Story File
management/user-stories/US-039-committed-updated-on-booking-confirm.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-039-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)

Tras el `eventflow-po-ba-decision-resolver` y la actualización en sitio, esta segunda pasada confirma:

| Verificación                                                                                                                                                       | Resultado |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Q1 idempotencia ⇒ `committed_synced_at` + `committed_synced_amount` en BookingIntent (migración menor).                                                              | OK        |
| Q2 auto-create ⇒ nuevo BudgetItem `ai_generated=false`; sin reusar soft-deleted; log warning.                                                                       | OK        |
| Q3 monto 0 ⇒ skip silencioso + log info.                                                                                                                            | OK        |
| Q4 event.status ⇒ NO verificar (responsabilidad upstream).                                                                                                          | OK        |
| Traceability corregida: FR-BUDGET-006 + FR-BOOKING-005/008/009; UC-BOOKING-002/003; BR-BUDGET-005 + BR-BOOKING-007/008/009; NFR-PERF-001.                            | OK        |
| AC reescritos (AC-01..08), EC-01..08, VR-01..05, SEC-01..05.                                                                                                       | OK        |
| Backlog Item PB-P1-023 declarado.                                                                                                                                  | OK        |
| Documentation Alignment Required (4 ítems no bloqueantes): docs/6 §BookingIntent campos nuevos, docs/16 §M07 catálogo de logs, docs/4 §BR-BOOKING-008 nota interpretativa, housekeeping NFR-PERF-001. | OK |
| Sin scope creep; Out of Scope explícito (penalización, FX, multi-categoría, endpoint público, event.status check).                                                  | OK        |

**Estado recomendado final**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-039                                                                                                                                    |
| File Path                                  | `management/user-stories/US-039-committed-updated-on-booking-confirm.md`                                                                  |
| Backlog Item                               | PB-P1-023 — Sync atómico del committed por BookingIntent                                                                                  |
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
| Refinement review path                     | `management/user-stories/refinement-reviews/US-039-refinement-review.md`                                                                  |

---

## 2. Diagnóstico PO/BA

US-039 es el **handler system-driven** que materializa la regla canónica de sincronización `BR-BUDGET-005`/`BR-BOOKING-008`/`FR-BUDGET-006`/`FR-BOOKING-008`: al confirmarse un `BookingIntent` se incrementa `BudgetItem.committed` por el monto del intent; al cancelarse, se revierte. La invocación ocurre desde `ConfirmBookingIntentUseCase` (`UC-BOOKING-002`) y `CancelBookingIntentUseCase` (`UC-BOOKING-003`), entregados en un US futuro del módulo Booking (`PB-P1-024` o equivalente). Esta historia es Must Have del MVP por su valor académico ("Demuestra integración de bounded contexts") y por ser dependencia de US-038 (warning de overcommit) que ya está aprobada.

La historia entrega el contrato funcional correcto (incremento + reversión, atomicidad mencionada, idempotencia sugerida en Notes), pero llega con varias decisiones implícitas no formalizadas:

1. **Mecanismo de idempotencia**: Notes menciona `intent_id` pero no especifica si se persiste en `BookingIntent` (`committed_synced_at` o flag) o se usa una tabla de idempotency keys.
2. **EC-01 auto-create `BudgetItem`**: el draft acepta auto-creación con `planned=0`. ¿Aplica también soft delete check? Si la categoría tenía un BudgetItem soft-deleted, ¿se reusa o se crea uno nuevo?
3. **VR-01 monto = 0**: skip silencioso vs validar upstream.
4. **Estado del evento**: US-036 D3 bloquea mutaciones de CRUD en `cancelled`/`completed`. ¿El handler system-driven respeta el mismo bloqueo o lo bypasea (porque es invocado por otro use case del módulo Booking)?
5. **BookingIntent reactivación**: per `FR-BOOKING-002` el ciclo es `pending → confirmed_intent | cancelled` sin retorno. Un nuevo BookingIntent en la misma `(eventId, categoryId)` tiene un nuevo `id`; idempotencia debe ser per `bookingIntentId`.

Hay también **traceability incorrecta**:
- `FR-BUDGET-007` (sin FX) → canónico **`FR-BUDGET-006`** (committed update).
- `FR-BOOKING-003` (proveedor confirma) → canónico **`FR-BOOKING-008`** (sync committed bidireccional).
- `UC-BUDGET-004` (moneda configurable) → en realidad **`UC-BOOKING-002` + `UC-BOOKING-003`** (no existe UC-BUDGET-004 con esa semántica).
- `BR-BOOKING-005` (sin contrato firmado) → canónico **`BR-BOOKING-008`** (sync presupuesto).
- `BR-BUDGET-005` correcto.

Y minor issues:
- `NFR-PERF-API-001` no existe; canónico `NFR-PERF-001` (aunque el handler es interno, la confirm/cancel del endpoint que lo invoca debe cumplir).
- `Backlog Item: PB-P1-023` no declarado.
- AC-02 reversión: cobertura insuficiente (no documenta auditoría `cancelled_at/cancelled_by/cancellation_reason` per FR-BOOKING-005).
- Currency consistency: el `BookingIntent.total` debe estar en la moneda del evento (`BR-BUDGET-007` sin FX). Defensa profunda no documentada.
- Re-entrada por reintento (retry post-fallo): debe ser idempotente; mecanismo Q1.
- A11Y/i18n: `aria-live polite` para refresh del frontend está OK, pero "Moneda del evento" y "4 locales" sin enumerar.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                              | Impacto                                                                                                                                                                                                                                                       | Recomendación                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Traceability incorrecta: `FR-BUDGET-007` (sin FX), `FR-BOOKING-003` (proveedor confirma), `UC-BUDGET-004` (no existe), `BR-BOOKING-005` (sin contrato).                                                                                                                                                                                                                                                                | Trazabilidad rota; PB-P1-023 ↔ FRD ↔ BRD ↔ UC inconsistente.                                                                                                                                                                                                  | Corrección objetiva: `FR-BUDGET-006`, `FR-BOOKING-008`, `UC-BOOKING-002` + `UC-BOOKING-003`, `BR-BUDGET-005`, `BR-BOOKING-008`. Añadir `FR-BOOKING-009` (max 1 confirmado por categoría) y `AC-BUDGET-002` / `AC-BOOKING-001` del FRD como criterios de aceptación derivados.                                                                                                                                                                          |
| Alta      | Mecanismo de idempotencia no formalizado. Notes menciona `intent_id` sin detalle.                                                                                                                                                                                                                                                                                                                                       | Sin idempotencia, reintentos (network retry, cron retry, etc.) podrían double-counting.                                                                                                                                                                       | Resolver Q1 (PO+Tech): recomendado persistir `committed_synced_at` y `committed_synced_amount` en `BookingIntent` (set en sync exitoso; verificado al entrar al handler).                                                                                                                                                                                                                                                                              |
| Alta      | EC-01 auto-create `BudgetItem` sin política definida sobre soft-deleted previos ni `ai_generated`/`ai_recommendation_id`.                                                                                                                                                                                                                                                                                                | Riesgo de crear duplicados o resucitar items soft-deleted.                                                                                                                                                                                                    | Resolver Q2 (PO): recomendado auto-create nuevo BudgetItem con `ai_generated=false`, `planned=0`, `committed=N`, `paid=0`, sin reusar items soft-deleted. Loguear advertencia para visibilidad ("auto-created by booking").                                                                                                                                                                                                                              |
| Alta      | Estado del evento (`cancelled`/`completed`) no documentado. US-036 D3 bloquea mutaciones de CRUD.                                                                                                                                                                                                                                                                                                                        | Inconsistencia transversal si el handler bypasea el bloqueo.                                                                                                                                                                                                  | Resolver Q4 (PO): recomendado **el handler NO verifica `event.status`** porque el upstream (`ConfirmBookingIntentUseCase`) ya bloquea confirm en eventos no editables. US-039 documenta como precondición.                                                                                                                                                                                                                                          |
| Media     | VR-01 "Monto > 0 → Skip" ambiguo: silencioso vs error.                                                                                                                                                                                                                                                                                                                                                                  | Caso de borde mal cubierto.                                                                                                                                                                                                                                   | Resolver Q3 (PO): recomendado skip silencioso + log info. La validación de `total > 0` debería ocurrir en `ConfirmBookingIntentUseCase`, no aquí (defensa profunda).                                                                                                                                                                                                                                                                                |
| Media     | Currency consistency no documentada. El `BookingIntent.total` debe estar en la moneda del evento (`BR-BUDGET-007`); si difiere, integridad rota.                                                                                                                                                                                                                                                                          | Posible corrupción silenciosa de committed.                                                                                                                                                                                                                   | Añadir AC defensa profunda: handler verifica `bookingIntent.currency_code === event.currency_code`. Si difiere ⇒ falla atómica y log error.                                                                                                                                                                                                                                                                                                          |
| Media     | NFR incorrecta: `NFR-PERF-API-001` no existe. El handler es interno pero la operación se mide a través de la latencia del endpoint que lo invoca (confirm/cancel BookingIntent).                                                                                                                                                                                                                                          | Métrica inconsistente.                                                                                                                                                                                                                                       | Reemplazar por `NFR-PERF-001`. Documentation Alignment.                                                                                                                                                                                                                                                                                                                                                                                          |
| Media     | Faltan AC para: defensa profunda currency, reversión con auditoría (`FR-BOOKING-005`: `cancelled_at`, `cancelled_by`, `cancellation_reason`), idempotencia (retry), cache TanStack invalidation hacia US-035/US-038.                                                                                                                                                                                                       | Cobertura QA insuficiente.                                                                                                                                                                                                                                    | Añadir AC explícitos.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Media     | Falta política para `BookingIntent` previamente cancelado que se re-confirma. Per `FR-BOOKING-002` el ciclo no permite retorno desde `cancelled`; nuevos intents en la misma categoría tienen nuevo `id`. La US debe explicitar que idempotencia es per `bookingIntentId`.                                                                                                                                                  | Riesgo de confusión.                                                                                                                                                                                                                                          | Documentar invariante.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Baja      | "Considerar idempotencia con intent_id" en Notes — debe formalizarse en AC tras Q1.                                                                                                                                                                                                                                                                                                                                    | Decisión técnica sin formalización.                                                                                                                                                                                                                          | Tras Q1, mover a Technical Notes + AC.                                                                                                                                                                                                                                                                                                                                                                                                            |
| Baja      | Backlog Item `PB-P1-023` no declarado.                                                                                                                                                                                                                                                                                                                                                                                | Trazabilidad incompleta.                                                                                                                                                                                                                                      | Añadir.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Baja      | i18n "4 locales" sin enumerar.                                                                                                                                                                                                                                                                                                                                                                                       | Riesgo menor de QA.                                                                                                                                                                                                                                          | Enumerar `es-LATAM`, `es-ES`, `pt`, `en`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Baja      | Falta dependencia explícita a US-035 (consumidor cache budget) y US-038 (warning derivado).                                                                                                                                                                                                                                                                                                                            | Trazabilidad incompleta.                                                                                                                                                                                                                                      | Añadir.                                                                                                                                                                                                                                                                                                                                                                                                                                          |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | `BookingIntent` ya es no-transaccional (`BR-BOOKING-004`).                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                                                       |
| Respeta backend como source of truth | Pass      | Sync transaccional server-side.                                                                                     |
| Respeta seed/demo si aplica          | Pass      | `BR-SEED-006`: seed con al menos un confirmed_intent.                                                               |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                          |
| No introduce multi-tenant enterprise | Pass      | Ownership por `Event.owner_id`.                                                                                     |
| No introduce P4/Future scope         | Pass      | "Conversión FX" y "Multi-categoría por intent" quedan Out of Scope (correcto).                                       |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                                                          | Problema detectado                                                                                                                                       | Acción recomendada                                                                                                                                                                                                                                                              |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail                                                      | No documenta atomicidad, idempotencia, defensa profunda currency, persistencia `committed_synced_at`.                                                     | Reescribir tras Q1: incluir invariantes (atomicidad, idempotencia, currency check).                                                                                                                                                                                            |
| AC-02 | Needs Detail                                                      | Reversión sin auditoría documentada (`FR-BOOKING-005`).                                                                                                  | Reescribir con `cancelled_at`, `cancelled_by`, `cancellation_reason`; documentar idempotencia per `bookingIntentId`.                                                                                                                                                              |

Negative tests presentes:
- `NT-01 Race condition → Sin double-count` (correcto, alineado con SELECT FOR UPDATE).

Faltantes:
- NT para currency mismatch.
- NT para BookingIntent ya sincronizado (idempotencia retry).
- NT para BookingIntent en estado no esperado (no `pending → confirmed_intent`).
- AC para cache invalidation hacia US-035 y US-038.
- AC para A11Y `aria-live` ya documentada.
- AC para P95 NFR (sobre el endpoint que invoca).

---

## 6. Gaps Detectados

### Producto / Negocio
- Mecanismo de idempotencia (Q1).
- Política exacta de auto-create (Q2).
- Manejo de monto 0 (Q3).
- Acoplamiento con `event.status` bloqueo (Q4).

### Backend / API
- Use case `UpdateCommittedFromBookingIntent` con dos métodos: `applyOnConfirm({ bookingIntentId })` y `revertOnCancel({ bookingIntentId, cancellation: { at, by, reason } })`.
- Wrapped dentro de la transacción del invocador (`ConfirmBookingIntentUseCase` / `CancelBookingIntentUseCase`).
- Persistencia de `committed_synced_at` y `committed_synced_amount` en `BookingIntent` (Q1).
- Defensa profunda currency.
- `SELECT FOR UPDATE` sobre el `BudgetItem` durante el update (EC-02).
- Auto-create con flag `ai_generated=false`.

### Frontend / UX
- Invalidación TanStack `['event', eventId, 'budget']` tras receive del evento de booking (US-038 enriquecido se beneficia).
- `aria-live="polite"` ya documentado.
- Sin endpoint nuevo (system-driven).

### Base de Datos
- Posible migración menor: añadir `BookingIntent.committed_synced_at` y `committed_synced_amount` (Q1). Si ya existen, sin migración.
- Reuso de índices.

### Seguridad / Autorización
- Sistema; sin endpoint público.
- Verificación de invariante: `bookingIntent.event.owner_id` matchea ownership (heredado del upstream).

### IA / PromptOps
No aplica.

### QA / Testing
- Tests de concurrencia (SELECT FOR UPDATE).
- Tests de idempotencia (doble invocación).
- Tests de currency mismatch.
- Tests de auto-create.
- Tests de reversa con auditoría.

### Seed / Demo
- `BR-SEED-006` ya exige al menos un `confirmed_intent`. Garantizar que el seed muestra el efecto sobre `committed`.

### Documentación / Trazabilidad
- IDs incorrectos.
- Falta Backlog Item.
- Falta dependencias US-035, US-038.

---

## 7. Preguntas Pendientes

| Tipo   | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Bloquea aprobación | Responsable     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------- |
| PO+Tech | Q1. ¿Mecanismo exacto de idempotencia? Opciones: (a) **persistir** `BookingIntent.committed_synced_at: datetime?` y `committed_synced_amount: number?` (set tras sync exitoso; consultado al entrar al handler; protege contra retry); (b) tabla nueva `budget_item_commitments(id, booking_intent_id, action, applied_at)` con unique en `(booking_intent_id, action)`; (c) condición compleja sin persistencia (no recomendado por imposibilidad de retry seguro). Recomendado (a) por simplicidad: una migración menor en `booking_intents` y la verificación es trivial.                                                                                                                                                                                                                                                                                                                                                                                                | Sí                 | PO + Tech Lead |
| PO     | Q2. ¿Política exacta de auto-create cuando no existe `BudgetItem` para la categoría? Opciones: (a) auto-create nuevo con `ai_generated=false`, `planned=0`, `committed=N`, `paid=0` (sin reusar soft-deleted); (b) auto-create reusando soft-deleted (un-soft-delete) si existe; (c) fallar con error tipado `BUDGET_ITEM_MISSING`. Recomendado (a) por simplicidad y consistencia con US-036 D2 (soft-deleted no debería revivir).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Sí                 | Product Owner  |
| PO     | Q3. ¿Manejo de `BookingIntent.total = 0`? Opciones: (a) skip silencioso + log info; (b) error 422 PAYLOAD_INVALID en el upstream antes de llegar aquí; (c) error en US-039 con código `BOOKING_INTENT_ZERO_AMOUNT`. Recomendado (a) en US-039 (defensa profunda) + (b) como política upstream cuando el módulo Booking entregue su validación.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Sí                 | Product Owner  |
| PO     | Q4. ¿El handler de US-039 verifica `event.status` o asume que el upstream ya lo verificó? Recomendado **NO verificar** en US-039 (es system-driven y se invoca solo cuando el upstream pasó sus validaciones); documentar como precondición.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Sí                 | Product Owner  |

---

## 8. Documentation Alignment Required

| Documento / Fuente                          | Conflicto detectado                                                                                                                                          | Decisión vigente                                                                              | Acción recomendada                                                                                                                              | ¿Bloquea aprobación? |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/10`                                   | `NFR-PERF-API-001` no existe; canónico `NFR-PERF-001`.                                                                                                       | `NFR-PERF-001`.                                                                                | Corregir durante refinación.                                                                                                                   | No                   |
| `docs/6 §BookingIntent` y schema `booking_intents` | Si Q1 = (a), los campos `committed_synced_at` y `committed_synced_amount` deben documentarse en `docs/6` y existir en el schema (PB-P0-001).                | Pendiente Q1.                                                                                  | Tras Q1, actualizar `docs/6` y planificar migración menor si los campos no existen.                                                              | No (tras Q1)         |
| `docs/16 §M07 Booking`                      | Sin endpoint nuevo en US-039, pero el catálogo de errores extendido (`BUDGET_ITEM_AUTO_CREATED` log, `CURRENCY_MISMATCH`, etc.) debería documentarse.        | Pendiente decisión técnica final.                                                              | Tras Q1–Q4, actualizar `docs/16` con catálogo de logs y errores del handler.                                                                    | No                   |
| `docs/4 §BR-BOOKING-008`                    | No detalla idempotencia ni auto-create.                                                                                                                       | Pendiente Q1, Q2.                                                                              | Nota interpretativa en BR-BOOKING-008.                                                                                                          | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                          |
| User Story file path                       | `management/user-stories/US-039-committed-updated-on-booking-confirm.md`                    |
| User Story ID verified                     | Yes                                                                                         |
| Decision Resolution artifact found         | No                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-039-decision-resolution.md`                |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-039-refinement-review.md`                    |
| Final recommended status                   | Needs Refinement                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                         |
| Reason                                     | 4 preguntas bloqueantes (Q1 idempotencia, Q2 auto-create, Q3 monto 0, Q4 event status). Resolverlas obliga a reescribir AC, EC, VR, Technical Notes y posible migración. |

---

## 10. Cambios Aplicados o Recomendados

(El archivo no fue actualizado. Lista prescriptiva.)

### Metadata
- Añadir `Backlog Item: PB-P1-023`.

### Business Context
- `Context Summary` reformulado: handler system-driven invocado desde `ConfirmBookingIntentUseCase` y `CancelBookingIntentUseCase`, dentro de la transacción del invocador; idempotente per `bookingIntentId`.
- `Assumptions`: una sola categoría por intent (BR-BOOKING-007 ya lo garantiza); intent en estado `pending → confirmed_intent | cancelled` sin retorno (FR-BOOKING-002).
- `Dependencies`: añadir US-035 (consumidor cache), US-038 (warning derivado), US-036 D2 (compatible: incrementar committed activa el bloqueo de soft delete).

### PO/BA Decisions Applied
- Sección nueva con D1–D4.

### Traceability
- `FRD Requirement(s)`: FR-BUDGET-006 + FR-BOOKING-008 + FR-BOOKING-009 + FR-BOOKING-005 (auditoría cancelación).
- `Use Case(s)`: UC-BOOKING-002 + UC-BOOKING-003.
- `Business Rule(s)`: BR-BUDGET-005 + BR-BOOKING-008 + BR-BOOKING-007 + BR-BOOKING-009.
- `Permission Rule(s)`: System (handler interno; ownership verificado por upstream).
- `Data Entity / Entities`: BookingIntent, BudgetItem, Budget, Event.
- `API Endpoint(s)`: N/A (system handler).
- `NFR Reference(s)`: NFR-PERF-001.
- `Related Document(s)`: `/docs/4 §BR-BUDGET-005 §BR-BOOKING-007/008/009`, `/docs/6 §BookingIntent §BudgetItem`, `/docs/8 §UC-BOOKING-002/003`, `/docs/9 §FR-BUDGET-006 §FR-BOOKING-005/008/009`, `/docs/10 §NFR-PERF-001`, US-035, US-036, US-038.

### Scope Guardrails
- Out of Scope: penalización financiera (`BR-BOOKING-004/009`), conversión FX, multi-categoría por intent, endpoint público.

### Acceptance Criteria
- AC-01 reescrito con atomicidad, idempotencia, defensa profunda currency.
- AC-02 reescrito con reversa atómica + auditoría (`cancelled_at`, `cancelled_by`, `cancellation_reason`).
- AC-03 nuevo: idempotencia per `bookingIntentId` (retry seguro).
- AC-04 nuevo: auto-create cuando no existe BudgetItem (D2).
- AC-05 nuevo: currency mismatch ⇒ falla atómica + log error.
- AC-06 nuevo: monto 0 ⇒ skip + log info (D3).
- AC-07 nuevo: cache invalidation hacia US-035/US-038 (responsabilidad del frontend tras evento WebSocket o re-fetch).
- AC-08 nuevo: P95 del endpoint upstream cumple NFR-PERF-001.

### Edge Cases
- EC-01 reescrito (auto-create).
- EC-02 reescrito (SELECT FOR UPDATE + atomicidad).
- EC-03 nuevo: retry post-fallo (idempotencia).
- EC-04 nuevo: currency mismatch.
- EC-05 nuevo: BookingIntent.total = 0.
- EC-06 nuevo: confirm sobre intent ya `confirmed_intent` (idempotencia: no double-count).
- EC-07 nuevo: cancel sobre intent ya `cancelled` (idempotencia: no double-revert).

### Validation Rules
- VR-01 reescrita (D3).
- VR-02 reescrita (D2 auto-create).
- VR-03 nuevo: idempotencia per `bookingIntentId` (D1).
- VR-04 nuevo: currency match.
- VR-05 nuevo: BookingIntent en estado válido para sync (`confirmed_intent` para apply; `cancelled` para revert).

### Authorization & Security Rules
- SEC-01 reescrita: handler interno; ownership verificado upstream (D4).
- SEC-02: atomicidad transaccional dentro del invocador.
- SEC-03 nuevo: logging sin PII; payload con `bookingIntentId`, `budgetItemId`, `event_id`, `category_id`, `amount`, `action`.

### Technical Notes
- Backend: `UpdateCommittedFromBookingIntent` con `applyOnConfirm` y `revertOnCancel`; participa en la transacción del invocador.
- Persistencia: si Q1 = (a), añadir `BookingIntent.committed_synced_at` y `committed_synced_amount` (migración menor).
- Frontend: invalidación cache TanStack tras WebSocket/event o tras refetch del flujo de confirm (responsabilidad del módulo Booking).
- Observability: log estructurado `budget.committed.synced` con `action`, `bookingIntentId`, `budgetItemId`, `amount`, `correlationId`. Sin PII.

### Test Scenarios
- Functional: TS-01..03 + cobertura D1/D2/D3/D4.
- Negative: NT-01 race + NT nuevos (currency mismatch, retry, monto 0, estado inválido).
- Performance: TS-PERF del endpoint upstream.

### Definition of Ready
- Marcar `[x] PO/BA validó`.

### Definition of Done
- Añadir: atomicidad verificada con prueba de fallo a mitad, idempotencia verificada con retry test, auditoría de reversa verificada, currency check verificado, log emitido sin PII, snapshot OpenAPI (US-098 handoff si aplica al endpoint upstream).

### Notes
- Reemplazar "Considerar idempotencia con intent_id" por la decisión formal de Q1.

---

## 11. Recomendación Final

`Needs Refinement`

Cuatro preguntas (Q1 mecanismo de idempotencia; Q2 política de auto-create; Q3 monto 0; Q4 event status bypass) requieren decisión antes de reescribir AC, EC, VR, SEC y Technical Notes. Q1 es la más crítica porque puede implicar una migración menor.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review.

---

User Story file updated: No
Path: management/user-stories/US-039-committed-updated-on-booking-confirm.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-039-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
