# Technical Specification — US-115: Métricas mínimas de IA (JSON)

## 1. Metadata

| Field                                | Value                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| User Story ID                        | US-115                                                                                              |
| Source User Story                    | `management/user-stories/US-115-ai-minimum-metrics.md`                                              |
| Decision Resolution Artifact         | `management/user-stories/decision-resolutions/US-115-decision-resolution.md`                        |
| Priority                             | P2 (Should Have)                                                                                    |
| Backlog ID                           | PB-P2-012                                                                                           |
| Backlog Title                        | Métricas mínimas de IA (JSON)                                                                        |
| Backlog Execution Order              | 12 (duodécimo ítem de P2)                                                                           |
| User Story Position in Backlog Item  | 1 de 1                                                                                              |
| Related User Stories in Backlog Item | US-115                                                                                              |
| Epic                                 | EPIC-OBS-001                                                                                        |
| Backlog Item Dependencies            | PB-P0-010 (LLMProvider entregada)                                                                  |
| Feature                              | Endpoint HTTP admin-only con métricas de IA en JSON                                                  |
| Module / Domain                      | Platform / Observability / AI (admin-governance module)                                              |
| User Story Status                    | Approved with Minor Notes                                                                           |
| Backlog Alignment Status             | Found                                                                                               |
| Technical Spec Status                | Ready for Task Breakdown                                                                            |
| Created Date                         | 2026-07-07                                                                                          |
| Last Updated                         | 2026-07-07                                                                                          |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-012 — Métricas mínimas de IA (JSON)** (P2, Should Have). Depende de PB-P0-010 (LLMProvider entregada, `AIRecommendation` persistida). Materializa Decisión PO 4.4 US-115 (formato JSON; Prometheus/OTel = Future).

### Execution Order Rationale

Se implementa después de PB-P0-010 (LLMProvider mergeado con `AIRecommendation` persistida), US-089 (`AdminRoleGuard`), y coordina con US-113/US-114 Approved. Sin bloqueadores duros; puede paralelizarse con US-116 (healthcheck).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                                             | Suggested Order |
| ---------- | ---------------------------------------------------------------- | --------------- |
| US-115     | Endpoint admin + aggregation queries + envelope canonical         | 1               |

---

## 3. Executive Technical Summary

Implementar un endpoint HTTP admin-only que agrega métricas sobre `AIRecommendation`:

1. **Zod schema** (`src/shared/validation/ai-metrics.query.schema.ts`) para query param `window ∈ {24h, all-time, both}` default `both`.
2. **Repository extension** (`src/modules/admin-governance/infrastructure/repositories/ai-recommendation.repository.ts`) con 2 métodos SQL agregados (`getMetricsByWindow('24h')` y `getMetricsByWindow('all-time')`).
3. **Use case** (`src/modules/admin-governance/application/use-cases/get-ai-metrics.use-case.ts`) que combina los results de las queries, hace fill de las 7 features canónicas (con `count=0, metrics=null` cuando no hay data), y retorna el shape estructurado.
4. **Controller** (`src/modules/admin-governance/infrastructure/controllers/ai-metrics.controller.ts`) que aplica `AdminRoleGuard`, invoca el use case, y responde con `respond.success` (US-114 envelope).
5. **Route registration** en `admin.router.ts` bajo `/api/v1/admin/ai-metrics`.
6. **Migration menor opcional** para `idx_ai_rec_created_at` si el índice no existe (verificar Prisma schema).

Sin frontend. Sin cambios a `AIRecommendation` schema. Reuso 1:1 de infraestructura existente (`AdminRoleGuard` US-089, `respond.success` US-114, logger US-113).

---

## 4. Scope Boundary

### In Scope

* Backend: schema Zod + repository extension + use case + controller + route registration.
* Migración menor opcional (`idx_ai_rec_created_at` si no existe).
* Testing UT + IT + NT + Contract + Smoke + AUTH.
* Documentation Alignment: 2 ítems.

### Out of Scope

* Prometheus / OTel / APM enterprise (Future, PB §4.4).
* Log periódico JSON (Future).
* Dashboard admin visual (Future).
* Dimensión por `prompt_version_id`, `language_code`, `llm_provider` (Future).
* Cache / materialized view (Future si volumen crece).
* Buckets adicionales (por-día, por-semana, por-hora) (Future).
* AdminAction registro (D7).
* Frontend UI.
* Cambios al schema `AIRecommendation` (usa columnas existentes).
* Métricas de costo IA en USD (Future).
* Modificar `AIRecommendation` writes (US-115 es READ-ONLY).

