# Technical Specification — PB-P2-014 / US-126: Suite unit + integration backend

## 1. Metadata

| Field                                | Value                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| User Story ID                        | US-126                                                                             |
| Source User Story                    | `management/user-stories/US-126-unit-integration-backend-suite.md`                 |
| Decision Resolution Artifact         | N/A — no existe `management/user-stories/decision-resolutions/US-126-decision-resolution.md` |
| Priority                             | P2 (Must Have)                                                                     |
| Backlog ID                           | PB-P2-014                                                                          |
| Backlog Title                        | Suite unit/integration backend (≥50% coverage)                                     |
| Backlog Execution Order              | 14 (decimocuarto ítem de P2)                                                       |
| User Story Position in Backlog Item  | 1 de 1                                                                             |
| Related User Stories in Backlog Item | US-126                                                                             |
| Epic                                 | EPIC-QA-001                                                                        |
| Backlog Item Dependencies            | PB-P0-015 (base de CI/pipeline que ejecuta las compuertas)                         |
| Feature                              | Backend tests — suite unit + integration con Vitest                                |
| Module / Domain                      | QA / Testing (transversal al backend)                                             |
| User Story Status                    | Approved with Minor Notes                                                          |
| Backlog Alignment Status             | Found                                                                              |
| Technical Spec Status                | Ready for Task Breakdown                                                           |
| Created Date                         | 2026-07-07                                                                         |
| Last Updated                         | 2026-07-07                                                                         |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-014 — Suite unit/integration backend (≥50% coverage)** (EPIC-QA-001, P2, Must Have).
Construir una suite unitaria (domain + application + utils/schemas) y de integración (use cases + repositorios + middlewares) sobre el backend, con cobertura ≥50% en lógica crítica. La compuerta de CI bloquea el merge si la cobertura baja o si las pruebas fallan. Las pruebas deben ser determinísticas. Trazabilidad: Doc 20 · NFR-TEST-*. Dependencia: PB-P0-015.

### Execution Order Rationale

Es el decimocuarto ítem de la franja P2. Depende de PB-P0-015 (infraestructura de CI existente) porque las compuertas de cobertura y ejecución de pruebas corren en el pipeline. Se ubica junto al resto de ítems de calidad de P2 (PB-P2-015 contract/MSW, PB-P2-016 E2E, PB-P2-017 IA mock, PB-P2-018 RBAC negativa, PB-P2-020 quality gates), constituyendo la base ancha de la pirámide de pruebas (Doc 20). Debe ejecutarse antes de las suites que dependen de ella conceptualmente (contract, E2E) y en paralelo lógico con la formalización de quality gates (PB-P2-020).

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item                          | Suggested Order |
| ---------- | --------------------------------------------- | --------------- |
| US-126     | Única historia del ítem (suite unit + integ.) | 1               |

---

## 3. Executive Technical Summary

Se debe construir la infraestructura y el contenido de pruebas **unitarias** e **de integración** del backend usando **Vitest** (runner unificado, fijado por `ADR-TEST-001`) sobre la estructura de código existente (Clean/Hexagonal: domain, application/use cases, repositorios Prisma, middlewares). Las pruebas unitarias cubren políticas de dominio (BR-*), lógica de use cases, esquemas Zod y utilidades/mapeadores. Las pruebas de integración cubren use case + repositorio Prisma sobre **PostgreSQL efímero**, constraints de base de datos, middleware de autenticación + policy y el módulo IA con **`MockAIProvider`**.

La suite debe ser **determinística** (sin proveedores de IA reales ni red externa, con base de datos efímera y limpieza automática) y reportar **cobertura** vía c8/istanbul (integrado en Vitest). La compuerta de CI ejecuta unit + integration como gates obligatorios y **bloquea el merge** ante fallos, pruebas críticas saltadas o cobertura insuficiente (umbral de esta historia: ≥50% sobre lógica crítica; metas aspiracionales de Doc 20: 60% global / 80%+ use cases críticos y policies).

