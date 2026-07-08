# 🧾 User Story: Smoke automatizado sobre la URL de Demo

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-146                               |
| Epic               | EPIC-DEMO-001 — Demo Readiness       |
| Feature            | Smoke Demo (post-deploy)             |
| Module / Domain    | Demo / QA                            |
| User Role          | System                              |
| Priority           | Must Have (P3)                      |
| Status             | Approved with Minor Notes           |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                        |
| Approval Date      | 2026-07-08                          |
| Ready for Development Tasks | Yes                        |
| Sprint / Milestone | MVP                                 |
| Created Date       | 2026-06-09                          |
| Last Updated       | 2026-07-08                          |

---

## 🎯 User Story

**As the** equipo de entrega (System / QA)  
**I want** un smoke test automatizado y mínimo, ejecutable manualmente o por workflow post-deploy, que valide los flujos críticos de la demo (login, listado de eventos, generación IA con Mock y comparador) contra la URL pública Demo  
**So that** obtengamos confianza pre-demo y evitemos que la presentación y la evaluación académica del MVP fallen por regresiones introducidas en el último despliegue

---

## 🧠 Business Context

### Context Summary
Historia técnica / QA de **demo readiness**. El entregable es una **suite mínima de smoke E2E con Playwright** que se ejecuta **después del despliegue** contra la **URL pública Demo** (frontend Amplify + backend App Runner) y verifica que los caminos indispensables para la demo siguen funcionando. No es la suite E2E completa: es un subconjunto rápido y estable diseñado para pasar en **menos de 5 minutos** (PB-P3-007). La suite debe poder invocarse de dos formas: **manual** (comando documentado en runbook) y por **workflow opcional post-deploy** (`smoke.yml`, docs/21 §16.1). Ante fallo, produce evidencia (screenshots/trazas) y notifica para evaluar rollback manual (docs/21 §16.4). Es una de las mitigaciones del riesgo "Demo URL inestable cerca de la presentación" (docs/4 §Riesgos; PB-P3-002, PB-P3-004, PB-P3-007).

### Related Domain Concepts
* Suite E2E Playwright sobre seed reproducible (**US-128 / PB-P2-016**), de la cual esta historia **reutiliza** infraestructura y helpers, sin reimplementar el flujo completo.
* Datos seed demo reproducibles (`seed:demo`, PB-P0-014) y reset del entorno demo (**US-140 / PB-P3-001**) como precondición de estado estable.
* Toggle de proveedor de IA `LLM_PROVIDER` (`openai` / `mock`) y `AI_USE_MOCK_FALLBACK` / `AI_DEMO_MODE` (docs/21 §25.3; runbook US-144 / PB-P3-005). El smoke usa **Mock** para determinismo.
* Checklist pre-demo (**US-143 / PB-P3-003**), que referencia el resultado verde de este smoke como ítem de verificación.
* URLs públicas Demo documentadas (docs/21 §25.1).

### Assumptions
* La suite E2E Playwright base y sus helpers ya existen (US-128 / PB-P2-016) y pueden ejecutarse contra una URL externa configurable (base URL parametrizable).
* Existen usuarios sembrados y documentados para la demo (docs/21 §25.2; docs/11): al menos 1 admin, 1 organizador, 1 vendor, cuyas credenciales de demo se inyectan por variables de entorno / secretos, nunca hardcodeadas.
* El estado del entorno Demo puede dejarse reproducible mediante el seed idempotente (PB-P0-014) y/o el reset del entorno demo (US-140 / PB-P3-001) antes de correr el smoke.
* El backend expone `GET /health` que responde `200` como precondición operativa (US-116 / PB-P2-013; docs/21 §23.3).
* Para la ejecución del smoke, el entorno Demo opera con IA en modo Mock determinista (`LLM_PROVIDER=mock` o `AI_USE_MOCK_FALLBACK=true`) para evitar flakiness y consumo de cuota externa.

