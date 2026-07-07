# User Story Refinement Review — US-022

## Source User Story File
management/user-stories/US-022-ai-quote-comparison-summary.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-022-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q9 resueltas. La US-022 declara `Backlog Item: PB-P2-001`, `PO/BA Decisions Applied` D1–D9, trazabilidad corregida (FR-AI-008/FR-BOOKING-001 inaplicables → FR-AI-006 + FR-QUOTE-013 + FR-I18N-005; agregados BR-QUOTE-023/024, BR-AI-001/002/003/005/011). Endpoint POST con category_code required + locale binding + AIRecommendation con snapshot + rate limit + panel lateral + fallback. AC-01..AC-05, EC-01..EC-05, VR-01..VR-05, SEC-01..SEC-05, TS-01..TS-05, NT-01..NT-05, AI-TS-01..AI-TS-04, AUTH-TS-01..AUTH-TS-04. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-022 |
| Backlog Item | PB-P2-001 — Resumen IA del comparador |
| Epic | EPIC-AI-001 / EPIC-CMP-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-022-refinement-review.md |

## 2. Diagnóstico

US-022 es 1 de 2 en PB-P2-001 (US-022 + US-059). AI summary del comparador. Should Have MVP. La US está mejor escrita que las plantillas genéricas pero requiere precisar varios contratos.

### Hallazgos

1. **Trazabilidad**: cita `FR-AI-008` (PromptOps determinismo, no aplica directo) y `FR-BOOKING-001` (booking intent origin, NO APLICA). Correctos: **`FR-AI-006`** (resumen IA comparador), **`FR-QUOTE-013`** (resumen IA opcional). UC: `UC-AI-006` ✓. BR: `BR-AI-001..005` ✓, **`BR-QUOTE-023/024`** (comparador AI), `BR-QUOTE-021` ✓.
2. **Falta declarar `Backlog Item: PB-P2-001`**.
3. **Categoría requerida**: BR-QUOTE-023 dice "para una misma categoría". `categoryCode` query/body param requerido.
4. **Locale binding**: contrato de US-084 obliga pasar `locale: event.language` al AIProviderPort. Esta US debe respetarlo.
5. **AIRecommendation persistencia**: `recommendation_type='quote_compare_summary'` + payload + locale + locale_fallback.
6. **Idempotencia**: cada request crea AIRecommendation nuevo o cache si quotes set unchanged?
7. **Rate limit AI**: heredado de patrón AI use cases.
8. **UI surface**: Notes plantea panel lateral vs modal.
9. **AC-02 dice "quote_ids consideradas"**: payload debe incluir snapshot de quote_ids para audit.

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | PO | Categoría requerida | Sí, `categoryCode` body param requerido (BR-QUOTE-023). Sin categoría ⇒ `400 INVALID_FILTERS`. |
| Q2 | Tech | AI prompt + output schema | Prompt `QuoteCompareSummaryPrompt v1`. Output JSON: `{ summaries: [{quote_id, pros:string[], cons:string[], missing_info:string[], notes:string}] }`. Sin recommendation explícita. |
| Q3 | Tech | Locale binding (US-084) | `aiProviderPort.generate({ ..., locale: event.language })`. Persistir `ai_recommendations.locale` + `locale_fallback`. |
| Q4 | PO | Idempotencia / cache | Cada request genera AIRecommendation nuevo (sin cache). Permite re-generar si user quiere. Persiste `payload.quote_ids_snapshot` para audit. |
| Q5 | Sec | Rate limit | Heredado patrón AI: max 5 requests/min/user (configurable). Si excede ⇒ `429 AI_RATE_LIMITED`. |
| Q6 | PO | UI surface | Panel lateral en `/quotes/compare` (no modal). Mejor UX porque user puede comparar tabla mientras lee. |
| Q7 | PO | Mínimo quotes | ≥2 quotes activas (sent/responded/preferred) en la categoría. Otros estados (expired/rejected) NO cuentan. |
| Q8 | PO | Si quotes cambian post-generación | AIRecommendation conserva snapshot. Banner UI sugiere "Quotes han cambiado; regenera para resumen actualizado". |
| Q9 | Tech | Fallback si AI falla | Template estático en es-LATAM con disclaimer "Resumen IA no disponible. Compara manualmente." + `locale_fallback=true`. |

## 9. Recomendación

`Needs Refinement` — 9 decisiones PO/Tech/Sec bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
