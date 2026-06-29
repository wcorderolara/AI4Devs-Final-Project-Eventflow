# User Story Refinement Review — US-057

## Source User Story File
management/user-stories/US-057-compare-quotes-side-by-side.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-057-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q5 resueltas. La US-057 declara `Backlog Item: PB-P1-035`, `PO/BA Decisions Applied` D1–D5, trazabilidad corregida (`FR-QUOTE-011`, `FR-AI-006` ref, `UC-QUOTE-006`, `BR-QUOTE-021/019`, `BR-BUDGET-007`, `NFR-PERF-001/OBS-005`). Endpoint `GET /events/:id/quotes/compare?categoryCode=<slug>`, response shape detallada, empty states 0/1/≥2, deep-links a US-058 y US-022, AC-01..AC-04, EC-01..EC-04, VR-01..VR-03, SEC-01..SEC-04, TS-01..TS-05, NT-01..NT-04, AUTH-TS-01..AUTH-TS-05. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| User Story ID                              | US-057                                                                    |
| File Path                                  | management/user-stories/US-057-compare-quotes-side-by-side.md             |
| Backlog Item                               | PB-P1-035 — Comparador lado a lado + marca preferred                      |
| Epic                                       | EPIC-CMP-001                                                              |
| Estado actual                              | Draft                                                                     |
| Estado recomendado                         | Needs Refinement                                                          |
| Nivel de riesgo                            | Bajo                                                                      |
| Calidad general                            | Media                                                                     |
| Requiere decisión PO                       | Sí                                                                        |
| Requiere decisión técnica                  | Sí (shape response + filtros)                                             |
| Requiere decisión QA                       | No                                                                        |
| Requiere decisión Seguridad                | No                                                                        |
| Decision Resolution artifact found         | No                                                                        |
| User Story file updated                    | No                                                                        |
| Refinement review artifact created/updated | Yes                                                                       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-057-refinement-review.md    |

---

## 2. Diagnóstico PO/BA

US-057 entrega la vista comparativa de Quotes por categoría (`BR-QUOTE-021`, `FR-QUOTE-011`, `UC-QUOTE-006`). Es posición 1 de 2 en PB-P1-035 (US-057 + US-058 mark preferred). Hallazgos:

1. **Trazabilidad incorrecta**: cita `FR-BOOKING-001` (no aplica), `FR-QUOTE-021` (no existe — la correcta es `FR-QUOTE-011`), `NFR-PERF-API-001` (no existe). Las correctas son **`FR-QUOTE-011`** (vista comparativa), **`UC-QUOTE-006`** ✓, **`BR-QUOTE-021`** ✓, **`FR-AI-006`** (resumen IA, referencia opcional), `NFR-PERF-001`, `NFR-OBS-005`. El backlog item cita `FR-QUOTE-021` que NO existe — housekeeping.
2. **Falta declarar `Backlog Item: PB-P1-035`**.
3. **Categoría**: BR-QUOTE-021 dice "para una misma categoría". ¿`categoryCode` query param requerido u opcional?
4. **Estados mostrados**: ¿`sent`/`responded`/`preferred`/`accepted`/`expired`/`rejected`? PB-P1-035 dice "Quotes expiradas marcadas claramente". Aclarar.
5. **Currency**: heredada del evento; sin FX (Out of Scope correcto).
6. **Empty state**: 0 Quotes vs 1 Quote (EC-01 lo menciona).
7. **AC-02 "Resumir IA"**: in scope US-057 o sólo deep-link a US-022?
8. **Endpoint shape**: ¿response agrupa por `service_category_id` o por Quote individual?
9. **Mark preferred**: vive en US-058. Confirmar.
10. **Performance**: < 1s p95.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                          | Impacto                                                                                                                                | Recomendación                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad incorrecta: `FR-BOOKING-001`, `FR-QUOTE-021` (inexistente), `NFR-PERF-API-001`.                                                                                       | Trazabilidad rota.                                                                                                                     | Reemplazar por **`FR-QUOTE-011`, `UC-QUOTE-006`, `BR-QUOTE-021`, `FR-AI-006` (ref opcional), `NFR-PERF-001`, `NFR-OBS-005`**.                                                                                                                |
| Alta      | Categoría como filtro.                                                                                                                                                            | Implementación ambigua.                                                                                                                | Resolver Q1 (PO). Recomendado: **`categoryCode` query param requerido** (BR-QUOTE-021 exige "misma categoría").                                                                                                                                  |
| Alta      | Estados Quotes mostrados.                                                                                                                                                          | Información incompleta.                                                                                                                | Resolver Q2 (PO). Recomendado: mostrar todos los estados relevantes (`sent`, `responded`, `preferred`, `accepted`, `expired`, `rejected`) con indicador visual; backend retorna todos para que el frontend decida filtros.                  |
| Alta      | Empty state 0 Quotes.                                                                                                                                                              | UX confusa.                                                                                                                            | Resolver Q3 (PO). Recomendado: response `{ items: [], page: ... }`. Frontend muestra "Aún no has recibido cotizaciones en esta categoría".                                                                                                  |
| Alta      | "Resumir IA" in scope o deep-link.                                                                                                                                                  | Scope ambiguo.                                                                                                                          | Resolver Q4 (PO). Recomendado: **deep-link a US-022** (CTA "Resumir IA" sólo cuando ≥2 Quotes; US-022 maneja la generación).                                                                                                                  |
| Alta      | Endpoint shape.                                                                                                                                                                    | Implementación arbitraria.                                                                                                              | Resolver Q5 (PO/Tech). Recomendado: `{ items: ComparableQuote[] }` con `ComparableQuote` = `{ id, vendor: {profile_id, business_name, slug, rating_avg}, status, total_price, currency_code, breakdown, valid_until, conditions, is_preferred, created_at }`. |
| Media     | Falta declarar `Backlog Item: PB-P1-035`.                                                                                                                                          | Trazabilidad incompleta.                                                                                                              | Añadir en Metadata.                                                                                                                                                                                                                            |
| Media     | AC-01/02 lacónicos.                                                                                                                                                                | Subespecificados.                                                                                                                      | Reescribir tras decisiones.                                                                                                                                                                                                                  |
| Baja      | `Notes` plantea mobile collapse — UX detail.                                                                                                                                       | OK.                                                                                                                                    | Mantener como UX guideline.                                                                                                                                                                                                                  |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                  |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                  |
| Respeta human-in-the-loop IA         | Pass      | AI summary deep-link a US-022.                                              |
| Respeta backend como source of truth | Pass      | Query server-side.                                                          |
| Respeta seed/demo si aplica          | Pass      | Reuso seed.                                                                 |
| No introduce P4/Future scope         | Pass      | FX conversion correctamente Out of Scope.                                  |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad      | Problema detectado                                          | Acción recomendada                                                                                                                                                                                              |
| ----- | ------------ | ----------------------------------------------------------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail | No nombra response shape, filtros, categoría.                | Reescribir tras Q1/Q2/Q5.                                                                                                                                                                                  |
| AC-02 | Needs Detail | "Resumir IA" ambiguo.                                        | Tras Q4: deep-link a US-022.                                                                                                                                                                                |
| EC-01 | Needs Detail | "Sólo 1 Quote" — fricción con vista comparativa.             | Reescribir: con 1 Quote, mostrar vista de detalle única con CTA "Marcar preferred" (deep-link a US-058).                                                                                                  |