### Dependencies
* **PB-P2-016 (US-128)** — Suite E2E Playwright sobre seed. Provee la infraestructura Playwright, page objects/helpers y patrones de aserción reutilizados aquí.
* **PB-P3-001 (US-140)** — Endpoint/workflow de reset del entorno Demo. Permite dejar el estado del seed reproducible antes del smoke y es la acción correctiva ante datos corruptos.
* **PB-P2-013 (US-116)** — Healthcheck `GET /health`, usado como verificación previa de disponibilidad del backend.
* **PB-P3-005 (US-144)** — Runbook del toggle `LLM_PROVIDER` / `AI_DEMO_MODE`, referenciado para garantizar el modo Mock durante el smoke.

---

## 🔗 Traceability

| Source                 | Reference                          |
| ---------------------- | ---------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa directamente un UC; valida flujos ya implementados sobre la Demo URL. |
| Use Case(s)            | Observa (no implementa) UC-DEMO-001 y los flujos críticos cubiertos por US-128. |
| Business Rule(s)       | Transversal — no aplica regla de negocio funcional. |
| Permission Rule(s)     | No aplica — no introduce autorización runtime; el smoke se autentica como usuario sembrado usando el flujo de login existente. |
| Data Entity / Entities | No aplica — no introduce entidades de dominio; consume datos seed existentes. |
| API Endpoint(s)        | Observa (no implementa): flujo de login, listado de eventos, generación IA (Mock), comparador de cotizaciones, y `GET /health` como verificación previa. |
| NFR Reference(s)       | NFR-PERF-API-001, NFR-OBS-001, NFR-TEST-006 (captcha/stub determinista para test), y estrategia de smoke/demo readiness de Doc 20 (PT-09). |
| Related ADR(s)         | ADR-TEST-001 (stack de testing), ADR-DEVOPS-001 (AWS/App Runner/Amplify/CI GitHub Actions) |
| Related Document(s)    | docs/20 (§6.6 E2E, §PT-09, §Demo readiness), docs/21 (§16.1 `smoke.yml`, §16.4, §23.3, §25.4, §25.5), docs/11 (usuarios seed), docs/22 (ADRs) |
| Backlog Item           | PB-P3-007 — Smoke test sobre Demo URL |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P3)

### Explicitly Out of Scope
* La **suite E2E completa** sobre seed (auth → event → AI plan → tasks → budget → vendors → QR → quote → compare → booking → review) — es propiedad de **US-128 (PB-P2-016)** y NO se reimplementa aquí. Esta historia entrega un subconjunto de smoke.
* La creación o modificación del **seed** y del **endpoint/workflow de reset** — propiedad de PB-P0-014 y US-140 (PB-P3-001); aquí solo se consumen como precondición.
* El **healthcheck `/health`** — propiedad de US-116 (PB-P2-013); aquí solo se verifica su `200` como paso previo.
* La **automatización del rollback** — es manual por diseño en MVP (docs/21 §24); el smoke solo notifica el fallo.
* Pruebas de carga/estrés, monitoreo continuo, alarmas de CloudWatch (propiedad de US-141 / PB-P3-002) y APM/tracing — fuera de alcance.
* Uso de OpenAI real durante el smoke — se usa Mock por determinismo; el smoke no valida el proveedor OpenAI de producción.

### Scope Notes
* Alcance limitado estrictamente al Acceptance Summary de PB-P3-007: smoke pasa en <5 min y queda documentado en runbook.
* Respetar guardrails MVP: smoke mínimo, estable y reproducible; sin sobrecarga enterprise.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Smoke ejecutable contra la URL pública Demo
**Given** el entorno Demo desplegado (frontend Amplify + backend App Runner) con seed reproducible y `GET /health` respondiendo `200`  
**When** se ejecuta la suite de smoke apuntando a la base URL pública Demo (parametrizable por variable de entorno)  
**Then** la suite corre contra el entorno público real sin apuntar a localhost ni a mocks de frontend, validando los flujos críticos de extremo a extremo.

