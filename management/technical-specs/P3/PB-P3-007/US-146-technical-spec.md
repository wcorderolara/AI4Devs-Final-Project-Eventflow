# Technical Specification — US-146: Smoke automatizado sobre la URL de Demo

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-146 |
| Source User Story | `management/user-stories/US-146-demo-url-smoke.md` |
| Decision Resolution Artifact | N/A — no existe `management/user-stories/decision-resolutions/US-146-decision-resolution.md` |
| Priority | P3 (Must Have) |
| Backlog ID | PB-P3-007 |
| Backlog Title | Smoke test sobre Demo URL — Suite mínima que valida login, listado de eventos, generación IA con Mock y comparador en la URL pública Demo |
| Backlog Execution Order | P3 #7 (séptimo ítem del bloque P3, por posición en el Product Backlog Prioritized) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-146 (única) |
| Epic | EPIC-DEMO-001 |
| Backlog Item Dependencies | PB-P2-016 (US-128, suite E2E Playwright sobre seed), PB-P3-001 (US-140, reset del entorno Demo) |
| Feature | Smoke Demo (post-deploy) — subconjunto E2E mínimo contra URL pública |
| Module / Domain | Demo / QA |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-07-08 |
| Last Updated | 2026-07-08 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P3-007 — Smoke test sobre Demo URL** (EPIC-DEMO-001, P3, MoSCoW **Must Have**, Type Demo/QA, Primary Role System). Descripción del backlog: *"Suite mínima que valida login, listado de eventos, generación IA con Mock y comparador en la URL pública Demo. Ejecutable manual o por workflow."* Acceptance Summary: *Smoke pasa en <5 min · Documentado en runbook.* Trazabilidad: Doc 20 · Doc 21. Dependencias: PB-P2-016, PB-P3-001.

Esta historia entrega un **subconjunto de smoke E2E** sobre la aplicación ya desplegada en el entorno Demo (frontend Amplify + backend App Runner). **No reimplementa** la suite E2E completa (US-128 / PB-P2-016): **reutiliza** su infraestructura Playwright (config, page objects/helpers, patrones de aserción) y la ejecuta como un flujo rápido y estable contra la **URL pública Demo**. Es una de las mitigaciones del riesgo del backlog "Demo URL inestable cerca de la presentación" (RISK-6; PB-P3-002, PB-P3-004, PB-P3-007).

### Execution Order Rationale

En el bloque P3 el "Orden de implementación sugerido" es: *Demo seed → Demo script → Pre-demo checklist → Toggle Mock/OpenAI → **Smoke Demo URL** → Reporte académico final*. Por **posición en el backlog**, PB-P3-007 es el **séptimo ítem del bloque P3**; el orden se deriva de la secuencia `PB-P3-001, …, PB-P3-007, …` en `management/artifacts/4-Product-Backlog-Prioritized.md`. Se ejecuta en este punto porque **depende** de: la suite E2E Playwright base (US-128 / PB-P2-016, entregada en P2), el reset del entorno Demo para estado reproducible (US-140 / PB-P3-001) y el runbook del toggle Mock/OpenAI (US-144 / PB-P3-005) que garantiza determinismo del paso de IA.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-146 | Única historia del ítem (smoke mínimo post-deploy contra Demo URL) | 1 |

---

## 3. Executive Technical Summary

Se debe entregar una **suite de smoke E2E mínima con Playwright** (ADR-TEST-001; docs/20 §6.6; docs/21 §16.1/§25.4) que se ejecuta **contra la URL pública Demo** para dar confianza pre-demo. El trabajo es esencialmente **QA/E2E + DevOps/config**, con **cero cambios de producto** (no toca backend, frontend ni base de datos):

