# 🧾 User Story: Monitoring CloudWatch mínimo (logs, métricas y alarmas)

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-141                               |
| Epic               | EPIC-OPS-001                         |
| Feature            | Observabilidad operacional en CloudWatch (logs + métricas + alarmas mínimas) |
| Module / Domain    | DevOps / Observability              |
| User Role          | System                              |
| Priority           | Must Have (P3)                      |
| Status             | Approved with Minor Notes           |
| Owner              | Product Owner / Business Analyst    |
| Approved By        | PO/BA Review                        |
| Approval Date      | 2026-07-07                          |
| Ready for Development Tasks | Yes                        |
| Sprint / Milestone | MVP                                 |
| Created Date       | 2026-06-09                          |
| Last Updated       | 2026-07-07                          |

---

## 🎯 User Story

**As the** equipo de operaciones de EventFlow
**I want** que el backend envíe logs y métricas básicas a CloudWatch y que existan alarmas mínimas para errores 5xx y para la caída del healthcheck
**So that** tengamos visibilidad operacional durante la demo y podamos detectar caídas del servicio con rapidez

---

## 🧠 Business Context

### Context Summary
Esta historia entrega la **capa mínima de monitoreo** sobre el backend ya desplegado en AWS App Runner. El objetivo es visibilidad operacional para la demo académica: que los logs del backend sean visibles en CloudWatch Logs, que se emitan métricas básicas (incluidas métricas operativas de IA) y que exista al menos una alarma activa sobre errores 5xx más una alarma sobre la caída/indisponibilidad del healthcheck.

No implementa los endpoints de salud (`/health`, `/health/ready`); esos son propiedad de **US-116 (PB-P2-013)** y ya fueron entregados. Esta historia **observa** esos endpoints y agrega la capa de métricas + alarmas encima del envío de logs que US-136 (PB-P2-022) ya provee.

### Related Domain Concepts
* CloudWatch Logs (logs centralizados del backend desde App Runner).
* CloudWatch Metrics (métricas básicas del servicio y métricas operativas de IA).
* CloudWatch Alarms (alarma de errores 5xx; alarma de caída/indisponibilidad del healthcheck).
* Healthcheck `/health` consumido por App Runner (propiedad de US-116 / US-136).

### Assumptions
* El backend ya está desplegado en **AWS App Runner** y emite stdout/stderr a **CloudWatch Logs** automáticamente (US-136 / PB-P2-022; docs/21 §19.1).
* Los endpoints `/health` y `/health/ready` ya existen y funcionan (US-116 / PB-P2-013).
* App Runner ya usa `GET /health` para verificar disponibilidad del servicio (docs/21 §10.4).
* La observabilidad MVP es **mínima viable**: CloudWatch, sin APM ni tracing distribuido (NFR-OBS-006).
* Retención de logs corta (14–30 días) para limitar costos (docs/21 §30 tabla).

### Dependencies
* **PB-P2-010** — dependencia declarada en backlog (base de plataforma/observabilidad P2).
* **PB-P2-011** — dependencia declarada en backlog.
* **PB-P2-012** — dependencia declarada en backlog.
* **PB-P2-013** (US-116) — Healthcheck y readiness (`/health`, `/health/ready`); esta historia los observa, no los implementa.
* **PB-P2-022** (US-136) — Deploy backend en App Runner con logs a CloudWatch; esta historia agrega métricas + alarmas encima.

---

## 🔗 Traceability