### AC-02: Cobertura mínima de flujos críticos de demo
**Given** usuarios sembrados y datos seed disponibles en el entorno Demo  
**When** se ejecuta el smoke  
**Then** valida al menos: (1) **login** con un usuario sembrado, (2) **listado de eventos** visible para ese usuario, (3) **generación IA con Mock** que retorna una recomendación revisable, y (4) **comparador de cotizaciones** que renderiza cotizaciones sembradas, cubriendo los caminos indispensables para la demo.

### AC-03: Determinismo mediante IA en modo Mock
**Given** el entorno Demo configurado con IA en modo Mock (`LLM_PROVIDER=mock` o `AI_USE_MOCK_FALLBACK=true`)  
**When** el smoke ejecuta el paso de generación IA  
**Then** la respuesta es determinista y no depende de un proveedor externo, evitando flakiness y consumo de cuota, y el smoke no invoca directamente al LLM desde el frontend.

### AC-04: Tiempo de ejecución dentro del presupuesto
**Given** la suite de smoke mínima  
**When** se ejecuta de principio a fin en el entorno Demo  
**Then** finaliza en **menos de 5 minutos** (PB-P3-007), manteniéndose apta para verificación pre-demo.

### AC-05: Resultado y ejecución documentados en runbook
**Given** la suite de smoke entregada  
**When** un operador consulta la documentación de demo readiness  
**Then** existe un runbook que describe cómo ejecutarlo **manualmente** y cómo se dispara por **workflow post-deploy** (`smoke.yml`), incluyendo precondiciones (seed/reset, modo Mock) y la interpretación de resultados.

### AC-06: Evidencia y señal de resultado
**Given** una ejecución del smoke (manual o por workflow)  
**When** la ejecución concluye  
**Then** emite un resultado claro verde/rojo con código de salida apropiado, registra la corrida con `correlationId` sin exponer secretos, y en caso de fallo adjunta evidencia (screenshots y/o trazas de Playwright).

---

## ⚠️ Edge Cases

### EC-01: Demo URL no disponible o healthcheck en rojo
**Given** el entorno Demo caído o `GET /health` sin responder `200`  
**When** se dispara el smoke  
**Then** el smoke falla de forma controlada (fail-fast) con un mensaje claro que identifica la indisponibilidad del entorno, sin producir un falso verde.

#### Handling
* Verificación previa de `GET /health`; si no responde `200`, abortar antes de correr los flujos y reportar la causa.

### EC-02: Seed en estado no reproducible
**Given** datos de demo alterados o incompletos (por ejemplo, sin cotizaciones para comparar)  
**When** el smoke ejecuta un flujo que depende de esos datos  
**Then** el paso falla de forma controlada e indica como acción correctiva ejecutar el reset del entorno Demo (US-140 / PB-P3-001) y volver a correr.

#### Handling
* Precondición documentada de dejar el estado reproducible (seed idempotente / reset) antes del smoke.

### EC-03: Proveedor IA no está en modo Mock
**Given** el entorno con `LLM_PROVIDER=openai` sin fallback a Mock durante el smoke  
**When** el paso de generación IA se ejecuta y el proveedor externo está lento, sin cuota o indisponible  
**Then** el smoke puede volverse inestable; la ejecución de smoke debe forzar/verificar modo Mock (o `AI_USE_MOCK_FALLBACK=true`) antes de validar el paso de IA.

#### Handling
* El runbook indica confirmar el modo de IA (US-144) como parte de las precondiciones del smoke.

---

## 🚫 Validation Rules

