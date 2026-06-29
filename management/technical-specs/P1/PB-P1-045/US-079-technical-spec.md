# Technical Specification — US-079: Admin Operational Metrics Dashboard

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-079 |
| Source User Story | `management/user-stories/US-079-admin-operational-metrics-dashboard.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-079-decision-resolution.md` |
| Priority | P1 |
| Backlog ID | PB-P1-045 |
| Backlog Title | Dashboard de métricas operativas admin |
| Backlog Execution Order | 79 |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-079 |
| Epic | EPIC-ADM-001 |
| Backlog Item Dependencies | PB-P0-001, US-067 |
| Feature | Endpoint admin metrics + caching server-side 60s |
| Module / Domain | Admin / Metrics |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-29 |
| Last Updated | 2026-06-29 |

---

## 2. Backlog Execution Context

PB-P1-045 single-story. Execution order 79.

---

## 3. Executive Technical Summary

**Backend**:
- `GetAdminMetricsUseCase`: 7 queries agregadas (counts + GROUP BY status) wrapeadas con cache.
- `MetricsCacheService`: in-memory Map<string, {data, expires_at}> con TTL 60s.
- Controller único `GET /api/v1/admin/metrics`.
- AdminRoleGuard reuso.

**Frontend**:
- `MetricsDashboard` page con grid de `MetricCard` componentes.
- `useAdminMetrics` hook con TanStack `staleTime: 60_000`.

---

## 4. Scope Boundary

### In Scope
- UseCase + cache + Controller + UI dashboard.

### Out of Scope
- Métricas comerciales.
- Filtros temporales.
- Drill-down.
- Export.
- Real-time.

---

## 5. Architecture Alignment

Reuso AdminGuard US-067. Nuevo módulo `admin/metrics`.

---

## 6. Functional Interpretation

| AC | Interpretation | Layer |
|---|---|---|
| AC-01 7 secciones | UseCase con 7 sub-queries + shape | BE |
| AC-02 cache hit | MetricsCacheService Map | BE |
| AC-03 cache miss | Recompute + populate | BE |
| AC-04 AI breakdown | GROUP BY recommendation_type | BE |
| AC-05 sin comerciales | DTO shape sin fields prohibidos | BE |
| EC-01..03 | Edge cases | BE |

---

## 7. Backend Technical Design

### Use Case

```ts
class GetAdminMetricsUseCase {
  constructor(private cache: MetricsCacheService) {}

  async execute(): Promise<AdminMetrics> {
    const cached = this.cache.get('admin:metrics:v1');
    if (cached) {
      logger.info('admin.metrics.cache.hit');
      return cached;
    }

    logger.info('admin.metrics.cache.miss');

    const [users, vendors, events, quotes, bookings, reviews, ai] = await Promise.all([
      this.computeUsers(),
      this.computeVendors(),
      this.computeEvents(),
      this.computeQuotes(),
      this.computeBookings(),
      this.computeReviews(),
      this.computeAI(),
    ]);

    const metrics: AdminMetrics = {
      users, vendors, events, quotes, bookings, reviews, ai,
      generated_at: new Date().toISOString(),
    };

    this.cache.set('admin:metrics:v1', metrics, 60_000);
    return metrics;
  }

  private async computeUsers() {
    const total = await prisma.users.count();
    const byRole = await prisma.users.groupBy({ by: ['role'], _count: { id: true } });
    return {
      total,
      by_role: Object.fromEntries(byRole.map(r => [r.role, r._count.id])),
    };
  }

  private async computeVendors() {
    const total = await prisma.vendor_profiles.count();
    const byStatus = await prisma.vendor_profiles.groupBy({ by: ['status'], _count: { id: true } });
    const hiddenCount = await prisma.vendor_profiles.count({ where: { is_hidden: true } });
    return {
      total,
      by_status: Object.fromEntries(byStatus.map(r => [r.status, r._count.id])),
      hidden_count: hiddenCount,
    };
  }

  // ...computeEvents, computeQuotes, computeBookings, computeReviews análogos...

  private async computeAI() {
    const total = await prisma.ai_recommendations.count();
    const byType = await prisma.ai_recommendations.groupBy({
      by: ['recommendation_type'],
      _count: { id: true },
    });
    const successByType = await prisma.ai_recommendations.groupBy({
      by: ['recommendation_type'],
      where: { fallback_used: false },
      _count: { id: true },
    });

    const successMap = new Map(successByType.map(s => [s.recommendation_type, s._count.id]));
    return {
      total_recommendations: total,
      by_type: Object.fromEntries(byType.map(r => [r.recommendation_type, {
        total_count: r._count.id,
        success_count: successMap.get(r.recommendation_type) ?? 0,
      }])),
    };
  }
}
```

### Cache Service

```ts
class MetricsCacheService {
  private cache = new Map<string, { data: any; expires_at: number }>();

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires_at) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, { data, expires_at: Date.now() + ttlMs });
  }
}
```

### Routes
```ts
router.get('/admin/metrics', adminRoleGuard, asyncHandler(controller.get));
```

