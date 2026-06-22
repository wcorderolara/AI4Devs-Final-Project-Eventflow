# User Story Refinement Review — US-087

## Source User Story File
management/user-stories/US-087-seed-event-mix.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-087-decision-resolution.md

## Review Date
2026-06-22

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                            |
| ------------------------------------------ | --------------------------------------------------------------------- |
| User Story ID                              | US-087                                                                |
| File Path                                  | management/user-stories/US-087-seed-event-mix.md                      |
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
| Refinement review path                     | management/user-stories/refinement-reviews/US-087-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-087 garantiza el fixture de `Event` insertado por `SeedDemoDataUseCase` (US-085) y reusado por `ResetDemoUseCase` (US-086). Su valor: la demo guiada (UC-DEMO-001), la suite QA E2E y la evaluación académica deben recorrer el ciclo de vida completo `draft → active → completed | cancelled` (BR-EVENT-005) sin requerir transiciones manuales en tiempo de demo. La distribución exacta vive en Doc 11 §"Eventos" / §"Matriz de escenarios" y debe respetarse.

En su versión Draft la historia mostraba el patrón de plantilla genérica: trazabilidad imprecisa (`FR-SEED-003` apuntaba a ServiceCategory; `BR-SEED-004` a coherencia cultural; el BR correcto para diversidad de estados es `BR-SEED-003`), AC genéricos no testeables, UX/UI inaplicable a un fixture de datos, edge cases HTTP (`409` por estado inválido) que no aplican, y omisiones de cobertura cultural LATAM, multi-currency/locale y de la fixture específica de "cercano a auto-completar" para QA de `AutoCompleteEventsJob` (NFR-REL-005).

El refinamiento normaliza al contexto correcto:

* Fixture de contenido (no runner ni endpoint).
* Conteos mínimos por estado y total dentro del rango 10–15 (BR-SEED-002, BR-SEED-003).
* Banderas `auto_completed` y "cercano a auto-completar" obligatorias.
* Cobertura multi-currency/locale alineada con NFR-I18N-005/006.
* Boundary explícito frente a US-085, US-086, US-088 y PB-P3-001 / US-140.

