# Technical Specification — US-089: Inicializar proyecto Node + Express + TypeScript

## 1. Metadata

| Campo | Valor |
|---|---|
| User Story ID | US-089 |
| Source User Story | `management/user-stories/US-089-bootstrap-node-express-ts.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-089-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-002 |
| Backlog Title | Inicializar backend Node + Express + TypeScript con arquitectura Clean/Hexagonal |
| Backlog Execution Order | 2 (segundo ítem P0 tras PB-P0-001 — Database Schema) |
| User Story Position in Backlog Item | 1 de 3 (US-089 → US-090 → US-091) |
| Related User Stories in Backlog Item | US-089, US-090, US-091 |
| Epic | EPIC-BE-001 — Backend Modular Monolith |
| Backlog Item Dependencies | — (sin dependencias; PB-P0-002 puede iniciarse en paralelo con PB-P0-001) |
| Feature | Bootstrap del backend |
| Module / Domain | Platform/BE |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-11 |
| Last Updated | 2026-06-11 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P0-002 — Backend Modular Monolith Bootstrap**

Bootstrap del servidor Express, estructura feature-first con capas `Interface/Application/Domain/Ports/Infrastructure`, configuración por env vars, shared kernel y pipeline base de middlewares. Este ítem es el backbone técnico del backend; sin él no existe ningún endpoint REST del MVP.

Comprende tres User Stories ejecutadas en secuencia:

| US | Título | Rol |
|---|---|---|
| US-089 | Bootstrap Node + Express + TypeScript | Servidor compilable + `GET /health` + config Zod |
| US-090 | Estructura feature-first + Clean/Hex | 16 módulos + 5 capas + shared kernel + ESLint boundaries |
| US-091 | Pipeline de middlewares global | 14 middlewares transversales (auth, RBAC, ownership, captcha, rate limit, etc.) |

### Execution Order Rationale

PB-P0-002 no tiene dependencias declaradas, por lo que puede iniciarse en paralelo con PB-P0-001 (Database Schema). Sin embargo, en la práctica se recomienda iniciar PB-P0-002 antes o simultáneamente: el proyecto Node debe existir para poder aplicar las migraciones Prisma de PB-P0-001 sobre él. US-089 es la primera US del item y es prerequisito bloqueante para US-090 y US-091.

**Orden sugerido dentro del backlog item:**

```
US-089 (esta US) → US-090 → US-091
```

US-090 requiere el proyecto compilable de US-089. US-091 requiere la estructura de `src/shared/interface/middlewares/` creada en US-090.

### Related User Stories in Same Backlog Item

| User Story | Rol en el Backlog Item | Orden sugerido |
|---|---|---|
| **US-089** (esta US) | Servidor Express inicializado, config Zod, `GET /health` | 1 |
| US-090 | Estructura de 16 módulos + shared kernel + ESLint import boundaries | 2 |
| US-091 | Pipeline de 14 middlewares transversales de seguridad | 3 |

---

## 3. Executive Technical Summary

US-089 establece la **foundation técnica ejecutable del monolito modular de EventFlow MVP**. Su único propósito es producir un servidor Node.js + Express + TypeScript que:

1. Compile sin errores con TypeScript strict mode activado.
2. Arranque de forma segura validando toda la configuración de env vars con Zod antes de montar cualquier ruta o conectar a la base de datos.
3. Exponga un único endpoint público `GET /health` que confirme que el servidor está vivo.
4. Documumente todas las variables de entorno requeridas en `.env.example`.
5. Tenga los scripts de CI (`typecheck`, `lint`, `test`) funcionales desde el primer día.

El servidor no implementa ningún módulo de dominio ni el pipeline de middlewares completo en esta US — eso es responsabilidad de US-090 y US-091 respectivamente. Los middlewares se registran como stubs vacíos para que el servidor compile y arranque limpiamente.

Este trabajo establece la base sobre la que todo el backend del MVP se construirá. Un error en la configuración de TypeScript strict mode o en la validación de config aquí propagaría deuda técnica a todas las historias subsecuentes.

---

## 4. Scope Boundary

### In Scope

- Inicialización del proyecto Node.js con `package.json`, TypeScript y dependencias base.
- Configuración de `tsconfig.json` con `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`.
- Archivo `src/server.ts`: bootstrap del proceso (carga config, invoca `prisma.$connect()` stub, llama `app.listen(PORT)`).
- Archivo `src/app.ts`: Express factory (registra middlewares stub, monta rutas vacías `/api/v1`, exporta `app` para Supertest).
- Archivo `src/config/env.ts`: schema Zod con todas las variables de entorno requeridas; lanza excepción con mensaje descriptivo si falta una variable — fail-fast antes de montar rutas.
- Endpoint `GET /health`: público, sin autenticación, sin prefijo `/api/v1`, responde `{ status: "ok", version: string, uptimeMs: number }`.
- Archivo `.env.example`: todas las variables documentadas con nombre y formato, sin valores reales.
- Scripts en `package.json`: `build`, `start`, `dev`, `typecheck`, `lint`, `test`.
- Instalación de Prisma Client; `prisma.$connect()` stub en `server.ts`.
- ESLint configurado (regla de import boundaries es responsabilidad de US-090).

### Out of Scope

- Estructura de módulos de dominio (US-090).
- Pipeline completo de middlewares (US-091).
- Migraciones de base de datos y schema Prisma (US separada de infraestructura DB).
- Swagger UI / OpenAPI docs (`GET /docs` con `OPENAPI_ENABLED=true` — opcional, no en P0).
- CI/CD pipeline (PB-P0-017).
- Dockerfile (PB-P0-016).
- Cualquier lógica de feature, entidad de dominio o use case.

### Explicit Non-Goals

- No implementar autenticación ni RBAC en esta US.
- No crear ningún endpoint bajo `/api/v1` que sea funcional (stubs o vacíos únicamente).
- No aplicar migraciones ni conectar a PostgreSQL real (stub de `$connect()` es suficiente).
- No hacer que `GET /health` requiera autenticación o rate limit estricto.

---

## 5. Architecture Alignment

### Backend Architecture

**Express factory pattern** — separar `server.ts` (bootstrap del proceso, side effects, `listen`) de `app.ts` (factory de Express, sin side effects, exportable para Supertest) es el patrón establecido en Doc 14 §8.1. Esta separación es obligatoria y no debe romperse.

**TypeScript strict mode** — ADR-BE-001 establece `strict: true` como configuración base. Los flags adicionales (`noUncheckedIndexedAccess`, `noImplicitOverride`) están en Doc 14 §24.3 y se habilitan en esta US como base permanente.

**Fail-fast config** — La validación Zod en `config/env.ts` debe ejecutarse como primer paso del bootstrap, antes de `app.listen`, antes de `prisma.$connect()`, y antes de cualquier registro de rutas. Si falla, el proceso debe salir con exit code distinto de 0 y mensaje descriptivo.

**Prisma stub** — Prisma Client se instala como dependencia pero su schema y migraciones pertenecen a otra US. El `$connect()` en `server.ts` valida que la integración existe, pero en tests puede ser mockeado.

### Frontend Architecture

No aplica — US-089 es exclusivamente backend.

### Database Architecture

No aplica directamente. Prisma Client se instala pero no se crea ningún schema ni migración. `DATABASE_URL` es una variable requerida en `config/env.ts` (el servidor falla si no está presente), pero la conexión real a PostgreSQL se verifica en las migraciones de PB-P0-001.

### API Architecture

`GET /health` es el único endpoint real de esta US:
- **No versionado**: no está bajo `/api/v1` (Doc 16 §180: "El health check no se versiona").
- **Público**: sin autenticación ni rate limit estricto.
- **Response shape**: `{ "status": "ok", "version": string, "uptimeMs": number }` per Doc 16 §192.
- **Registrado en**: `src/app.ts` directamente, fuera del router de `/api/v1`.

### AI / PromptOps Architecture

No aplica. `LLM_PROVIDER` es una variable de env validada por Zod (`.enum(['openai', 'mock', 'anthropic'])`), pero no se instancia ningún provider en esta US.

### Security Architecture

Controles activos desde el primer arranque:
- **Helmet**: `HELMET_ENABLED=true` por defecto en `app.ts`; headers de seguridad activos desde el primer request.
- **Secrets en env vars**: `JWT_SECRET`, `CAPTCHA_SECRET`, `OPENAI_API_KEY` y todas las claves solo en variables de entorno; `.env.example` sin valores reales (ADR-SEC-005, NFR-SEC-008).
- **Logs sin PII**: el logger de arranque no debe incluir valores de variables de entorno, contraseñas ni tokens (NFR-OBS-006).
- **`GET /health` público**: sin auth, sin rate limit estricto — no expone datos sensibles, solo estado operacional.

### Testing Architecture

- **Vitest**: test runner base; configurado en `package.json` script `test`.
- **Supertest**: importa `app` de `src/app.ts` para tests de integración sin `listen`. Esto requiere que `app.ts` exporte `app` sin llamar `listen`.
- **tsc**: `typecheck` script usa `tsc --noEmit` para validar tipos sin compilar.
- **Tests de config (unit)**: probar directamente la función de validación Zod con entradas válidas e inválidas (sin necesidad de arrancar el proceso completo).

---

## 6. Functional Interpretation

| Acceptance Criterion | Interpretación Técnica | Capa(s) Impactada(s) |
|---|---|---|
| **AC-01**: `tsc --noEmit` sin errores con strict mode | `tsconfig.json` debe incluir `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`. El script `typecheck` ejecuta `tsc --noEmit`. | Config (`tsconfig.json`) |
| **AC-02**: Servidor arranca y `GET /health` responde 200 OK | `src/app.ts` registra `GET /health` fuera de `/api/v1`. Handler retorna `{ status: "ok", version: process.env.npm_package_version \|\| "0.0.0", uptimeMs: Math.floor(process.uptime() * 1000) }` con HTTP 200. `src/server.ts` llama `app.listen(config.PORT)`. | `src/app.ts`, `src/server.ts` |
| **AC-03**: Config Zod al arranque | `src/config/env.ts` define un `z.object({...})` con todas las variables. Exporta una función que parsea `process.env` y lanza `ZodError` con mensaje descriptivo si falla. Se invoca como primera línea de `server.ts` antes de cualquier otra inicialización. | `src/config/env.ts` |
| **AC-04**: `.env.example` con todas las variables | Archivo `.env.example` en la raíz del repositorio con todas las variables categorizadas (APP, DATABASE, AUTH, AI, SECURITY, STORAGE, LOGGING, SEED) per Doc 14 §27. Sin valores reales ni secretos. | `.env.example` (config/infra) |
| **AC-05**: Scripts `typecheck`, `lint`, `test` pasan sin errores | `package.json` con scripts: `"typecheck": "tsc --noEmit"`, `"lint": "eslint src/ --ext .ts"`, `"test": "vitest run"`. Los tres deben pasar en entorno limpio con `.env` válido. | `package.json`, `.eslintrc.js` |
| **EC-01**: Variable requerida ausente → fail-fast | Zod `.parse(process.env)` en `config/env.ts` lanza `ZodError`. `server.ts` captura el error, imprime el mensaje descriptivo a stderr y llama `process.exit(1)`. Esto ocurre antes de `app.listen` y antes de `prisma.$connect()`. | `src/config/env.ts`, `src/server.ts` |
| **EC-02**: `LLM_PROVIDER` inválido → fail-fast | Schema Zod incluye `LLM_PROVIDER: z.enum(['openai', 'mock', 'anthropic'])`. Si el valor no está en el enum, el error de Zod incluye los valores admitidos. | `src/config/env.ts` |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

US-089 no crea módulos de bounded context (eso es US-090). Opera exclusivamente en la capa de plataforma:

```
src/
├── server.ts           # Bootstrap del proceso
├── app.ts              # Express factory
└── config/
    └── env.ts          # Zod config validation
