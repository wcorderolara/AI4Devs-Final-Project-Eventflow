# User Story Refinement Review — US-058

## Source User Story File
management/user-stories/US-058-mark-quote-preferred.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-058-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q7 resueltas. La US-058 declara `Backlog Item: PB-P1-035`, `PO/BA Decisions Applied` D1–D7, trazabilidad corregida (`FR-QUOTE-012`, `UC-QUOTE-007`, `BR-QUOTE-022`, `BR-NOTIF-001`, `NFR-OBS-005/PERF-001`). Endpoint `PATCH /quotes/:id/preferred` toggle idempotente, atomicidad transaccional con clear previa, 2+2 notifs (target + previa), UNIQUE parcial con denormalize event_id/category_id, AC-01..AC-04, EC-01..EC-03, VR-01..VR-03, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-058 |
| File Path | management/user-stories/US-058-mark-quote-preferred.md |
| Backlog Item | PB-P1-035 — Comparador lado a lado + marca preferred |
| Epic | EPIC-CMP-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Decision Resolution artifact found | No |
| Refinement review path | management/user-stories/refinement-reviews/US-058-refinement-review.md |

## 2. Diagnóstico

US-058 cierra PB-P1-035 toggleando `Quote.is_preferred` con unicidad por `(event, category)` (BR-QUOTE-022, FR-QUOTE-012). Hallazgos: `FR-QUOTE-022` no existe (correcta `FR-QUOTE-012`); semantics del toggle, atomicidad cambio preferred, notificaciones al vendor target/previo, constraint DB y unmark sin definir.

## 7. Preguntas Pendientes

| # | Pregunta | Recomendado |
|---|---|---|
| Q1 | Semantics toggle | `PATCH /quotes/:id/preferred` body `{ is_preferred: boolean }` idempotente |
| Q2 | Atomicidad | `prisma.$transaction`: SET `is_preferred=false` en cualquier otra del `(event, category)` + SET `is_preferred=true` en la target |
| Q3 | Estados origen | Sólo `sent`/`responded` no vencidas. Otros ⇒ `409 QUOTE_NOT_PREFERABLE` |
| Q4 | Notif vendor | Vendor target: `quote.marked_preferred`. Vendor previo: `quote.unmarked_preferred`. 2 notifs c/u (in_app + email_simulated) vía `QuoteEventNotificationService` |
| Q5 | Constraint DB | UNIQUE parcial `(event_id, service_category_id) WHERE is_preferred=true`. Si falta, migración menor |
| Q6 | Unmark | Permitido con `{ is_preferred: false }`. Notif al vendor anterior (`quote.unmarked_preferred`) |
| Q7 | 404 uniforme | `404 QUOTE_NOT_FOUND` para ajeno/inexistente |

## 9. Recomendación
`Needs Refinement` — 7 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
