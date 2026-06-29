# User Story Refinement Review — US-035

## Source User Story File
management/user-stories/US-035-view-edit-budget.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-035-decision-resolution.md

## Review Date
2026-06-27 (revalidación: 2026-06-27)

## Revalidation Result (2026-06-27)

Tras la ejecución de `eventflow-po-ba-decision-resolver` (ver `management/user-stories/decision-resolutions/US-035-decision-resolution.md`) y la actualización en sitio del archivo de la US, esta segunda pasada confirma:

| Verificación                                                                                                                              | Resultado |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Q1 (alcance solo vista) resuelta: única ruta `GET /api/v1/events/:eventId/budget`; sin PATCH; mutaciones delegadas a US-036.               | OK        |
| Q2 (CTA "Sugerir IA") resuelta: deeplink a US-037 condicionado por feature flag `ai.budget-suggestion.enabled`.                            | OK        |
| Q3 (`paid` opcional) resuelta: columna siempre visible; backend normaliza `null → 0`; `summary.paid_total` expuesto.                       | OK        |
| Q4 (`over_committed`) resuelta: calculado server-side y expuesto en `summary.over_committed`; UI no recalcula.                              | OK        |
| Traceability corregida: FR-BUDGET-001/004/005/007/010; UC-BUDGET-003; BR-BUDGET-001/002/003/004/006/007/010; NFR-PERF-001.                  | OK        |
| AC reescritos (AC-01..AC-08; AC-02 eliminada por D1), EC ampliados (EC-01..EC-06), VR/SEC/Test/Observability ampliados.                    | OK        |
| Backlog Item PB-P1-020 declarado en Metadata.                                                                                              | OK        |
| Documentation Alignment Required (4 ítems no bloqueantes): `docs/16 §M06`, `BR-BUDGET-002`, ID `NFR-PERF-001`, `docs/6 §Budget` (interp.). | OK        |
| Sin scope creep; out of scope explícito (PATCH, CRUD via US-036, generación IA via US-037, conversión FX, multi-moneda).                    | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-035                                                                                                                                    |
| File Path                                  | `management/user-stories/US-035-view-edit-budget.md`                                                                                       |
| Backlog Item                               | PB-P1-020 — Gestión de presupuesto + BudgetItems                                                                                          |
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
| Refinement review path                     | `management/user-stories/refinement-reviews/US-035-refinement-review.md`                                                                  |

---

## 2. Diagnóstico PO/BA

US-035 entrega la **vista** del presupuesto del evento con desglose por categoría, totales planeados y comprometidos, y warning de exceso. Es la surface de UC-BUDGET-003 ("Ver presupuesto con warning de exceso") y la base para la demo de control financiero. PB-P1-020 agrupa US-035 (vista) y US-036 (CRUD de BudgetItem), donde el CRUD vive en US-036.

La historia llega con tres categorías de inconsistencias críticas que impiden refinarla en sitio:

1. **AC-02 "Editar total" contradice BR-BUDGET-003 y la API spec aprobada**. BR-BUDGET-003 establece que `total = SUM(BudgetItem.planned)` y `committed = SUM(BudgetItem.committed)` (derivados), por lo que no existe un `total` modificable a nivel de `Budget`. `docs/16-API-Design-Specification.md §M06` cataloga **solo** `GET /events/:eventId/budget` y delega todas las mutaciones a `/events/:eventId/budget/items` (POST/PATCH/DELETE), que pertenecen a US-036. La historia US-036 (CRUD BudgetItem) declara explícitamente `FR-BUDGET-003, FR-BUDGET-004` y endpoints `/budget/items`.
2. **Traceability incorrecta**. `UC-BUDGET-001` se refiere a "Aceptar sugerencia IA de presupuesto" (no a la vista); el UC correcto es `UC-BUDGET-003`. `FR-BUDGET-002` se refiere a la elección de moneda durante la creación (cubierta por US-009), no a la vista. Faltan `FR-BUDGET-004` (cálculo en vivo), `FR-BUDGET-005` (warning), `FR-BUDGET-007` (sin conversión FX), `FR-BUDGET-010` (visualización con moneda), `BR-BUDGET-003`, `BR-BUDGET-004`, `BR-BUDGET-006`, `BR-BUDGET-007`, `BR-BUDGET-010`.
3. **PATCH endpoint inexistente en API spec**. `PATCH /api/v1/events/:id/budget` no está en `docs/16 §M06`. Si la historia introdujera este endpoint, contradiría el catálogo aprobado de M06.