Todas las decisiones aplicadas se derivan de documentación aprobada (FR-SEED-002, FR-EVENT-005, FR-DEMO-001, BR-SEED-001/002/003/004/005, BR-EVENT-005/010, NFR-DEMO-001/002/005, NFR-REL-005, NFR-I18N-005/006, Doc 11 §"Eventos" / §"Matriz de escenarios", PB-P0-014). No se requieren nuevas decisiones de PO, Tech Lead, QA ni Security.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                | Impacto                                                                                | Recomendación                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad citaba `FR-SEED-003` (ServiceCategory) y `BR-SEED-004` (coherencia cultural) en lugar de los IDs reales del event mix.    | Cobertura documental rota; QA buscaría reglas erróneas.                                  | Trazabilidad reescrita con `FR-SEED-002`, `FR-EVENT-005`, `FR-DEMO-001`, `BR-SEED-001/002/003/004/005`, `BR-EVENT-005/010`, `NFR-DEMO-001/002/005`, `NFR-REL-005`, `NFR-I18N-005/006`. Aplicado. |
| Alta      | AC originales eran boilerplate (`Flujo principal`, `Persistencia`) sin verificables específicos del fixture.                              | DoD ambiguo; QA no podía derivar tests reales sobre conteos por estado.                  | Reescritos 5 AC en GWT testeables (AC-01 conteos por estado, AC-02 banderas, AC-03 multi-currency/locale, AC-04 referencias relacionales, AC-05 idempotencia). Aplicado. |
| Alta      | EC-01 (`Estado inválido → 409`) describía comportamiento HTTP que no aplica a un fixture.                                                | Aceptación incorrecta; QA construiría tests irrelevantes.                                | Reemplazado por 3 edge cases reales: migraciones desactualizadas, conflicto de claves naturales con datos `is_seed=false`, cálculo dinámico de fecha relativa. Aplicado. |
| Alta      | UX/UI (Layout, Form/Modal, Skeleton, banner inline) no aplica a un fixture seed.                                                          | Backlog técnico inflado con tareas inexistentes.                                          | Sección UX marcada `No aplica` con nota sobre cobertura i18n/currency en el fixture. Aplicado.                                                                       |
| Alta      | API tabulaba método HTTP vacío; el fixture no expone endpoint.                                                                          | Confusión sobre el tipo de entrega.                                                       | API marcada como `No aplica`; clarificado que el consumo pasa por US-085/US-086. Aplicado.                                                                          |
| Media     | Sección de Auth describía `403 / 404` por ownership; no aplica a un fixture.                                                             | Backlog técnico inflado.                                                                  | Reglas SEC reescritas para describir las invariantes del fixture (sin PII, `is_seed=true`, datos LATAM). Aplicado.                                                  |
| Media     | Faltaba la fixture explícita de "cercano a auto-completar" requerida por NFR-REL-005 y Doc 11 §"Cantidad recomendada".                  | QA de `AutoCompleteEventsJob` requeriría time-travel manual.                              | Añadido AC-02 + EC-03 con cálculo dinámico de `event_date = hoy − 2 días`. Aplicado.                                                                                |
| Media     | Faltaba la cobertura cultural LATAM y multi-locale/currency explícita.                                                                  | Riesgo de fixture monoidioma/moneda; incumplimiento NFR-I18N-006.                          | Añadido AC-03 cubriendo `GTQ`/`USD` y `es-LATAM`/`en`, alineado con Doc 11 §"Matriz de escenarios". Aplicado.                                                       |
| Media     | Boundary contra US-085/086/088 implícito.                                                                                              | Riesgo de superposición de alcance.                                                       | `Explicitly Out of Scope`, `Dependencies` y `Notes` enumeran los boundaries. Aplicado.                                                                              |
| Baja      | `Last Updated 2026-06-09` desactualizado.                                                                                              | Trazabilidad de la fecha.                                                                | Actualizado a 2026-06-22. Aplicado.                                                                                                                                |
| Baja      | DoR/DoD genéricos.                                                                                                                     | Bajo, cosmético.                                                                          | DoR/DoD reescritos con criterios verificables del fixture. Aplicado.                                                                                                |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                  |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | El fixture no toca pagos (BR-OOS-001).                                                                       |
| No introduce contratos firmados      | Pass      | Excluido por BR-OOS-002/003.                                                                                |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                  |
| Respeta human-in-the-loop IA         | Pass      | El fixture no introduce decisiones autónomas; las `AIRecommendation` las inserta US-085 con `MockAIProvider`. |
| Respeta backend como source of truth | Pass      | El backend es el único responsable de inserción mediante el use case.                                       |
| Respeta seed/demo si aplica          | Pass      | Es exactamente el fixture seed requerido por Doc 11.                                                         |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                  |
| No introduce multi-tenant enterprise | Pass      | No aplica.                                                                                                  |
| No introduce P4/Future scope         | Pass      | Sin nada P4. La UI futura está fuera (PB-P3-001 / US-140).                                                   |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad | Problema detectado                                       | Acción recomendada                                                                                          |
| ----- | ------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| AC-01 | Clear   | Conteos por estado y total dentro del rango (BR-SEED-002/003). | Aplicado.                                                                                                   |
| AC-02 | Clear   | Banderas `auto_completed=true` y "cercano a auto-completar" para NFR-REL-005. | Aplicado.                                                                                                   |
| AC-03 | Clear   | Cobertura multi-currency / multi-locale alineada con Doc 11 / NFR-I18N. | Aplicado.                                                                                                   |
| AC-04 | Clear   | Referencias relacionales válidas; coherencia con organizadores seed (BR-SEED-008). | Aplicado.                                                                                                   |
| AC-05 | Clear   | Idempotencia ante doble seed.                            | Aplicado.                                                                                                   |
| EC-01 | Clear   | Migraciones faltantes → falla rápida.                    | Aplicado.                                                                                                   |
| EC-02 | Clear   | Coexistencia con datos `is_seed=false`.                  | Aplicado.                                                                                                   |
| EC-03 | Clear   | Cálculo dinámico de fecha relativa.                      | Aplicado.                                                                                                   |

---

## 6. Gaps Detectados

### Producto / Negocio

* Boundary explícito frente a US-085, US-086, US-088 y la futura UI (PB-P3-001 / US-140) documentado.

### Backend / API

* Punto de extensión documentado en `apps/api/src/modules/seed-demo/fixtures/events.fixture.ts` (o equivalente).
* Cálculo de fechas relativas para el evento cercano a auto-completar.

### Frontend / UX

No aplica.

### Base de Datos

* Columnas requeridas `Event.status`, `Event.auto_completed`, `Event.completed_at`, `Event.cancelled_reason`, `is_seed` (US-099 / US-100).
* Índices sobre `is_seed` recomendados (US-101).

### Seguridad / Autorización

* Sin PII real (BR-SEED-010, BR-PRIVACY-010, NFR-PRIV-004).
* Datos consistentes con cobertura cultural LATAM (BR-SEED-004).

### IA / PromptOps

No aplica directamente; las `AIRecommendation` asociadas a eventos las inserta US-085 con `MockAIProvider`.

### QA / Testing

* Tests de integración por estado, currency/locale, banderas, idempotencia, referencias relacionales.
* Test de schema mínimo (EC-01).

### Seed / Demo

* Fixture cubre BR-SEED-001..005, BR-EVENT-005/010 y NFR-DEMO-001/002/005.

### Documentación / Trazabilidad

* Trazabilidad actualizada con IDs verificados.
* Eliminadas referencias incorrectas a `FR-SEED-003` (ServiceCategory) y `BR-SEED-004` (coherencia cultural) como BR principal de diversidad de estados; se preservan donde aplican.

---

## 7. Preguntas Pendientes

No pending blocking questions.

Todas las decisiones aplicadas son derivables de:

