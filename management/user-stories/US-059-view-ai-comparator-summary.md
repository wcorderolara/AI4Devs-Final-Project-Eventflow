# 🧾 User Story: Ver `AIComparisonSummary` panel con último resumen IA o CTA generar (surface US-022)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-059 |
| Backlog Item | PB-P2-001 — Resumen IA del comparador |
| Epic | EPIC-CMP-001 / EPIC-AI-001 |
| Feature | 2 endpoints GET + componente shared con US-022 + render condicional (loading/empty+CTA/filled/stale/fallback) |
| Module / Domain | Booking / AI |
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

**As an** organizador en el comparador
**I want** ver el último resumen IA persistido o un CTA "Resumir con IA" si no existe, con indicador stale si las quotes cambiaron desde la generación
**So that** evalúe pros/contras antes de marcar preferred sin re-generar innecesariamente (HITL informativo)

---

## 🧠 Business Context

### Context Summary

US-059 cierra PB-P2-001. Es **surface UI consumiendo** el endpoint generate de US-022 + 2 nuevos endpoints GET para fetch del último/específico AIRecommendation. Reuso 100% del componente `AIComparisonSummary` definido en spec de US-022 (esta US solo añade hooks de fetch + lógica CTA). Authorization: organizer dueño del evento.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | 2 endpoints: `GET /events/:eventId/ai/quote-summary?category_code=` (último por category) + `GET /ai-recommendations/:id` (audit). |
| D2 | Reuso 100% del componente shared `AIComparisonSummary` de US-022 + hook `useLatestQuoteSummary`. |
| D3 | Estados: Loading / Empty+CTA / Filled / Stale (banner) / Fallback (badge "no disponible en idioma"). |
| D4 | Stale indicator heredado US-022 D8: hook compara snapshot vs current quotes. |
| D5 | Authorization: organizer dueño del evento. `404 AI_RECOMMENDATION_NOT_FOUND` uniforme. |
| D6 | Solo último por (event, category) en MVP. History opcional post-MVP. |
| D7 | Layout panel lateral derecho + mobile drawer. |

### Related Domain Concepts

* `AIComparisonSummary` panel shared (de US-022).
* AIRecommendation type='quote_compare_summary' last-fetch.
* Stale snapshot indicator.
* CTA → US-022 mutation.

### Assumptions

* US-022 entregó endpoint POST + componente panel + persistencia.
* US-057 entregó comparador y cache de quotes.

### Dependencies

* US-022 (POST generate + componente), US-057 (comparador + cache quotes), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-AI-006, FR-QUOTE-013 |
| Use Case(s) | UC-AI-006 |
| Business Rule(s) | BR-AI-002, BR-AI-005, BR-QUOTE-024 |
| Permission Rule(s) | Organizer dueño del evento |
| Data Entity / Entities | AIRecommendation, Event |
| API Endpoint(s) | GET /api/v1/events/:eventId/ai/quote-summary, GET /api/v1/ai-recommendations/:id |
| NFR Reference(s) | NFR-AI-001, NFR-PERF-001 |
| Related ADR(s) | ADR-AI-001 |
| Related Document(s) | /docs/7 AI-006, /docs/9 §FR-AI-006/FR-QUOTE-013 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Should Have

### Explicitly Out of Scope
* Generación (vive en US-022).
* Selección automática preferred (HITL).
* History de versiones anteriores.
* Edit/delete del summary.

### Scope Notes
* Surface UI puro + 2 GETs.

---

## ✅ Acceptance Criteria

### AC-01: Panel render con summary existente
**Given** AIRecommendation existe para (event, category)
**When** se carga `/quotes/compare`
**Then** panel render con summaries + timestamp + locale info + `is_stale=false` (si snapshot coincide con current quotes).

### AC-02: Empty state con CTA
**Given** no existe AIRecommendation para (event, category)
**When** se carga
**Then** panel muestra empty state "Aún no hay resumen IA" + CTA "Resumir con IA" (botón llama mutation de US-022).

### AC-03: Stale indicator
**Given** AIRecommendation existe pero `payload.quote_ids_snapshot ≠ current quotes`
**When** se renderiza
**Then** banner "Las quotes han cambiado desde este resumen, [Regenerar]" (CTA llama US-022).

### AC-04: Fallback badge
**Given** AIRecommendation con `locale_fallback=true`
**When** se renderiza
**Then** badge "Resumen no disponible en {event.language}; muestra mensaje estático".

### AC-05: Endpoint por recommendation_id
**Given** request `GET /ai-recommendations/:id` de organizer dueño
**When** se ejecuta
**Then** `200` con AIRecommendation completo.

---

## ⚠️ Edge Cases

### EC-01: AIRecommendation ajeno
**Given** AIRecommendation pertenece a otro organizer
**When** GET
**Then** `404 AI_RECOMMENDATION_NOT_FOUND` uniforme.

### EC-02: AIRecommendation inexistente
`404 AI_RECOMMENDATION_NOT_FOUND`.

### EC-03: UUID malformado
`400 INVALID_UUID`.