### Controller
Setea header `Cache-Control: private, max-age=60`.

### Error Handling
`401`, `403`, `500` (en caso de error en queries).

---

## 8. Frontend Technical Design

### Componentes

- `MetricsDashboard`: page con grid responsive.
- `MetricCard`: tarjeta genérica con título + value + opcional breakdown.
- `AIMetricsCard`: card especial con breakdown por type + success rate.
- `RefreshButton`: dispara refetch manual.

### State Management
- `useAdminMetrics`: TanStack Query con `queryKey: ['admin.metrics']`, `staleTime: 60_000` (alineado con backend cache).

### i18n
`admin.metrics.sections.*` (users, vendors, events, quotes, bookings, reviews, ai) + labels en 4 locales.

---

## 9. API Contract

| Method | Endpoint | Response | Errors |
|---|---|---|---|
| GET | `/api/v1/admin/metrics` | `{users, vendors, events, quotes, bookings, reviews, ai, generated_at}` | 401, 403, 500 |

---

## 10. Database / Prisma Design

### Models Impacted
`User, VendorProfile, Event, QuoteRequest, Quote, BookingIntent, Review, AIRecommendation` (todas read-only para counts).

### Indexes
Las queries son `COUNT(*)` + `GROUP BY status`. Indexes existentes sobre `status` columns deberían bastar.

### Migration
Sin migraciones obligatorias.

---

## 11. AI / PromptOps Design
No aplica (es métrica sobre AI, no invocación).

## 12. Security & Authorization Design
Admin only. AdminGuard.

## 13. Testing Strategy

### Unit
- UseCase computa cada sección correctamente.
- CacheService TTL behavior.

### Integration
- TS-01..TS-06 + verificación cache hit/miss.

### API
Supertest.

### Security
- Admin only.
- Assert response NO contiene fields prohibidos (`revenue`, `gmv`, `arpu`, etc.).

### Accessibility
- Cards con headings.

### Performance
- Cache hit `< 200ms p95`.
- Cache miss `< 3s p95` con setup ~10k registros/entidad.

---

## 14. Observability & Audit

Logs `admin.metrics.viewed`, `admin.metrics.cache.hit`, `admin.metrics.cache.miss`.

---

## 15. Seed / Demo
Reuso. Verificar que el seed produce métricas no triviales para demo.

---

## 16. Documentation Alignment Required

| Document | Conflict | Decision | Recommended Action | Blocks |
|---|---|---|---|---|
| `docs/16 §M07` | Documentar endpoint metrics | Documentar. | Actualizar. | No |
| `docs/14` | Documentar módulo metrics + caching | Documentar. | Actualizar. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Queries pesadas sin cache | Performance degradado | TTL 60s + EXPLAIN ANALYZE en QA |
| Cache memory leak | OOM | Map con TTL natural; tamaño bounded (1 entry: `admin:metrics:v1`) |
| Métrica comercial accidental | Compliance breach | DTO shape estricto + QA-security test |
| Failure en una query | 500 completo | Promise.all → log error con detalle de query fallida |

---

## 18. Implementation Guidance for Coding Agents

### Archivos impactados

**Backend**:
- `src/modules/admin/metrics/use-cases/get-admin-metrics.use-case.ts`
- `src/modules/admin/metrics/services/metrics-cache.service.ts`
- `src/modules/admin/metrics/controllers/admin-metrics.controller.ts`
- `src/modules/admin/metrics/routes/admin-metrics.routes.ts`

**Frontend**:
- `app/[locale]/admin/metrics/page.tsx`
- `components/admin/metrics/MetricsDashboard.tsx`
- `components/admin/metrics/MetricCard.tsx`
- `components/admin/metrics/AIMetricsCard.tsx`
- `hooks/useAdminMetrics.ts`
- `lib/api/adminApi.ts` (extender)
- `messages/{4 locales}.json`

### Orden sugerido
1. DB-001.
2. CacheService + UT.
3. UseCase + UT.
4. Controller + ruta.
5. Frontend API + MSW.
6. Componentes + Page.
7. i18n.
8. Tests IT + AUTH + Performance + Security (no comerciales).
9. Documentación.

### Decisiones que no deben reabrirse
D1–D8.

### Qué no implementar
- Métricas comerciales.
- Filtros temporales.
- Drill-down.

---

## 19. Task Generation Notes

| Grupo | Tasks |
|---|---:|
| DB | 1 |
| BE | 4 |
| FE | 5 |
| QA | 5 |
| DOC | 1 |
| **Total** | 16 |

---

## 20. Readiness

| Check | Status |
|---|---|
| Backlog mapping | Pass |
| Decision Resolution | Pass |
| Scope clear | Pass |
| Security clear | Pass |
| Testing strategy clear | Pass |
| Ready for Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-079 entrega dashboard admin con 7 secciones agregadas + caching server-side 60s + sin métricas comerciales. PB-P1-045 single-story cierra. **EPIC-ADM-001 con esto suma su 6ª PBI completa** (PB-P1-040/041/042/043/044/045).