Esta historia **no** implementa endpoints, esquema de base de datos, features de IA productivas ni UI. Es una capacidad transversal de QA que consume la estructura de código ya existente.

---

## 4. Scope Boundary

### In Scope

* Configuración del runner **Vitest** para backend con proyectos/config de unit e integration.
* Estructura de carpetas `backend/tests/unit/**` y `backend/tests/integration/**` según Doc 20 §10.
* Helpers de prueba: `test-db.ts` (PostgreSQL efímero + cleanup), `mock-ai.ts` (`MockAIProvider`), fixtures base.
* Pruebas **unitarias**: dominio (políticas BR-*), application (lógica de use cases), esquemas Zod, utils/mapeadores.
* Pruebas **de integración**: use case + repositorio Prisma sobre BD efímera; constraints (FK, unique, enum, soft delete); middleware auth + policy (incluyendo casos negativos 401/403); módulo IA con `MockAIProvider` (validación por schema).
* Reporte de **cobertura** (c8/istanbul vía Vitest) y umbral aplicado.
* Integración de la suite como **compuerta de CI bloqueante** (unit + integration + cobertura + no-skip crítico).

### Out of Scope

* Suite **API HTTP** completa vía Supertest sobre Express (Doc 20 §6.3; se aborda como suite API separada).
* Suite **contract** con MSW (PB-P2-015 / US-127).
* Suite **E2E** Playwright sobre seed (PB-P2-016).
* Suite **IA** ampliada con MockAIProvider como ítem propio (PB-P2-017) más allá de la cobertura de integración mínima aquí.
* Suite **RBAC negativa extendida** como ítem propio (PB-P2-018); aquí solo se cubren los casos negativos de middleware necesarios para la integración.
* Formalización completa de **quality gates en GitHub Actions** como ítem propio (PB-P2-020); aquí se define el gate de unit+integration+cobertura que ese ítem consolida.
* Pruebas de **frontend**.
* Llamadas reales a proveedores de IA externos en CI.

### Explicit Non-Goals

* No modificar la lógica de negocio existente para "hacerla testeable" más allá de refactors mínimos y seguros de inyección de dependencias si fuesen imprescindibles.
* No perseguir cobertura alta artificial sin pruebas negativas de autorización.
* No introducir un pipeline DevOps enterprise.

---

## 5. Architecture Alignment

### Backend Architecture

Consume la arquitectura existente (Node.js + Express + TypeScript + Prisma + PostgreSQL, monolito modular, Clean/Hexagonal). Las pruebas se organizan por capa: `domain`, `application` (use cases), `schemas`, `ai` para unit; `repositories`, `use-cases`, `ai`, `jobs`, `seed` para integration (Doc 20 §10). No introduce nuevos módulos productivos.

### Frontend Architecture

No aplica — historia de backend sin UI.

### Database Architecture

Integración sobre **PostgreSQL efímero** (contenedor o esquema temporal) con Prisma. Se valida el comportamiento de constraints reales (FK, unique, enum, soft delete). No se altera el esquema; se reutilizan migraciones existentes para aprovisionar la BD de prueba.

### API Architecture

No aplica en esta historia — la capa HTTP completa (Supertest) pertenece a la suite API separada. Los middlewares se prueban en integración a nivel de unidad de middleware, no como endpoints end-to-end.

### AI / PromptOps Architecture

Uso exclusivo de **`MockAIProvider`** como dependencia de prueba (nunca `OpenAIProvider` real en CI). Las aserciones validan **conformidad de schema** de la salida, no texto literal (Doc 20 §7 y §21 — AI-T-01, PT-04).

### Security Architecture

Cobertura de middleware de **autenticación** y **policy** (RBAC + ownership + assignment) con casos positivos y **negativos (401/403)**. Ningún secreto real en fixtures ni logs; `OPENAI_API_KEY` ausente en CI (Doc 19, Doc 20 §21).

### Testing Architecture