### Explicit Non-Goals

* No introducir cambios a middlewares base de PB-P0-002 (reuso).
* No introducir cache runtime (Redis, in-memory).
* No modificar los use cases IA existentes (UC-AI-001..UC-AI-007) — sólo consume `AIRecommendation` que ellos persisten.
* No exponer `input_payload` / `output_payload` / `correlation_id` individuales.

---

## 5. Architecture Alignment

### Backend Architecture

* Node.js + Express + TypeScript + Prisma + PostgreSQL (`docs/14 §estructura`).
* Módulo `admin-governance` (`docs/14 §admin-governance`).
* Reuso de `AdminRoleGuard` middleware existente.
* Reuso de `respond.success` / `respond.error` helper de US-114.

### Frontend Architecture

`No aplica`.

### Database Architecture

* PostgreSQL con Prisma (`docs/18 §ai_recommendations`).
* Sin migración obligatoria; verificar índice `idx_ai_rec_created_at`.
* Queries agregadas via `prisma.$queryRaw` o `prisma.aiRecommendation.groupBy` según ergonomía.

### API Architecture

* Endpoint alineado con patrón `/api/v1/admin/*` (`docs/16 §admin endpoints`).
* Envelope canonical (US-114 D4).

### AI / PromptOps Architecture

`No aplica` (US-115 lee `AIRecommendation`; no invoca LLMProvider).

### Security Architecture

* Backend como source of truth de autorización (`docs/19`).
* `AdminRoleGuard` server-side.
* Response NO expone PII/payloads/correlationIds individuales.
* Zod validation en query params previene injection (ADR-SEC-001).

### Testing Architecture

* Vitest + Supertest (backend).
* Sin Playwright/Axe.
* Contract test MSW alineado con US-121.

---

## 6. Functional Interpretation

| Acceptance Criterion              | Technical Interpretation                                                                                          | Impacted Layer(s)          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------- |
| AC-01 — Shape canonical            | Use case + repository queries + `respond.success` de US-114 con envelope.                                          | Backend                    |
| AC-02 — Query param `window`      | Zod schema con enum + branching en use case.                                                                       | Backend                    |
| AC-03 — 401 sin sesión             | Session middleware existente.                                                                                       | Backend, Security          |
| AC-04 — 403 sin admin              | `AdminRoleGuard` existente.                                                                                          | Backend, Security          |
| AC-05 — Features sin data          | Post-processing en use case: fill 7 features con count=0/nulls.                                                     | Backend                    |
| AC-06 — Consistencia 24h ≤ all-time | Invariante natural de dominio (SQL WHERE filtra subset).                                                             | Backend                    |
| AC-07 — Cálculo correcto           | SQL con AVG + SUM/COUNT correctamente parametrizado; UT con fixture.                                                | Backend                    |
| AC-08 — Performance NFR-PERF-001   | Índice `idx_ai_rec_created_at` optimiza filtro de ventana; test PERF.                                                | Backend, Database          |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo `admin-governance` (`docs/14 §admin-governance`).
* Alberga el use case, controller, y extensión del repository.

### Use Cases / Application Services

* `GetAIMetricsUseCase`:
  * Input: `{ userId: string, window: '24h' | 'all-time' | 'both' }`.
  * Output: `AIMetricsResponse` (shape D3).
  * Pasos:
    1. Determinar qué ventanas a incluir según `window`.
    2. Para cada ventana solicitada:
       * Invocar `aiRecommendationRepository.getMetricsByWindow(window)`.
       * Fill missing features (7 canonical) con `count=0, latencyAvgMs=null, fallbackRate=null, acceptanceRate=null`.
    3. Retornar array `windows[]`.
  * Sin transacción (SELECT read-only).

### Controllers / Routes

* `AIMetricsController.getMetrics(req, res)`:
  * `GET /api/v1/admin/ai-metrics`.
  * Middleware order: session → AdminRoleGuard → Zod validation.
  * Invoca use case; response 200 via `respond.success` (US-114 envelope).
* Route registration en `admin.router.ts`.

### DTOs / Schemas