1. **Reutilizar** la infraestructura Playwright de US-128 (PB-P2-016) y definir un **subconjunto etiquetado** (p. ej. proyecto/tag `@smoke`) con **base URL parametrizable** por variable de entorno (apunta a la URL pública Demo, nunca a localhost ni a mocks de frontend).
2. **Precondición operativa:** verificar `GET /health = 200` (propiedad de US-116) antes de correr los flujos; si falla, **fail-fast** con mensaje de entorno no disponible (EC-01, VR-04).
3. **Cobertura mínima de flujos críticos** con usuario/credenciales sembradas inyectadas por secretos: (a) **login**, (b) **listado de eventos**, (c) **generación IA con Mock** (respuesta determinista), (d) **comparador de cotizaciones** sobre datos seed.
4. **Determinismo del paso de IA:** el entorno Demo opera con IA en **modo Mock** (`LLM_PROVIDER=mock` o `AI_USE_MOCK_FALLBACK=true`; runbook US-144) para evitar flakiness y consumo de cuota externa (AC-03, EC-03, VR-03). El frontend nunca llama directo al LLM (docs/20 §6.5).
5. **Presupuesto de tiempo <5 min** (PB-P3-007; AC-04) y **evidencia en fallo** (screenshots + trazas Playwright), con **resultado verde/rojo** y exit code apropiado (AC-06).
6. **Dos modos de ejecución:** manual (comando documentado en runbook) y por **workflow post-deploy** `smoke.yml` (docs/21 §16.1), disparado tras el deploy; si falla → notificación y evaluación de rollback manual (docs/21 §16.4).
7. **Documentación en runbook** (AC-05): cómo ejecutar, precondiciones (seed/reset, modo Mock) e interpretación de resultados.

Backend, base de datos, invocación real de IA (OpenAI) y UI nueva = **No aplica**. La historia **ejerce** flujos ya implementados; no los diseña.

---

## 4. Scope Boundary

### In Scope

- Suite de smoke Playwright (subconjunto etiquetado `@smoke`) que **reutiliza** la infra de US-128, con **base URL parametrizable** hacia la URL pública Demo.
- **Precheck** de `GET /health = 200` antes de los flujos (fail-fast si no disponible).
- Cobertura de los 4 flujos críticos: login (usuario sembrado), listado de eventos, generación IA con Mock, comparador de cotizaciones.
- Configuración de **determinismo** del paso de IA (modo Mock/fallback como precondición verificada).
- Configuración de **evidencia en fallo** (screenshots + trazas) y **resultado/exit code** claros.
- **Presupuesto de tiempo <5 min** y verificación del mismo.
- Ejecución **manual** (comando) y por **workflow `smoke.yml`** post-deploy (docs/21 §16.1), con notificación en fallo (docs/21 §16.4).
- **Runbook** documentando ejecución, precondiciones e interpretación (AC-05).
- Inyección de **base URL y credenciales demo** por variables/secretos (GitHub Actions secrets / Secrets Manager), nunca hardcodeadas.

### Out of Scope

- La **suite E2E completa** sobre seed (auth → event → AI plan → tasks → budget → vendors → QR → quote → compare → booking → review) — **propiedad de US-128 (PB-P2-016)**; aquí solo se reutiliza infraestructura y se ejerce un subconjunto.
- El **seed** y el **endpoint/workflow de reset** — propiedad de PB-P0-014 y US-140 (PB-P3-001); aquí se **consumen** como precondición y acción correctiva.
- El **healthcheck `GET /health`** — propiedad de US-116 (PB-P2-013); aquí solo se **observa** su `200`.
- **Monitoreo/alarmas CloudWatch** — propiedad de US-141 (PB-P3-002).
- **Automatización de rollback** — manual por diseño MVP (docs/21 §24); el smoke solo notifica.
- **Uso de OpenAI real** durante el smoke — se usa Mock por determinismo; el smoke no valida el proveedor OpenAI de producción.

### Explicit Non-Goals

