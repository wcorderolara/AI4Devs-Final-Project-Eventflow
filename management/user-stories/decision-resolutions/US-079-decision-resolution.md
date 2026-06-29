# PO/BA Decision Resolution — US-079

## Source User Story File
management/user-stories/US-079-admin-operational-metrics-dashboard.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-079-refinement-review.md

## Decision Date
2026-06-29

## 1. Resumen Ejecutivo

| Campo | Valor |
|---|---|
| User Story ID | US-079 |
| Backlog Item | PB-P1-045 |
| Decisiones tomadas | 8 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |

## 2. Decisiones

### D1 — Métricas obligatorias (FR-ADMIN-002)
```
Secciones del response:
- users: { total, by_role: {organizer, vendor, admin} }
- vendors: { total, by_status: {pending, approved, rejected}, hidden_count }
- events: { total, by_status: {draft, planning, in_progress, completed, cancelled} }
- quotes: { quote_requests_created, quotes_responded, quotes_accepted, quotes_rejected, quotes_expired }
- bookings: { booking_intents_created, booking_intents_confirmed, booking_intents_cancelled }
- reviews: { total, by_status: {published, hidden, removed} }
- ai: { total_recommendations, by_type: { event_plan, checklist, budget_distribution, recommended_categories, quote_brief_autocompletion } }
- generated_at: ISO timestamp

Sin métricas comerciales (revenue, GMV).
```

### D2 — Sin filtros temporales MVP
```
Snapshot actual únicamente. Post-MVP: filtros `time_range=7d|30d|90d|all` con queries time-bounded por `created_at`.
```

### D3 — Caching server-side 60s
```
Cache key `admin:metrics:v1` con TTL 60s. Reduce carga sobre queries agregadas costosas.

Implementación: in-memory cache (Map con timestamp) o Redis si disponible. MVP: in-memory aceptable.

Header `Cache-Control: private, max-age=60` para que el cliente respete TTL.
```

### D4 — Sin AdminAction
```
Es endpoint de lectura agregada. NO crea AdminAction por cada acceso (diferencia con US-078 view_event).

Solo log estándar `admin.metrics.viewed`.
```

### D5 — AI metrics breakdown por type
```
Breakdown del `ai_recommendations.total` por `recommendation_type`:
- event_plan
- checklist
- budget_distribution
- recommended_categories
- quote_brief_autocompletion

Incluye `success_count` (no `fallback_used`) y `total_count` por tipo para health monitoring.
```

### D6 — Response shape estructurado
```
{
  users: {...},
  vendors: {...},
  events: {...},
  quotes: {...},
  bookings: {...},
  reviews: {...},
  ai: {...},
  generated_at: "2026-06-29T05:00:00.000Z"
}

Cada sección es self-contained para frontend pueda renderizar cards independientes.
```

### D7 — Sin métricas comerciales (BR-MVP guardrail)
```
PROHIBIDO incluir: revenue, GMV, ARPU, conversion rate monetario, payment volumes.

Métricas operativas únicamente (counts agregados de uso del sistema).
```

### D8 — Performance objetivos
```
- Con cache hit: `< 200ms p95`.
- Con cache miss (computación fresh): `< 3s p95`.
- Cache hit ratio target: > 90% (TTL 60s + ~10 admins).

Tests de performance con EXPLAIN ANALYZE en setup de ~10k registros por entidad.
```

## 3. Consolidated Table

| # | Tema | Decisión |
|---|---|---|
| 1 | Métricas | 7 secciones obligatorias per FR-ADMIN-002 |
| 2 | Filtros | Snapshot MVP; time-range post-MVP |
| 3 | Caching | 60s TTL server-side + Cache-Control header |
| 4 | AdminAction | NO requerido |
| 5 | AI breakdown | Por recommendation_type + success_count |
| 6 | Shape | 7 secciones + generated_at |
| 7 | Comerciales | OUT (sin revenue/GMV) |
| 8 | Performance | < 200ms cache hit, < 3s cache miss |

## 6. File Update Result

| Campo | Valor |
|---|---|
| User Story file updated | Yes |
| Path | `management/user-stories/US-079-admin-operational-metrics-dashboard.md` |
| Status | Ready for Approval |
| Remaining blockers | No |

## 8. Próximo paso

Run `eventflow-user-story-refinement` revalidación → `eventflow-user-story-approval`.
