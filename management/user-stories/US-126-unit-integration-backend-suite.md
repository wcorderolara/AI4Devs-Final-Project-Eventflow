# 🧾 User Story: Suite unit + integration backend

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-126                               |
| Epic               | EPIC-QA-001                          |
| Feature            | Backend tests                        |
| Backlog Item       | PB-P2-014                            |
| Module / Domain    | QA                                   |
| User Role          | System                               |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-07-07                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-07-07                           |

---

## 🎯 User Story

**As the** equipo QA
**I want** una suite automatizada de pruebas unitarias e de integración sobre la capa de dominio, aplicación (use cases) y repositorios/middlewares del backend, ejecutada con Vitest
**So that** se detecten regresiones tempranas y se garantice ≥50% de cobertura sobre la lógica crítica, con la compuerta de CI bloqueando el merge cuando la cobertura baja o las pruebas fallan.

---

## 🧠 Business Context

### Context Summary
La suite unit + integration constituye la base ancha de la pirámide de pruebas de EventFlow (Doc 20). Prioriza pruebas rápidas y determinísticas sobre la lógica de dominio (donde viven las reglas BR-*) y refuerza con pruebas de integración sobre use cases, repositorios Prisma y middlewares (autenticación + policy). La cobertura se mide en CI y actúa como compuerta de calidad: el merge se bloquea si la cobertura de la lógica crítica baja del umbral acordado o si existen pruebas críticas falladas o saltadas.

### Related Domain Concepts
* Use cases (capa de aplicación) y políticas de dominio (BR-*).
* Repositorios Prisma y constraints de base de datos (FKs, unique, enums, soft delete).
* Middleware de autenticación y middleware de policy (RBAC + ownership + assignment).
* `MockAIProvider` como dependencia determinística de IA en pruebas.

### Assumptions
* La política de cobertura y la estrategia de pruebas están definidas en `/docs/20-Testing-Strategy.md`.
* El stack de pruebas backend está fijado por `ADR-TEST-001` (Vitest + Supertest).
* La infraestructura de CI que ejecuta las compuertas existe como dependencia (PB-P0-015).

### Dependencies
* PB-P0-015 — Base de CI/pipeline que ejecuta las compuertas de calidad.
* Estructura backend (use cases, repositorios, middleware) descrita en `/docs/14-Backend-Technical-Design.md`.
* Disponibilidad de PostgreSQL efímero (contenedor o esquema temporal) para pruebas de integración.

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa directamente un UC; habilita capacidades futuras de calidad. |
| Use Case(s)            | Transversal — cubre la lógica de múltiples UC vía sus use cases y políticas. |
| Business Rule(s)       | Transversal — valida reglas BR-* en la capa backend (source of truth). |
| Permission Rule(s)     | Cobertura de middleware de autenticación y policy (RBAC + ownership + assignment). |
| Data Entity / Entities | Transversal — integración sobre repositorios Prisma y constraints. |
| API Endpoint(s)        | No aplica — las pruebas API (Supertest) pertenecen a otra suite (PB-P2-014/Doc 20 §6.3). Esta historia cubre unit + integration. |
| NFR Reference(s)       | NFR-TEST-*, NFR-PERF-API-001, NFR-OBS-001                       |
| Related ADR(s)         | ADR-TEST-001 (Vitest + Supertest), ADR-DEVOPS-001               |
| Related Document(s)    | /docs/20-Testing-Strategy.md, /docs/21-Deployment-and-DevOps-Design.md, /docs/14-Backend-Technical-Design.md, /docs/11-Data-Seed-Strategy.md |
| Backlog Item           | PB-P2-014                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope
* Pruebas unitarias de dominio (políticas BR-*), aplicación (lógica de use cases), esquemas Zod y utilidades/mapeadores.
* Pruebas de integración de use case + repositorio Prisma sobre base de datos efímera.
* Pruebas de integración de constraints de base de datos (FKs, unique, enums, soft delete).
* Pruebas de integración de middleware de autenticación + middleware de policy.
* Pruebas de integración del módulo IA usando `MockAIProvider`.
* Reporte de cobertura y umbral aplicado como compuerta de CI.

### Explicitly Out of Scope
* Pruebas API HTTP end-to-end vía Supertest sobre el servidor Express completo (Doc 20 §6.3 — suite API).
* Pruebas de contrato con MSW (PB-P2-015 / US-127).
* Pruebas E2E con Playwright sobre seed (PB-P2-016).
* Pruebas de frontend (componentes, páginas, flujos).
* Llamadas reales a proveedores de IA externos en CI.
* Funciones futuras no listadas en el Epic Map.