Además, faltan: `BR-BUDGET-002` opcionalidad de `paid` en MVP, formato de moneda canónico (Intl.NumberFormat por locale + `BR-BUDGET-010`), i18n explícito de los 4 locales, NFR canónico (`NFR-PERF-001` en vez de `NFR-PERF-API-001`), códigos de error (`401`, `404` no-revelación, admin `403`), y observabilidad sin PII.

No hay scope creep ni P4/Future en juego. La historia es pequeña, demoable y "Must Have" del MVP, pero antes de aprobar debe formalizarse el alcance real (solo vista) y corregirse la traceability.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                                                                                                  | Impacto                                                                                                                                                  | Recomendación                                                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alta      | AC-02 "Editar total" + `PATCH /api/v1/events/:id/budget` contradicen `BR-BUDGET-003` (total derivado), `FR-BUDGET-004` y `docs/16 §M06` (que solo cataloga `GET /events/:id/budget`). El verdadero alcance de "editar" lo cubre US-036 a través de `/budget/items/*`.                       | Si se aprueba como está, se duplicaría la lógica de mutación con US-036, se introduciría un endpoint no documentado, y la fórmula de total quedaría rota. | Resolver vía PO + Tech Lead: definir el alcance real de US-035 (solo vista) y eliminar AC-02 / PATCH; o promover una semántica explícita y compatible con BR-BUDGET-003. Ver §7 Q1.                       |
| Alta      | Traceability errónea: `UC-BUDGET-001` (en realidad "Aceptar sugerencia IA"), `FR-BUDGET-002` (moneda en creación), `BR-BUDGET-001/002` insuficientes para una vista con cálculo en vivo + warning.                                                                                          | Trazabilidad académica rota; PB-P1-020 ↔ FRD ↔ UC ↔ BRD inconsistente.                                                                                  | Reemplazar por los IDs canónicos: `UC-BUDGET-003`, `FR-BUDGET-001`, `FR-BUDGET-004`, `FR-BUDGET-005`, `FR-BUDGET-007`, `FR-BUDGET-010`, `BR-BUDGET-001`, `BR-BUDGET-003`, `BR-BUDGET-004`, `BR-BUDGET-007`, `BR-BUDGET-010`. Corrección objetiva (no requiere PO). |
| Alta      | `Dependencies` no menciona el Backlog Item ni a US-036 (CRUD de BudgetItem) ni a PB-P1-013/PB-P1-016 (sugerencia IA / HITL) que materializan los `BudgetItem` iniciales.                                                                                                                   | Riesgo de planificación: US-035 puede demoarse sin items en seed.                                                                                         | Incluir `PB-P1-020`, `US-036`, y enlaces a `PB-P1-013/PB-P1-016` (consumidores upstream de los items). Corrección objetiva.                                                                              |
| Alta      | "Sugerir IA" aparece en `Secondary Actions` y CTA del Empty State (EC-01) pero pertenece a `PB-P1-013` (US-037). Confunde alcance.                                                                                                                                                          | Riesgo de incluir un trigger IA en la historia equivocada.                                                                                                | Resolver vía PO: ¿el CTA es solo enlace (deeplink) a `US-037` o se considera fuera de alcance de US-035? Ver §7 Q2.                                                                                       |
| Media     | El campo `paid` es opcional en MVP (`BR-BUDGET-002`). US-035 no aclara si se muestra cuando exista (`NULL` vs `0`) ni la columna correspondiente.                                                                                                                                          | Inconsistencia visual entre eventos con/sin `paid`.                                                                                                       | Resolver vía PO: ¿mostrar columna `paid` siempre, solo si hay algún valor, o esconderla en MVP? Ver §7 Q3.                                                                                                |
| Media     | `NFR-PERF-API-001` no existe; el ID canónico es `NFR-PERF-001` (P95 < 1.5 s). "Success Criteria: Carga < 800ms" introduce un threshold no estándar.                                                                                                                                         | Métricas inconsistentes con el NFR aprobado.                                                                                                              | Reemplazar por `NFR-PERF-001`. Documentation Alignment Required (no bloqueante).                                                                                                                       |
| Media     | "Editar inline" como UX (`RHF inline`) no está respaldado por ningún FRD; aún si Q1 reduce US-035 a solo vista, debe quedar claro que la edición vive en US-036.                                                                                                                            | Riesgo de doble implementación frontend.                                                                                                                  | Tras Q1, eliminar `Forms: RHF inline` o redirigir explícitamente a US-036.                                                                                                                              |
| Media     | Faltan AC para auth (401), admin (403), recurso ajeno (404 no-revelación) y `paid` opcional. Test scenarios no cubren `Accept-Language` ni formato CLDR de moneda (`BR-BUDGET-010`).                                                                                                       | Cobertura QA insuficiente para una historia Must Have.                                                                                                    | Añadir AC y test scenarios explícitos.                                                                                                                                                                 |
| Baja      | "i18n Notes: 4 locales" sin enumerar (`es-LATAM`, `es-ES`, `pt`, `en` según convención EventFlow heredada de US-014).                                                                                                                                                                       | Riesgo menor de QA incompleto en algún locale.                                                                                                            | Enumerar locales canónicos durante la refinación.                                                                                                                                                      |
| Baja      | `Loading State: Skeleton` sin nota de accesibilidad (`aria-busy="true"`).                                                                                                                                                                                                                  | Riesgo menor de A11Y test fallando.                                                                                                                       | Documentar atributos ARIA del skeleton.                                                                                                                                                                |
| Baja      | `Observability: Log Event Required: Yes (budget.updated)` pero si Q1 reduce US-035 a solo vista, el log debería ser `budget.viewed` o eliminarse (las mutaciones loggean en US-036).                                                                                                       | Logs incorrectos; auditoría confusa.                                                                                                                      | Tras Q1, alinear log con el alcance final.                                                                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | Pass      | No invoca IA; el CTA "Sugerir IA" (si se mantiene) solo enlaza a `US-037`.                                          |
| Respeta backend como source of truth | Pass      | Lectura desde backend; cálculos derivados en backend (BR-BUDGET-003).                                              |
| Respeta seed/demo si aplica          | Pass      | Seed actual de Budget/BudgetItem cubre los tres estados (vacío, dentro de presupuesto, exceso).                     |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                          |
| No introduce multi-tenant enterprise | Pass      | Ownership por `Event.owner_id`.                                                                                     |
| No introduce P4/Future scope         | Pass      | "Multi-moneda" y "Conversión FX" quedan Out of Scope. PATCH endpoint queda descartado tras Q1.                       |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                                                          | Problema detectado                                                                                                                                                  | Acción recomendada                                                                                                                                                                                                                       |
| ----- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail                                                      | "ve total, planned, committed por categoría" no especifica formato de moneda (`BR-BUDGET-010`), columnas, orden, ni manejo de `paid` opcional.                       | Reescribir tras Q3 incluyendo el shape mostrado, columnas obligatorias (Categoría, Planned, Committed, Paid?, Δ), formato CLDR por locale, y el warning visible si `committed > total` (FR-BUDGET-005, AC-BUDGET-001 del FRD).         |
| AC-02 | Not Testable / Out of Scope                                       | "Editar total" contradice BR-BUDGET-003 y la API spec. No corresponde a la vista; el verdadero "editar" vive en US-036 a través de `/budget/items/*`.                | Eliminar tras Q1, o redefinir como "Editar item (deeplink a US-036)" si la decisión es mantener la entrada de navegación.                                                                                                                |

