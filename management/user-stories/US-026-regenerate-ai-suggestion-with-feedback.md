# 🧾 User Story: Regenerar `AIRecommendation` con feedback (cross-cutting, max 5 por linaje + autorización polimórfica)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-026 |
| Backlog Item | PB-P2-003 — Regeneración IA con feedback |
| Epic | EPIC-AI-001 (transversal a todas las features AI) |
| Feature | `POST /ai-recommendations/:id/regenerate` + schema parent_id/root_id + PromptOps inject helper + auth polimórfica + dialog |
| Module / Domain | AI / Cross-cutting |
| User Role | Organizer / Vendor (según type del parent) |
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

**As a** usuario (organizer o vendor según type) que recibió una sugerencia IA y quiere mejorarla
**I want** solicitar regeneración añadiendo feedback breve (max 500 chars), respetando un máximo de 5 regeneraciones por linaje y rate-limit
**So that** la IA produzca una versión más alineada a mi intención sin abuso de cómputo (HITL informativo iterativo)

---

## 🧠 Business Context

### Context Summary

US-026 single-story de PB-P2-003. **Cross-cutting feature** aplicable a CUALQUIER `AIRecommendation` type (plan, checklist, budget, categories, brief, summary, task_priority, quote_compare_summary). Schema extiende `ai_recommendations` con `parent_recommendation_id` + `root_recommendation_id` + `regeneration_feedback`. Decisión PO: max 5 regeneraciones por linaje raíz (configurable env). Authorization polimórfica por type.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Migración menor: 3 columnas (`parent_id`, `root_id`, `regeneration_feedback`) + FKs + indexes + backfill. |
| D2 | Counting por **linaje raíz** (no parent directo) — evita escape walking. |
| D3 | `root_id` set en INSERT como `parent.root_id ?? parent.id` (o `self.id` para originales). |
| D4 | Estado parent: cualquier no eliminada; EC-02 reescrito. |
| D5 | Locale hereda del parent (consistencia experiencia). |
| D6 | Helper `injectFeedbackForRegeneration` PromptOps shared. |
| D7 | Authorization polimórfica: mapping `type → owner` (organizer vs vendor). |
| D8 | Rate limit 5/min/user heredado de US-022. |
| D9 | Fallback idéntico al use case original; persiste child con `locale_fallback=true`. |
| D10 | `AI_MAX_REGENERATIONS_PER_LINEAGE=5` env var configurable. |

### Related Domain Concepts

* AIRecommendation con linaje (parent + root).
* Helper PromptOps inject feedback.
* Owner resolver polimórfico.
* HITL iterativo.

### Assumptions

* US-017..US-024 + US-022 + US-082 + US-084 entregaron AIProviderPort + use cases por type.
* Rate limit middleware shared disponible.

### Dependencies

* US-017..US-024 (AI use cases), US-022 (rate limit), US-082 (event.language), US-084 (AIProviderPort locale), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-AI-018, FR-AI-014, FR-AI-015 |
| Use Case(s) | UC-AI-010 |
| Business Rule(s) | BR-AI-002, BR-AI-005, BR-AI-008, BR-AI-009, BR-AI-010, BR-AI-011, Decisión PO US-026 (cap 5) |
| Permission Rule(s) | Polimórfica por type del parent |
| Data Entity / Entities | AIRecommendation (parent_id, root_id, feedback) |
| API Endpoint(s) | POST /api/v1/ai-recommendations/:id/regenerate |
| NFR Reference(s) | NFR-AI-001, NFR-PERF-001 |
| Related ADR(s) | ADR-AI-001 |
| Related Document(s) | /docs/7 AI specs, /docs/4 §BR-AI, /docs/9 §FR-AI-018 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Should Have

### Explicitly Out of Scope
* Regeneración ilimitada.
* Feedback estructurado complejo (form fields). Solo texto corto.
* Comparison side-by-side parent vs child.
* Auto-rollback al parent.
* Streaming regeneration (SSE).

### Scope Notes
* Cross-cutting + schema migration + helper PromptOps + polimórfico.

---

## ✅ Acceptance Criteria

### AC-01: Regeneración exitosa con feedback
**Given** AIRecommendation parent con `recommendation_type='event_plan'` del organizer dueño
**When** `POST /ai-recommendations/:id/regenerate` body `{feedback: "Necesito menos formal"}`
**Then** `201` con nuevo child AIRecommendation: `parent_id=:id`, `root_id=parent.root_id || parent.id`, `regeneration_feedback="Necesito menos formal"`, `locale=parent.locale`, `recommendation_type='event_plan'`, payload IA regenerado.

