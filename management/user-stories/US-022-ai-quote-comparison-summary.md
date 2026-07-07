# 🧾 User Story: Resumen IA del comparador de Quotes (HITL informativo + panel lateral)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-022 |
| Backlog Item | PB-P2-001 — Resumen IA del comparador |
| Epic | EPIC-AI-001 / EPIC-CMP-001 |
| Feature | `POST /events/:id/ai/quote-summary` + `AIComparisonSummary` panel lateral + locale binding |
| Module / Domain | AI / Booking |
| User Role | Organizer |
| Priority | Should Have |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Sprint / Milestone | MVP |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-29 |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-29 |
| Ready for Development Tasks | Yes |

---

## 🎯 User Story

**As an** organizador comparando varias Quotes
**I want** un resumen IA que destaque pros/contras/info faltante por Quote, generado bajo demanda en el idioma del evento
**So that** pueda decidir cuál marcar como `preferred` con mayor claridad. La IA informa pero NO decide (HITL).

---

## 🧠 Business Context

### Context Summary

US-022 entrega resumen IA del comparador (AI-006 / FR-AI-006 / FR-QUOTE-013). HITL estricto: solo informa, no marca preferred. Panel lateral en `/quotes/compare`. Requiere `category_code` (BR-QUOTE-023). Cada request genera un nuevo `AIRecommendation` con snapshot de `quote_ids` para audit. Rate limit AI 5/min/user. Locale binding per US-084 contract.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | `category_code` body param requerido. Sin él ⇒ `400 INVALID_FILTERS`. |
| D2 | Prompt `QuoteCompareSummaryPrompt v1` + output JSON validado Zod schema. |
| D3 | Locale binding US-084: `aiProviderPort.generate({locale: event.language})`. |
| D4 | Sin cache: cada request genera nuevo `AIRecommendation` con `quote_ids_snapshot`. |
| D5 | Rate limit 5 req/min/user; excede ⇒ `429 AI_RATE_LIMITED`. |
| D6 | UI: `AIComparisonSummary` panel lateral (no modal). |
| D7 | Mínimo 2 quotes activas (`sent/responded/preferred`) en la categoría. |
| D8 | Snapshot quote_ids + banner UI si quotes cambian post-generación. |
| D9 | Fallback template estático + `locale_fallback=true` si AI falla o output inválido. |

### Related Domain Concepts

* `AIRecommendation.recommendation_type='quote_compare_summary'`.
* Snapshot `quote_ids_snapshot` para audit.
* Per categoría (BR-QUOTE-023).
* HITL informativo (FR-AI-006 + BR-AI-002).

### Assumptions

* US-052 entregó Quote schema; US-057/US-058 entregaron comparador.
* US-084 entregó AIProviderPort con locale.

### Dependencies

* US-052 (Quote creation), US-057 (compare endpoint), US-082 (event.language), US-084 (AI port locale contract), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-AI-006, FR-QUOTE-013, FR-I18N-005 |
| Use Case(s) | UC-AI-006, UC-QUOTE-006 |
| Business Rule(s) | BR-AI-001, BR-AI-002, BR-AI-003, BR-AI-005, BR-AI-011, BR-QUOTE-021, BR-QUOTE-023, BR-QUOTE-024 |
| Permission Rule(s) | Organizer dueño del evento |
| Data Entity / Entities | Quote, QuoteRequest, Event, AIRecommendation |
| API Endpoint(s) | POST /api/v1/events/:id/ai/quote-summary |
| NFR Reference(s) | NFR-AI-001, NFR-PERF-001 |
| Related ADR(s) | ADR-AI-001 |
| Related Document(s) | /docs/7 AI specs, /docs/9 §FR-AI-006/FR-QUOTE-013, /docs/4 §BR-AI/BR-QUOTE-023 |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope
* Selección automática de Quote ganadora (HITL).
* Negociación automática.
* Cache de resúmenes.
* Edición del summary por el user.
* Conversión FX entre quotes.

### Scope Notes
* HITL informativo + locale + snapshot audit.

---

## ✅ Acceptance Criteria

### AC-01: Generación válida ≥2 quotes
**Given** comparador con `category_code='catering'`, ≥2 quotes activas, event con `language='pt'`
**When** `POST /api/v1/events/:id/ai/quote-summary` body `{category_code}`
**Then** `aiProviderPort.generate` con `locale='pt'` retorna JSON estructurado; `AIRecommendation` persistida con type='quote_compare_summary', locale='pt', quote_ids_snapshot, payload; responde `200` con summaries.

