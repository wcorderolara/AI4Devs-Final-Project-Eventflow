# Refinement Review — US-116

## Metadata

| Campo                | Valor                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| User Story ID        | US-116                                                                                          |
| Título               | Endpoint healthcheck y readiness                                                                |
| Path US              | `management/user-stories/US-116-healthcheck-readiness-endpoint.md`                              |
| Epic                 | EPIC-OBS-001                                                                                    |
| Backlog Item         | PB-P2-013 — `/healthz` y `/readyz`                                                              |
| Prioridad            | Should Have (P2)                                                                                |
| Refinado por         | PO / BA                                                                                         |
| Fecha refinamiento   | 2026-07-07                                                                                      |
| Estado post-review   | Blocked pending decisions                                                                       |

---

## 1. Resumen

US-116 es una historia técnica del EPIC-OBS-001 que expone dos endpoints operativos: healthcheck (proceso vivo) y readiness (dependencias listas). Necesarios para App Runner (ADR-DEVOPS-003) y para orquestación/monitoreo. El texto actual de la historia es genérico (plantilla template), y contradice paths canónicos ya definidos en `docs/16 §21`. Requiere Product Owner + Tech Lead alignment.

---

## 2. Alineación documental

| Fuente                                          | Estado         | Observaciones                                                                                                                    |
| ----------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Product Backlog Prioritized (PB-P2-013)         | Found          | Related US: US-116. Dependency: PB-P0-002. AC summary: `/healthz` 200, `/readyz` chequea DB, sin datos sensibles.                  |
| Epic Map (EPIC-OBS-001)                         | Found          | Bloque §12 lista `US-OBS-004: Endpoint healthcheck/readiness`.                                                                    |
| MVP Scope Definition                            | Aligned        | §9.4 sin observabilidad enterprise. Compatible.                                                                                   |
| Functional Requirements Document                | No aplica      | Historia técnica no dispara FR de negocio.                                                                                        |
| Use Cases Specification                         | No aplica      | Sin actor humano.                                                                                                                 |
| Business Rules Document                         | Aplica parcial | BR-PRIVACY-008 (sin secretos en response/logs) aplica indirectamente.                                                             |
| User Roles & Permissions Matrix                 | Aplica         | Endpoints públicos sin autenticación (anonymous).                                                                                 |
| Non-Functional Requirements                     | Aplica         | NFR-PERF-001 (<1.5s P95), NFR-OBS-006 (stdout, no APM), NFR-DEPLOY-001..005, NFR-PRIV-004 (sin PII en logs).                       |
| Security & Authorization Design                 | Aplica         | Endpoints anonymous; NO exponer secretos/config interna.                                                                          |
| Testing Strategy                                | Aplica         | Smoke tests + unit + integration + regression.                                                                                    |
| Architecture Decision Records                   | Aplica         | ADR-DEVOPS-003 (App Runner `GET /health`), ADR-DEVOPS-007 (CloudWatch), ADR-API-004 (correlation ID pero con excepción para health). |
| API Design Specification (docs/16 §21)          | Aplica         | Define paths canónicos `/health`, `/health/ready`, DTOs, roles anonymous, no requiere `X-Correlation-Id`.                          |
| Deployment & DevOps Design (docs/21 §10.4)      | Aplica         | Confirma `GET /health` para App Runner + opcional `/readiness`.                                                                    |
| Backend Technical Design (docs/14)              | Aplica         | Estructura módulos Clean/Hex + módulo platform/health.                                                                             |

---

## 3. Contradicciones encontradas

| # | Contradicción                                                                                                                                                         | Impacto                              |
| - | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| C1 | US-116 usa paths `/healthz` y `/readyz`, pero `docs/16 §21.2` canoniza `/health` y `/health/ready`, y `docs/21 §10.4/§32.2` referencia `/health` (App Runner).           | Bloqueante — decide canonical.        |
| C2 | ADR-API-004 exige `correlationId` en todos los endpoints, pero `docs/16 §21.4` explícitamente exceptúa `/health*`.                                                     | Bloqueante — precedencia explícita.    |
| C3 | US-116 (plantilla) lista `Correlation ID Required: Yes`, contradiciendo excepción de `docs/16 §21.4`.                                                                   | Bloqueante — corregir en rewrite.      |
| C4 | `docs/16 §21.3` incluye `aiProvider: "ok" | "mock" | "down"` en readiness; verificar `aiProvider` externo introduce latencia y costo por probe.                          | Bloqueante — decidir alcance de chequeo. |

---

## 4. Blocking Questions

### Q1 — Paths canónicos de los endpoints

- **Contexto**: US-116 dice `/healthz`, `/readyz`. `docs/16 §21.2` dice `/health`, `/health/ready`. `docs/21 §10.4/§32.2/ADR-DEVOPS-003` dice `/health` (y opcionalmente `/readiness`).
- **Impacto**: Nombre de ruta es contrato con App Runner y con monitoreo.
- **Pregunta**: ¿Cuáles son los paths canónicos definitivos?

### Q2 — Dependencias verificadas en readiness

- **Contexto**: `docs/16 §21.3` lista `postgres` y `aiProvider`. Verificar `aiProvider` externo cada probe: (i) introduce latencia (llamada OpenAI o network); (ii) puede alcanzar rate limits del proveedor; (iii) `MockAIProvider` no requiere verificación.
- **Impacto**: NFR-PERF-001 (P95 < 1.5s) y NFR-DEPLOY-003.
- **Pregunta**: ¿`/health/ready` verifica DB únicamente (`SELECT 1`), o también hace probe activo al LLM provider externo?

### Q3 — Envelope de respuesta

