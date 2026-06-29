# User Story Refinement Review — US-083

## Source User Story File
management/user-stories/US-083-view-amounts-in-event-currency.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-083-decision-resolution.md

## Review Date
2026-06-29 (revalidación: 2026-06-29)

## Revalidation Result (2026-06-29)
Q1–Q8 resueltas. La US-083 declara `Backlog Item: PB-P1-048`, `PO/BA Decisions Applied` D1–D8, trazabilidad corregida (FR-BUDGET-007/009 + agregados FR-BUDGET-002, FR-EVENT-003, BR-EVENT-007, BR-BUDGET-006..010; NFR-PERF-API-001→NFR-PERF-001). Helper `formatCurrency` SSR-compatible + `<MoneyDisplay>` componente + backend guard via DTO omit + audit no raw display + 5 currencies enum. AC-01..AC-05, EC-01..EC-04, VR-01..VR-02, SEC-01..SEC-03. **Estado**: `Ready for Approval`.

## 1. Resultado Ejecutivo

| Campo | Evaluación |
|---|---|
| User Story ID | US-083 |
| Backlog Item | PB-P1-048 — Moneda inmutable y display consistente |
| Epic | EPIC-I18N-001 |
| Estado recomendado | Needs Refinement |
| Requiere decisión PO | Sí |
| Requiere decisión técnica | Sí |
| Refinement review path | management/user-stories/refinement-reviews/US-083-refinement-review.md |

## 2. Diagnóstico

US-083 single-story de PB-P1-048. Currency display consistente + inmutabilidad + helpers reusables. Frontend-heavy (utility `formatCurrency` + integración global) + backend guard simple sobre `events.currency_code`.

### Hallazgos

1. **Trazabilidad**: cita `FR-BUDGET-007` ✓ + `FR-BUDGET-009` ✓. Agregar **`FR-BUDGET-002`** (no cambiar después), **`FR-EVENT-003`** (currency selection), **`BR-EVENT-007`** (currency inmutable). `UC-I18N-002` confuso; correcto: `UC-EVENT-001` + `UC-BUDGET-004`. `NFR-PERF-API-001` → `NFR-PERF-001`.
2. **Falta declarar `Backlog Item: PB-P1-048`**.
3. **ACs genéricos**.
4. **API**: principalmente backend guard sobre UPDATE event.currency_code. Sin endpoints nuevos.
5. **Helper utility**: `formatCurrency(amount, currencyCode, locale)` reusable.
6. **5 currencies obligatorias** (FR-BUDGET-009): GTQ, EUR, MXN, COP, USD.
7. **Surface UI**: BudgetItem, Quote display, Budget summary, AI budget output, etc.
8. **Locale**: determina formatting (separador miles, decimales).

## 7. Preguntas Pendientes

| # | Tipo | Pregunta | Recomendado |
|---|---|---|---|
| Q1 | Tech | Helper utility | `formatCurrency(amount: string|Decimal, currencyCode: 'GTQ'\|'EUR'\|'MXN'\|'COP'\|'USD', locale: 'es-LATAM'\|'es-ES'\|'pt'\|'en'): string`. Usa `Intl.NumberFormat`. |
| Q2 | Tech | Backend guard inmutabilidad | `UpdateEventUseCase` (US-010) rechaza `body.currency_code` si presente Y diferente de existente ⇒ `409 CURRENCY_NOT_EDITABLE`. Alternativa: DTO `.omit({ currency_code })`. |
| Q3 | PO | Display surface | Aplicar `<MoneyDisplay>` componente en TODAS las superficies que muestren cifras: Budget summary, BudgetItem rows, Quote items, BookingIntent confirmation, AI budget output, Dashboard. |
| Q4 | Tech | Locale para formatting | Usar `useLocale()` del cliente next-intl (no event.language). Esto separa contenido (event.language) de presentación (user locale). PO confirma. |
| Q5 | PO | Símbolo vs ISO code | Display: símbolo nativo del locale (ej. "Q500.00" GTQ es-LATAM; "$500.00" USD en) + tooltip ISO code ("GTQ"). Backend siempre ISO. |
| Q6 | PO | Currencies enum | 5 obligatorias: `GTQ, EUR, MXN, COP, USD` (FR-BUDGET-009). |
| Q7 | Tech | Server-side rendering | Helper funciona client + server (Next.js SSR). Usar Intl global. |
| Q8 | PO | Moneda mixta (multi-evento dashboard) | NO en MVP. Cada surface respeta currency del contexto (event-scoped). Para vistas cross-event (futuro), display sin agregar. |

## 9. Recomendación

`Needs Refinement` — 8 decisiones PO/Tech bloqueantes.

```text
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
```
