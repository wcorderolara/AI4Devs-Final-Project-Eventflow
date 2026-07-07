# 🧾 User Story: Top 3 tareas urgentes priorizadas por IA (HITL informativo + cache 5min + locale binding)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-024 |
| Backlog Item | PB-P2-002 — Priorización IA Top 3 |
| Epic | EPIC-AI-001 / EPIC-TASK-001 |
| Feature | `POST /events/:id/ai/task-priority` + `AITaskPriorityCard` + cache signature + locale binding |
| Module / Domain | AI / Tasks |
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

**As an** organizador con un checklist activo
**I want** ver hasta 3 tareas más urgentes priorizadas por IA en mi dashboard, con razón corta y urgency_score, regeneradas con cache 5min para evitar redundancia
**So that** sepa exactamente en qué enfocarme sin que la IA tome decisiones por mí (HITL informativo)

---

## 🧠 Business Context

### Context Summary

US-024 single-story de PB-P2-002. AI-008 ordena tareas confirmadas por urgencia considerando `due_date`, `priority`, dependencias y faltantes. Retorna top max 3 con razón corta + urgency_score. HITL strict: no reordena ni modifica tareas oficiales. Cache 5 min con signature para evitar llamadas redundantes. Locale binding per US-084.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | Prompt `TaskPriorityPrompt v1` + Zod output schema (top max 3, reason max 200, urgency_score 1..10). |
| D2 | Locale binding US-084: `aiProviderPort.generate({locale: event.language})`. |
| D3 | Tareas elegibles: `status IN ('pending','in_progress') AND is_ai_pending=false`. |
| D4 | Cache server-side 5 min TTL con signature (hash de task_ids + status + updated_at). |
| D5 | Rate limit 5 req/min/user heredado. |
| D6 | Empty state: 0 tasks elegibles → `top:[]` + UI sugerencia. |
| D7 | Max 3 items; menos si pocas tareas. |
| D8 | AIRecommendation persistencia con audit (snapshot + signature + cache_hit). |
| D9 | Fallback template estático + locale_fallback=true. |

### Related Domain Concepts

* `AIRecommendation.recommendation_type='task_priority'`.
* Cache signature por checklist state.
* HITL informativo (no reordena).
* Locale binding US-084.

### Assumptions

* US-027/US-028/US-031 entregaron tasks con `is_ai_pending` flag.
* US-082/US-084 entregaron event.language + AIProviderPort.

### Dependencies

* US-028 (manual task), US-031 (bulk confirm AI tasks), US-082 (event.language), US-084 (AI port locale), US-022 (rate limit middleware), PB-P0-001.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-AI-008, FR-I18N-005 |
| Use Case(s) | UC-AI-008 |
| Business Rule(s) | BR-AI-001, BR-AI-002, BR-AI-003, BR-AI-005, BR-AI-011, BR-TASK-009 |
| Permission Rule(s) | Organizer dueño del evento |
| Data Entity / Entities | EventTask, AIRecommendation, Event |
| API Endpoint(s) | POST /api/v1/events/:id/ai/task-priority |
| NFR Reference(s) | NFR-AI-001, NFR-PERF-001 |
| Related ADR(s) | ADR-AI-001 |
| Related Document(s) | /docs/7 AI-008, /docs/9 §FR-AI-008, /docs/4 §BR-AI |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Should Have

### Explicitly Out of Scope
* Reordenamiento automático del checklist (HITL).
* Notificaciones push.
* Edit del top por user.
* Multi-event priorización.

### Scope Notes
* Solo informativo + cache + locale.

---

## ✅ Acceptance Criteria

### AC-01: Top 3 priorizadas (max)
**Given** event con 10 tareas elegibles
**When** `POST /api/v1/events/:id/ai/task-priority`
**Then** `200` con `{top: [3 items], rationale_summary?}` + AIRecommendation persistido con audit.

### AC-02: Empty state sin tareas
**Given** 0 tareas elegibles
**When** se solicita
**Then** `200` con `{top: []}`. UI muestra sugerencia "Generar checklist IA" (deep-link US-018).