Negative tests presentes:
- `NT-01 Intentar cambiar moneda → Ignorado` (correcto en principio, alineado con `BR-BUDGET-006`; pero la vista no debería exponer un endpoint de mutación).
- `NT-02 Ajeno → 403/404` (correcto, no-revelación consistente).

Faltantes:
- No-auth → 401.
- Admin sobre endpoint de organizer → 403 (`adminExclusionGuard` reusable de otros endpoints).
- Warning visible cuando `committed > total` (AC-BUDGET-001 del FRD).
- Performance (`NFR-PERF-001` P95 < 1.5 s) sin AC formal.
- Accesibilidad (tabla con `<caption>`, `role="table"`, `scope="col/row"`, contraste del warning) sin AC.
- i18n: `Accept-Language` con fallback a `es-LATAM` (heredado de US-014 AC-05).

---

## 6. Gaps Detectados

### Producto / Negocio
- Definir si US-035 es **solo vista** (alineado con UC-BUDGET-003) o también delega a US-036 mediante deeplinks.
- Política de `paid` opcional (siempre visible, condicional, oculto en MVP).
- Política del CTA "Sugerir IA" (deeplink a US-037 o quitar).
- Manejo del `total_planned`/`total_committed` materializado vs derivado (decisión técnica documentada en `docs/6 §Budget`).