- No modificar backend, endpoints, contratos, frontend, modelos ni migraciones.
- No introducir pruebas de carga/estrés ni tracing/APM.
- No cubrir cobertura i18n/multi-locale ni accesibilidad (fuera de alcance; el smoke usa el idioma por defecto del usuario sembrado).
- No hacer del workflow `smoke.yml` un gate bloqueante de merge (es post-deploy; su fallo dispara notificación/evaluación de rollback, no bloqueo de PR).

---

## 5. Architecture Alignment

### Backend Architecture

No aplica — la historia no implementa ni modifica endpoints. **Observa** `GET /health` (propiedad de US-116) como precheck. Los flujos de login/eventos/IA/comparador se ejercen vía navegador contra el backend ya desplegado (App Runner; ADR-DEVOPS-001).

### Frontend Architecture

No aplica como diseño — no se crea UI. El smoke navega **rutas existentes** de la app Next.js (App Router) con Playwright (navegador real), respetando que el frontend **nunca** llama directo al LLM (docs/20 §6.5). El smoke debe esperar estados de carga reales (TanStack Query) antes de aseverar, evitando flakiness por timing.

### Database Architecture

No aplica — no introduce modelos, columnas, relaciones, índices, constraints, migraciones ni seed. **Consume** datos seed existentes (usuarios, eventos, cotizaciones).

### API Architecture

No aplica — no define endpoints. Solo **observa** (contratos propiedad de otras historias): `GET /health` (US-116) y las rutas de login/eventos/IA/comparador que ejerce indirectamente vía UI.

### AI / PromptOps Architecture

No invoca IA directamente ni construye prompts nuevos. **Ejerce** el flujo de recomendación IA existente en **modo Mock determinista** (`MockAIProvider`; `LLM_PROVIDER=mock` o `AI_USE_MOCK_FALLBACK=true`), alineado con docs/17 (abstracción `LLMProvider`) y docs/21 §25.3. Human-in-the-loop, `AIRecommendation`, prompt versioning y fallback de IA no se introducen en esta historia (se asume el flujo ya implementado).

### Security Architecture

- **Credenciales/secretos** del smoke (base URL, usuarios demo) solo vía **GitHub Actions secrets / Secrets Manager / variables de entorno** (docs/21 §10.5; SEC-02); nunca en el repositorio ni en la suite.
- **Sin secretos ni PII** en logs, salida de consola ni evidencia (screenshots/trazas) — redacción obligatoria (docs/19 §logging; SEC-03).
- El smoke se autentica con el **flujo de login real** y respeta la **autorización del backend como fuente de verdad** (SEC-01), sin puertas traseras.
- Rol/credenciales de CI con permisos mínimos para ejecutar el workflow; OIDC entre GitHub y AWS donde aplique (docs/21 §16.3).

### Testing Architecture

