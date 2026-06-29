# 🧾 User Story: Dashboard admin de métricas operativas (sin métricas comerciales)

## 🆔 Metadata

| Field | Value |
|---|---|
| ID | US-079 |
| Backlog Item | PB-P1-045 — Dashboard de métricas operativas admin |
| Epic | EPIC-ADM-001 |
| Feature | Endpoint admin `GET /admin/metrics` con 7 secciones agregadas + caching server-side 60s |
| Module / Domain | Admin / Metrics |
| User Role | Admin |
| Priority | Must Have |
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

**As an** administrador
**I want** un dashboard de métricas operativas con 7 secciones agregadas (users, vendors, events, quotes, bookings, reviews, AI) y caching server-side de 60s
**So that** monitoree salud del sistema sin métricas comerciales y sin sobrecarga de queries agregadas (Decisión PO 8.1 #10 + FR-ADMIN-002)

---

## 🧠 Business Context

### Context Summary

US-079 single-story de PB-P1-045. Dashboard de **métricas operativas únicamente** (sin revenue, GMV ni comerciales). 7 secciones lógicas con counts agregados. Cache server-side 60s (key `admin:metrics:v1`) para evitar sobrecarga. Sin AdminAction (es lectura agregada, no acceso a entidad específica). Breakdown de AI por `recommendation_type` + success_count para health monitoring.

### PO/BA Decisions Applied

| # | Decisión |
|---|---|
| D1 | 7 secciones obligatorias per FR-ADMIN-002 (users, vendors, events, quotes, bookings, reviews, ai). |
| D2 | Snapshot actual MVP; filtros temporales post-MVP. |
| D3 | Caching server-side 60s in-memory + `Cache-Control: private, max-age=60`. |
| D4 | Sin AdminAction (solo log estándar). |
| D5 | AI breakdown por `recommendation_type` + `success_count`. |
| D6 | Response shape: 7 secciones + `generated_at`. |
| D7 | Sin métricas comerciales (revenue/GMV/ARPU prohibidos). |
| D8 | Performance: `< 200ms p95` cache hit, `< 3s p95` cache miss. |

### Related Domain Concepts

* Métricas agregadas COUNT/GROUP BY.
* Caching server-side TTL.
* Sin AdminAction.
* Health monitoring de AI.

### Assumptions

* Schemas existen para todas las entidades referenciadas.
* AdminGuard existe (US-067).

### Dependencies

* PB-P0-001, US-067 (AdminGuard), todas las US que crean entidades referenciadas.

---

## 🔗 Traceability

| Source | Reference |
|---|---|
| FRD Requirement(s) | FR-ADMIN-002 |
| Use Case(s) | UC-ADMIN-002 |
| Business Rule(s) | BR-ADMIN-005, BR-MVP-003 (sin comerciales) |
| Permission Rule(s) | Admin only |
| Data Entity / Entities | User, VendorProfile, Event, QuoteRequest, Quote, BookingIntent, Review, AIRecommendation |
| API Endpoint(s) | GET /api/v1/admin/metrics |
| NFR Reference(s) | NFR-PERF-001 |
| Related Document(s) | /docs/9 §FR-ADMIN-002, /docs/8 §UC-ADMIN-002, /docs/8.1 #10 |

---

## 🧭 Scope Guardrails

### MVP Scope
* In Scope
* Must Have

### Explicitly Out of Scope
* Métricas comerciales (revenue, GMV, ARPU, conversion monetaria).
* Filtros temporales (time_range).
* Drill-down a entidades específicas.
* Export CSV.
* Real-time / streaming metrics.
* AdminAction por acceso.

### Scope Notes
* Snapshot + cache 60s.

---

## ✅ Acceptance Criteria

### AC-01: Endpoint retorna 7 secciones
**Given** admin autenticado
**When** `GET /api/v1/admin/metrics`
**Then** `200` con `{users, vendors, events, quotes, bookings, reviews, ai, generated_at}` completo.

### AC-02: Cache hit < 200ms
**Given** segunda request dentro de 60s
**When** cache valid
**Then** respuesta `< 200ms p95` + mismo `generated_at`.

### AC-03: Cache miss < 3s
**Given** cache expirado o primera request
**When** computa fresh
**Then** respuesta `< 3s p95` + nuevo `generated_at` + cache populado.

### AC-04: AI breakdown por tipo
**Given** AIRecommendations en DB
**When** se computa
**Then** `ai.by_type` incluye cada `recommendation_type` con `total_count` y `success_count` (excluyendo fallbacks).

### AC-05: Sin métricas comerciales
**Given** response
**When** se inspecciona
**Then** NO contiene fields `revenue, gmv, arpu, conversion_rate_*`.

---

## ⚠️ Edge Cases

### EC-01: Sistema sin data (greenfield)
**Given** DB vacía (sin events, users, etc.)
**When** GET
**Then** `200` con todos los counts en 0.

### EC-02: Cache invalidation manual
Out of scope MVP. Cache se invalida solo por TTL (60s).

### EC-03: Query agregada falla
**Given** error en una de las queries
**When** se computa
**Then** `500` con log de error (sin partial response).

---

## 🚫 Validation Rules

| ID | Rule | Behavior |
|---|---|---|
| VR-01 | Admin role | `403` |
| VR-02 | Sin query params (MVP) | Ignorar si presentes |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
|---|---|
| SEC-01 | Admin only |
| SEC-02 | Sin métricas comerciales (compliance MVP) |
| SEC-03 | Cache key shared (no per-user) — todos los admins ven la misma métrica |

### Negative Authorization Scenarios
* Sin sesión → 401; organizer/vendor → 403.

---

## 🤖 AI Behavior

This story does not invoke AI directly. Solo reporta métricas de AI consumidas por otros use cases.

* AI Feature: None
* Provider Layer: Not applicable
* AI Input/Output/HITL/Fallback: Not applicable

---

## 🎨 UX / UI Notes

| Area | Notes |
|---|---|
| Screen / Route | `/[locale]/admin/metrics` |
| Main UI Pattern | Dashboard con 7 cards/secciones (grid layout) + timestamp `generated_at` |
| Primary Action | "Actualizar" (manual refresh) |
| Secondary Actions | N/A |
| Empty State | "Sin datos disponibles" |
| Loading State | Skeleton de cards |
| Error State | Banner con retry |
| Success State | Cards con números + small charts opcionales |
| Accessibility | Cards con `role="region"` + headings semánticos |
| Responsive | Mobile-first: grid 1 col mobile, 2-3 cols desktop |
| i18n | 4 locales (`admin.metrics.*`) |
| Currency | No aplica (sin métricas monetarias) |

---

## 🛠 Technical Notes

### Frontend
* Components: `MetricsDashboard`, `MetricCard`, `AIMetricsCard`.
* State: TanStack `useQuery` con `staleTime: 60_000` + manual refetch.
* API: `adminApi.metrics.get()`.

### Backend
* Use Case: `GetAdminMetricsUseCase` con cache wrapper.
* Controller: GET único.
* Authorization: AdminRoleGuard.
* Caching: in-memory Map con TTL 60s.

### Database
* Tablas: read-only multiple (Users, Vendors, Events, Quotes, etc.).
* Queries: GROUP BY status counts. Usar Prisma `groupBy` o raw SQL para performance.

### API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/admin/metrics` | Dashboard de métricas operativas |

#### Response 200
```json
{
  "users": { "total": 1500, "by_role": { "organizer": 800, "vendor": 600, "admin": 5 } },
  "vendors": { "total": 600, "by_status": { "pending": 50, "approved": 530, "rejected": 20 }, "hidden_count": 10 },
  "events": { "total": 1200, "by_status": { "draft": 100, "planning": 400, "in_progress": 350, "completed": 320, "cancelled": 30 } },
  "quotes": { "quote_requests_created": 5000, "quotes_responded": 4200, "quotes_accepted": 800, "quotes_rejected": 200, "quotes_expired": 300 },
  "bookings": { "booking_intents_created": 750, "booking_intents_confirmed": 600, "booking_intents_cancelled": 50 },
  "reviews": { "total": 500, "by_status": { "published": 480, "hidden": 15, "removed": 5 } },
  "ai": {
    "total_recommendations": 3000,
    "by_type": {
      "event_plan": { "total_count": 800, "success_count": 750 },
      "checklist": { "total_count": 700, "success_count": 680 },
      "budget_distribution": { "total_count": 600, "success_count": 590 },
      "recommended_categories": { "total_count": 500, "success_count": 490 },
      "quote_brief_autocompletion": { "total_count": 400, "success_count": 380 }
    }
  },
  "generated_at": "2026-06-29T05:00:00.000Z"
}
```

### Observability
* Correlation ID: Yes
* Log: `admin.metrics.viewed` (estándar) + `admin.metrics.cache.hit/miss`.
* AdminAction: No.

---

## 🧪 Test Scenarios

### Functional
| ID | Scenario | Type |
|---|---|---|
| TS-01 | Endpoint retorna 7 secciones con counts correctos | Integration |
| TS-02 | Cache hit dentro de 60s | Integration |
| TS-03 | Cache miss después de 60s recomputa | Integration |
| TS-04 | AI breakdown por type correcto | Integration |
| TS-05 | Sistema vacío retorna ceros | Integration |
| TS-06 | NO contiene métricas comerciales | Integration |

### Negative
| ID | Scenario | Expected |
|---|---|---|
| NT-01 | Sin sesión | `401` |
| NT-02 | Organizer/Vendor | `403` |

### AI Tests
Not applicable (es métrica sobre AI, no invocación).

### Authorization
| ID | Scenario | Expected |
|---|---|---|
| AUTH-TS-01 | Admin | 200 |
| AUTH-TS-02 | Organizer | 403 |
| AUTH-TS-03 | Vendor | 403 |
| AUTH-TS-04 | Sin sesión | 401 |

### Accessibility
* Cards con headings + grid layout responsive.

### Performance
* Cache hit `< 200ms p95`.
* Cache miss `< 3s p95`.

---

## 📊 Business Impact

| Field | Value |
|---|---|
| KPI Affected | Visibilidad operativa del sistema |
| Expected Impact | Admin tiene snapshot rápido de salud del sistema |
| Success Criteria | Endpoint estable + cache hit ratio > 90% |
| Academic Demo Value | Health monitoring + gobernanza operativa |

---

## 🧩 Task Breakdown Readiness

* FE: dashboard + cards + i18n.
* BE: UseCase con cache + Controller.
* DB: Queries agregadas optimizadas.
* QA: UT, IT, AUTH, Performance, Security (no comerciales).

---

## ✅ Definition of Ready
* [x] Rol, goal, FRD/UC/BR, permisos, entidades, AC GWT, edge cases, validación, out of scope, deps, UX, API, tests.
* [x] PO/BA validó.

---

## 🏁 Definition of Done
* [ ] Endpoint funcional con 7 secciones.
* [ ] Cache 60s operativo.
* [ ] Performance < 200ms cache hit / < 3s cache miss.
* [ ] Tests verdes + verificación no-comerciales.
* [ ] i18n 4 locales.

---

## 📝 Notes

* Decisión PO 8.1 #10 (sin métricas comerciales).
* Cache invalidation manual out of MVP (TTL natural).
* Documentation Alignment Required (no bloqueantes) en `management/user-stories/decision-resolutions/US-079-decision-resolution.md`.
