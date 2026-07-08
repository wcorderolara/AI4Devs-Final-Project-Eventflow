# Technical Specification — US-141: Monitoring CloudWatch mínimo (logs, métricas y alarmas)

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-141 |
| Source User Story | `management/user-stories/US-141-healthcheck-readiness-monitoring.md` |
| Decision Resolution Artifact | N/A — no existe `management/user-stories/decision-resolutions/US-141-decision-resolution.md` |
| Priority | P3 (Must Have) |
| Backlog ID | PB-P3-002 |
| Backlog Title | Monitoring CloudWatch mínimo — Logs y métricas básicas en CloudWatch + alarmas mínimas |
| Backlog Execution Order | P3 #2 (segundo ítem del bloque P3, por posición en el Product Backlog Prioritized) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-141 (única) |
| Epic | EPIC-OPS-001 |
| Backlog Item Dependencies | PB-P2-010, PB-P2-011, PB-P2-012, PB-P2-013 (US-116), PB-P2-022 (US-136) |
| Feature | Observabilidad operacional en CloudWatch (logs + métricas + alarmas mínimas) |
| Module / Domain | DevOps / Observability |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-07-07 |
| Last Updated | 2026-07-07 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P3-002 — Monitoring CloudWatch mínimo** (EPIC-OPS-001, P3, MoSCoW **Must Have**, Type DevOps, Primary Role System). Descripción del backlog: *"Backend envía logs y métricas a CloudWatch. Alarma mínima para errores 5xx y caída de healthcheck."* Acceptance Summary: *Logs visibles en CloudWatch · 1+ alarma activa · Métricas IA llegan.* Trazabilidad: Doc 21 · NFR-OBS-*. Dependencias: PB-P2-010..013, PB-P2-022.

Esta es la capa **mínima viable de monitoreo** sobre el backend ya desplegado en AWS App Runner (US-136 / PB-P2-022) que ya expone los endpoints de salud (US-116 / PB-P2-013). No reimplementa infraestructura ya entregada: **agrega** verificación de visibilidad de logs, emisión/verificación de métricas (servicio + operativas de IA) y configuración de alarmas mínimas.

### Execution Order Rationale

En el bloque P3 el "Orden de implementación sugerido" es: *Demo seed → Demo script → Pre-demo checklist → Toggle Mock/OpenAI → Smoke Demo URL → Reporte académico final*. Por **posición en el backlog**, PB-P3-002 es el **segundo ítem del bloque P3** (después de PB-P3-001 — Reset del entorno Demo). El orden numérico se deriva directamente de la secuencia de ítems `PB-P3-001, PB-P3-002, PB-P3-003, …` en `management/artifacts/4-Product-Backlog-Prioritized.md`. Se ejecuta en P3 porque **depende** de que el backend esté desplegado (PB-P2-022), de que los endpoints de salud existan (PB-P2-013) y de la base de plataforma P2 (PB-P2-010..012); todas esas dependencias están entregadas.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-141 | Única historia del ítem (observabilidad CloudWatch: logs + métricas + alarmas) | 1 |

---

## 3. Executive Technical Summary

Se debe entregar la **observabilidad operacional mínima** de EventFlow sobre **AWS App Runner + CloudWatch** (ADR-DEVOPS-001; docs/21 §19), sin reabrir US-116 ni US-136. El trabajo es esencialmente **DevOps/config + verificación**, con un apoyo menor de backend (reutilizar el logger estructurado y la emisión de métricas ya existentes; no crear endpoints nuevos):

1. **Verificar** que los logs del backend (JSON estructurado, con `correlationId`, sin secretos/PII) son visibles y consultables en el **CloudWatch Log Group** que App Runner alimenta desde stdout/stderr (docs/21 §19.1). Asegurar **retención 14–30 días** (docs/21 §30 tabla / línea 1064).
2. **Emitir/verificar** que las **métricas básicas del servicio** y las **métricas operativas de IA** (invocaciones, errores, timeouts, uso de fallback a mock — NFR-OBS-002) llegan a **CloudWatch Metrics** y son consultables.
3. **Configurar ≥1 alarma activa** sobre la **tasa/conteo de respuestas 5xx** (cumple el criterio "1+ alarma activa" del Acceptance Summary).
4. **Configurar una alarma** sobre **caída/indisponibilidad del healthcheck** (`GET /health`, propiedad de US-116, usado por App Runner). Umbral y número de periodos de evaluación ajustados para **evitar falsos positivos** ante picos transitorios (EC-01/EC-02, NFR-REL-002).