Núcleo de la historia. **Playwright** sobre entorno con seed (docs/20 §6.6; ADR-TEST-001). Se define un **subconjunto de smoke** (proyecto/tag `@smoke`) que reutiliza la config y helpers de US-128, con `baseURL` parametrizable, `screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'` y reporter con salida clara. Enfoque: happy paths de los 4 flujos + negativos controlados (health rojo, seed no reproducible, IA no-Mock). Ver §13.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (ejecutable contra URL pública Demo) | `baseURL` de Playwright parametrizada por env (p. ej. `PLAYWRIGHT_BASE_URL`/`DEMO_URL`) apuntando a la URL pública Amplify; los tests navegan la app real, no localhost ni mocks. | QA/Playwright, DevOps/config |
| AC-02 (cobertura mínima de flujos) | 4 tests `@smoke`: login con usuario sembrado; listado de eventos visible; generación IA (Mock) retorna recomendación revisable; comparador renderiza cotizaciones sembradas. | QA/Playwright |
| AC-03 (determinismo con IA Mock) | Precondición verificada de modo Mock/fallback; aserción determinista sobre el resultado de IA; sin dependencia de proveedor externo; frontend no llama directo al LLM. | QA/Playwright, AI (modo Mock), DevOps/config |
| AC-04 (<5 min) | Suite acotada (pocos tests, sin retries agresivos, esperas basadas en estado); medición del tiempo total; presupuesto <5 min. | QA/Playwright |
| AC-05 (documentado en runbook) | Runbook con comando manual + descripción del workflow `smoke.yml` + precondiciones (seed/reset, modo Mock) + interpretación de resultados. | DOC/DevOps |
| AC-06 (evidencia y señal de resultado) | Reporter con resultado verde/rojo y exit code; `screenshot`/`trace` en fallo; corrida trazable por `correlationId` en logs, sin secretos. | QA/Playwright, Observability |
| EC-01 (Demo URL/health rojo) | Precheck `GET /health = 200` antes de los flujos; si falla, abortar con mensaje de entorno no disponible (fail-fast), sin falso verde. | QA/Playwright, DevOps |
| EC-02 (seed no reproducible) | Aserciones que fallan de forma controlada e indican reset (US-140) como acción correctiva; runbook documenta la precondición. | QA/Playwright, Seed/Demo |
| EC-03 (IA no está en Mock) | Verificar/forzar modo Mock antes del paso de IA (runbook US-144); si el proveedor externo está lento/sin cuota, el paso se marca inestable/fallo controlado. | QA/Playwright, AI/config |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts
No aplica — no se crean ni modifican módulos backend.

### Use Cases / Application Services
No aplica.

### Controllers / Routes
No implementa endpoints. **Observa** `GET /health` (propiedad de US-116) como precheck; no toca su router ni su contrato.

### DTOs / Schemas
No aplica.

### Repository / Persistence
No aplica — sin persistencia en BD. Consume datos seed existentes de solo lectura durante los flujos.

### Validation Rules
Validación a nivel de **configuración de ejecución**, no de request:
- **VR-01**: `baseURL` del smoke debe ser una URL pública Demo configurable → falta de configuración = fail-fast.
- **VR-02**: credenciales demo inyectadas por variables/secretos, nunca hardcodeadas → configuración insegura = bloqueo.
- **VR-03**: el paso de IA debe correr con IA en modo Mock/fallback → configuración no determinista = fail-fast del paso.
- **VR-04**: precheck `GET /health = 200` antes de los flujos → entorno no disponible = fail-fast.

### Error Handling
- `baseURL`/credenciales ausentes → fail-fast en el arranque de la suite (NT-02).
- `GET /health` ≠ 200 → abortar antes de los flujos con mensaje claro (EC-01/NT-01).
- Datos seed insuficientes (p. ej. sin cotizaciones) → fallo controlado que sugiere reset (US-140) (EC-02/NT-03).

### Transactions
No aplica.

### Observability
La **corrida del smoke** debe ser trazable: registrar inicio/fin y resultado con `correlationId` (docs/21 §19.2), sin exponer secretos. Ver §14.

---

## 8. Frontend Technical Design

No aplica — la historia no entrega UI. El smoke ejerce rutas existentes vía navegador (Playwright), esperando estados de carga reales antes de aseverar. No se crean rutas, componentes, formularios ni estado.

---

## 9. API Contract Design

No aplica — no implementa ni modifica endpoints. Solo **observa**:

| Method | Endpoint | Purpose | Auth Required | Notas |
|---|---|---|---|---|
| GET | `/health` | Precheck de disponibilidad antes de los flujos | No (público) | Propiedad de US-116; no se modifica (docs/21 §10.4) |
| — | Rutas de login/eventos/IA/comparador | Ejercidas vía navegador por el smoke | Sí (sesión) | Contratos propiedad de sus historias; el smoke usa la UI, no llama la API directamente |

---

## 10. Database / Prisma Design

No aplica — sin modelos, columnas, relaciones, índices, constraints, migraciones ni seed. La historia consume el seed existente (PB-P0-014) y referencia el reset (US-140) como acción correctiva.

