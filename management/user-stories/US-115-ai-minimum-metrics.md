# 🧾 User Story: Métricas mínimas de IA (JSON estructurado)

## 🆔 Metadata

| Field              | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| ID                 | US-115                                                                        |
| Epic               | EPIC-OBS-001 — Observability & Audit                                          |
| Backlog Item       | PB-P2-012 — Métricas mínimas de IA (JSON) (P2, Should Have, posición 1 de 1) |
| Feature            | Endpoint HTTP admin-only con métricas de IA (count, latency, fallback, acceptance) por feature IA en JSON estructurado |
| Module / Domain    | Platform / Observability / AI                                                  |
| User Role          | System (endpoint consumido por admin)                                          |
| Priority           | Should Have                                                                   |
| Status             | Approved with Minor Notes                                                     |
| Owner              | Tech Lead / Platform                                                          |
| Approved By        | PO/BA Review                                                                  |
| Approval Date      | 2026-07-07                                                                    |
| Ready for Development Tasks | Yes                                                                  |
| Sprint / Milestone | MVP                                                                           |
| Created Date       | 2026-06-09                                                                    |
| Last Updated       | 2026-07-07                                                                    |

---

## 🎯 User Story

**As an** admin autenticado
**I want** consultar métricas agregadas de las 7 features IA MVP (count, latency promedio, tasa de fallback, tasa de aceptación) en formato JSON estructurado por 2 ventanas (24h + all-time)
**So that** pueda monitorear salud y calidad de la IA sin necesidad de infraestructura enterprise (Prometheus/OTel = Future)

---

## 🧠 Business Context

### Context Summary

US-115 expone un endpoint HTTP admin-only (`GET /api/v1/admin/ai-metrics`) que agrega métricas sobre la entidad `AIRecommendation`. Cubre las 7 features IA MVP (AI-001..AI-007 per `docs/7 §184-190`) con las 4 métricas declaradas por PB-P2-012 (count, latency avg, fallback rate, acceptance rate) en 2 ventanas fijas (24h + all-time). Decisión PO 4.4 US-115 previa fija formato JSON; Prometheus/OTel/APM = Future.

Enlaza con:

* **US-113** (Approved) — logger opcional para log estructurado del acceso.
* **US-114** (Approved with Minor Notes) — envelope canonical con `meta.correlationId`.
* **PB-P0-010** (entregada) — LLMProvider setup que persiste `AIRecommendation` con los campos requeridos.
* **US-089** (PB-P0-002) — `AdminRoleGuard` middleware existente.
* **`AIRecommendation`** entity — fuente única de datos.

### Related Domain Concepts

* `AIRecommendation` (`docs/17 §146`): `type, latency_ms, fallback_used, accepted, correlation_id, created_at`.
* 7 features IA MVP: `event_plan, checklist, budget_split, category_suggestion, quote_brief, comparator_summary, vendor_bio`.
* Admin endpoints (`docs/16 §admin endpoints`).
* Envelope canonical (US-114 D4).

### Assumptions

* `AIRecommendation` YA se persiste correctamente por los use cases IA existentes con `type, latency_ms, fallback_used, accepted, created_at` per `docs/17 §146 + docs/9 §FR-AI-010`.
* `AdminRoleGuard` disponible (US-089 mergeada).
* `NODE_ENV`, session middleware, envelope helpers operativos (PB-P0-002).
* MVP dataset acotado (≤ decenas de miles de rows) — habilita cálculo on-the-fly.

### Dependencies

* **PB-P0-010** (upstream, entregada) — LLMProvider + persistencia AIRecommendation.
* **US-089** (PB-P0-002) — AdminRoleGuard.
* **US-114** (Approved) — envelope canonical con `meta.correlationId`.
* **US-113** (Approved) — logger opcional para log del acceso.
* Downstream: potencial Future US para dashboard admin visual que consuma este endpoint.

### PO/BA Decisions Applied

Decisiones formalizadas en `management/user-stories/decision-resolutions/US-115-decision-resolution.md`:

