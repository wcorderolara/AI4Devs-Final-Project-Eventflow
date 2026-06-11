# 🧾 User Story: Carpetas por módulo de dominio (feature-first + Clean/Hex)

## 🆔 Metadata

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| ID                 | US-090                                   |
| Epic               | EPIC-BE-001 — Backend Modular Monolith   |
| Feature            | Estructura feature-first                 |
| Module / Domain    | Platform/BE                              |
| User Role          | System                                   |
| Priority           | Must Have (P0)                           |
| Status             | Approved                                 |
| Owner              | Product Owner / Business Analyst         |
| Sprint / Milestone | MVP                                      |
| Created Date       | 2026-06-09                               |
| Last Updated       | 2026-06-11                               |

---

## 🎯 User Story

**As the** sistema backend  
**I want** crear la estructura de directorios feature-first con los 16 bounded contexts del MVP y las capas `interface/application/domain/ports/infrastructure/` dentro de cada módulo, más el shared kernel con tipos base (`Result`, `Id`, `CorrelationId`, errores base)  
**So that** todos los módulos de dominio se desarrollen de forma consistente, el código sea trazable a reglas de negocio, y las dependencias entre capas sean verificables mediante herramientas de lint

---

## 🧠 Business Context

### Context Summary
Sin esta estructura los módulos de dominio no tienen un lugar canónico donde crecer; cualquier developer podría colocar código de manera inconsistente. Esta historia establece la convención de carpetas que todos los módulos del MVP deben seguir, alineada con Clean/Hexagonal Architecture (ADR-ARCH-002) y el Modular Monolith (ADR-ARCH-001).

### Related Domain Concepts
* Modular Monolith: un único deployable con fronteras lógicas por bounded context (ADR-ARCH-001)
* Clean/Hexagonal Architecture dentro de cada módulo (ADR-ARCH-002)
* Shared Kernel: tipos comunes sin lógica de feature (`Result`, `Id`, `CorrelationId`, errores base — Doc 14 §7.1)
* Import boundary: prohibición de imports cruzados entre módulos (Doc 14 §6 Principio 2)

### Assumptions
* US-089 está completo: servidor TypeScript inicializado y compilable con `strict: true`.
* La convención de nombres sigue Doc 14 §24.2 (`<verb>-<entity>.use-case.ts`, etc.).
* Los archivos placeholder son stubs vacíos o con el mínimo typeable; la implementación real pertenece a cada feature story.
* El shared kernel contiene solo tipos transversales; no incluye lógica de feature ni entidades de dominio.

### Dependencies
* US-089 (servidor inicializado) — esta US requiere el proyecto compilable como base.
* US-091 (pipeline de middlewares) depende de la estructura `src/shared/interface/middlewares/` creada aquí.

### PO/BA Decisions Applied

| Decisión | Resolución |
| -------- | ---------- |
| Lista canónica de bounded contexts | Los 16 bounded contexts de Doc 14 §9 son el scope definitivo: `identity-access`, `user-profile`, `event-planning`, `task-management`, `budget-management`, `vendor-management`, `service-catalog`, `quote-flow`, `booking-intent`, `reviews-moderation`, `notifications`, `ai-assistance`, `admin-governance`, `attachments`, `localization`, `seed-demo`. No se crean módulos adicionales en esta US. |
| NFR IDs aplicables | `NFR-OBS-006` y `NFR-SEC-001`. `NFR-PERF-API-001` no existe en Doc 10; `NFR-OBS-001` aplica solo a AdminAction logging y no a estructura de directorios. |
| Contenido mínimo del shared kernel | `Result<T,E>`, `Id`, `CorrelationId`, `ClockPort`, `AppError`, `ValidationError`, `AuthorizationError` per Doc 14 §7.1 y §24.1. El shared kernel no incluye lógica de feature, entidades de dominio ni use cases. |
| Mecanismo de enforcement de import boundaries | ESLint (`import/no-restricted-paths` o `eslint-plugin-boundaries`) es la herramienta de enforcement, no solo comentario en ADR. Configuración obligatoria en esta US (AC-03). |
| Nombre del directorio shared kernel | `src/shared/` (no `src/shared-kernel/`) per Doc 14 §24.1. |
| Convención de nombrado de archivos placeholder | Doc 14 §24.2 es la fuente de verdad: `<verb>-<entity>.use-case.ts`, `<entity>.repository.ts`, `prisma-<entity>.repository.ts`, `<feature>.controller.ts`, `<feature>.routes.ts`. Los placeholders deben seguir esta convención desde el inicio. |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa directamente un FR; establece la convención arquitectónica para todos los módulos |
| Use Case(s)            | Transversal — no implementa directamente un UC; habilita capacidades futuras                                  |
| Business Rule(s)       | —                                                                                                             |
| Permission Rule(s)     | N/A — capacidad técnica sin endpoints de runtime                                                              |
| Data Entity / Entities | —                                                                                                             |
| API Endpoint(s)        | —                                                                                                             |
| NFR Reference(s)       | NFR-OBS-006, NFR-SEC-001 (backend como source of truth requiere módulos estructurados)                        |
| Related ADR(s)         | ADR-ARCH-001, ADR-ARCH-002, ADR-BE-001                                                                        |
| Related Document(s)    | /docs/12, /docs/13, /docs/14                                                                                  |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P0)