### Scope Notes
* Respetar los guardrails MVP y la pirámide de pruebas de Doc 20 (base unit amplia, integración sólida).
* La cobertura es métrica de soporte, no la única métrica de calidad: los casos negativos de autorización son obligatorios aunque no muevan el porcentaje.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Suite unitaria sobre lógica de dominio y aplicación
**Given** el código backend de dominio, aplicación, esquemas Zod y utilidades
**When** se ejecuta la suite unitaria con Vitest
**Then** existen pruebas unitarias determinísticas que validan políticas de dominio (BR-*), lógica de use cases, validación/transformación de esquemas Zod y utilidades/mapeadores, y todas pasan en verde.

### AC-02: Suite de integración sobre use cases, repositorios y middlewares
**Given** una base de datos PostgreSQL efímera y `MockAIProvider` configurados para pruebas
**When** se ejecuta la suite de integración con Vitest
**Then** existen pruebas que validan use case + repositorio Prisma, constraints de base de datos (FKs, unique, enums, soft delete), middleware de autenticación + policy, y el módulo IA con `MockAIProvider`, y todas pasan en verde con limpieza automática del estado.

### AC-03: Cobertura mínima sobre lógica crítica
**Given** la suite unit + integration ejecutándose en CI
**When** se genera el reporte de cobertura (c8/istanbul vía Vitest)
**Then** la cobertura sobre la lógica crítica es ≥50% y, si el valor cae por debajo del umbral configurado, la compuerta de CI marca la ejecución como fallida.

### AC-04: Determinismo y repetibilidad
**Given** el mismo input y el mismo código
**When** la suite se ejecuta varias veces localmente y en CI
**Then** el resultado es consistente: sin dependencia de proveedores de IA reales (`MockAIProvider` obligatorio), sin red externa, con IDs/fixtures controlados y base de datos efímera reiniciada entre corridas.

### AC-05: Compuerta de CI bloqueante
**Given** un Pull Request contra la rama protegida
**When** se ejecuta la compuerta de calidad de CI
**Then** las pruebas unitarias e de integración del backend se ejecutan como compuertas obligatorias y el merge se bloquea si alguna prueba crítica falla, si hay pruebas críticas saltadas (`.skip`/`xfail`) o si la cobertura mínima no se cumple.

---

## ⚠️ Edge Cases

### EC-01: Base de datos efímera no disponible
**Given** la dependencia de PostgreSQL efímero no puede iniciarse
**When** se ejecuta la suite de integración
**Then** la ejecución falla de forma controlada (fail-fast) con un mensaje claro, sin marcar las pruebas como verdes ni saltarlas silenciosamente.

#### Handling
* Fail-fast en el helper `test-db` con mensaje explícito; no degradar a pruebas omitidas.

### EC-02: Salida de IA no determinística
**Given** una prueba que involucra el módulo IA
**When** se ejecuta la suite
**Then** la prueba usa exclusivamente `MockAIProvider` y valida contra el schema esperado, no contra texto literal, evitando falsos positivos/negativos.

#### Handling
* `MockAIProvider` obligatorio en CI; aserciones sobre estructura/schema, no sobre contenido textual.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | Configuración de entorno de pruebas válida                 | Fail-fast con mensaje explícito             |
| VR-02 | `OPENAI_API_KEY` ausente en CI; solo `MockAIProvider`      | Bloquear ejecución si se intenta IA real    |
| VR-03 | Sin pruebas críticas saltadas (`.skip`/`xfail`)            | Compuerta de CI falla                       |
| VR-04 | Cobertura de lógica crítica ≥ umbral configurado           | Compuerta de CI falla si no se cumple       |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar políticas de seguridad del Doc 19 en las pruebas de middleware. |
| SEC-02 | Secrets vía Secrets Manager; ningún secreto real de IA en CI.       |
| SEC-03 | Sin secretos en logs ni en fixtures de prueba.                      |
| SEC-04 | Cubrir casos negativos de autorización (401/403) en pruebas de middleware de policy. |

### Negative Authorization Scenarios
* Middleware de policy que niega acceso por rol/ownership/assignment debe estar cubierto por pruebas negativas.
* Configuración insegura del entorno de pruebas → bloqueo (fail-fast).

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None (usa `MockAIProvider` como dependencia de prueba, no ejecuta IA productiva).
* Provider Layer: `MockAIProvider` únicamente en pruebas.
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
* Not applicable for this story. Las pruebas del módulo IA validan schema con `MockAIProvider`.

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | N/A   |
| Main UI Pattern     | N/A   |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | N/A   |
| Success State       | N/A   |
| Accessibility Notes | N/A — historia sin UI. |
| Responsive Notes    | N/A — historia sin UI. |
| i18n Notes          | N/A — historia sin UI. |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* Use Case / Service: Capacidad técnica de QA — cobertura de use cases, políticas de dominio y repositorios existentes.
* Controller / Route: N/A (unit + integration; no cubre la capa HTTP completa).
* Authorization Policy: Cobertura de middleware de autenticación + policy.
* Validation: Cobertura de esquemas Zod.
* Transaction Required: N/A
* Herramientas: Vitest (runner), Prisma sobre base de datos efímera, `MockAIProvider`, c8/istanbul para cobertura.