### AC-02: Persistencia con snapshot
**Given** generación exitosa
**When** se consulta `AIRecommendation`
**Then** payload incluye `quote_ids_snapshot`, `category_code`, `prompt_version='v1'`, `summaries[]`.

### AC-03: HITL informativo
**Given** summary generado
**When** se renderiza en UI
**Then** muestra pros/cons/missing_info/notes por quote SIN botón "Marcar mejor automáticamente". User debe usar US-058 (mark preferred) explícitamente.

### AC-04: Locale binding correcto
**Given** event con `language='en'`
**When** se genera summary
**Then** output en inglés + `AIRecommendation.locale='en'`.

### AC-05: Fallback si AI falla
**Given** AI provider timeout
**When** se intenta generar
**Then** AIRecommendation con `locale_fallback=true` + payload con mensaje estático "Resumen IA temporalmente no disponible."

---

## ⚠️ Edge Cases

### EC-01: Solo 1 quote elegible
`400 INSUFFICIENT_QUOTES` con `details.eligible_count=1`.

### EC-02: Categoría inválida o sin quotes
`400 INVALID_FILTERS` con `details.field='category_code'`.

### EC-03: Output AI malformado
Fallback (D9) + `locale_fallback=true`.

### EC-04: Rate limit excedido
`429 AI_RATE_LIMITED` con `details.retry_after_seconds`.

### EC-05: Quotes cambian post-generación
AIRecommendation conserva snapshot; UI muestra banner sugiriendo regenerar.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `category_code` requerido | `400 INVALID_FILTERS` |
| VR-02 | ≥2 quotes activas en categoría | `400 INSUFFICIENT_QUOTES` |
| VR-03 | Quotes del evento del organizer (ownership) | `404 EVENT_NOT_FOUND` uniforme |
| VR-04 | DTO `.strict()` | `400 INVALID_BODY` |
| VR-05 | Rate limit | `429 AI_RATE_LIMITED` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `organizer` + ownership del evento |
| SEC-02 | Rate limit AI 5/min/user |
| SEC-03 | Backend-only AI invocation |
| SEC-04 | `404 EVENT_NOT_FOUND` uniforme |
| SEC-05 | HITL: NO marca preferred automáticamente |

### Negative Authorization Scenarios
* Sin sesión → 401; ajeno → 404; vendor/admin → 403.

---

## 🤖 AI Behavior

### AI Involvement
* AI Feature: AI-006 (Resumen comparador)
* Provider Layer: `AIProviderPort` (US-084) con locale obligatorio
* Human Validation Required: Yes (informativo, no decide)
* Persist AIRecommendation: Yes
* Fallback Required: Yes

### AI Input
Contexto del prompt:
- `category_name`, `event_title`, `event_currency`, `event_date`.
- `quotes`: array con `{quote_id, vendor_business_name, total_price, valid_until, breakdown, conditions, status, rating_avg?}`.

### AI Output
JSON validado Zod:
```json
{
  "summaries": [
    {
      "quote_id": "<uuid>",
      "pros": ["..."],
      "cons": ["..."],
      "missing_info": ["..."],
      "notes": "..."
    }
  ],
  "overall_observations": "..."
}
```

### Human-in-the-loop Rules
* IA NO marca preferred.
* UI deja al usuario decidir.
* AIRecommendation persiste para audit; no es decision.

### AI Error / Fallback Behavior
* Timeout 30s → fallback template estático en es-LATAM con disclaimer + locale_fallback=true.
* Output unparseable → idem fallback.

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | `/[locale]/organizer/events/:id/quotes/compare` |
| Main UI Pattern | Tabla comparativa (US-057) + `AIComparisonSummary` panel lateral derecho |
| Primary Action | "Marcar preferred" (US-058) por quote |
| Secondary Actions | "Resumir con IA" (trigger panel), "Cerrar panel", "Regenerar" |
| Empty State | "Resumen IA disponible al tener ≥2 quotes activas en la categoría" |
| Loading State | Skeleton dentro del panel |
| Error State | Banner con retry |
| Success State | Panel con summaries por quote (disclosure) + overall_observations + fecha de generación |
| Accessibility | Panel `role="complementary"` + headings semánticos + keyboard nav |
| Responsive | Mobile: panel se convierte en modal/drawer |
| i18n | Output del LLM en `event.language`; UI shell en `user locale` |
| Currency | `<MoneyDisplay>` para valores en breakdown |

