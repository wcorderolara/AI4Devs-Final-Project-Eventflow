# Technical Specification — US-144: Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE`

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-144 |
| Source User Story | `management/user-stories/US-144-toggle-mock-openai-provider.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-144-decision-resolution.md` (no existe; no requerido) |
| Priority | P3 |
| Backlog ID | PB-P3-005 |
| Backlog Title | Toggle Mock/OpenAI documentado — Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE` |
| Backlog Execution Order | P3 #5 (quinto item del bloque P3 por posición: PB-P3-001 #1, PB-P3-002 #2, PB-P3-003 #3, PB-P3-004 #4, PB-P3-005 #5) |
| User Story Position in Backlog Item | 1 de 1 (única US del backlog item) |
| Related User Stories in Backlog Item | US-144 |
| Epic | EPIC-DEMO-001 — Demo Readiness |
| Backlog Item Dependencies | PB-P0-009, PB-P0-010, PB-P0-011 (fundación IA), PB-P2-022 (deploy backend App Runner) |
| Feature | Runbook de toggle de proveedor IA (documentación operativa) |
| Module / Domain | Demo / AI (documentación operativa) |
| User Story Status | Approved with Minor Notes (2026-07-08) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-07-08 |
| Last Updated | 2026-07-08 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P3-005 (Toggle Mock/OpenAI documentado) pertenece al bloque **P3 — Demo Polish / Academic Evidence** del backlog priorizado, dentro del Epic **EPIC-DEMO-001 — Demo Readiness**. Su entregable es un **runbook operativo versionado en markdown** que describe cómo alternar el proveedor IA entre `OpenAIProvider` y `MockAIProvider` mediante la variable de entorno `LLM_PROVIDER`, cómo activar el modo demo seguro, cómo verificar el cambio y cómo revertirlo en el entorno Demo (App Runner).

El backlog item es MoSCoW **Must Have**, con Acceptance Summary: runbook en repo · procedimiento testeado en Demo · documenta cómo revertir. Traceability declarada: Decisión PO US-144. Depende de:

* **PB-P0-009** — LLMProvider Port + Adapters (OpenAI + Mock + Anthropic Stub). Provee la abstracción y los adaptadores que este runbook documenta (no implementa).
* **PB-P0-010** — Prompt Registry & AIRecommendation Persistence. Provee la persistencia observable que el runbook usa como criterio de verificación.
* **PB-P0-011** — AI Timeout, Fallback & JSON Validation. Provee el mecanismo de fallback y validación cuya operación documenta el runbook.
* **PB-P2-022** — Deploy backend en servicio gestionado AWS (App Runner). Provee el entorno Demo donde se administran las env vars a nivel de servicio.

Naturaleza del entregable: **documentación / runbook operativo**, no software ejecutable. El artefacto es el markdown propuesto `/management/artifacts/AI-Provider-Toggle-Runbook.md`, versionado en el repositorio. Esta historia no introduce Frontend, Backend, Database, API ni invocación de IA.

### Execution Order Rationale

El orden de ejecución no lo define el ID de la User Story sino la posición dentro del Product Backlog Prioritized (`management/artifacts/4-Product-Backlog-Prioritized.md`, bloque §P3). Por **posición de listado** en dicho bloque, PB-P3-005 es el **quinto** item: PB-P3-001 (#1), PB-P3-002 (#2), PB-P3-003 (#3), PB-P3-004 (#4), PB-P3-005 (#5). Por lo tanto su orden de ejecución dentro de P3 es **#5**.

Además del orden posicional, este runbook tiene dependencias funcionales duras: documenta el mecanismo de toggle/fallback entregado por la fundación IA (PB-P0-009..011) y se apoya en el entorno Demo desplegado por PB-P2-022. Es coherente redactarlo una vez que esas piezas existen o están especificadas, de modo que los pasos de toggle, verificación y reversión apunten a comportamientos reales. Nota de dependencia inversa: PB-P3-004 (US-143, Pre-Demo Checklist) referencia este runbook como acción correctiva del toggle IA, por lo que el runbook debe existir para cerrar esa referencia.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-144 | Redactar el runbook del toggle `LLM_PROVIDER`/`AI_DEMO_MODE` y registrar el dry-run en Demo | 1 (única US del backlog item) |

---

## 3. Executive Technical Summary

El "diseño técnico" de esta historia es la **especificación del documento runbook**, no de software. Se debe producir el entregable markdown propuesto `/management/artifacts/AI-Provider-Toggle-Runbook.md`, versionado en el repositorio, que documente de forma operativa y accionable cómo alternar el proveedor IA en el entorno Demo (App Runner) sin exponer secretos.

El runbook debe cubrir: (a) una **tabla de referencia de variables de entorno** IA (`LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_TIMEOUT_MS`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`), autoritativa según `docs/21` §13.1 (§513–§518); (b) el **procedimiento paso a paso** para conmutar `LLM_PROVIDER` entre `openai` y `mock`; (c) la **configuración del modo demo seguro** (preferida: `LLM_PROVIDER=openai` + `AI_USE_MOCK_FALLBACK=true`; contingencia offline: `LLM_PROVIDER=mock` + `AI_DEMO_MODE=true`), según `docs/21` §13.2 (§520–§523); (d) los **pasos de verificación** (qué observar en logs: `correlationId`, `provider`, `fallback_used`; determinismo del `MockAIProvider`, NFR-AI-008; healthcheck/smoke); (e) los **pasos de reversión** al estado previo; y (f) el **registro del dry-run** ejecutado en Demo.