| ID | Decisión                                                                                                                                                                                                                                     |
| -- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D0 | Formato JSON estructurado. Ratificación de Decisión PO 4.4 US-115 previa. Prometheus/OTel/APM = Future.                                                                                                                                       |
| D1 | Delivery via endpoint HTTP `GET /api/v1/admin/ai-metrics`. Log periódico = Future.                                                                                                                                                            |
| D2 | Auth: `AdminRoleGuard` existente (US-089). 401 sin sesión; 403 sin rol admin.                                                                                                                                                                  |
| D3 | Shape JSON con envelope canonical (US-114): `data.windows[]` (2 ventanas × 7 features × 4 métricas: `count, latencyAvgMs, fallbackRate, acceptanceRate`). Enum `type ∈ {event_plan, checklist, budget_split, category_suggestion, quote_brief, comparator_summary, vendor_bio}`. Sin PII. |
| D4 | Ventanas: `24h` (últimas 24h) + `all-time`. Opcional query param `?window=24h\|all-time\|both` default `both`.                                                                                                                                 |
| D5 | Cálculo on-the-fly con 2 queries SQL agregadas. Sin cache/vista materializada MVP. Verificar índice `idx_ai_rec_created_at` durante Tech Spec.                                                                                                |
| D6 | Dimensionamiento SÓLO por `type`. Sin `prompt_version_id`, `language_code`, `llm_provider` (Future para A/B testing).                                                                                                                          |
| D7 | Sin registro en `AdminAction` (READ-ONLY sin cambio de estado; fuera de definición estrecha de NFR-OBS-001). Opcional log estructurado via US-113 logger.                                                                                       |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Backlog Item           | PB-P2-012                                                                                                                          |
| FRD Requirement(s)     | FR-AI-010 (persistir AIRecommendation con campos `latency_ms, fallback_used, accepted, prompt_version_id, provider, language, timeout_ms`) |
| Use Case(s)            | — (transversal; consume datos de UC-AI-001..UC-AI-007)                                                                              |
| Business Rule(s)       | BR-AI-007 (trazabilidad IA), BR-AI-009 (timeout+fallback), BR-AI-010 (prompt versionado)                                            |
| Permission Rule(s)     | Admin (via `AdminRoleGuard`)                                                                                                        |
| Data Entity / Entities | AIRecommendation (fuente única)                                                                                                    |
| API Endpoint(s)        | GET /api/v1/admin/ai-metrics                                                                                                        |
| NFR Reference(s)       | NFR-OBS-006 (stdout logging, sin APM), NFR-PRIV-004 (excluir PII de logs — cubierto por US-113 redactors), NFR-PERF-001 (P95 < 1.5s) |
| Related ADR(s)         | ADR-SEC-001, ADR-DEVOPS-001                                                                                                          |
| Related Document(s)    | /docs/4 §BR-AI-007/009/010, /docs/6 §AIRecommendation, /docs/7 §AI-001..AI-007, /docs/9 §FR-AI-010, /docs/10 §NFR-OBS-006 §NFR-PRIV-004 §NFR-PERF-001, /docs/14 §admin-governance, /docs/16 §admin endpoints, /docs/17 §146 §PromptOps, /docs/18 §ai_recommendations, /docs/22 |
| PO Decision            | Decisión PO 4.4 US-115 (formato JSON)                                                                                                |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have

### Explicitly Out of Scope

* Prometheus / OTel / APM enterprise (Future, PB §4.4 US-115 explícito).
* Log periódico (Future US si se justifica).
* Dashboard admin visual dedicado (Future).
* Dimensión por `prompt_version_id`, `language_code`, `llm_provider` (Future para A/B testing).
* Cache / materialized view (Future si volumen crece).
* Buckets adicionales (por-día, por-semana, por-hora) — Future.
* Auditoría de acceso via `AdminAction` (Future opt-in).
* Endpoint público (sólo admin autenticado).
* Métricas de costo IA en USD (Future — requiere billing integration).
* Exposición de `input_payload` / `output_payload` (PII/secretos protegidos).

### Scope Notes

* US-115 es READ-ONLY. No modifica ninguna entidad. Sólo lee `AIRecommendation`.
* Sin migración obligatoria (verificar índice `idx_ai_rec_created_at` en Tech Spec).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Endpoint retorna métricas con shape canonical