Pirámide adaptada al monolito modular (Doc 20 §5): base ancha unit, capa de integración sólida. Runner **Vitest**; cobertura **c8/istanbul**; **`MockAIProvider`** obligatorio; BD efímera con cleanup automático; determinismo garantizado por IDs/fixtures controlados.

Para las áreas no aplicables (Frontend, API HTTP end-to-end, AI productiva), ver `No aplica` arriba.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 (unit dominio/app) | Crear specs Vitest en `tests/unit/{domain,application,schemas}` que ejerciten políticas BR-*, lógica de use cases y validación/transformación Zod, con datos in-memory. | Testing (unit), Domain, Application, Schemas |
| AC-02 (integration) | Crear specs en `tests/integration/{repositories,use-cases,ai}` que ejerciten use case + repo Prisma sobre BD efímera, constraints, middleware auth+policy y módulo IA con MockAIProvider; cleanup automático. | Testing (integration), Repositories, Middlewares, AI mock, DB |
| AC-03 (cobertura ≥50%) | Configurar reporte c8/istanbul en Vitest; definir umbral bloqueante de cobertura sobre lógica crítica. | Testing config, CI gate |
| AC-04 (determinismo) | Prohibir IA real y red externa; fixtures/IDs controlados; BD efímera reiniciada entre corridas. | Testing infra, CI |
| AC-05 (gate CI bloqueante) | Job de CI ejecuta unit+integration; falla ante test fallido, `.skip`/`xfail` crítico o cobertura insuficiente. | CI/DevOps |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Transversal: consume domain, application (use cases), repositories y middlewares existentes. No crea bounded contexts nuevos.

### Use Cases / Application Services

No se crean use cases productivos. Se crean **specs de prueba** que ejercitan los use cases existentes (unit con dependencias mockeadas; integration con repos reales sobre BD efímera).

### Controllers / Routes

No aplica — la capa de controllers/routes (HTTP) pertenece a la suite API separada.

### DTOs / Schemas

Se prueban los esquemas Zod existentes (validación, transformación, defaults) en `tests/unit/schemas`. No se definen nuevos DTOs.

### Repository / Persistence

Se prueban los repositorios Prisma existentes contra **PostgreSQL efímero** aprovisionado con las migraciones vigentes. Helper `test-db.ts` gestiona ciclo de vida (setup, truncate/rollback por test, teardown).

### Validation Rules

* VR-01: configuración de entorno de pruebas válida → fail-fast con mensaje explícito.
* VR-02: `OPENAI_API_KEY` ausente en CI; solo `MockAIProvider`.
* VR-03: sin pruebas críticas saltadas (`.skip`/`xfail`) → gate falla.
* VR-04: cobertura de lógica crítica ≥ umbral configurado → gate falla si no se cumple.

### Error Handling

Los helpers de infraestructura de prueba fallan de forma controlada (fail-fast) si la BD efímera no está disponible (EC-01), sin degradar a pruebas omitidas.

### Transactions

Estrategia de aislamiento por test recomendada: transacción con rollback o truncate por suite/test para garantizar determinismo. Definir en `test-db.ts`.

### Observability

Verificar propagación de `Correlation ID` donde el use case lo requiera; asegurar que los logs de prueba no contengan secretos.

---

## 8. Frontend Technical Design

No aplica — historia de backend sin UI.

---

## 9. API Contract Design

No aplica — esta historia cubre unit + integration; no expone ni prueba endpoints HTTP completos (suite API separada).

---

## 10. Database / Prisma Design

### Models Impacted

Ninguno se modifica. Se leen/escriben modelos existentes solo dentro de la BD efímera de prueba.

### Fields / Columns

Sin cambios de esquema.

### Relations

Se valida el comportamiento de relaciones/FKs existentes en integración.

### Indexes

Sin cambios.

### Constraints

Se **prueban** constraints existentes (FK, unique, enum, soft delete) verificando que fallan cuando deben (Doc 20 §6.2).

### Migrations Impact

Ninguna migración nueva. Las migraciones vigentes se aplican para aprovisionar la BD efímera de prueba.

