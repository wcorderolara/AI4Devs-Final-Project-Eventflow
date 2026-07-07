# PO/BA Decision Resolution — US-115

## Source User Story File
management/user-stories/US-115-ai-minimum-metrics.md

## Source Refinement Review File
management/user-stories/refinement-reviews/US-115-refinement-review.md

## Decision Date
2026-07-07

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| User Story ID                                | US-115                                                                                                            |
| User Story file path                         | `management/user-stories/US-115-ai-minimum-metrics.md`                                                            |
| Refinement review artifact path              | `management/user-stories/refinement-reviews/US-115-refinement-review.md`                                          |
| Existing decision resolution found           | No                                                                                                                |
| Backlog Item                                 | PB-P2-012 — Métricas mínimas de IA (JSON) (P2, Should Have, posición 1 de 1)                                     |
| Epic                                         | EPIC-OBS-001                                                                                                      |
| Estado antes de decisiones                   | Needs Refinement                                                                                                  |
| Cantidad de preguntas revisadas              | 7 (Q1–Q7)                                                                                                          |
| Decisiones PO/BA tomadas                     | 1 preexistente ratificada (D0: formato JSON per Decisión PO 4.4 US-115) + 0 nuevas PO                              |
| Decisiones técnicas recomendadas             | 7 Tech Recommendations (D1 endpoint HTTP; D2 AdminRoleGuard; D3 shape JSON con 7 features × 2 ventanas × 4 métricas; D4 24h+all-time; D5 on-the-fly SQL; D6 por type sólo; D7 sin AdminAction) |
| ¿Desbloquea aprobación?                      | Sí                                                                                                                 |
| User Story file updated                      | Yes                                                                                                                |
| Decision Resolution artifact created/updated | Yes                                                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-115-decision-resolution.md`                                      |
| Próximo paso recomendado                     | Run `eventflow-user-story-refinement` (revalidación) y luego `eventflow-user-story-approval`.                     |

Todas las decisiones técnicas son deterministas desde `docs/17 §146`, `PB §4.4 US-115`, `docs/16 §admin`, `docs/7 §184-190`, US-113/US-114 Approved.

---

## 2. Decisiones Respondidas

## Decisión 0 (preexistente) — Formato JSON estructurado

### Respuesta PO/BA

Decisión PO previa formalizada en PB `§4.4 US-115`: "Métricas IA en **JSON estructurado** para MVP (Prometheus/OTel = Future)". Ratificación en US-115.

### Decisión formal

```text
US-115 expone métricas en JSON estructurado. Sin Prometheus, OTel, StatsD ni ninguna infraestructura enterprise de métricas (Future). Alineado con NFR-OBS-006.
```

### ¿Bloqueaba aprobación? Sí (preexistente).

---

## Decisión 1 — Delivery mechanism: endpoint HTTP admin (Q1)

### Respuesta PO/BA

PB-P2-012 Acceptance Summary permite "endpoint `/metrics` o log periódico JSON". `docs/16 §admin endpoints` establece el patrón `/api/v1/admin/*` para funciones administrativas. Endpoint HTTP es más discoverable (permite probar via `curl` en demo), consistente con el patrón admin existente, y elimina la necesidad de un job programado adicional. Log periódico introduciría complejidad (`node-cron`, coordinación con US-113 logger) sin beneficio proporcional para MVP.

### Decisión formal

```text
US-115 expone métricas via endpoint HTTP:
- Método: GET
- Path: /api/v1/admin/ai-metrics
- Auth: AdminRoleGuard (D2)
- Response: JSON envelope canonical (US-114 D4)

Log periódico = Future US (si se justifica para retention/histórico).
```

### Rationale

* Discoverable para demo académico (`curl` + `jq`).
* Consistente con patrón `docs/16 §admin`.
* Menos complejidad (sin job programado).
* On-demand fetch permite queries ad-hoc del admin.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D1.                                                                          |
| Acceptance Criteria  | AC-01 declara endpoint HTTP + response.                                              |
| Technical Notes      | Controller + use case.                                                               |
| API                  | Tabla nueva con `GET /api/v1/admin/ai-metrics`.                                      |
| Scope Guardrails     | Log periódico → Future.                                                              |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 2 — Auth via AdminRoleGuard (Q2)

### Respuesta PO/BA

`docs/16 §admin endpoints` y `docs/5 §User Roles Permissions Matrix` establecen que endpoints `/api/v1/admin/*` requieren rol `admin`. `AdminRoleGuard` middleware YA existe en PB-P0-002 (US-089).

### Decisión formal

```text
El endpoint `GET /api/v1/admin/ai-metrics` requiere:
- 401 sin sesión válida (session middleware).
- 403 sin rol `admin` (AdminRoleGuard).
- 200 con métricas si admin autenticado.
```

### Rationale

* Métricas contienen información operacional interna (latency, fallback rate) que no debe exponerse públicamente.
* Reuso 1:1 de infrastructure existente sin nueva superficie.
* Consistente con patrón admin.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D2.                                                                          |
| Acceptance Criteria  | AC-03 (401), AC-04 (403).                                                            |
| Security             | SEC-01..SEC-03 declaran policy.                                                      |
| Technical Notes      | Backend reusa AdminRoleGuard.                                                        |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 3 — Shape JSON exacto (Q3)

### Respuesta PO/BA

PB-P2-012 declara "count, latency promedio, tasa de fallback, tasa de aceptación" (4 métricas). `docs/7 §184-190` lista las 7 features canónicas MVP. `docs/17 §146` provee los campos raw (`type, latency_ms, fallback_used, accepted`). `docs/6 §Notification` y sim schema de `AIRecommendation` usan enum de `type`.

### Decisión formal

```text
Response shape (JSON envelope canonical US-114 D4):

{
  "data": {
    "windows": [
      {
        "window": "24h",
        "features": [
          {
            "type": "event_plan",           // AI-001
            "count": 42,
            "latencyAvgMs": 1234.5,
            "fallbackRate": 0.05,             // 0..1 (5%)
            "acceptanceRate": 0.85             // 0..1 (85%)
          },
          { "type": "checklist", ... },        // AI-002
          { "type": "budget_split", ... },     // AI-003
          { "type": "category_suggestion", ... }, // AI-004
          { "type": "quote_brief", ... },      // AI-005
          { "type": "comparator_summary", ... },// AI-006
          { "type": "vendor_bio", ... }        // AI-007
        ]
      },
      {
        "window": "all-time",
        "features": [ ...misma estructura, 7 entradas... ]
      }
    ]
  },
  "meta": {
    "correlationId": "<uuid v4 from US-114>",
    "timestamp": "<ISO-8601 UTC>"
  }
}

Reglas de shape:
- SIEMPRE 7 features en cada ventana (incluso si count=0; en ese caso latencyAvgMs=null, fallbackRate=null, acceptanceRate=null).
- SIEMPRE 2 ventanas (24h + all-time).
- `count`: integer ≥ 0.
- `latencyAvgMs`: number (float, redondeado a 1 decimal) o null si count=0.
- `fallbackRate`, `acceptanceRate`: number 0..1 con 4 decimales o null si count=0.
- `type` enum: `event_plan | checklist | budget_split | category_suggestion | quote_brief | comparator_summary | vendor_bio` (7 features MVP per docs/7 §184-190).

Sin `input_payload`, `output_payload`, `correlationId` individual, `prompt_version_id`, ni cualquier dato PII/secreto.
```

### Rationale

* PB-P2-012 fija 4 métricas.
* `docs/7 §184-190` fija 7 features.
* Shape consistente (7 features × 2 ventanas) simplifica consumers.
* `null` para features sin data evita división por cero y comunica ausencia semánticamente.
* Sin PII/secretos → aligned con NFR-PRIV-004.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D3.                                                                          |
| Acceptance Criteria  | AC-01 declara shape exacto; AC-05 (features sin data).                                |
| Technical Notes      | Backend declara DTO.                                                                  |
| Test Scenarios       | TS-01, TS-02, TS-05 verifican shape.                                                  |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 4 — Ventanas 24h + all-time (Q4)

### Respuesta PO/BA

Sin especificación explícita en PB. Recomendación pragmática: 24h para uso reciente (útil para monitorear degradación) + all-time para baseline (útil para academic demo mostrando totales). Buckets adicionales (por-día, por-semana, por-hora) = Future.

### Decisión formal

```text
US-115 expone 2 ventanas por default:
- "24h": últimas 24 horas (`created_at >= now() - interval '24 hours'`).
- "all-time": sin filtro temporal.

Sin buckets adicionales en MVP. Opcional query param `?window=24h|all-time|both` (default `both`); si se envía valor inválido → 400.
```

### Rationale

* Simplicidad MVP.
* Cubre casos "uso reciente" y "baseline histórico".
* Extensible: Future US puede agregar más ventanas sin romper contract.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D4.                                                                          |
| Acceptance Criteria  | AC-01 declara ambas ventanas; AC-06 declara consistencia 24h ≤ all-time.             |
| Validation Rules     | VR-03 opcional query param.                                                          |
| Test Scenarios       | TS-07 verifica invariante.                                                            |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 5 — Cálculo on-the-fly SQL (Q5)

### Respuesta PO/BA

MVP dataset acotado (`docs/11 §Seed Strategy` sugiere decenas de miles de rows máximo). Cache/materialized view introduciría complejidad (invalidación, sync) sin ROI proporcional. `NFR-PERF-001` (P95 < 1.5s) es alcanzable con query directa + índice `created_at`.

### Decisión formal

```text
US-115 calcula métricas ON-THE-FLY con 2 queries SQL agregadas contra `ai_recommendations`:
- Query 24h: `WHERE created_at >= now() - interval '24 hours' GROUP BY type`.
- Query all-time: `GROUP BY type` sin filtro.

Sin cache, sin materialized view. Si en Future el volumen crece y NFR-PERF-001 se rompe, agregar cache/vista via ADR.

Verificar índice `idx_ai_rec_created_at` durante Technical Spec; si no existe, agregar como task menor (migración pequeña).
```

### Rationale

* Simplicidad MVP.
* Aceptable con dataset acotado + índice.
* Reversible: cache/vista se puede agregar sin cambiar API.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D5.                                                                          |
| Acceptance Criteria  | AC-08 declara P95 < 1.5s.                                                            |
| Technical Notes      | Backend documenta las 2 queries + verificación de índice.                             |
| Test Scenarios       | TS-08 verifica performance.                                                          |
| Scope Guardrails     | Cache/materialized view → Future.                                                    |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 6 — Dimensionar sólo por `type` (Q6)

### Respuesta PO/BA

`prompt_version_id` es útil para A/B testing de prompts, feature no en MVP scope (docs/17 no lo declara para MVP). Agregar la dimensión inflaría el response y complicaría queries sin ROI para demo académico. Extensible en Future si aparece necesidad.

### Decisión formal

```text
Métricas dimensionadas SÓLO por `type` (7 features MVP). Sin dimensión `prompt_version_id`, `language_code`, `llm_provider`, ni ninguna otra en MVP.

Extensibles = Future via ADR / nueva US si aparece necesidad de A/B testing o comparación cross-provider.
```

### Rationale

* Simplicidad response.
* PB-P2-012 no lo pide.
* Extensible.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D6.                                                                          |
| Scope Guardrails     | Dimensiones adicionales → Future.                                                    |
| Technical Notes      | Query SQL sólo `GROUP BY type`.                                                       |

### ¿Bloqueaba aprobación? Sí. Sin validación adicional.

---

## Decisión 7 — Sin AdminAction para READ (Q7, parcial)

### Respuesta PO/BA

`NFR-OBS-001` (`docs/10 §335`) exige `AdminAction` para acciones administrativas relevantes: "aprobación/rechazo de vendor, eliminación de reseña, edición de catálogo, **vista de detalle de evento**". La consulta de métricas agregadas es READ-ONLY sin cambio de estado, y no expone detalle individual (agregado por type). No cabe en la definición de acción administrativa relevante. En Future, si se requiere auditoría de acceso a datos operativos, puede agregarse como opt-in vía ADR.

### Decisión formal

```text
US-115 NO registra la invocación en `AdminAction`. Justificación: es READ-ONLY, sin cambio de estado, sin exposición de detalle individual. Sólo agrega métricas ya existentes.

Auditoría de acceso a métricas = Future si aparece necesidad regulatoria.

Opcionalmente, se puede emitir log estructurado `info` (via logger US-113) con `{ userId, correlationId, event: 'ai.metrics.requested' }` para observabilidad operativa, sin PII.
```

### Rationale

* Alineado con la definición estrecha de `NFR-OBS-001`.
* Reduce complejidad y noise en `admin_actions`.
* Log estructurado opcional cubre la observabilidad operativa mínima.

### Impacto

| Sección              | Cambio                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| PO/BA Decisions      | Agregar D7.                                                                          |
| Acceptance Criteria  | Sin AC de AdminAction; opcional AC de log estructurado.                              |
| Technical Notes      | Backend NO escribe `AdminAction`.                                                    |
| Scope Guardrails     | Auditoría de acceso → Future.                                                        |

### ¿Bloqueaba aprobación? Parcial. Sin validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                                    | Decisión                                                                                                                             | Tipo                | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ---------------------- | -------------------- |
|  0 | Formato output                          | JSON estructurado (preexistente PO 4.4).                                                                                              | PO (previa)         | Sí                     | No requiere          |
|  1 | Delivery mechanism                       | Endpoint HTTP `GET /api/v1/admin/ai-metrics`. Log periódico = Future.                                                                | Tech Recommendation | Sí                     | No requiere          |
|  2 | Auth endpoint                            | `AdminRoleGuard` (401 sin sesión, 403 sin admin).                                                                                    | Tech Recommendation | Sí                     | No requiere          |
|  3 | Shape JSON                               | Envelope US-114 con `data.windows[]` (2 ventanas × 7 features × 4 métricas). Sin PII.                                                | Tech Recommendation | Sí                     | No requiere          |
|  4 | Ventanas                                 | 24h + all-time (fijos MVP).                                                                                                            | Tech Recommendation | Sí                     | No requiere          |
|  5 | Cálculo                                  | On-the-fly SQL. Sin cache. Verificar índice `idx_ai_rec_created_at` en Tech Spec.                                                     | Tech Recommendation | Sí                     | No requiere          |
|  6 | Dimensionamiento                         | Sólo por `type`. Sin `prompt_version_id`, `language_code`, `llm_provider`.                                                            | Tech Recommendation | Sí                     | No requiere          |
|  7 | AdminAction                              | NO. READ-ONLY sin cambio de estado. Opcional log estructurado via US-113 logger.                                                    | Tech Recommendation | Parcial                | No requiere          |

---

## 4. Cambios Aplicados a la User Story

Aplicados durante la reescritura. Ver `management/user-stories/US-115-ai-minimum-metrics.md`.

Resumen: reescritura mayor de plantilla genérica a contenido específico (paralelo US-113/US-114 Approved).

---

## 5. Documentation Alignment Required

| Documento / Fuente     | Conflicto                                                          | Decisión vigente                                       | Acción recomendada                                          | ¿Bloquea aprobación? |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------- | -------------------- |
| PB-P2-012 Traceability | Sin IDs explícitos.                                                | US-115 refinada declara IDs.                            | Ampliar Traceability con `FR-AI-010, BR-AI-007/009/010, NFR-OBS-006, NFR-PERF-001`. | No                   |
| `docs/16 §admin endpoints` | Sin entrada para `GET /api/v1/admin/ai-metrics`.                    | D1 lo introduce.                                        | Agregar entrada.                                             | No                   |
| `docs/18 §ai_recommendations` | Verificar índice `idx_ai_rec_created_at`.                         | D5 lo requiere.                                         | Ratificar en Tech Spec; si no existe, migración menor.       | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                                                                                |
| User Story file path                         | `management/user-stories/US-115-ai-minimum-metrics.md`                                                                                             |
| Decision Resolution artifact created/updated | Yes                                                                                                                                                |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-115-decision-resolution.md`                                                                       |
| New User Story status                        | Ready for Approval                                                                                                                                 |
| Remaining blockers                           | No                                                                                                                                                 |
| Reason                                       | 7 Tech Recommendations D1–D7 formalizadas. Decisión PO 4.4 US-115 (formato JSON) ratificada como D0 preexistente. Sin decisiones PO nuevas. |

---

## 7. Estado recomendado

`Ready for Approval`

---

## 8. Próximo Paso Recomendado

```text
1. (Opcional) Run `eventflow-user-story-refinement` para revalidación.
2. Run `eventflow-user-story-approval`.
3. Run `eventflow-user-story-technical-spec`.
4. Run `eventflow-user-story-to-development-tasks`.
```

User Story file updated: Yes
Path: management/user-stories/US-115-ai-minimum-metrics.md
Status: Ready for Approval
Decision Resolution artifact: management/user-stories/decision-resolutions/US-115-decision-resolution.md
Next step: Run `eventflow-user-story-refinement` (revalidación) o `eventflow-user-story-approval`.
