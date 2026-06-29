# User Story Refinement Review — US-038

## Source User Story File
management/user-stories/US-038-budget-overcommitted-warning.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-038-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-038-decision-resolution.md`) y la actualización en sitio del archivo, esta segunda pasada confirma:

| Verificación                                                                                                                                                       | Resultado |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Q1 (subsumir vs extender) resuelta: extiende US-035 con `summary.overcommitted_amount`, `items[].over_committed`, `items[].overcommitted_amount`; sin endpoint nuevo. | OK        |
| Q2 (CTAs) resuelta: CTA único "Editar items" (scroll/focus a primera fila over_committed=true); badge per-item informativo con aria-label localizado.               | OK        |
| Q3 (tolerancia) resuelta: adaptativa `10^(-currency.decimal_places)` con fallback defensivo `decimal_places=2`.                                                     | OK        |
| Q4 (badge per-item) resuelta: `item.over_committed = (item.committed - item.planned) > tolerance` consistente con D3; caso planned=0 ∧ committed>0 ⇒ badge.        | OK        |
| Traceability corregida: FR-BUDGET-004/005; UC-BUDGET-003; BR-BUDGET-003/004; NFR-PERF-001.                                                                          | OK        |
| AC reescritos (AC-01..07), EC-01..06, VR-01..04, SEC-01 (reuso íntegro US-035).                                                                                     | OK        |
| Backlog Item PB-P1-022 declarado.                                                                                                                                  | OK        |
| Documentation Alignment Required (4 ítems no bloqueantes): `docs/16 §M06`, `docs/4 §BR-BUDGET-004`, verificación `currencies.decimal_places`, housekeeping `NFR-PERF-001`. | OK |
| Sin scope creep; bloqueo de gastos y persistir flag en BD quedan Out of Scope.                                                                                      | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-038                                                                                                                                    |
| File Path                                  | `management/user-stories/US-038-budget-overcommitted-warning.md`                                                                          |
| Backlog Item                               | PB-P1-022 — Warning de overcommit del presupuesto                                                                                         |
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
| Refinement review path                     | `management/user-stories/refinement-reviews/US-038-refinement-review.md`                                                                  |

---

## 2. Diagnóstico PO/BA

US-038 está sustancialmente **solapada con US-035** (ya aprobada e implementada): D4 de US-035 formaliza el cálculo server-side de `summary.over_committed` en `GetBudgetUseCase`, y AC-03 de US-035 declara explícitamente el banner accesible no bloqueante (`role="alert"` / `aria-live="polite"`) cuando `summary.over_committed = true`. El campo se serializa en el response del endpoint `GET /api/v1/events/:eventId/budget`, persiste entre sesiones (es derivado en cada request) y se renderiza con la copy localizada `budget.overcommit_warning`. Esto cubre AC-01 ("warning visible"), AC-02 ("persistencia consistente"), SEC-01, la authorization, currency e i18n declarados por US-038 sin trabajo nuevo.

Por lo tanto, US-038 puede:

* **(a) Subsumirse en US-035**: se cierra como "Implemented in US-035"; sin tareas nuevas; el backlog item PB-P1-022 queda satisfecho por la cobertura existente.
* **(b) Extender el contrato de US-035** con elementos diferenciales que el backlog item PB-P1-022 menciona pero no entrega:
  * **Delta** (`overcommitted_amount = total_committed - total_planned`) — el backlog dice "UI muestra mensaje claro y delta".
  * **Badge a nivel item** (`item.over_committed` cuando `item.committed > item.planned`) — la `Assumption` de US-038 menciona "badge a nivel item" pero US-035 D4 solo formalizó el flag a nivel summary.
  * **Tolerancia de redondeo de 0.01** — EC-01 de US-038, no documentado en US-035.

Sin la decisión Q1 (subsumir vs extender) no se puede refinar el archivo: AC, EC, Technical Notes, Traceability y CTAs cambian drásticamente entre las dos rutas.

Además, la historia llega con varios problemas comunes:

1. **Traceability incorrecta**: `FR-BUDGET-006` (committed sync por BookingIntent) y `BR-BUDGET-006` (moneda configurable) NO aplican; los canónicos son `FR-BUDGET-005` y `BR-BUDGET-004` (warning).
2. **CTA "Ajustar total"** no tiene sentido: `total` es derivado (`BR-BUDGET-003`); no existe endpoint para mutarlo. La acción real es "Editar items" (deeplink a US-036).
3. **VR-01 vacío**: "Comparación con moneda del evento — Calc" no es regla.
4. **NFR-PERF-API-001** no existe.
5. **AC-02** trivial dado que el cálculo es server-side cada request.
6. **Tolerancia 0.01**: documentar si es server-side, client-side y aplica al summary y/o a items.
7. **A11Y, i18n, contract test, performance**: no documentados con métricas concretas.

No hay scope creep (es Must Have, sin mecánicas P4/Future). Pero el alcance real depende de Q1.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                                                                | Impacto                                                                                                                                                                                                                                                       | Recomendación                                                                                                                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | **Solapamiento crítico con US-035 D4 + AC-03**: el flag `summary.over_committed` server-side y el banner accesible no bloqueante ya están implementados.                                                                                                                                  | Si se aprueba US-038 sin clarificar, se duplica trabajo, se crea ambigüedad de ownership y se rompe la convención "una US, un dueño" del proceso de refinement.                                                                                              | Resolver Q1 (PO+Tech): subsumir vs extender. Recomendado **extender** con delta + badge per-item + tolerancia 0.01, todos en `GetBudgetUseCase` (sin endpoint nuevo).                                                                                                   |
| Alta      | Traceability incorrecta: `FR-BUDGET-006` (committed sync por BookingIntent) y `BR-BUDGET-006` (moneda configurable) NO corresponden.                                                                                                                                                       | Trazabilidad rota; PB-P1-022 ↔ FRD ↔ BRD inconsistente.                                                                                                                                                                                                       | Reemplazar por `FR-BUDGET-005` (warning visible) y `BR-BUDGET-004` (warning sin bloqueo); añadir `FR-BUDGET-008` (backlog item dice "FR-BUDGET-008" que es edición libre — pero el correcto para warning es FR-BUDGET-005). Corrección objetiva en refinación. |
| Alta      | CTA "Ajustar total" no aplica: `total` es derivado (`BR-BUDGET-003`/`FR-BUDGET-004`). No existe endpoint para mutarlo (US-035 D1 lo descartó).                                                                                                                                              | UI rota o engañosa.                                                                                                                                                                                                                                            | Eliminar y reemplazar por "Editar items" (deeplink a US-036) y "Revisar items" (scroll a tabla).                                                                                                                                                                       |
| Alta      | "Persistencia entre sesiones" (AC-02 + Acceptance Summary del backlog) puede leerse como persistir el warning en BD. Es trivial: el cálculo es derivado en cada request (US-035 D4).                                                                                                       | Riesgo de implementar una solución incorrecta (e.g., guardar `over_committed` en `budget` y desactualizarlo).                                                                                                                                                  | Aclarar: "persistente entre sesiones" = derivado server-side en cada request, no almacenado.                                                                                                                                                                          |
| Media     | EC-01 declara "tolerancia 0.01 unidad de la moneda" pero no detalla si aplica server-side al summary y/o per-item, ni si se redondea a entero (CLP/JPY) o decimal.                                                                                                                          | Inconsistencia entre summary y badges per-item; ambigüedad para monedas sin decimales.                                                                                                                                                                       | Resolver Q3 (PO): documentar tolerancia explícita y considerar `currency.decimal_places` para monedas como CLP/JPY (`0.01` solo aplica si hay decimales).                                                                                                              |
| Media     | Badge per-item: si Q1 = extender, definir condición exacta. Opciones: (a) `item.committed > item.planned`; (b) `item.committed > item.planned + tolerance`; (c) `item.committed > item.planned * (1 + tolerance_pct)`.                                                                    | Implementación divergente según opción.                                                                                                                                                                                                                       | Resolver Q4 (PO): recomendar (b) con la misma tolerancia 0.01 del summary.                                                                                                                                                                                            |
| Media     | NFR-PERF-API-001 no existe; el ID canónico es `NFR-PERF-001`.                                                                                                                                                                                                                            | Métrica inconsistente.                                                                                                                                                                                                                                       | Reemplazar. Documentation Alignment Required (no bloqueante).                                                                                                                                                                                                          |
| Media     | VR-01 vacío: "Comparación con moneda del evento — Calc".                                                                                                                                                                                                                                | No es validación.                                                                                                                                                                                                                                             | Reemplazar por: "Cálculo server-side; UI no recalcula" (alineado con US-035 VR-05).                                                                                                                                                                                  |
| Media     | Faltan AC para auth (401), admin (403), recurso ajeno (404), evento `cancelled`/`completed` (200 con cálculo per US-035 D3 vía US-033).                                                                                                                                                   | Cobertura QA insuficiente.                                                                                                                                                                                                                                    | Reusar el patrón de US-035 (independencia de `event.status`).                                                                                                                                                                                                         |
| Media     | Falta política de A11Y específica (no es solo "color + ícono + texto"). El banner ya cumple `role="alert"` en US-035; el badge per-item debería tener `aria-label` localizado con el delta.                                                                                                | A11Y test puede fallar para el badge.                                                                                                                                                                                                                          | Documentar atributos ARIA del badge.                                                                                                                                                                                                                                 |
| Baja      | "i18n Notes: 4 locales" sin enumerar.                                                                                                                                                                                                                                                    | Riesgo menor de QA incompleto.                                                                                                                                                                                                                                | Enumerar `es-LATAM`, `es-ES`, `pt`, `en`.                                                                                                                                                                                                                              |
| Baja      | Backlog Item `PB-P1-022` no declarado.                                                                                                                                                                                                                                                  | Trazabilidad incompleta.                                                                                                                                                                                                                                       | Añadir.                                                                                                                                                                                                                                                              |
| Baja      | Falta dependencia a US-035 (consumidor cache, productor del summary), US-036 (mutaciones que disparan warning), US-038 (BookingIntent confirmado actualiza `committed`).                                                                                                                  | Trazabilidad incompleta.                                                                                                                                                                                                                                       | Añadir dependencias.                                                                                                                                                                                                                                                |
| Baja      | Falta log estructurado (puede ser opcional si solo extiende US-035; pero conviene exponer `over_committed_amount` en el log `budget.viewed` que US-035 ya emite).                                                                                                                          | Auditoría incompleta.                                                                                                                                                                                                                                          | Tras Q1, extender log de US-035.                                                                                                                                                                                                                                     |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA.                                                                                                       |
| Respeta backend como source of truth | Pass      | Cálculo server-side.                                                                                                |
| Respeta seed/demo si aplica          | Pass      | Reuso del seed de US-035 + US-036 (debe garantizar al menos un evento `over_committed`).                            |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                          |
| No introduce multi-tenant enterprise | Pass      | Ownership por `Event.owner_id`.                                                                                     |
| No introduce P4/Future scope         | Pass      | "Bloqueo de gastos" queda Out of Scope (`BR-BUDGET-004` warning sin bloqueo).                                       |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                                                          | Problema detectado                                                                                                                                       | Acción recomendada                                                                                                                                                                                                                       |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Already covered (US-035 AC-03)                                    | Idéntico a US-035 AC-03. La copy "Tu presupuesto comprometido excede el total" es un detalle que ya vive en `budget.overcommit_warning`.                  | Reescribir tras Q1: si extiende, AC-01 referencia US-035 AC-03 y añade el delta mostrado.                                                                                                                                              |
| AC-02 | Not Testable / Trivial                                            | "Persistencia consistente" es trivial dado el cálculo server-side.                                                                                       | Eliminar o reescribir como verificación de que el warning desaparece tras invalidación de cache (`['event', eventId, 'budget']`) post-mutación de US-036.                                                                                |

Negative tests presentes:
- `NT-01 Diferencia centavos → Sin warning` (correcto, alineado con EC-01 tolerancia).

Faltantes:
- Auth 401, admin 403, ajeno 404 (heredados de US-035 SEC).
- AC para delta (`overcommitted_amount`).
- AC para badge per-item (`item.over_committed`).
- AC para A11Y del badge.
- AC para tolerance boundary (committed = total + 0.005 ⇒ sin warning; committed = total + 0.011 ⇒ con warning).
- AC para currencies sin decimales (CLP/JPY).
- AC para P95 (heredable de US-035 AC-07).

---

## 6. Gaps Detectados

### Producto / Negocio
- Decisión de subsumir vs extender (Q1).
- Política exacta de tolerancia (Q3).
- Condición exacta del badge per-item (Q4).
- CTA correcta (no "Ajustar total"; sí "Editar items").

### Backend / API
- Si extiende, definir shape del response extendido de US-035: `summary.overcommitted_amount: number`, `items[].over_committed: boolean`, `items[].overcommitted_amount?: number`.
- Reusar `GetBudgetUseCase` de US-035 (sin nuevos endpoints).
- Considerar `currency.decimal_places` al aplicar tolerancia.

### Frontend / UX
- Si extiende, extender `BudgetSummary` con delta visible y `BudgetItemsTable` con badge por fila.
- Reuso del `OvercommitWarning` de US-035.
- A11Y del badge: `aria-label="Categoría sobrecomprometida por {amount}"`.
- CTA "Editar items" (scroll/focus a la primera fila over-committed) y "Revisar items" (sin acción específica salvo scroll).

### Base de Datos
- Sin migraciones; reuso del schema de US-035/US-036.

### Seguridad / Autorización
- Reuso íntegro de US-035 (mismo endpoint).

### IA / PromptOps
No aplica.

### QA / Testing
- Si extiende: tests de boundary de tolerancia, badge per-item, currencies sin decimales.
- Reuso de auth tests de US-035.

### Seed / Demo
- Garantizar evento demo con `over_committed = true` Y al menos un item con `committed > planned` para demoar tanto el banner como el badge.

### Documentación / Trazabilidad
- IDs incorrectos.
- Falta Backlog Item, dependencia explícita a US-035 y US-036.

---

## 7. Preguntas Pendientes

| Tipo   | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Bloquea aprobación | Responsable     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------- |
| PO+Tech | Q1. ¿US-038 se subsume en US-035 o extiende el contrato con elementos diferenciales? Recomendado **extender** con: `summary.overcommitted_amount` (delta), `items[].over_committed: boolean` (badge per-item), `items[].overcommitted_amount?: number` (delta per-item), y la política de tolerancia 0.01. La extensión vive en `GetBudgetUseCase` (US-035) sin endpoint nuevo. Si se subsume, US-038 se cierra como "Implemented in US-035" y PB-P1-022 satisfecho por cobertura existente.                                                                                                                          | Sí                 | PO + Tech Lead |
| PO     | Q2. (Si extiende Q1) ¿Qué CTAs muestra el banner/badge? Opciones: (a) "Editar items" (deeplink a US-036 con scroll a la tabla); (b) "Editar items" + "Revisar items" (scroll local sin deeplink); (c) sin CTA, solo informativo. Recomendado (a) por consistencia con el flow CRUD.                                                                                                                                                                                                                                                                                                                                  | Sí                 | Product Owner  |
| PO     | Q3. (Si extiende Q1) ¿Política exacta de tolerancia? Opciones: (a) tolerancia fija de 0.01 unidad de moneda independientemente del `currency.decimal_places`; (b) tolerancia adaptativa según `currency.decimal_places` (e.g., 0.01 para USD/EUR, 1 para CLP/JPY que no tienen decimales); (c) tolerancia porcentual (0.01% del total). Recomendado (b) por correctitud para monedas sin decimales.                                                                                                                                                                                                                            | Sí                 | Product Owner  |
| PO     | Q4. (Si extiende Q1) ¿Condición exacta del badge per-item? Opciones: (a) `item.committed > item.planned` (estricto); (b) `item.committed > item.planned + tolerance` (con la tolerancia de Q3); (c) `item.committed > item.planned * (1 + tolerance_pct)`. Recomendado (b).                                                                                                                                                                                                                                                                                                                                                  | Sí                 | Product Owner  |

---

## 8. Documentation Alignment Required

| Documento / Fuente                          | Conflicto detectado                                                                                                                                          | Decisión vigente                                                                              | Acción recomendada                                                                                                                              | ¿Bloquea aprobación? |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/10`                                   | `NFR-PERF-API-001` no existe; canónico `NFR-PERF-001`.                                                                                                       | `NFR-PERF-001`. Ya alineado en US-032..037.                                                   | Corregir durante refinación.                                                                                                                   | No                   |
| `docs/16 §M06 Budget`                       | Si Q1 = extender, el response gana `overcommitted_amount`, `item.over_committed` y `item.overcommitted_amount`.                                              | Pendiente Q1.                                                                                  | Tras Q1, extender `docs/16 §M06`. Snapshot OpenAPI por US-098.                                                                                  | No (tras Q1)         |
| `docs/4 §BR-BUDGET-004`                     | No detalla la tolerancia para considerar `committed > total`.                                                                                                 | Pendiente Q3.                                                                                  | Tras Q3, nota interpretativa en BR-BUDGET-004 referenciando la decisión.                                                                       | No (tras Q3)         |
| `management/user-stories/US-035-view-edit-budget.md` (aprobado) | US-035 D4 ya formaliza `summary.over_committed`. US-038 debe alinearse (no duplicar ni reescribir).                                                            | US-035 D4 es vinculante.                                                                       | Tras Q1, US-038 explicitar la extensión incremental sin alterar lo entregado por US-035.                                                       | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                          |
| User Story file path                       | `management/user-stories/US-038-budget-overcommitted-warning.md`                            |
| User Story ID verified                     | Yes                                                                                         |
| Decision Resolution artifact found         | No                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-038-decision-resolution.md`                |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-038-refinement-review.md`                    |
| Final recommended status                   | Needs Refinement                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                         |
| Reason                                     | 4 preguntas bloqueantes (Q1–Q4) requieren decisión PO + Tech. Q1 es la más crítica: define si US-038 se subsume o extiende US-035; sin esa decisión no se puede reescribir AC, EC ni Technical Notes. |