### Database
* Main Tables: Transversal — pruebas de integración sobre repositorios y constraints.
* Constraints: FKs, unique, enums, soft delete validados en integración.
* Index Considerations: N/A

### API

| Method | Endpoint | Purpose                                   |
| ------ | -------- | ----------------------------------------- |
| —      | —        | No aplica — cobertura unit + integration. |

### Observability / Audit
* Correlation ID Required: Yes (verificar propagación donde el use case lo requiera).
* Log Event Required: Yes (sin secretos en logs de prueba).
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                        | Type        |
| ----- | -------------------------------------------------------------- | ----------- |
| TS-01 | Políticas de dominio (BR-*) validadas en unit                  | Unit        |
| TS-02 | Lógica de use cases validada en unit                           | Unit        |
| TS-03 | Esquemas Zod (validación/transformación/defaults) en unit      | Unit        |
| TS-04 | Use case + repositorio Prisma sobre BD efímera                 | Integration |
| TS-05 | Constraints de BD (FK/unique/enum/soft delete)                 | Integration |
| TS-06 | Middleware de autenticación + policy                           | Integration |
| TS-07 | Módulo IA con `MockAIProvider` (schema)                        | Integration |
| TS-08 | Reporte de cobertura ≥ umbral en CI                            | CI Gate     |

### Negative Tests

| ID    | Scenario                                    | Expected Result                     |
| ----- | ------------------------------------------- | ----------------------------------- |
| NT-01 | Base de datos efímera no disponible         | Fail-fast con mensaje claro         |
| NT-02 | Cobertura crítica por debajo del umbral     | Compuerta de CI falla               |
| NT-03 | Prueba crítica saltada (`.skip`/`xfail`)    | Compuerta de CI falla               |
| NT-04 | Autorización negada (rol/ownership) por policy | 401/403 cubierto por prueba negativa |

### AI Tests
* Pruebas del módulo IA usan exclusivamente `MockAIProvider` y validan contra schema, no texto literal.

### Authorization Tests

| ID         | Scenario                                     | Expected Result |
| ---------- | -------------------------------------------- | --------------- |
| AUTH-TS-01 | Middleware permite acceso autorizado         | Success         |
| AUTH-TS-02 | Middleware niega acceso por rol/ownership    | 401/403         |

### Accessibility Tests
* No aplica — historia sin UI.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Calidad, detección temprana de regresiones, time-to-deploy |
| Expected Impact     | Habilita compuerta de calidad automatizada en CI      |
| Success Criteria    | Suite unit + integration verde y cobertura ≥50% lógica crítica en CI |
| Academic Demo Value | Foundation — evidencia de calidad y disciplina de pruebas |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* Configurar runner Vitest y estructura de carpetas `tests/unit` y `tests/integration`.
* Implementar helpers `test-db`, `mock-ai` y fixtures base.
* Escribir pruebas unitarias de dominio, use cases, schemas y utils.
* Escribir pruebas de integración de repositorios, constraints y middlewares.

### Potential Database Tasks
* Aprovisionar PostgreSQL efímero para integración (contenedor o esquema temporal).

### Potential AI / PromptOps Tasks
* Fixtures de `MockAIProvider` conformes a schema.

### Potential QA Tasks
* Definir umbral de cobertura y reporte c8/istanbul.
* Validar determinismo y ausencia de flakiness.

### Potential DevOps / Config Tasks
* Integrar unit + integration como compuertas obligatorias de CI.
* Configurar el gate de cobertura mínima bloqueante.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo QA).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 20, Doc 14, ADR-TEST-001).
* [x] Permisos / Seguridad (cobertura de middleware de policy).
* [x] Entidades listadas (transversal, repositorios y constraints).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P0-015).
* [x] UX states identificados (N/A — sin UI).
* [x] API definida (N/A — unit + integration).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Suite unit + integration implementada y verde.
* [ ] Cobertura ≥50% sobre lógica crítica reportada en CI.
* [ ] Compuerta de CI bloquea merge ante fallos, `.skip` críticos o cobertura insuficiente.
* [ ] Pruebas determinísticas (sin IA real ni red externa).
* [ ] Casos negativos de autorización cubiertos.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Confirmar con Tech Lead / QA Architect el umbral final de cobertura. La estrategia de pruebas (Doc 20 §22) recomienda un mínimo global de 60% y 80%+ para use cases críticos y políticas de autorización; el backlog PB-P2-014 fija ≥50% sobre lógica crítica como objetivo mínimo aceptable. Se toma ≥50% como umbral de esta historia y los valores de Doc 20 como meta aspiracional (ver Documentation Alignment).
* La cobertura es métrica de soporte: una suite con alta cobertura pero sin pruebas negativas de autorización se considera insuficiente.
