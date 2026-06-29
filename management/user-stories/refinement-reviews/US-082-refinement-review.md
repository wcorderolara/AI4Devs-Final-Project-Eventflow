# User Story Refinement Review — US-082

## Source User Story File
management/user-stories/US-082-configure-event-language.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-082-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q7 resueltas. La US-082 declara `Backlog Item: PB-P1-047`, `PO/BA Decisions Applied` D1–D7, trazabilidad corregida (FR-EVENT-014/FR-I18N-002 inaplicables → FR-I18N-003/005/006 + UC-I18N-002 + BR-EVENT-008 + BR-AI-011; NFR-PERF-API-001→NFR-PERF-001). Reuso endpoints US-009/US-010 + default heredado + inmutabilidad por status + binding con AI use cases. AC-01..AC-05, EC-01..EC-03, VR-01..VR-03, SEC-01..SEC-03, TS-01..TS-05, NT-01..NT-03, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-082 |
| Backlog Item | PB-P1-047 — Selector de idioma y configuración del evento |
| Epic | EPIC-I18N-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-082-refinement-review.md |

## 2. Diagnóstico

US-082 cierra PB-P1-047. Idioma del evento configurable en creación/edición. Afecta llamadas AI subsiguientes (FR-I18N-005).

### Hallazgos

1. **Trazabilidad**: cita `FR-EVENT-014` (admin lee events, no aplica) y `FR-I18N-002` (cambio inmediato usuario, no aplica). Correctos:
   - **`FR-I18N-003`** (organizer selecciona idioma del evento, usa en AI).
   - **`FR-I18N-005`** (AI respeta idioma seleccionado).
   - **`FR-I18N-006`** (default).
   - `BR-EVENT-008` ✓.
   - `BR-AI-011`.
   - `UC-I18N-002` ✓.
   - NFR-PERF-API-001 → NFR-PERF-001.
2. **Falta declarar `Backlog Item: PB-P1-047`**.
3. **ACs genéricos**.
4. **Endpoints**: en creación (US-009 POST /events) + edición (US-010 PATCH /events/:id). Reuso.
5. **Inmutabilidad**: editable hasta `status NOT IN ('completed', 'cancelled')`.
6. **Default**: organizer's `preferred_language`.
7. **Validación enum**: `language ∈ {es-LATAM, es-ES, pt, en}`.
8. **Impacto en AI**: cuando se invoca AI (plan, checklist, budget, brief), se pasa `event.language` como `locale` param.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Endpoints reuso | Reusar `POST /events` (US-009) + `PATCH /events/:id` (US-010) con field `language`. Esta US verifica/extiende DTOs. |
| Q2 | PO | Inmutabilidad | Editable mientras `status IN ('draft','planning','in_progress')`. `completed`/`cancelled` ⇒ `409 EVENT_LANGUAGE_NOT_EDITABLE`. |
| Q3 | PO | Default | `organizer.preferred_language` (heredado al crear). Si organizer no tiene, `es-LATAM`. |
| Q4 | Tech | Enum validation | `z.enum(['es-LATAM','es-ES','pt','en'])`. |
| Q5 | Tech | AI impact | Use cases de AI (US-017..025) deben usar `event.language` como `locale` param. Sin migración de prompts (manejado en cada use case). |
| Q6 | PO | UI ubicación | Campo en Event creation wizard (US-009 paso de configuración) + en Event detail page con edición inline (US-010). |
| Q7 | PO | Cambio retroactivo de AI outputs | NO: los AIRecommendations ya generados conservan su idioma original. Solo afecta llamadas futuras. |

## 9. Recomendación

`Needs Refinement` — 7 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
