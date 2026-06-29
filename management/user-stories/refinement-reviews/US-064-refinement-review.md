# User Story Refinement Review — US-064

## Source User Story File
management/user-stories/US-064-view-committed-updated-budget.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-064-decision-resolution.md

## Review Date
2026-06-28 (revalidación: 2026-06-28)

## Revalidation Result (2026-06-28)
Q1–Q6 resueltas. La US-064 declara `Backlog Item: PB-P1-037`, `PO/BA Decisions Applied` D1–D6, trazabilidad corregida (`FR-BUDGET-008` inexistente → `FR-BUDGET-004/005`; agregados `BR-BUDGET-003/004`, `BR-BOOKING-008`, `NFR-A11Y-001`). Reuso del endpoint con refactor minimal del response + invalidations + warning visual + aria-live. AC-01..AC-05, EC-01..EC-04, VR-01..VR-02. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-064 |
| Backlog Item | PB-P1-037 — Disclaimer visible + committed sincronizado |
| Epic | EPIC-CMP-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-064-refinement-review.md |

## 2. Diagnóstico

US-064 cierra PB-P1-037 + EPIC-CMP-001. Surface UI sobre el `committed` ya actualizado por US-061 (confirm) y US-062 (cancel revert). NO requiere endpoint nuevo — reusa el endpoint existente del módulo Budget. Trabajo principal: invalidación de cache en frontend post-confirm/cancel + UI con `aria-live` + warning visual cuando `committed > planned` (BR-BUDGET-004).

### Hallazgos

1. **Trazabilidad**: cita `FR-BUDGET-008` (no existe). Las correctas son **`FR-BUDGET-004`** (cálculo en vivo) + **`FR-BUDGET-005`** (warning visual). `UC-BUDGET-004` ✓ probable. `BR-BUDGET-005` ✓. Agregar `BR-BUDGET-003/004`.
2. **Falta declarar `Backlog Item: PB-P1-037`**.
3. **Referencia incorrecta a US-039**: la US menciona "US-039 atómico ya implementado". El handler atómico cross-domain Booking→Budget está en **US-061** (D3 ya entregado). Aclarar.
4. **Endpoint reuso**: `GET /api/v1/events/:id/budget` debería existir desde PB-P1-022/US-035..038. Confirmar o crear nuevo summary endpoint.
5. **Mechanism de refresh**: TanStack invalidation post-confirm (US-061) y post-cancel-confirmed (US-062). Definir queryKeys precisos.
6. **Surface qué exactamente**: por categoría (planned/committed/diff) + totales globales + warning visual.
7. **aria-live**: anunciar cambios para accesibilidad.
8. **Auto-refresh tras acciones**: invalidate de queries de budget en mutations de US-061/US-062.
9. **No-realtime**: explícitamente out of scope (websocket future).

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Endpoint reuso o nuevo | Reusar `GET /api/v1/events/:id/budget` existente (PB-P1-022). Si no existe summary, añadirlo. Verificar en DB-001. |
| Q2 | Tech | Refresh mechanism | TanStack invalidation: `['budget', eventId]` y `['budget.summary', eventId]` post-mutation de US-061 confirm y US-062 cancel. Hooks `useConfirmBooking` y `useCancelBooking` añaden invalidaciones. |
| Q3 | PO | Surface details | `BudgetSummary` muestra: por categoría {planned, committed, diff=planned-committed} + totales + warning visual cuando `committed > planned` (BR-BUDGET-004). |
| Q4 | PO | Auto-refresh vs manual | Automático: tras confirm/cancel, frontend invalida cache. Adicional manual: botón "Actualizar" visible (UX safety net). |
| Q5 | PO | Aria-live | Polite, anunciando "Presupuesto actualizado: $X comprometido en {categoría}". |
| Q6 | PO | Warning visual | Banner amarillo en BudgetSummary cuando `total committed > total planned`. Sin bloqueo (BR-BUDGET-004). |

## 9. Recomendación

`Needs Refinement` — 6 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