### AC-02: Límite alcanzado en linaje
**Given** linaje con 5 regeneraciones (root + 4 children, o cualquier configuración con 5 children)
**When** intenta regenerar de cualquier nodo del linaje
**Then** `429 REGENERATION_LIMIT` con `details: {current_count: 5, max: 5}`.

### AC-03: Feedback vacío permitido
**Given** body sin feedback (null/empty)
**When** POST
**Then** `201` con child generado solo con prompt base + bloque feedback "(sin feedback adicional)".

### AC-04: Padre eliminado
**Given** parent soft-deleted o eliminado
**When** POST
**Then** `404 AI_RECOMMENDATION_NOT_FOUND` (uniforme).

### AC-05: Authorization polimórfica
**Given** parent de type='quote_brief' que pertenece a vendor
**When** organizer ajeno intenta regenerar
**Then** `404 AI_RECOMMENDATION_NOT_FOUND`.

### AC-06: Locale heredado del parent
**Given** parent con `locale='pt'`, event.language cambió a 'en' post-creación
**When** POST regenerate
**Then** child con `locale='pt'` (no 'en').

### AC-07: Rate limit
**Given** 5 requests al endpoint en 1 minuto del mismo user
**When** 6ª request
**Then** `429 AI_RATE_LIMITED` (rate limit distinto del REGENERATION_LIMIT).

### AC-08: Fallback aplicado
**Given** AI provider falla
**When** POST
**Then** child persistido con payload fallback + `locale_fallback=true`. Cuenta para el límite del linaje.

---

## ⚠️ Edge Cases

### EC-01: Feedback excede 500 chars
`400 INVALID_BODY` (Zod max 500).

### EC-02: Padre eliminado
`404 AI_RECOMMENDATION_NOT_FOUND`.

### EC-03: Type sin owner resolver
Si recommendation_type no está mapeado ⇒ `500 INTERNAL_ERROR` con log. (No debería pasar; defensiva.)

### EC-04: Feedback solo whitespace
Tratar como vacío (trim → empty string → permitido).

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | Feedback ≤500 chars trimmed | `400 INVALID_BODY` |
| VR-02 | Count linaje < AI_MAX_REGENERATIONS_PER_LINEAGE | `429 REGENERATION_LIMIT` |
| VR-03 | Parent existe (no soft-deleted) | `404 AI_RECOMMENDATION_NOT_FOUND` |
| VR-04 | Authorization polimórfica passes | `404 AI_RECOMMENDATION_NOT_FOUND` |
| VR-05 | Rate limit | `429 AI_RATE_LIMITED` |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Polimórfica por recommendation_type |
| SEC-02 | `404 AI_RECOMMENDATION_NOT_FOUND` uniforme |
| SEC-03 | Rate limit AI |
| SEC-04 | Backend-only AI invocation |
| SEC-05 | HITL: usuario controla cuándo regenerar |

### Negative Authorization Scenarios
* Sin sesión → 401; type sin owner match → 404.

---

## 🤖 AI Behavior

### AI Involvement
* AI Feature: Regeneración (transversal a todos los AI use cases)
* Provider Layer: `AIProviderPort` (US-084) con locale obligatorio
* Human Validation Required: Yes
* Persist AIRecommendation: Yes (nuevo child)
* Fallback Required: Yes

### AI Input
- Prompt base original (lookup por recommendation_type) + bloque `[USER_FEEDBACK_FOR_REGENERATION]` apendizado.
- Context similar al original use case por type.

### AI Output
- JSON estructurado equivalente al tipo original (Zod schema por type).

### Human-in-the-loop Rules
* Usuario decide cuándo regenerar.
* IA no marca/aplica nada automáticamente.

### AI Error / Fallback Behavior
* Timeout/error → fallback estático heredado del use case original + `locale_fallback=true`.
* Cuenta para el límite del linaje (audit).

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | Cualquier vista IA (dashboard, comparador, brief generator, etc.) |
| Main UI Pattern | `AIRegenerateDialog` modal con textarea + counter chars + warning si cerca del límite |
| Primary Action | "Regenerar" |
| Secondary Actions | "Cancelar" |
| Empty State | N/A (siempre tiene parent) |
| Loading State | Spinner con mensaje "Regenerando..." |
| Error State | Banner con tipos: rate limit / regeneration limit / AI failure |
| Success State | Toast "Nueva versión generada" + reload del context donde se muestra el child |
| Accessibility | Modal `role="dialog"` + focus trap + textarea con label + counter aria-live |
| Responsive | Mobile: drawer en lugar de modal |
| i18n | UI shell en user locale; output AI en parent.locale |
| Currency | Si aplica al type |

---

## 🛠 Technical Notes

