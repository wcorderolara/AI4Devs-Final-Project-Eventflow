# User Story Refinement Review — US-115

## Source User Story File
management/user-stories/US-115-ai-minimum-metrics.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-115-decision-resolution.md

## Review Date
2026-07-07 (revalidación: 2026-07-07)

## Revalidation Result (2026-07-07)

Tras la ejecución de `eventflow-po-ba-decision-resolver`:

| Verificación                                                                                                                    | Resultado |
| ------------------------------------------------------------------------------------------------------------------------------- | --------- |
| D0 (formato JSON) ratificada (Decisión PO 4.4 US-115 previa).                                                                    | OK        |
| Q1 (endpoint HTTP admin) resuelta: `GET /api/v1/admin/ai-metrics`.                                                                | OK        |
| Q2 (AdminRoleGuard) resuelta: 401/403.                                                                                          | OK        |
| Q3 (shape JSON) resuelta: envelope US-114 con `data.windows[]` × 7 features × 4 métricas + enum type MVP.                        | OK        |
| Q4 (ventanas 24h+all-time) resuelta con query param opcional.                                                                    | OK        |
| Q5 (on-the-fly SQL) resuelta; verificación índice `idx_ai_rec_created_at` en Tech Spec.                                        | OK        |
| Q6 (por type sólo) resuelta.                                                                                                    | OK        |
| Q7 (sin AdminAction) resuelta con log estructurado opcional.                                                                    | OK        |
| Traceability corregida: `FR-AI-010, BR-AI-007/009/010, NFR-OBS-006, NFR-PRIV-004, NFR-PERF-001`.                                | OK        |
| Backlog Item declarado; plantilla genérica reescrita con contenido específico.                                                  | OK        |
| AC reescritos (AC-01..AC-08), EC (EC-01..EC-05), VR/SEC/Test ampliados con foco en shape estable y consistencia 24h ≤ all-time. | OK        |
| Sin conflictos con docs aprobados.                                                                                              | OK        |
| Sin scope creep (Prometheus/OTel/dashboard/cache permanecen Future).                                                            | OK        |