```

### Use Cases / Application Services

No aplica. US-089 no implementa use cases.

### Controllers / Routes

**`GET /health`**

Registrado directamente en `app.ts` fuera del router de `/api/v1`:

```
GET /health → healthHandler (inline o función separada en app.ts)
```

- Handler: sincrónico, sin acceso a base de datos.
- Response: `{ "status": "ok", "version": string, "uptimeMs": number }`.
- HTTP 200 siempre (si el servidor está vivo, el endpoint responde; si no lo está, no hay respuesta).

**Router `/api/v1`**

Montado en `app.ts` como router vacío en esta US. Las rutas reales se agregan en US-090/091 y feature stories subsecuentes.

### DTOs / Schemas

**Config schema (`src/config/env.ts`)**

Categorías de variables per Doc 14 §27:

| Categoría | Variables clave |
|---|---|
| APP | `PORT` (z.coerce.number().int().positive()), `NODE_ENV` (z.enum(['development','test','production'])) |
| DATABASE | `DATABASE_URL` (z.string().url()) |
| AUTH | `JWT_SECRET` (z.string().min(32)), `JWT_EXPIRES_IN` (z.string().default('7d')) |
| AI | `LLM_PROVIDER` (z.enum(['openai','mock','anthropic'])), `OPENAI_API_KEY` (z.string().optional()) |
| SECURITY | `CORS_ORIGINS` (z.string()), `CAPTCHA_PROVIDER` (z.enum(['recaptcha','mock'])), `HELMET_ENABLED` (z.coerce.boolean().default(true)), `RATE_LIMIT_MAX` (z.coerce.number().default(100)), `RATE_LIMIT_WINDOW_MS` (z.coerce.number().default(60000)) |
| LOGGING | `LOG_LEVEL` (z.enum(['debug','info','warn','error']).default('info')) |
| SEED | `SEED_ENABLED` (z.coerce.boolean().default(false)) |

El schema exporta un tipo `AppConfig` inferido de Zod (`z.infer<typeof configSchema>`) para uso tipado en el resto del código.

**Health response**

No requiere Zod schema — es un objeto literal simple retornado directamente en el handler.

### Repository / Persistence

No aplica. Prisma Client se instala como dependencia pero el schema se define en PB-P0-001. `server.ts` invoca `prisma.$connect()` para verificar que la integración del cliente existe; en tests unitarios este método es mockeado.

### Validation Rules

| Regla | Implementación |
|---|---|
| `PORT` es número entero positivo | `z.coerce.number().int().positive()` en config schema |
| `LLM_PROVIDER` ∈ {'openai','mock','anthropic'} | `z.enum(['openai','mock','anthropic'])` |
| `JWT_SECRET` mínimo 32 caracteres | `z.string().min(32)` |
| `DATABASE_URL` es URL válida | `z.string().url()` |
| Variables opcionales con defaults | `.default(value)` en Zod — no fallan si ausentes |

### Error Handling

En esta US, el único manejo de errores relevante es el fail-fast de config:

```
server.ts:
  try {
    const config = loadConfig();   // lanza ZodError si inválido
    await prisma.$connect();
    app.listen(config.PORT, () => console.log(`Server listening on ${config.PORT}`));
  } catch (err) {
    console.error('[FATAL] Configuration error:', err.message);
    process.exit(1);
  }