---

## 11. AI / PromptOps Design

### AI Feature
No invoca IA directamente. **Ejerce** el flujo de recomendación IA existente en modo Mock.

### Provider
`MockAIProvider` (determinista) durante la ejecución del smoke (`LLM_PROVIDER=mock` o `AI_USE_MOCK_FALLBACK=true`; docs/17; docs/21 §25.3; runbook US-144).

### Prompt Version / Input Schema / Output Schema
No aplica — no construye prompts nuevos ni define esquemas; verifica que el paso de IA responde de forma determinista con Mock.

### Human-in-the-loop
No aplica — no introduce revisión humana nueva (se asume ya implementada en el flujo ejercido).

### Fallback
El smoke asume **modo Mock/fallback** como precondición de determinismo (EC-03).

### Persistence
No depende de persistencia nueva de `AIRecommendation`.

### Safety Rules
El paso de IA con Mock es determinista y **no** consume proveedor externo; el frontend **nunca** llama directo al LLM (docs/20 §6.5). Ninguna decisión autónoma de IA.

---

## 12. Security & Authorization Design

### Authentication
El smoke se autentica con el **flujo de login real** usando credenciales de usuario sembrado inyectadas por secretos (cookies HTTP-only gestionadas por el navegador de Playwright). No usa tokens en localStorage.

### Authorization
No introduce autorización runtime nueva; respeta la autorización del backend como fuente de verdad (SEC-01). El usuario sembrado usado debe tener los permisos necesarios para ver eventos y el comparador.

### Ownership Rules / Role Rules
No aplica a nivel de dominio nuevo. A nivel CI: rol/credenciales con permisos mínimos para ejecutar el workflow y leer secretos (docs/21 §16.3, OIDC).

### Negative Authorization Scenarios
- Configuración que exponga credenciales/secretos en la suite, en logs o en artefactos de evidencia → **bloqueo y corrección obligatoria** (VR-02; SEC-02/SEC-03).

### Audit Requirements
Sin `AdminAction` (no hay acción administrativa de dominio). El resultado del smoke queda en el output del runner/workflow.

### Sensitive Data Handling
- **SEC-02**: secretos solo vía Secrets Manager / GitHub Actions secrets / env (docs/21 §10.5); nunca en el repositorio.
- **SEC-03**: sin secretos ni PII en logs, consola ni evidencia (screenshots/trazas). Cuidar que las capturas no expongan datos sensibles del usuario sembrado.

---

## 13. Testing Strategy

Enfoque **E2E smoke con Playwright** sobre el entorno Demo con seed (docs/20 §6.6; ADR-TEST-001), reutilizando la infra de US-128 (PB-P2-016).

### Unit Tests
No aplica como objetivo central. Si se agrega un helper de precheck de `/health` con lógica propia, puede cubrirse con Vitest (opcional, no bloqueante).

### Integration Tests
No aplica — el smoke opera de extremo a extremo contra el entorno desplegado; no hay integración de módulos aislada nueva.

### API Tests
| ID | Escenario | Resultado |
|---|---|---|
| API-SMOKE-01 | Precheck `GET /health` responde `200` contra la Demo URL antes de los flujos. | 200 OK; si no, fail-fast |

### E2E Tests (smoke)
| ID | Escenario | Tipo |
|---|---|---|
| TS-01 | Login con usuario sembrado en la Demo URL. | E2E (smoke) |
| TS-02 | Listado de eventos visible tras login. | E2E (smoke) |
| TS-03 | Generación IA con Mock retorna una recomendación determinista revisable. | E2E (smoke) |
| TS-04 | Comparador renderiza cotizaciones sembradas. | E2E (smoke) |
| TS-05 | La suite completa finaliza en <5 min (medición del tiempo total). | E2E (smoke/perf) |