| Source                 | Reference                          |
| ---------------------- | ---------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa directamente un UC; habilita observabilidad operacional. |
| Use Case(s)            | Transversal — no implementa directamente un UC. |
| Business Rule(s)       | Transversal — no aplica regla de negocio funcional. |
| Permission Rule(s)     | No aplica — no introduce autorización runtime; el healthcheck es público y no autenticado (docs/21 §10.4). |
| Data Entity / Entities | No aplica — no introduce entidades de dominio. |
| API Endpoint(s)        | Observa (no implementa): `GET /health`, `GET /health/ready` (propiedad de US-116). |
| NFR Reference(s)       | NFR-OBS-002, NFR-OBS-003, NFR-OBS-005, NFR-OBS-006, NFR-REL-002 |
| Related ADR(s)         | ADR-DEVOPS-001 (AWS/App Runner/CloudWatch), ADR-TEST-001 (Vitest + Supertest) |
| Related Document(s)    | docs/21 (§10.4, §19, §30), docs/10 (NFR-OBS), docs/19 (§ logging/secretos), docs/20, docs/22 |
| Backlog Item           | PB-P3-002 — Monitoring CloudWatch mínimo |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P3)

### Explicitly Out of Scope
* Los endpoints `/health` y `/health/ready` — son propiedad de **US-116 (PB-P2-013)** y NO se reimplementan aquí.
* El envío base de logs de App Runner a CloudWatch — ya entregado por **US-136 (PB-P2-022)**; aquí solo se verifica visibilidad y se agrega métricas + alarmas.
* APM, tracing distribuido, OpenTelemetry, ELK o dashboards Grafana (NFR-OBS-006; docs/21 §29/§31 — evolución futura).
* Dashboards pagos o avanzados más allá del mínimo de CloudWatch.
* On-call, PagerDuty, escalamiento o rutas de notificación de alarmas más allá de la configuración mínima de CloudWatch.
* Alarmas de latencia/percentiles y alarmas de fallo del LLM como objetivo formal (docs/21 §19.3 las lista como futuro; fuera del alcance mínimo de PB-P3-002).

### Scope Notes
* Alcance limitado estrictamente al Acceptance Summary de PB-P3-002: logs visibles + 1 o más alarmas activas + métricas de IA llegando a CloudWatch.
* Respetar guardrails MVP: observabilidad mínima viable, sin sobrecarga enterprise.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Logs del backend visibles en CloudWatch Logs
**Given** el backend desplegado en App Runner emitiendo logs estructurados a stdout/stderr
**When** un operador consulta el log group correspondiente en CloudWatch Logs
**Then** los logs del backend son visibles y consultables (con `correlationId` y sin datos sensibles), confirmando la visibilidad operacional.

### AC-02: Métricas básicas emitidas a CloudWatch (incluidas métricas de IA)
**Given** el backend en operación procesando solicitudes, incluyendo flujos de IA simulados/reales
**When** el backend emite métricas básicas del servicio y métricas operativas de IA
**Then** dichas métricas llegan a CloudWatch Metrics y son consultables (por ejemplo, invocaciones/errores/timeouts de IA), confirmando que las métricas de IA llegan.

### AC-03: Al menos una alarma activa sobre errores 5xx
**Given** las métricas del backend disponibles en CloudWatch
**When** la tasa/conteo de respuestas 5xx supera el umbral configurado
**Then** existe al menos una alarma de CloudWatch en estado activo que pasa a `ALARM`, cumpliendo el criterio de "1+ alarma activa".

### AC-04: Alarma sobre caída/indisponibilidad del healthcheck
**Given** el endpoint `/health` que App Runner usa para verificar disponibilidad (propiedad de US-116)
**When** el healthcheck queda indisponible o el servicio se reporta no saludable de forma sostenida
**Then** una alarma de CloudWatch detecta la condición de caída/indisponibilidad y pasa a `ALARM`.

---

## ⚠️ Edge Cases

### EC-01: Dependencia caída dispara el estado no saludable
**Given** una dependencia crítica del backend caída (por ejemplo, conexión a base de datos) que hace fallar el readiness
**When** el healthcheck/readiness reporta indisponibilidad de forma sostenida
**Then** la alarma de healthcheck pasa a `ALARM` y el evento queda registrado en logs de forma controlada (NFR-REL-002).

#### Handling
* La alarma se evalúa sobre múltiples periodos para evitar falsos positivos por picos transitorios.