### Explicitly Out of Scope
* Implementación de lógica de dominio, use cases o repositorios (pertenece a cada feature story).
* Pipeline de middlewares (US-091).
* Migraciones de base de datos (US separada de infraestructura DB).
* Microservicios, Kubernetes, brokers en MVP.
* Funciones futuras no listadas en Epic Map.

### Scope Notes
* Los archivos creados en esta US son stubs/placeholders tipados; la implementación real pertenece a las US de feature correspondientes.
* El shared kernel incluye solo: `Result<T,E>`, `Id`, `CorrelationId`, `ClockPort` (para testear fechas), y categorías de `AppError` base.
* Los 16 bounded contexts a crear están definidos en Doc 14 §9: `identity-access`, `user-profile`, `event-planning`, `task-management`, `budget-management`, `vendor-management`, `service-catalog`, `quote-flow`, `booking-intent`, `reviews-moderation`, `notifications`, `ai-assistance`, `admin-governance`, `attachments`, `localization`, `seed-demo`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Estructura de directorios por bounded context creada
**Given** el proyecto Node + Express + TypeScript inicializado (US-089)  
**When** se inspecciona el directorio `src/modules/`  
**Then** existen subdirectorios para los 16 bounded contexts definidos en Doc 14 §9 (`identity-access`, `user-profile`, `event-planning`, `task-management`, `budget-management`, `vendor-management`, `service-catalog`, `quote-flow`, `booking-intent`, `reviews-moderation`, `notifications`, `ai-assistance`, `admin-governance`, `attachments`, `localization`, `seed-demo`) y cada uno contiene los cinco subdirectorios: `interface/`, `application/`, `domain/`, `ports/`, `infrastructure/`

### AC-02: Shared kernel inicializado con tipos base
**Given** el proyecto inicializado  
**When** se inspecciona `src/shared/`  
**Then** existen los subdirectorios `domain/`, `application/`, `infrastructure/` e `interface/`; y `src/shared/domain/` contiene al menos stubs tipados de `Result<T,E>`, `Id`, `CorrelationId`, `ClockPort` y una jerarquía de errores base (`AppError`, `ValidationError`, `AuthorizationError`) conforme a Doc 14 §7.1 y §24.1

### AC-03: Regla ESLint de fronteras de módulos configurada
**Given** ESLint configurado en el proyecto con regla de import boundaries (e.g., `import/no-restricted-paths` o `eslint-plugin-boundaries`)  
**When** se ejecuta `eslint src/`  
**Then** la herramienta detecta como error cualquier import directo entre `src/modules/<modulo-A>/` y `src/modules/<modulo-B>/` que no pase por un barrel público; y la regla también prohíbe imports de Express, Prisma o SDKs externos dentro de `src/modules/*/domain/`

### AC-04: TypeScript compila sin errores con la estructura completa
**Given** la estructura de módulos con archivos stub tipados  
**When** se ejecuta `tsc --noEmit`  
**Then** la compilación termina sin errores de tipo en toda la estructura `src/`

### AC-05: Convenciones de nombrado aplicadas en placeholders
**Given** la estructura de módulos creada  
**When** se inspeccionan los archivos placeholder existentes  
**Then** los nombres siguen las convenciones de Doc 14 §24.2: use cases `<verb>-<entity>.use-case.ts`, repositorios `<entity>.repository.ts`, adapters `prisma-<entity>.repository.ts`, controllers `<feature>.controller.ts`, routes `<feature>.routes.ts`

---

## ⚠️ Edge Cases

### EC-01: Import cruzado directo entre módulos detectado por ESLint
**Given** un archivo en `src/modules/event-planning/domain/` intenta importar directamente de `src/modules/quote-flow/domain/`  
**When** se ejecuta ESLint sobre el archivo  
**Then** la regla de import boundary reporta un error de lint; la comunicación entre módulos solo puede ocurrir a través de casos de uso públicos expuestos en el barrel del módulo origen (ADR-ARCH-001)

