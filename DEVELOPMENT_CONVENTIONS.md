# EventFlow — Development Conventions (`DEVELOPMENT_CONVENTIONS.md`)

> Contrato operativo de desarrollo. Traduce las decisiones de arquitectura y diseño ya aprobadas de EventFlow a reglas concretas de implementación. No reemplaza a los documentos de diseño; los operacionaliza.

---

## 1. Metadatos del documento

| Campo | Valor |
|---|---|
| **Título** | EventFlow — Development Conventions |
| **Estado** | Active (canonical operational contract) |
| **Versión** | 1.0.0 |
| **Proyecto** | EventFlow — MVP académico de planificación de eventos asistida por IA y gestión simplificada de cotizaciones de proveedores |
| **Audiencia** | Backend, Frontend, Base de datos, Integración de IA, QA, DevOps, Tech Leads, revisores de código, agentes de codificación (Claude Code, Codex), evaluadores académicos |
| **Alcance** | Backend, Frontend, Base de datos, API, IA, Testing, Seguridad, DevOps, Documentación, Git/revisión |
| **Owner** | `Tech Lead / Architecture Owner` (rol, no persona) |
| **Política de revisión** | Se revisa cuando un ADR aceptado cambia una decisión que este documento operacionaliza, o al inicio de cada bloque de backlog (P0..P3). Cambios materiales requieren PR con revisión del Architecture Owner |
| **Última actualización** | 2026-07-08 |
| **Idioma** | Español LATAM neutro. Identificadores técnicos en inglés verbatim |
| **Relación con ADRs / diseños** | Subordinado a los ADRs aceptados (`docs/22`) y a los diseños técnicos (`docs/10`–`docs/21`). Ver §3 (jerarquía) y §22 (trazabilidad) |

**Nota de estado del repositorio.** Al momento de esta versión el repositorio es **documentación y planificación de entrega**: no existe aún código de aplicación, `package.json`, `tsconfig.json`, configuración de ESLint/Prettier, `Dockerfile`, esquema Prisma ni workflows de CI. Por lo tanto, la mayoría de las reglas de este documento describen la **arquitectura objetivo (Target)** aprobada, no una realidad ya implementada. Cada sección marca explícitamente **Current** (lo que hoy existe/está automatizado) frente a **Target** (lo aprobado por implementar). Ninguna automatización descrita aquí debe asumirse activa hasta que exista su configuración real en el repo.

---

## 2. Propósito

Este archivo existe para que cualquier desarrollador humano o agente de codificación pueda escribir, organizar, validar, probar, revisar y entregar código de EventFlow **sin releer todos los documentos técnicos para el trabajo rutinario**.

- **Qué controla:** la forma concreta del código, las estructuras de carpetas, los límites de capas, los contratos de API, las reglas de base de datos, la integración de IA, seguridad, testing, observabilidad, DevOps y el flujo de Git/revisión.
- **Qué NO reemplaza:** los ADRs (`docs/22`) ni los diseños técnicos (`docs/10`–`docs/21`), que siguen siendo la fuente de verdad de las decisiones. Ante cualquier detalle de contrato o regla de negocio no cubierto aquí, se consulta el documento fuente citado.
- **Uso por agentes de codificación:** todo agente **DEBE** leer este documento antes de generar código, respetar la jerarquía de §3, y cuando una tarea entre en conflicto con una regla aquí, **DEBE** detenerse y escalar (ver §20) en lugar de improvisar. Los agentes **NO DEBEN** hacer commit ni push salvo solicitud explícita del usuario (§17).
- **Aplicabilidad:** aplica a **toda** Technical Specification (`management/technical-specs/`) y a **toda** Development Task (`management/development-tasks/`).

### Palabras clave normativas (interpretación)

Se usan palabras clave estilo RFC 2119. Interpretación:

- **DEBE / MUST**, **NO DEBE / MUST NOT**: regla obligatoria. Violarla bloquea el merge y, si cambia arquitectura, requiere ADR (§20).
- **DEBERÍA / SHOULD**, **NO DEBERÍA / SHOULD NOT**: recomendación fuerte. Desviarse exige justificación registrada en la Tech Spec.
- **PUEDE / MAY**: opción legítima a criterio del implementador.

Cada regla indica, cuando aplica, si su cumplimiento es **automatizado** (herramienta/CI) o requiere **revisión manual** (ver la matriz de §21). Mientras la automatización no exista en el repo, la regla se cumple por **revisión manual**.

---

## 3. Jerarquía de fuente de verdad

Ante conflicto entre dos reglas, gana la de mayor jerarquía:

1. **ADRs aceptados** — `docs/22-Architecture-Decision-Records.md` (46 ADRs, todos `Accepted`, scope `MVP`).
2. **Diseños de Seguridad y Arquitectura** — `docs/19` (Security), `docs/12` (Architecture Vision), `docs/13` (System Architecture).
3. **Diseños de API, Backend, Frontend, IA, Base de datos, Testing y DevOps** — `docs/16`, `docs/14`, `docs/15`, `docs/17`, `docs/18`, `docs/20`, `docs/21`. También `docs/10` (NFR) y `docs/11` (Seed).
4. **`DEVELOPMENT_CONVENTIONS.md`** (este documento).
5. **User Story Tech Spec** — `management/technical-specs/<Px>/<PB-…>/…`.
6. **Development Tasks** — `management/development-tasks/<Px>/<PB-…>/…`.
7. **Implementación** (código).

Un nivel inferior **PUEDE especializar** (concretar, restringir, elegir entre opciones abiertas) un nivel superior, pero **NO DEBE contradecirlo en silencio**. Si necesita contradecirlo, se aplica §20 (excepciones/ADR). Si dos documentos del mismo nivel difieren, el que es autoridad del tema gana (p. ej. el contrato REST canónico es `docs/16`; el modelo físico de datos canónico es `docs/18`; los comandos de build/CI canónicos son `docs/21`). Los conflictos ya detectados y su resolución están en §22.1.

---

## 4. Alcance y aplicabilidad

Aplica a todo artefacto de desarrollo del MVP en las siguientes áreas: **backend**, **frontend**, **base de datos**, **API**, **integración de IA**, **testing**, **seguridad**, **DevOps/entornos**, **documentación** y **flujo Git/revisión**.

**Fuera de alcance del MVP (no se implementa; ver §5 guardarraíles y `docs/22 §9`):** microservicios; colas/brokers (SQS, RabbitMQ, Kafka, BullMQ); Redis; WebSockets/SSE; chat en tiempo real; Kubernetes/EKS/ECS-cluster/service mesh; pagos reales/escrow/comisiones; contratos digitales/e-sign; WhatsApp/SMS/push; apps nativas; conversión automática de moneda; moderación/ranking por IA; aprobación autónoma de proveedores; chatbot conversacional libre; MFA/SSO/OAuth federado; RAG/embeddings; multi-región; IaC obligatorio. Introducir cualquiera requiere actualización formal de alcance + nuevo ADR.

---

## 5. Principios generales de ingeniería

- **Claridad sobre astucia.** El código **DEBE** leerse como el código que lo rodea (nombres, densidad de comentarios, idioms).
- **Cambio coherente mínimo.** Cada tarea/PR **DEBE** limitarse a su objetivo. **NO DEBE** incluir refactors no relacionados ni expansión silenciosa de alcance.
- **Dependencias explícitas.** Inyección por composición; nada de singletons ocultos ni acceso global a infraestructura. La dirección de dependencias sigue §8.
- **Evitar abstracciones prematuras.** **NO DEBE** crearse un port, repositorio, servicio de dominio o factory por cada tabla o por reflejo; se crean solo donde hay comportamiento de negocio, sustitución de infraestructura, transaccionalidad, ownership, consulta compleja, soft delete o auditoría que lo justifiquen (§8, `docs/14 §13`).
- **Vocabulario de dominio.** Usar los términos del modelo (`Event`, `VendorProfile`, `QuoteRequest`, `BookingIntent`, `AIRecommendation`, etc.) en código, tests y commits.
- **Determinismo.** Seeds, mocks de IA y datos de prueba **DEBEN** ser deterministas (§11, §12, §14).
- **Idempotencia.** Seeds y jobs programados **DEBEN** ser idempotentes (§11, §16).
- **Separación de responsabilidades.** Controladores delgados, use cases orquestan, dominio decide, infraestructura ejecuta (§8).
- **Comportamiento fail-safe.** Ante duda de autorización, **denegar** (`403`, o `404` para no revelar existencia). Ante fallo de IA/DB/externo, error controlado y observable, nunca side-effect silencioso (§12, §13).
- **Observabilidad por defecto.** Todo request lleva `correlationId`; logs estructurados; sin secretos ni PII (§15).
- **Accesibilidad e i18n como requisito**, no pulido opcional (§10).
- **Seguridad por defecto.** Backend es la autoridad de reglas de negocio y autorización; el frontend es solo UX (§13).
- **Sin expansión de alcance.** Nada fuera del MVP (§4).

---

## 6. Organización del repositorio

### 6.1 Current (existe hoy)

```
/                      # raíz
  AGENTS.md            # instrucciones de agentes y ruteo de skills
  DEVELOPMENT_CONVENTIONS.md   # este archivo
  readme.md
  prompts.md
  .gitignore
  docs/                # docs de producto, arquitectura y diseño (fuente de verdad)
  management/          # backlog, user-stories, technical-specs, development-tasks, workflows, templates, artifacts
  prompts/             # prompts fuente de la documentación
  deliverables/
  .skills/  .agents/skills/   # skills del proyecto (Claude / Codex)
  .claude/commands/    # comandos de skill
```

Hoy **NO existen** `backend/`, `frontend/`, `prisma/`, `package.json`, `tsconfig*.json`, config de ESLint/Prettier, `.editorconfig`, `.nvmrc`, `Dockerfile` ni `.github/workflows/`. Todo lo siguiente es **Target**.

### 6.2 Target (estructura aprobada por implementar)

- **Backend** en `backend/` (`docs/14 §24.1`, `docs/21 §26.3`). Raíz backend: `src/app.ts`, `src/server.ts`, `src/config/` (`env.ts`, `logger.ts`), `src/jobs/`, `src/modules/<módulo>/`, `src/shared/`; `prisma/{schema.prisma, migrations/, seed.ts}`; `tests/{e2e,fixtures}`; `.env.example`; `Dockerfile`.
- **Frontend** en `frontend/` (`docs/15 §15`). Raíz frontend: `app/`, `features/`, `shared/`, `tests/`, `public/`, `messages/`; `.env.local.example`.
- **Prisma**: `backend/prisma/` (esquema único `schema.prisma`, `migrations/`, `seed.ts`). El script de seed puede residir/organizarse bajo `prisma/seed.ts` o `scripts/seed` (`docs/11 §29.2`).
- **Paquetes compartidos**: **no** hay monorepo con paquetes compartidos aprobado. Los tipos/DTO se comparten dentro de cada lado (backend `shared/`, frontend `shared/lib/types`); el frontend **NO DEBE** importar del backend directamente.
- **Tests**: colocados según §14 (backend `backend/tests/…` y `tests/`; frontend `frontend/tests/…`).
- **Scripts**: comandos npm documentados en §16.
- **Documentación**: `docs/` (diseño) y `management/` (entrega). **NO DEBE** modificarse documentación de diseño ni artefactos de management fuera del workflow activo.
- **Archivos generados** (Prisma Client, build) **NO DEBEN** versionarse; van en `.gitignore` / `.dockerignore`.
- **Archivos de entorno**: `.env` y `.env.*` **NUNCA** se versionan; solo `.env.example` (backend) y `.env.local.example` (frontend) con nombres sin valores reales (§16).

Reglas de organización que **DEBEN** cumplirse:
- Backend: un directorio por bounded context bajo `src/modules/`, cada uno con las cinco capas (§8). `shared-kernel` no depende de ningún módulo.
- Frontend: organización *feature-first* bajo `features/`; **sin** imports profundos entre features (solo vía `index.ts`) (§10).