### Seed Impact

No requiere cambios de seed productivo. Las pruebas usan fixtures propios; la idempotencia del seed real se cubre en su suite correspondiente.

---

## 11. AI / PromptOps Design

### AI Feature
No aplica como feature productiva. Se usa `MockAIProvider` solo como dependencia de prueba.

### Provider
`MockAIProvider` exclusivamente en pruebas. Prohibido `OpenAIProvider` real en CI.

### Prompt Version
No aplica (no se ejecuta IA productiva).

### Input Schema
Se reutilizan los schemas existentes del módulo IA para construir fixtures.

### Output Schema
Las aserciones validan conformidad de la salida del `MockAIProvider` contra el schema esperado (no texto literal).

### Human-in-the-loop
No aplica.

### Fallback
No aplica.

### Persistence
No persiste `AIRecommendation` productivo.

### Safety Rules
`OPENAI_API_KEY` ausente en CI; sin llamadas externas.

---

## 12. Security & Authorization Design

### Authentication
Cobertura de integración del middleware de autenticación (sesión/cookie válida vs anónimo).

### Authorization
Cobertura del middleware de policy: RBAC + ownership + assignment, casos positivos y negativos.

### Ownership Rules
Casos donde el actor no es dueño del recurso → 403 cubierto por prueba negativa.

### Role Rules
Casos donde el rol no autoriza la acción → 401/403 cubierto.

### Negative Authorization Scenarios
AUTH-TS-02 / NT-04: acceso negado por rol/ownership/assignment debe estar cubierto (obligatorio, aunque no mueva cobertura).

### Audit Requirements
Verificar `AdminAction`/logs donde el use case lo requiera; no es objetivo central de esta historia.

### Sensitive Data Handling
Sin secretos reales en fixtures ni logs de prueba (SEC-02, SEC-03).

---

## 13. Testing Strategy

### Unit Tests
`tests/unit/{domain,application,schemas,ai}`: políticas BR-*, lógica de use cases, esquemas Zod, mapeadores IA. Herramienta: Vitest.

### Integration Tests
`tests/integration/{repositories,use-cases,ai}`: use case + repo Prisma sobre BD efímera, constraints, middleware auth+policy, módulo IA con MockAIProvider. Herramientas: Vitest + Prisma + PostgreSQL efímero.

### API Tests
No aplica en esta historia (suite API separada).

### E2E Tests
No aplica (PB-P2-016).

### Security Tests
Casos negativos de autorización (401/403) integrados en la suite de middleware.

### Accessibility Tests
No aplica — sin UI.

### AI Tests
Integración con `MockAIProvider` validando schema.

### Seed / Demo Tests
No aplica como cambio de seed; fuera de alcance salvo fixtures locales.

### CI Checks
Gate obligatorio: unit + integration verdes, cobertura ≥ umbral, sin `.skip`/`xfail` crítico, sin `OPENAI_API_KEY` real. Bloquea merge (Doc 20 §22).

---

## 14. Observability & Audit

### Logs
Los logs emitidos durante pruebas no deben contener secretos.

### Correlation ID
Verificar propagación donde el use case bajo prueba lo requiera.

### AdminAction
Cobertura solo si el use case bajo prueba genera `AdminAction`.

### Error Tracking
No aplica como capacidad nueva.

### Metrics
Reporte de cobertura como métrica de soporte (c8/istanbul).

---

## 15. Seed / Demo Data Impact

### Seed Data Required
No requiere cambios al seed productivo.

### Demo Scenario Supported
Indirecto: refuerza la confiabilidad de los flujos demo al detectar regresiones.

