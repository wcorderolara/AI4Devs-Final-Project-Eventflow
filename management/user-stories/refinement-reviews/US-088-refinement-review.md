# User Story Refinement Review — US-088

## Source User Story File
management/user-stories/US-088-seed-confirmed-booking-intent.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-088-decision-resolution.md

## Review Date
2026-06-22

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                            |
| ------------------------------------------ | --------------------------------------------------------------------- |
| User Story ID                              | US-088                                                                |
| File Path                                  | management/user-stories/US-088-seed-confirmed-booking-intent.md       |
| Backlog Item                               | PB-P0-014 — Seed Script Idempotente + Datos Demo                      |
| Epic                                       | EPIC-SEED-001 — Seed Data & Demo Scenarios                            |
| Estado actual                              | Draft → Ready for Approval                                            |
| Estado recomendado                         | Ready for Approval                                                    |
| Nivel de riesgo                            | Bajo                                                                  |
| Calidad general                            | Alta (después de refinamiento)                                        |
| Requiere decisión PO                       | No                                                                    |
| Requiere decisión técnica                  | No                                                                    |
| Requiere decisión QA                       | No                                                                    |
| Requiere decisión Seguridad                | No                                                                    |
| Decision Resolution artifact found         | No                                                                    |
| User Story file updated                    | Yes                                                                   |
| Refinement review artifact created/updated | Yes (este archivo — evidencia post-refinamiento, no bloqueante)       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-088-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-088 garantiza el fixture de `BookingIntent` + `Review` insertado por `SeedDemoDataUseCase` (US-085) y reusado por `ResetDemoUseCase` (US-086). Su valor es habilitador: sin un `confirmed_intent` con su reseña verificada, la demo guiada no puede evidenciar el cierre del flujo (Doc 9 §2 "QuoteRequest → Quote → BookingIntent confirmado") y la suite QA E2E no puede validar BR-REVIEW-001 (`solo reseñas verificadas`), BR-BOOKING-002/009 ni BR-BUDGET-005/006.

En su versión Draft la historia mostraba el patrón de plantilla genérica: trazabilidad imprecisa (`FR-SEED-004` apunta a QuoteRequest/Quote, no a BookingIntent; el FR correcto es `FR-SEED-005`), AC genéricos no testeables, UX/UI inaplicable a un fixture de datos, edge cases HTTP (`409` por estado inválido) que no aplican, y omisiones de cobertura de la distribución Doc 11 §21/§22, de la cancelación desde `confirmed_intent` (BR-BOOKING-009), de la moderación (BR-REVIEW-005, NFR-DATA-007) y de la coherencia con `BudgetItem.committed` (BR-BUDGET-005/006).

El refinamiento normaliza al contexto correcto:

* Fixture de contenido (no runner ni endpoint).
* Distribución de `BookingIntent` (5–8 total, ≥3 `confirmed_intent`, 1–2 `pending`, 1 cancelado desde `pending`, 1 cancelado desde `confirmed_intent`).
* Distribución de `Review` (20–40 total con proporciones 70/20/10).
* Invariantes obligatorias `is_simulated=true`, `is_seed=true`, FK a `Quote` `accepted` no expirado, unicidad `(event, category)`.
* `cancelled_at > confirmed_at` documentado para el caso de cancelación desde confirmado.
* Trazabilidad de moderación (`AdminAction`, `moderated_*`).
* Coherencia presupuestal con `BudgetItem.committed`.
* Boundary explícito frente a US-085, US-086, US-087 y PB-P3-001 / US-140.