### AC-03: Pocas tareas (<3)
**Given** solo 2 tareas elegibles
**When** se solicita
**Then** `top` con 2 items (no falla por requerir 3).

### AC-04: Cache hit dentro de 5min
**Given** segunda request con mismo signature dentro de 5min
**When** se ejecuta
**Then** `200` con mismo payload + `cache_hit=true` en AIRecommendation; NO se llama al AI provider.

### AC-05: Cache miss tras cambio en checklist
**Given** task editada/completada después de generación
**When** se solicita
**Then** signature cambia, cache miss, nueva llamada AI, nuevo AIRecommendation.

### AC-06: Locale binding correcto
**Given** event con `language='pt'`
**When** se ejecuta
**Then** output en portugués + `AIRecommendation.locale='pt'`.

### AC-07: Fallback si AI falla
**Given** AI provider timeout o output malformado
**When** se intenta
**Then** fallback payload + `locale_fallback=true` + UI mensaje claro.

---

## ⚠️ Edge Cases

### EC-01: Rate limit excedido
`429 AI_RATE_LIMITED`.

### EC-02: Event ajeno
`404 EVENT_NOT_FOUND`.

### EC-03: Tareas con `is_ai_pending=true`
Excluidas del input (solo confirmadas).

### EC-04: AI output sin task_ids válidos
Validación Zod: rechaza task_ids que no estén en el set elegible. Fallback si todos inválidos.

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | `:id` UUID | `400 INVALID_UUID` |
| VR-02 | Organizer dueño | `404 EVENT_NOT_FOUND` |
| VR-03 | Rate limit | `429 AI_RATE_LIMITED` |
| VR-04 | Output AI con task_ids válidos del set elegible | Fallback si falla |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Sesión organizer + ownership |
| SEC-02 | Rate limit AI 5/min/user |
| SEC-03 | Backend-only AI |
| SEC-04 | `404 EVENT_NOT_FOUND` uniforme |
| SEC-05 | HITL: NO altera estado de tasks |

### Negative Authorization Scenarios
* Sin sesión → 401; ajeno → 404; vendor/admin → 403.

---

## 🤖 AI Behavior

### AI Involvement
* AI Feature: AI-008 (Priorización tareas)
* Provider Layer: `AIProviderPort` (US-084) con locale obligatorio
* Human Validation Required: Yes (informativo)
* Persist AIRecommendation: Yes
* Fallback Required: Yes

### AI Input
Contexto del prompt:
- `event_title`, `event_date`, `event_currency`.
- `tasks`: array con `{task_id, title, due_date, priority, status, dependencies?}`.

### AI Output
JSON validado Zod:
```json
{
  "top": [
    { "task_id": "<uuid>", "reason": "max 200 chars", "urgency_score": 1-10 }
  ],
  "rationale_summary": "max 300 chars (opcional)"
}
```

### Human-in-the-loop Rules
* IA NO reordena tasks oficiales.
* IA NO marca done.
* User decide qué hacer en checklist (US-030).

### AI Error / Fallback Behavior
* Timeout 30s → fallback.
* Output unparseable o task_ids inválidos → fallback.

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | `/[locale]/organizer/events/:id` dashboard + tarjeta "Prioridades IA" |
| Main UI Pattern | `AITaskPriorityCard` con top 3 (task title + reason + urgency badge color por score) |
| Primary Action | "Marcar como hecho" (deep-link US-030) por task |
| Secondary Actions | "Regenerar" (force cache miss), "Ver checklist completo" |
| Empty State | "Sin tareas urgentes. [Generar checklist IA]" deep-link US-018 |
| Loading State | Skeleton de 3 cards |
| Error State | Banner con retry |
| Success State | Tarjeta con top + timestamp + cache indicator |
| Accessibility | Lista `role="list"` + items con headings + axe |
| Responsive | Mobile-first; cards apiladas |
| i18n | UI shell en user locale; reason content en `event.language` |
| Currency | No aplica |