### Negative Tests
| ID | Escenario | Resultado esperado |
|---|---|---|
| NT-01 | `GET /health` no responde `200`. | Fail-fast con mensaje de entorno no disponible (EC-01) |
| NT-02 | `baseURL` o credenciales no configuradas. | Fail-fast por configuración inválida (VR-01/VR-02) |
| NT-03 | Seed no reproducible (p. ej. sin cotizaciones). | Fallo controlado que sugiere reset US-140 (EC-02) |
| NT-04 | IA no está en modo Mock y el proveedor externo falla/lento. | Paso de IA marcado inestable/fallo controlado; runbook indica forzar Mock (EC-03) |

### Security Tests
| ID | Escenario | Resultado |
|---|---|---|
| SEC-SMOKE-01 | Revisión de que logs/consola/evidencia no exponen secretos ni PII. | Sin secretos/PII en artefactos (SEC-03) |
| SEC-SMOKE-02 | Credenciales provienen de secretos/env, no del repositorio. | Sin credenciales hardcodeadas (VR-02/SEC-02) |

### Accessibility Tests
No aplica — la historia no introduce UI nueva.

### AI Tests
No aplica como test de IA formal — el paso de IA se ejerce en modo Mock determinista dentro de TS-03.

### Seed / Demo Tests
El smoke **depende** del seed reproducible; NT-03 verifica el fallo controlado ante seed no reproducible. El reset (US-140) es la acción correctiva documentada.

### CI Checks
- Ejecución del workflow **`smoke.yml`** post-deploy contra la Demo URL (docs/21 §16.1), tras `DEPLOY_BE`/`DEPLOY_FE`.
- No es gate bloqueante de merge; su fallo dispara **notificación** y evaluación de **rollback manual** (docs/21 §16.4).
- Publicación de artefactos de evidencia (screenshots/trazas) del run en fallo.

---

## 14. Observability & Audit

### Logs
La corrida del smoke registra **inicio, fin y resultado** (verde/rojo) sin secretos ni PII. En modo workflow, el log del run de GitHub Actions es la fuente; en modo manual, la salida del reporter de Playwright.

### Correlation ID
La ejecución debe ser trazable por `correlationId` (docs/21 §19.2). Opción recomendada (decisión de Tech Lead): propagar un header de correlación desde Playwright para poder cruzar la corrida del smoke con los logs del backend en CloudWatch.

### AdminAction
No aplica — no hay acción administrativa de dominio.

### Error Tracking
Fallos del smoke → salida no-cero + evidencia (screenshots/trazas) + notificación del workflow (docs/21 §16.4). No integra Sentry/APM (fuera de alcance).

### Metrics
No aplica — no emite métricas nuevas a CloudWatch (eso es US-141). La única métrica relevante es el **tiempo total de ejecución** (<5 min), medido por el reporter.

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No crea seed. **Requiere** datos seed existentes en el entorno Demo: al menos 1 usuario sembrado con credenciales documentadas (docs/21 §25.2; docs/11), eventos visibles y cotizaciones para el comparador.

### Demo Scenario Supported
Provee la **red de seguridad pre-demo**: valida que los flujos indispensables (login, eventos, IA Mock, comparador) siguen funcionando tras el último deploy, mitigando el riesgo "Demo URL inestable" (RISK-6 del backlog). Su resultado verde es un ítem del checklist pre-demo (US-143 / PB-P3-004).