**Given** un admin autenticado y `AIRecommendation` con al menos 1 row para cada feature seeded
**When** invoca `GET /api/v1/admin/ai-metrics` (default `?window=both`)
**Then** el backend responde `200` con envelope:
```json
{
  "data": {
    "windows": [
      {
        "window": "24h",
        "features": [
          { "type": "event_plan", "count": <int>, "latencyAvgMs": <float|null>, "fallbackRate": <float|null>, "acceptanceRate": <float|null> },
          { "type": "checklist", ... },
          { "type": "budget_split", ... },
          { "type": "category_suggestion", ... },
          { "type": "quote_brief", ... },
          { "type": "comparator_summary", ... },
          { "type": "vendor_bio", ... }
        ]
      },
      {
        "window": "all-time",
        "features": [ ...7 entradas... ]
      }
    ]
  },
  "meta": {
    "correlationId": "<uuid v4 US-114>",
    "timestamp": "<ISO-8601 UTC>"
  }
}
```
Cada `window` incluye SIEMPRE 7 features (incluso count=0). Sin PII, sin secretos, sin correlationIds individuales, sin payloads.

### AC-02: Query param `window` filtra correctamente

**Given** admin autenticado
**When** invoca `GET /api/v1/admin/ai-metrics?window=24h`
**Then** el response tiene sólo 1 entrada en `data.windows[]` con `window: '24h'`.

**When** invoca `?window=all-time`
**Then** sólo 1 entrada `all-time`.

**When** invoca `?window=both` o sin query param
**Then** 2 entradas.

### AC-03: 401 sin sesión

**Given** un cliente sin sesión válida
**When** invoca `GET /api/v1/admin/ai-metrics`
**Then** responde `401` sin exponer datos.

### AC-04: 403 sin rol admin

**Given** un usuario autenticado con rol `organizer` o `vendor` (no admin)
**When** invoca `GET /api/v1/admin/ai-metrics`
**Then** responde `403` (via `AdminRoleGuard`).

### AC-05: Features sin data → count=0, métricas null

**Given** un dataset sin invocaciones para `vendor_bio` (AI-007 Could Have) o cualquier otra feature
**When** el admin invoca el endpoint
**Then** en el array `features[]` la entrada para esa feature aparece con `count: 0, latencyAvgMs: null, fallbackRate: null, acceptanceRate: null`. Nunca 0/0=NaN ni errores por división.

### AC-06: Consistencia 24h ≤ all-time

**Given** cualquier dataset
**When** el admin obtiene ambas ventanas
**Then** para cada feature, `24h.count ≤ all-time.count`. Este invariante es aplicable siempre (invariante de dominio: las últimas 24h son un subset del all-time).

### AC-07: Cálculo correcto con fixture conocido

**Given** un seed con 10 rows de `AIRecommendation(type='event_plan')`: 5 con `accepted=true`, 3 con `fallback_used=true`, `latency_ms ∈ {1000, 1500, 2000, 500, 3000, 1200, 1800, 1000, 2500, 800}` (avg=1530)
**When** el admin obtiene `all-time`
**Then** la entrada `event_plan` reporta `count=10, latencyAvgMs=1530.0, fallbackRate=0.3, acceptanceRate=0.5`.

### AC-08: Performance NFR-PERF-001

**Given** dataset seed de 100 rows en `ai_recommendations` distribuidos entre las 7 features
**When** el admin invoca el endpoint
**Then** responde en P95 < 1.5 s (`NFR-PERF-001`).

---

## ⚠️ Edge Cases

### EC-01: Dataset completamente vacío

**Given** `ai_recommendations` sin rows (base cero)
**When** admin invoca
**Then** response 200 con 7 features en cada ventana, todas `count=0` y métricas `null` (AC-05).

### EC-02: 24h vacío pero all-time con datos

**Given** rows en `ai_recommendations` todas con `created_at < now() - 24h`
**When** admin invoca `?window=both`
**Then** `24h.features[]` con todo count=0; `all-time.features[]` con datos.

### EC-03: Query param `window` inválido

**Given** admin invoca `?window=hourly` (fuera del enum)
**When** el middleware Zod valida
**Then** responde `400 INVALID_QUERY_PARAM` con envelope de error + `error.correlationId` (US-114).

### EC-04: Muchas invocaciones con fallback (degradación)

**Given** todas las invocaciones de AI-001 hoy tienen `fallback_used=true`
**When** admin invoca
**Then** `event_plan.fallbackRate=1.0` (100%). Esto es correcto y visible para admin.

### EC-05: Solo Must Have (AI-001..AI-005) seeded, sin AI-006/AI-007

**Given** seed cubre sólo las Must Have (AI-001..AI-005 per docs/7 §184-190)
**When** admin invoca
**Then** las 7 entries aparecen; AI-006 (`comparator_summary`) y AI-007 (`vendor_bio`) con count=0/null.