* FR-SEED-002, FR-EVENT-005, FR-DEMO-001 (Doc 9).
* BR-SEED-001/002/003/004/005, BR-EVENT-005/010 (Doc 4).
* NFR-DEMO-001/002/005, NFR-REL-005, NFR-I18N-005/006 (Doc 10).
* Doc 11 §"Eventos" / §"Cantidad recomendada" / §"Matriz de escenarios" / §"Estados requeridos".
* PB-P0-014.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| Doc 10 NFR-DEMO-002 | Lista estados `draft`, `active`, `advanced`, `completed`. El dominio (Doc 4 BR-EVENT-005) no contempla `advanced` como estado del lifecycle. | BR-EVENT-005 (lifecycle `draft → active → completed | cancelled`). | Revisar Doc 10 NFR-DEMO-002 en una próxima alineación documental. La US-087 sigue BR-EVENT-005. | No |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                    |
| User Story file path                       | `management/user-stories/US-087-seed-event-mix.md`                                     |
| User Story ID verified                     | Yes (US-087)                                                                           |
| Decision Resolution artifact found         | No                                                                                     |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-087-decision-resolution.md` (no existe)|
| Refinement review artifact created/updated | Yes                                                                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-087-refinement-review.md`               |
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
* `Feature: Cobertura de estados de evento en seed (content fixture)` precisado.
* `Sprint / Milestone: MVP — Foundation P0` añadido.

### Business Context

* `Context Summary` reescrito describiendo el fixture y su relación con US-085 / US-086.
* `Related Domain Concepts` enumera entidades, banderas y use cases.
* `Assumptions` explícitas (US-085 provee runner, US-099/100 proveen columnas, BR-EVENT-005 respetado).
* `Dependencies` documenta US-085/086/088/099/100/101 y boundary con PB-P3-001 / US-140.

### PO/BA Decisions Applied

* Sección añadida con decisiones derivables (distribución Doc 11, fixture cancelled obligatorio, fixture cercano a auto-completar, cobertura cultural LATAM).

### Traceability

* FR: FR-SEED-002, FR-EVENT-005, FR-DEMO-001.
* BR: BR-SEED-001, BR-SEED-002, BR-SEED-003, BR-SEED-004, BR-SEED-005, BR-EVENT-005, BR-EVENT-010.
* NFR: NFR-DEMO-001/002/005, NFR-REL-005, NFR-I18N-005/006.
* ADR: ADR-DEVOPS-003/004.
* Docs: `/docs/3 §7.16/§14.4`, `/docs/11 §"Eventos" / §"Matriz de escenarios"`, PB-P0-014.

### Scope Guardrails

* `In Scope` explícito (conteos por estado, banderas, cobertura LATAM, idempotencia).
* `Explicitly Out of Scope`: runner CLI (US-085), endpoint HTTP (US-086), `confirmed_intent` + reseña (US-088), job `AutoCompleteEventsJob`, transiciones de estado en runtime, UI admin.

### Acceptance Criteria

* Reescritos los AC originales por 5 AC GWT testeables (AC-01..05).
* EC-01 reemplazado por 3 edge cases reales del fixture (EC-01..03).

### Technical Notes

* Backend: fixture en `seed-demo/fixtures/events.fixture.ts`, upserts idempotentes, fechas relativas en runtime.
* Frontend: `No aplica`.
* Database: columnas requeridas + índices recomendados.
* API: `No aplica`.
* Observability: `correlationId` propagado por el runner/endpoint consumidor.

### QA Notes

* Functional Tests TS-01..06 reescritos.
* Negative Tests NT-01..05 reescritos al contexto fixture.
* AI Tests: `No aplica`.
* Authorization Tests: `No aplica`.
* Seed/Demo Tests SD-T-01..03 añadidos.

### Definition of Ready

* Checklist completado salvo `PO/BA validó` (queda para el Approval Gate).

### Definition of Done

* Reescrita reflejando criterios verificables del fixture: conteos, banderas, currency/locale, referencias, idempotencia, tests verdes, runbook.

### Notes

* Boundary explícito vs US-085, US-086, US-088 y PB-P3-001 / US-140.

---

## 11. Recomendación Final

**Ready for Approval.**

US-087 quedó alineada con Doc 11 §"Eventos" / §"Matriz de escenarios", FR-SEED-002, BR-SEED-001..005, BR-EVENT-005/010, NFR-DEMO-001/002/005 y NFR-REL-005. Todas las decisiones se derivan de documentación aprobada; no hay decisiones de PO, Tech Lead, QA ni Security pendientes. La inconsistencia documental detectada (NFR-DEMO-002 lista `advanced` como estado, no presente en BR-EVENT-005) es no bloqueante y queda registrada como Documentation Alignment Required. Próximo paso: ejecutar `eventflow-user-story-approval`.

---

User Story file updated: Yes
Path: management/user-stories/US-087-seed-event-mix.md
Status: Ready for Approval
Next step: Run `eventflow-user-story-approval`.