```

El `errorHandlerMiddleware` completo es responsabilidad de US-091. En esta US, `app.ts` no registra ningún error handler avanzado — solo el mínimo para que el servidor compile.

### Transactions

No aplica.

### Observability

- **Logs de arranque**: `console.log` o logger básico con los eventos: servidor escuchando en PORT, Prisma conectado, error de configuración.
- **Correlation ID**: el middleware que genera el correlation ID es responsabilidad de US-091. En esta US, `app.ts` no registra el middleware de correlación (stub vacío es aceptable).
- **`GET /health`** no requiere logging estructurado en esta US.

---

## 8. Frontend Technical Design

No aplica — US-089 es exclusivamente backend.

---

## 9. API Contract Design

| Método | Endpoint | Propósito | Auth Requerida | Request | Response 200 | Error Cases |
|---|---|---|---|---|---|---|
| GET | `/health` | Health check operacional | No | — | `{ "status": "ok", "version": string, "uptimeMs": number }` | Si el servidor no está vivo, no hay respuesta (TCP reset) |

**Notas de contrato:**
- Endpoint **no versionado** (no bajo `/api/v1`).
- `version`: valor de `npm_package_version` del `package.json`.
- `uptimeMs`: `Math.floor(process.uptime() * 1000)` al momento del request.
- No requiere cabecera `Authorization`.
- No incluye `correlationId` en la respuesta (el middleware de correlación es US-091).

---

## 10. Database / Prisma Design

No aplica directamente en esta US.

**Nota**: Prisma Client (`@prisma/client`) se instala como dependencia de producción. `prisma` como `devDependency`. No se crea ningún `schema.prisma` ni migración — eso pertenece a PB-P0-001. `prisma.$connect()` en `server.ts` es un stub que verifica la integración del cliente; puede ser mockeado en tests.

---

## 11. AI / PromptOps Design

No aplica — US-089 no invoca IA.

`LLM_PROVIDER` se valida como variable de entorno pero no se instancia ningún provider. El `AnthropicProvider` y el `MockAIProvider` son responsabilidad de PB-P0-009.

---

## 12. Security & Authorization Design

### Authentication

No aplica a `GET /health` — endpoint público sin autenticación requerida (Doc 14 §8.3, Doc 16 §180).

### Authorization

No aplica en esta US. `authMiddleware`, `roleMiddleware` y `ownershipMiddleware` son responsabilidad de US-091.

### Ownership Rules

No aplica.

### Role Rules

No aplica.

### Negative Authorization Scenarios

| Escenario | Comportamiento esperado |
|---|---|
| `GET /health` sin cabecera `Authorization` | 200 OK — endpoint público, no requiere token |

### Audit Requirements

No aplica — `GET /health` no genera `AdminAction`.

### Sensitive Data Handling

| Control | Implementación |
|---|---|
| Secrets solo en env vars | `JWT_SECRET`, `CAPTCHA_SECRET`, `OPENAI_API_KEY` solo en `process.env`; validados por Zod pero nunca logueados |
| `.env.example` sin secretos | Archivo con nombres de variables y formatos; sin valores reales |
| Logs de arranque sin PII | `console.log` y errores de Zod solo exponen nombres de variables faltantes, no sus valores |
| Helmet activo desde primer arranque | `app.ts` registra `helmet()` antes del router `/api/v1`; configurable vía `HELMET_ENABLED` |

---

## 13. Testing Strategy

### Unit Tests

**`config/env.ts` — validación Zod**

| ID | Escenario | Herramienta | Técnica |
|---|---|---|---|
| TS-03 | `.env` completo válido → config object tipado sin error | Vitest | Pasar objeto con todas las vars requeridas directamente a `configSchema.parse()` |
| NT-01 | `DATABASE_URL` ausente → ZodError con mensaje descriptivo | Vitest | Pasar objeto sin `DATABASE_URL`; assert que lanza y que el mensaje menciona el campo |
| NT-02 | `LLM_PROVIDER='invalid'` → ZodError con valores admitidos | Vitest | Pasar `{ LLM_PROVIDER: 'gpt4' }`; assert que el error menciona `['openai','mock','anthropic']` |

**Nota de implementación**: los tests de config no deben arrancar el proceso completo. La función de validación debe ser exportable y testeable de forma aislada:

```typescript
// config/env.ts exporta:
export function parseConfig(env: NodeJS.ProcessEnv): AppConfig { ... }