---

## 🚫 Validation Rules

| ID    | Rule                                                                        | Message / Behavior                                                              |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| VR-01 | Sesión activa                                                                | 401 sin sesión (AC-03)                                                          |
| VR-02 | Rol `admin` (via `AdminRoleGuard`)                                          | 403 sin admin (AC-04)                                                            |
| VR-03 | Query param `window ∈ {24h, all-time, both}` (default `both`)                | 400 `INVALID_QUERY_PARAM` si inválido (EC-03)                                    |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                             |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Sólo admin autenticado accede (VR-01 + VR-02).                                                                                    |
| SEC-02 | Response NO incluye `input_payload`, `output_payload`, `correlation_id` individual por row, ni `prompt_version_id`. Sólo agregados numéricos por type. |
| SEC-03 | Sin exposición de secrets (env vars, tokens, keys) — el response sólo contiene 4 métricas numéricas.                              |
| SEC-04 | Query SQL parametrizada (protección contra injection via Zod + Prisma/`$queryRaw` con params tipados).                            |

### Negative Authorization Scenarios

* Sin sesión → 401.
* Sesión de organizer o vendor → 403 (AdminRoleGuard).
* Query param inválido → 400.

---

## 🤖 AI Behavior

**No aplica — historia técnica de observabilidad AI. US-115 NO invoca IA; consume datos de `AIRecommendation` ya persistida por los use cases IA (UC-AI-001..UC-AI-007).**

### AI Involvement

* AI Feature: None (consumidor de datos IA persistidos)
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No (READ-ONLY)
* Fallback Required: Not applicable (US-115 no falla si un provider IA falla; sólo muestra rate=1.0 para esa feature)

---

## 🎨 UX / UI Notes

**No aplica — endpoint admin backend; sin UI dedicada MVP.**

Future admin dashboard puede consumir este endpoint sin cambios en US-115.

| Area                | Notes         |
| ------------------- | ------------- |
| Screen / Route      | No aplica     |
| Main UI Pattern     | No aplica     |
| Primary Action      | No aplica     |
| Secondary Actions   | No aplica     |
| Empty State         | No aplica (JSON con count=0 cubre) |
| Loading State       | No aplica     |
| Error State         | No aplica     |
| Success State       | No aplica     |
| Accessibility Notes | No aplica     |
| Responsive Notes    | No aplica     |
| i18n Notes          | No aplica (endpoint retorna solo datos numéricos; sin strings localizadas) |
| Currency Notes      | No aplica     |

---

## 🛠 Technical Notes

### Frontend

* No aplica MVP. Future admin dashboard visual puede consumir.

### Backend

* Paths canónicos:
  * `src/modules/admin-governance/application/use-cases/get-ai-metrics.use-case.ts` (per `docs/14 §admin-governance`; alternativa: `ai-assistance` según convención existente).
  * `src/modules/admin-governance/infrastructure/controllers/ai-metrics.controller.ts`.
  * Ruta registrada en `admin.router.ts` bajo `/api/v1/admin`.
  * `src/modules/admin-governance/infrastructure/repositories/ai-recommendation.repository.ts` extendido con 2 métodos (`getMetricsByWindow`).
  * `src/shared/validation/ai-metrics.query.schema.ts` — Zod para query params.
* Reuso de `AdminRoleGuard` middleware existente (US-089).
* Reuso de `respond.success` / `respond.error` helper de US-114 (`meta.correlationId`, `meta.timestamp`).
* Reuso opcional del logger US-113 para log estructurado del acceso (`ai.metrics.requested`).
* Query SQL:
  ```sql
  -- 24h
  SELECT
    type,
    COUNT(*)::int AS count,
    ROUND(AVG(latency_ms)::numeric, 1)::float AS latency_avg_ms,
    ROUND((SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0))::numeric, 4)::float AS fallback_rate,
    ROUND((SUM(CASE WHEN accepted THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0))::numeric, 4)::float AS acceptance_rate
  FROM ai_recommendations
  WHERE created_at >= now() - interval '24 hours'
  GROUP BY type;

  -- all-time
  SELECT
    type,
    COUNT(*)::int AS count,
    ROUND(AVG(latency_ms)::numeric, 1)::float AS latency_avg_ms,
    ROUND((SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0))::numeric, 4)::float AS fallback_rate,
    ROUND((SUM(CASE WHEN accepted THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0))::numeric, 4)::float AS acceptance_rate
  FROM ai_recommendations
  GROUP BY type;
  ```