### Frontend
* Component: `AIRegenerateDialog` shared (genérico para cualquier type).
* State: TanStack mutation `useRegenerateAIRecommendation`.
* Forms: RHF + Zod (feedback ≤500).
* API: `aiApi.regenerate({recommendationId, feedback})`.

### Backend
* Use Case: `RegenerateAIRecommendationUseCase` cross-cutting.
* Owner resolver: `AIRecommendationOwnerResolver` con mapping TYPE_OWNERSHIP.
* Prompt helper: `injectFeedbackForRegeneration`.
* Controller / Route: `POST /api/v1/ai-recommendations/:id/regenerate`.
* Authorization: polimórfica por type.
* Validation: Zod + linaje count + rate limit.
* Transaction: Sí (INSERT child atómico).

### Database
* Migración: 3 columnas + 2 FKs + 2 indexes + backfill.
* Indexes: `(root_recommendation_id)`, `(parent_recommendation_id)`.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/ai-recommendations/:id/regenerate` | Crear child AIRecommendation con feedback |

#### Request body
```json
{ "feedback": "Texto opcional ≤500 chars" }
```

#### Response 201
```json
{
  "id": "<uuid>",
  "parent_recommendation_id": "<uuid>",
  "root_recommendation_id": "<uuid>",
  "recommendation_type": "event_plan",
  "regeneration_feedback": "...",
  "payload": { ... },
  "locale": "pt",
  "locale_fallback": false,
  "created_at": "2026-..."
}
```

### Observability
* Correlation ID: Yes
* Log: `ai.regenerate.requested`, `ai.regenerate.generated`, `ai.regenerate.limit_exceeded`, `ai.regenerate.rate_limited`, `ai.regenerate.fallback`.
* AIRecommendation: Yes (nueva).

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Regeneración con feedback en linaje vacío | Integration |
| TS-02 | Regeneración 5ta exitosa | Integration |
| TS-03 | Regeneración 6ta ⇒ 429 REGENERATION_LIMIT | Integration |
| TS-04 | Feedback vacío ⇒ 201 con bloque placeholder | Integration |
| TS-05 | Authorization polimórfica vendor vs organizer | Integration |
| TS-06 | Locale heredado del parent (pt) | Integration |
| TS-07 | Fallback persiste child + cuenta para límite | Integration |
| TS-08 | Migration backfill root_id correcto | Migration test |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Feedback >500 chars | `400 INVALID_BODY` |
| NT-02 | Parent eliminado | `404 AI_RECOMMENDATION_NOT_FOUND` |
| NT-03 | Type sin owner mapping | `500 INTERNAL_ERROR` (defensiva) |
| NT-04 | Rate limit excedido | `429 AI_RATE_LIMITED` |

### AI Tests
| ID | Scenario | Expected |
|---|---|---|
| AI-TS-01 | Mock retorna variant válida | Child persistido |
| AI-TS-02 | Mock timeout | Fallback + locale_fallback=true |
| AI-TS-03 | Mock retorna output malformado | Fallback |

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño de event_plan parent | 201 |
| AUTH-TS-02 | Organizer ajeno | 404 |
| AUTH-TS-03 | Vendor dueño de quote_brief parent | 201 |
| AUTH-TS-04 | Vendor ajeno o type cruzado | 404 |
| AUTH-TS-05 | Sin sesión | 401 |

### Accessibility
* Dialog focus trap + textarea label + counter aria-live + axe.

### Performance
* `< 5s p95` provider call.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Calidad percibida de IA + aceptación final |
| Expected Impact | Mayor aceptación con menor abuso de cómputo |
| Success Criteria | ≥40% sugerencias regeneradas se aceptan finalmente |
| Academic Demo Value | Demo HITL iterativo + linaje persistente |

---

## 🧩 Task Breakdown Readiness

* DB: Migración 3 columnas + FKs + backfill.
* BE: UseCase + Owner resolver + Prompt helper + Controller.
* FE: Dialog shared + hook + i18n.
* QA: UT, IT (linaje + rate + fallback), AI mocks, AUTH polimórfico, A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional cross-cutting.
* [ ] Schema migrado + backfill validado.
* [ ] Authorization polimórfica enforced.
* [ ] Locale heredado.
* [ ] Cap 5 por linaje + rate limit verificados.
* [ ] Tests verdes con AI mocks por type.
* [ ] Dialog accesible.
* [ ] env var documentada.

---

## 📝 Notes

* Should Have (P2). Decisión PO ya confirma cap 5.
* Cumple contrato AI binding US-084.
* Authorization polimórfica reusable (futura admin moderation también puede usar).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-026-decision-resolution.md`.