### Reset / Isolation Notes
El smoke asume estado **reproducible**; ante datos alterados, el runbook indica ejecutar el **reset del entorno Demo** (US-140 / PB-P3-001) y volver a correr. El smoke es de **solo lectura**/no destructivo en la medida de lo posible; cualquier dato creado durante el flujo (p. ej. si un paso crea un evento) debe ser idempotente frente al reset y no ensuciar la demo.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| docs/21 §16.1 (`smoke.yml` marcado "opcional") | El backlog PB-P3-007 lo hace **Must Have** | PB-P3-007 promueve el smoke post-deploy a entregable obligatorio del MVP demo | Anotar en docs/21 que `smoke.yml` es requerido por PB-P3-007 (Must Have), manteniéndolo post-deploy no bloqueante de merge | No |
| docs/21 §25.4 (smoke **manual** de 7 pasos) vs PB-P3-007 (smoke **automatizado**) | Manual vs automatizado | US-146 automatiza un subconjunto (login, eventos, IA Mock, comparador); el manual de §25.4 queda como respaldo | Referenciar el smoke automatizado desde el runbook y mantener el manual como fallback | No |

Sin conflictos que contradigan un ADR aceptado, introduzcan scope creep o creen imposibilidad de implementación.

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Flakiness del smoke (timing, red, entorno público) | Falsos rojos, pérdida de confianza | Esperas basadas en estado (no `sleep`), reutilizar helpers estables de US-128, subconjunto pequeño, `trace` en fallo para diagnóstico |
| IA no determinista si corre con OpenAI real | Fallos intermitentes / costo | Forzar/verificar modo Mock antes del paso de IA (VR-03; EC-03; runbook US-144) |
| Seed alterado en Demo | Fallo del comparador / falso rojo | Precondición de reset (US-140); NT-03 falla de forma controlada indicando la acción correctiva |
| Secretos/PII en logs o capturas | Riesgo de seguridad | Redacción + revisión SEC-SMOKE-01/02; secretos solo por env/Secrets Manager (SEC-02/03) |
| Exceso de tiempo (>5 min) | Incumple AC-04 | Acotar tests, limitar retries, paralelizar donde sea seguro; medir tiempo total (TS-05) |
| Datos creados por el smoke ensucian la demo | Estado no reproducible | Preferir flujos de solo lectura; si se crea data, dejar idempotente frente al reset (US-140) |
| `smoke.yml` bloquea el pipeline por error | Fricción de despliegue | Post-deploy, no bloqueante de merge; fallo = notificación + evaluación de rollback (docs/21 §16.4) |

---

## 18. Implementation Guidance for Coding Agents

- **Archivos/carpetas probablemente impactados:**
  - Suite E2E Playwright existente (US-128 / PB-P2-016): agregar un **proyecto/tag `@smoke`** o archivos `*.smoke.spec.ts`, reutilizando `playwright.config.ts`, page objects y helpers. `baseURL` desde env (`PLAYWRIGHT_BASE_URL`/`DEMO_URL`).
  - Config de Playwright: `use: { baseURL, screenshot: 'only-on-failure', trace: 'retain-on-failure' }`; reporter con salida clara; retries acotados.
  - Workflow CI: `.github/workflows/smoke.yml` (post-deploy, `workflow_dispatch` + trigger tras deploy en `main.yml`), con secrets (base URL, credenciales demo) y publicación de artefactos de evidencia.
  - Runbook de demo readiness (docs/artefactos de demo): comando manual + descripción del workflow + precondiciones + interpretación de resultados.
- **Orden recomendado:** (1) parametrizar `baseURL` y credenciales por env/secrets; (2) precheck `GET /health`; (3) test de login; (4) listado de eventos; (5) IA con Mock; (6) comparador; (7) evidencia en fallo + medición de tiempo; (8) `smoke.yml` post-deploy; (9) runbook.
- **Decisiones que NO deben reabrirse:** Playwright como herramienta E2E (ADR-TEST-001; docs/20 §6.6); reutilizar infra de US-128; IA en **modo Mock** para el smoke (docs/21 §25.3); App Runner + Amplify + GitHub Actions (ADR-DEVOPS-001); `GET /health` como precheck (US-116); rollback manual (docs/21 §24).
- **Qué NO implementar:** endpoints, cambios de backend/frontend/BD, la suite E2E completa (US-128), monitoreo/alarmas (US-141), OpenAI real en el smoke, gate bloqueante de merge, i18n/accesibilidad.
- **Suposiciones a preservar:** entorno Demo desplegado con seed reproducible (PB-P0-014 / US-140); usuarios demo sembrados y documentados (docs/21 §25.2); `GET /health` operativo (US-116); infra Playwright de US-128 disponible y parametrizable; modo Mock disponible (US-144); frontend nunca llama directo al LLM.