* Post-processing en use case: completar las 7 features con `count=0, latencyAvgMs=null, fallbackRate=null, acceptanceRate=null` si no aparecen en la query result.
* Sin transacción (queries SELECT read-only).

### Database

* Sin migración obligatoria. `ai_recommendations` YA tiene todos los campos (docs/17 §146 + docs/18 §ai_recommendations).
* Verificar índice `idx_ai_rec_created_at` durante Tech Spec — si no existe, agregar como task menor (migración pequeña `CREATE INDEX ... ON ai_recommendations (created_at)`).

### API

| Method | Endpoint                              | Purpose                                                    |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/v1/admin/ai-metrics`             | Retorna métricas de las 7 features IA en 2 ventanas (JSON).  |

Documentation Alignment: agregar entrada en `docs/16 §admin endpoints`.

### Observability / Audit

* Correlation ID: Yes (via US-114 middleware).
* Log Event Required: Opcional log `info` estructurado con `{ userId, correlationId, event: 'ai.metrics.requested', window }` (via US-113 logger).
* AdminAction Required: **No** (D7).
* AIRecommendation Required: No (READ-ONLY consume, no escribe).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                              | Type        |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Admin invoca con seed IA (mínimo 1 row por feature Must Have AI-001..AI-005) → 200 con 7 features en cada ventana.    | Integration |
| TS-02 | Admin invoca sin data → 200 con 7 features y todas count=0, latencyAvgMs=null, rates=null.                             | Integration |
| TS-03 | Admin invoca `?window=24h` → 1 sola ventana en response.                                                                | Integration |
| TS-04 | Admin invoca `?window=all-time` → 1 sola ventana.                                                                       | Integration |
| TS-05 | Response shape matches schema declarado (contract test).                                                                | Integration |
| TS-06 | Fixture conocido (10 rows event_plan: 5 accepted, 3 fallback, latencies conocidas) → métricas exactas (AC-07).           | Integration |
| TS-07 | Invariante consistency 24h ≤ all-time por feature (AC-06).                                                              | Integration |
| TS-08 | Performance con 100 rows seed → P95 < 1.5s (AC-08, NFR-PERF-001).                                                        | Integration/Perf |

### Negative Tests

| ID    | Scenario                                | Expected Result                             |
| ----- | --------------------------------------- | ------------------------------------------- |
| NT-01 | Sin sesión → 401.                        | 401 sin body.                                |
| NT-02 | Sesión organizer → 403.                  | 403 (AdminRoleGuard).                        |
| NT-03 | Sesión vendor → 403.                     | 403.                                          |
| NT-04 | Query param `window=hourly` → 400.       | 400 `INVALID_QUERY_PARAM` con `error.correlationId` (US-114). |

### AI Tests

`No aplica` (US-115 no invoca IA).

### Authorization Tests

| ID         | Scenario                                                | Expected Result                                    |
| ---------- | ------------------------------------------------------- | -------------------------------------------------- |
| AUTH-TS-01 | Admin autenticado → 200 con métricas.                    | 200.                                                |
| AUTH-TS-02 | Organizer autenticado → 403.                             | 403.                                                |
| AUTH-TS-03 | Sin sesión → 401.                                        | 401.                                                |

### Accessibility Tests

`No aplica`.

### Contract Tests

* MSW contract test (alineado con US-121 / PB-P2-015): fixtures del envelope verificados con schema Zod.

### Smoke Tests

* Smoke-01: `curl -H "Cookie: session=<admin>" http://localhost:3000/api/v1/admin/ai-metrics | jq` → verifica shape y presencia de 7 features + 2 windows.
* Smoke-02: `curl` sin cookie → 401.
* Smoke-03: `curl` con cookie de organizer → 403.

---

## 📊 Business Impact

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Observabilidad IA (latency, calidad, costo indirecto vía fallback rate).                                        |
| Expected Impact     | Habilita monitoreo básico de comportamiento IA; permite detectar degradación de proveedor via fallback_rate ↑. |
| Success Criteria    | Smoke verde con seed IA; NFR-PERF-001 cumplido; contract test verde.                                             |
| Academic Demo Value | Demostrable via `curl | jq` mostrando 7 features con métricas reales del demo.                                    |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No aplica MVP.