### EC-04: Sin category_code en GET endpoint
`400 INVALID_FILTERS`.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:eventId` UUID válido | `400 INVALID_UUID` |
| VR-02 | `:id` UUID válido | `400 INVALID_UUID` |
| VR-03 | `category_code` requerido | `400 INVALID_FILTERS` |
| VR-04 | Organizer dueño del evento | `404 AI_RECOMMENDATION_NOT_FOUND` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión `organizer` |
| SEC-02 | Ownership del evento |
| SEC-03 | `404 AI_RECOMMENDATION_NOT_FOUND` uniforme |
| SEC-04 | Solo lectura (sin side-effects) |

### Negative Authorization Scenarios
* Sin sesión → 401; ajeno → 404; vendor/admin → 403.

---

## 🤖 AI Behavior

### AI Involvement
* AI Feature: AI-006 (surface UI)
* Provider Layer: N/A (solo consume persistencia)
* Human Validation Required: Yes (informativo)
* Persist AIRecommendation: No (solo lectura)
* Fallback Required: No

### AI Input
- `recommendation_id` o `eventId+category_code`.

### AI Output
- JSON con `summaries[]`, `overall_observations`, `locale`, `locale_fallback`, `generated_at`, `quote_ids_snapshot`.

### Human-in-the-loop Rules
* IA no actúa por el usuario.
* User decide marcar preferred (US-058).

### AI Error / Fallback Behavior
* Si no existe ⇒ empty state con CTA, NO error.

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | `/[locale]/organizer/events/:id/quotes/compare` |
| Main UI Pattern | Panel lateral derecho `role="complementary"` (paridad US-022) |
| Primary Action | "Marcar preferred" (US-058) por quote en tabla |
| Secondary Actions | "Cerrar panel", "Regenerar" (cuando stale), "Resumir con IA" (cuando empty) |
| Empty State | "Aún no hay resumen IA generado para esta categoría" + CTA |
| Loading State | Skeleton dentro del panel |
| Error State | Banner con retry |
| Success State | Summaries renderizadas con Disclosure por quote + timestamp |
| Accessibility | `role="complementary"` + headings + keyboard nav |
| Responsive | Mobile: collapse a drawer/sheet |
| i18n | UI shell en `user locale`; contenido en `event.language` |
| Currency | `<MoneyDisplay>` reutilizado |

---

## 🛠 Technical Notes

### Frontend
* Components: reuso 100% `AIComparisonSummary` de US-022.
* Hooks:
  - `useLatestQuoteSummary({eventId, categoryCode})`: TanStack Query con `queryKey: ['ai.quote-summary', eventId, categoryCode]`.
  - `useAIRecommendation({recommendationId})`: optional for audit/deep-link.
* API: `aiApi.getLatestQuoteSummary`, `aiApi.getRecommendation`.

### Backend
* Use Case: `GetLatestQuoteSummaryUseCase` + `GetAIRecommendationUseCase`.
* Controllers: 2 GETs.
* Authorization: ownership.
* Validation: Zod.
* Transaction: No.

### Database
* Tablas: `ai_recommendations` (read), `events` (read for ownership).
* Indexes: `(event_id, recommendation_type, created_at DESC)` ya existente.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/events/:eventId/ai/quote-summary?category_code=<slug>` | Último AIRecommendation por (event, category) |
| GET | `/api/v1/ai-recommendations/:id` | Detalle específico por id |

#### Response 200 (ambos endpoints)
```json
{
  "id": "<uuid>",
  "event_id": "<uuid>",
  "recommendation_type": "quote_compare_summary",
  "payload": {
    "summaries": [...],
    "overall_observations": "...",
    "quote_ids_snapshot": ["<uuid>", ...],
    "category_code": "catering",
    "prompt_version": "v1"
  },
  "locale": "pt",
  "locale_fallback": false,
  "created_at": "2026-..."
}
```

### Observability
* Correlation ID: Yes
* Log: estándar (no AdminAction, no AIRecommendation persistido).

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | GET por event+category retorna último | Integration |
| TS-02 | GET por id específico | Integration |
| TS-03 | Empty state + CTA si no existe | E2E |
| TS-04 | Stale indicator si snapshot mismatch | E2E |
| TS-05 | Fallback badge si locale_fallback=true | E2E |
| TS-06 | Panel accesible y responsive | A11Y / E2E |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | AIRecommendation ajena | `404 AI_RECOMMENDATION_NOT_FOUND` |
| NT-02 | Inexistente | `404 AI_RECOMMENDATION_NOT_FOUND` |
| NT-03 | UUID malformado | `400 INVALID_UUID` |
| NT-04 | Sin category_code | `400 INVALID_FILTERS` |
| NT-05 | Sin sesión | `401` |
| NT-06 | Vendor/Admin | `403` |

### AI Tests
| ID | Scenario | Expected |
|---|---|---|
| AI-TS-01 | Sin AIRecommendation, panel muestra CTA | OK |
| AI-TS-02 | Snapshot mismatch detectado | Banner stale visible |

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño | 200 |
| AUTH-TS-02 | Organizer ajeno | 404 |
| AUTH-TS-03 | Vendor/Admin | 403 |
| AUTH-TS-04 | Sin sesión | 401 |

### Accessibility
* Panel + estados accesibles.

### Performance
* `< 500ms p95` (solo lectura DB).

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Adopción de resumen IA + reduce regenerations innecesarias |
| Expected Impact | UX clara con estado siempre visible |
| Success Criteria | Panel funcional con 5 estados (loading/empty/filled/stale/fallback) |
| Academic Demo Value | Surface UI completa del feature AI-006 |

---

## 🧩 Task Breakdown Readiness

* FE: hook + lógica empty/stale/fallback + integración (reuso panel US-022) + i18n.
* BE: 2 UseCases + 2 controllers.
* QA: UT + IT + AUTH + A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] 2 endpoints funcionales.
* [ ] Panel con 5 estados.
* [ ] Stale indicator funcional.
* [ ] Reuso 100% componente US-022.
* [ ] Tests verdes.
* [ ] i18n labels en 4 locales.

---

## 📝 Notes

* Coordinar con US-022 (depende del componente y endpoint generate).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-059-decision-resolution.md`.