Frontend, base de datos e invocación de IA = **No aplica**. La historia **observa**, no diseña, los endpoints de salud ni el envío base de logs.

---

## 4. Scope Boundary

### In Scope

- Verificación de **visibilidad y consultabilidad** de los logs del backend en el CloudWatch Log Group (con `correlationId`, sin secretos/PII).
- Configuración/confirmación de **retención de logs 14–30 días** en el Log Group (docs/21 §30).
- Emisión/verificación de **métricas básicas del servicio** en CloudWatch Metrics.
- Emisión/verificación de **métricas operativas de IA** (invocaciones, errores, timeouts, uso de fallback) en CloudWatch Metrics (NFR-OBS-002; reutiliza la instrumentación de IA existente).
- **Alarma de 5xx** activa (≥1 alarma), con umbral y periodos de evaluación configurados.
- **Alarma de healthcheck** sobre caída/indisponibilidad del servicio.
- Configuración/IaC declarativa de log group, retención, filtros/métricas y alarmas (fail-fast si falta configuración de alarma — VR-01/VR-02).

### Out of Scope

- Los endpoints `GET /health` y `GET /health/ready` — **propiedad de US-116 (PB-P2-013)**; aquí solo se **observan**, no se reimplementan.
- El **envío base de logs** de App Runner a CloudWatch — ya entregado por **US-136 (PB-P2-022)**; aquí solo se verifica visibilidad y se añade capa de métricas + alarmas.
- APM, tracing distribuido, OpenTelemetry, ELK, dashboards Grafana (NFR-OBS-006; docs/21 §19.4/§19.5/§29 — evolución futura).
- Alarmas de **latencia/percentiles** y de **fallo del LLM** como objetivo formal (docs/21 §19.5 las lista como futuro).
- On-call, PagerDuty, escalamiento o rutas de notificación avanzadas más allá de la configuración mínima de CloudWatch (opcionalmente un SNS topic simple queda como decisión de Tech Lead, no obligatorio).
- Dashboards pagos/avanzados más allá del mínimo de CloudWatch.

### Explicit Non-Goals

- No modificar la lógica de los endpoints de salud ni su contrato (US-116).
- No introducir nuevos endpoints HTTP ni autorización runtime.
- No provisionar RDS/Secrets (PB-P2-023/024).
- No introducir dependencias de observabilidad enterprise (NFR-OBS-006).

---

## 5. Architecture Alignment

### Backend Architecture

Reutilización, **sin nuevos endpoints**. El backend Node.js + Express (monolito modular) ya emite:
- **Logs estructurados JSON** con `correlationId` a stdout/stderr vía el logger existente (US-113 logger / US-114 correlation ID), capturados por CloudWatch Logs (docs/21 §19.1).
- **Métricas operativas de IA** desde la capa `LLMProvider`/instrumentación de IA (US-115), que esta historia asegura que se **publiquen** a CloudWatch Metrics.

El aporte de backend se limita a: (a) confirmar el shipping de métricas operativas de IA a CloudWatch (custom metrics o metric filters sobre logs), y (b) garantizar redacción de secretos/PII (SEC-PRIN-005; docs/19; docs/21 §19.3).

### Frontend Architecture

No aplica — historia de infraestructura/observabilidad sin UI.

### Database Architecture

No aplica — no introduce entidades, modelos, migraciones ni seed.

### API Architecture

No aplica — no implementa endpoints. Observa (no define) `GET /health` y `GET /health/ready`, cuyo contrato es propiedad de US-116 (docs/16 §21).

### AI / PromptOps Architecture