---

## 10. Cambios Aplicados o Recomendados

(El archivo no fue actualizado. Lista prescriptiva para aplicar tras la resolución de Q1–Q4.)

### Metadata
- Añadir `Backlog Item: PB-P1-022`.
- `Status` → `Ready for Approval` tras decisiones.

### Business Context
- Reformular `Context Summary`: relación con US-035 (extiende o subsume).
- `Assumptions`: tolerancia explícita; cálculo server-side; UI no recalcula.
- `Dependencies`: US-035 (productor del summary), US-036 (CRUD que dispara warning), US-019/US-025/US-037 (BookingIntent confirmación que actualiza `committed`; aunque US-038/US-039 son las que sync committed, US-038 es la US del warning).

### PO/BA Decisions Applied
- Sección nueva con D1–D4 formalizadas.

### Traceability
- `FRD Requirement(s)`: FR-BUDGET-005 (warning visible).
- `Use Case(s)`: UC-BUDGET-003 (Ver presupuesto con warning de exceso).
- `Business Rule(s)`: BR-BUDGET-004 (warning sin bloqueo) + BR-BUDGET-003 (cálculo de totales).
- `Permission Rule(s)`: Ownership + OrganizerRoleGuard + adminExclusionGuard (heredados de US-035).
- `Data Entity / Entities`: Budget, BudgetItem (read-only).
- `API Endpoint(s)`: `GET /api/v1/events/:eventId/budget` (reuso de US-035; sin endpoint nuevo).
- `NFR Reference(s)`: NFR-PERF-001.
- `Related Document(s)`: `/docs/4 §BR-BUDGET-003/004`, `/docs/6 §Budget §BudgetItem`, `/docs/8 §UC-BUDGET-003`, `/docs/9 §FR-BUDGET-005`, `/docs/10 §NFR-PERF-001`, `/docs/16 §M06`, US-035, US-036.