El mecanismo subyacente (abstracción `LLMProvider`, `OpenAIProvider`, `MockAIProvider`, selección por env var y fallback) **es propiedad de la fundación IA PB-P0-009..011** y NO se rediseña ni reimplementa aquí. La higiene de secretos es documental: sólo se referencian **nombres** de variables, nunca valores (`OPENAI_API_KEY` como secreto en AWS Secrets Manager, nunca al frontend — `docs/21` §525, `docs/19`).

La validación de esta historia es **documental** (revisión, TS-03) más una **corrida en seco / dry-run** (TS-01/TS-02) en el entorno Demo, no pruebas de software automatizadas de producto. No hay endpoints, esquema de base de datos, componentes de UI ni invocación de IA que diseñar.

---

## 4. Scope Boundary

### In Scope

* Redactar el runbook markdown `/management/artifacts/AI-Provider-Toggle-Runbook.md` (ruta propuesta por convención) versionado en el repositorio.
* Tabla de referencia de las 6 variables de entorno IA con valores admitidos y uso, alineada a `docs/21` §13.1.
* Procedimiento paso a paso del toggle `LLM_PROVIDER` `openai`↔`mock`, incluyendo el rol de `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`, `OPENAI_MODEL`, `AI_TIMEOUT_MS` y `OPENAI_API_KEY` (por nombre).
* Documentación del modo demo seguro (preferido y contingencia offline) según `docs/21` §13.2.
* Pasos de verificación por logs (`provider`, `fallback_used`, `correlationId`), determinismo del Mock (NFR-AI-008) y healthcheck/smoke.
* Pasos de reversión segura y verificable al estado previo.
* Registro del dry-run `openai`→`mock`→`openai` ejecutado en el entorno Demo.
* Enlace del runbook desde el Pre-Demo Checklist (US-143) como acción correctiva del toggle IA.

### Out of Scope

* Implementación del toggle o de los providers (`LLMProvider`, `OpenAIProvider`, `MockAIProvider`): propiedad de PB-P0-009..011.
* Implementación del fallback automático o de la validación de configuración: PB-P0-009/011.
* Creación de UI de selección de proveedor (sin selector dinámico en UI — FR-AI-016).
* Cualquier endpoint, modelo de base de datos, migración o invocación de IA.

### Explicit Non-Goals

* No promover `AnthropicProvider` a funcional; permanece como stub/futuro (ADR-AI-004, FR-AI-015). El runbook cubre `openai`↔`mock`; puede mencionar `anthropic` sólo como valor futuro/stub.
* No introducir failover automático a Anthropic.
* No exponer valores de secretos: sólo nombres de variables.
* No reabrir decisiones de la fundación IA ni de despliegue (ADR-AI-001..004, ADR-DEVOPS-001).