---

## 🛠 Technical Notes

### Frontend
* Components: `QuoteComparator` (US-057), `AIComparisonSummary` panel.
* State: TanStack mutation + invalidate sobre `['ai-recommendations', eventId]`.
* Forms: N/A.
* API: `aiApi.generateQuoteSummary({eventId, categoryCode})`.

### Backend
* Use Case: `GenerateQuoteSummaryUseCase` con AIProviderPort + persistencia.
* Controller / Route: `POST /api/v1/events/:id/ai/quote-summary`.
* Authorization: organizer + ownership.
* Validation: Zod `.strict()` + output schema Zod.
* Transaction: No (solo INSERT AIRecommendation).
* Rate limit middleware.

### Database
* Tablas: `ai_recommendations` (insert), `quotes` (read), `events` (read).
* Indexes: `(event_id, recommendation_type, created_at DESC)` ya existente.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/events/:id/ai/quote-summary` | Generar resumen IA del comparador |

#### Request body
```json
{ "category_code": "catering" }
```

#### Response 200
```json
{
  "ai_recommendation_id": "<uuid>",
  "summaries": [...],
  "overall_observations": "...",
  "locale": "pt",
  "locale_fallback": false,
  "generated_at": "2026-..."
}
```

### Observability
* Correlation ID: Yes
* Log: `ai.quote_summary.requested`, `ai.quote_summary.generated`, `ai.locale.applied`, `ai.locale.fallback` (si aplica).
* AdminAction: No.
* AIRecommendation: Yes.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Generación con 2 quotes en es-LATAM | Integration |
| TS-02 | Generación con 5 quotes en pt + locale binding correcto | Integration |
| TS-03 | E2E desde comparador con panel lateral | E2E |
| TS-04 | AIRecommendation persiste snapshot + locale + payload | Integration |
| TS-05 | Output Zod validation pasa | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | 1 quote elegible | `400 INSUFFICIENT_QUOTES` |
| NT-02 | Sin category_code | `400 INVALID_FILTERS` |
| NT-03 | Event ajeno | `404 EVENT_NOT_FOUND` |
| NT-04 | Rate limit excedido | `429 AI_RATE_LIMITED` |
| NT-05 | Output AI malformado | Fallback con locale_fallback=true |

### AI Tests
| ID | Scenario | Expected |
|---|---|---|
| AI-TS-01 | Mock retorna JSON válido | Persiste + panel renderiza |
| AI-TS-02 | Mock timeout 30s | Fallback aplica |
| AI-TS-03 | Mock retorna texto malformado | Fallback aplica |
| AI-TS-04 | Heurística output PT detecta tokens portugueses | Verificado |

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño | 200 |
| AUTH-TS-02 | Organizer ajeno | 404 |
| AUTH-TS-03 | Vendor/Admin | 403 |
| AUTH-TS-04 | Sin sesión | 401 |

### Accessibility
* Panel `role="complementary"` + keyboard nav + axe.

### Performance
* `< 5s p95` para llamada al provider (heredado de patrón AI).

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Tiempo a decisión del organizer + adopción de comparador |
| Expected Impact | Decisión informada con HITL claro |
| Success Criteria | ≥40% organizers pide resumen al comparar |
| Academic Demo Value | Demo AI informativa con HITL strict + locale + audit |

---

## 🧩 Task Breakdown Readiness

* FE: `AIComparisonSummary` panel + integración con US-057 + i18n.
* BE: UseCase + prompt template v1 + Zod output schema + Controller + rate limit middleware.
* DB: Sin migraciones.
* QA: UT, IT (incluye locale + fallback), AI mocks, AUTH, A11Y, performance.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con locale binding (US-084).
* [ ] Panel lateral accesible.
* [ ] HITL enforced (sin auto-preferred).
* [ ] Snapshot quote_ids persistido.
* [ ] Fallback template + locale_fallback flag.
* [ ] Tests verdes (incluye heurística output).
* [ ] PO valida demo.

---

## 📝 Notes

* Should Have (P2) per backlog.
* Locale binding obligatorio per US-084 D5.
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-022-decision-resolution.md`.