---

## 🛠 Technical Notes

### Frontend
* Components: `AITaskPriorityCard` (Client Component).
* State: TanStack mutation `useTaskPriority` con queryKey `['ai.task-priority', eventId]`.
* API: `aiApi.generateTaskPriority({eventId})`.

### Backend
* Use Case: `PrioritizeTasksUseCase` con cache wrapper + AIProviderPort.
* Cache: `TaskPriorityCacheService` (in-memory shared, paridad MetricsCacheService US-079).
* Controller / Route: `POST /api/v1/events/:id/ai/task-priority`.
* Authorization: organizer + ownership.
* Validation: Zod `.strict()`.
* Rate limit: middleware shared.

### Database
* Tablas: `ai_recommendations` (insert), `event_tasks` (read), `events` (read).
* Indexes: `(event_id, status)` ya existente.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/events/:id/ai/task-priority` | Generar top 3 tasks urgentes IA |

#### Response 200
```json
{
  "ai_recommendation_id": "<uuid>",
  "top": [
    { "task_id": "<uuid>", "reason": "...", "urgency_score": 9 }
  ],
  "rationale_summary": "...",
  "locale": "pt",
  "locale_fallback": false,
  "cache_hit": false,
  "generated_at": "2026-..."
}
```

### Observability
* Correlation ID: Yes
* Log: `ai.task_priority.requested`, `ai.task_priority.cache.hit/miss`, `ai.task_priority.generated`, `ai.task_priority.output_malformed`.
* AIRecommendation: Yes.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Top 3 desde 10 tareas con cache miss | Integration |
| TS-02 | Cache hit dentro de 5min | Integration |
| TS-03 | Cache miss tras editar task (signature change) | Integration |
| TS-04 | Pocas tareas (<3) retorna todas elegibles | Integration |
| TS-05 | Empty state cuando 0 elegibles | Integration |
| TS-06 | Locale binding pt | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Event ajeno | `404 EVENT_NOT_FOUND` |
| NT-02 | Vendor/Admin | `403` |
| NT-03 | Sin sesión | `401` |
| NT-04 | Rate limit | `429 AI_RATE_LIMITED` |
| NT-05 | Output AI malformado | Fallback aplicado |
| NT-06 | task_ids invalid en output | Fallback aplicado |

### AI Tests
| ID | Scenario | Expected |
|---|---|---|
| AI-TS-01 | Mock retorna 3 items válidos | Persiste + card renderiza |
| AI-TS-02 | Mock timeout | Fallback |
| AI-TS-03 | Mock retorna texto malformado | Fallback |
| AI-TS-04 | Heurística output PT | Tokens verificados |

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Organizer dueño | 200 |
| AUTH-TS-02 | Organizer ajeno | 404 |
| AUTH-TS-03 | Vendor/Admin | 403 |
| AUTH-TS-04 | Sin sesión | 401 |

### Accessibility
* Card accesible + keyboard nav + axe.

### Performance
* Cache hit `< 200ms`; cache miss `< 5s p95`.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Progreso tareas + tiempo a decisión |
| Expected Impact | Focus claro en próxima acción |
| Success Criteria | ≥30% tareas IA top 3 completadas en 48h |
| Academic Demo Value | Demo AI informativa con HITL + cache + locale |

---

## 🧩 Task Breakdown Readiness

* FE: `AITaskPriorityCard` + hook + i18n.
* BE: UseCase + Cache service + Prompt v1 + Zod output + Controller.
* QA: UT, IT (cache + locale), AI mocks, AUTH, A11Y.

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con cache 5min + signature.
* [ ] HITL enforced (no altera tasks).
* [ ] Locale binding (US-084).
* [ ] Fallback + locale_fallback.
* [ ] Tests verdes con heurísticas locale.
* [ ] i18n labels.

---

## 📝 Notes

* Should Have (P2).
* Cumple contrato AI binding US-084.
* Pattern paridad US-022 (AI summary).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-024-decision-resolution.md`.