#### Handling
* Configurar `import/no-restricted-paths` o equivalente en `.eslintrc` para cada par de módulos.

### EC-02: Domain layer importa dependencia de infraestructura
**Given** un archivo en `src/modules/<module>/domain/` intenta importar de `@prisma/client`, `express`, `openai` u otro SDK externo  
**When** se ejecuta ESLint o TypeScript sobre el código  
**Then** la regla de import boundary o la configuración de TypeScript paths reporta error; el domain layer solo puede depender de `src/shared/domain/` (ADR-ARCH-002)

#### Handling
* Regla ESLint de import boundary + revisión en PR.

---

## 🚫 Validation Rules

| ID    | Rule                                                                          | Message / Behavior                                       |
| ----- | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| VR-01 | Los 16 bounded contexts definidos en Doc 14 §9 tienen los 5 sub-directorios  | Error de lint / CI si falta algún directorio esperado    |
| VR-02 | Imports cruzados entre módulos prohibidos                                     | ESLint error: `Cross-module import not allowed`          |
| VR-03 | Domain layer no importa Express, Prisma ni SDKs externos                      | ESLint error: `Infrastructure dependency in domain layer`|

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ |
| SEC-01 | N/A — esta historia no introduce endpoints de runtime ni lógica de autorización.           |
| SEC-02 | Secrets solo vía variables de entorno; no se incluyen secretos en la estructura de módulos. |
| SEC-03 | Logs sin PII ni secretos — los stubs de shared kernel no contienen datos sensibles.        |

### Negative Authorization Scenarios
* N/A — esta historia no introduce endpoints ni runtime authorization.

---

## 🤖 AI Behavior

No aplica — esta historia no invoca IA directamente.

### AI Involvement
* AI Feature: None
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
* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes                        |
| ------------------- | ---------------------------- |
| Screen / Route      | N/A (capacidad técnica)      |
| Main UI Pattern     | N/A                          |
| Primary Action      | N/A                          |
| Secondary Actions   | N/A                          |
| Empty State         | N/A                          |
| Loading State       | N/A                          |
| Error State         | N/A                          |
| Success State       | N/A                          |
| Accessibility Notes | N/A                          |
| Responsive Notes    | N/A                          |
| i18n Notes          | N/A                          |
| Currency Notes      | N/A                          |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A

### Backend
* **Estructura `src/modules/<bounded-context>/`**: 16 directorios conforme a Doc 14 §9, cada uno con sub-capas `interface/`, `application/`, `domain/`, `ports/`, `infrastructure/`.
* **`src/shared/domain/`**: `result.ts` (tipo `Result<T,E>`), `id.ts` (tipo `Id`), `clock.ts` (`ClockPort`), `errors/base.error.ts`, `errors/validation.error.ts`, `errors/authorization.error.ts`.
* **`src/shared/application/`**: `transaction-manager.port.ts` (puerto stub), `notification-sender.port.ts` (puerto stub).
* **`src/shared/infrastructure/`**: directorio placeholder; `prisma/prisma.client.ts` (stub), `logger/` (placeholder).
* **`src/shared/interface/middlewares/`**: directorio placeholder; archivos `.ts` vacíos o stubs para los 11 middlewares de Doc 14 §8.2 (implementación en US-091).
* Use Case / Service: N/A
* Controller / Route: N/A
* Authorization Policy: N/A
* Validation: ESLint import boundary rules
* Transaction Required: No

### Database
* Main Tables: — (no se crean tablas en esta US)
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| —      | —        | N/A — capacidad técnica sin endpoints |

### Observability / Audit
* Correlation ID Required: N/A — no hay runtime requests en esta US
* Log Event Required: N/A
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                        | Type           | Tool               |
| ----- | ------------------------------------------------------------------------------- | -------------- | ------------------ |
| TS-01 | Los 16 bounded contexts existen con los 5 sub-directorios esperados             | Architecture   | Script CI / fs check |
| TS-02 | `src/shared/domain/` contiene `Result`, `Id`, `CorrelationId`, errores base     | Static / Build | tsc                |
| TS-03 | `tsc --noEmit` pasa sin errores sobre toda la estructura `src/`                 | Build          | tsc                |
| TS-04 | ESLint detecta import boundary violations (smoke test de la regla)              | Lint           | ESLint             |

### Negative Tests

| ID    | Scenario                                                                            | Expected Result                                 | Tool   |
| ----- | ----------------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| NT-01 | Archivo en `domain/` importa `@prisma/client`                                       | ESLint error: infrastructure dependency in domain | ESLint |
| NT-02 | Import directo entre `src/modules/event-planning/` y `src/modules/quote-flow/`     | ESLint error: cross-module import not allowed   | ESLint |