// tests:
import { parseConfig } from '../config/env';
test('NT-01', () => { expect(() => parseConfig({})).toThrow(); });
```

### Integration Tests

**`app.ts` — health endpoint con Supertest**

| ID | Escenario | Herramienta | Técnica |
|---|---|---|---|
| TS-02 | `GET /health` → 200 OK con `{ status, version, uptimeMs }` | Supertest + Vitest | Importar `app` de `src/app.ts` (sin `listen`); usar `request(app).get('/health')` |
| AUTH-TS-01 | `GET /health` sin header `Authorization` → 200 OK | Supertest + Vitest | Mismo test, verificar que no hay error 401 |

**Setup de Supertest**: `app.ts` debe exportar `app` sin llamar `app.listen`. Supertest abre internamente un servidor efímero:

```typescript
// test:
import app from '../src/app';
import request from 'supertest';
const res = await request(app).get('/health');
expect(res.status).toBe(200);
expect(res.body).toMatchObject({ status: 'ok' });
expect(typeof res.body.uptimeMs).toBe('number');
```

### API Tests

Cubiertos por los Integration Tests con Supertest.

### E2E Tests

No aplica en esta US — no hay flujos de usuario que testear.

### Security Tests

| Check | Herramienta |
|---|---|
| `.env.example` no contiene valores reales ni secrets | CI lint script (`grep -E '(SECRET|PASSWORD|KEY)\s*=\s*[^ #]'` en `.env.example` → debe ser vacío) |
| `GET /health` sin `Authorization` → 200 (no aplica auth) | Supertest (ya cubierto en AUTH-TS-01) |

### Accessibility Tests

No aplica — no hay UI.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica en esta US.

### CI Checks

| Check | Comando | Pasa si |
|---|---|---|
| TypeScript strict | `tsc --noEmit` | Sin errores de tipo |
| Lint | `eslint src/ --ext .ts` | Sin errores de lint |
| Tests | `vitest run` | Todos los tests pasan |
| `.env.example` completo | Script CI que verifica que todas las vars del config schema están en `.env.example` | Ninguna var faltante |

---

## 14. Observability & Audit

### Logs

| Evento | Nivel | Contenido |
|---|---|---|
| Servidor listo | `info` | `"Server listening on port ${PORT}"` |
| Prisma conectado | `info` | `"Database connection established"` |
| Error de configuración | `error` (stderr) | `"[FATAL] Configuration error: <mensaje Zod sin valores de secretos>"` |

**Formato**: `console.log/error` en esta US. El logger estructurado completo (`requestLoggerMiddleware`) es responsabilidad de US-091 y PB-P0-003.

### Correlation ID

Stub en esta US. El `correlationIdMiddleware` que genera y propaga el UUID se implementa en US-091.

### AdminAction

No aplica.

### Error Tracking

No aplica en esta US. El `errorHandlerMiddleware` con error envelope completo es US-091.

### Metrics

No aplica en MVP. `uptimeMs` en `GET /health` es el único indicador de health expuesto.

---

## 15. Seed / Demo Data Impact

No aplica — US-089 no crea ni requiere datos de seed.

---

## 16. Documentation Alignment Required

| Documento / Fuente | Conflicto | Decisión vigente | Acción recomendada | ¿Bloquea implementación? |
|---|---|---|---|---|
| PB-P0-002 Acceptance Summary (`management/artifacts/4-Product-Backlog-Prioritized.md`) | Menciona `/healthz` en lugar de `GET /health` | `GET /health` per Doc 14 §8.3 y Doc 16 §180/192 — formalizado en US-089 Decision Resolution | Actualizar Acceptance Summary de PB-P0-002 en próximo ciclo de mantenimiento de backlog | No |
| PB-P0-015 (QA Tooling Setup) | Referencia `/healthz` como endpoint de health para el container | `GET /health` | Actualizar referencia en PB-P0-015 | No |
| R0 Foundation milestone description | "Backend con `/healthz` operativo" | `GET /health` | Actualizar descripción del milestone | No |

---

## 17. Technical Risks & Mitigations

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `tsconfig.json` sin strict mode o con flags incorrectos genera deuda técnica propagada a todas las US subsecuentes | Alto | Validar con `tsc --noEmit` en CI desde el primer commit; hacer que el check falle si `strict` no está activo |
| `app.ts` llama `app.listen` directamente (en lugar de exportar `app`) impide los tests de integración con Supertest | Alto | Separación obligatoria `server.ts` (listen) / `app.ts` (factory exportable); validada en TS-02 |
| `config/env.ts` no falla en todos los casos de configuración inválida | Medio | Tests NT-01 y NT-02 son obligatorios; agregar un test que verifique que el proceso llama `process.exit(1)` |
| `.env.example` desactualizado respecto al schema Zod | Medio | Script CI que verifica que cada variable del config schema tiene entrada en `.env.example` |
| Prisma `$connect()` falla en CI si `DATABASE_URL` no está disponible | Bajo | En tests, mockear `prisma.$connect()` o usar `DATABASE_URL` de test en `.env.test` |
| `CAPTCHA_SECRET` o `JWT_SECRET` cortos no detectados | Bajo | Validación Zod con `.min(32)` en `JWT_SECRET` y min apropiado en `CAPTCHA_SECRET` |

---

## 18. Implementation Guidance for Coding Agents

### Archivos a crear

```
/                               # Raíz del proyecto
├── package.json                # Con scripts: build, start, dev, typecheck, lint, test
├── tsconfig.json               # strict:true + noUncheckedIndexedAccess + noImplicitOverride
├── .eslintrc.js                # ESLint base (import boundaries configurados en US-090)
├── .env.example                # Todas las variables per Doc 14 §27
├── vitest.config.ts            # Configuración de Vitest
└── src/
    ├── server.ts               # Bootstrap: loadConfig → $connect → listen
    ├── app.ts                  # Express factory: middlewares stub + GET /health + /api/v1 router
    └── config/
        └── env.ts              # Zod schema + parseConfig() exportable