* Zod query schema:
  ```ts
  export const aiMetricsQuerySchema = z.object({
    window: z.enum(['24h', 'all-time', 'both']).default('both'),
  });
  ```

* Response DTO (declarativo):
  ```ts
  export type AIMetricsWindow = '24h' | 'all-time';
  export type AIFeatureType =
    | 'event_plan' | 'checklist' | 'budget_split' | 'category_suggestion'
    | 'quote_brief' | 'comparator_summary' | 'vendor_bio';

  export interface AIFeatureMetric {
    type: AIFeatureType;
    count: number;
    latencyAvgMs: number | null;
    fallbackRate: number | null;
    acceptanceRate: number | null;
  }

  export interface AIWindowMetrics {
    window: AIMetricsWindow;
    features: AIFeatureMetric[]; // exactly 7
  }

  export interface AIMetricsResponse {
    windows: AIWindowMetrics[]; // 1 or 2
  }

  export const CANONICAL_AI_FEATURES: AIFeatureType[] = [
    'event_plan', 'checklist', 'budget_split', 'category_suggestion',
    'quote_brief', 'comparator_summary', 'vendor_bio',
  ];
  ```

### Repository / Persistence

* `AIRecommendationRepository.getMetricsByWindow(window: '24h' | 'all-time'): Promise<Record<AIFeatureType, RawMetric>>`
* Implementación con `prisma.$queryRaw`:
  ```ts
  async getMetricsByWindow(window: '24h' | 'all-time'): Promise<Record<string, RawMetric>> {
    const whereClause = window === '24h'
      ? Prisma.sql`WHERE created_at >= NOW() - INTERVAL '24 hours'`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        type: string;
        count: bigint;
        latency_avg_ms: number | null;
        fallback_rate: number | null;
        acceptance_rate: number | null;
      }>
    >`
      SELECT
        type,
        COUNT(*)::int AS count,
        ROUND(AVG(latency_ms)::numeric, 1)::float AS latency_avg_ms,
        ROUND((SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0))::numeric, 4)::float AS fallback_rate,
        ROUND((SUM(CASE WHEN accepted THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0))::numeric, 4)::float AS acceptance_rate
      FROM ai_recommendations
      ${whereClause}
      GROUP BY type;
    `;

    return Object.fromEntries(rows.map(r => [r.type, r]));
  }
  ```

### Validation Rules

* VR-01..VR-03 aplicadas por middlewares y Zod.

### Error Handling

* 401 por session middleware.
* 403 por AdminRoleGuard.
* 400 por Zod (envelope con `error.correlationId` via US-114).
* 5xx propagan al error handler estándar.

### Transactions

* No requeridas (SELECT read-only).

### Observability

* Reuso del middleware `request-logger` (US-113) con `correlationId` (US-114) automáticamente.
* Opcional log info `event: 'ai.metrics.requested'` con `{ userId, correlationId, window }` en el use case.

### Detalle del use case

```ts
export class GetAIMetricsUseCase {
  constructor(private readonly repo: AIRecommendationRepository) {}

  async execute(input: { userId: string; window: 'both' | '24h' | 'all-time' }): Promise<AIMetricsResponse> {
    const windowsToInclude: AIMetricsWindow[] =
      input.window === 'both' ? ['24h', 'all-time'] : [input.window];

    const windows: AIWindowMetrics[] = await Promise.all(
      windowsToInclude.map(async (win) => {
        const raw = await this.repo.getMetricsByWindow(win);
        const features: AIFeatureMetric[] = CANONICAL_AI_FEATURES.map((type) => {
          const m = raw[type];
          if (!m || m.count === 0) {
            return { type, count: 0, latencyAvgMs: null, fallbackRate: null, acceptanceRate: null };
          }
          return {
            type,
            count: Number(m.count),
            latencyAvgMs: m.latency_avg_ms ?? null,
            fallbackRate: m.fallback_rate ?? null,
            acceptanceRate: m.acceptance_rate ?? null,
          };
        });
        return { window: win, features };
      })
    );

    return { windows };
  }
}
```

---

## 8. Frontend Technical Design

`No aplica`.

---

## 9. API Contract Design