---

## 5. Architecture Alignment

### Backend Architecture

No aplica (runtime). El mecanismo de selección de proveedor y fallback pertenece a la fundación IA (PB-P0-009..011). El runbook documenta el comportamiento observable, sin implementar lógica de backend.

### Frontend Architecture

No aplica. Esta historia no toca frontend. Nota documental: el frontend nunca recibe `OPENAI_API_KEY` (`docs/21` §525).

### Database Architecture

No aplica. No crea ni modifica tablas, constraints ni índices.

### API Architecture

No aplica. No define ni modifica endpoints.

### AI / PromptOps Architecture

Aplica de forma **documental**: el runbook describe el mecanismo EXISTENTE de selección de proveedor vía `LLMProvider` port, `OpenAIProvider` y `MockAIProvider`, y el fallback controlado (`AI_USE_MOCK_FALLBACK`), según `docs/17` (LLMProvider port, adapters, fallback, demo mode) y ADR-AI-001..004. No diseña ni modifica este mecanismo.

### Security Architecture

Aplica de forma **documental**: higiene de secretos. `OPENAI_API_KEY` se gestiona como secreto en AWS Secrets Manager; el runbook lo referencia por nombre, nunca por valor, y advierte que nunca se entrega al frontend (`docs/19`, `docs/21` §525, §531).

### Testing Architecture

Aplica como **validación del procedimiento documentado**: revisión documental (TS-03) más dry-run manual del toggle y la reversión en Demo (TS-01/TS-02). No hay pruebas automatizadas de producto en esta historia.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Runbook versionado en el repositorio | Crear el archivo markdown `/management/artifacts/AI-Provider-Toggle-Runbook.md` con el título "Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE`", versionado en el repo y referenciado como acción correctiva desde el Pre-Demo Checklist (US-143). | Documentación |
| AC-02: Procedimiento de toggle documentado paso a paso | Sección con pasos numerados para cambiar `LLM_PROVIDER` entre `openai` y `mock` en App Runner, cubriendo el rol de `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`, `OPENAI_MODEL`, `AI_TIMEOUT_MS` y `OPENAI_API_KEY` (por nombre, como secreto en Secrets Manager). | Documentación / Deployment-Config |
| AC-03: Activación del modo demo seguro documentada | Sección que describe la configuración preferida (`openai` + `AI_USE_MOCK_FALLBACK=true`) y el modo offline de contingencia (`mock` + `AI_DEMO_MODE=true`), citando `docs/21` §13.2 (§522). | Documentación / Deployment-Config |
| AC-04: Verificación del cambio documentada | Sección de verificación: qué observar en logs (`correlationId`, `provider`, `fallback_used`), determinismo del `MockAIProvider` (NFR-AI-008) y healthcheck/smoke del servicio. | Documentación / Observability |
| AC-05: Procedimiento de reversión documentado | Sección con pasos para revertir la configuración al estado anterior de forma segura y verificable. | Documentación / Deployment-Config |
| AC-06: Procedimiento testeado en Demo (dry-run registrado) | Ejecutar el runbook como ensayo en Demo (App Runner): toggle `openai`→`mock` y regreso, más la reversión; registrar el resultado en el propio runbook. | QA / Dry-run |

---

## 7. Backend Technical Design

No aplica. Esta historia no implementa lógica de backend. El mecanismo de selección de proveedor por `LLM_PROVIDER` y el fallback controlado pertenecen a la fundación IA (PB-P0-009..011). El runbook documenta el comportamiento observable de ese mecanismo, sin diseñar ni modificar módulos, use cases, controllers, DTOs, repositorios, validaciones ni transacciones.

---

## 8. Frontend Technical Design

No aplica. Entregable de documentación, sin UI. Única nota documental relevante: el frontend nunca recibe `OPENAI_API_KEY` (`docs/21` §525), advertencia que el runbook debe incluir explícitamente.

---

## 9. API Contract Design