### Backend / API
- Confirmar que solo se expone `GET /api/v1/events/:eventId/budget`. Sin PATCH ni POST en esta US.
- Definir shape del response: `{ budget: { total_planned, total_committed, currency_code, paid_total? }, items: [{ id, category_name, planned, committed, paid?, ai_generated }] }`.
- Reuso de `GetBudgetUseCase` declarado en la US; no introducir `UpdateBudgetUseCase`.
- Falta declarar reuso explícito de `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`.

### Frontend / UX
- Definir componentes: `BudgetView`, `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning`.
- TanStack Query key canónica: `['event', eventId, 'budget']`.
- Formato CLDR por locale con `Intl.NumberFormat({ style: 'currency', currency: budget.currency_code })`.
- Estados loading/empty/error claros; `aria-busy` durante loading.
- Empty state CTA: "Crear primera categoría" enlaza a US-036; "Sugerir IA" enlaza a US-037 (si se mantiene tras Q2).

### Base de Datos
- No requiere migraciones. Reuso del schema `budget`/`budget_items` ya entregado por PB-P1-006.
- Índice por `event_id` sobre `budget` (unique) ya documentado en `docs/18 §Budget`.

### Seguridad / Autorización
- Reuso de `EventOwnershipPolicy`, `OrganizerRoleGuard`, `adminExclusionGuard`.
- No-revelación 404 ante recurso ajeno.
- Tests negativos para 401/403/404.

### IA / PromptOps
No aplica — esta historia no invoca IA directamente.

### QA / Testing
- Tests para auth (401), ownership (404), admin (403).
- Test de cálculo de totales (`BR-BUDGET-003`) sobre seed.
- Test del warning cuando `committed > total` (`FR-BUDGET-005`).
- Test de formato CLDR de moneda en los 4 locales.
- Test PERF dedicado contra `NFR-PERF-001` con dataset de 20+ items.
- Test A11Y de la tabla (`<caption>`, `scope`, contraste).
- Contract test contra OpenAPI snapshot (handoff a US-098).

### Seed / Demo
- El seed actual cubre los tres escenarios (vacío, dentro de presupuesto, exceso). No requiere cambios.

### Documentación / Trazabilidad
- IDs incorrectos en `FRD Requirement(s)`, `Use Case(s)`, `Business Rule(s)`, `NFR Reference(s)`.
- Falta `Backlog Item: PB-P1-020`.
- Documento `/docs/4 §BR-BUDGET-*` y `/docs/16 §M06` no enumerados.

---

## 7. Preguntas Pendientes