No invoca IA. **Emite métricas operativas de IA** (invocaciones, errores, timeouts, uso de fallback a mock) hacia CloudWatch, alineado con NFR-OBS-002 y docs/21 §19.2 ("AI provider: proveedor usado, latencia, si hubo fallback a mock, sin contenido sensible"). No hay prompts, `AIRecommendation`, human-in-the-loop ni fallback de IA en esta historia.

### Security Architecture

- Healthcheck **público y no autenticado** (docs/21 §10.4; SEC-01) — no se altera.
- **Sin secretos/PII** en logs ni métricas (docs/19; docs/21 §19.3; SEC-PRIN-005; SEC-02/SEC-03).
- Valores sensibles solo vía Secrets Manager / SSM (docs/21 §10.5).
- Roles IAM con permisos mínimos para publicar métricas / crear alarmas (docs/21 §20 fila IAM).

### Testing Architecture

Verificación de infraestructura + integración (ADR-TEST-001 Vitest + Supertest donde exista superficie unitaria). Enfoque: logs visibles, métricas llegando, transición de alarmas a `ALARM` bajo umbral simulado, alarma de healthcheck-down; negativos (config faltante fail-fast, sin secretos en logs, pico transitorio sin falso positivo). Ver §13.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (logs visibles en CloudWatch Logs) | Confirmar Log Group asociado al servicio App Runner; logs JSON con `correlationId`, sin secretos/PII, consultables por filtro. Fijar retención 14–30 días. | DevOps/CloudWatch Logs, Backend (logger existente) |
| AC-02 (métricas básicas + de IA a CloudWatch) | Confirmar métricas del servicio (p. ej. App Runner request/5xx) y publicar/verificar métricas operativas de IA (invocaciones/errores/timeouts/fallback) en CloudWatch Metrics. | DevOps/CloudWatch Metrics, Backend/AI instrumentation |
| AC-03 (≥1 alarma activa de 5xx) | CloudWatch Alarm sobre la métrica de 5xx (App Runner `5xxStatusResponses` o metric filter/custom) con umbral + periodos de evaluación; estado activo; transiciona a `ALARM` al superar umbral. | DevOps/CloudWatch Alarms |
| AC-04 (alarma de caída/indisponibilidad de healthcheck) | CloudWatch Alarm que detecta indisponibilidad sostenida del servicio/healthcheck (métrica de disponibilidad/health o proxy de request failures) y pasa a `ALARM`. | DevOps/CloudWatch Alarms |
| EC-01 (dependencia caída → no saludable) | Readiness fallido (US-116) refleja indisponibilidad; alarma de healthcheck evalúa múltiples periodos; evento registrado en logs de forma controlada (NFR-REL-002). | DevOps/CloudWatch Alarms, Backend (readiness US-116) |
| EC-02 (pico transitorio de 5xx) | Umbral + `evaluationPeriods`/`datapointsToAlarm` diferencian pico transitorio de degradación sostenida; alarma vuelve a `OK` al normalizarse. | DevOps/CloudWatch Alarms |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

No se crean módulos ni bounded contexts nuevos. Se **reutiliza**:
- Logger estructurado + middleware de request logging (US-113) — `logger.middleware.ts` / pino.
- Correlation ID (US-114) — `correlation-id.middleware.ts`.
- Instrumentación de métricas operativas de IA (US-115) en la capa `LLMProvider`.

### Use Cases / Application Services

No aplica — no se agregan use cases. La emisión de logs/métricas ocurre en la infraestructura transversal existente.

### Controllers / Routes

**No implementa endpoints.** Observa `GET /health` y `GET /health/ready` (propiedad de US-116). No se toca su router ni su contrato.

### DTOs / Schemas

No aplica.

### Repository / Persistence

No aplica — sin persistencia en BD. La "persistencia" relevante es CloudWatch Logs (retención 14–30 días) y CloudWatch Metrics (retención estándar del servicio).

### Validation Rules

Validación a nivel de **configuración**, no de request:
- **VR-01**: debe existir ≥1 alarma activa de 5xx → configuración inválida/faltante = fail-fast en IaC/setup.
- **VR-02**: debe existir una alarma de caída del healthcheck → fail-fast en IaC/setup.
- **VR-03**: los logs/métricas no deben contener secretos ni datos sensibles → redacción obligatoria (docs/19; docs/21 §19.3).

