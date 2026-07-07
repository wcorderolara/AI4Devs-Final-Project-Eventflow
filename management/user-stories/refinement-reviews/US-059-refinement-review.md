# User Story Refinement Review — US-059

## Source User Story File
management/user-stories/US-059-view-ai-comparator-summary.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-059-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q7 resueltas. La US-059 declara `Backlog Item: PB-P2-001`, `PO/BA Decisions Applied` D1–D7, trazabilidad corregida (FR-AI-008/BR-AI-010 inaplicables → FR-AI-006+FR-QUOTE-013+UC-AI-006+BR-AI-002/005+BR-QUOTE-024). 2 endpoints (event+category, recommendation_id) + componente shared US-022 + 5 estados (loading/empty/filled/stale/fallback) + 404 uniforme. AC-01..AC-05, EC-01..EC-04, VR-01..VR-04, SEC-01..SEC-04, TS-01..TS-06, NT-01..NT-06, AI-TS-01..AI-TS-02, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-059 |
| Backlog Item | PB-P2-001 — Resumen IA del comparador |
| Epic | EPIC-CMP-001 / EPIC-AI-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-059-refinement-review.md |

## 2. Diagnóstico

US-059 cierra PB-P2-001. Surface UI consumiendo US-022 + endpoint GET para fetch del último/específico AIRecommendation. Esta US concreta `AIComparisonSummary` (alias `AIComparisonPanel`) ya planeado en spec de US-022, pero añade endpoint GET y lógica view-only/CTA.

### Hallazgos

1. **Trazabilidad**: cita `FR-AI-008` (PromptOps, no aplica) y `BR-AI-010` (probable providers, no aplica). Correctos: **`FR-AI-006`** (resumen IA), **`FR-QUOTE-013`** (resumen opcional), **`UC-AI-006`** ✓, **`BR-AI-002`** (HITL), **`BR-AI-005`** (transparency).
2. **Falta declarar `Backlog Item: PB-P2-001`**.
3. **ACs lacónicos**.
4. **Endpoint shape**: actual US dice `GET /api/v1/ai-recommendations/:id`. Mejor: 2 endpoints:
   - `GET /api/v1/events/:eventId/ai/quote-summary?category_code=...` → último summary por category (más útil UX).
   - `GET /api/v1/ai-recommendations/:id` → por id específico (audit/history).
5. **Componente shared con US-022**: el panel ya fue diseñado en US-022 FE-001. Esta US lo conecta al fetch en lugar del generate.
6. **Show vs CTA**: si AIRecommendation existe ⇒ render summary; sino ⇒ CTA "Resumir con IA" (botón de US-022).
7. **Stale indicator**: heredado US-022 D8 (snapshot != current ⇒ banner).
8. **Authorization**: organizer dueño del evento.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Endpoints | 2 endpoints: `GET /events/:eventId/ai/quote-summary?category_code=` (último por category) + `GET /ai-recommendations/:id` (específico). Esta US entrega ambos. |
| Q2 | PO | Component shared con US-022 | Reuso 100% de `AIComparisonSummary` panel definido en US-022. US-059 solo añade lógica de fetch/CTA. |
| Q3 | PO | Show vs CTA | Panel side-by-side con `QuoteComparator`. Si AIRecommendation existe para (event, category) ⇒ render. Sino ⇒ CTA "Resumir con IA" deep-link a US-022 endpoint. |
| Q4 | Tech | Stale indicator | Heredado US-022 D8: comparar `payload.quote_ids_snapshot` con current quotes; banner si difieren. |
| Q5 | Sec | Authorization | Organizer dueño del evento (`events.organizer_user_id = currentUser.id`). Otros ⇒ `404 AI_RECOMMENDATION_NOT_FOUND` uniforme. |
| Q6 | PO | Multiple summaries cronológicos | Mostrar el **último** por (event, category). Opcional: dropdown "Ver versiones anteriores" si ≥2 AIRecommendations. Recomendado: solo último MVP. |
| Q7 | PO | Layout | Panel lateral derecho (paridad US-022 D6); en mobile collapse a drawer. |

## 9. Recomendación

`Needs Refinement` — 7 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