Todas las decisiones aplicadas se derivan de documentación aprobada (FR-SEED-005, FR-BOOKING-001..004, FR-REVIEW-001/002/004, FR-BUDGET-006, BR-SEED-001/002/005/006/007/010, BR-BOOKING-001..010, BR-REVIEW-001/003/005, BR-BUDGET-005, NFR-DEMO-001/002, NFR-DATA-007, NFR-OBS-001, NFR-PRIV-004, Doc 8.1 §2 #1/#5/#11, Doc 11 §21/§22). No se requieren nuevas decisiones de PO, Tech Lead, QA ni Security.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                | Impacto                                                                                | Recomendación                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad citaba `FR-SEED-004` (QuoteRequest/Quote) en lugar de `FR-SEED-005` (BookingIntent + reseñas).                              | Cobertura documental rota; QA buscaría reglas erróneas.                                  | Trazabilidad reescrita con `FR-SEED-005`, `FR-BOOKING-001..004`, `FR-REVIEW-001/002/004`, `FR-BUDGET-006`, `BR-SEED-006/007`, `BR-BOOKING-001..010`, `BR-REVIEW-001/003/005`, `BR-BUDGET-005`, `NFR-DATA-007`, `NFR-OBS-001`, `NFR-PRIV-004`. Aplicado. |
| Alta      | AC originales boilerplate sin verificables específicos.                                                                                | DoD ambiguo; QA no podía derivar tests reales.                                          | Reescritos 6 AC en GWT testeables (distribución bookings, invariantes, reseñas, moderación, coherencia presupuestal, idempotencia). Aplicado.                       |
| Alta      | EC original (`Estado inválido → 409`) describía comportamiento HTTP que no aplica a un fixture.                                          | Aceptación incorrecta; QA construiría tests irrelevantes.                                | Reemplazado por 4 edge cases reales: migraciones faltantes, Quote inválido, fechas inconsistentes en cancelación desde confirmado, reseña sin confirmed_intent. Aplicado. |
| Alta      | UX/UI (Layout, Form/Modal, Skeleton, banner inline) no aplica a un fixture seed.                                                          | Backlog técnico inflado.                                                                  | Sección UX marcada `No aplica` con notas i18n/currency relevantes. Aplicado.                                                                                       |
| Alta      | API tabulaba método HTTP vacío.                                                                                                          | Confusión sobre el tipo de entrega.                                                       | API marcada como `No aplica`; clarificado que el consumo pasa por US-085/US-086. Aplicado.                                                                          |
| Alta      | Faltaba la distribución exacta de Doc 11 §21 (5–8 total, ≥3 confirmed, 1–2 pending, cancelaciones por origen).                          | Riesgo de fixture insuficiente para QA y demo.                                            | AC-01 enumera todos los conteos exigidos. Aplicado.                                                                                                                |
| Alta      | Faltaba la asociación de reseñas a `confirmed_intent` (BR-REVIEW-001 / BR-SEED-007) y la distribución 70/20/10 de Doc 11 §22.            | Demo no podía mostrar reseñas verificadas y moderación.                                  | AC-03/AC-04 añadidos cubriendo distribución y moderación con `AdminAction`. Aplicado.                                                                              |
| Alta      | Faltaba la cancelación desde `confirmed_intent` con `cancelled_at > confirmed_at` (Doc 8.1 §2 #5, BR-BOOKING-009).                       | QA E2E no podía validar BR-BOOKING-009.                                                  | AC-01 + EC-03 + VR-05 documentan el escenario. Aplicado.                                                                                                            |
| Alta      | Faltaba la coherencia con `BudgetItem.committed` (BR-BUDGET-005/006).                                                                   | Demo no podía mostrar actualización presupuestal post-confirmación.                       | AC-05 + VR-10 añadidos. Aplicado.                                                                                                                                  |
| Media     | Boundary contra US-085/086/087/140 implícito.                                                                                            | Riesgo de superposición de alcance.                                                       | `Explicitly Out of Scope`, `Dependencies` y `Notes` enumeran los boundaries. Aplicado.                                                                              |
| Baja      | `Last Updated 2026-06-09` desactualizado.                                                                                                | Trazabilidad de fecha.                                                                    | Actualizado a 2026-06-22. Aplicado.                                                                                                                                |
| Baja      | DoR/DoD genéricos.                                                                                                                       | Bajo, cosmético.                                                                          | DoR/DoD reescritos con criterios verificables. Aplicado.                                                                                                            |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                  |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | `BookingIntent.is_simulated=true` siempre; BR-BOOKING-004 / BR-OOS-001.                                      |
| No introduce contratos firmados      | Pass      | BR-BOOKING-005 / BR-OOS-003.                                                                                |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                  |
| Respeta human-in-the-loop IA         | Pass      | El fixture no introduce decisiones IA autónomas.                                                             |
| Respeta backend como source of truth | Pass      | Inserciones via use case backend.                                                                            |
| Respeta seed/demo si aplica          | Pass      | Es exactamente el fixture seed requerido por Doc 11 §21/§22.                                                 |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                  |
| No introduce multi-tenant enterprise | Pass      | No aplica.                                                                                                  |
| No introduce P4/Future scope         | Pass      | UI futura, AI moderación, vendor responses están fuera (BR-OOS-007/008, BR-OOS futura).                       |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad | Problema detectado                                       | Acción recomendada |
| ----- | ------- | -------------------------------------------------------- | ------------------ |
| AC-01 | Clear   | Distribución de `BookingIntent` por estado (Doc 11 §21). | Aplicado.          |
| AC-02 | Clear   | Invariantes obligatorias (`is_simulated`, `is_seed`, Quote válido, unicidad). | Aplicado. |
| AC-03 | Clear   | Distribución de `Review` (20–40, 70/20/10), asociación a `confirmed_intent`, rating 1–5. | Aplicado. |
| AC-04 | Clear   | Trazabilidad de moderación (BR-REVIEW-005, NFR-DATA-007, `AdminAction`). | Aplicado. |
| AC-05 | Clear   | `BudgetItem.committed` coherente (BR-BUDGET-005). | Aplicado. |
| AC-06 | Clear   | Idempotencia. | Aplicado. |
| EC-01 | Clear   | Migraciones faltantes. | Aplicado. |
| EC-02 | Clear   | Quote inválido para booking. | Aplicado. |
| EC-03 | Clear   | Cancelación desde `confirmed_intent` con fechas coherentes. | Aplicado. |
| EC-04 | Clear   | Reseña asociada a booking no confirmado. | Aplicado. |

---

## 6. Gaps Detectados

### Producto / Negocio

* Boundary explícito frente a US-085, US-086, US-087 y la futura UI (PB-P3-001 / US-140) documentado.

### Backend / API

* Punto de extensión en `apps/api/src/modules/seed-demo/fixtures/booking-intents.fixture.ts` y `reviews.fixture.ts`.
* Cálculo dinámico de `confirmed_at`/`cancelled_at` con offsets relativos.
* Coherencia con `BudgetItem.committed` documentada.
* Registro de `AdminAction` por reseña `hidden`/`removed`.

### Frontend / UX

No aplica.

### Base de Datos

* Columnas requeridas en `BookingIntent` y `Review` (US-099 / US-100).
* Índices sobre `is_seed`, `(event_id, service_category_id)` (US-101).

### Seguridad / Autorización

* Sin PII real (BR-SEED-010, BR-PRIVACY-010, NFR-PRIV-004).
* Reseñas seed solo asociadas a `confirmed_intent`.

### IA / PromptOps

No aplica directamente.

### QA / Testing

* Tests de integración por cada AC.
* Tests negativos para cada VR.
* Tests seed/demo para flujos de cancelación desde confirmado y moderación.

### Seed / Demo

* Fixture cubre BR-SEED-001/002/005/006/007 y NFR-DEMO-001/002.

### Documentación / Trazabilidad

* Trazabilidad actualizada con IDs verificados.
* Eliminadas referencias incorrectas (`FR-SEED-004`).

---

## 7. Preguntas Pendientes

No pending blocking questions.

Todas las decisiones aplicadas son derivables de:

* FR-SEED-005, FR-BOOKING-001..004, FR-REVIEW-001/002/004, FR-BUDGET-006, FR-DEMO-001 (Doc 9).
* BR-SEED-001/002/005/006/007/010, BR-BOOKING-001..010, BR-REVIEW-001/003/005, BR-BUDGET-005, BR-PRIVACY-010 (Doc 4).
* NFR-DEMO-001/002, NFR-DATA-007, NFR-OBS-001, NFR-PRIV-004, NFR-I18N-006 (Doc 10).
* Doc 8.1 §2 #1 / #5 / #11 (decisiones PO).
* Doc 11 §21 (BookingIntent) y §22 (Reviews y moderación).
* PB-P0-014.

---

## 8. Documentation Alignment Required

No documentation alignment issues detected.

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| —                  | —                   | —                | —                  | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                    |
| User Story file path                       | `management/user-stories/US-088-seed-confirmed-booking-intent.md`                      |
| User Story ID verified                     | Yes (US-088)                                                                           |
| Decision Resolution artifact found         | No                                                                                     |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-088-decision-resolution.md` (no existe)|
| Refinement review artifact created/updated | Yes                                                                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-088-refinement-review.md`               |
| Final recommended status                   | Ready for Approval                                                                     |
| Next recommended skill                     | eventflow-user-story-approval                                                          |
| Reason                                     | Refinamiento completado sin decisiones bloqueantes; trazabilidad, AC y guardarraíles ajustados al fixture de contenido seed. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* `Status: Draft → Ready for Approval`.
* `Last Updated: 2026-06-22`.
* `Backlog Item: PB-P0-014` añadido.
* `Module / Domain: seed-demo (Backend, content fixture transversal)` precisado.
* `Feature: BookingIntent confirmado + reseñas verificadas en seed (content fixture)` precisado.
* `Sprint / Milestone: MVP — Foundation P0` añadido.

### Business Context

* `Context Summary` reescrito describiendo el fixture y su relación con US-085 / US-086 / US-087.
* `Related Domain Concepts` enumera entidades, banderas y use cases.
* `Assumptions` explícitas (US-085/087 proveen fixtures previos, US-099/100 proveen columnas).
* `Dependencies` documenta US-085/086/087/099/100/101 y boundary con PB-P3-001 / US-140.

### PO/BA Decisions Applied

* Sección añadida con decisiones derivables (distribución Doc 11, `is_simulated=true`, FK a Quote válido, unicidad `(event, category)`, `cancelled_at > confirmed_at`, asociación reseña → confirmed_intent, moderación con `AdminAction`).

### Traceability

* FR: FR-SEED-005, FR-BOOKING-001..004, FR-REVIEW-001/002/004, FR-BUDGET-006, FR-DEMO-001.
* BR: BR-SEED-001/002/005/006/007/010, BR-BOOKING-001..010, BR-REVIEW-001/003/005, BR-BUDGET-005, BR-PRIVACY-010.
* NFR: NFR-DEMO-001/002, NFR-DATA-007, NFR-OBS-001, NFR-PRIV-004, NFR-I18N-006.
* ADR: ADR-DEVOPS-003/004.
* Docs: `/docs/3 §7.16/§14.4`, `/docs/4`, `/docs/8.1 §2 #1/#5/#11`, `/docs/9`, `/docs/11 §21/§22`, PB-P0-014.

### Scope Guardrails

* `In Scope` explícito (matrices Doc 11 §21/§22, invariantes, cancelación desde confirmado, moderación, coherencia presupuestal, idempotencia).
* `Explicitly Out of Scope`: runner CLI (US-085), endpoint HTTP (US-086), fixture Event (US-087), implementación de use cases del módulo `event-planning`, UI admin.

### Acceptance Criteria

* Reescritos los AC originales por 6 AC GWT testeables.
* EC-01 reemplazado por 4 edge cases reales.

### Technical Notes

* Backend: fixtures `booking-intents.fixture.ts` y `reviews.fixture.ts`, UUIDs deterministas, upserts idempotentes, cálculo dinámico de fechas, actualización idempotente de `BudgetItem.committed`, registro de `AdminAction`.
* Frontend: `No aplica`.
* Database: columnas requeridas + índices recomendados.
* API: `No aplica`.
* Observability: `correlationId` propagado, `AdminAction` por moderación.

### QA Notes

* Functional Tests TS-01..07 reescritos.
* Negative Tests NT-01..10 cubriendo cada VR.
* AI Tests: `No aplica`.
* Authorization Tests: `No aplica`.
* Seed/Demo Tests SD-T-01..04 añadidos.

### Definition of Ready

* Checklist completado salvo `PO/BA validó` (queda para el Approval Gate).

### Definition of Done

* Reescrita reflejando criterios verificables del fixture: distribución, invariantes, moderación, presupuesto, idempotencia, tests verdes, runbook.

### Notes

* Boundary explícito vs US-085, US-086, US-087 y PB-P3-001 / US-140.

---

## 11. Recomendación Final

**Ready for Approval.**

US-088 quedó alineada con Doc 11 §21 / §22, FR-SEED-005, BR-SEED-006/007, BR-BOOKING-001..010, BR-REVIEW-001/003/005, BR-BUDGET-005 y NFR-DEMO-001/002 / NFR-DATA-007 / NFR-OBS-001. Todas las decisiones se derivan de documentación aprobada; no hay decisiones de PO, Tech Lead, QA ni Security pendientes. Próximo paso: ejecutar `eventflow-user-story-approval`.

---

User Story file updated: Yes
Path: management/user-stories/US-088-seed-confirmed-booking-intent.md
Status: Ready for Approval
Next step: Run `eventflow-user-story-approval`.