### EC-02: Pico transitorio de 5xx no genera falso positivo permanente
**Given** un pico breve de errores 5xx
**When** el pico se resuelve por sí solo dentro del periodo de evaluación
**Then** la alarma solo dispara si el umbral se sostiene según su configuración, y vuelve a `OK` al normalizarse.

#### Handling
* Umbral y número de periodos de evaluación configurados para diferenciar picos transitorios de degradación sostenida.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                        |
| ----- | ---------------------------------------------------------- | ----------------------------------------- |
| VR-01 | Debe existir al menos una alarma activa (5xx).             | Configuración inválida → fail-fast en IaC/setup |
| VR-02 | Debe existir una alarma sobre caída del healthcheck.       | Configuración inválida → fail-fast en IaC/setup |
| VR-03 | Los logs no deben contener secretos ni datos sensibles.    | Redacción obligatoria (docs/19 §logging)  |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| SEC-01 | El healthcheck es **público y no autenticado** (docs/21 §10.4); no debe exponer datos sensibles ni internos. |
| SEC-02 | Sin secretos en logs ni en métricas; valores sensibles solo via Secrets Manager / SSM (docs/19; docs/21 §10.5). |
| SEC-03 | Loguear identificadores y métricas, no datos sensibles ni PII (docs/21 §19.2; SEC-PRIN-005). |

### Negative Authorization Scenarios
* Configuración que exponga secretos o PII en logs/métricas → bloqueo y corrección obligatoria.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None (no invoca IA)
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input
* Not applicable for this story.

### AI Output
* Not applicable for this story.

### Human-in-the-loop Rules
* Not applicable for this story.

### AI Error / Fallback Behavior
* No invoca IA. Sí observa/emite **métricas operativas de IA** (invocaciones, errores, timeouts, uso de fallback) hacia CloudWatch, alineado con NFR-OBS-002.

---

## 🎨 UX / UI Notes

| Area                | Notes                                  |
| ------------------- | -------------------------------------- |
| Screen / Route      | N/A — historia de infraestructura/observabilidad |
| Main UI Pattern     | N/A                                    |
| Primary Action      | N/A                                    |
| Secondary Actions   | N/A                                    |
| Empty State         | N/A                                    |
| Loading State       | N/A                                    |
| Error State         | N/A                                    |
| Success State       | N/A                                    |
| Accessibility Notes | No aplica — sin UI                     |
| Responsive Notes    | No aplica — sin UI                     |
| i18n Notes          | No aplica — sin UI                     |
| Currency Notes      | No aplica                             |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* Use Case / Service: Emisión de logs estructurados y métricas básicas (incluidas métricas de IA) a CloudWatch.
* Controller / Route: No implementa endpoints. Observa `GET /health` y `GET /health/ready` (propiedad de US-116).
* Authorization Policy: No introduce autorización runtime; healthcheck público (docs/21 §10.4).
* Validation: No aplica a nivel de request; validación aplica a la configuración de alarmas/logs (VR-01..VR-03).
* Transaction Required: No.

### Database
* Main Tables: No aplica.
* Constraints: No aplica.
* Index Considerations: No aplica.

### Infra / DevOps
* Plataforma: AWS App Runner + CloudWatch (ADR-DEVOPS-001; docs/21).
* Logs: CloudWatch Logs con retención 14–30 días (docs/21 §30).
* Métricas: CloudWatch Metrics para el servicio y métricas operativas de IA (NFR-OBS-002).
* Alarmas: (1) tasa/conteo de 5xx; (2) caída/indisponibilidad del healthcheck. Configuración de umbral y periodos de evaluación para evitar falsos positivos.

### Observability / Audit
* Correlation ID Required: Yes (logs con `correlationId`, docs/21 §19).
* Log Event Required: Yes.
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                       | Type        |
| ----- | -------------------------------------------------------------- | ----------- |
| TS-01 | Logs del backend visibles y consultables en CloudWatch Logs.   | Integration / Infra |
| TS-02 | Métricas básicas y de IA llegan a CloudWatch Metrics.          | Integration / Infra |
| TS-03 | Alarma de 5xx configurada y activa; pasa a `ALARM` bajo umbral simulado. | Infra / Integration |
| TS-04 | Alarma de healthcheck detecta indisponibilidad simulada.       | Infra / Integration |

