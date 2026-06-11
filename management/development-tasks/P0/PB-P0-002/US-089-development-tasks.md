# Development Tasks — PB-P0-002 / US-089: Inicializar proyecto Node + Express + TypeScript

## 1. Metadata

| Campo | Valor |
|---|---|
| User Story ID | US-089 |
| Source User Story | `management/user-stories/US-089-bootstrap-node-express-ts.md` |
| Source Technical Specification | `management/technical-specs/P0/PB-P0-002/US-089-technical-spec.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-089-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-002 |
| Backlog Title | Inicializar backend Node + Express + TypeScript con arquitectura Clean/Hexagonal |
| Backlog Execution Order | 2 |
| User Story Position in Backlog Item | 1 de 3 |
| Related User Stories in Backlog Item | US-089, US-090, US-091 |
| Epic | EPIC-BE-001 — Backend Modular Monolith |
| Backlog Item Dependencies | — (sin dependencias; puede iniciar en paralelo con PB-P0-001) |
| Feature | Bootstrap del backend |
| Module / Domain | Platform/BE |
| Backlog Alignment Status | Found |
| Task Breakdown Status | Ready for Sprint Planning |
| Created Date | 2026-06-11 |
| Last Updated | 2026-06-11 |

---

## 2. Source Validation

| Fuente | Found | Used | Notas |
|---|---|---|---|
| User Story | Yes | Yes | `US-089` — Approved with Minor Notes |
| Technical Specification | Yes | Yes | `US-089-technical-spec.md` — Ready for Task Breakdown |
| Decision Resolution Artifact | Yes | Yes | 5 decisiones formalizadas; ninguna bloqueante |
| Product Backlog Prioritized | Yes | Yes | PB-P0-002, posición 2, sin dependencias |
| ADRs | Yes | Yes | ADR-ARCH-001, ADR-ARCH-002, ADR-BE-001, ADR-SEC-005, ADR-SEC-006 |

---

## 3. Backlog Execution Context

### Parent Backlog Item

**PB-P0-002 — Backend Modular Monolith Bootstrap**

Bootstrap del servidor Express, estructura feature-first con capas `Interface/Application/Domain/Ports/Infrastructure`, configuración por env vars, shared kernel y pipeline base de middlewares. Backbone técnico para todos los endpoints REST del MVP.

### Execution Order Rationale

US-089 es la primera US de PB-P0-002 y no tiene dependencias de backlog. Puede iniciarse en paralelo con PB-P0-001 (Database Schema). Es prerequisito bloqueante para US-090 y US-091.

### Related User Stories in Same Backlog Item

| User Story | Rol en el Backlog Item | Orden sugerido |
|---|---|---|
| **US-089** (esta US) | Servidor Express compilable + config Zod + `GET /health` | 1 — prerequisito bloqueante |
| US-090 | 16 módulos + shared kernel + ESLint boundaries | 2 |
| US-091 | Pipeline de 14 middlewares transversales | 3 |

---

## 4. Task Breakdown Summary

| Área | Nro. de Tareas | Notas |
|---|---:|---|
| Backend (BE) | 4 | Inicialización, config/env.ts, app.ts, server.ts |
| DevOps / Environment (OPS) | 2 | .env.example, scripts de CI |
| Security / Authorization (SEC) | 2 | Helmet default, validación de .env.example sin secrets |
| QA / Testing (QA) | 3 | Unit tests config, integration tests health, CI checks |
| Observability / Audit (OBS) | 1 | Logs de bootstrap |
| Documentation / Traceability (DOC) | 2 | Minor note ADR-SEC-005, documentation alignment /healthz |
| **Total** | **14** | |

---

## 5. Traceability Matrix

| Acceptance Criterion | Technical Spec Section | Task IDs |
|---|---|---|
| AC-01: `tsc --noEmit` sin errores con strict mode | §5 Architecture Alignment / §7 Backend Technical Design | TASK-PB-P0-002-US-089-BE-001, TASK-PB-P0-002-US-089-QA-003 |
| AC-02: Servidor arranca y `GET /health` responde 200 OK | §7 Controllers/Routes, §9 API Contract Design | TASK-PB-P0-002-US-089-BE-003, TASK-PB-P0-002-US-089-BE-004, TASK-PB-P0-002-US-089-QA-002 |
| AC-03: Configuración cargada con Zod al arranque | §7 DTOs/Schemas (Config schema) | TASK-PB-P0-002-US-089-BE-002, TASK-PB-P0-002-US-089-QA-001 |
| AC-04: `.env.example` con todas las variables | §7 Backend Technical Design, §15 Seed/Demo | TASK-PB-P0-002-US-089-OPS-001 |
| AC-05: Scripts `typecheck`, `lint`, `test` funcionales | §5 Testing Architecture | TASK-PB-P0-002-US-089-OPS-002, TASK-PB-P0-002-US-089-QA-003 |
| EC-01: Variable requerida ausente → fail-fast | §7 Error Handling, §6 Functional Interpretation | TASK-PB-P0-002-US-089-BE-002, TASK-PB-P0-002-US-089-QA-001 |
| EC-02: `LLM_PROVIDER` inválido → fail-fast | §7 DTOs/Schemas (Config schema) | TASK-PB-P0-002-US-089-BE-002, TASK-PB-P0-002-US-089-QA-001 |
| SEC-01: `GET /health` público sin auth | §12 Security Design | TASK-PB-P0-002-US-089-BE-003, TASK-PB-P0-002-US-089-QA-002 |
| SEC-02: Secrets solo en env vars | §12 Sensitive Data Handling | TASK-PB-P0-002-US-089-OPS-001, TASK-PB-P0-002-US-089-SEC-001 |
| SEC-04: Helmet activo por defecto | §12 Security Architecture | TASK-PB-P0-002-US-089-SEC-002 |

---

## 6. Development Tasks

---

### TASK-PB-P0-002-US-089-BE-001 — Inicializar proyecto Node.js: package.json, tsconfig.json, ESLint y Vitest

| Campo | Valor |
|---|---|
| Área | Backend |
| Tipo | Setup |
| Prioridad | Must |
| Estimado | M |
| Depends On | — |
| Source AC(s) | AC-01, AC-05 |
| Technical Spec Section(s) | §5 Architecture Alignment (Backend), §7 Backend Technical Design |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | Backend / Tech Lead |
| Status | To Do |

#### Objective

Crear la base ejecutable del proyecto Node.js con todas las dependencias, TypeScript con strict mode completo, ESLint base y Vitest configurados.

#### Scope

##### Include

- `package.json` con dependencias de producción: `express`, `zod`, `@prisma/client`, `prisma` (dev), `cors`, `helmet`, `jsonwebtoken`, `uuid`, `express-rate-limit`.
- `package.json` con devDependencies: `typescript`, `ts-node`, `vitest`, `supertest`, `@types/express`, `@types/node`, `@types/cors`, `@types/jsonwebtoken`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`.
- `tsconfig.json` con: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"target": "ES2022"`, `"module": "commonjs"`, `"outDir": "dist"`, `"rootDir": "src"`, `"esModuleInterop": true`, `"skipLibCheck": true`.
- `.eslintrc.js` base con `@typescript-eslint` (reglas de import boundary en US-090).
- `vitest.config.ts` con configuración base (entorno Node, globals, cobertura mínima).
- Scripts en `package.json`: `build`, `start`, `dev`, `typecheck`, `lint`, `test`.

##### Exclude

- Configuración de import boundary ESLint (US-090).
- Path aliases en `tsconfig.json` (pueden añadirse en US-090).
- CI/CD pipeline (PB-P0-017).
- Dockerfile (PB-P0-016).

#### Implementation Notes

- El script `typecheck` debe ser `tsc --noEmit`.
- El script `lint` debe ser `eslint src/ --ext .ts`.
- El script `test` debe ser `vitest run`.
- El script `dev` puede usar `ts-node src/server.ts` o `nodemon` con `ts-node`.
- `"strict": true` incluye `strictNullChecks`, `noImplicitAny`, etc. Los flags adicionales (`noUncheckedIndexedAccess`, `noImplicitOverride`) son adicionales per ADR-BE-001.

#### Acceptance Criteria Covered

AC-01 (compilación con strict mode), AC-05 (scripts funcionales).

#### Definition of Done

- [ ] `npm install` completa sin errores.
- [ ] `tsc --noEmit` sobre un archivo `src/index.ts` vacío pasa sin errores.
- [ ] `eslint src/` no reporta errores con una configuración base válida.
- [ ] `vitest run` ejecuta (puede retornar 0 tests si no hay archivos de test aún).
- [ ] `tsconfig.json` incluye `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`.

---

### TASK-PB-P0-002-US-089-BE-002 — Implementar `src/config/env.ts` con schema Zod y parseConfig()

| Campo | Valor |
|---|---|
| Área | Backend |
| Tipo | Implementation |
| Prioridad | Must |
| Estimado | M |
| Depends On | TASK-PB-P0-002-US-089-BE-001 |
| Source AC(s) | AC-03, EC-01, EC-02 |
| Technical Spec Section(s) | §7 DTOs/Schemas (Config schema), §6 Functional Interpretation (AC-03, EC-01, EC-02) |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Implementar el módulo de configuración que valida todas las variables de entorno con Zod al arranque del servidor, expone el tipo `AppConfig` inferido, y falla de forma controlada si alguna variable requerida falta o tiene valor inválido.

#### Scope

##### Include

- `src/config/env.ts` con schema Zod que incluye todas las categorías de variables per Doc 14 §27: APP, DATABASE, AUTH, AI, SECURITY, LOGGING, SEED.
- Variables mínimas del schema:
  - `PORT`: `z.coerce.number().int().positive()`
  - `NODE_ENV`: `z.enum(['development', 'test', 'production'])`
  - `DATABASE_URL`: `z.string().url()`
  - `JWT_SECRET`: `z.string().min(32)`
  - `JWT_EXPIRES_IN`: `z.string().default('7d')`
  - `LLM_PROVIDER`: `z.enum(['openai', 'mock', 'anthropic'])`
  - `OPENAI_API_KEY`: `z.string().optional()`
  - `CORS_ORIGINS`: `z.string()`
  - `CAPTCHA_PROVIDER`: `z.enum(['recaptcha', 'mock'])`
  - `HELMET_ENABLED`: `z.coerce.boolean().default(true)`
  - `RATE_LIMIT_MAX`: `z.coerce.number().default(100)`
  - `RATE_LIMIT_WINDOW_MS`: `z.coerce.number().default(60000)`
  - `LOG_LEVEL`: `z.enum(['debug', 'info', 'warn', 'error']).default('info')`
  - `SEED_ENABLED`: `z.coerce.boolean().default(false)`
  - `JSON_BODY_LIMIT`: `z.string().default('1mb')`
- Función `parseConfig(env: NodeJS.ProcessEnv): AppConfig` exportada y testeable de forma aislada.
- Tipo `AppConfig` exportado (`z.infer<typeof configSchema>`).
- Llamada a `parseConfig(process.env)` como export principal (`export const config = parseConfig(process.env)`).

##### Exclude

- Variables de storage (AWS S3, etc.) si no son necesarias para US-089; pueden añadirse en historias de attachments.
- Variables específicas de feature (e.g., `AUTH_RATE_LIMIT_MAX` — se añaden en US-091).

#### Implementation Notes

- La función `parseConfig` debe ser exportada por separado del `config` object para permitir tests unitarios sin side effects.
- Si `configSchema.parse(env)` falla, el `ZodError` tiene mensajes descriptivos por campo. No es necesario formatear el error — el mensaje nativo de Zod es suficiente.
- Los valores con `.default()` no fallan si la variable está ausente — son opcionales con valor predeterminado.
- `z.coerce.number()` permite que variables de entorno string sean coercionadas a número automáticamente.

#### Acceptance Criteria Covered

AC-03, EC-01, EC-02.

#### Definition of Done

- [ ] `parseConfig({})` lanza `ZodError` (DATABASE_URL ausente).
- [ ] `parseConfig({ ...validEnv, DATABASE_URL: 'not-a-url' })` lanza error de validación.
- [ ] `parseConfig({ ...validEnv, LLM_PROVIDER: 'gpt4' })` lanza error con valores admitidos.
- [ ] `parseConfig(validEnv)` retorna objeto tipado sin errores.
- [ ] `AppConfig` type es correctamente inferido desde el schema.
- [ ] `tsc --noEmit` pasa sobre el archivo.

---

### TASK-PB-P0-002-US-089-BE-003 — Implementar `src/app.ts`: Express factory, `GET /health` y middlewares stub

| Campo | Valor |
|---|---|
| Área | Backend |
| Tipo | Implementation |
| Prioridad | Must |
| Estimado | S |
| Depends On | TASK-PB-P0-002-US-089-BE-001, TASK-PB-P0-002-US-089-BE-002 |
| Source AC(s) | AC-02, AC-05, SEC-01, SEC-04 |
| Technical Spec Section(s) | §7 Controllers/Routes, §9 API Contract Design, §12 Security Architecture |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Implementar la Express factory que exporta `app` sin llamar `listen`, registra el endpoint `GET /health` y registra middlewares globales como stubs (implementación real en US-091).

#### Scope

##### Include

- `src/app.ts` que importa `config` de `src/config/env.ts`.
- `app.use(helmet())` condicionado a `config.HELMET_ENABLED` — **activo por defecto**.
- `app.get('/health', (req, res) => res.json({ status: 'ok', version: process.env.npm_package_version ?? '0.0.0', uptimeMs: Math.floor(process.uptime() * 1000) }))` — fuera del prefijo `/api/v1`, sin autenticación.
- Router `/api/v1` montado como `Router()` vacío (las rutas se agregan en feature stories).
- `notFoundMiddleware` stub registrado como penúltimo middleware.
- `errorHandlerMiddleware` stub registrado como último middleware (4 argumentos).
- `export default app` (o named export) **sin llamar** `app.listen`.

##### Exclude

- Implementación real de cualquier middleware (stubs vacíos o `next()` son suficientes).
- Middlewares que requieren `JWT_SECRET` o tokens reales (US-091).
- Cualquier ruta bajo `/api/v1` con lógica de negocio.

#### Implementation Notes

- **Crítico**: `app.ts` no debe llamar `app.listen`. Solo `server.ts` llama `listen`. Esta separación permite que Supertest importe `app` sin abrir un puerto real.
- El handler de `GET /health` es sincrónico. No debe consultar la base de datos.
- `process.env.npm_package_version` es inyectado automáticamente por Node.js desde `package.json`.
- `uptimeMs` = `Math.floor(process.uptime() * 1000)` — uptime del proceso en millisegundos.
- El stub de `notFoundMiddleware` puede ser `(req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Not found' })`.
- El stub de `errorHandlerMiddleware` debe tener la firma de 4 argumentos `(err, req, res, next)` — Express lo identifica como error handler por la aridad.

#### Acceptance Criteria Covered

AC-02, AC-05, SEC-01, SEC-04.

#### Definition of Done

- [ ] `app` exportado sin `listen`.
- [ ] `GET /health` responde `200 OK` con `{ status: 'ok', version: string, uptimeMs: number }`.
- [ ] `GET /health` sin cabecera `Authorization` responde `200 OK` (no requiere auth).
- [ ] `helmet()` registrado y activo cuando `HELMET_ENABLED=true`.
- [ ] `tsc --noEmit` pasa sin errores sobre `src/app.ts`.

---

### TASK-PB-P0-002-US-089-BE-004 — Implementar `src/server.ts`: bootstrap del proceso

| Campo | Valor |
|---|---|
| Área | Backend |
| Tipo | Implementation |
| Prioridad | Must |
| Estimado | S |
| Depends On | TASK-PB-P0-002-US-089-BE-002, TASK-PB-P0-002-US-089-BE-003 |
| Source AC(s) | AC-02, EC-01 |
| Technical Spec Section(s) | §7 Backend Technical Design (server.ts), §6 Functional Interpretation (EC-01), §14 Observability |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Implementar el punto de entrada del proceso que carga la configuración, invoca el `$connect()` stub de Prisma, inicia el servidor y maneja errores fatales con fail-fast.

#### Scope

##### Include

- `src/server.ts` que:
  1. Importa `config` de `src/config/env.ts` (si `parseConfig` lanza, el error se propaga).
  2. Importa `app` de `src/app.ts`.
  3. Llama `prisma.$connect()` como stub de verificación de conectividad.
  4. Llama `app.listen(config.PORT, callback)`.
  5. Captura errores fatales en un `try/catch` o `.catch()` — llama `process.exit(1)` con mensaje descriptivo a `stderr`.
- Logs de bootstrap: `"Server listening on port ${PORT}"`, `"Database connection established"`.
- Manejo de `SIGTERM` y `SIGINT` con cierre graceful (opcional para MVP pero recomendado).

##### Exclude

- Lógica de negocio o registro de rutas.
- Jobs o cron tasks (stubs vacíos si el proyecto los requiere en el futuro).

#### Implementation Notes

- El bootstrap debe ser fail-fast: si `parseConfig(process.env)` falla (variable ausente), la excepción se propaga antes de llegar a `prisma.$connect()` o `app.listen()`.
- `prisma.$connect()` es un stub — puede lanzar si `DATABASE_URL` es inválida. Esto es aceptable; el error se captura en el try/catch.
- En tests, `server.ts` no se importa directamente — Supertest importa `app.ts`. Esto garantiza que `listen` no se llama en los tests.

#### Acceptance Criteria Covered

AC-02, EC-01.

#### Definition of Done

- [ ] El proceso arranca con un `.env` válido y loguea el puerto en que escucha.
- [ ] El proceso falla con `exit code !== 0` si `DATABASE_URL` está ausente.
- [ ] El proceso falla con `exit code !== 0` si `LLM_PROVIDER` tiene valor inválido.
- [ ] `tsc --noEmit` pasa sin errores sobre `src/server.ts`.

---

### TASK-PB-P0-002-US-089-OPS-001 — Crear `.env.example` con todas las variables requeridas

| Campo | Valor |
|---|---|
| Área | DevOps / Environment |
| Tipo | Documentation |
| Prioridad | Must |
| Estimado | S |
| Depends On | TASK-PB-P0-002-US-089-BE-002 |
| Source AC(s) | AC-04, SEC-02 |
| Technical Spec Section(s) | §7 DTOs/Schemas (tabla de categorías), §12 Sensitive Data Handling |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | Backend / DevOps |
| Status | To Do |

#### Objective

Crear el archivo `.env.example` en la raíz del repositorio con todos los nombres y formatos de variables de entorno requeridas, sin valores reales ni secretos.

#### Scope

##### Include

- `.env.example` con las categorías per Doc 14 §27:
  - `APP`: `PORT`, `NODE_ENV`
  - `DATABASE`: `DATABASE_URL`
  - `AUTH`: `JWT_SECRET`, `JWT_EXPIRES_IN`
  - `AI`: `LLM_PROVIDER`, `OPENAI_API_KEY`
  - `SECURITY`: `CORS_ORIGINS`, `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET`, `HELMET_ENABLED`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `JSON_BODY_LIMIT`
  - `LOGGING`: `LOG_LEVEL`
  - `SEED`: `SEED_ENABLED`
- Comentarios descriptivos por categoría indicando el tipo y ejemplo de formato (sin valores reales).
- Variables secretas con valor vacío o placeholder como `your_secret_here` — nunca valores reales.
- `.env.example` commiteado en el repositorio; `.env` en `.gitignore`.

##### Exclude

- Variables de storage/S3 (se añaden en historias de attachments).
- Variables de US-091 que aún no existen (`AUTH_RATE_LIMIT_MAX` — se añade al actualizar `.env.example` en US-091).

#### Implementation Notes

- `.env` debe estar en `.gitignore` (si no lo está, añadirlo en esta tarea).
- Verificar que el `.env.example` contiene exactamente las mismas variables que el schema Zod de `config/env.ts` — ninguna variable requerida debe estar ausente.
- Idealmente agregar un script o CI check que compare las variables del schema con las del `.env.example` para detectar divergencias.

#### Acceptance Criteria Covered

AC-04, SEC-02.

#### Definition of Done

- [ ] `.env.example` existe en la raíz del proyecto.
- [ ] Todas las variables del schema Zod tienen entrada en `.env.example`.
- [ ] Ninguna variable en `.env.example` contiene secretos reales.
- [ ] `.env` está en `.gitignore`.

---

### TASK-PB-P0-002-US-089-OPS-002 — Configurar scripts de CI en `package.json`

| Campo | Valor |
|---|---|
| Área | DevOps / Environment |
| Tipo | Setup |
| Prioridad | Must |
| Estimado | XS |
| Depends On | TASK-PB-P0-002-US-089-BE-001 |
| Source AC(s) | AC-05 |
| Technical Spec Section(s) | §5 Testing Architecture (CI Checks) |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | DevOps / Backend |
| Status | To Do |

#### Objective

Asegurar que los scripts `typecheck`, `lint` y `test` están configurados en `package.json` y pasan sin errores en un entorno limpio.

#### Scope

##### Include

- Script `"typecheck": "tsc --noEmit"`.
- Script `"lint": "eslint src/ --ext .ts"`.
- Script `"test": "vitest run"`.
- Script `"build": "tsc"`.
- Script `"start": "node dist/server.js"`.
- Script `"dev": "ts-node src/server.ts"` (o con nodemon).
- Verificación de que los tres scripts `typecheck`, `lint`, `test` pasan con el proyecto inicializado.

##### Exclude

- Configuración de CI pipeline (PB-P0-017).
- Scripts de seed o migración (PB-P0-001).

#### Implementation Notes

- En el entorno de CI, las variables de entorno requeridas deben estar disponibles vía `.env.test` o variables de entorno del runner para que `vitest run` no falle por config inválida.

#### Acceptance Criteria Covered

AC-05.

#### Definition of Done

- [ ] `npm run typecheck` pasa sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run test` pasa sin errores (puede ser 0 tests inicialmente).
- [ ] Los tres scripts están en `package.json`.

---

### TASK-PB-P0-002-US-089-SEC-001 — Verificar que `.env.example` no contiene secretos reales

| Campo | Valor |
|---|---|
| Área | Security / Authorization |
| Tipo | Review |
| Prioridad | Must |
| Estimado | XS |
| Depends On | TASK-PB-P0-002-US-089-OPS-001 |
| Source AC(s) | SEC-02 |
| Technical Spec Section(s) | §12 Sensitive Data Handling, §13 Security Tests |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | QA / Tech Lead |
| Status | To Do |

#### Objective

Garantizar que `.env.example` no contiene ningún secreto, token, contraseña ni API key real — solo nombres de variables y formatos de ejemplo.

#### Scope

##### Include

- Revisión manual en PR: verificar que los valores de variables como `JWT_SECRET`, `CAPTCHA_SECRET`, `OPENAI_API_KEY`, `DATABASE_URL` son placeholders (`your_secret_here`, `postgresql://user:pass@localhost:5432/db`, etc.) sin valores reales.
- Optionalmente: script CI que ejecuta `grep -E '(SECRET|PASSWORD|KEY)\s*=\s*[^# ]{8,}' .env.example` y falla si hay coincidencias con valores que parezcan secretos reales.

##### Exclude

- Análisis de secret scanning en el historial de git (eso es DevOps/seguridad avanzada).

#### Implementation Notes

- Este es un check crítico de seguridad — un secret commiteado accidentalmente puede comprometer toda la infraestructura del proyecto.
- Si se implementa el script CI, añadirlo al script `lint` o como un check separado.

#### Acceptance Criteria Covered

SEC-02 (secrets solo en env vars; `.env.example` sin valores reales).

#### Definition of Done

- [ ] PR review confirma que `.env.example` no contiene secretos reales.
- [ ] Optionally: script de validación CI no reporta ningún secreto sospechoso.

---

### TASK-PB-P0-002-US-089-SEC-002 — Verificar Helmet activo por defecto en `app.ts`

| Campo | Valor |
|---|---|
| Área | Security / Authorization |
| Tipo | Review |
| Prioridad | Must |
| Estimado | XS |
| Depends On | TASK-PB-P0-002-US-089-BE-003 |
| Source AC(s) | SEC-04 |
| Technical Spec Section(s) | §5 Security Architecture, §12 Security & Authorization Design |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | QA / Tech Lead |
| Status | To Do |

#### Objective

Confirmar que `helmet()` está registrado en `app.ts` y activo por defecto (`HELMET_ENABLED=true`), que los security headers están presentes en las respuestas desde el primer arranque.

#### Scope

##### Include

- Verificación en el test de integración `GET /health` de que los headers de seguridad de Helmet están presentes en la respuesta: `x-content-type-options`, `x-frame-options`, `x-xss-protection`.
- Verificación de que `HELMET_ENABLED=false` desactiva el middleware (test negativo opcional).

##### Exclude

- Configuración avanzada de CSP (Content-Security-Policy) — el default de Helmet es suficiente en esta US.

#### Implementation Notes

- Agregar assertions en el test TS-02 (health endpoint) para verificar headers de Helmet.
- Si `HELMET_ENABLED` no está en el `.env.test`, el default `true` debe aplicarse gracias al `.default(true)` del schema Zod.

#### Acceptance Criteria Covered

SEC-04.

#### Definition of Done

- [ ] Test de integración verifica que `res.headers['x-content-type-options']` está presente en respuesta de `GET /health`.
- [ ] `helmet()` condicionado a `config.HELMET_ENABLED` con default `true`.

---

### TASK-PB-P0-002-US-089-QA-001 — Tests unitarios de `config/env.ts` (parseConfig)

| Campo | Valor |
|---|---|
| Área | QA / Testing |
| Tipo | Test |
| Prioridad | Must |
| Estimado | S |
| Depends On | TASK-PB-P0-002-US-089-BE-002 |
| Source AC(s) | AC-03, EC-01, EC-02 |
| Technical Spec Section(s) | §13 Testing Strategy (Unit Tests), §6 Functional Interpretation |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | QA / Backend |
| Status | To Do |

#### Objective

Implementar los tests unitarios que verifican el comportamiento de `parseConfig()`: caso válido, fail-fast por variable ausente, y fail-fast por valor inválido en enum.

#### Scope

##### Include

- **TS-03**: `parseConfig(validEnv)` retorna objeto tipado sin lanzar excepción.
- **NT-01**: `parseConfig({})` lanza `ZodError`; el mensaje menciona `DATABASE_URL` como campo requerido faltante.
- **NT-02**: `parseConfig({ ...validEnv, LLM_PROVIDER: 'gpt4' })` lanza `ZodError`; el mensaje menciona los valores admitidos `['openai', 'mock', 'anthropic']`.
- **NT-03 (adicional)**: `parseConfig({ ...validEnv, PORT: 'abc' })` lanza `ZodError` para PORT no numérico.

##### Exclude

- Tests de `server.ts` (arranque del proceso completo) — requieren mocking de `prisma.$connect`.
- Tests de Supertest sobre el servidor (son integration tests, ver QA-002).

#### Implementation Notes

- `parseConfig` debe ser importable directamente sin side effects: `import { parseConfig } from '../config/env'`.
- El `validEnv` para los tests puede definirse como constante en el archivo de test con todas las variables mínimas requeridas.
- No usar `process.env` directamente en los tests — pasar el objeto directamente a `parseConfig` para aislamiento.
- Herramienta: Vitest.

#### Acceptance Criteria Covered

AC-03, EC-01, EC-02.

#### Definition of Done

- [ ] TS-03 pasa: `parseConfig(validEnv)` retorna objeto tipado.
- [ ] NT-01 pasa: lanza error con mención de `DATABASE_URL`.
- [ ] NT-02 pasa: lanza error con mención de `LLM_PROVIDER` y valores admitidos.
- [ ] `vitest run` verde para todos los tests del módulo.

---

### TASK-PB-P0-002-US-089-QA-002 — Tests de integración Supertest: `GET /health`

| Campo | Valor |
|---|---|
| Área | QA / Testing |
| Tipo | Test |
| Prioridad | Must |
| Estimado | S |
| Depends On | TASK-PB-P0-002-US-089-BE-003 |
| Source AC(s) | AC-02, SEC-01, SEC-04 |
| Technical Spec Section(s) | §13 Testing Strategy (Integration Tests), §9 API Contract Design |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | QA / Backend |
| Status | To Do |

#### Objective

Implementar los tests de integración que verifican el endpoint `GET /health` usando Supertest sobre el `app` exportado de `src/app.ts`.

#### Scope

##### Include

- **TS-02**: `GET /health` responde `200 OK` con body `{ status: 'ok', version: string, uptimeMs: number }`. Assert: `res.status === 200`, `res.body.status === 'ok'`, `typeof res.body.uptimeMs === 'number'`.
- **AUTH-TS-01**: `GET /health` sin cabecera `Authorization` responde `200 OK` (confirmación de endpoint público).
- **SEC-04 check**: `GET /health` response incluye headers de Helmet (`x-content-type-options`, `x-frame-options`).
- Setup: importar `app` de `src/app.ts` y usar `supertest(app)`.

##### Exclude

- Tests de `server.ts` directamente (arranca proceso completo con `listen`).
- Tests de rutas `/api/v1` que no existen en esta US.

#### Implementation Notes

- `import app from '../src/app'` — no llamar `listen`.
- `const res = await request(app).get('/health')`.
- Las variables de entorno para los tests se cargan desde `.env.test` o se definen en `vitest.config.ts` con `env`.
- Herramientas: Vitest + Supertest.

#### Acceptance Criteria Covered

AC-02, SEC-01, SEC-04.

#### Definition of Done

- [ ] TS-02 pasa: `GET /health` → 200 con `{ status: 'ok', version, uptimeMs }`.
- [ ] AUTH-TS-01 pasa: sin `Authorization` header → 200 OK.
- [ ] Headers de Helmet presentes en la respuesta.
- [ ] `vitest run` verde para todos los tests del módulo.

---

### TASK-PB-P0-002-US-089-QA-003 — Verificación CI: typecheck, lint y test scripts funcionales

| Campo | Valor |
|---|---|
| Área | QA / Testing |
| Tipo | Test |
| Prioridad | Must |
| Estimado | XS |
| Depends On | TASK-PB-P0-002-US-089-BE-001, TASK-PB-P0-002-US-089-QA-001, TASK-PB-P0-002-US-089-QA-002 |
| Source AC(s) | AC-01, AC-05 |
| Technical Spec Section(s) | §13 Testing Strategy (CI Checks) |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | QA / DevOps |
| Status | To Do |

#### Objective

Verificar en un entorno limpio que los tres scripts de CI (`typecheck`, `lint`, `test`) pasan sin errores como smoke test final de la US.

#### Scope

##### Include

- **TS-01**: `npm run typecheck` (`tsc --noEmit`) sin errores de tipo en toda la estructura `src/`.
- `npm run lint` sin errores en `src/`.
- `npm run test` (`vitest run`) con todos los tests verdes.
- Verificación en entorno limpio: `npm ci` (instalación limpia) seguido de los tres scripts.

##### Exclude

- Configuración de CI/CD pipeline (PB-P0-017) — esta tarea es solo verificación local.

#### Implementation Notes

- Esta tarea es el "smoke test" de integración de toda la US. Si pasa, la US está completa.
- La verificación puede hacerse en un PR check manual o como última tarea antes del sprint review.

#### Acceptance Criteria Covered

AC-01, AC-05.

#### Definition of Done

- [ ] `npm run typecheck` — exit code 0.
- [ ] `npm run lint` — exit code 0.
- [ ] `npm run test` — exit code 0, todos los tests verdes.
- [ ] Los tres scripts pasan en entorno limpio (después de `npm ci`).

---

### TASK-PB-P0-002-US-089-OBS-001 — Logs de bootstrap en `server.ts`

| Campo | Valor |
|---|---|
| Área | Observability / Audit |
| Tipo | Implementation |
| Prioridad | Should |
| Estimado | XS |
| Depends On | TASK-PB-P0-002-US-089-BE-004 |
| Source AC(s) | SEC-03 |
| Technical Spec Section(s) | §14 Observability & Audit (Logs) |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Asegurar que `server.ts` loguea los eventos de bootstrap necesarios para diagnóstico sin exponer PII ni secretos.

#### Scope

##### Include

- Log `info` cuando el servidor empieza a escuchar: `"Server listening on port ${PORT}"`.
- Log `info` cuando Prisma conecta: `"Database connection established"`.
- Log `error` a `stderr` cuando falla la configuración: `"[FATAL] Configuration error: <mensaje Zod>"` — sin valores de variables.
- Verificar que el mensaje de error de Zod **no incluye los valores** de las variables (solo los nombres de los campos).

##### Exclude

- Logger estructurado avanzado (JSON con campos normalizados) — eso es PB-P0-003.
- Correlation ID en logs de bootstrap — eso es US-091.

#### Implementation Notes

- `console.log` / `console.error` son suficientes en esta US per NFR-OBS-006 (stdout es suficiente).
- Si se verifica que `ZodError.message` o `ZodError.errors` exponen valores de env vars, se deben sanitizar antes del log.

#### Acceptance Criteria Covered

SEC-03 (logs sin PII ni secretos).

#### Definition of Done

- [ ] El servidor loguea el puerto al arrancar.
- [ ] El servidor loguea confirmación de conexión Prisma.
- [ ] Los logs de error de config no exponen valores de secretos.

---

### TASK-PB-P0-002-US-089-DOC-001 — Agregar `ADR-SEC-005` al campo `Related ADR(s)` en Traceability de US-089

| Campo | Valor |
|---|---|
| Área | Documentation / Traceability |
| Tipo | Documentation |
| Prioridad | Could |
| Estimado | XS |
| Depends On | — |
| Source AC(s) | SEC-02 |
| Technical Spec Section(s) | §16 Documentation Alignment Required |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | Tech Lead / QA |
| Status | To Do |

#### Objective

Corregir la minor note del Approval Gate: `ADR-SEC-005` (secrets solo en env vars / Secrets Manager) está referenciado en `SEC-02` del cuerpo de la US pero ausente en la tabla `Related ADR(s)` de Traceability.

#### Scope

##### Include

- Agregar `ADR-SEC-005` al campo `Related ADR(s)` en la sección `Traceability` del archivo `management/user-stories/US-089-bootstrap-node-express-ts.md`.

##### Exclude

- Modificar cualquier otro campo de la US.
- Crear nueva ADR.

#### Implementation Notes

El campo `Related ADR(s)` actual es: `ADR-ARCH-001, ADR-ARCH-002, ADR-BE-001, ADR-SEC-006`. Debe quedar: `ADR-ARCH-001, ADR-ARCH-002, ADR-BE-001, ADR-SEC-005, ADR-SEC-006`.

#### Acceptance Criteria Covered

SEC-02.

#### Definition of Done

- [ ] `ADR-SEC-005` aparece en `Related ADR(s)` en la tabla Traceability de US-089.

---

### TASK-PB-P0-002-US-089-DOC-002 — Documentation Alignment: actualizar `/healthz` → `GET /health` en artefactos del backlog

| Campo | Valor |
|---|---|
| Área | Documentation / Traceability |
| Tipo | Documentation |
| Prioridad | Could |
| Estimado | S |
| Depends On | — |
| Source AC(s) | — (non-blocking documentation alignment) |
| Technical Spec Section(s) | §16 Documentation Alignment Required |
| Backlog ID | PB-P0-002 |
| User Story ID | US-089 |
| Owner Role | Tech Lead / PO |
| Status | To Do |

#### Objective

Alinear los artefactos del Product Backlog que aún usan `/healthz` con la decisión formalizada de usar `GET /health` (per Doc 14 §8.3 y Doc 16 §180/192).

#### Scope

##### Include

- Actualizar `management/artifacts/4-Product-Backlog-Prioritized.md`: en el Acceptance Summary de PB-P0-002, cambiar `/healthz` → `GET /health`.
- Actualizar referencia a `/healthz` en PB-P0-015 (QA Tooling Setup) si aplica.
- Actualizar descripción del milestone R0 Foundation si referencia `/healthz`.

##### Exclude

- Modificar documentos de diseño técnico (Doc 14, Doc 16) — ya usan `GET /health` correctamente.
- Crear nueva ADR — la decisión ya está formalizada en el Decision Resolution artifact de US-089.

#### Implementation Notes

- Esta tarea no bloquea el desarrollo. Se puede realizar en cualquier momento del sprint.
- La decisión canónica es `GET /health` per Doc 14 §8.3 y Doc 16 §180/192.

#### Acceptance Criteria Covered

N/A (documentation alignment no bloqueante).

#### Definition of Done

- [ ] PB-P0-002 Acceptance Summary usa `GET /health`.
- [ ] PB-P0-015 referencia `GET /health` si aplicaba.
- [ ] R0 Foundation description usa `GET /health`.

---

## 7. Required QA Tasks

| Task ID | Test Type | Propósito |
|---|---|---|
| TASK-PB-P0-002-US-089-QA-001 | Unit Test (Vitest) | Validar comportamiento de `parseConfig()`: caso válido, fail-fast por variable ausente, fail-fast por enum inválido |
| TASK-PB-P0-002-US-089-QA-002 | Integration Test (Supertest + Vitest) | Verificar `GET /health` → 200 OK con response shape correcta y headers de Helmet |
| TASK-PB-P0-002-US-089-QA-003 | CI / Build Check | Confirmar que `typecheck`, `lint` y `test` pasan en entorno limpio |

---

## 8. Required Security Tasks

| Task ID | Security Concern | Propósito |
|---|---|---|
| TASK-PB-P0-002-US-089-SEC-001 | `.env.example` sin secretos reales | Prevenir commit accidental de credentials o API keys |
| TASK-PB-P0-002-US-089-SEC-002 | Helmet activo por defecto | Confirmar security headers desde el primer arranque del servidor |

---

## 9. Required Seed / Demo Tasks

No aplica — US-089 no crea ni requiere datos de seed.

---

## 10. Observability / Audit Tasks

| Task ID | Concern | Propósito |
|---|---|---|
| TASK-PB-P0-002-US-089-OBS-001 | Logs de bootstrap | Confirmar que el servidor loguea arranque/error sin exponer secretos |

---

## 11. Documentation / Traceability Tasks

| Task ID | Documento / Artefacto | Propósito |
|---|---|---|
| TASK-PB-P0-002-US-089-DOC-001 | `US-089-bootstrap-node-express-ts.md` | Agregar `ADR-SEC-005` al campo `Related ADR(s)` (minor note Approval Gate) |
| TASK-PB-P0-002-US-089-DOC-002 | `4-Product-Backlog-Prioritized.md`, PB-P0-015, R0 Foundation | Alinear `/healthz` → `GET /health` en artefactos del backlog |

---

## 12. Dependency Graph

```mermaid
flowchart TD
  BE001[BE-001: Init project] --> BE002[BE-002: config/env.ts]
  BE001 --> BE003[BE-003: app.ts]
  BE001 --> OPS002[OPS-002: Scripts CI]
  BE002 --> BE003
  BE002 --> BE004[BE-004: server.ts]
  BE002 --> OPS001[OPS-001: .env.example]
  BE002 --> QA001[QA-001: Unit tests config]
  BE003 --> BE004
  BE003 --> QA002[QA-002: Integration tests health]
  BE003 --> SEC002[SEC-002: Helmet check]
  BE004 --> OBS001[OBS-001: Bootstrap logs]
  OPS001 --> SEC001[SEC-001: .env.example sin secretos]
  QA001 --> QA003[QA-003: CI smoke test]
  QA002 --> QA003
  OPS002 --> QA003
```

---

## 13. Suggested Implementation Order

### Phase 1 — Foundation (prerequisito bloqueante)

1. **TASK-BE-001** — Inicializar proyecto: `package.json`, `tsconfig.json`, `.eslintrc.js`, `vitest.config.ts`.
2. **TASK-OPS-002** — Configurar scripts de CI.

### Phase 2 — Core Implementation

3. **TASK-BE-002** — `src/config/env.ts` con Zod schema y `parseConfig()`.
4. **TASK-BE-003** — `src/app.ts`: Express factory, `GET /health`, middlewares stub.
5. **TASK-BE-004** — `src/server.ts`: bootstrap del proceso.
6. **TASK-OPS-001** — `.env.example` con todas las variables.

### Phase 3 — Testing / Security

7. **TASK-QA-001** — Tests unitarios de `config/env.ts`.
8. **TASK-QA-002** — Tests de integración Supertest: `GET /health`.
9. **TASK-SEC-001** — Verificar `.env.example` sin secretos.
10. **TASK-SEC-002** — Verificar Helmet activo.
11. **TASK-OBS-001** — Logs de bootstrap.

### Phase 4 — Verification / Documentation

12. **TASK-QA-003** — CI smoke test: `typecheck`, `lint`, `test` en entorno limpio.
13. **TASK-DOC-001** — Agregar `ADR-SEC-005` a Traceability de US-089.
14. **TASK-DOC-002** — Documentation alignment: `/healthz` → `GET /health`.

---

## 14. Risks & Mitigations

| Riesgo | Impacto | Mitigación | Related Task |
|---|---|---|---|
| `app.ts` llama `app.listen` directamente — rompe tests Supertest | Alto | Separación obligatoria server.ts/app.ts; verificar en QA-002 | TASK-BE-003, TASK-QA-002 |
| `tsconfig.json` sin strict mode — deuda técnica propagada a todo el proyecto | Alto | TS-01 en CI; PR check explícito de `strict: true` | TASK-BE-001, TASK-QA-003 |
| `.env.example` desactualizado respecto al schema Zod | Medio | Script CI de comparación; DOC-002 | TASK-OPS-001, TASK-SEC-001 |
| Prisma `$connect()` falla en CI por `DATABASE_URL` no disponible | Bajo | En tests, mockear `prisma.$connect()` o usar `.env.test` con URL de test | TASK-BE-004 |

---

## 15. Out of Scope Confirmation

Los siguientes items **no deben implementarse** como parte de US-089:

- Estructura de módulos de dominio bajo `src/modules/` → US-090.
- Pipeline completo de middlewares → US-091.
- Schema Prisma ni migraciones → PB-P0-001.
- Swagger UI / OpenAPI docs (`GET /docs`) → opcional, no en P0.
- CI/CD pipeline → PB-P0-017.
- Dockerfile → PB-P0-016.
- Cualquier endpoint funcional bajo `/api/v1` → feature stories.
- Lógica de autenticación, RBAC o ownership → US-091 / feature stories.

---

## 16. Readiness for Sprint Planning

| Check | Status |
|---|---|
| Product Backlog mapping found | Pass |
| Every AC maps to tasks | Pass |
| Technical Spec used when available | Pass |
| QA tasks included | Pass |
| Security tasks included if applicable | Pass |
| Seed/demo tasks included if applicable | N/A |
| Observability tasks included if applicable | Pass |
| Documentation tasks included if applicable | Pass |
| Task dependencies clear | Pass |
| Tasks small enough | Pass — máximo M; ninguna tarea L |
| Ready for Sprint Planning | Yes |

---

## 17. Final Recommendation

**Ready for Sprint Planning**

Las 14 tareas cubren completamente el scope de US-089: inicialización del proyecto con strict TypeScript, validación Zod de configuración con fail-fast, Express factory con `GET /health` exportable para Supertest, bootstrap del proceso con manejo de errores fatales, `.env.example` completo sin secretos, y los tres scripts de CI funcionales.

Todas las decisiones ya están formalizadas (US-089 Decision Resolution: `GET /health` como nombre canónico, NFR IDs correctos, scope de Prisma, scope de middlewares, response shape). No hay ambigüedades que requieran clarificación antes del sprint.

Las tareas de documentación (DOC-001, DOC-002) tienen prioridad `Could` y no bloquean el desarrollo funcional. Pueden ejecutarse en cualquier momento del sprint o en el sprint de mantenimiento.