| Tipo  | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Bloquea aprobación | Responsable      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------- |
| Tech  | Q1. ¿Cuál es el alcance real de US-035? Opciones: (a) **solo vista** (`GET /api/v1/events/:eventId/budget`) con deeplinks a US-036 para CRUD; (b) **vista + edición inline** delegada al endpoint de US-036 (`PATCH /budget/items/:itemId`) sin endpoint propio; (c) introducir `PATCH /api/v1/events/:eventId/budget` con semántica distinta de "editar total" (no aprobado por `BR-BUDGET-003`). La decisión debe respetar la API spec aprobada (M06: solo GET en `/budget`) y `BR-BUDGET-003` (total derivado).                                                                                                                                                                                                                                          | Sí                 | Tech Lead + PO   |
| PO    | Q2. ¿El Empty State debe incluir el CTA "Sugerir IA"? Si sí, ¿es solo un deeplink a `US-037` (PB-P1-013) o se considera fuera de alcance de US-035? Recordar que la generación IA es una historia separada con HITL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Sí                 | Product Owner    |
| PO    | Q3. ¿Cómo se trata la columna `paid` (opcional en MVP, `BR-BUDGET-002`)? Opciones: (a) mostrar siempre con `0` o `—` cuando es NULL; (b) mostrar solo si al menos un item tiene `paid` no nulo; (c) ocultar en MVP. La elección impacta el response del endpoint, el componente de tabla y los test scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                            | Sí                 | Product Owner    |
| PO    | Q4. ¿El warning de exceso (`committed > total`) se entrega solo como bandera UI (front-end calcula `committed > total_planned` y muestra el banner) o se expone también como flag server-side (`progress.over_committed: boolean`) para auditoría y consistencia con futuros consumidores (admin US-016)? `FR-BUDGET-005` exige el warning visible; no especifica el origen del flag.                                                                                                                                                                                                                                                                                                                                                                       | Sí                 | Product Owner    |

---

## 8. Documentation Alignment Required

| Documento / Fuente                                                            | Conflicto detectado                                                                                                                  | Decisión vigente                                                                                                              | Acción recomendada                                                                                                                                                                  | ¿Bloquea aprobación? |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `docs/10-Non-Functional-Requirements.md`                                      | US-035 referencia `NFR-PERF-API-001`; el canónico es `NFR-PERF-001`.                                                                  | `NFR-PERF-001` (P95 < 1.5 s).                                                                                                  | Reemplazar `NFR-PERF-API-001` por `NFR-PERF-001` durante la refinación. Alineación ya registrada en US-032/US-033.                                                                   | No                   |
| `docs/16-API-Design-Specification.md §M06`                                    | US-035 declara `PATCH /api/v1/events/:id/budget`; M06 solo cataloga `GET /events/:eventId/budget`.                                    | M06 vigente; PATCH no existe en MVP para `/budget`.                                                                            | Tras Q1, eliminar el PATCH del US o, alternativamente, abrir un cambio formal a `docs/16 §M06` con ADR; recomendado eliminar.                                                        | Sí (vía Q1)          |
| `docs/4 §BR-BUDGET-003` y `docs/9 §FR-BUDGET-004`                              | AC-02 trata `total` como editable; ambos documentos lo definen como derivado (`SUM(BudgetItem.planned)`).                              | `total` es derivado / materializado por el backend (`docs/6 §Budget`).                                                          | Tras Q1, alinear US-035 con el modelo derivado.                                                                                                                                     | Sí (vía Q1)          |
| `management/user-stories/US-036-crud-budget-items.md`                          | US-036 declara CRUD de BudgetItem (`POST/PATCH/DELETE /budget/items`). US-035 duplica parcialmente la intención con "Editar total".    | US-036 es vinculante para el CRUD de items.                                                                                    | Tras Q1, eliminar la duplicidad: US-035 es solo vista; el CRUD vive en US-036.                                                                                                       | Sí (vía Q1)          |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                          |
| User Story file path                       | `management/user-stories/US-035-view-edit-budget.md`                                        |
| User Story ID verified                     | Yes                                                                                         |
| Decision Resolution artifact found         | No                                                                                          |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-035-decision-resolution.md`                |
| Refinement review artifact created/updated | Yes                                                                                         |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-035-refinement-review.md`                    |
| Final recommended status                   | Needs Refinement                                                                            |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                         |
| Reason                                     | Existen 4 preguntas bloqueantes (Q1–Q4). Q1 obliga a reescribir AC-02 y el contrato API; Q2/Q3/Q4 obligan a reescribir UX, AC y test scenarios. No se puede actualizar en sitio sin resolver Q1 primero. |