No aplica. Esta historia no define ni modifica endpoints. La verificación por healthcheck/smoke referida en AC-04 usa endpoints ya existentes (propiedad de otras historias), no endpoints nuevos.

---

## 10. Database / Prisma Design

No aplica. No crea ni modifica modelos, campos, relaciones, índices, constraints, migraciones ni seed. La persistencia de `AIRecommendation` mencionada en la verificación pertenece a PB-P0-010 y no se altera aquí.

---

## 11. AI / PromptOps Design

Esta historia **no invoca IA** ni diseña el mecanismo de proveedores; **documenta** el mecanismo EXISTENTE. Se detalla a continuación únicamente para dar contexto autoritativo a lo que el runbook describe, sin reabrir decisiones.

### AI Feature

Ninguna funcionalidad IA nueva. El runbook documenta la operación del toggle de proveedor IA usado por las funciones IA existentes del MVP.

### Provider

Selección entre `OpenAIProvider` (proveedor funcional principal, ADR-AI-002) y `MockAIProvider` (obligatorio para demo/tests/offline/fallback, ADR-AI-003) a través del puerto `LLMProvider` (ADR-AI-001), gobernada por la env var `LLM_PROVIDER` (`docs/17`, `docs/21` §13.1). `AnthropicProvider` permanece como stub/futuro (ADR-AI-004) y no se promueve.

### Prompt Version

No aplica. El versionado de prompts (Prompt Registry, PB-P0-010) no se ve afectado por el toggle.

### Input Schema

No aplica. El runbook no define entradas IA.

### Output Schema

No aplica. El runbook no define salidas IA.

### Human-in-the-loop

Sin cambios. El toggle de proveedor no altera la validación humana obligatoria de salidas IA (BR-AI-001, ADR-AI-005); el runbook lo confirma explícitamente.

### Fallback

El runbook **documenta** (no implementa) el fallback controlado existente: con `AI_USE_MOCK_FALLBACK=true`, ante fallo/timeout de OpenAI el sistema degrada a `MockAIProvider` (BR-AI-009, PB-P0-011), observable como `fallback_used=true` en logs.

### Persistence

No aplica a esta historia. `AIRecommendation` (PB-P0-010) se persiste por el mecanismo existente; el runbook sólo la nombra como señal de verificación.

### Safety Rules

BR-AI-005 (abstracción de proveedor), BR-AI-006 (uso de Mock para demo/tests/fallback) y BR-AI-009 (degradación controlada a Mock) se documentan como el comportamiento que el runbook ayuda a operar y verificar. No se modifica ninguna regla.

---

## 12. Security & Authorization Design

### Authentication

No aplica. Esta historia no introduce autenticación runtime.

### Authorization

No aplica. No introduce endpoints ni runtime authorization. La única superficie de seguridad es **documental**.

### Ownership Rules

No aplica.

### Role Rules

No aplica. La operación del toggle es realizada por DevOps / Product Owner sobre la configuración de App Runner, fuera del RBAC de producto.

### Negative Authorization Scenarios

No aplica. No hay caminos 401/403 que diseñar.

### Audit Requirements

No aplica (`AdminAction` no aplica a este runbook). Los cambios de env var se gobiernan por la operación de App Runner y por el registro del dry-run en el propio runbook.

### Sensitive Data Handling

Superficie de seguridad central de la historia (documental):

* SEC-01: El runbook referencia sólo **nombres** de variables, nunca valores de secretos (`docs/19`).
* SEC-02: `OPENAI_API_KEY` se gestiona como secreto en AWS Secrets Manager; el runbook lo describe por nombre.
* SEC-03: El frontend nunca recibe `OPENAI_API_KEY` (`docs/21` §525); el runbook lo advierte explícitamente.
* SEC-04: No se registran prompts/respuestas completas con datos sensibles en logs (`docs/21` §531); el runbook lo indica al describir qué logs observar.
* VR-02: Regla de higiene verificable en revisión documental (TS-03).

---

## 13. Testing Strategy