### Negative Tests

| ID    | Scenario                                            | Expected Result                     |
| ----- | --------------------------------------------------- | ----------------------------------- |
| NT-01 | Configuración de alarma faltante/ inválida.         | Fail-fast en setup/IaC              |
| NT-02 | Log emite un valor sensible.                        | Redacción/bloqueo; no aparece en CloudWatch |
| NT-03 | Pico transitorio de 5xx dentro del periodo.         | No dispara falso positivo permanente |

### AI Tests
Not applicable for this story (no invoca IA). Las métricas operativas de IA se validan en TS-02.

### Authorization Tests

| ID         | Scenario                                            | Expected Result |
| ---------- | --------------------------------------------------- | --------------- |
| AUTH-TS-01 | `GET /health` accesible sin autenticación y sin exponer datos sensibles. | 200 OK, payload liviano |

### Accessibility Tests
* No aplica — historia sin UI.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Visibilidad operacional, tiempo de detección de caídas (MTTD) |
| Expected Impact     | Detección rápida de caídas y errores durante la demo |
| Success Criteria    | Logs visibles en CloudWatch · 1+ alarma activa · métricas de IA llegando |
| Academic Demo Value | Evidencia de operabilidad y observabilidad mínima del MVP |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* Emitir/verificar métricas básicas y métricas operativas de IA hacia CloudWatch.
* Asegurar logs estructurados con `correlationId` y redacción de datos sensibles.

### Potential Database Tasks
* No aplica.

### Potential AI / PromptOps Tasks
* No aplica (solo métricas operativas de IA, cubiertas en tareas de backend/observabilidad).

### Potential QA Tasks
* Verificar visibilidad de logs, llegada de métricas y disparo de alarmas (TS-01..TS-04, NT-01..NT-03).

### Potential DevOps / Config Tasks
* Configurar log group y retención en CloudWatch.
* Configurar alarma de 5xx y alarma de healthcheck con umbral/periodos adecuados.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo de operaciones).
* [x] Goal técnico claro (logs + métricas + alarmas mínimas en CloudWatch).
* [x] Referencias a docs verificadas (docs/21, docs/10, docs/19, docs/20, docs/22).
* [x] Seguridad definida (healthcheck público sin datos sensibles; sin secretos en logs).
* [x] Dependencias explícitas (PB-P2-010..013, PB-P2-022).
* [x] AC en formato GWT y testeables.
* [x] Edge cases documentados.
* [x] Out of Scope explícito (endpoints de US-116; no APM/tracing/Grafana).
* [x] Tests definidos.
* [ ] Tech Lead validó configuración de alarmas.

---

## 🏁 Definition of Done

* [ ] Logs del backend visibles en CloudWatch Logs.
* [ ] Métricas básicas y de IA llegando a CloudWatch Metrics.
* [ ] Al menos una alarma de 5xx activa y una alarma de healthcheck configuradas y verificadas.
* [ ] Sin secretos ni datos sensibles en logs/métricas.
* [ ] Tests TS-01..TS-04 y NT-01..NT-03 verdes.
* [ ] Tech Lead valida la configuración.

---

## 📝 Notes
* Alcance alineado a PB-P3-002 (P3, Must Have, EPIC-OPS-001). Prioridad corregida de P0 a P3 por precedencia del Product Backlog Prioritized.
* Reencuadre de alcance: esta historia es de **observabilidad/monitoreo (CloudWatch)**, no reimplementa `/health` ni `/health/ready` (propiedad de US-116 / PB-P2-013), y se apoya en el envío de logs ya entregado por US-136 / PB-P2-022.
* IDs de trazabilidad falsos removidos: `NFR-PERF-API-001` (inexistente) y el comodín `NFR-TEST-*` fueron reemplazados por NFR-OBS/NFR-REL reales.