### Error Handling

- Config de alarma faltante o inválida → **fail-fast** en el paso de setup/IaC (no despliegue silencioso sin monitoreo).
- Evento de readiness fallido (EC-01) → registrado de forma controlada por US-116 (`logger.warn({ event: 'health.ready.dependency_down' })`), sin exponer detalles sensibles.

### Transactions

No aplica.

### Observability

Núcleo de la historia — ver §14. Reutiliza `correlationId` por request (docs/21 §19.2). Métricas operativas de IA emitidas sin contenido sensible (docs/21 §19.2/§19.3).

---

## 8. Frontend Technical Design

No aplica — historia sin UI.

---

## 9. API Contract Design

No aplica — no implementa ni modifica endpoints. Solo **observa** (contrato propiedad de US-116, docs/16 §21):

| Method | Endpoint | Purpose | Auth Required | Notas |
|---|---|---|---|---|
| GET | `/health` | Healthcheck usado por App Runner y observado por la alarma de disponibilidad | No (público) | Propiedad de US-116; no se modifica |
| GET | `/health/ready` | Readiness (DB + AI provider) observado indirectamente vía logs/estado | No (público) | Propiedad de US-116; no se modifica |

Nota de alineación: el backlog original de esta épica y algunas referencias usan `/healthz` `/readyz`; los **paths canónicos** son `GET /health` y `GET /health/ready` (docs/21 §10.4; US-116). Ver §16 (no bloqueante).

---

## 10. Database / Prisma Design

No aplica — sin modelos, columnas, relaciones, índices, constraints, migraciones ni seed.

---

## 11. AI / PromptOps Design

### AI Feature

No invoca IA. **Emite métricas operativas de IA** hacia CloudWatch.

### Provider / Prompt Version / Input Schema / Output Schema / Human-in-the-loop / Fallback / Persistence

No aplica (no hay invocación, prompt, ni `AIRecommendation`).

### Safety Rules

Las métricas de IA emiten **contadores/dimensiones** (provider, invocaciones, errores, timeouts, uso de fallback a mock), **nunca** contenido de prompts/respuestas ni PII (docs/21 §19.2/§19.3; NFR-OBS-002). Métricas sugeridas (namespace propio, p. ej. `EventFlow/AI`):
- `AiInvocations` (dimensión `provider` = `openai`/`mock`).
- `AiErrors`.
- `AiTimeouts`.
- `AiFallbackToMock`.

---

## 12. Security & Authorization Design

### Authentication / Authorization

No introduce autorización runtime. El healthcheck es **público y no autenticado** (SEC-01; docs/21 §10.4) y no se modifica.

### Ownership Rules / Role Rules

No aplica a nivel de dominio. A nivel cloud: rol IAM de App Runner con permisos mínimos para `cloudwatch:PutMetricData`; rol de setup/IaC con permisos para crear log groups, metric filters y alarmas (docs/21 §20 fila IAM).

### Negative Authorization Scenarios

- Configuración que exponga secretos o PII en logs/métricas → **bloqueo y corrección obligatoria** (VR-03; SEC-02/SEC-03).

### Audit Requirements

Sin `AdminAction` (no hay acción administrativa de dominio). El estado de las alarmas y los logs quedan visibles en CloudWatch.

### Sensitive Data Handling

- **SEC-02**: sin secretos en logs ni métricas; valores sensibles solo via Secrets Manager / SSM (docs/19; docs/21 §10.5).
- **SEC-03**: loguear identificadores y métricas, no datos sensibles ni PII (docs/21 §19.2/§19.3; SEC-PRIN-005).

---

## 13. Testing Strategy

Enfoque de **verificación infra/integración** (ADR-TEST-001). Donde exista superficie unitaria (emisión de métricas de IA en código), usar Vitest; el resto es verificación de infraestructura documentada y reproducible.

### Unit Tests