### Reset / Isolation Notes
BD efímera con reset/cleanup automático entre pruebas; aislamiento por transacción/truncate.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 20 §22 (umbrales de cobertura) vs Backlog PB-P2-014 | Doc 20 recomienda mínimo global 60% y 80%+ para use cases críticos/policies; el backlog fija ≥50% sobre lógica crítica | Se adopta ≥50% sobre lógica crítica como umbral mínimo de esta historia (backlog es fuente formalizada); 60/80% como meta aspiracional | Confirmar umbral final con Tech Lead/QA Architect; actualizar Doc 20 o el backlog para unificar el número | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Flakiness por dependencia de IA real o red externa | Falsos positivos/negativos, CI inestable | `MockAIProvider` obligatorio; sin `OPENAI_API_KEY`; aserciones por schema |
| BD efímera no disponible o mal aislada | Pruebas no determinísticas o falladas | Helper `test-db` con fail-fast y reset/truncate por test |
| Cobertura alta sin pruebas negativas de autorización | Falsa sensación de calidad | Casos negativos 401/403 obligatorios independientemente del % |
| Umbral de cobertura ambiguo (50% vs 60/80%) | Discusión en revisión de PR | Documentation Alignment: fijar ≥50% ahora; confirmar meta con Tech Lead |
| Tiempo de suite de integración elevado | CI lento | Mantener unit como base amplia y rápida; integración enfocada en acoplamientos reales |

---

## 18. Implementation Guidance for Coding Agents

* **Archivos/carpetas probablemente impactados:** `backend/vitest.config.*` (o config equivalente), `backend/tests/unit/**`, `backend/tests/integration/**`, `backend/tests/fixtures/**`, `backend/tests/helpers/{test-db,mock-ai}.ts`, configuración de CI (job de unit+integration+cobertura).
* **Orden recomendado:** (1) config Vitest + scripts npm; (2) helpers `test-db` y `mock-ai` + fixtures base; (3) suite unit (domain → application → schemas → ai); (4) suite integration (repositories → use-cases → middlewares auth/policy → ai mock); (5) reporte y umbral de cobertura; (6) gate de CI bloqueante.
* **Decisiones que no deben reabrirse:** Vitest como runner (ADR-TEST-001); `MockAIProvider` obligatorio en CI; sin IA real en CI; umbral ≥50% lógica crítica como mínimo de esta historia.
* **Qué no implementar:** suite API Supertest completa, contract/MSW, E2E, pruebas de frontend, cambios de esquema o seed productivo.
* **Suposiciones a preservar:** la estructura de código backend (domain/application/repositories/middlewares) ya existe; PB-P0-015 provee la base de CI.

---

## 19. Task Generation Notes

* **Grupos de tareas sugeridos:** (BE) config Vitest + scripts; (BE) helpers + fixtures; (QA) suite unit; (QA) suite integration; (QA) cobertura + umbral; (DEVOPS) gate de CI; (DOC) documentación de cómo correr la suite.
* **Tareas QA requeridas:** unit por capa, integration por capa, casos negativos de autorización, verificación de determinismo/no-flakiness.
* **Tareas de seguridad requeridas:** pruebas negativas 401/403 de middleware policy; verificación de ausencia de secretos en logs/fixtures.
* **Tareas de seed/demo requeridas:** ninguna sobre seed productivo; solo fixtures de prueba.
* **Tareas de documentación requeridas:** README/CONTRIBUTING sobre ejecución de la suite y umbral de cobertura.
* **Dependencias entre tareas:** helpers/config antes de las suites; suites antes del gate de cobertura; gate de cobertura antes del gate de CI bloqueante.
* **Consolidación:** el ítem PB-P2-014 puede consolidar sus tareas en un `tasks.md` propio del backlog item.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P2-014) |
| Decision Resolution reviewed if present | N/A (no existe) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | Pass (sin cambios de esquema; BD efímera) |
| AI impact clear | Pass (MockAIProvider en pruebas) |
| Security impact clear | Pass (middleware policy negativo) |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia está aprobada, mapeada a PB-P2-014, con alcance claro (unit + integration), stack fijado por ADR-TEST-001, sin cambios de esquema/endpoints y con una única alerta de Documentation Alignment **no bloqueante** (umbral de cobertura). La estrategia de pruebas, seguridad y observabilidad están suficientemente definidas para generar Development Tasks.