### AI Tests
Not applicable for this story.

### Authorization Tests
* N/A — esta historia no introduce endpoints de runtime.

### Accessibility Tests
* N/A — no tiene UI.

---

## 📊 Business Impact

| Field               | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| KPI Affected        | Salud técnica, mantenibilidad, velocidad de desarrollo                                      |
| Expected Impact     | Habilita el desarrollo consistente y trazable de todos los módulos del MVP                 |
| Success Criteria    | Estructura completa, shared kernel compilable, ESLint import boundaries operativos          |
| Academic Demo Value | Arquitectura Clean/Hex demostrable y evaluable en code review                               |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* N/A.

### Potential Backend Tasks
* Crear los 16 directorios de bounded context con las 5 sub-capas bajo `src/modules/` (Doc 14 §9 y §24.1).
* Crear `src/shared/domain/` con stubs tipados: `result.ts`, `id.ts`, `clock.ts`, `errors/base.error.ts`, `errors/validation.error.ts`, `errors/authorization.error.ts`.
* Crear `src/shared/application/` con puertos stub: `transaction-manager.port.ts`, `notification-sender.port.ts`.
* Crear `src/shared/infrastructure/` con placeholder de Prisma client y logger.
* Crear `src/shared/interface/middlewares/` con archivos placeholder para los 11 middlewares (implementación en US-091).
* Configurar ESLint import boundary rule (`import/no-restricted-paths` o `eslint-plugin-boundaries`) por bounded context.
* Documentar convenciones de nombrado en `src/modules/README.md` referenciando Doc 14 §24.2.

### Potential Database Tasks
* N/A — sin migraciones en esta US.

### Potential AI / PromptOps Tasks
* N/A.

### Potential QA Tasks
* Script CI que valida existencia de los 16 módulos con las 5 sub-capas.
* Smoke test ESLint sobre los placeholders (NT-01, NT-02).
* Verificar `tsc --noEmit` sin errores en la estructura completa.

### Potential DevOps / Config Tasks
* Configurar `.eslintrc` con regla de import boundaries.
* Agregar script `lint` al `package.json` si no estaba en US-089.

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal técnico claro (estructura de 16 módulos con 5 capas + shared kernel stub + ESLint import rules).
* [x] Referencias a Docs de Arquitectura (/docs/12, /docs/13, /docs/14).
* [x] ADRs relevantes referenciados (ADR-ARCH-001, ADR-ARCH-002, ADR-BE-001).
* [x] NFRs correctos referenciados (NFR-OBS-006, NFR-SEC-001).
* [x] Permisos / Seguridad: N/A explícito (no hay endpoints de runtime).
* [x] Entidades: N/A explícito.
* [x] AC en GWT específicos y verificables.
* [x] Edge cases documentados (import cruzado, domain importa infra).
* [x] Validación clara (VR-01..VR-03 via ESLint).
* [x] Out of Scope explícito (implementación de lógica de feature, middlewares, migraciones).
* [x] Dependencias conocidas (depende de US-089; US-091 depende de esta US).
* [x] UX: N/A explícito.
* [x] API: N/A explícito.
* [x] Tests definidos con herramientas (tsc, ESLint, script CI).
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Los 16 bounded contexts existen en `src/modules/` con los 5 sub-directorios (interface, application, domain, ports, infrastructure).
* [ ] `src/shared/domain/` compilable con `Result`, `Id`, `CorrelationId`, `ClockPort` y errores base.
* [ ] `tsc --noEmit` sin errores en toda la estructura `src/`.
* [ ] ESLint con regla de import boundaries configurada; NT-01 y NT-02 reportan error como se espera.
* [ ] Convenciones de nombrado documentadas (Doc 14 §24.2).
* [ ] Tech Lead valida estructura de módulos y tipos del shared kernel.

---

## 📝 Notes

* La lista canónica de los 16 bounded contexts está en Doc 14 §9. No se deben crear módulos adicionales en esta US.
* El `shared-kernel` en esta US se llama `src/shared/` (no `src/shared-kernel/`) para alinearse con la estructura propuesta en Doc 14 §24.1.
* La regla de import boundary debe configurarse para prohibir tanto imports entre módulos como imports de infraestructura en la capa domain (ADR-ARCH-002: "Domain no importa Express ni Prisma ni el SDK de OpenAI").
* Los archivos placeholder en `src/shared/interface/middlewares/` quedarán vacíos o con stubs de exportación; la implementación completa del pipeline de middlewares es responsabilidad de US-091.
* Si el ESLint import boundary requiere una herramienta adicional (e.g., `eslint-plugin-boundaries`), incluirla como devDependency en esta US.