---

## 10. Cambios Aplicados o Recomendados

(El archivo no fue actualizado. Lista prescriptiva para aplicar tras la resolución de Q1–Q4.)

### Metadata
- Añadir `Backlog Item: PB-P1-020`.
- `Last Updated` → fecha de la próxima ejecución.
- `Status` → `Ready for Approval` solo después de aplicar todos los cambios.

### Business Context
- Reformular `Context Summary`: vista 1:1 del presupuesto con totales derivados; mutaciones vía US-036.
- Aclarar `Assumptions`: `paid` opcional (Q3), `committed` se sincroniza vía US-038/US-039 (BookingIntent).
- Reformular `Dependencies`: US-009 (creación del evento), US-036 (CRUD BudgetItem), PB-P1-013/PB-P1-016 (sugerencia IA + HITL).

### PO/BA Decisions Applied
- Añadir sección con D1–D4 resueltas, citando `management/user-stories/decision-resolutions/US-035-decision-resolution.md`.

### Traceability
- `FRD Requirement(s)` → `FR-BUDGET-001`, `FR-BUDGET-004`, `FR-BUDGET-005`, `FR-BUDGET-007`, `FR-BUDGET-010`.
- `Use Case(s)` → `UC-BUDGET-003` (ver presupuesto con warning).
- `Business Rule(s)` → `BR-BUDGET-001`, `BR-BUDGET-003`, `BR-BUDGET-004`, `BR-BUDGET-007`, `BR-BUDGET-010`.
- `Permission Rule(s)` → Ownership + `OrganizerRoleGuard` + `adminExclusionGuard`.
- `Data Entity / Entities` → `Budget`, `BudgetItem`, `ServiceCategory` (nombre de categoría).
- `API Endpoint(s)` → solo `GET /api/v1/events/:eventId/budget` (tras Q1).
- `NFR Reference(s)` → `NFR-PERF-001`.
- `Related Document(s)` → `/docs/4 §BR-BUDGET-*`, `/docs/6 §Budget §BudgetItem`, `/docs/8 §UC-BUDGET-003`, `/docs/9 §FR-BUDGET-001..010`, `/docs/10 §NFR-PERF-001`, `/docs/16 §M06`.

### Scope Guardrails
- Añadir a `Explicitly Out of Scope`: `PATCH /api/v1/events/:id/budget` (descartado), CRUD de BudgetItem (cubierto por US-036), generación IA (US-037), conversión FX, multi-moneda.

### Acceptance Criteria
- AC-01 reescrito: shape mostrado (tabla con Categoría / Planned / Committed / Paid? / Δ), formato CLDR de moneda, warning visible si `committed > total`, fallback `Accept-Language`.
- AC-02 reescrito o eliminado tras Q1 (recomendado: eliminar y delegar a US-036).
- AC-03 nuevo: Warning de exceso visible y no bloqueante (`FR-BUDGET-005`, `AC-BUDGET-001` del FRD).
- AC-04 nuevo: response shape canónico `{ budget, items[] }`.
- AC-05 nuevo: i18n en 4 locales (`es-LATAM`, `es-ES`, `pt`, `en`) y currency formatting CLDR.
- AC-06 nuevo: P95 < 1.5 s contra `NFR-PERF-001`.
- AC-07 nuevo: A11Y de tabla (`role="table"`, `<caption>`, `scope`, contraste del warning AA).