| Method | Endpoint                        | Purpose                                                    | Auth Required | Request                                    | Response                       | Error Cases                                            |
| ------ | ------------------------------- | ---------------------------------------------------------- | ------------- | ------------------------------------------ | ------------------------------ | ------------------------------------------------------ |
| GET    | `/api/v1/admin/ai-metrics`       | Retorna métricas agregadas de las 7 features IA MVP.        | Sí (admin)     | Query opcional `window ∈ {24h, all-time, both}` default `both`. | 200 `{data: {windows: [...]}, meta: {...}}` | 400 INVALID_QUERY_PARAM; 401; 403.                     |

Documentation Alignment: agregar entrada en `docs/16 §admin endpoints`.

---

## 10. Database / Prisma Design

### Models Impacted

| Model            | Operación | Detalle                                                       |
| ---------------- | --------- | ------------------------------------------------------------- |
| AIRecommendation | SELECT    | Aggregated queries por type con filtro opcional de ventana.    |

### Fields / Columns

Sin cambios. Se usan: `type, latency_ms, fallback_used, accepted, created_at`.

### Relations

Sin cambios.

### Indexes

* Reuso de `idx_ai_recommendations_type` (verificar existencia en Tech Spec).
* Reuso de `idx_ai_rec_correlation_id` (existente per `docs/18 §869/§1110`).
* **Verificar `idx_ai_rec_created_at`** (D5): si no existe, agregar migración pequeña:
  ```prisma
  model AIRecommendation {
    ...
    @@index([createdAt], name: "idx_ai_rec_created_at")
  }
  ```

### Constraints

Sin cambios.

### Migrations Impact

* **Cero migraciones obligatorias**.
* **Opcional**: migración menor si `idx_ai_rec_created_at` no existe (task menor durante implementación).

### Seed Impact

* Reuso del seed IA existente (FR-SEED-006). Sin cambios.
* Verificar durante Tech Lead review que el seed cubre al menos las 5 features Must Have (AI-001..AI-005) con `accepted=true`.

---

## 11. AI / PromptOps Design

`No aplica`. US-115 lee `AIRecommendation` persistida por los use cases IA.

---

## 12. Security & Authorization Design

### Authentication

* Session middleware existente.

### Authorization

* `AdminRoleGuard` middleware existente.

### Ownership Rules

* No aplica ownership por usuario; el endpoint es global-admin.

### Role Rules

* Sólo rol `admin`.

### Negative Authorization Scenarios

* Sin sesión → 401.
* Sesión de organizer/vendor → 403.
* Query param inválido → 400.

### Audit Requirements

* Sin `AdminAction` (D7). Opcional log info via US-113 logger.

### Sensitive Data Handling

* Response NO expone `input_payload`, `output_payload`, `correlationId` individuales, ni `prompt_version_id`.
* Query SQL parametrizada via Prisma template literals (protección injection).

---

## 13. Testing Strategy

### Unit Tests

* UT-01: `GetAIMetricsUseCase` con mock del repo retornando data completa → 7 features en cada ventana solicitada.
* UT-02: Use case con mock repo retornando data parcial (sólo `event_plan`) → 6 features con count=0/nulls.
* UT-03: Use case con `window: '24h'` → 1 sola ventana en response.
* UT-04: Use case con fixture conocido (10 event_plan: 5 accepted, 3 fallback, avg latency 1530) → métricas exactas (AC-07).

### Integration Tests

* IT-01: seed IA con 5 rows event_plan (todos hace 1h) + 3 rows event_plan (hace 48h) → 24h.count=5, all-time.count=8.
* IT-02: seed vacío → 200 con 7 features y todas count=0.
* IT-03: `?window=24h` → 1 sola ventana.
* IT-04: `?window=hourly` → 400 con envelope de error.
* IT-05: request como admin → 200; como organizer → 403; sin sesión → 401.
* IT-06: shape del response matches schema (contract).
* IT-07: consistencia 24h ≤ all-time (AC-06) con seed variado.
* IT-08: performance con 100 rows seed → P95 < 1.5s.

### API Tests

Cubiertos por IT.

### E2E Tests

`No aplica` (endpoint admin sin UI).

### Security Tests

* SEC-T-01: response NO contiene keywords `input_payload`, `output_payload`, `correlation_id`, `prompt_version_id`.
* SEC-T-02: injection en query param (`?window=' OR 1=1--`) → 400 (Zod rechaza).

### Accessibility Tests

`No aplica`.

### AI Tests

`No aplica`.