**Estado recomendado final**: `Ready for Approval`.
**Próximo paso**: `eventflow-user-story-approval`.

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| User Story ID                              | US-115                                                                                               |
| File Path                                  | `management/user-stories/US-115-ai-minimum-metrics.md`                                              |
| Backlog Item                               | PB-P2-012 — Métricas mínimas de IA (JSON) (P2, Should Have, posición 1 de 1)                        |
| Epic                                       | EPIC-OBS-001                                                                                         |
| Estado actual                              | Draft                                                                                                 |
| Estado recomendado                         | Needs Refinement                                                                                     |
| Nivel de riesgo                            | Bajo                                                                                                 |
| Calidad general                            | Baja (plantilla genérica)                                                                            |
| Requiere decisión PO                       | No (todas Tech Recommendations)                                                                       |
| Requiere decisión técnica                  | Sí                                                                                                    |
| Requiere decisión QA                       | No                                                                                                    |
| Requiere decisión Seguridad                | No                                                                                                    |
| Decision Resolution artifact found         | No                                                                                                   |
| User Story file updated                    | No                                                                                                   |
| Refinement review artifact created/updated | Yes                                                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-115-refinement-review.md`                             |

---

## 2. Diagnóstico PO/BA

US-115 es una historia técnica foundation dentro de EPIC-OBS-001. Expone métricas de las 7 features IA del MVP (AI-001..AI-007 per `docs/7 §184-190`) en formato JSON estructurado. La decisión PO ya está tomada (`docs/PB §4.4`): "Métricas IA en **JSON estructurado** para MVP (Prometheus/OTel = Future)".

Consumidores/dependencias claras:

* **US-113** (Approved) — provee el logger si se opta por log periódico (D1); no es requerido si sólo endpoint.
* **US-114** (Approved with Minor Notes) — provee `correlationId` en el contexto; el endpoint de métricas también lo incluye en el envelope.
* **`AIRecommendation`** entity — fuente única de las métricas per `docs/17 §146`: cada llamada persiste `type, llm_provider, prompt_version_id, language_code, input_payload, output_payload, latency_ms, fallback_used, correlation_id, accepted, edited`.
* **PB-P0-010** (upstream, entregada) — provee `LLMProvider` + `MockAIProvider` + timeout/fallback.
* **`docs/17 §PromptOps`** — schema referencia de `AIRecommendation`.

La documentación es rica y decidida:

* PB-P2-012 Acceptance Summary: "Endpoint `/metrics` o log periódico JSON. Cobertura de las 7 features IA del MVP".
* PB §4.4 US-115: "Métricas IA en **JSON estructurado** para MVP (Prometheus/OTel = Future)".
* `docs/17 §146`: schema de `AIRecommendation` cubre todos los campos necesarios (`latency_ms`, `fallback_used`, `accepted`, `type`).
* `docs/18 §ai_recommendations` (verificar): columnas + índices soportan la query.

Sin embargo, el archivo llega con los mismos cuatro bloques de problemas identificados en US-113/US-114:

1. **Plantilla genérica.** AC, EC, VR, Notes son placeholders ("Capacidad operativa"). Traceability con `FR-AI-019` **INCORRECTO** — FR-AI-019 es "usuario acepta/edita/regenera salida IA antes de persistirla" (docs/9 §380), no aplica a métricas. Los canónicos son `FR-AI-010` (persistir AIRecommendation con los campos), `BR-AI-007` (trazabilidad), `BR-AI-009` (timeout+fallback), `BR-AI-010` (prompt versionado).
2. **Decisiones técnicas abiertas pero deterministas.** Delivery mechanism (endpoint `/metrics` vs log periódico), auth del endpoint, shape exacto del JSON, ventana de agregación, cálculo on-the-fly vs cache, dimensionamiento (por type vs también por prompt_version_id).
3. **Boilerplate `AI Behavior` con "si aplica"** — US-115 NO invoca IA; consume datos ya persistidos por otras historias.
4. **Backlog Item no declarado.**

Contract PO 4.4 US-115 formaliza el "JSON estructurado" como decisión. El único trade-off técnico abierto es endpoint vs log periódico (Q1). Recomendación: endpoint HTTP admin-only por ser más discoverable para el demo académico + consistente con el patrón admin de `docs/16`. Log periódico queda Future.

Sin resolver Q1–Q7 (todas Tech Recommendations resolubles desde docs), no pueden reescribirse AC/Technical Notes de forma consistente con `docs/17 §AIRecommendation` y con US-113/US-114 Approved.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                        | Impacto                                                                                                     | Recomendación                                                                                                                                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Plantilla genérica no refleja alcance real. AC-01 y AC-02 son placeholders.                                                                                                                                       | AC no testeables.                                                                                          | Reescribir con AC-01..AC-08 específicos (endpoint HTTP, response shape, cobertura 7 features, auth admin, etc.).                                                                                                                                    |
| Alta      | Traceability con IDs INCORRECTOS: `FR-AI-019` es "aceptar/editar/regenerar salida IA".                                                                                                                             | Rompe trazabilidad académica.                                                                              | Reemplazar por canónicos: FR = `FR-AI-010` (persistir AIRecommendation con campos); BR = `BR-AI-007, BR-AI-009, BR-AI-010`; NFR = `NFR-OBS-006` (stdout logging), `NFR-PRIV-004` (excluir PII de logs, ya cubierto por US-113 redactors).             |
| Alta      | Delivery mechanism abierto: endpoint `/metrics` vs log periódico. PB dice "o".                                                                                                                                     | Sin decisión, dos implementaciones ambiguas.                                                                 | Resolver Q1 (Tech). Recomendación: **endpoint HTTP admin-only** `GET /api/v1/admin/ai-metrics`. Log periódico = Future. Más discoverable para demo académico + consistente con patrón admin de `docs/16`.                                            |
| Alta      | Shape exacto del JSON abierto. PB dice "count, latency promedio, tasa de fallback, tasa de aceptación".                                                                                                            | Sin schema definido, consumers (dashboard, tests, demo) no pueden asertar.                                    | Resolver Q3 (Tech). Definir schema con las 7 features + 2 ventanas (24h + all-time) + los 4 tipos de métrica declarados por PB.                                                                                                                     |
| Alta      | Auth del endpoint no definido.                                                                                                                                                                                    | Riesgo de exposición pública de métricas internas.                                                          | Resolver Q2 (Tech). Recomendación: `AdminRoleGuard` existente (per `docs/16 §admin endpoints`) — sólo admin autenticado accede.                                                                                                                     |
| Media     | Ventana de agregación no definida.                                                                                                                                                                                 | Sin decisión, métricas ambiguas (¿últimos N minutos? ¿all-time? ¿por día?).                                  | Resolver Q4 (Tech). Recomendación: 2 ventanas — **24h** (uso reciente) + **all-time** (baseline).                                                                                                                                                    |
| Media     | Cálculo on-the-fly vs cache no definido.                                                                                                                                                                            | Sin decisión, riesgo de query lenta o data stale.                                                            | Resolver Q5 (Tech). Recomendación: **on-the-fly SQL** (MVP dataset acotado ≤ decenas de miles de rows; sin cache; simplifica arquitectura). Si en Future el volumen crece, agregar cache o vista materializada.                                    |
| Media     | Dimensionamiento por feature type sin decisión sobre por prompt_version_id.                                                                                                                                        | Sin decisión, granularidad ambigua.                                                                          | Resolver Q6 (Tech). Recomendación: dimensionar sólo por `type` (7 features canónicas). Por `prompt_version_id` = Future (útil para A/B testing de prompts que no está en MVP).                                                                    |
| Media     | Boilerplate `AI Behavior` con "si aplica" — engañoso porque US-115 NO invoca IA (consume datos persistidos).                                                                                                       | Confunde alcance.                                                                                            | Marcar explícitamente como "No aplica — historia técnica de observabilidad AI. Los datos vienen de `AIRecommendation` ya persistida por otros use cases (AI-001..AI-007)".                                                                         |
| Media     | Dependencies vacía. PB-P2-012 depende de PB-P0-010 (LLMProvider setup — entregada). También handoff con US-113 (logger) y US-114 (correlationId).                                                                    | Ambigüedad.                                                                                                  | Declarar dependencia hard con PB-P0-010; handoffs suaves con US-113/US-114 (para consistencia con contexto/log).                                                                                                                                    |
| Media     | Backlog Item no declarado.                                                                                                                                                                                          | Pérdida de trazabilidad.                                                                                     | Agregar `Backlog Item: PB-P2-012`.                                                                                                                                                                                                                 |
| Baja      | Priority "Should Have" alineado con PB-P2-012 MoSCoW.                                                                                                                                                                | —                                                                                                            | Ratificar.                                                                                                                                                                                                                                         |
| Baja      | `docs/PB §4.4 US-115` explícito: "Métricas IA en **JSON estructurado** para MVP".                                                                                                                                     | Decisión PO ya tomada; no requiere re-consulta.                                                              | Ratificar en `PO/BA Decisions Applied`.                                                                                                                                                                                                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                              |
| ------------------------------------ | --------- | ----------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | —                                                                       |
| No introduce contratos firmados      | Pass      | —                                                                       |
| No introduce WhatsApp/chat/push      | Pass      | —                                                                       |
| Respeta human-in-the-loop IA         | Pass      | US-115 sólo lee `AIRecommendation`; no invoca IA.                        |
| Respeta backend como source of truth | Pass      | Endpoint backend; frontend no aplica.                                    |
| Respeta seed/demo si aplica          | Pass      | Seed IA (FR-SEED-006) provee data para demo.                             |
| No introduce RAG/vector DB           | Pass      | —                                                                       |
| No introduce multi-tenant enterprise | Pass      | —                                                                       |
| No introduce P4/Future scope         | Pass      | Prometheus/OTel/APM permanecen Future.                                    |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                     | Problema detectado                                                    | Acción recomendada                                                                                                                                                                                                                                                                                                                                                     |
| ----- | --------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Needs Detail / Not Testable | "Capacidad operativa" placeholder.                                    | Reescribir tras Q1..Q4. Ejemplo: "Dado un admin autenticado, cuando invoca `GET /api/v1/admin/ai-metrics`, entonces el backend responde 200 con envelope JSON conteniendo métricas por cada feature IA (AI-001..AI-007) — count, latency avg (ms), fallback rate (%), acceptance rate (%) — en 2 ventanas (24h + all-time)."                                              |
| AC-02 | Needs Detail / Not Testable | "Validación end-to-end" placeholder.                                  | Reescribir tras Q2. Ejemplo: "Dado un usuario NO admin, cuando invoca `GET /api/v1/admin/ai-metrics`, entonces el backend responde 403 (per `AdminRoleGuard` de PB-P0-002/US-089)."                                                                                                                                                                                     |

AC faltantes:
- AC para shape exacto del response envelope + `meta.correlationId` (US-114).
- AC para 401 sin sesión.
- AC para features sin data (count=0, latency=null, rate=null).
- AC para consistencia entre 24h y all-time (all-time ≥ 24h).
- AC para performance del endpoint (P95 < 1.5s per NFR-PERF-001 con dataset seed).
- AC para el registro de la invocación en `AdminAction` (opcional — verificar en Tech Spec).

---

## 6. Gaps Detectados

### Producto / Negocio
- Decisión delivery mechanism (Q1: endpoint HTTP).
- Ventana de agregación (Q4: 24h + all-time).
- Auth del endpoint (Q2: admin-only).

### Backend / API
- Nuevo use case `GetAIMetricsUseCase` en módulo `ai-assistance` (probable) o `admin-governance`.
- Nuevo controller `AIMetricsController` con `GET /api/v1/admin/ai-metrics`.
- Zod schema para query params (opcional: `window ∈ {24h, all-time, both}` default `both`).
- Reuso de `AdminRoleGuard`.
- SQL agregada sobre `ai_recommendations`:
  ```sql
  SELECT
    type,
    COUNT(*) AS total,
    AVG(latency_ms) AS latency_avg_ms,
    SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END)::float / COUNT(*) AS fallback_rate,
    SUM(CASE WHEN accepted THEN 1 ELSE 0 END)::float / COUNT(*) AS acceptance_rate
  FROM ai_recommendations
  WHERE (created_at >= now() - interval '24 hours' OR $1 = 'all-time')
  GROUP BY type;
  ```
  (adaptar per Prisma o `$queryRaw`).
- Response envelope canonical (US-114): `data + meta.correlationId + meta.timestamp`.
- Reuso del logger (US-113) con `context.metric` para logueo opcional.
- Reuso del correlationId (US-114) para `ai_recommendations.correlation_id` **ya escrito** por use cases IA existentes (US-115 sólo lee).

### Frontend / UX
- No aplica (endpoint admin sin UI dedicada MVP; Future dashboard admin puede consumirlo).

### Base de Datos
- Sin migración. `ai_recommendations` YA tiene todos los campos (`type, latency_ms, fallback_used, accepted, correlation_id, created_at`) per `docs/17 §146` + `docs/18 §ai_recommendations`.
- Índices existentes: probable `idx_ai_rec_created_at` para queries de ventana; verificar en Tech Spec. Si no existe, agregar es task menor.

### Seguridad / Autorización
- `AdminRoleGuard` (existente PB-P0-002).
- Sin exposición de PII: el response NO incluye `input_payload` ni `output_payload` (sólo agregados numéricos).
- 401 sin sesión, 403 sin admin role.

### QA / Testing
- UT del use case: cálculo correcto sobre fixtures.
- IT del endpoint: 200 admin, 401 sin sesión, 403 non-admin, shape correcto.
- IT con seed IA (FR-SEED-006): retorna al menos 1 métrica no-cero por feature seeded.
- Contract test MSW (alineado con US-121).
- Performance con dataset seed (P95 < 1.5s).

### Seed / Demo
- FR-SEED-006 (`docs/9 §570`) ya carga `AIRecommendation` con `accepted=true` para demo. US-115 consume estos datos sin cambios de seed.
- Recomendado: verificar cobertura seed en las 7 features (o al menos las Must Have AI-001..AI-005).

### Documentación / Trazabilidad
- Ampliar Traceability con IDs canónicos.
- Backlog Item declarado.
- Agregar entrada en `docs/16 §admin endpoints` para `GET /api/v1/admin/ai-metrics`.

---

## 7. Preguntas Pendientes

Todas Tech Recommendations resolubles desde documentación aprobada.

| Tipo         | Pregunta                                                                                                                                                                                                                                                                                                                                                                                                                       | Bloquea aprobación | Responsable        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| Tech         | Q1. Delivery mechanism: endpoint HTTP (`GET /api/v1/admin/ai-metrics`) o log periódico JSON. PB dice "o". Recomendación: **endpoint HTTP** (más discoverable para demo académico + consistente con patrón admin de `docs/16`). Log periódico = Future US.                                                                                                                                                                        | Sí                 | Tech Lead          |
| Tech         | Q2. Auth del endpoint. Recomendación: `AdminRoleGuard` existente (PB-P0-002 / US-089). Sólo admin autenticado accede.                                                                                                                                                                                                                                                                                                          | Sí                 | Tech Lead          |
| Tech         | Q3. Shape exacto del JSON response. Recomendación: envelope canonical (US-114 D4) con `data` conteniendo array `features[]` por cada `type ∈ {event_plan, checklist, budget_split, category_suggestion, quote_brief, comparator_summary, vendor_bio}` (7 features per docs/7 §184-190) × 2 ventanas (24h + all-time) × 4 métricas (count, latencyAvgMs, fallbackRate, acceptanceRate).                                            | Sí                 | Tech Lead          |
| Tech         | Q4. Ventana de agregación. Recomendación: **24h + all-time** (2 buckets). Sin buckets adicionales en MVP (por-día/semana = Future).                                                                                                                                                                                                                                                                                            | Sí                 | Tech Lead          |
| Tech         | Q5. Cálculo on-the-fly vs cache. Recomendación: **on-the-fly SQL** contra `ai_recommendations` (MVP dataset acotado ≤ decenas de miles de rows; sin cache; simplifica arquitectura). Cache / materialized view = Future si el volumen crece.                                                                                                                                                                                     | Sí                 | Tech Lead          |
| Tech         | Q6. Dimensionamiento por type vs también por `prompt_version_id`. Recomendación: sólo por `type` (7 features). Por `prompt_version_id` = Future (útil para A/B testing que no está en MVP).                                                                                                                                                                                                                                    | Sí                 | Tech Lead          |
| Tech + PO    | Q7 (opcional). Registro de invocación en `AdminAction`. `NFR-OBS-001` (`docs/10 §335`) exige `AdminAction` para acciones administrativas relevantes. Recomendación: NO registrar consulta de métricas en `AdminAction` — es READ-ONLY y no hay cambio de estado (`NFR-OBS-001` aplica a "aprobación/rechazo/eliminación/edición/vista de detalle de evento", no a listados agregados). Si en Future hay auditoría de acceso, opt-in. | Parcial            | Product Owner + Tech Lead |

---

## 8. Documentation Alignment Required

| Documento / Fuente                | Conflicto                                                          | Decisión vigente                                     | Acción recomendada                                                        | ¿Bloquea aprobación? |
| --------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------- | -------------------- |
| PB-P2-012 Traceability             | Sin IDs explícitos.                                                 | US-115 refinada declara IDs canónicos.               | Ampliar Traceability del backlog item.                                    | No                   |
| `docs/16 §admin endpoints`         | Sin entrada para `GET /api/v1/admin/ai-metrics`.                    | US-115 introduce el endpoint (D1).                   | Agregar entrada.                                                          | No                   |
| `docs/17 §146` (schema)             | Confirmado: `AIRecommendation` tiene todos los campos.              | Sin cambios.                                        | Sin acción.                                                               | No                   |
| `docs/18 §ai_recommendations`      | Verificar índice `idx_ai_rec_created_at` para query de ventana.     | Si no existe, agregar como task menor.               | Ratificar durante Technical Spec.                                          | No                   |

**Nota**: No hay conflictos con documentación aprobada. US-115 sólo consume `AIRecommendation` ya persistida y expone un endpoint admin new alineado con `docs/16 §admin`.

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                                                                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| User Story file updated                    | No                                                                                                                                                                                                                                                              |
| User Story file path                       | `management/user-stories/US-115-ai-minimum-metrics.md`                                                                                                                                                                                                          |
| User Story ID verified                     | Yes                                                                                                                                                                                                                                                              |
| Decision Resolution artifact found         | No                                                                                                                                                                                                                                                              |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-115-decision-resolution.md`                                                                                                                                                                                    |
| Refinement review artifact created/updated | Yes                                                                                                                                                                                                                                                              |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-115-refinement-review.md`                                                                                                                                                                                        |
| Final recommended status                   | Needs Refinement                                                                                                                                                                                                                                                |
| Next recommended skill                     | `eventflow-po-ba-decision-resolver`                                                                                                                                                                                                                             |
| Reason                                     | Sin decisiones PO reales (Decisión PO 4.4 US-115 ya fijó formato JSON); las 7 preguntas son Tech Recommendations. La historia debe pasar por el resolver para (a) materializar Q1–Q7 con respaldo docs; (b) reescribir plantilla genérica; (c) declarar Backlog Item + Traceability canónicos + Dependencies. |

---

## 10. Cambios Aplicados o Recomendados

(No aplicados; prescriptivos para tras la resolución.)

### Metadata
- `Backlog Item: PB-P2-012 (posición 1 de 1)`.
- `Feature`: "Métricas IA en JSON estructurado con cobertura de las 7 features MVP (AI-001..AI-007)".
- `Status → Ready for Approval` tras aplicar todos los cambios.

### Business Context
- `Context Summary`: "Endpoint HTTP admin-only que agrega métricas sobre `AIRecommendation` (count, latency avg, fallback rate, acceptance rate) por cada uno de las 7 features IA MVP en 2 ventanas (24h + all-time). Decisión PO 4.4 US-115 fija formato JSON; Prometheus/OTel = Future."
- Dependencies: **PB-P0-010** (LLMProvider setup, entregada) upstream; handoffs con US-113 (logger opcional), US-114 (correlationId en envelope), US-089 (`AdminRoleGuard`).

### PO/BA Decisions Applied
- D0 (formato JSON estructurado — Decisión PO 4.4 US-115 previa).
- D1..D7 (Tech Recommendations).

### Traceability
- FRD → `FR-AI-010` (persistir AIRecommendation con campos incluyendo `latency_ms, fallback_used, accepted`).
- UC → — (transversal; consume datos de UC-AI-001..UC-AI-007).
- BR → `BR-AI-007` (trazabilidad), `BR-AI-009` (timeout+fallback), `BR-AI-010` (prompt versionado).
- Permission → Admin (via `AdminRoleGuard`).
- Data Entity → `AIRecommendation` (fuente única).
- API Endpoint → `GET /api/v1/admin/ai-metrics`.
- NFR → `NFR-OBS-006` (stdout logging, sin APM), `NFR-PRIV-004` (excluir PII de logs — cubierto por US-113 redactors si se emite log), `NFR-PERF-001` (P95 < 1.5s).
- Related ADR → `ADR-SEC-001`, `ADR-DEVOPS-001`.
- Related Documents → `/docs/4 §BR-AI-007/009/010`, `/docs/6 §AIRecommendation`, `/docs/7 §AI-001..AI-007`, `/docs/9 §FR-AI-010`, `/docs/10 §NFR-OBS-006 §NFR-PRIV-004 §NFR-PERF-001`, `/docs/14 §admin-governance`, `/docs/16 §admin endpoints`, `/docs/17 §146 §PromptOps`, `/docs/18 §ai_recommendations`, `/docs/22`.
- Backlog Item.

### Scope Guardrails
- Out of Scope: Prometheus / OTel / APM enterprise (Future, per PB §4.4); log periódico (Future); dimensión por `prompt_version_id` (Future para A/B testing); cache/materialized view (Future); frontend UI dedicada (Future admin dashboard puede consumir); auditoría de acceso via `AdminAction` (Future, opt-in).

### Acceptance Criteria
- AC-01..AC-08 (endpoint 200, response shape, cobertura 7 features + 2 ventanas + 4 métricas, 401, 403, features sin data → count=0, consistencia 24h ≤ all-time, performance P95 < 1.5s).

### Edge Cases
- EC-01 features sin invocaciones seed → count=0, latency=null, rates=null.
- EC-02 dataset vacío en ventana 24h pero con datos all-time → 24h=0, all-time>0.
- EC-03 admin invoca sin data seed → response 200 con arreglo de 7 features y todas count=0.
- EC-04 uso de LLMProvider con muchas invocaciones fallidas (fallback_used=true) → fallback_rate calculado correctamente.

### Validation Rules
- VR-01 sesión activa → 401.
- VR-02 rol admin → 403 si no.
- VR-03 (opcional) query param `window ∈ {24h, all-time, both}` default `both`; 400 si inválido.

### Authorization & Security Rules
- SEC-01 sólo admin autenticado accede.
- SEC-02 response NO incluye `input_payload` ni `output_payload` (sólo agregados numéricos; sin PII).
- SEC-03 sin exposición de secrets ni de correlationIds individuales (agregado por type, no por row).

### Technical Notes (Backend)
- Path canónico: `src/modules/admin-governance/application/use-cases/get-ai-metrics.use-case.ts` (o `ai-assistance` según convención `docs/14`).
- Controller: `src/modules/admin-governance/infrastructure/controllers/ai-metrics.controller.ts`.
- Rutas registradas en `admin.router.ts` bajo prefijo `/api/v1/admin`.
- Reuso de `AdminRoleGuard` middleware.
- Query SQL contra `ai_recommendations`:
  ```sql
  SELECT
    type,
    COUNT(*) AS total,
    AVG(latency_ms) AS latency_avg_ms,
    SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) AS fallback_rate,
    SUM(CASE WHEN accepted THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) AS acceptance_rate
  FROM ai_recommendations
  WHERE created_at >= now() - interval '24 hours'
  GROUP BY type;
  ```
  (y otra query similar sin filtro `created_at` para all-time).
- Emitir respuesta como array de 7 features (aunque no haya rows); llenar con ceros/nulls per D3.
- Envelope canonical (US-114 D4): `data.features` + `meta.correlationId` + `meta.timestamp`.

### Technical Notes (Frontend)
- No aplica MVP. Future dashboard admin puede consumir.

### Database
- Sin migración. Verificar índice `idx_ai_rec_created_at` para performance de la query de ventana; si no existe, agregar como task menor en Technical Spec.

### API
- Nuevo endpoint `GET /api/v1/admin/ai-metrics`. Documentation Alignment con `docs/16 §admin endpoints`.

### Observability / Audit
- Correlation ID: Yes (via US-114 middleware).
- Log Event Required: No específico (endpoint READ no crítico; opcional log resumen `ai.metrics.requested affected=N`).
- AdminAction Required: No (D7).
- AIRecommendation Required: No (consume, no escribe).

### Test Scenarios
- TS-01 admin invoca con seed IA → 200 con métricas no-cero para features seeded.
- TS-02 admin invoca sin data → 200 con 7 features y todas count=0.
- TS-03 sesión sin admin → 403.
- TS-04 sin sesión → 401.
- TS-05 shape del response matches schema declarado.
- TS-06 métrica calculada correctamente con fixture conocida (10 rows: 3 fallback, 5 accepted → fallback_rate=0.3, acceptance_rate=0.5).
- TS-07 24h ≤ all-time (consistencia).
- TS-08 performance con seed 100 rows → P95 < 1.5s.
- NT-01 query param `window=hourly` → 400.
- Contract MSW: envelope shape verificado.

### Definition of Ready / Done
- DoR: Tech Lead validó (Q1–Q7).
- DoD: endpoint operativo, tests verdes, Contract MSW verde, smoke test admin verde.

### Notes
- Coordinación con **US-114 (Approved with Minor Notes)**: el envelope de respuesta usa el patrón definido por US-114 (`meta.correlationId`, `meta.timestamp`).
- Coordinación con **US-113 (Approved)**: si opt-in log resumen, usa el logger de US-113 (auto-redacción de PII).
- Coordinación con **PB-P0-010** (entregada): `AIRecommendation` YA se persiste por los use cases IA existentes con los campos requeridos.
- Priority "Should Have" alineada con PB-P2-012.
- Sin decisiones PO reales; Decisión PO 4.4 US-115 ya fijó formato JSON; las 7 preguntas son Tech Recommendations.

---

## 11. Recomendación Final

`Needs Refinement`

Las 7 preguntas son deterministas desde `docs/17 §146`, `docs/PB §4.4 US-115`, `docs/16 §admin`, `docs/7 §184-190`, US-113/US-114 Approved. Sin decisiones PO reales; la Decisión PO previa (§4.4) fijó formato JSON. Q7 es parcial (opcional AdminAction) con recomendación clara.

Próximo paso: ejecutar `eventflow-po-ba-decision-resolver` para materializar Q1–Q7 y reescribir la US.

---

User Story file updated: No
Path: management/user-stories/US-115-ai-minimum-metrics.md
Refinement review artifact created/updated: Yes
Review path: management/user-stories/refinement-reviews/US-115-refinement-review.md
Status: Needs Refinement
Next step: Run `eventflow-po-ba-decision-resolver`.