```

### Orden de implementación recomendado

1. `package.json` con dependencias y scripts.
2. `tsconfig.json` con strict settings.
3. `src/config/env.ts` — schema Zod + `parseConfig()`.
4. `src/app.ts` — Express factory con `GET /health` y middlewares stub.
5. `src/server.ts` — bootstrap del proceso.
6. `.env.example` — todas las variables documentadas.
7. Tests: `env.test.ts` (NT-01, NT-02, TS-03), `health.test.ts` (TS-02, AUTH-TS-01).
8. `.eslintrc.js` base.
9. Verificar `tsc --noEmit`, `eslint src/`, `vitest run`.

### Decisiones que no deben reabrirse

| Decisión | Resolución formal |
|---|---|
| Nombre del health endpoint | `GET /health` (no `/healthz`) per Doc 14 §8.3 y Doc 16 §180/192 |
| Response shape de `GET /health` | `{ status: "ok", version: string, uptimeMs: number }` per Doc 16 §192 |
| Separación `server.ts` / `app.ts` | Obligatoria per Doc 14 §8.1 — no negociable |
| Strict mode | `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true` per ADR-BE-001 |
| Fail-fast config | Zod lanza antes de `listen` y antes de `prisma.$connect()` |
| Scope de Prisma | Solo `$connect()` stub; schema y migraciones en PB-P0-001 |
| Scope de middlewares | Solo stubs en esta US; implementación en US-091 |

### Lo que NO debe implementarse en esta US

- Módulos de bounded context bajo `src/modules/` (US-090).
- Implementación real de `authMiddleware`, `roleMiddleware`, `ownershipMiddleware` (US-091).
- Schema Prisma o migraciones.
- Swagger/OpenAPI UI.
- CI/CD pipeline ni Dockerfile.
- Lógica de negocio de ningún tipo.

### Supuestos a preservar

- `app.ts` exporta `app` (default export o named) sin llamar `listen`.
- `config/env.ts` exporta tanto el tipo `AppConfig` como la función `parseConfig(env)`.
- El logger en esta US es `console.log/error` — no implementar un logger estructurado complejo (eso es PB-P0-003).
- `GET /health` no consulta la base de datos (evitar latencia y dependencia de DB en health check básico).

---

## 19. Task Generation Notes

### Grupos de tareas sugeridos

**Grupo 1 — Inicialización del proyecto (prerequisito bloqueante)**
- Crear `package.json` con dependencias base.
- Configurar `tsconfig.json` con strict settings.
- Configurar `.eslintrc.js` base.
- Configurar `vitest.config.ts`.

**Grupo 2 — Config validation (prerequisito para server.ts)**
- Implementar `src/config/env.ts` con schema Zod y `parseConfig()`.
- Implementar tests unitarios: NT-01, NT-02, TS-03.

**Grupo 3 — Express factory y health endpoint**
- Implementar `src/app.ts` (Express factory, middlewares stub, `GET /health`, `/api/v1` router vacío).
- Implementar tests de integración: TS-02, AUTH-TS-01.

**Grupo 4 — Bootstrap del proceso**
- Implementar `src/server.ts` (loadConfig, $connect stub, listen).
- Smoke test de arranque local.

**Grupo 5 — Config y DevOps**
- Crear `.env.example` con todas las variables per Doc 14 §27.
- Verificar que los scripts `typecheck`, `lint`, `test` pasan (AC-05).
- Script CI para validar que `.env.example` está completo respecto al schema Zod.

### Tareas QA requeridas

- Test unitario de `parseConfig()` con input válido (TS-03).
- Test unitario de `parseConfig()` con `DATABASE_URL` ausente (NT-01).
- Test unitario de `parseConfig()` con `LLM_PROVIDER` inválido (NT-02).
- Test de integración Supertest: `GET /health` → 200 con response shape correcta (TS-02).
- Test de integración Supertest: `GET /health` sin `Authorization` → 200 (AUTH-TS-01).
- `tsc --noEmit` como check de CI (TS-01).

### Tareas de seguridad requeridas

- Verificar que `.env.example` no contiene valores reales (CI lint script o revisión en PR).
- Verificar que `Helmet` está activo en `app.ts` por defecto.

### Tareas de seed/demo

No aplica.

### Tareas de documentación

- Actualizar `PB-P0-002` Acceptance Summary con `GET /health` (reemplazar `/healthz`) en próximo ciclo de mantenimiento.
- Agregar `ADR-SEC-005` al campo `Related ADR(s)` en la Traceability de US-089 (minor note del Approval Gate).

### Dependencias entre tareas

```
Grupo 1 → Grupo 2 → Grupo 3 → Grupo 4 → Grupo 5
                               ↗
         Grupo 2 (config)  ───