> El "testing" de esta historia es la validación del procedimiento documentado mediante revisión documental y un dry-run en el entorno Demo, no pruebas de software automatizadas de producto.

### Unit Tests

No aplica.

### Integration Tests

No aplica.

### API Tests

No aplica.

### E2E Tests

No aplica (no hay UI ni flujo de producto nuevo).

### Security Tests

Revisión documental (TS-03 / VR-02): confirmar que el runbook referencia sólo nombres de variables y no incluye valores de secretos; verificar la advertencia SEC-03 (secreto nunca al frontend).

### Accessibility Tests

No aplica (entregable de documentación sin UI). El markdown debe ser legible y bien estructurado.

### AI Tests

No aplica. Esta historia no invoca IA directamente. La verificación del determinismo del Mock (NFR-AI-008) se observa durante el dry-run, no como test automatizado de esta historia.

### Seed / Demo Tests

Dry-run manual en el entorno Demo (App Runner):

* **TS-01:** Ejecutar el toggle `openai`→`mock` siguiendo el runbook y verificar el comportamiento determinista del `MockAIProvider` (NFR-AI-008).
* **TS-02:** Ejecutar la reversión `mock`→`openai` siguiendo el runbook y verificar vía healthcheck/smoke.
* **NT-01:** Documentar y comprobar el diagnóstico ante `LLM_PROVIDER` con valor inválido (fail-fast, referido a PB-P0-009/011).
* **NT-02:** Documentar la degradación a `MockAIProvider` (`fallback_used=true`) ante OpenAI caído/sin cuota con fallback habilitado, y el toggle manual a `mock`.

### CI Checks

No aplica (sin código de producto). Opcional: linter de markdown y verificación de enlaces si el repo ya lo ejecuta.

---

## 14. Observability & Audit

### Logs

El runbook indica **qué logs observar** para verificar el toggle, sin crear nuevos logs:

* `provider` — proveedor efectivamente utilizado (`openai` o `mock`).
* `fallback_used` — si la solicitud degradó a `MockAIProvider` (esperado `true` en escenario EC-01).
* Razón del fallback y `correlationId` asociado (`docs/21` §13.3, §530).

Estos campos ya son emitidos por la fundación IA (PB-P0-009..011); el runbook sólo los usa como criterio de verificación.

### Correlation ID

Cada interacción con el LLM y su fallback se loguean con `correlationId` (`docs/21` §530); el runbook documenta cómo correlacionar la solicitud con el proveedor observado.

### AdminAction

No aplica. Esta historia no genera acciones de auditoría `AdminAction`.

### Error Tracking

El runbook describe cómo diagnosticar env var mal configurada (NT-01/EC-02) y outage de OpenAI (NT-02/EC-01) mediante los logs anteriores; no introduce herramientas nuevas de tracking.

### Metrics

No aplica (sin métricas nuevas). La verificación se apoya en logs y healthcheck/smoke existentes.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No aplica. Esta historia no crea ni modifica datos seed. Depende de que el seed demo exista para que el dry-run sea reproducible, pero no lo altera.

### Demo Scenario Supported

Soporta **UC-DEMO-001** (recorrido guiado de 10–15 min) y **NFR-DEMO-006** (recorrido demo reproducible), y **FR-DEMO-002**: el toggle documentado permite una demo robusta incluso ante outage/falta de cuota de OpenAI. El determinismo del `MockAIProvider` (**NFR-AI-008**) es la propiedad clave que hace reproducible la demo cuando `LLM_PROVIDER=mock`.

### Reset / Isolation Notes