---

## 7. Convenciones generales de TypeScript

Aplican a backend y frontend. Base: **TypeScript 5.x** con `strict: true` (`ADR-BE-001`, `ADR-FE-001`).

- **strict mode:** `strict: true` **DEBE** estar activo. `tsconfig.json` del backend **DEBE** incluir además `noUncheckedIndexedAccess` y `noImplicitOverride` (`ADR-BE-001`).
- **`any`:** **NO DEBE** usarse. Preferir `unknown` en fronteras y refinar por validación (Zod) o *type guards*. Todo `any` remanente requiere comentario que lo justifique.
- **`unknown`:** es el tipo correcto para entrada externa no validada; refinar antes de usar.
- **Type assertions (`as`):** **NO DEBERÍAN** usarse para forzar tipos; se prefiere validación en runtime. `as unknown as X` está prohibido salvo justificación local.
- **Nulabilidad:** modelar ausencia con tipos explícitos; evitar `!` (non-null assertion) salvo con justificación.
- **Tipos en fronteras públicas:** toda función/handler expuesto (use cases, controllers, API de módulo/feature) **DEBE** declarar tipos de entrada y salida explícitos. No confiar en inferencia en la API pública de un módulo.
- **`interface` vs `type`:** ambos válidos; usar `interface` para contratos de objetos/puertos y `type` para uniones, tuplas y utilitarios. Sin dogma; consistencia local.
- **Enums vs uniones literales:** en dominio de datos se usan **enums de Prisma/PostgreSQL** (§11). En TypeScript de aplicación se **prefieren uniones de literales** (`type Role = 'organizer' | 'vendor' | 'admin' | 'anonymous'`) y los enums generados por Prisma para el modelo de datos.
- **Naming:** `PascalCase` para tipos, clases, componentes React; `camelCase` para variables, funciones, campos; `SCREAMING_SNAKE_CASE` para constantes de entorno y literales globales. Archivos según los patrones de §8 (backend) y §10 (frontend).
- **Imports:** ordenados (externos → internos por alias → relativos). **NO DEBE** importarse infraestructura desde dominio/aplicación (§8).
- **Exports:** cada módulo backend y cada feature frontend expone su API pública mediante `index.ts`; el resto es privado al módulo.
- **Barrel files:** permitidos solo como API pública de módulo/feature; **NO DEBEN** crear ciclos ni reexportar todo indiscriminadamente.
- **Path aliases:** se **DEBERÍAN** usar alias definidos en `tsconfig.json` (p. ej. `@modules/*`, `@shared/*` en backend; `@/features/*`, `@/shared/*` en frontend) en lugar de rutas relativas largas.
- **Tipado de errores:** usar la jerarquía tipada de errores (backend §8; `DomainError`/`InfrastructureError`). **NO DEBE** hacerse `throw` de strings ni de objetos planos.
- **async/await y Promises:** preferir `async/await`; toda Promise **DEBE** ser `await`-eada o manejada. No dejar *floating promises*.
- **Fechas:** en persistencia y transporte, ISO 8601 UTC; en dominio, `Date`/value objects; conversión de zona horaria solo en frontend/servicio (§9, §11). `timestamptz` en DB (§11).
- **Valores monetarios:** `Decimal`/`numeric(14,2)` en dominio y DB; **string** de dos decimales en JSON de API; nunca `number` de punto flotante para dinero (§9, §11).
- **Tipos generados:** el Prisma Client es un tipo generado; **NO DEBE** filtrarse fuera de infraestructura (§8, §11).
- **Comentarios y JSDoc:** comentar el *por qué*, no el *qué*. Reglas de negocio críticas **DEBERÍAN** referenciar su `BR-*` en comentario o nombre de test (`NFR-MAINT-004`).
- **Directivas de supresión (`@ts-ignore`, `@ts-expect-error`):** **NO DEBERÍAN** usarse; si son inevitables, requieren comentario que explique la causa. Preferir `@ts-expect-error` sobre `@ts-ignore`.
- **Código muerto:** **NO DEBE** dejarse código muerto, comentado o `console.log` en el commit final.
- **`eslint-disable`:** cada supresión de lint **DEBE** ser puntual (línea/regla específica) y llevar comentario justificándola. Prohibido deshabilitar reglas a nivel de archivo sin justificación.

Cualquier excepción a esta sección requiere explicación local (comentario) y, si es recurrente, nota en la Tech Spec.

---

## 8. Convenciones de backend

Stack: **Node.js LTS (20.x)** + **TypeScript 5.x** + **Express** (solo en Interface) + **Prisma 5.x** (solo en Infrastructure) + **PostgreSQL** (`ADR-BE-001/002`, `ADR-ARCH-001/002`). Estilo: **Modular Monolith** + **Clean/Hexagonal** por módulo.

### 8.1 Organización por módulos

Un directorio por bounded context: `src/modules/<bounded-context>/`. Los módulos se nombran **por dominio, no por capa**. Módulos aprobados (`docs/14 §6/§9`):

`identity-access`, `user-profile`, `event-planning`, `task-management`, `budget-management`, `vendor-management`, `service-catalog`, `quote-flow`, `booking-intent`, `reviews-moderation`, `notifications`, `ai-assistance`, `admin-governance`, `attachments`, `localization`, `seed-demo`, `shared-kernel`.

Cada módulo contiene las capas: `interface/`, `application/`, `domain/`, `application/ports/` (y ports de dominio donde aplique), `infrastructure/`. Módulos escasos (p. ej. `localization`) **PUEDEN** aplanar su estructura.

**Comunicación entre módulos:** solo vía use cases públicos / API de módulo (`index.ts`). Un módulo **NO DEBE** acceder a los repositorios, tablas ni entidades internas de otro (`docs/13 §8`). Las dependencias cruzadas permitidas están acotadas en `docs/14 §9` (p. ej. `event-planning` puede depender de `budget-management`, `task-management`, `notifications`). `shared-kernel` no depende de ningún módulo.

### 8.2 Capas y dirección de dependencias

Cinco capas por módulo (`ADR-ARCH-002`, `docs/14 §4.3, §7`). Nombres exactos: **Interface**, **Application**, **Domain**, **Ports**, **Infrastructure**, más **Shared Kernel** transversal.

| Capa | Contiene | NO DEBE contener |
|---|---|---|
| **Interface** | Express, routes, controllers, middlewares, presenters, validación sintáctica (Zod) | Reglas de negocio, Prisma, SDK de OpenAI |
| **Application** | use cases, DTOs internos, orquestación, definición de límites de transacción, invocación de ports | `Request`/`Response`/`NextFunction`, `PrismaClient`, SDK de IA |
| **Domain** | entidades, value objects (`Money`, `Currency`, `Locale`, `EventStatus`…), domain services, policies, domain errors, invariantes | Express, Prisma, SDK de OpenAI, axios, cualquier framework |
| **Ports** | interfaces (`EventRepository`, `LLMProvider`, `FileStoragePort`, `NotificationSenderPort`, `TransactionManager`…) | Implementaciones concretas |
| **Infrastructure** | adapters Prisma, `OpenAIProvider`, `MockAIProvider`, `AnthropicProvider`, storage local/S3, hashing, logger | Reglas de negocio |
| **Shared Kernel** | `Result<T,E>`, `Id`, `CorrelationId`, errores base, utilidades de fecha/moneda, `Clock` | Lógica de feature; no depende de nada |

**Reglas de dependencia inviolables (DEBE):** las dependencias apuntan **hacia adentro**. Domain **NO DEBE** importar Express/Prisma/SDK de IA. Application **NO DEBE** importar tipos de Express ni `PrismaClient` directamente; depende solo de **Ports**. Prisma vive **solo** en `infrastructure/`. El SDK de OpenAI vive **solo** dentro de `OpenAIProvider`. Los Prisma models son **modelos de persistencia, no entidades de dominio**.

### 8.3 Domain layer

- Pureza: sin imports de framework/ORM/HTTP/SDK.
- Entidades y value objects solo cuando el comportamiento lo justifique (no *data classes* mecánicas).
- Invariantes de negocio se validan aquí; los errores de dominio usan la jerarquía tipada (`DomainError`).
- **NO DEBE** filtrar tipos generados por Prisma.

### 8.4 Application layer

- **Un use case por intención** de usuario/sistema (p. ej. `CreateEventUseCase`, `GenerateEventPlanUseCase`, `AcceptAIRecommendationUseCase`).
- DTOs de entrada/salida internos; no exponer entidades ni Prisma models.
- **Límite de transacción:** la capa Application lo define (§8.8).
- Autorización (RBAC + ownership + assignment) se aplica en Application/Interface middlewares antes del efecto (§13).
- Validación **semántica** y *cross-field* (existencia de referencias, coherencia de estado, `eventDate` futura, `validUntil > createdAt`) va en el use case (`docs/16 §17.2`).
- Traducción de errores de dominio a HTTP se hace centralizadamente (§8.7), no en el use case.
- **Lectura trivial:** un `Get<X>UseCase` fino o una llamada directa a repositorio desde el controller es aceptable cuando no hay coordinación de ports ni validación (`docs/14 §11`). No crear use cases ceremoniales.

### 8.5 Interface / HTTP layer

- **Controllers delgados (DEBE):** solo (1) extraer `req.body`/`params`/`query`/`user`; (2) invocar un use case; (3) mapear el resultado a un Response DTO + status HTTP.
- **NO DEBE** haber reglas de negocio `BR-*` en controllers ni en middlewares de feature; **NO DEBE** haber acceso directo a Prisma desde controllers.
- **Anti-patrón:** un controller por entidad. Las lecturas de catálogo van en `ServiceCatalogController`; las mutaciones administrativas en `AdminController`.
- Una ruta **NO DEBE** saltarse los middlewares de autorización.
- **Orden global de middlewares (DEBE)** (`docs/14 §8.2`, `docs/19 §20.1`): `correlationIdMiddleware` → `requestLoggerMiddleware` → `jsonBodyParser` (límite 1 MB) → `corsMiddleware` → `helmet` → `rateLimitMiddleware` (global laxo; estricto por ruta) → rutas `/api/v1` [ `authMiddleware` → `captchaVerificationMiddleware` (solo `/auth/register`, `/auth/login`, reset-request) → `roleMiddleware` → `ownershipMiddleware` → `validateRequestMiddleware(schema)` → `fileUploadMiddleware` ] → controller → `notFoundMiddleware` → `errorHandlerMiddleware`. `authMiddleware` corre **después** de rate limit; `validateRequestMiddleware` corre **después** de ownership (para que 401/403 precedan a 400).
- **Validación sintáctica (Zod) en la frontera** vía `validateRequestMiddleware(schema)` con `.strict()`: valida `body`, `params`, `query`; campos desconocidos se **rechazan** (`VALIDATION_ERROR`) (§9, §13).
- `src/app.ts` = factory de Express (middlewares globales, monta `/api/v1`, error handler). `src/server.ts` = bootstrap. `GET /health` público sin auth ni rate limit estricto.

### 8.6 Infrastructure layer

- Adapters de Prisma implementan los Ports; SDKs externos (OpenAI, Anthropic stub), storage (local/S3), hashing (bcrypt/argon2), logger (`pino`) se aíslan aquí.
- Cada adapter Prisma tiene su **mapper** dedicado (`.toDomain()` / `.toPersistence()`); los métodos de port devuelven **entidades de dominio**, nunca `Prisma.<Model>`.
- Configuración se lee en `config/env.ts` validada con Zod (§16).

### 8.7 Naming (backend) — verbatim (`docs/14 §24.2`)