### Potential Backend Tasks

* Zod schema para query params.
* Repository extension con 2 métodos SQL (24h + all-time).
* Use case `GetAIMetricsUseCase` con post-processing (fill 7 features).
* Controller + route registration.
* Reuso de `AdminRoleGuard` en la ruta.
* (Opcional) migración menor para `idx_ai_rec_created_at` si no existe.
* (Opcional) log estructurado del acceso.

### Potential Database Tasks

* Verificar índice `idx_ai_rec_created_at`. Migración menor si aplica.

### Potential AI / PromptOps Tasks

* No aplica (consume `AIRecommendation` existente).

### Potential QA Tasks

* UT + IT + NT + Contract MSW + Smoke curl.

### Potential DevOps / Config Tasks

* No aplica.

---

## ✅ Definition of Ready

* [x] Rol claro (Admin como consumer).
* [x] Goal técnico claro.
* [x] Referencias a docs (`docs/17 §146`, `docs/7 §184-190`, `docs/PB §4.4 US-115`, `docs/16 §admin`).
* [x] Permisos / Seguridad (SEC-01..SEC-04).
* [x] Entidades listadas (`AIRecommendation`).
* [x] AC en GWT (AC-01..AC-08).
* [x] Edge cases documentados (EC-01..EC-05).
* [x] Validación clara (VR-01..VR-03).
* [x] Out of Scope explícito (Prometheus/OTel, dashboard visual, cache, prompt_version_id, AdminAction).
* [x] Dependencias conocidas (PB-P0-010, US-089, US-113, US-114).
* [x] UX states identificados (No aplica).
* [x] API definida (`GET /api/v1/admin/ai-metrics`).
* [x] Tests definidos (UT + IT + NT + Contract + Smoke + AUTH).
* [x] Tech Lead validó (Q1–Q7 formalizadas).

---

## 🏁 Definition of Done

* [ ] Zod schema para query params implementado.
* [ ] Repository con 2 métodos SQL agregados verificado.
* [ ] `GetAIMetricsUseCase` con post-processing (7 features + fill zeros/nulls) implementado.
* [ ] Controller + ruta registrada bajo `/api/v1/admin/`.
* [ ] `AdminRoleGuard` aplicado.
* [ ] Índice `idx_ai_rec_created_at` verificado o migración aplicada.
* [ ] Tests TS-01..TS-08 verdes.
* [ ] NT-01..NT-04 verdes.
* [ ] AUTH-TS-01..AUTH-TS-03 verdes.
* [ ] Contract MSW verde.
* [ ] Smoke curl verde.
* [ ] Performance P95 < 1.5s con 100 rows seed.
* [ ] Documentation Alignment tracked (Traceability PB-P2-012 + `docs/16 §admin endpoints`).
* [ ] Tech Lead valida en review.

---

## 📝 Notes

* Todas las decisiones son `Tech Recommendation` con respaldo documental directo (docs/17 §146, docs/PB §4.4 US-115, docs/16 §admin, docs/7 §184-190, US-113/US-114 Approved). Decisión PO 4.4 US-115 (formato JSON) ya estaba fijada.
* **Coordinación con US-113 (Approved)**: log opcional del acceso via `logger.info` con redacción automática (US-113 D3).
* **Coordinación con US-114 (Approved with Minor Notes)**: envelope de respuesta usa `meta.correlationId` + `meta.timestamp`. Si US-114 aún no está mergeada, el envelope retorna `correlationId=null` sin fallar.
* **Reuso 1:1 de infraestructura existente**: `AdminRoleGuard` (US-089), `respond.success/error` (US-114), logger (US-113), `AIRecommendation` schema (PB-P0-010).
* Extensibilidad: agregar dimensiones (`prompt_version_id`, `language_code`, `llm_provider`) o ventanas adicionales (por-día, por-semana) es Future US sin romper el contract actual.
* Priority "Should Have" alineada con PB-P2-012.
* Documentation Alignment Required (no bloqueante): (a) ampliar Traceability de PB-P2-012 con IDs canónicos; (b) agregar entrada en `docs/16 §admin endpoints` para `GET /api/v1/admin/ai-metrics`.
* Riesgo aceptado: si Future el volumen de `ai_recommendations` crece más de decenas de miles, agregar cache/materialized view vía ADR sin cambiar el contract.