Faltan AC para:
- Empty state 0 Quotes (Q3).
- Categoría inválida (Q1).
- Estados mostrados (Q2).
- 404 EVENT_NOT_FOUND uniforme.

---

## 6. Gaps Detectados

### Producto / Negocio
- Faltan decisiones (Q1..Q5).

### Backend / API
- `CompareQuotesUseCase` con joins (Quote + Vendor).
- Filtro por categoría.

### Frontend / UX
- `QuoteComparator` con vista responsive (tabla → cards mobile).
- Empty states 0/1/≥2 Quotes.
- Deep-link a US-022 (Resumir IA).

### Base de Datos
- Verificar índices por `event_id` + `service_category_id`.

### Seguridad / Autorización
- Organizer dueño + 404 EVENT_NOT_FOUND uniforme.

### IA / PromptOps
- N/A directo. Referencia a US-022.

### QA / Testing
- TS comparativa, empty, 1 Quote, filtrado por categoría.

### Seed / Demo
- Evento con ≥2 Quotes en la misma categoría para demo.

### Documentación / Trazabilidad
- Corregir FR/NFR.
- Documentar endpoint en `docs/16 §M07`.

---

## 7. Preguntas Pendientes

| Tipo     | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| PO       | **Q1** — Categoría requerida. Recomendado: `categoryCode` query param requerido.                                                                                                                                                                | Sí                 | PO          |
| PO       | **Q2** — Estados mostrados. Recomendado: todos los estados Quote (`sent/responded/preferred/accepted/expired/rejected`) con indicador visual; el frontend decide filtros UX.                                                                  | Sí                 | PO          |
| PO       | **Q3** — Empty state 0 Quotes. Recomendado: `{ items: [] }`; frontend muestra mensaje i18n con CTA "Volver al evento".                                                                                                                          | Sí                 | PO          |
| PO       | **Q4** — Resumir IA. Recomendado: deep-link a US-022 (CTA visible sólo con ≥2 Quotes).                                                                                                                                                          | Sí                 | PO          |
| PO/Tech  | **Q5** — Endpoint shape. Recomendado: `GET /api/v1/events/:id/quotes/compare?categoryCode=...` → `{ items: ComparableQuote[] }` con shape detallada (ver §3 de la US tras refactor).                                                          | Sí                 | PO/Tech     |

---

## 8. Documentation Alignment Required

| Documento / Fuente              | Conflicto detectado                                                          | Decisión vigente                       | Acción recomendada                                                | ¿Bloquea aprobación? |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------- | -------------------- |
| `docs/9 §FR-QUOTE-011`          | La US cita `FR-BOOKING-001` y `FR-QUOTE-021` (inexistente).                  | Trazabilidad corregida.                | Housekeeping en US + backlog.                                       | No                   |
| `docs/10 §NFR-PERF-001`         | `NFR-PERF-API-001` no existe.                                                | Trazabilidad corregida.                | Housekeeping en US.                                                | No                   |
| PB-P1-035 Traceability          | El backlog cita `FR-QUOTE-021` (inexistente).                                | Trazabilidad real registrada.          | Housekeeping del backlog.                                          | No                   |
| `docs/16 §M07`                  | Falta documentar endpoint compare.                                            | Documentar.                            | Actualizar `docs/16`.                                              | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                    |
| User Story file path                       | `management/user-stories/US-057-compare-quotes-side-by-side.md`                       |
| User Story ID verified                     | Yes                                                                                   |
| Refinement review artifact created/updated | Yes                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-057-refinement-review.md`              |
| Final recommended status                   | Needs Refinement                                                                      |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                   |
| Reason                                     | 5 decisiones PO/Tech bloqueantes + trazabilidad incorrecta.                           |

---

## 11. Recomendación Final

`Needs Refinement`.

```text
User Story file updated: No
Path: management/user-stories/US-057-compare-quotes-side-by-side.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-057-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