### Scope Guardrails
- `Explicitly Out of Scope`: bloqueo de gastos; persistir el flag en BD (es derivado); CTA "Ajustar total" (`total` derivado); endpoint nuevo.

### Acceptance Criteria
- AC-01 reescrito: extensión del response con delta y badges per-item (tras Q1).
- AC-02 reescrito: tolerancia explícita (tras Q3).
- AC-03 nuevo: badge per-item (tras Q4).
- AC-04 nuevo: A11Y del badge.
- AC-05 nuevo: invalidación TanStack tras mutaciones de US-036 que cambien el estado del warning.
- AC-06 nuevo: P95 < 1.5 s (NFR-PERF-001, heredable).

### Edge Cases
- EC-01 reescrito con la tolerancia de Q3.
- EC-02 nuevo: currencies sin decimales (CLP/JPY).
- EC-03 nuevo: boundary de tolerancia.
- EC-04 nuevo: evento `cancelled`/`completed` (200 con cálculo real, heredable de US-033 D3).

### Validation Rules
- VR-01 reescrita: cálculo server-side; UI no recalcula.

### Authorization & Security Rules
- SEC-01 reescrito como reuso íntegro de US-035 SEC-01..05.

### Technical Notes
- Backend: extensión del `GetBudgetUseCase` (US-035) sin endpoints nuevos.
- Frontend: extensión de `BudgetSummary` y `BudgetItemsTable` (US-035) con render condicional del delta y badge.
- API: shape extendido (Q2/Q3/Q4).
- Observability: extensión del log `budget.viewed` (US-035) con `overcommitted_amount` y `over_committed_items_count`.
- Sin migraciones.

### Test Scenarios
- Functional: TS-01 banner + delta visible; TS-02 badge per-item; TS-03 tolerancia boundary.
- Negative: NT-01 diferencia centavos sin warning; NT-02 currency sin decimales.
- AUTH: heredables de US-035.
- A11Y-01 badge accesible.
- CONTRACT-01.

### Definition of Ready
- Marcar `[x] PO/BA validó`.

### Definition of Done
- Añadir: cache invalidation verificada, contract test verde, A11Y verificada, snapshot OpenAPI (US-098 handoff).

### Notes
- Reemplazar "Confirmar diseño visual del banner" por la decisión de Q2 sobre CTAs.
- Documentar handoff con US-035 (consumidor del summary) y US-036 (mutaciones que disparan invalidación).

---

## 11. Recomendación Final

`Needs Refinement`

Cuatro preguntas (Q1 subsumir vs extender; Q2 CTAs; Q3 tolerancia exacta; Q4 condición del badge per-item) requieren decisión antes de poder reescribir AC, EC, Traceability y Technical Notes. Q1 es la decisión raíz; las otras solo aplican si Q1 = "extender".

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review.

---

User Story file updated: No
Path: management/user-stories/US-038-budget-overcommitted-warning.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-038-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