El runbook opera sobre la configuración de env vars del servicio Demo (App Runner); no toca datos. La reversión (AC-05) restaura la configuración previa. La coordinación con el reset del entorno Demo (US-140 / PB-P3-001) se documenta como referencia cruzada, no se implementa aquí.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Convención de ruta del entregable | Ninguno (propuesta de nomenclatura) | Ruta canónica propuesta `/management/artifacts/AI-Provider-Toggle-Runbook.md`, alineada con US-142 (`Demo-Script.md`) y US-143 (`Pre-Demo-Checklist.md`) | Confirmar la ruta al crear el runbook; enlazarlo desde el Pre-Demo Checklist (US-143) | No |
| US-144 (limpieza de trazabilidad ya aplicada) | Ninguno (ya resuelto en la US) | Se removieron IDs inexistentes/no aplicables (`NFR-PERF-API-001`, `NFR-OBS-001`, `NFR-TEST-*`, `NFR-TEST-006`) y se reemplazó `BR-AI-015` por BR-AI-005/006/009 | Ninguna acción; se registra como no bloqueante | No |
| Prioridad / reframe de la historia | Ninguno (ya resuelto) | Prioridad fijada a Must Have (P3); historia reencuadrada como documentación/runbook, no software runtime | Ninguna acción; se registra como no bloqueante | No |
| `docs/21` §13.1 lista `anthropic` como valor de `LLM_PROVIDER` | Aparente vs. MVP scope | `anthropic` permanece stub/futuro (ADR-AI-004); MVP cubre `openai`/`mock` | El runbook cubre `openai`↔`mock` y, si menciona `anthropic`, lo marca como stub/futuro no funcional | No |

Nota: no hay conflictos que bloqueen la implementación. Las filas anteriores son alineaciones informativas no bloqueantes.

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| El runbook expone accidentalmente un valor de secreto | Alto (fuga de credenciales) | VR-02/SEC-01: sólo nombres de variables; revisión documental TS-03 antes de merge. |
| El runbook desincroniza con `docs/21` §13 (nombres/valores de env vars) | Medio (procedimiento incorrecto) | Tomar `docs/21` §13.1/§13.2 como fuente autoritativa y citarla explícitamente; revisión cruzada. |
| El dry-run no se ejecuta o no se registra | Medio (AC-06 incompleto) | Tarea QA explícita para ejecutar y registrar el dry-run `openai`→`mock`→`openai` en Demo. |
| Scope creep hacia implementar toggle/UI/failover automático | Alto (invade PB-P0-009..011) | Non-goals explícitos (Sección 4); el runbook sólo documenta el mecanismo existente. |
| Confusión entre fallback automático y toggle manual | Bajo/Medio | Documentar ambos por separado (EC-01/NT-02) y cómo distinguirlos en logs (`fallback_used`). |

---

## 18. Implementation Guidance for Coding Agents

Esta historia produce **un documento**, no código. "Implementar" significa redactar el runbook con la estructura requerida.

### Archivos / carpetas impactados

* Crear: `/management/artifacts/AI-Provider-Toggle-Runbook.md` (ruta propuesta por convención).
* Editar (enlace): `/management/artifacts/Pre-Demo-Checklist.md` (US-143) para referenciar el runbook como acción correctiva del toggle IA.

### Estructura requerida del runbook

1. **Título y propósito** — "Runbook del toggle `LLM_PROVIDER` y `AI_DEMO_MODE`"; alcance operativo y naturaleza (documentación).
2. **Tabla de referencia de variables de entorno** (autoritativa según `docs/21` §13.1):

   | Variable | Valores | Uso |
   |---|---|---|
   | `LLM_PROVIDER` | `openai` / `mock` (`anthropic` = stub/futuro) | Selecciona el adaptador del puerto `LLMProvider`. |
   | `OPENAI_API_KEY` | Secreto (por nombre) | Sólo si `LLM_PROVIDER=openai`; gestionado en AWS Secrets Manager; nunca al frontend. |
   | `OPENAI_MODEL` | String | Modelo configurado para Demo. |
   | `AI_TIMEOUT_MS` | p. ej. `60000` | Timeout de llamadas LLM. |
   | `AI_DEMO_MODE` | `true`/`false` | Marca interna para flujos demo. |
   | `AI_USE_MOCK_FALLBACK` | `true`/`false` | Si falla OpenAI, degrada a `MockAIProvider`. |