| ID    | Rule                                                                 | Message / Behavior                       |
| ----- | ------------------------------------------------------------------- | ---------------------------------------- |
| VR-01 | La base URL del smoke debe ser una URL pública Demo configurable.   | Falta de configuración → fail-fast       |
| VR-02 | Las credenciales de usuarios demo se inyectan por variables/secretos, nunca hardcodeadas. | Configuración insegura → bloqueo        |
| VR-03 | El paso de IA debe ejecutarse con IA en modo Mock/fallback.         | Configuración no determinista → fail-fast del paso |
| VR-04 | Verificación previa de `GET /health = 200` antes de los flujos.     | Entorno no disponible → fail-fast        |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar las políticas de seguridad de docs/19; el smoke se autentica con el flujo real y respeta la autorización del backend como fuente de verdad. |
| SEC-02 | Credenciales y secretos del smoke solo vía Secrets Manager / variables de entorno (docs/21 §10.5); nunca en el repositorio ni en la suite. |
| SEC-03 | Sin secretos ni PII en logs, salida de consola ni evidencia (screenshots/trazas); redacción obligatoria (docs/19 §logging). |

### Negative Authorization Scenarios
* Configuración que exponga credenciales/secretos en la suite, en logs o en artefactos de evidencia → bloqueo y corrección obligatoria.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None (el smoke ejerce un flujo de IA existente en modo Mock; no introduce nueva capacidad de IA)
* Provider Layer: MockAIProvider (determinista) durante la ejecución del smoke
* Human Validation Required: Not applicable
* Persist AIRecommendation: No (se valida el flujo, no se depende de persistencia nueva)
* Fallback Required: El smoke asume modo Mock/fallback como precondición de determinismo

### AI Input
* Not applicable for this story (no construye prompts nuevos).

### AI Output
* Not applicable for this story (solo verifica que el flujo de recomendación responde de forma determinista con Mock).

### Human-in-the-loop Rules
* Not applicable for this story.

### AI Error / Fallback Behavior
* Si el proveedor no está en Mock y falla, el paso de IA del smoke se reporta como fallo controlado (ver EC-03).

---

## 🎨 UX / UI Notes

| Area                | Notes                                  |
| ------------------- | -------------------------------------- |
| Screen / Route      | N/A — no entrega UI; ejerce rutas existentes de la app Demo |
| Main UI Pattern     | N/A                                    |
| Primary Action      | N/A                                    |
| Secondary Actions   | N/A                                    |
| Empty State         | N/A                                    |
| Loading State       | N/A — el smoke debe esperar estados de carga reales antes de aseverar |
| Error State         | N/A                                    |
| Success State       | N/A                                    |
| Accessibility Notes | No aplica — no introduce UI nueva      |
| Responsive Notes    | No aplica                             |
| i18n Notes          | El smoke usa el idioma por defecto del usuario sembrado; no valida cobertura i18n (fuera de alcance) |
| Currency Notes      | No aplica                             |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A — el smoke navega rutas existentes (login, eventos, IA, comparador)
* Components: N/A
* State Management: N/A
* Forms: Reutiliza el flujo de login existente con credenciales inyectadas
* API Client: N/A — interacción vía navegador (Playwright), no llamada directa al LLM desde el frontend

### Backend
* Use Case / Service: N/A — no implementa servicios; consume endpoints existentes
* Controller / Route: Observa `GET /health` y las rutas de login/eventos/IA/comparador
* Authorization Policy: Respeta la autorización existente del backend
* Validation: N/A
* Transaction Required: No

### Database
* Main Tables: — (consume datos seed existentes: usuarios, eventos, cotizaciones)
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint                          | Purpose                          |
| ------ | --------------------------------- | -------------------------------- |
| GET    | `/health`                         | Verificación previa de disponibilidad (observado, no implementado) |
| —      | Rutas de login/eventos/IA/comparador | Ejercidas vía navegador por el smoke |

### Observability / Audit
* Correlation ID Required: Yes (la corrida del smoke debe ser trazable por `correlationId` en logs)
* Log Event Required: Yes (registrar inicio/fin y resultado del smoke, sin secretos)
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                              | Type            |
| ----- | ---------------------------------------------------- | --------------- |
| TS-01 | Login con usuario sembrado en Demo URL               | E2E (smoke)     |
| TS-02 | Listado de eventos visible tras login                | E2E (smoke)     |
| TS-03 | Generación IA con Mock retorna recomendación         | E2E (smoke)     |
| TS-04 | Comparador renderiza cotizaciones sembradas          | E2E (smoke)     |
| TS-05 | Suite completa finaliza en <5 min                    | E2E (smoke/perf)|