| Componente | Convención | Ejemplo |
|---|---|---|
| Use case (archivo) | `<verb>-<entity>.use-case.ts` | `create-event.use-case.ts` |
| Use case (clase) | `<Verb><Entity>UseCase` (sufijos `UseCase`/`JobUseCase`/`AdminUseCase`) | `CreateEventUseCase` |
| DTO request | `<action>-<entity>.request.ts` | `create-event.request.ts` |
| DTO response | `<entity>.response.ts` | `event.response.ts` |
| Repository port | `<entity>.repository.ts` → interfaz `EventRepository` | `event.repository.ts` |
| Prisma adapter | `prisma-<entity>.repository.ts` → `class PrismaEventRepository implements EventRepository` | `prisma-event.repository.ts` |
| Mapper | `<entity>.prisma-mapper.ts` → `EventPrismaMapper` | `event.prisma-mapper.ts` |
| Controller | `<feature>.controller.ts` → `EventsController` | `events.controller.ts` |
| Routes | `<feature>.routes.ts` | `events.routes.ts` |
| Middleware | `<name>.middleware.ts` | `auth.middleware.ts` |
| Domain service | `<name>.service.ts` | `event-lifecycle.service.ts` |
| Policy | `<name>.policy.ts` | `password-policy.ts` |
| Port (aplicación) | `<name>.port.ts` | `llm.provider.port.ts`, `transaction-manager.port.ts` |
| Adapter (no-Prisma) | `<impl>-<role>.ts` / `.adapter.ts` | `bcrypt-password-hasher.ts`, `local-file-storage.adapter.ts` |
| Error | `<name>.error.ts` | `authentication.error.ts` |
| Unit test | `<file>.spec.ts` | `create-event.use-case.spec.ts` |
| Integration test | `<file>.int.spec.ts` | `events.controller.int.spec.ts` |

Nota: las **interfaces de port NO llevan prefijo `I`** — se usa `EventRepository`, `LLMProvider` (autoridad `docs/14`; ver §22.1). DTO de API en TypeScript: request `Create<Recurso>RequestDto`/`Update<Recurso>RequestDto`; response `<Recurso>ResponseDto`/`<Recurso>ListResponseDto`; IA `<Feature>InputDto`/`<Feature>OutputDto`/`AIRecommendationResponseDto` (`docs/16 §9.5`).

### 8.8 Transacciones

- La **Application layer** es dueña del límite de transacción. Solicita un `tx` al port **`TransactionManager`**, implementado por `PrismaTransactionManager` (Infrastructure) que envuelve `prisma.$transaction`. Los repositorios **PUEDEN** aceptar un `tx` opcional.
- Todo flujo con **>1 operación de DB** que requiera consistencia atómica se delega al use case que coordina la transacción.
- Casos que **DEBEN** ir en `$transaction` (`docs/14 §19`): `RegisterUserUseCase`, `CreateEventUseCase` (Event+Budget), `ConfirmAIGeneratedTasksUseCase`, `CreateQuoteRequestUseCase`, `RespondToQuoteRequestUseCase`, `RejectQuoteUseCase`, `CreateBookingIntentUseCase`, `ConfirmBookingIntentUseCase`, `CreateReviewUseCase`, `HideReviewUseCase`, `ApproveVendorProfileUseCase`, `RejectVendorProfileUseCase`, `AcceptAIRecommendationUseCase`, `ConfirmAIBudgetSuggestionUseCase`, `SeedDemoDataUseCase`/`ResetDemoUseCase`.
- **NO DEBE** abrirse una transacción alrededor de llamadas de red externas (LLM, storage). La llamada a IA ocurre fuera; la materialización tras `apply` va en transacción (§12).
- **Concurrencia:** aislamiento Prisma por defecto `READ COMMITTED`; elevar a **`REPEATABLE READ`** en `CreateQuoteRequestUseCase` y `ConfirmBookingIntentUseCase` (recount, evitar phantom reads). Sin locks pesimistas (`SELECT ... FOR UPDATE`). La violación de un unique parcial (carrera detectada) se traduce a **`409 CONFLICT`**.

### 8.9 Manejo de errores

Jerarquía tipada (`docs/14 §18`): `DomainError` → `ValidationError`(400), `AuthenticationError`(401), `AuthorizationError`(403/404 enmascarado), `NotFoundError`(404), `ConflictError`(409), `BusinessRuleViolationError`(409/422), `RateLimitError`(429). `InfrastructureError` → `AIProviderError`(502), `AITimeoutError`(504), `ExternalIntegrationError`(502), `PrismaPersistenceError`(500). `UnexpectedError`(500). El `errorHandlerMiddleware` mapea a HTTP, loguea stack + contexto interno pero **nunca** los expone; `message` es seguro para el usuario, `code` estable, `correlationId` siempre presente, `details` solo para errores de campo 400/422. Los use cases lanzan; no formatean HTTP.

---

## 9. Convenciones de API

Contrato completo: `docs/16-API-Design-Specification.md`. Aquí van las reglas operativas; **no** se duplica la especificación.

- **Base path:** `/api/v1` (versionado por prefijo de URL, `ADR-API-001`). SEO público: `/api/v1/public/...`. `GET /health` **no** versionado. Cambios aditivos no suben versión; cambios *breaking* → `/api/v2` (pueden coexistir).
- **Recursos:** sustantivos, **plural**, **kebab-case** (`/events`, `/quote-requests`, `/booking-intents`, `/service-categories`). Acciones no-CRUD como sub-recurso verbo: `POST /quotes/:quoteId/accept`, `POST /booking-intents/:bookingIntentId/confirm`, `POST /ai-recommendations/:id/apply`. Anidamiento máximo **2 niveles**.
- **Parámetros:** IDs de path = **UUID v4**; slugs públicos en `/public/vendors/:vendorSlug`. Query params **camelCase**; body keys **camelCase**; enums en canonical string.
- **Paginación:** *page-based* `?page=1&pageSize=20`; defaults `page=1`, `pageSize=20`; **máx `pageSize=100`**. La respuesta lista incluye `pagination { page, pageSize, totalItems, totalPages }`.
- **Filtrado / ordenamiento / búsqueda:** filtros por equality/range/boolean declarados por endpoint mediante **allowlist** (`docs/19` regla 7); `?sort=field:asc|desc` (multi permitido; default por endpoint, típicamente `createdAt:desc`, Events `eventDate:asc`); búsqueda `?q=texto` case-insensitive. **Field selection no soportado en MVP.**
- **Fechas:** ISO 8601 UTC (`2026-07-01T00:00:00.000Z`); date-only `YYYY-MM-DD`.
- **Dinero:** decimales como **string** de dos decimales (`"total_planned": "12500.00"`).
- **Status codes (DEBE):** `200` GET/PATCH/acción; `201` POST que crea (con header `Location`); `204` DELETE/logout/mark-as-read; `400` malformado; `401` sin sesión; `403` rol/owner; `404` no encontrado/no accesible; `409` conflicto; `410` Gone (Quote expirada al aceptar); `413` payload demasiado grande; `415` media type no soportado; `422` válido en Zod pero inválido semánticamente / violación BR; `429` rate limit; `500`; `503` LLM no disponible; `504` timeout de IA (opcional).
- **Envelope de éxito (verbatim, `docs/16 §13`):**
  ```json
  { "data": { "id": "..." },
    "meta": { "correlationId": "req_3f9a...", "timestamp": "2026-06-08T18:30:00.000Z" } }
  ```
  Lista paginada: agrega `"pagination": { "page", "pageSize", "totalItems", "totalPages" }`. Toda respuesta de IA agrega `"aiMeta": { "provider", "promptVersion", "latencyMs", "fallbackUsed", "languageCode", "recommendationId" }`. `204` sin body pero con `X-Correlation-Id`.