### Seed / Demo Tests

* SEED-T-01: post-seed, invocar el endpoint como admin → verificar que al menos AI-001..AI-005 aparecen con count > 0 (Must Have features).

### Contract Tests

* MSW contract test con schema validado.

### Smoke Tests

* Smoke-01: `curl -H "Cookie: session=<admin>" .../api/v1/admin/ai-metrics | jq` → verifica shape.
* Smoke-02: `curl` sin cookie → 401.
* Smoke-03: `curl -H "Cookie: session=<organizer>" .../api/v1/admin/ai-metrics` → 403.

### CI Checks

* Lint, type-check, tests.
* Cobertura ≥ 80% en `admin-governance/ai-metrics/*`.

---

## 14. Observability & Audit

### Logs

* Reuso del `request-logger` (US-113) con `correlationId` automático.
* Opcional log `info` en el use case: `logger.info({ userId, window, event: 'ai.metrics.requested' }, 'ai metrics requested')`.

### Correlation ID

* Presente por request (via US-114 middleware).

### AdminAction

`No aplica` (D7).

### Error Tracking

* Errores 5xx propagan al middleware estándar.

### Metrics

* No aplica (US-115 ES la métrica).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

* Reuso del seed IA existente (FR-SEED-006 `docs/9 §570`).
* Ratificar en implementación que el seed cubre las 5 features Must Have (AI-001..AI-005).

### Demo Scenario Supported

* Admin autentica → invoca `curl .../api/v1/admin/ai-metrics | jq` → demuestra que las 7 features aparecen con métricas del demo.

### Reset / Isolation Notes

* Sin cambios al `SeedResetJob`.

---

## 16. Documentation Alignment Required

| Document / Source                | Conflict                                                         | Current Decision                                     | Recommended Action                                                             | Blocks Implementation? |
| -------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------- |
| PB-P2-012 Traceability            | Sin IDs canónicos.                                                | US-115 refinada declara IDs.                        | Ampliar Traceability con `FR-AI-010, BR-AI-007/009/010, NFR-OBS-006, NFR-PERF-001`. | No                     |
| `docs/16 §admin endpoints`        | Sin entrada `GET /api/v1/admin/ai-metrics`.                       | D1 lo introduce.                                    | Agregar entrada con schema del envelope.                                        | No                     |

---

## 17. Technical Risks & Mitigations

| Risk                                                             | Impact                                    | Mitigation                                                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Índice `idx_ai_rec_created_at` no existe                          | Query lenta                               | Verificar durante implementación; migración menor si aplica.                                                    |
| Dataset crece más de decenas de miles                             | P95 > 1.5s                                | Aceptado MVP; Future: cache/materialized view via ADR sin cambiar contract.                                   |
| División por cero (count=0 en agregación)                         | NaN en response                            | `NULLIF(COUNT(*), 0)` en SQL + post-processing use case fills nulls.                                             |
| Feature IA nueva (AI-008) no en enum                              | Response no la incluye                    | Cobertura por type es una decisión de diseño; nuevas features requieren nueva US futura.                       |
| Response expone PII por bug en post-processing                     | Data leak                                 | SEC-T-01 verifica set exacto de campos.                                                                        |
| Zod query param inválido escapa a SQL injection                    | Injection                                 | SEC-T-02 con payloads maliciosos; Zod strict + Prisma parametrizado.                                            |
| AdminRoleGuard falsea admin role                                   | Escalada de privilegios                   | Reuso de guard aprobado en PB-P0-002; tests AUTH cross-role.                                                    |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / carpetas impactados

```
backend/
  src/
    modules/
      admin-governance/
        application/
          use-cases/
            get-ai-metrics.use-case.ts                     # nuevo
            get-ai-metrics.use-case.spec.ts                # nuevo
        infrastructure/
          controllers/
            ai-metrics.controller.ts                        # nuevo
            ai-metrics.controller.spec.ts                   # nuevo
          repositories/
            ai-recommendation.repository.ts                 # extender
        domain/
          types.ts                                          # exportar AIFeatureType, CANONICAL_AI_FEATURES
      admin.router.ts                                       # extender (registrar ruta)
    shared/
      validation/
        ai-metrics.query.schema.ts                          # nuevo
  prisma/
    schema.prisma                                           # verificar / agregar @@index([createdAt])
    migrations/
      YYYYMMDDHHMMSS_add_idx_ai_rec_created_at/             # opcional (si índice no existe)
        migration.sql
tests/
  integration/
    ai-metrics.spec.ts                                       # IT-01..IT-08
  security/
    ai-metrics-no-pii.spec.ts                                # SEC-T-01, SEC-T-02
  smoke/
    ai-metrics-curl.spec.sh                                  # Smoke-01..Smoke-03
```