| ID | Scope | Herramienta |
|---|---|---|
| UT-01 | Emisor de métricas de IA publica los contadores esperados (`AiInvocations`, `AiErrors`, `AiTimeouts`, `AiFallbackToMock`) con las dimensiones correctas y **sin** payload sensible (mock del cliente CloudWatch). | Vitest |
| UT-02 | Redacción: el logger nunca emite claves sensibles (`DATABASE_URL`, `PASSWORD`, `TOKEN`, `SECRET`, `PRIVATE_KEY`, `SESSION_SECRET`) en el objeto de log. | Vitest |

### Integration / Infra Tests

| ID | Escenario | Tipo |
|---|---|---|
| TS-01 | Logs del backend visibles y consultables en el CloudWatch Log Group (query por `correlationId`). | Integration / Infra |
| TS-02 | Métricas básicas del servicio y métricas operativas de IA llegan a CloudWatch Metrics y son consultables. | Integration / Infra |
| TS-03 | Alarma de 5xx configurada y **activa**; transiciona a `ALARM` bajo umbral simulado (carga/inyección de 5xx en entorno de prueba). | Infra / Integration |
| TS-04 | Alarma de healthcheck detecta indisponibilidad simulada (servicio no saludable sostenido) y pasa a `ALARM`. | Infra / Integration |

### API Tests

| ID | Escenario | Resultado |
|---|---|---|
| AUTH-TS-01 | `GET /health` accesible sin autenticación y sin exponer datos sensibles (verificación de que la alarma observa un endpoint público liviano). | 200 OK, payload liviano |

(Contrato de salud validado formalmente en US-116; aquí es verificación de la premisa de observabilidad.)

### E2E Tests

No aplica (sin flujo de UI). El equivalente E2E operacional es TS-03/TS-04 (disparo de alarmas de extremo a extremo).

### Security Tests

| ID | Escenario | Resultado |
|---|---|---|
| NT-02 | Un log emite un valor sensible. | Redacción/bloqueo; no aparece en CloudWatch |

### Negative Tests

| ID | Escenario | Resultado esperado |
|---|---|---|
| NT-01 | Configuración de alarma faltante/inválida. | Fail-fast en setup/IaC (VR-01/VR-02) |
| NT-03 | Pico transitorio de 5xx dentro del periodo de evaluación. | No dispara falso positivo permanente; alarma vuelve a `OK` (EC-02) |

### Accessibility / AI Tests

Accessibility: No aplica (sin UI). AI: no invoca IA; las métricas operativas de IA se validan en UT-01 y TS-02.

### CI Checks

- Ejecución de UT-01/UT-02 en el pipeline (quality gates PB-P0-017).
- Validación de la configuración de alarmas/log group como paso fail-fast en el setup/IaC (VR-01/VR-02) antes de considerar el entorno "monitoreado".

---

## 14. Observability & Audit

### Logs

- Fuente: stdout/stderr del backend → **CloudWatch Log Group** (App Runner, US-136; docs/21 §19.1).
- Formato: **JSON estructurado** (JSON line) para búsquedas (docs/21 §19.1).
- Retención: **14–30 días** en el Log Group (docs/21 §30 tabla / línea 1064).
- Eventos base (docs/21 §19.2): request logs (método, ruta, status, latencia, `correlationId`, `userId` cuando aplique), errores (stack truncado, código, `correlationId`), AI provider (proveedor, latencia, fallback a mock, sin contenido sensible), auth/captcha fallidos (NFR-OBS-003).

### Correlation ID

`correlationId` presente por request (US-114; docs/21 §19.2; checklist §32.8). Se preserva en los logs consultados en CloudWatch.

### AdminAction

No aplica — no hay acción administrativa de dominio en esta historia.

### Error Tracking

Errores 5xx observados vía métrica del servicio (App Runner `5xxStatusResponses` o metric filter sobre logs de status ≥ 500) → alimenta la **alarma de 5xx**. Eventos de readiness fallido (EC-01) registrados por US-116.

### Metrics