### Edge Cases
- EC-01 reescrito (sin items): CTA "Crear primera categoría" (deeplink a US-036) y, si Q2 lo permite, CTA "Sugerir IA" (deeplink a US-037).
- EC-02 nuevo: `committed > total` ⇒ warning visible (`BR-BUDGET-004`).
- EC-03 nuevo: `paid` ausente en todos los items (tras Q3).
- EC-04 nuevo: `event.status = cancelled` o `completed` ⇒ vista read-only con banner (alineado con US-014/US-015).
- EC-05 nuevo: moneda inmutable visible en encabezado (no editable).

### Validation Rules
- VR-01 mantenido: ownership ⇒ 403/404.
- VR-02 nuevo: `eventId` debe ser UUID válido ⇒ 400.
- VR-03 nuevo: sin sesión ⇒ 401.
- VR-04 nuevo: NO se acepta cambio de moneda en este endpoint (consistente con `BR-BUDGET-006`).

### Authorization & Security Rules
- SEC-01 explicitado: `EventOwnershipPolicy` + `OrganizerRoleGuard`.
- SEC-02 nuevo: `adminExclusionGuard`; admin usa surface auditado (US-016) si aplica.
- SEC-03 nuevo: no-revelación 404 ante recurso ajeno.
- SEC-04 nuevo: logging estructurado sin PII; montos no son PII pero sí sensibles a auditoría (`docs/19 §logging policy`).

### Technical Notes
- Frontend: TanStack query key `['event', eventId, 'budget']`; componentes `BudgetView`, `BudgetSummary`, `BudgetItemsTable`, `OvercommitWarning`; deeplinks a US-036/US-037.
- Backend: extender o usar `GetBudgetUseCase` que devuelve `{ budget, items }`; sin `UpdateBudgetUseCase` en US-035.
- API: única ruta `GET /api/v1/events/:eventId/budget`.
- Observability: log `budget.viewed` (o reuso de access log existente) con `eventId`, `userId`, `currency_code`, `total_planned`, `total_committed`, `over_committed`, `correlationId`. Sin PII.

### Test Scenarios
- TS-01 ver budget completo (FRD AC-BUDGET-001).
- TS-02 warning visible si `committed > total`.
- TS-03 sin items (empty state).
- TS-04 `paid` opcional (tras Q3).
- TS-05 i18n + currency formatting.
- AUTH-TS-01 dueño 200.
- AUTH-TS-02 ajeno 404.
- AUTH-TS-03 admin 403.
- AUTH-TS-04 sin sesión 401.
- PERF-01 P95 < 1.5 s.
- A11Y-01 tabla accesible.
- CONTRACT-01 OpenAPI snapshot (handoff a US-098).

### Definition of Ready
- Marcar `[x] PO/BA validó` tras aprobación.

### Definition of Done
- Añadir: A11Y verificada, contract test verde, log emitido, query key documentada, deeplinks a US-036/US-037 verificados.

### Notes
- Reemplazar "Confirmar formato de moneda con Intl.NumberFormat" por la decisión final de Q3/Q4 y referencia al CLDR.

---

## 11. Recomendación Final

`Needs Refinement`

La historia no puede actualizarse en sitio porque cuatro decisiones (Q1: alcance real vista vs CRUD; Q2: CTA "Sugerir IA"; Q3: tratamiento de `paid` opcional; Q4: origen del flag `over_committed`) están abiertas. Q1 es la más crítica: contradice `BR-BUDGET-003`, `FR-BUDGET-004` y `docs/16 §M06` aprobados; resolverla determina si AC-02, el endpoint PATCH y la sección Technical Notes deben reescribirse. Una vez resueltas, la US se puede refinar de manera segura y reusará el patrón de extensión que ya aplicaron US-027/US-032/US-033 en otros surfaces.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` sobre este review para resolver Q1–Q4 desde la documentación aprobada o, en su defecto, elevarlas a PO formal.

---

User Story file updated: No
Path: management/user-stories/US-035-view-edit-budget.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-035-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