- **Envelope de error (verbatim, `docs/16 §14.1`):**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ { "field": "eventDate", "message": "…" } ] },
    "meta": { "correlationId": "req_3f9a...", "timestamp": "…" } }
  ```
  `details` obligatorio para `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION`. **Nunca** stack traces, nombres de archivo internos, IDs/keys de proveedor LLM. `correlationId` va en `meta` (contrato canónico `docs/16`; ver §22.1).
- **Códigos de error:** catálogo cerrado en `docs/16 §14.2` (`VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_VIOLATION`, `CURRENCY_IMMUTABLE`, `MAX_QUOTE_REQUESTS_EXCEEDED`, `DUPLICATE_REVIEW`, `QUOTE_EXPIRED`, `RATE_LIMIT_EXCEEDED`, `AI_PROVIDER_TIMEOUT`, `AI_PROVIDER_UNAVAILABLE`, `AI_INVALID_OUTPUT`, `INTERNAL_ERROR`, …). Usar los del catálogo; no inventar códigos.
- **Correlation ID:** header `X-Correlation-Id` (request/response); si falta en el request, el backend genera UUID v4 con prefijo `req_`. Propagado a logs, `meta.correlationId`, errores y llamadas LLM.
- **Headers:** `Accept: application/json`; `Content-Type` JSON o `multipart/form-data`; `Accept-Language` (`es-LATAM` default / `es-ES` / `pt` / `en`); `Cookie` de sesión; respuesta `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` (tras 429).
- **Autenticación:** cookie de sesión firmada HTTP-only (§13). **Autorización:** RBAC + ownership + assignment en backend; el frontend es solo UX (§13).
- **Rate limits:** ver §13.
- **Uploads:** `multipart/form-data` solo en `/attachments` y portfolio; JSON body ≤ **1 MB**; archivo ≤ **5 MB**; allowlist MIME (§13).
- **DTOs:** **NO DEBE** exponerse entidades de dominio ni Prisma models; solo DTOs por caso de uso, convertibles a JSON Schema (OpenAPI 3.1). Requests validados con Zod `.strict()`. `isSeed` se expone en DTOs donde aplique.
- **Compatibilidad:** cambios *backward-compatible* (nuevos campos opcionales, nuevos endpoints) no rompen contrato; cambios *breaking* van a `/api/v2`.
- **Estilo REST:** REST clásico (GET/POST/PATCH/PUT/DELETE). **Sin** HATEOAS, JSON:API, GraphQL/gRPC/tRPC/Server Actions/WebSockets.

---

## 10. Convenciones de frontend

Diseño completo: `docs/15-Frontend-Architecture-Design.md`. Stack: **Next.js 14+ App Router** + **TypeScript** + **TanStack Query 5** (server state) + **React Hook Form 7 + Zod** (forms) + **next-intl 3** (i18n) + **Tailwind + design tokens** + **MSW 2** (mocks) (`ADR-FE-001/002`).

**Prohibido (DEBE evitarse):** Server Actions como API principal, Route Handlers de Next como BFF no aprobado, Redux/Zustand, GraphQL/Apollo, llamadas directas a OpenAI/Anthropic desde el cliente, tokens en `localStorage`/`sessionStorage`. Toda dependencia adicional requiere ADR. El frontend es *renderer + router*, **nunca** un BFF.

### 10.1 Organización App Router

- Route groups con layout/middleware independientes: `(public)`, `(auth)`, `(app)`, `(admin)`.
- `app/layout.tsx` (RootLayout) instala providers globales: `QueryClientProvider`, `IntlProvider`, `SessionProvider`, `ThemeProvider`, `ToastProvider`, `ErrorBoundary` raíz.
- Por segmento: `loading.tsx` (skeletons en segmentos críticos), `error.tsx` (por segmento, botón reset + log con `correlationId`), `not-found.tsx` (i18n). `app/sitemap.ts`, `app/robots.ts`, `app/middleware.ts` (auth presencia + locale).
- Sin *parallel/intercepting routes* ni catch-all `[...slug]` en MVP.

### 10.2 Estructura feature-first

- Top-level: `app/`, `features/`, `shared/`, `tests/`, `public/`, `messages/`.
- Cada feature: `api/` (`<feature>Api.ts` + `<feature>Api.types.ts` DTOs), `components/`, `hooks/` (queries+mutations), `schemas/` (Zod), `mappers/` (DTO↔model), `types/` (modelo frontend), `pages/` (componentes de composición usados por `app/.../page.tsx`), `index.ts` (API pública).
- `shared/`: `api-client/` (`httpClient`), `design-system/`, `design-tokens/`, `hooks/`, `i18n/`, `lib/` (`env.ts`, date, currency, slug, tipos compartidos), `observability/`, `providers/`, `auth-session/`, `authorization/`, `error-handling/`.
- **Reglas (DEBE):** sin imports profundos entre features (solo vía `index.ts`); sin tipos duplicados (compartidos en `shared/lib/types`); un API client por feature que delega en `shared/api-client/httpClient`; **mappers obligatorios** (ningún componente consume DTO crudo).

### 10.3 Server vs Client Components

- **Server Components por defecto**, especialmente en `(public)` (SEO/metadata).
- `'use client'` solo en el componente más cercano que lo necesita; **NO DEBE** marcarse un layout completo. TanStack Query, RHF y Context viven en Client Components.
- Props que cruzan la frontera deben ser serializables; APIs de navegador solo en cliente; **sin secretos** en el bundle de cliente.
- `(public)` obtiene datos en Server Component vía `fetch` con `revalidate` (ISR). `(app)`/`(admin)` obtienen vía TanStack Query (cliente autenticado).

### 10.4 Acceso a datos

- REST client base en `shared/api-client/httpClient.ts`: `fetch` con interceptores para cookie de sesión, `Accept-Language`, `X-Correlation-Id` (UUID v4 por request), parseo de error estandarizado (`ApiError { code, message, details, correlationId }`). Config vía `NEXT_PUBLIC_API_BASE_URL`.
- Un client por feature; toda función devuelve **modelos frontend** (no DTOs). Retries se configuran en **TanStack Query**, no en `httpClient`; `401/403/422` **NO DEBEN** reintentarse. Timeouts 10s (30s para IA).
- Flujo `DTO → mapper → modelo frontend → UI`. DTOs en `api/<feature>Api.types.ts` (snake_case, fechas ISO string); modelos en `types/` (camelCase, `Date`, `Money`, campos derivados). Mappers = funciones puras.
- **TanStack Query:** query keys jerárquicas y estables (`['events']`, `['events', eventId]`, `['events', eventId, 'tasks']`); `staleTime` 30s listas / 60s detalle / 0 crítico; invalidación explícita por mutación; `setQueryData` tras create para evitar refetch; **optimistic updates solo en operaciones de bajo riesgo** con rollback claro (toggle task, marcar notificación leída). Sin websockets; notificaciones por polling ~30s.
- **NO DEBE** duplicarse lógica de `fetch` ad-hoc en componentes; **NO DEBE** tomarse decisiones de autorización de negocio en la UI.

### 10.5 Formularios

- **React Hook Form + Zod** (`@hookform/resolvers/zod`). Un schema por form; tipos inferidos con `z.infer`; mensajes de error Zod referencian **claves i18n** (no strings hardcodeados).
- Errores `422` del backend se mapean por campo vía `setError`. Labels asociados, `aria-invalid`, `aria-describedby`; estado de submit visible; prevención de doble submit. En wizards, validación incremental por paso con `trigger(fields)`.

### 10.6 Clasificación de estado

| Tipo | Mecanismo |
|---|---|
| Server state | TanStack Query |
| Form state | React Hook Form + Zod |
| URL state | query params (`?status=draft&page=2`) |
| Local UI state | `useState`/`useReducer` + Context |
| Session state | `SessionContext` global (hidratado en boot vía `GET /me`, inmutable por sesión) |

**NO DEBE** introducirse estado global (Redux/Zustand) por defecto.

### 10.7 Componentes

- `PascalCase` (`EventCard`, `EventCreateWizard`, `AIPanel`); hooks `useXxx`; componentes de página con sufijo `Page` (`EventsListPage`).
- Componentes presentacionales puros y testeables aislados. **Toda vista relevante DEBE implementar 4 estados:** loading (skeleton específico), empty (`EmptyState`), error (`ErrorState` con código + retry), success.
- Componentes base en `shared/design-system/` (Button, Input, Modal/Dialog sobre Radix con focus trap, Toast, Money, AIPanel, etc.).

### 10.8 Design tokens y Tailwind

- Tokens en `tailwind.config.ts` (colores `brand.*`, `surface`, `text`, `success/warning/danger/info`, `ai-accent` exclusivo para sugerencias de IA; tipografía, spacing base-4, radii, shadows, z-index semántico).
- **DEBE** usarse tokens; **NO DEBERÍAN** usarse valores arbitrarios de Tailwind cuando exista un token.
- Mobile-first: estilos base móviles, ajustar con `md:`/`lg:`. Sidebars → drawer `<md`; tablas grandes → cards `<md`; touch targets ≥ 44×44px. MVP solo tema claro.

### 10.9 Accesibilidad

**WCAG 2.1 AA como mínimo** (`docs/15 §34`; NFR base *Should Have* `docs/10 §14`). Semántica HTML; navegación completa por teclado (Tab/Shift+Tab/Enter/Esc/flechas); foco visible; labels y `aria-*` en forms; componentes complejos sobre Radix/Headless UI; `alt` en imágenes (`alt=""` decorativas); focus trap + restauración en modales; `aria-live="polite"` para feedback de IA y notificaciones; **contraste ≥ 4.5:1** texto normal (3:1 grande); soporte `prefers-reduced-motion`. Chequeos automáticos (`axe-core`/`jest-axe`/`@axe-core/playwright`) **y** revisión manual.

### 10.10 i18n y moneda

- **next-intl.** Catálogos JSON en `messages/`: `es-LATAM.json`, `es-ES.json`, `pt.json`, `en.json`. Locales soportados: `es-LATAM` (default/fallback), `es-ES`, `pt`, `en`.
- **Strings hardcodeados de cara al usuario: PROHIBIDOS** (regla de lint). Claves jerárquicas (`events.create.title`, `errors.validation.required`). Plurales vía ICU; fechas/números vía `Intl.*` locale-aware.
- Detección MVP por cookie `eventflow_locale` + `Accept-Language`; **sin** prefijo `/[locale]/` en la URL en MVP.
- El frontend envía el `locale` activo en las requests de IA; el backend genera en ese idioma o degrada a `es-LATAM`.
- **Moneda:** la moneda del evento se fija en creación y es **inmutable**; **sin conversión automática** nunca. Todo monto del evento se muestra en su moneda vía el componente único `<Money>` (`Intl.NumberFormat`), sin lógica de conversión. Comparaciones multi-moneda se muestran explícitas, sin convertir. Conjunto canónico de monedas: **GTQ, EUR, MXN, COP, USD** (autoridad `docs/18`/`docs/10`; ver §22.1).

### 10.11 SEO y páginas públicas

- Slugs provistos por backend (`vendor.slug`, `portfolioItem.slug`), estables. `generateMetadata` por página dinámica; `sitemap.ts` consulta solo vendors aprobados; `robots.ts` permite `(public)`, bloquea `(app)`/`(admin)`.
- Fuente de datos pública: `GET /api/v1/public/vendors/:slug` con allowlist de campos. **NUNCA** exponer emails de organizadores, contenido de quote-requests, montos de cotización, comentarios internos ni datos personales. Reseñas públicas agregadas/anonimizadas según `Review.is_public`.
- Renderizado: landing SSG; directorio server + filtros cliente; perfil de vendor ISR; áreas autenticadas client-rendered con layout server.
- **Human-in-the-loop de IA en UI:** estados idle→loading→result→review→accepted|edited|regenerated|discarded; badge "Sugerencia IA" hasta confirmar; hasta el endpoint `apply`, la sugerencia **NO** se materializa como dato oficial. El frontend **nunca** llama a un LLM directamente; `fallback_used=true` muestra banner.

### 10.12 Env vars y seguridad de frontend

- Solo `NEXT_PUBLIC_*` no sensibles (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_BASE_URL`, `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_SUPPORTED_LOCALES`, `NEXT_PUBLIC_AI_ENABLED`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`). **Sin secretos** en `NEXT_PUBLIC_*`. Validar env en arranque con `shared/lib/env.ts` (Zod). `.env.local.example` versionado.
- Sin tokens en `localStorage`; CSP estricta; sin `dangerouslySetInnerHTML` salvo con DOMPurify; `rel="noopener noreferrer"` en `target="_blank"`; validación anti open-redirect.

---

## 11. Convenciones de base de datos y Prisma

Diseño físico canónico: `docs/18-Database-Physical-Design.md`. Seed: `docs/11-Data-Seed-Strategy.md`. **PostgreSQL 15+** (16 preferible), **Prisma 5.x**; esquema único `public`; todo acceso vía Prisma en Infrastructure (`ADR-DB-001`).

### 11.1 Naming (mapeos)

| Objeto | Convención | Ejemplo |
|---|---|---|
| Tabla | `snake_case`, plural, `@@map` | `events`, `vendor_profiles`, `ai_recommendations` |
| Modelo Prisma | `PascalCase`, singular | `Event`, `VendorProfile`, `AIRecommendation` |
| Columna | `snake_case` | `event_date`, `currency_code`, `is_seed` |
| Campo Prisma | `camelCase` con `@map` | `eventDate @map("event_date")` |
| Enum PostgreSQL | `snake_case`, singular | `event_status`, `quote_status`, `llm_provider` |
| Enum Prisma | `PascalCase` | `EventStatus`, `QuoteStatus`, `LLMProvider` |
| Valor de enum | `snake_case` | `confirmed_intent`, `email_simulated` |
| FK | `<entidad>_id` | `event_id`, `vendor_profile_id` |
| Índice | `idx_<tabla>_<columnas>[_partial]` | `idx_events_owner_id_status` |
| Unique | `uq_<tabla>_<columnas>` | `uq_users_email_lower` |
| Check | `chk_<tabla>_<descripcion>` | `chk_reviews_rating_range` |
| FK constraint | `fk_<tabla>_<columna>` | `fk_events_owner_id` |
| Migración | `YYYYMMDDHHMMSS_<descripcion_kebab>` | `20260615120000_add_ai_recommendations_validated_payload` |

### 11.2 Tipos y columnas

- **IDs:** `uuid` (UUID v4) como PK de todas las tablas operativas (`String @id @default(uuid())`). **Nunca** `serial`/`bigserial`. Excepción: catálogos enum con PK `code` string (p. ej. `event_types.code`).
- **Timestamps:** **`timestamptz` (UTC) siempre** (`DateTime @db.Timestamptz(6)`); nunca `timestamp` sin zona. `created_at DEFAULT now()`, `updated_at` con `@updatedAt`, `deleted_at` NULL para soft delete.
- **Dinero:** `numeric(14,2)` → `Decimal @db.Decimal(14,2)`. **Nunca** `money` ni `float`. Promedios de rating `numeric(3,2)`.
- **Texto:** `text` por defecto; `varchar(n)` con CHECK solo cuando se necesita cap (slugs `varchar(64)`).
- **Email:** `text` + índice unique funcional sobre `LOWER(email)` (case-insensitive).
- **Fechas sin hora:** `date` (`event_date`, `due_date`, `valid_until`).
- **JSONB:** `jsonb` → `Json @db.JsonB`, validado con Zod en aplicación (§11.5).
- **Booleans:** prefijos `is_*`, `has_*`, `requires_*`, `auto_*`, `ai_*`, `*_used`.

### 11.3 Enums, nulabilidad, ownership

- Enums nativos de PostgreSQL declarados como `enum` de Prisma. **`currency_code`** y **`language_code`** se modelan como **enum**, no como tabla; `Location` sí es tabla.
- **Disciplina de cambio de enum:** agregar valor → `ALTER TYPE <enum> ADD VALUE 'x'` en SQL raw dentro de una migración Prisma; renombrar/eliminar valor → crear enum nuevo, migrar datos, swap, drop (raro, requiere ADR). PostgreSQL no permite eliminar/renombrar valores in-place.
- Toda tabla-recurso lleva FK de owner (`events.owner_id`, `vendor_profiles.user_id`, `attachments.uploaded_by`, `ai_recommendations.requested_by_user_id`). La autorización se aplica **antes** de cualquier query (§13).
- Columnas de auditoría por fila `*_by`/`*_at` (`approved_by/at`, `moderated_by/at`, `deleted_by`) referencian `users.id` sin cascada destructiva.

### 11.4 Integridad, FKs, índices, constraints

- **FKs explícitas** con `@relation`. `onDelete: Restrict` es el **default**. `Cascade` solo para composición pura (`budgets → budget_items`, `events → event_tasks`, `budgets(event_id)`, `vendor_services(vendor_profile_id)`). `SET NULL` acotado a links opcionales de IA (`ai_recommendation_id`). FKs a tablas soft-delete usan `RESTRICT`. `ai_recommendations.prompt_version_id` → `RESTRICT` (NOT NULL, trazabilidad).
- **Índices *query-driven*** (derivados de `docs/16` y casos de uso): toda lista paginada obtiene índice compuesto `(filtro, created_at DESC)` o `(filtro, status, sort_key)`. **Índices parciales obligatorios** donde una regla depende de estado (soft delete, active). Índice parcial `is_seed` (`WHERE is_seed=true`) en todas las tablas operativas. GIN/GiST **fuera de alcance del MVP**.
- **Unique constraints:** fuertes en Prisma (`@@unique([eventId, vendorProfileId])`); **parciales** no expresables en Prisma → SQL raw tras la migración (p. ej. `uq_quote_requests_event_vendor_active`, `uq_quotes_request_active`, `uq_booking_intents_event_category_confirmed`, `uq_prompt_versions_active`).
- **Check constraints** como SQL raw en la migración: `chk_reviews_rating_range (rating BETWEEN 1 AND 5)`, `chk_service_categories_depth (depth_level BETWEEN 1 AND 2)`, `is_simulated = true` en `booking_intents`, `chk_ai_recommendations_retry_max (retry_count BETWEEN 0 AND 1)`, montos no negativos, etc.

### 11.5 JSONB (restricciones)

- Permitido **solo** en: `ai_recommendations` (`input_payload`, `output_payload`, `validated_output_payload`), `quote_requests.brief`, `quotes.breakdown`, `notifications.payload`, `admin_actions.metadata`, campos i18n de `event_types`/`service_categories`.
- Reglas duras: (1) **nunca** reemplaza columnas filtrables (si se filtra/ordena/autoriza por un dato, va a columna explícita); (2) **nunca** persiste secretos; (3) cada JSONB tiene su Zod schema en servicio; (4) **sin** índices GIN en MVP. `attachments` usa columnas explícitas, no JSONB.

### 11.6 Soft delete y auditoría

- **Soft delete obligatorio solo en:** `reviews`, `attachments`, `service_categories`, `event_types`, `vendor_profiles`, `vendor_services`, `locations` (vía `status`/`is_active`/`deleted_at`). Cada tabla soft-delete tiene índice parcial por su filtro de visibilidad; las queries públicas filtran por estado visible.
- **Delete físico prohibido en operación normal**; solo para datos de seed (`DELETE WHERE is_seed=true`) o migración correctiva con ADR.
- **NO** soft delete en: `users` (`status='suspended'`), `events` (`status='cancelled'`), `quote_requests`/`quotes`/`booking_intents` (estados terminales), `notifications`, `admin_actions` (append-only), `ai_recommendations` (estados `discarded`/`expired`).
- **`admin_actions`**: append-only, sin UPDATE/DELETE en operación normal; cada acción admin escribe un registro en la misma transacción (§13).
- **`is_seed boolean NOT NULL DEFAULT false`** en **todas** las tablas operativas; no altera reglas de negocio.

### 11.7 Migraciones y datos

- Formato `YYYYMMDDHHMMSS_<kebab>`; baseline `20260601000000_init`. **Forward-only en producción**; sin rollback automático — se corrige con migración forward. `prisma migrate reset` (destructivo) **solo** en desarrollo.
- **Columna NOT NULL nueva → 3 pasos:** (1) nullable + default, (2) backfill scripteado, (3) `SET NOT NULL`.
- **Cambios destructivos:** eliminar columna requiere deploy previo del backend que ya no la referencia; renombrar tabla/columna es multi-paso.
- **SQL raw** permitido solo para: unique parciales, check, índices funcionales (`LOWER(email)`), cambios de enum, backfills; documentado inline con `-- Raw SQL: <motivo>`. **`$queryRawUnsafe` está PROHIBIDO**; `$queryRaw` solo bajo enmienda de ADR con *tagged template* parametrizado (`ADR-DB-005`, `ADR-SEC-001`).
- **Prisma Client** es generado: no versionar; no filtrar fuera de infraestructura.
- **N+1:** usar `select`/`include` acotados; evitar consultas en loop. Paginación *page-based* (§9).

### 11.8 Invariantes por capa (dónde se hace cumplir cada regla)

- **PostgreSQL:** unicidad (incl. parciales), rating 1–5, profundidad de categoría ≤2, `is_simulated=true`, `category_change_count<=5`, montos no negativos, integridad referencial, `timeout_ms>0`.
- **Prisma schema:** mapeos, enums, `@relation`/`onDelete`, `@updatedAt`, `@@unique`/`@@index` fuertes.
- **Application/servicio:** reglas dependientes de estado, inmutabilidad de moneda, límite de 5 quote-requests activos por categoría, límite de 10 imágenes por portfolio, jerarquía de 2 niveles, `valid_until` default 15 días, validación Zod de todo JSONB.
- **Autorización:** ownership antes de cualquier query; mutaciones solo admin donde aplique; queries públicas filtran a estado visible.

### 11.9 Seeds (resumen operativo; detalle en §16.I)

- **Deterministas e idempotentes:** mismos UUIDs y valores en cada corrida; sin `now()` ni random no sembrado. Todo registro con `is_seed=true`. Reset = `DELETE WHERE is_seed=true` en orden inverso de dependencia FK. Sin PII real (emails `@eventflow.demo`, teléfonos/direcciones placeholder). El seed **DEBE** respetar todas las reglas de negocio. `MockAIProvider` determinista por `(feature, event_type_code, language_code)`.

---

## 12. Convenciones de integración de IA

Diseño: `docs/17-AI-Architecture-and-PromptOps-Design.md`. Toda la IA vive en el módulo `ai-assistance`, único que conoce el proveedor activo.

- **`LLMProvider` (port)** en `modules/ai-assistance/application/ports/llm.provider.port.ts` (`ADR-AI-001`). Un método **tipado por feature** (no un `invoke` genérico): `generateEventPlan`, `generateChecklist`, `generateBudgetSuggestion`, `recommendVendorCategories`, `generateQuoteBrief`, `compareQuotes`, `generateVendorBio`, `prioritizeTasks`. Cada uno devuelve `Promise<AIResult<TOutput>>`. `AIContext` lleva `language`, `currency?`, `userId`, `eventId?`, `vendorProfileId?`, `promptVersionId`, `correlationId`, `timeoutMs` (default `60000`), `preferMock?`.
- **Adapters (Infrastructure, `infrastructure/llm/`):** `OpenAIProvider` (primario MVP; requiere `response_format` JSON schema; aplica `timeoutMs`; traduce errores de transporte a errores tipados; **no** hace fallback propio), `MockAIProvider` (obligatorio, determinista, para tests/demo/fallback), `AnthropicProvider` (**stub no funcional**: lanza `AIProviderNotConfiguredError`). Los SDKs `openai`/`@anthropic-ai/sdk` se importan **solo** en `infrastructure/providers/*`; importarlos en `application/`/`domain/` **rompe la revisión** (regla de lint).
- **Selección estática** por env `LLM_PROVIDER=openai|mock|anthropic`; sin selector en UI, sin failover en runtime, sin failover automático OpenAI→Anthropic.
- **Prompt registry estático en código** (versionado en TypeScript), no servicio dinámico. IDs estables `PROMPT-<FEATURE>-V<N>` (p. ej. `PROMPT-CHECKLIST-V1`), inmutables una vez publicados. **Versionado:** una única dimensión incremental `V1, V2…`; nueva versión requerida cuando cambia el schema de salida, las reglas de negocio del prompt, las restricciones de seguridad o el set de idiomas. Exactamente **una** versión `active` por `(featureType, languageCode)`.
- **Schemas Zod** de input/output en `infrastructure/output-validators/`; los DTOs se infieren con `z.infer`. Input validado en el use case **antes** del proveedor; output validado **después** y **antes** de persistir.
- **Salida del modelo = entrada no confiable (DEBE):** validación Zod estricta; salida inválida → **un** retry con la misma versión de prompt; segundo fallo → `422 AI_INVALID_OUTPUT` y se persiste `AIRecommendation` con `status='failed'`. La salida **nunca** se ejecuta como código/SQL/template; sin ejecución de tools; sin side-effects hasta el `apply` humano. Validación de reglas de dominio post-schema (p. ej. suma de items ≈ presupuesto ±5%, `currency === Event.currency_code`).
- **Timeout y fallback:** timeout fijo **60 000 ms** (`AI_TIMEOUT_MS`). Máx **1** retry, solo ante `AIInvalidOutputError`; nunca ante timeout o 5xx. Fallback a `MockAIProvider` **solo** con `AI_DEMO_MODE=true` o `AI_USE_MOCK_FALLBACK=true`, marcando `fallback_used=true`. En prod-académica: timeout → `503`, inválido tras retry → `422`; **sin** fallback silencioso.
- **Human-in-the-loop (DEBE):** toda salida se persiste como `AIRecommendation` con `status='pending'` por defecto; nada se materializa en `EventTask`/`BudgetItem`/`QuoteRequest.brief`/`VendorProfile.bio` hasta `apply` explícito. Estados: `pending` (único no terminal) → `accepted | rejected | discarded | failed | expired`. `apply` **no** llama al LLM; opera sobre el `AIRecommendation` ya persistido, valida ownership y `status='pending'` (idempotente: ya procesado → `409`/`422 AI_RECOMMENDATION_NOT_PENDING`), materializa en transacción con la identidad del usuario que acepta. Las ediciones del usuario **nunca** sobrescriben `output_payload` (lo que dijo el modelo): se guardan en `validated_output_payload` con `edited=true`.
- **Orden de autorización antes de llamar al LLM (DEBE):** `authMiddleware` → `roleMiddleware` → `ownershipMiddleware` → permiso de feature (estado del recurso lo permite) → `validateBody` (Zod) → recién entonces el use case llama al `LLMProvider`.
- **Mitigación de prompt injection:** contenido de usuario delimitado en `<user_content>…</user_content>` tratado como **datos, no instrucciones**; instrucción de sistema que ordena ignorar instrucciones dentro de `<user_content>`; `PromptBuilder` con blacklist que sanea secuencias sospechosas; validación de schema de salida.
- **Minimización y redacción:** solo viajan al LLM los campos mínimos por feature (tipo de evento, fecha, nº de invitados, presupuesto agregado; para bio: nombre comercial, categorías, ciudad). **PROHIBIDO** en prompts: contraseñas/hashes, tokens/JWT/cookies, API keys, datos de pago, documentos de identidad, direcciones completas, emails/teléfonos personales, notas internas, contenido legal sensible.
- **Secretos:** `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` solo como env vars de backend; **nunca** al frontend ni en prompts/logs. `.env.example` con placeholders.
- **Correlation IDs:** `AIContext.correlationId` propagado y persistido en `AIRecommendation.correlation_id` (indexado).
- **Logging sin fuga de payload:** logs estructurados de eventos `ai.request.started/success/failed`, `ai.fallback_used`, `ai.recommendation.accepted/discarded`. **No** loguear `input_payload`/`output_payload` por defecto; `AI_LOG_PAYLOADS=false` default y **prohibido** en demo/prod-académica (el bootstrap se niega a arrancar si es `true`). Nunca loguear keys/tokens. `aiMeta` expone solo metadata no sensible.
- **Acciones de IA PROHIBIDAS (NO DEBE):** decisión autónoma / agente autónomo; chatbot conversacional libre; aprobación autónoma de proveedores; moderación/sentimiento automático de reseñas; generación de contratos; procesamiento de pagos; creación de `BookingIntent`; asesoría legal; generación de imágenes; IA por WhatsApp/voz; llamadas frontend→LLM; RAG/embeddings; inventar "precios de mercado" (los precios vienen siempre de `Quote`).
- **Gobernanza:** cambiar el port, la estrategia de fallback, la lista de proveedores, el timeout o la forma de `AIRecommendation` requiere **ADR**; cambiar el alcance de IA, los datos enviados al LLM o los idiomas requiere **decisión de PO**.

---

## 13. Convenciones de seguridad

Diseño: `docs/19-Security-and-Authorization-Design.md`. Principio rector: **el backend es la única fuente de verdad de autorización; los guards de frontend son solo UX** (`ADR-SEC-003`, `ADR-FE-003`).

- **Autenticación:** email + contraseña. Registro público solo `organizer` y `vendor`; `admin` **solo** por seed/config, nunca por endpoint público. Login case-insensitive por email. Fallo de login → mensaje **genérico** (no distinguir email inexistente de contraseña incorrecta).
- **Sesión — cookie firmada HTTP-only (DEBE):** nombre `eventflow.sid`; `HttpOnly=true`; `Secure=true` (staging/prod); `SameSite=Lax` por defecto; `Path=/`; expiración 24h; firmada con `SESSION_SECRET` (≥32 bytes); payload mínimo `{ sub, role, jti, iat, exp }`. **Cross-site (Amplify ↔ App Runner):** cuando frontend y backend están en sitios distintos se usa `SameSite=None; Secure` **y** se activa protección CSRF double-submit (§13 CSRF; `ADR-SEC-002/006`). **NO DEBE** almacenarse ningún token en `localStorage`/`sessionStorage` ni exponerse como `Authorization: Bearer`.
- **Autorización — 4 capas secuenciales:** RBAC → Ownership → Assignment-based → Admin-scoped (con auditoría). Roles: `anonymous`, `organizer`, `vendor`, `admin` (+ `system` para jobs). **Fail closed:** ante duda, `403`. `ownershipMiddleware` devuelve **`404`** (no `403`) para recurso de otro usuario (oculta existencia). `admin` no actúa como organizer/vendor en flujos comerciales.
- **Auditoría admin:** cada acción admin que cambia estado inserta un `AdminAction` **en la misma transacción**; `AdminAction` es append-only.
- **Validación Zod en frontera** con `.strict()` (body/params/query); campos desconocidos → `400`. Nunca devolver entidades crudas (DTOs omiten `password_hash`, `is_seed` interno). La validación Zod del frontend es **paridad**, nunca sustituto de la del backend.
- **Límites de payload:** JSON ≤ **1 MB** → `413`; multipart solo en `/attachments` ≤ **5 MB**.
- **CORS:** allowlist explícita por entorno vía `CORS_ALLOWED_ORIGINS` (sin `*` con credenciales); `credentials: true`; métodos `GET, POST, PATCH, DELETE, OPTIONS`; headers `Content-Type, X-Correlation-Id`.
- **CSRF:** primario `SameSite=Lax` + validación de `Origin`/`Referer` contra el allowlist en endpoints mutantes → `403` si no coincide. Double-submit token obligatorio si se adopta `SameSite=None`.
- **Rate limiting (429 con `Retry-After`):** `/auth/register` 5/IP/10min; `/auth/login` 10/IP/10min; `/auth/password/reset-request` 3/email/hora; `/me/change-password` 5/user/hora; `/ai/*` 20/user/hora; `/attachments` POST 30/user/hora; `/quote-requests` POST 30/user/día.
- **Captcha** (hCaptcha o reCAPTCHA v3) verificado en servidor en **register, login, reset-request**; stub `'__test__'` en dev/test.
- **Password hashing:** **`argon2id`** recomendado (`memoryCost=19MiB`, `timeCost=2`, `parallelism=1`); alternativa aceptable **`bcrypt` rounds=12** (`ADR-SEC-003`). Política: mínimo 10 chars, al menos una letra y un número, distinto del localpart del email; sin expiración periódica; cambio vía `/me/change-password` con contraseña actual.
- **Reset de contraseña:** reset-request siempre responde genérico (anti-enumeración); token ≥32 bytes, TTL 15 min, single-use; solo se persiste el **hash** del token; entrega por "email simulado" (log estructurado). *(El código de estado de reset-request se rige por el contrato REST `docs/16` = `202`; ver §22.1.)*
- **Secretos:** solo en `.env` de backend / Secrets Manager (`OPENAI_API_KEY`, `SESSION_SECRET`, `DATABASE_URL`, `RECAPTCHA_SECRET_KEY`). Nunca en `NEXT_PUBLIC_*`, logs de boot (solo `NODE_ENV`, `PORT`, `LOG_LEVEL`) ni JSON de DB. `DATABASE_URL` con usuario de mínimos privilegios.
- **Security headers (helmet):** HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictivo, CSP básica.
- **Redacción de logs:** JSON estructurado con `correlation_id`, `user_id`, `route`, `method`, `status`, `duration_ms`; **nunca** loguear `password`, `password_hash`, `set-cookie`, `authorization`, `captchaToken`, `prompt`, `output` (salvo `AI_LOG_PAYLOADS=true` en local). 5xx loguean stack **solo interno**.
- **File upload:** allowlist MIME `image/png`, `image/jpeg`, `image/webp`, `application/pdf`; extensión consistente con MIME; ≤5 MB → `413`; MIME no permitido → `415`; **rechazar ejecutables siempre**; key de storage = UUID v4 server-side; descarga solo vía `GET /attachments/:id/download` con ownership; soft delete; máx 10 imágenes por portfolio.
- **Errores seguros:** envelope uniforme; nunca stack traces ni IDs de recursos ajenos.
- **Acceso a DB:** solo backend vía Prisma; usuario DB de mínimos privilegios; sin `$queryRawUnsafe` (§11).
- **Dependencias:** buenas prácticas `npm audit`; SCA/SBOM formal fuera de alcance MVP.
- **Frontend nunca es suficiente para autorización.** El frontend **NO DEBE** ejecutar lógica de negocio/autorización, llamar a LLM/DB directamente, ni guardar rol/tokens en el navegador.

---

## 14. Convenciones de testing

Estrategia: `docs/20-Testing-Strategy.md`. Herramientas: **Vitest** (unit + integration, back y front), **Supertest** (API), **Testing Library** (componentes), **MSW 2** (mocks front), **Playwright** (E2E), **`MockAIProvider`** (IA determinista) (`ADR-TEST-001/002/003`).

- **Pirámide:** ~60% unit (<50ms, sin deps), ~30% integration+API (<500ms, DB de test + mock IA), ~10% E2E (segundos, app real + seed).
- **Qué va en cada nivel:**
  - *Unit:* policies de dominio, use cases con repos mockeados, utilidades, schemas Zod, mappers de prompt, componentes puros, hooks aislados.
  - *Integration:* use case + adapter Prisma sobre DB de test; constraints de DB (FK, unique, enum, soft delete); middleware de auth/policy; módulo de IA con `MockAIProvider`.
  - *API (Supertest):* status correctos, validación Zod (200 vs 400), envelope `{ data | error }`, paginación/filtros, `401` anónimo, `403` por rol/ownership/assignment, BR → 409/422.
  - *Contract:* forma de respuesta vía Zod compartido; handlers MSW alineados a la API real.
  - *Frontend (Testing Library):* estados loading/error/empty/success, forms RHF+Zod, estados de TanStack Query, i18n, visibilidad por rol, UI de revisión de IA; aserción de que el front **nunca** llama al LLM.
  - *E2E (Playwright):* auth, flujos críticos organizer/vendor/admin, flujo de IA con `MockAIProvider`, flujo de cotización, smoke de demo.
- **Naming y ubicación (por lado):**
  - *Backend* (`docs/14`): unit `<file>.spec.ts`, integration `<file>.int.spec.ts`; carpetas `backend/tests/{unit,integration,api,fixtures,helpers}` y `tests/{e2e,fixtures}`.
  - *Frontend* (`docs/15`): unit/integration `*.test.ts`, E2E `*.spec.ts`; carpetas `frontend/tests/{unit,integration,e2e,mocks,fixtures}`; handlers MSW en `tests/msw/handlers/`, factories en `tests/factories/`.
  - *(La convención `.spec.ts`/`.test.ts` difiere entre back y front; cada lado sigue la suya — ver §22.1.)*
- **Estructura y trazabilidad:** todo test **DEBE** ser trazable a un `FR`/`BR`/`UC`/`NFR`/`SEC-POL` (referencia en la descripción o metadata) y nombrarse por **intención de negocio**, no por implementación.
- **Datos deterministas:** seed idempotente con UUIDs/valores fijos; sin `now()` ni random no sembrado; sin PII real (`@example.com`/`@eventflow.demo`); `NODE_ENV=test`, `AI_PROVIDER=mock`/`LLM_PROVIDER=mock`.
- **`MockAIProvider` en CI (DEBE):** CI usa **exclusivamente** `MockAIProvider`; **nunca** llamadas reales a proveedor de IA en CI. Tests con proveedor real: solo dev/staging, auto-skip si falta `OPENAI_API_KEY`, aserción de schema/forma nunca texto literal, tag `@manual`/`@real-provider`.
- **Aislamiento de DB:** DB efímera por suite (schema temporal o contenedor desechable); aislar por transacción cuando sea posible; limpieza automática al final.
- **Matriz de autorización (positiva + negativa, DEBE):** cada policy RBAC/ownership/assignment requiere caso positivo **y** negativo (anon→401, rol incorrecto→403, ownership incorrecto→403/404, vendor solo ve asignados, admin endpoints negados a organizer/vendor). Cada ruta nueva de `docs/16` requiere ≥1 test positivo, ≥1 de 401 (si auth) y ≥1 de 403 (si policy).
- **Tests de migración:** `prisma migrate validate`/`diff`; tests de constraints (NOT NULL, CHECK, FK bloqueante, enum, unicidad respetando soft delete, `is_seed` preservado, moneda inmutable, rating 1–5).
- **Seed idempotencia:** N corridas → mismo estado; reset elimina solo `is_seed=true`; validado en CI.
- **Accesibilidad e i18n:** navegación por teclado, focus management, labels/errores enlazados, contraste, headings semánticos; catálogo completo por locale (clave faltante **falla** el smoke i18n); moneda formateada por locale; intento de cambiar moneda del evento → `422`; sin conversión automática.
- **Smoke/demo:** smoke E2E <5min por PR (bloqueante); regresión completa <20min antes de demo/merge a main protegido. Demo readiness es un **gate de calidad** (`PT-09`).
- **Performance:** solo smoke/sanity en endpoints críticos; **sin** load/stress tests en MVP.
- **Cobertura:** mínimo global **60%** (piso NFR 50%); use cases críticos y policies de autorización **80%+**. La cobertura es **señal, no sustituto** de aserciones significativas (90% sin tests negativos de autorización es insuficiente).
- **Flaky:** **cero tolerancia** — se aíslan o eliminan; **prohibido** `.skip`/`xfail` permanente en tests críticos (CI bloquea).
- **Patrones prohibidos:** front llamando al LLM directamente; dependencia real de OpenAI en CI; aserciones de texto literal sobre salida de IA; `now()`/random no sembrado en seed; PII real; secretos de producción en test; respuestas que filtran stack; mutation/chaos testing y QA enterprise (fuera de MVP).

---

## 15. Convenciones de observabilidad

- **Logs estructurados JSON** a stdout (sink = CloudWatch). Sin observabilidad enterprise (tracing distribuido/APM/ELK) en MVP.
- **`correlationId` requerido por request** (más `userId` cuando aplique), devuelto en `meta.correlationId` de las respuestas y propagado a logs, errores y llamadas LLM (§9, §12).
- **Niveles** vía `LOG_LEVEL` (default `info`): `debug|info|warn|error`.
- **Request logs:** method, route, status, latency, correlationId (con redacción por allowlist de campos seguros).
- **DEBE loguearse:** errores/timeouts/JSON inválido/fallback de IA con contexto; fallos de auth/authz/captcha estructurados; **acciones admin** en la tabla `AdminAction`; cambios de estado críticos (quote expirada, evento auto-completado, booking cancelado, attachment soft-deleted). Email simulado como `[EMAIL] to=… subject=…` (`event='email_simulated'`), sin token/contraseña.
- **Redacción (NO DEBE):** nunca loguear contraseñas, hashes, tokens, secretos ni prompts/outputs de IA con PII. `redactPII()`/`redactSecrets()` sobre allowlist; truncar campos >2 KB.
- **Errores operativos vs de dominio:** los errores de dominio esperados (validación, 403, 404) se loguean a nivel `info`/`warn`; los 5xx a `error` con stack **solo interno**.
- **Frontend:** logger en `shared/observability/logger.ts`; eventos clave sin PII (`ai.generate.*`, `quote.*`, `error.boundary.captured`); reporta con el `correlationId` del backend cuando existe. `error.tsx` loguea con `correlationId`.

---

## 16. Convenciones de DevOps y entornos

Diseño: `docs/21-Deployment-and-DevOps-Design.md` (autoridad de comandos y entornos). Nube única **AWS** (`ADR-DEVOPS-001`). **Current:** no existen aún scripts npm, `Dockerfile` ni workflows en el repo; todo lo siguiente es **Target/convención requerida**, no automatización existente.

### 16.A Servicios AWS aprobados

Frontend **AWS Amplify Hosting**; backend **AWS App Runner** (contenedor Docker); registro **Amazon ECR** (privado); DB **Amazon RDS for PostgreSQL** (single-AZ, versión compatible con Prisma); storage **Amazon S3** (buckets privados, acceso solo backend, URLs firmadas); secretos **AWS Secrets Manager** (o SSM Parameter Store); logs **Amazon CloudWatch**; CI/CD **GitHub Actions** (OIDC hacia AWS). **NO** hay Kubernetes/EKS/ECS-cluster, service mesh, multi-región, blue-green/canary, WAF, IaC obligatorio.

### 16.B Clasificación de entornos

**Local | CI | QA/Staging | Demo** (Production-like = futuro). Flujo de promoción: Local → CI (gates) → QA/Staging (merge a `qa`) → Demo (aprobación manual, `main`). IA: `mock` en Local/CI (siempre en CI); `openai` o `mock` en QA; `openai` + fallback a `mock` en Demo.

### 16.C Variables de entorno

- **Naming:** frontend público con prefijo `NEXT_PUBLIC_*` (sin secretos); backend de config sin prefijo; secretos solo en Secrets Manager/SSM.
- **Backend config:** `NODE_ENV`, `APP_ENV` (`qa`/`demo`), `PORT`, `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`, `S3_BUCKET_NAME`, `S3_REGION`.
- **Secretos:** `DATABASE_URL`, `SESSION_SECRET`, `CAPTCHA_SECRET_KEY`/`RECAPTCHA_SECRET_KEY`, `OPENAI_API_KEY`.
- **IA:** `LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_TIMEOUT_MS=60000`, `AI_DEMO_MODE`, `AI_USE_MOCK_FALLBACK`, `AI_LOG_PAYLOADS=false`.
- **Seguridad:** `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `MAX_UPLOAD_SIZE_MB`.
- **`.env.example` (DEBE):** existe en el repo con **todos** los nombres y **sin** valores reales; un gate de CI valida que esté sincronizado. El comportamiento configurable (proveedor de IA, timeout, idioma/moneda default) se lee de env/config versionada, **no** hardcodeado.

### 16.D Secretos

Ningún secreto en el repo, en logs, en la imagen Docker ni en el frontend. Valores reales solo en Secrets Manager/SSM, inyectados por App Runner en runtime. Rotación manual en MVP. Pre-commit con detección de secretos (`gitleaks`) recomendado (`ADR-SEC-005`).

### 16.E Docker

- Base `node:LTS-alpine` (o slim) compatible con Prisma; **multi-stage** (stage 1 build/compilar TS; stage 2 solo artefactos compilados + `node_modules` de producción + Prisma Client). Sin secretos en la imagen; `EXPOSE` del `PORT`. `.dockerignore` incluye `node_modules`, `.git`, `.github`, `.env`, `.env.*`, `*.log`, `coverage`, `dist`, `.husky`.
- *Nota:* el diseño **no** exige explícitamente usuario no-root; ejecutar como no-root es **recomendación** (§22, no afirmarlo como requisito documentado).

### 16.F Health checks

`GET /health` → `200` (público, ligero; usado por App Runner). `GET /readiness` opcional (verifica DB).

### 16.G Comandos (documentados en `docs/21 §26`; **Target** — aún sin `package.json`)

- Setup local: `cp .env.example .env` → `docker compose up -d postgres` → `npm ci` → `npx prisma generate` → `npx prisma migrate dev` → `npm run seed` → `npm run dev`.
- Tests: `npm run lint`, `npm run typecheck` (`tsc --noEmit`), `npm run test`, `npm run test:integration`, `npm run test:e2e`.
- Build: frontend `next build`; backend Docker `docker build -t eventflow-backend:local -f backend/Dockerfile .`.
- **Gestor de paquetes:** los comandos canónicos de CI usan **npm** (`docs/21`). *(El diseño de frontend menciona pnpm como preferencia; se sigue npm en CI/build hasta que un ADR lo cambie — §22.1.)*

### 16.H Migraciones en deploy

Prisma es la única fuente de esquema; migraciones versionadas e idempotentes, aplicadas **antes** de servir tráfico nuevo. Local `prisma migrate dev`; CI valida con `prisma migrate diff`/`--create-only`/`--dry-run` (detecta drift, bloquea); QA/Demo `prisma migrate deploy`. Cambios destructivos requieren plan documentado y snapshot de RDS previo.

### 16.I Seeds en deploy

`prisma/seed.ts` (Node + Prisma), corre con `npm run seed`; registros `is_seed=true`, **idempotente**. Reset vía endpoint admin protegido `POST /api/admin/seed/reset` solo con `APP_ENV ∈ {qa, demo}`, con auth admin + registro `AdminAction`. El seed **se niega a correr con `NODE_ENV=production`** salvo `SEED_ALLOW_PROD=true` (nunca default). CI valida idempotencia con `npm run seed -- --dry-run`.

### 16.J Gates de CI (GitHub Actions)

Workflows: `pr.yml` (solo gates), `main.yml` (gates + build imagen + push ECR + `prisma migrate deploy` + deploy App Runner Demo + trigger Amplify), `staging.yml` (QA), `seed-reset.yml` (manual), `smoke.yml` (post-deploy). **Gates que bloquean:** typecheck FE/BE (`tsc --noEmit`), lint (ESLint), unit (Vitest), integration (Vitest + Postgres efímero), API (Supertest), componentes frontend (Testing Library), E2E smoke (Playwright, requerido en main), validación de migración Prisma, validación de seed (`--dry-run`), build frontend (`next build`), build imagen backend (solo main), validación de `.env.example`. **`npm audit --omit=dev` es solo WARNING**, no bloquea (MVP no exige cero CVEs). Branch protection en `main`; OIDC (sin llaves de larga vida); `cancel-in-progress` en PRs; caché de dependencias.

### 16.K Deploy, rollback y demo

- Pipeline main: gates → build FE + imagen BE → push ECR → `prisma migrate deploy` → deploy App Runner → trigger Amplify → smoke. Fallo de migración → imagen **no** promovida.
- **Rollback (manual):** frontend → revertir build de Amplify; backend → redeploy de imagen previa de ECR; migración fallida → rollback de imagen + restore de snapshot RDS; seed corrupto → `seed-reset.yml`; OpenAI caído → `LLM_PROVIDER=mock` o `AI_USE_MOCK_FALLBACK=true`. Sin rollback automático, blue-green ni canary.
- **Demo:** preferido `LLM_PROVIDER=openai` + `AI_USE_MOCK_FALLBACK=true`; contingencia `LLM_PROVIDER=mock` + `AI_DEMO_MODE=true`; el frontend nunca recibe `OPENAI_API_KEY`; modo mock corre sin keys reales.
- **Presupuestos de performance (NFR, *Should Have*):** REST no-IA P95 <1.5s; IA P95 <8s con skeletons; páginas principales <3s; directorio con filtros <1.5s. Sin llamadas de IA en cargas pasivas.

---

## 17. Convenciones de Git y gestión de cambios

Basadas en la práctica existente del repositorio (historial de commits y ramas).

- **Ramas:** prefijo por tipo de trabajo, kebab/lo existente: `management/<tema>` (documentación/entrega), `feature/<tema>` (implementación), `feature/<US o PB>-<iniciales>`. Asociar la rama al `US-XXX` / `PB-PX-XXX` / task cuando aplique.
- **IDs de trazabilidad:** User Stories `US-XXX`; ítems de backlog `PB-PX-XXX` (P0..P3); tasks `TASK-PB-PX-NNN-US-XXX-<AREA>-NNN` con área ∈ `{BE, API, FE, SEC, QA, OPS, OBS, DOC}`.
- **Commits:** el repo usa **Conventional Commits** con scope (p. ej. `docs(management): …`, `feat(events): …`, `fix(quote-flow): …`); **DEBERÍA** mantenerse ese estilo, referenciando el `US`/`PB`/task en el cuerpo cuando aporte trazabilidad.
- **Commits enfocados:** un cambio coherente por commit; **sin** ruido generado (artefactos de build, `node_modules`, `.env`); **sin** refactors no relacionados.
- **Pull Requests (DEBE incluir):** descripción del cambio, `US`/`PB`/task asociados, evidencia de ejecución (tests/lint/typecheck), notas de migración si aplica, notas de seguridad/autorización si toca esos flujos, y actualización de documentación cuando el comportamiento cambió.
- **Revisión de código:** verificar límites de capa (§8), contrato de API (§9), reglas de DB/migración (§11), seguridad/autorización (§13), tests (§14) y checklist de §23.
- **Revisión de migraciones:** toda migración se revisa por separado (backward-compat, backfill, constraints, índices, SQL raw justificado).
- **Agentes de codificación:** **NO DEBEN** hacer `commit` ni `push` automáticamente salvo solicitud explícita del usuario. **NO DEBEN** modificar documentos de diseño (`docs/`) ni artefactos de management fuera del workflow activo.

---

## 18. Definition of Ready (para implementar)

Una tarea está *Ready* cuando (DEBE cumplirse todo):

- Existe la User Story (`management/user-stories/US-XXX-*.md`) con criterios de aceptación **testables**.
- Existe la Technical Specification aprobada (`management/technical-specs/<Px>/…`).
- Existen las Development Tasks (`management/development-tasks/<Px>/…`).
- Las dependencias (P0/P1/… y entre módulos) están identificadas.
- Las decisiones bloqueantes están resueltas (refinement/decision-resolution/approval completados en el workflow-state).
- Está verificada la alineación con estas convenciones y con los ADRs aplicables.

---

## 19. Definition of Done

Una tarea **no** está *Done* solo porque existe código. **DEBE** cumplirse:

- **Implementación** completa según la Tech Spec, respetando capas (§8), API (§9) y DB (§11).
- **Tests** añadidos/actualizados: unit, integration/API y frontend donde aplique; **casos negativos de autorización** cubiertos; tests con `MockAIProvider` si hay IA; smoke E2E actualizado si se tocó un flujo crítico.
- **Lint** (ESLint) sin errores.
- **Typecheck** (`tsc --noEmit`) sin errores.
- **Build** verde donde aplique (`next build` / imagen Docker).
- **Seguridad/autorización** verificadas (RBAC + ownership + assignment; sin secretos filtrados).
- **Accesibilidad** e **i18n** cubiertas donde hay UI (sin strings hardcodeados; catálogo completo).
- **Migraciones** forward, revisadas y con tests; **seed** actualizado y aún idempotente si se impactó.
- **Documentación** actualizada cuando el comportamiento cambió (FRD/API spec/seed/Tech Spec).
- **Evidencia de ejecución** adjunta (salida de tests/lint/typecheck).
- **Criterios de aceptación** de la US satisfechos.
- **Sin desviaciones críticas** sin resolver (§20).

---

## 20. Excepciones y desviaciones

Cuando una convención no pueda cumplirse, seguir este proceso (no continuar en silencio):

1. **Identificar** la convención específica y el nivel de jerarquía (§3) que la respalda.
2. **Explicar** por qué no puede cumplirse en este caso.
3. **Documentar** alternativas consideradas.
4. **Evaluar impacto** (seguridad, datos, contrato de API, arquitectura).
5. **Determinar** si basta actualizar la **Tech Spec** (desviación local, sin cambiar arquitectura).
6. **Determinar** si se requiere un **ADR** (cambia una decisión de nivel 1–3: estilo arquitectónico, stack, contrato, modelo de seguridad, estrategia de IA/DB/DevOps).
7. **No continuar** si la desviación cambia arquitectura y no hay ADR aceptado.

Cambios que **siempre** requieren ADR: introducir un framework/librería/servicio no aprobado; alterar el `LLMProvider` port, la estrategia de fallback o el timeout de IA; cambiar el modelo de sesión/autorización; cambiar el proveedor de nube o el modelo de deploy; cambiar el ORM/DB. Cambios que requieren **decisión de PO**: alcance de IA, datos enviados al LLM, idiomas, o el reparto OpenAI/Mock/Anthropic.

---

## 21. Matriz de cumplimiento (enforcement)

`Current` = existe hoy en el repo. Dado que aún no hay configuración de tooling, **hoy todo se hace cumplir por revisión manual**; las columnas *Tool/CI* describen el mecanismo **Target** aprobado.

| Área | Regla | Mecanismo (Target) | Tool/Config | Gate CI | Revisión manual | Fuente |
|---|---|---|---|---|---|---|
| TypeScript | strict, sin `any` | Compilador + lint | `tsconfig` (`strict`, `noUncheckedIndexedAccess`), ESLint | Sí | Sí | `ADR-BE-001` |
| Formato | estilo consistente | Prettier | `.prettierrc` | Sí | No | Target |
| Capas backend | dominio sin Prisma/Express/SDK | Lint + revisión | ESLint import rules | Sí | Sí | `ADR-ARCH-002`, `docs/14 §4.3` |
| API | envelope, `/api/v1`, DTOs, Zod `.strict()` | Supertest + revisión | Vitest+Supertest | Sí | Sí | `docs/16`, `ADR-API-002/003` |
| DB/Prisma | naming, migración forward, sin `$queryRawUnsafe` | `prisma migrate validate/diff` + revisión | Prisma CLI | Sí | Sí | `docs/18`, `ADR-DB-005` |
| Migraciones | backfill/constraints/rollback | Test de migración + revisión | Vitest + Prisma | Sí | Sí | `docs/18 §28` |
| Seed | idempotencia, `is_seed` | `npm run seed -- --dry-run` | Node/Prisma | Sí | Sí | `docs/11`, `docs/20 §22` |
| IA | human-in-the-loop, schema Zod, sin fallback silencioso | `MockAIProvider` + tests | Vitest | Sí | Sí | `docs/17`, `ADR-AI-005/007` |
| Seguridad | cookie HTTP-only, RBAC+ownership, sin secretos | Tests de seguridad (positivos+negativos) | Vitest+Supertest, `gitleaks` | Sí (`tests/security/`) | Sí | `docs/19`, `ADR-SEC-*` |
| Autorización | matriz positiva **y** negativa | Tests obligatorios | Vitest+Supertest | Sí | Sí | `docs/20 PT-07`, `ADR-TEST-004` |
| Frontend | Server-first, sin secretos en bundle, mappers | Lint + revisión + tests | ESLint, Vitest, MSW | Sí | Sí | `docs/15`, `ADR-FE-001/002` |
| i18n | sin strings hardcodeados | Lint + smoke i18n | ESLint rule, Vitest | Sí | Sí | `docs/15 §31` |
| Accesibilidad | WCAG 2.1 AA base | axe + revisión manual | `axe-core`, Playwright a11y | Parcial | Sí | `docs/15 §34` |
| Testing | pirámide, cobertura, sin `.skip` crítico | Vitest coverage + CI | Vitest v8 | Sí | Sí | `docs/20`, `ADR-TEST-001` |
| DevOps | gates, `.env.example` sync, imagen sin secretos | GitHub Actions | workflows | Sí | Sí | `docs/21`, `ADR-DEVOPS-006` |
| Observabilidad | `correlationId`, logs sin PII | Revisión + tests de log | pino/sink de test | Parcial | Sí | `docs/21 §19`, `docs/19 §27` |
| Git | commits enfocados, sin auto-push por agentes | Revisión de PR | — | No | Sí | §17 |

---

## 22. Trazabilidad

| Sección | Documento(s) fuente |
|---|---|
| §3 jerarquía, guardarraíles | `docs/22` (ADRs), `docs/12`, `docs/13` |
| §7 TypeScript | `ADR-BE-001`, `ADR-FE-001` |
| §8 Backend | `docs/14`, `ADR-ARCH-001/002`, `ADR-BE-001/002/003/004` |
| §9 API | `docs/16`, `ADR-API-001/002/003/004` |
| §10 Frontend | `docs/15`, `ADR-FE-001/002/003/004` |
| §11 Base de datos | `docs/18`, `docs/11`, `ADR-DB-001..005` |
| §12 IA | `docs/17`, `ADR-AI-001..008` |
| §13 Seguridad | `docs/19`, `ADR-SEC-001..006` |
| §14 Testing | `docs/20`, `ADR-TEST-001..004` |
| §15 Observabilidad | `docs/21 §19`, `docs/19 §27`, `docs/10 §19` |
| §16 DevOps | `docs/21`, `docs/10`, `ADR-DEVOPS-001..007` |
| §17 Git | historial del repositorio, `management/` |
| §18–§19 DoR/DoD | `docs/20 §24`, workflow-state de `management/workflows/` |

### 22.1 Conflictos detectados y su resolución

| Conflicto | Documentos | Resolución (regla aplicada) |
|---|---|---|
| **Conjunto de monedas:** frontend lista `USD, EUR, BRL, COP, MXN`; DB/NFR listan `GTQ, EUR, MXN, COP, USD` | `docs/15` vs `docs/18`/`docs/10` | Canónico = **GTQ, EUR, MXN, COP, USD** (autoridad del modelo físico `docs/18` + NFR; piloto Guatemala). `BRL` del doc de frontend se considera discrepancia y **no** se implementa sin ADR. |
| **Cookie `SameSite`:** `Lax` (seguridad/API) vs `None; Secure` (DevOps cross-site) | `docs/19`/`docs/16` vs `docs/21`, `ADR-SEC-002` | **`SameSite=Lax` por defecto**; usar `SameSite=None; Secure` **solo** cuando frontend (Amplify) y backend (App Runner) sean cross-site, activando CSRF double-submit. |
| **Gestor de paquetes:** pnpm (frontend) vs npm (DevOps/CI) | `docs/15` vs `docs/21` | Comandos canónicos usan **npm** (`docs/21` es autoridad de comandos). pnpm queda como preferencia no adoptada hasta ADR. |
| **Naming de test:** `.spec.ts` unit (backend) vs `.spec.ts` E2E / `.test.ts` unit (frontend) | `docs/14` vs `docs/15` | Cada lado sigue su convención: **backend** `.spec.ts`/`.int.spec.ts`; **frontend** `.test.ts` (unit/int) / `.spec.ts` (E2E). |
| **`correlationId` en envelope de error:** anidado en `error` (backend) vs en `meta` (API) | `docs/14 §18.2` vs `docs/16 §14.1` | **En `meta`** — `docs/16` es el contrato REST canónico. |
| **Interfaces de port con prefijo `I`** (System Architecture) vs sin prefijo (Backend Design) | `docs/13` vs `docs/14` | **Sin prefijo `I`** (`EventRepository`, `LLMProvider`) — `docs/14` es autoridad de naming concreto. |
| **Código de estado de reset-request:** `200` (seguridad) vs `202` (API) | `docs/19` vs `docs/16` | **`202`** — contrato REST canónico `docs/16`. Ambos cumplen la anti-enumeración (respuesta genérica). |

### 22.2 Recomendaciones etiquetadas (no impuestas)

- Usuario **no-root** en la imagen Docker: recomendación de industria; **no** es requisito documentado en `docs/21`.
- `gitleaks` pre-commit y `npm audit` como *warning*: recomendados; SCA/SBOM formal fuera de alcance MVP.
- CSP estricta con nonce y double-submit CSRF: *roadmap* de seguridad (`ROAD-SEC-003/007`), no MVP salvo `SameSite=None`.

---

## 23. Checklist de implementación (por tarea / PR)

Aplicar antes de marcar *Done* o aprobar un PR:

- [ ] El cambio se limita al objetivo de la tarea; sin refactors no relacionados ni expansión de alcance (§5).
- [ ] Capas backend respetadas: dominio sin Prisma/Express/SDK; Prisma solo en infraestructura; controllers delgados (§8).
- [ ] Contrato de API: `/api/v1`, recurso plural kebab-case, envelope de éxito/error, status semántico, Zod `.strict()`, DTOs (no entidades) (§9).
- [ ] Base de datos: naming/mapeos, `uuid`, `timestamptz`, `Decimal` para dinero, FKs/onDelete, índices *query-driven*, migración forward + tests; `is_seed` presente (§11).
- [ ] IA (si aplica): `LLMProvider` port, output validado con Zod, human-in-the-loop (`pending` hasta `apply`), timeout 60s + 1 retry, sin fallback silencioso, minimización de prompt, sin secretos (§12).
- [ ] Seguridad: cookie HTTP-only, RBAC + ownership + assignment en backend, sin tokens en el navegador, allowlists de upload, sin secretos en código/logs (§13).
- [ ] Autorización probada con casos **positivos y negativos** (§14).
- [ ] Frontend: Server Components por defecto, `'use client'` mínimo, mappers, TanStack Query para server state, RHF+Zod, 4 estados de vista, sin secretos en bundle (§10).
- [ ] i18n: sin strings hardcodeados, catálogo completo por locale; moneda del evento inmutable, sin conversión automática (§10, §11).
- [ ] Accesibilidad: teclado, foco, labels, contraste, focus trap en modales (§10).
- [ ] Tests: unit/integration/API/componentes según nivel, deterministas, `MockAIProvider` en CI, smoke E2E si flujo crítico; cobertura significativa (§14).
- [ ] Observabilidad: `correlationId` propagado; logs estructurados sin PII/secretos; acciones admin auditadas (§15).
- [ ] DevOps: `.env.example` sincronizado; sin secretos en repo/imagen/logs; comandos npm/Prisma correctos (§16).
- [ ] Lint, typecheck y build verdes; evidencia adjunta (§19).
- [ ] Git: commit(s) enfocados estilo Conventional Commits con trazabilidad `US`/`PB`/task; sin auto-commit/push por agente (§17).
- [ ] Desviaciones documentadas y, si cambian arquitectura, con ADR (§20).

---

## 24. Referencias externas consultadas

Documentación oficial de las tecnologías del stack aprobado, consultada solo para prácticas alineadas con decisiones ya tomadas de EventFlow (sin introducir tecnologías nuevas): TypeScript, Node.js, Express, Next.js (App Router), React, TanStack Query, React Hook Form, Zod, Prisma, PostgreSQL, Vitest, Testing Library, MSW, Playwright, Docker, GitHub Actions, AWS (Amplify, App Runner, RDS, S3, Secrets Manager, CloudWatch, ECR) y OWASP. Ante conflicto entre una recomendación oficial y una decisión aceptada de EventFlow, **prevalece la decisión de EventFlow** (§3); la recomendación se documenta como *trade-off* solo si es operativamente relevante.