- **Servicio**: métricas de App Runner (`RequestCount`, `4xxStatusResponses`, `5xxStatusResponses`, `ActiveInstances`) disponibles en el namespace `AWS/AppRunner`; base para la alarma de 5xx y para el proxy de disponibilidad.
- **IA operativas** (namespace propio, p. ej. `EventFlow/AI`): `AiInvocations`, `AiErrors`, `AiTimeouts`, `AiFallbackToMock` (NFR-OBS-002).
- **Alarmas** (CloudWatch Alarms):
  - **5xx**: métrica de 5xx, `threshold` > 0 según objetivo (p. ej. tasa/conteo sostenido), `evaluationPeriods` ≥ 2 y `datapointsToAlarm` para evitar falsos positivos (EC-02). Estado activo (cumple "1+ alarma activa").
  - **Healthcheck/disponibilidad**: sobre métrica de disponibilidad/health del servicio (o proxy de fallos de request/instancias activas), `evaluationPeriods` múltiples para tolerar picos transitorios (EC-01; NFR-REL-002); `treatMissingData` configurado de forma conservadora.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No aplica — no requiere datos de seed.

### Demo Scenario Supported

Provee **evidencia de operabilidad** durante la demo académica: logs consultables en CloudWatch, métricas (incluidas las de IA) llegando, y alarmas activas que detectan errores 5xx y caída del healthcheck (mitiga RISK-6 del backlog: "Demo URL inestable" → monitoring CloudWatch básico).

### Reset / Isolation Notes

No aplica (no interactúa con el seed reset de PB-P3-001).

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Backlog EPIC-OPS / referencias `/healthz` `/readyz` vs paths canónicos | Nombres de healthcheck | Paths canónicos `GET /health` y `GET /health/ready` (docs/21 §10.4; US-116) | Unificar referencias residuales a `/healthz` `/readyz` hacia `/health` `/health/ready` en artefactos de backlog/épica | No |
| docs/21 §19.4/§19.5 ("no hay alerting avanzado"; alarmas listadas como "futuro") | La historia entrega alarmas mínimas de 5xx + healthcheck ahora | PB-P3-002 promueve el subconjunto **mínimo** de alarmas (5xx + healthcheck) al MVP; latencia/LLM permanecen futuros | Anotar en docs/21 que las alarmas mínimas de 5xx y healthcheck son parte del MVP (PB-P3-002); mantener latencia/LLM como futuro | No |

Sin conflictos que contradigan un ADR aceptado, introduzcan scope creep o creen imposibilidad de implementación.

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Falsos positivos por picos transitorios de 5xx | Ruido de alarmas / pérdida de confianza | `evaluationPeriods` ≥ 2 + `datapointsToAlarm` + umbral sostenido (EC-02) |
| Alarma de healthcheck oscilante (flapping) | Alertas intermitentes | Evaluación multi-periodo + `treatMissingData` conservador (EC-01; NFR-REL-002) |
| Secretos/PII filtrados en logs o métricas | Riesgo de seguridad | Redacción obligatoria + tests UT-02/NT-02 (VR-03; docs/19; docs/21 §19.3) |
| Métricas de IA no publicadas (config faltante) | AC-02 incompleto | Verificar shipping en TS-02; UT-01 valida el emisor; fail-fast si falta permiso IAM |
| Config de alarma ausente al desplegar | Entorno sin monitoreo silencioso | Fail-fast en setup/IaC (VR-01/VR-02; NT-01) |
| Costos de logs/retención excesivos | Sobrecosto | Retención 14–30 días (docs/21 §30) |
| Métrica de "disponibilidad de healthcheck" no directa en App Runner | Alarma AC-04 mal calibrada | Usar métrica de disponibilidad/health del servicio o proxy (fallos de request / ActiveInstances); validar con TS-04; decisión de Tech Lead |

---

## 18. Implementation Guidance for Coding Agents

- **Archivos/carpetas probablemente impactados:**
  - Configuración/IaC de CloudWatch (consola o, si se versiona, plantilla): Log Group + retención, metric filters/custom metrics, alarmas 5xx y healthcheck. Reutilizar el patrón de config de App Runner de US-136.
  - Instrumentación de métricas de IA en la capa `LLMProvider`/servicio de IA existente (US-115) — solo asegurar el **shipping** a CloudWatch, sin rediseñar.
  - Middleware/logger existente (US-113/US-114) — solo verificar redacción y `correlationId`, sin reescribir.
  - Documentación de env/observabilidad (retención, namespaces de métricas, alarmas).