---

## 19. Task Generation Notes

- **Grupos de tareas sugeridos:**
  - (QA) Definir subconjunto `@smoke` reutilizando infra US-128; parametrizar `baseURL`/credenciales por env/secrets.
  - (QA) Precheck `GET /health` (fail-fast) — API-SMOKE-01/NT-01.
  - (QA) Tests de flujos: login (TS-01), eventos (TS-02), IA Mock (TS-03), comparador (TS-04).
  - (QA) Evidencia en fallo (screenshots/trazas) + medición de tiempo <5 min (TS-05, AC-06).
  - (AI/CONFIG) Garantizar modo Mock/fallback antes del paso de IA (VR-03; EC-03).
  - (DEVOPS) Workflow `smoke.yml` post-deploy con secrets, artefactos y notificación en fallo (docs/21 §16.1/§16.4).
  - (SEC) Sin secretos/PII en logs/evidencia; credenciales por env/Secrets Manager (SEC-SMOKE-01/02).
  - (DOC) Runbook de ejecución manual + workflow + precondiciones (AC-05); notas de alineación docs/21 §16.1/§25.4.
- **Tareas QA requeridas:** los 5 tests smoke + negativos NT-01..NT-04.
- **Tareas de seguridad requeridas:** manejo de secretos y redacción en evidencia.
- **Tareas de seed/demo requeridas:** verificación de precondición de seed reproducible; referencia al reset US-140 como acción correctiva (no crea seed).
- **Tareas de documentación requeridas:** runbook + notas de alineación en docs/21.
- **Dependencias entre tareas:** parametrización de `baseURL`/credenciales y precheck de health antes de los tests de flujo; determinismo de IA (Mock) antes del test de IA; tests estables antes de cablear `smoke.yml`; runbook al final.
- **Consolidación:** PB-P3-007 puede consolidar sus tareas en un `tasks.md` propio (una sola US en el ítem).

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P3-007) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A (observa `/health`, no implementa) |
| DB impact clear | N/A |
| AI impact clear | Pass (solo ejerce flujo en modo Mock) |
| Security impact clear | Pass (secretos por env/Secrets Manager; sin secretos/PII en evidencia) |
| Testing strategy clear | Pass (E2E smoke + negativos + seguridad) |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada (Approved with Minor Notes), mapeada a **PB-P3-007** (P3, Must Have, EPIC-DEMO-001), con alcance claro y **acotado a un smoke E2E mínimo** contra la URL pública Demo: reutiliza la infra Playwright de US-128 (PB-P2-016), verifica `GET /health` como precheck, cubre login, listado de eventos, generación IA con **Mock determinista** y comparador, finaliza en <5 min con evidencia en fallo, y se ejecuta manual o por workflow `smoke.yml` post-deploy (docs/21). No reimplementa la suite E2E completa (US-128), el seed/reset (US-140) ni el healthcheck (US-116). Las notas de Documentation Alignment (`smoke.yml` opcional→Must Have; smoke manual §25.4 vs automatizado) son **no bloqueantes**. Backend, base de datos, UI nueva e IA real = No aplica. Listo para generar Development Tasks.

---

Technical Specification created: Yes
Path: `management/technical-specs/P3/PB-P3-007/US-146-technical-spec.md`
Status: Ready for Task Breakdown
Backlog ID: PB-P3-007
Execution Order: P3 #7 (séptimo ítem del bloque P3 por posición en el backlog)
Next step: Run `eventflow-user-story-to-development-tasks`.