### Orden de implementación recomendado

1. Backend: Zod schema.
2. Backend: types + `CANONICAL_AI_FEATURES` constant.
3. Backend: repository extension con `getMetricsByWindow`.
4. Backend: use case con post-processing.
5. Backend: controller + route registration en `admin.router.ts`.
6. Backend: verificar índice; opcional migración.
7. Testing: UT-01..UT-04.
8. Testing: IT-01..IT-08.
9. Testing: SEC-T-01, SEC-T-02.
10. Testing: SEED-T-01, Smoke-01..03.
11. Documentation Alignment.

### Decisiones que no deben reabrirse

* Formato JSON (D0 preexistente PO).
* Endpoint HTTP admin (D1).
* AdminRoleGuard (D2).
* Shape con 7 features canónicas + 2 ventanas + 4 métricas (D3).
* Ventanas 24h + all-time (D4).
* On-the-fly SQL (D5).
* Dimensión sólo por type (D6).
* Sin AdminAction (D7).

### Lo que no se debe implementar

* Prometheus / OTel / APM.
* Log periódico.
* Dashboard visual.
* Cache runtime.
* Buckets adicionales.
* AdminAction.
* Cambios al schema `AIRecommendation`.
* Dimensiones adicionales.

### Asunciones a preservar

* `AdminRoleGuard` disponible.
* `respond.success/error` disponibles (US-114) o crear si no existen.
* `AIRecommendation` schema con todos los campos.
* Seed IA con al menos AI-001..AI-005 con `accepted=true`.

---

## 19. Task Generation Notes

### Suggested task groups

1. Backend — schema + types.
2. Backend — repository extension.
3. Backend — use case.
4. Backend — controller + route + AdminRoleGuard wire.
5. (Opcional) Backend — migración índice.
6. Testing — UT + IT.
7. Testing — Security + Smoke.
8. Documentation Alignment.

### Required QA tasks

* UT × 4, IT × 8, SEC × 2, Smoke × 3, SEED × 1.

### Required security tasks

* SEC-T-01 (no-PII), SEC-T-02 (injection). Sin task security independiente (cubierto por QA).

### Required seed/demo tasks

* Verificación via SEED-T-01.

### Required documentation tasks

* 2 ítems.

### Dependencies between tasks

```
schema + types → repository → use case → controller → wire → IT + Smoke
                                                            ↓
                                                          SEC tests
```

### Consolidated tasks.md guidance

Opcional: PB-P2-012 tiene una sola US.

---

## 20. Technical Spec Readiness

| Check                                                    | Status |
| -------------------------------------------------------- | ------ |
| User Story approved or explicitly allowed for draft spec | Pass   |
| Product Backlog mapping found                            | Pass   |
| Decision Resolution reviewed if present                  | Pass   |
| Scope clear                                              | Pass   |
| Architecture alignment clear                             | Pass   |
| API impact clear                                         | Pass   |
| DB impact clear                                          | Pass   |
| AI impact clear                                          | N/A    |
| Security impact clear                                    | Pass   |
| Testing strategy clear                                   | Pass   |
| Ready for Development Task Breakdown                     | Yes    |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

D0–D7 materializadas con paths canónicos (`admin-governance/*`). Reuso 1:1 de infraestructura existente. Sin migración obligatoria; opcional para índice. Testing multi-capa con foco en shape estable, no-PII, invariante 24h ≤ all-time, y performance. 2 alineaciones documentales menores no bloqueantes.

---

Technical Specification created: Yes
Path: `management/technical-specs/P2/PB-P2-012/US-115-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P2-012
Execution Order: 12 (duodécimo ítem de P2)
Next step: Run `eventflow-user-story-to-development-tasks`.

Product Backlog mapping: Found (PB-P2-012, P2, posición 1 de 1).
Decision Resolution artifact used: Yes.
Documentation alignment warnings: 2 ítems no bloqueantes (§16).