- **Orden recomendado:** (1) verificar visibilidad de logs en el Log Group + fijar retención 14–30 días; (2) confirmar/publicar métricas del servicio y métricas operativas de IA; (3) crear alarma de 5xx (umbral + periodos); (4) crear alarma de healthcheck/disponibilidad (multi-periodo); (5) verificaciones TS-01..TS-04 y negativos NT-01..NT-03.
- **Decisiones que NO deben reabrirse:** App Runner + CloudWatch (ADR-DEVOPS-001); endpoints `/health` `/health/ready` (US-116); envío base de logs a CloudWatch (US-136); paths canónicos de healthcheck; observabilidad mínima viable sin APM/tracing (NFR-OBS-006).
- **Qué NO implementar:** endpoints de salud, APM/OpenTelemetry/tracing/Grafana, alarmas de latencia/LLM, on-call/PagerDuty, IaC obligatoria, cambios de lógica de backend.
- **Suposiciones a preservar:** backend ya desplegado en App Runner con logs a CloudWatch (US-136); `/health` y `/health/ready` operativos (US-116); logger + correlationId + métricas de IA ya instrumentados (US-113/114/115); sin secretos/PII en logs.

---

## 19. Task Generation Notes

- **Grupos de tareas sugeridos:**
  - (OPS) Verificar Log Group + configurar retención 14–30 días.
  - (OPS/BACKEND) Confirmar/publicar métricas del servicio y métricas operativas de IA a CloudWatch.
  - (OPS) Alarma de 5xx (umbral + evaluationPeriods/datapointsToAlarm).
  - (OPS) Alarma de healthcheck/disponibilidad (multi-periodo, treatMissingData).
  - (SEC) Redacción de secretos/PII en logs/métricas + permisos IAM mínimos.
  - (QA) Verificación TS-01..TS-04 y negativos NT-01..NT-03; UT-01/UT-02.
  - (DOC) Nota de alineación de naming healthcheck y promoción de alarmas mínimas al MVP en docs/21.
- **Tareas QA requeridas:** visibilidad de logs, llegada de métricas, disparo de alarmas bajo umbral simulado, healthcheck-down, negativos.
- **Tareas de seguridad requeridas:** sin secretos/PII en logs/métricas; permisos IAM mínimos.
- **Tareas de seed/demo requeridas:** ninguna.
- **Tareas de documentación requeridas:** naming healthcheck; nota de alarmas mínimas en docs/21.
- **Dependencias entre tareas:** logs/retención y métricas antes de las alarmas; alarmas antes de la verificación de disparo; fail-fast de config antes de declarar el entorno monitoreado.
- **Consolidación:** PB-P3-002 puede consolidar sus tareas en un `tasks.md` propio (una sola US en el ítem).

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P3-002) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A (observa, no implementa) |
| DB impact clear | N/A |
| AI impact clear | Pass (solo métricas operativas de IA) |
| Security impact clear | Pass (sin secretos/PII; healthcheck público) |
| Testing strategy clear | Pass (infra + integración + negativos) |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada (Approved with Minor Notes), mapeada a **PB-P3-002** (P3, Must Have, EPIC-OPS-001), con alcance claro y **acotado a observabilidad CloudWatch**: verificar logs visibles + retención, publicar/verificar métricas de servicio y operativas de IA, y configurar alarmas mínimas de 5xx y de healthcheck con umbral/periodos que eviten falsos positivos. No reabre US-116 (endpoints de salud) ni US-136 (shipping base de logs). Las notas de Documentation Alignment (naming `/healthz` `/readyz` vs `/health` `/health/ready`; promoción de alarmas mínimas al MVP) son **no bloqueantes**. Frontend, base de datos e invocación de IA = No aplica. Listo para generar Development Tasks.

---

Technical Specification created: Yes
Path: `management/technical-specs/P3/PB-P3-002/US-141-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P3-002
Execution Order: P3 #2 (segundo ítem del bloque P3 por posición en el backlog)
Next step: Run `eventflow-user-story-to-development-tasks`.