3. **Procedimiento de toggle paso a paso** `openai`↔`mock` en App Runner (a nivel de servicio), indicando qué variables ajustar y el orden.
4. **Configuración del modo demo seguro** (`docs/21` §13.2): preferido `LLM_PROVIDER=openai` + `AI_USE_MOCK_FALLBACK=true`; contingencia offline `LLM_PROVIDER=mock` + `AI_DEMO_MODE=true`; CI/Tests `LLM_PROVIDER=mock`.
5. **Pasos de verificación**: qué observar en logs (`provider`, `fallback_used`, `correlationId`), determinismo del Mock (NFR-AI-008) y healthcheck/smoke del servicio.
6. **Pasos de reversión** al estado previo, verificables.
7. **Escenarios de contingencia**: OpenAI caído/sin cuota (fallback automático vs. toggle manual, EC-01/NT-02); env var mal configurada (fail-fast, EC-02/NT-01).
8. **Registro del dry-run**: fecha, responsable, secuencia ejecutada (`openai`→`mock`→`openai`), resultado por paso, confirmación end-to-end.

### Orden recomendado

Tabla de variables → toggle → modo demo → verificación → reversión → contingencias → ejecutar y registrar dry-run → enlazar desde Pre-Demo Checklist.

### Decisiones que NO deben reabrirse

ADR-AI-001..004 (abstracción y proveedores), ADR-DEVOPS-001 (AWS/App Runner), reglas operativas de `docs/21` §13.2, higiene de secretos (`docs/19`, §525/§531).

### Qué NO implementar

Toggle/providers/fallback (PB-P0-009..011), UI de selección, failover automático a Anthropic, promoción de `AnthropicProvider` a funcional.

### Supuestos a preservar

El mecanismo de selección y fallback ya existe (PB-P0-009..011); el entorno Demo está en App Runner con env vars a nivel de servicio (PB-P2-022); `OPENAI_API_KEY` es secreto en Secrets Manager.

---

## 19. Task Generation Notes

### Suggested task groups

* **Documentación (principal):** redactar `/management/artifacts/AI-Provider-Toggle-Runbook.md` con las 8 secciones de estructura (Sección 18).
* **QA / Dry-run:** ejecutar el toggle `openai`→`mock`→`openai` y la reversión en Demo (App Runner) y registrar el resultado en el runbook (AC-06, TS-01/TS-02).
* **Enlace de documentación:** referenciar el runbook desde el Pre-Demo Checklist (US-143).

### Required QA tasks

* Dry-run del toggle y la reversión en Demo (TS-01/TS-02, NT-01/NT-02).
* Revisión documental de higiene de secretos: sólo nombres de variables (TS-03 / VR-02 / SEC-01/03).

### Required security tasks

Cubiertas por la revisión documental de higiene de secretos (no hay tareas de seguridad runtime).

### Required seed/demo tasks

No se crea/modifica seed. La tarea de dry-run depende de que el seed demo exista y sea reproducible (NFR-AI-008), pero no lo altera.

### Required documentation tasks

Redacción del runbook (principal) y enlace desde el Pre-Demo Checklist (US-143).

### Dependencies between tasks

Redacción del runbook → ejecución del dry-run (necesita el procedimiento escrito) → registro del dry-run dentro del runbook → enlace desde el Pre-Demo Checklist.

### Consolidated tasks.md

PB-P3-005 tiene una sola User Story (US-144); no requiere consolidación multi-US. Puede generar directamente sus tareas bajo el backlog item.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | N/A |
| AI impact clear | N/A (documental; no invoca IA) |
| Security impact clear | Pass (documental: higiene de secretos) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La User Story US-144 está aprobada (Approved with Minor Notes), mapea de forma inequívoca a PB-P3-005 (P3 #5, EPIC-DEMO-001) y su naturaleza de entregable documental/runbook está clara. El alcance, las fuentes autoritativas (`docs/21` §13, `docs/17`, `docs/19`, `docs/11`, `docs/22`) y la estructura requerida del runbook están especificadas sin ambigüedad. No hay endpoints, base de datos, UI ni invocación de IA que diseñar, y las decisiones de la fundación IA no se reabren. No existen bloqueadores; las alineaciones de documentación (Sección 16) son informativas y no bloqueantes. La historia está lista para generar Development Tasks (documentación + QA dry-run + enlace).