### Negative Tests

| ID    | Scenario                                      | Expected Result                          |
| ----- | --------------------------------------------- | ---------------------------------------- |
| NT-01 | `GET /health` no responde `200`               | Fail-fast con mensaje de entorno no disponible |
| NT-02 | Base URL o credenciales no configuradas       | Fail-fast por configuración inválida     |
| NT-03 | Seed no reproducible (sin cotizaciones)       | Fallo controlado, sugiere reset (US-140) |

### AI Tests
* No aplica como test de IA formal — el paso de IA se ejerce en modo Mock determinista dentro del smoke.

### Authorization Tests

| ID         | Scenario                                  | Expected Result |
| ---------- | ----------------------------------------- | --------------- |
| AUTH-TS-01 | Login del usuario sembrado se autentica correctamente | Success |

### Accessibility Tests
* No aplica — la historia no introduce UI nueva.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Estabilidad de la demo, confianza pre-demo, time-to-detect regresión |
| Expected Impact     | Detecta regresiones post-deploy antes de la presentación/evaluación |
| Success Criteria    | Smoke verde en <5 min contra Demo URL, documentado en runbook |
| Academic Demo Value | Foundation — red de seguridad de demo readiness      |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica — no entrega UI.

### Potential Backend Tasks
* No aplica — no implementa endpoints.

### Potential Database Tasks
* No aplica — consume seed existente.

### Potential AI / PromptOps Tasks
* Asegurar que el paso de IA del smoke use el MockAIProvider determinista.

### Potential QA Tasks
* Implementar la suite de smoke Playwright (subconjunto mínimo) reutilizando la infra de US-128.
* Parametrizar base URL, credenciales y modo IA por variables/secretos.
* Configurar captura de screenshots/trazas en fallo.

### Potential DevOps / Config Tasks
* Crear/ajustar el workflow opcional `smoke.yml` post-deploy (docs/21 §16.1).
* Documentar el runbook de ejecución manual y por workflow.
* Configurar secretos/variables (base URL, credenciales demo, modo IA) sin exponerlos en logs.

---

## ✅ Definition of Ready

* [x] Rol claro (System / QA).
* [x] Goal técnico claro (smoke mínimo post-deploy contra Demo URL).
* [x] Referencias a Docs (Doc 20, Doc 21, Doc 11, Doc 22).
* [x] Permisos / Seguridad (secretos vía Secrets Manager, sin secretos en logs/evidencia).
* [x] Entidades listadas (consume seed; no introduce entidades).
* [x] AC en GWT (AC-01..AC-06).
* [x] Edge cases documentados (EC-01..EC-03).
* [x] Validación clara (VR-01..VR-04).
* [x] Out of Scope explícito (suite E2E completa, seed/reset, healthcheck, rollback, OpenAI real).
* [x] Dependencias conocidas (PB-P2-016, PB-P3-001, PB-P2-013, PB-P3-005).
* [x] UX states identificados (N/A — sin UI nueva).
* [x] API definida (observa `/health` y rutas de flujo).
* [x] Tests definidos (TS-01..TS-05, NT-01..NT-03).
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Suite de smoke ejecutable manual y por workflow contra la Demo URL.
* [ ] Cobertura de login, listado de eventos, IA con Mock y comparador.
* [ ] Ejecución completa en <5 min con resultado verde/rojo claro y evidencia en fallo.
* [ ] Runbook documentado (ejecución manual + `smoke.yml` + precondiciones).
* [ ] Sin secretos en repositorio, logs ni evidencia.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Confirmar con Tech Lead la ubicación del runbook y del workflow `smoke.yml` (docs/21 §16.1) y la reutilización efectiva de la infraestructura de US-128 (PB-P2-016).
* El resultado verde de este smoke es un ítem de verificación del checklist pre-demo (US-143 / PB-P3-003).