- **Contexto**: US-114 introduce envelope canonical `{ data, meta: { correlationId } }` para todos los endpoints. `docs/16 §21.3` define DTOs planos (`{ status, version, uptimeMs, timestamp, dependencies? }`) sin envelope. `docs/16 §21.4` exceptúa correlationId para health.
- **Impacto**: Contrato con probes externos, dashboards, y con guard middlewares.
- **Pregunta**: ¿La respuesta de `/health*` se emite PLANA (según DTO en docs/16 §21.3) o envuelta en `{ data, meta }` de US-114?

### Q4 — Fuente del campo `version`

- **Contexto**: DTO exige `version: string`. Fuentes candidatas: (a) `process.env.APP_VERSION` inyectada en CI, (b) `package.json:version` leída al arrancar, (c) `git SHA` corto.
- **Impacto**: Debug de despliegue y rollback.
- **Pregunta**: ¿Cuál es la fuente canónica del campo `version`?

### Q5 — Timeout de DB check en readiness

- **Contexto**: Un check DB colgado bloquea readiness y saturar App Runner probes. Sin definición explícita en docs.
- **Impacto**: NFR-PERF-001 y disponibilidad.
- **Pregunta**: ¿Cuál es el timeout máximo del `SELECT 1` en readiness (p. ej. 500ms, 1s, 2s)?

### Q6 — Semántica HTTP status readiness

- **Contexto**: `docs/16 §21.2` indica `200 / 503`. Confirmar: 200 = todas las deps OK, 503 = al menos una down. ¿Hay estado intermedio "degraded" con 200 o requiere 503?
- **Impacto**: Balanceadores tratan 503 como out-of-rotation.
- **Pregunta**: ¿`degraded` (p. ej. `aiProvider: mock` pero DB OK) devuelve 200 o 503?

### Q7 — Logging de probes

- **Contexto**: App Runner probes health cada ~10s. Loggear cada probe genera ruido enorme en CloudWatch. NFR-OBS-006 preserva stdout como suficiente; no hay sampling MVP.
- **Impacto**: Costo CloudWatch + señal:ruido.
- **Pregunta**: ¿Los endpoints de health se loggean en cada request (default backend), se silencian, o solo se loggean fallos?

### Q8 — Rate limiting

- **Contexto**: App Runner health probes deben poder llamar sin restricción; humanos/atacantes no deberían saturar. Sin definición explícita.
- **Impacto**: Disponibilidad del endpoint para orquestador.
- **Pregunta**: ¿Los endpoints de health quedan exentos del rate limiting general o mantienen límite (y de cuánto)?

### Q9 — Exención de middlewares (session/correlation/CSRF)

- **Contexto**: `docs/16 §21.4` dice sin `X-Correlation-Id` ni sesión. Corresponde exención explícita a los middlewares `sessionGuard`, `correlationId`, `csrf`.
- **Impacto**: Bootstrapping y comportamiento uniforme del router.
- **Pregunta**: ¿Se exceptúan explícitamente estos middlewares para `/health*`? ¿Existe una lista canónica de rutas exentas?

---

## 5. Decisiones que se pueden derivar de documentación aprobada

Estas NO requieren PO explícito; el resolver puede aplicarlas como Tech Recommendations con soporte documental.

| # | Decisión                                                                                                                        | Fuente                                    |
| - | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| DR-1 | Endpoints anonymous (sin auth).                                                                                                 | docs/16 §21.2                              |
| DR-2 | Sin exponer configuración interna (secretos, env vars).                                                                          | docs/16 §21.4, BR-PRIVACY-008, NFR-PRIV-004 |
| DR-3 | Response no incluye PII.                                                                                                          | NFR-PRIV-004                                |
| DR-4 | Logging estructurado JSON a stdout (compatible NFR-OBS-006).                                                                     | NFR-OBS-006, ADR-DEVOPS-007                 |
| DR-5 | Health check no dispara AdminAction ni AIRecommendation.                                                                          | Ámbito                                     |

---

## 6. Acceptance Criteria propuestos (borrador tras decisiones)

- AC-01: `GET <path-canonical-health>` → 200 con DTO plano `{ status, version, uptimeMs, timestamp }` cuando proceso vivo.
- AC-02: `GET <path-canonical-ready>` → 200 con DTO extendido cuando DB OK; 503 cuando DB down (según Q6).
- AC-03: `SELECT 1` a DB con timeout `<Q5>` ms.
- AC-04: Respuesta no expone secretos, env vars, ni PII.
- AC-05: Endpoints anonymous (sin sesión ni CSRF).
- AC-06: Endpoints exentos de rate limiter (Q8).
- AC-07: Endpoints exentos de correlation ID (Q9); no se propaga `X-Correlation-Id` a response.
- AC-08: Logging condicional (Q7): errores siempre, éxito según decisión.
- AC-09: `version` obtenido según Q4.
- AC-10: `/health` responde en <100ms P95 (proceso vivo, sin dependencias).

---

## 7. Estado final del refinement

- Puede aprobarse sin decisiones adicionales: **No**
- Bloqueado por: **Q1..Q9 (9 decisiones)**
- Recomendación: invocar `eventflow-po-ba-decision-resolver` con esta review para materializar Tech Recommendations y decisiones derivables; PO confirmará only Q1 (paths) y Q6 (semántica degraded); resto se puede resolver por documentación existente + best practices.

---

## 8. Revalidación post-decision-resolution

_(A completarse tras resolución.)_

- Fecha: 2026-07-07
- Estado revalidación: OK — todas las decisiones resueltas (D0 vía docs canónicas + D1..D8 Tech Recommendations); rewrite de US alineado con `docs/16 §21`, US-114 envelope no aplica, deps sólo DB.
- Próximo paso: aprobación formal.