```

Grupo 2 (config) debe estar completo antes de Grupo 4 (server.ts necesita `parseConfig()`). Grupo 3 (app.ts) puede desarrollarse en paralelo con Grupo 2 si se mockeea la config.

### Consolidación del backlog item

Una vez completadas las tareas de US-089, US-090 y US-091 del mismo backlog item PB-P0-002, se recomienda generar un `tasks.md` consolidado que verifique la integración completa:

```
management/technical-specs/P0/PB-P0-002/PB-P0-002-tasks.md
```

Este archivo consolidado debe incluir un smoke test de integración que arranque el servidor completo con los 14 middlewares de US-091 y verifique que `GET /health` responde correctamente.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story aprobada o explícitamente habilitada para draft spec | Pass — Approved with Minor Notes |
| Product Backlog mapping encontrado | Pass — PB-P0-002, posición 2, sin dependencias |
| Decision Resolution revisado si presente | Pass — 5 decisiones formalizadas, ninguna bloqueante |
| Scope claro | Pass — bootstrap + health + config Zod; sin lógica de feature |
| Architecture alignment claro | Pass — separación server.ts/app.ts, strict mode, Express factory |
| API impact claro | Pass — `GET /health` con response shape documentado |
| DB impact claro | Pass — solo instalación de Prisma client; sin schema ni migraciones |
| AI impact claro | N/A — no invoca IA |
| Security impact claro | Pass — helmet, secrets en env, logs sin PII, health público |
| Testing strategy clara | Pass — Vitest + Supertest; tests unitarios de config + tests de integración de health |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown**

US-089 tiene scope perfectamente delimitado, AC completamente testeables, decisiones técnicas derivadas de ADRs aceptados sin ambigüedades, y una separación de responsabilidades clara con US-090 y US-091. Los dos minor notes del Approval Gate (agregar `ADR-SEC-005` a Traceability y corregir el número de middlewares en Technical Notes de US-090) no afectan el scope de esta US y pueden resolverse durante el sprint de implementación.

El resultado entregable es un repositorio Node.js + Express + TypeScript compilable con `GET /health` operativo, `tsc --noEmit` sin errores, y los tres scripts de CI (`typecheck`, `lint`, `test`) verdes — base sobre la que se construyen US-090 y US-091.
