# Technical Specification — US-091: Pipeline de middlewares global (Express)

## 1. Metadata

| Campo | Valor |
|---|---|
| User Story ID | US-091 |
| Source User Story | `management/user-stories/US-091-middleware-pipeline.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-091-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-002 |
| Backlog Title | Inicializar backend Node + Express + TypeScript con arquitectura Clean/Hexagonal |
| Backlog Execution Order | 2 (tercer US del item; requiere US-089 y US-090 completadas) |
| User Story Position in Backlog Item | 3 de 3 (US-089 → US-090 → **US-091**) |
| Related User Stories in Backlog Item | US-089, US-090, US-091 |
| Epic | EPIC-BE-001 — Backend Modular Monolith |
| Backlog Item Dependencies | US-089 y US-090 completadas; stubs de `src/shared/interface/middlewares/` disponibles |
| Feature | Cadena de middlewares |
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

Bootstrap del servidor Express, estructura feature-first con capas `Interface/Application/Domain/Ports/Infrastructure`, configuración por env vars, shared kernel y pipeline base de middlewares.

US-091 es la tercera y última US del item. Implementa los 14 middlewares transversales que habilitan autenticación, RBAC, ownership, captcha, rate limiting, validación, correlación, logging y manejo seguro de errores para todos los endpoints del MVP.

### Execution Order Rationale

US-091 depende directamente de US-089 (servidor Express compilable) y de US-090 (estructura `src/shared/interface/middlewares/` con 14 archivos placeholder). Debe completarse como último paso de PB-P0-002 antes de que cualquier feature story implemente endpoints protegidos. Sin el pipeline de middlewares, ningún endpoint puede tener auth, RBAC, captcha ni rate limiting.

```
US-089 (bootstrap) → US-090 (estructura) → US-091 (esta US) → Feature stories
```

### Related User Stories in Same Backlog Item

| User Story | Rol en el Backlog Item | Orden sugerido |
|---|---|---|
| US-089 | Servidor Express compilable, config Zod, `GET /health` | 1 — prerequisito bloqueante |
| US-090 | 16 módulos + shared kernel + ESLint + placeholders de middlewares | 2 — prerequisito bloqueante |
| **US-091** (esta US) | Implementación real de los 14 middlewares transversales | 3 — completa el backbone de seguridad |

---

## 3. Executive Technical Summary

US-091 implementa el **stack completo de seguridad transversal del backend de EventFlow MVP**. Su resultado son los 14 middlewares registrados en `app.ts` en el orden exacto de Doc 14 §8.2, y disponibles como funciones reutilizables para las feature stories.

Los 14 middlewares se dividen en dos grupos:

**Middlewares globales** (registrados una vez en `app.ts` para todos los requests):

```
correlationIdMiddleware → requestLoggerMiddleware → jsonBodyParser →
corsMiddleware → helmet → rateLimitMiddleware →
router(/api/v1) → notFoundMiddleware → errorHandlerMiddleware
```

**Middlewares por ruta** (aplicados en las feature stories a rutas específicas):
```
authMiddleware → captchaVerificationMiddleware → roleMiddleware →
ownershipMiddleware → validateRequestMiddleware → fileUploadMiddleware
```

Una vez completada esta US, todas las feature stories del MVP pueden aplicar los middlewares pertinentes a sus rutas sin re-implementar lógica transversal de seguridad.

---

## 4. Scope Boundary

### In Scope

- Implementación de los 14 middlewares en `src/shared/interface/middlewares/` (reemplazando los stubs de US-090).
- Registro de middlewares globales en `app.ts` en el orden exacto de Doc 14 §8.2.
- `correlationIdMiddleware`: genera UUID o reutiliza `x-correlation-id` header; propaga a `req.correlationId`.
- `requestLoggerMiddleware`: log estructurado con `correlationId`, método, path, status, duración; sin `Authorization` ni secrets en logs.
- `jsonBodyParser`: parseo de body JSON con `JSON_BODY_LIMIT` configurable (default `1mb`).
- `corsMiddleware`: allowlist explícita desde `CORS_ORIGINS`; sin wildcard `*` con credenciales.
- `helmet`: security headers por defecto; toggleable con `HELMET_ENABLED`.
- `rateLimitMiddleware`: rate limit global laxo configurable (`RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS`); rate limit estricto en endpoints `/auth/*`.
- `authMiddleware`: verifica JWT firmado con `JWT_SECRET`; popula `req.user = { id, role }`; `401` si ausente o inválido.
- `captchaVerificationMiddleware`: verifica `captchaToken`; acepta `'__test__'` en modo mock (`CAPTCHA_PROVIDER=mock`); `400` si inválido.
- `roleMiddleware(roles[])`: verifica `req.user.role` contra roles permitidos; `403` si no coincide.
- `ownershipMiddleware(resolver)`: resuelve propietario del recurso vía resolver inyectable; `404 enmascarado` si no es propietario.
- `validateRequestMiddleware(schema)`: valida `req.body/params/query` con Zod schema; `400` con detalles si inválido.
- `fileUploadMiddleware`: MIME allow-list genérica + size limit configurable.
- `notFoundMiddleware`: `404` estructurado para rutas no registradas.
- `errorHandlerMiddleware`: error envelope `{ code, message, correlationId }` sin stack trace; mensajes genéricos en 5xx.
- Variables de entorno para el pipeline en `.env.example`: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `CORS_ORIGINS`, `HELMET_ENABLED`, `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET`, `JSON_BODY_LIMIT`.
- Tests: 15 test cases (6 funcionales + 9 negativos + 4 de autorización) con Vitest + Supertest.

### Out of Scope

- CSRF token de doble submit complejo (ADR-SEC-006 usa CORS + SameSite cookie en su lugar).
- APM, distributed tracing, ELK, OpenTelemetry (NFR-OBS-006: stdout es suficiente).
- Google OAuth (marcado Future en ADR-SEC-002 Addendum).
- Rate limit estricto específico por endpoint de auth (se configura en feature stories de `identity-access`).
- Tipos MIME específicos por flujo en `fileUploadMiddleware` (portafolio vendor, brief quote — se configuran en feature stories de `attachments`).
- Microservicios, brokers.

### Explicit Non-Goals

- No implementar la lógica de autorización de ningún recurso concreto (eso es responsabilidad de las feature stories con `ownershipMiddleware(resolver)` inyectado).
- No conectar `authMiddleware` al repositorio de usuarios — verifica JWT sin consultar base de datos.
- No implementar sesiones HTTP-only con cookies (la US usa Bearer token; las cookies HTTP-only son una decisión de PB-P0-006).
- No implementar `AdminAction` logging en esta US (eso pertenece a feature stories de admin).

---

## 5. Architecture Alignment

### Backend Architecture

**Express middleware chain** — todos los middlewares implementados en `src/shared/interface/middlewares/` siguiendo el patrón Express `(req, res, next)`. Los middlewares globales se registran en `app.ts` en el orden exacto de Doc 14 §8.2.

**Extensión del tipo `Request` de Express** — `authMiddleware` debe extender el tipo `Request` para incluir `req.user` y `req.correlationId` sin `as any`:

```typescript
// src/shared/interface/express.d.ts (o similar)
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: { id: string; role: string };
      validated?: { body?: unknown; params?: unknown; query?: unknown };
    }
  }
}
```

**`ownershipMiddleware` — patrón inyectable** — la resolución de ownership varía por recurso. El middleware recibe un `resolver` como parámetro:

```typescript
type OwnershipResolver = (req: Request) => Promise<boolean>;
ownershipMiddleware(resolver: OwnershipResolver): RequestHandler
```

Esta firma hace el middleware testeable con mocks y reutilizable por todas las feature stories.

**Separación global vs. por-ruta** — crítico para el orden correcto:
- Los middlewares globales se aplican a **todos los requests** vía `app.use()`.
- Los middlewares por-ruta (`authMiddleware`, `captchaVerificationMiddleware`, `roleMiddleware`, `ownershipMiddleware`, `validateRequestMiddleware`, `fileUploadMiddleware`) se aplican **solo a rutas específicas** en las feature stories.

### Frontend Architecture

No aplica.

### Database Architecture

`ownershipMiddleware` no consulta la base de datos directamente. Recibe un resolver inyectable que puede consultar el repositorio. Los repositorios son definidos en US-090 y sus implementaciones en las feature stories. En tests, el resolver es una función mock.

### API Architecture

Los middlewares son transversales; aplican a todos los endpoints bajo `/api/v1`. Los errores de los middlewares retornan el **error envelope estándar** per Doc 14 §18:

```json
{ "code": "ERROR_CODE", "message": "...", "correlationId": "uuid" }
```

Los errores de validación incluyen además `details`:

```json
{ "code": "VALIDATION_ERROR", "message": "...", "correlationId": "uuid", "details": [{ "field": "email", "message": "Invalid email" }] }
```

### AI / PromptOps Architecture

No aplica.

### Security Architecture

| Control | Middleware | ADR / NFR |
|---|---|---|
| Security headers (CSP, X-Frame-Options, HSTS) | `helmet` | ADR-SEC-006, NFR-SEC-007 |
| CORS con allowlist explícita | `corsMiddleware` | ADR-SEC-006 |
| Rate limiting global | `rateLimitMiddleware` | ADR-SEC-004, NFR-SEC-004 |
| JWT verification | `authMiddleware` | ADR-SEC-001, NFR-SEC-001/002 |
| Captcha en flujos sensibles | `captchaVerificationMiddleware` | ADR-SEC-004, BR-AUTH-011 |
| RBAC por rol | `roleMiddleware` | ADR-SEC-003, NFR-SEC-003 |
| Ownership masking (404 vs 403) | `ownershipMiddleware` | ADR-SEC-003, Doc 14 §17.2 |
| Sin stack trace en 5xx | `errorHandlerMiddleware` | ADR-SEC-006, NFR-SEC-001 |
| Sin secrets en logs | `requestLoggerMiddleware` | NFR-OBS-003 |

**Distinción crítica 401/403/404** (formalizada en PO/BA Decisions):
- `authMiddleware` → **401**: token ausente o inválido (sin identidad válida).
- `roleMiddleware` → **403**: usuario autenticado pero sin permisos para la ruta.
- `ownershipMiddleware` → **404 enmascarado**: recurso existe pero pertenece a otro usuario (previene enumeración de IDs).

### Testing Architecture

- **Vitest + Supertest**: tests de integración sobre `app` completo (importado de `src/app.ts`).
- **Vitest unit**: tests aislados de `correlationIdMiddleware`, `validateRequestMiddleware`, `errorHandlerMiddleware`.
- **Mock de JWT**: usar `jsonwebtoken.sign()` con `JWT_SECRET` de test en `.env.test`.
- **Mock de captcha**: `CAPTCHA_PROVIDER=mock` con token `'__test__'` (determinista, sin llamadas externas).
- **Mock del ownershipResolver**: función mock `async () => false` para NT-04 / AUTH-TS-04.

---

## 6. Functional Interpretation

| Acceptance Criterion | Interpretación Técnica | Capa(s) Impactada(s) |
|---|---|---|
| **AC-01**: `correlationIdMiddleware` genera/reutiliza UUID | Leer `req.headers['x-correlation-id']`; si existe usarlo, si no `crypto.randomUUID()`. Asignar a `req.correlationId`. Siempre devolver como cabecera `x-correlation-id` en la respuesta. Nunca lanza error. | `src/shared/interface/middlewares/correlation-id.middleware.ts`, `src/app.ts` |
| **AC-02**: `authMiddleware` verifica JWT y popula `req.user` | `jwt.verify(token, JWT_SECRET)`. Si el token es válido, asignar `req.user = decoded`. Si falta o es inválido, llamar `next(new UnauthorizedError())`. El `errorHandlerMiddleware` convierte a `401`. | `src/shared/interface/middlewares/auth.middleware.ts` |
| **AC-03**: `roleMiddleware(['organizer'])` con rol incorrecto → 403 | Leer `req.user.role`. Si no está en el array de roles permitidos, llamar `next(new ForbiddenError())`. El `errorHandlerMiddleware` convierte a `403`. | `src/shared/interface/middlewares/role.middleware.ts` |
| **AC-04**: `rateLimitMiddleware` global → 429 + `Retry-After` | Usar `express-rate-limit` con `windowMs: RATE_LIMIT_WINDOW_MS`, `max: RATE_LIMIT_MAX`, `standardHeaders: true` (genera `Retry-After` automáticamente), `legacyHeaders: false`. | `src/shared/interface/middlewares/rate-limit.middleware.ts` |
| **AC-05**: `captchaVerificationMiddleware` solo en `/auth` sensibles | Leer `req.body.captchaToken`. Si `CAPTCHA_PROVIDER=mock`, aceptar `'__test__'` y rechazar cualquier otro. Si no hay token o es inválido, llamar `next(new BadRequestError('Invalid captcha'))`. | `src/shared/interface/middlewares/captcha-verification.middleware.ts` |
| **AC-06**: `validateRequestMiddleware(schema)` → 400 con detalles Zod | `schema.safeParse({ body: req.body, params: req.params, query: req.query })`. Si falla, construir `ValidationError` con `details` de los errores Zod. Asignar `req.validated` si pasa. | `src/shared/interface/middlewares/validate-request.middleware.ts` |
| **AC-07**: `errorHandlerMiddleware` → envelope sin stack trace | Recibir `(err, req, res, next)`. Determinar status code según tipo de error. Para 5xx: mensaje genérico `"Internal server error"`. Para cualquier error: incluir `correlationId: req.correlationId`. Nunca incluir `err.stack` en la respuesta. | `src/shared/interface/middlewares/error-handler.middleware.ts` |
| **AC-08**: Orden de middlewares globales correcto en `app.ts` | `app.use(correlationId)` → `app.use(requestLogger)` → `app.use(jsonBodyParser)` → `app.use(cors)` → `app.use(helmet)` → `app.use(rateLimit)` → `app.use('/api/v1', router)` → `app.use(notFound)` → `app.use(errorHandler)`. Verificable por inspección estática. | `src/app.ts` |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

US-091 opera en la capa de plataforma compartida (`src/shared/interface/middlewares/`). No pertenece a ningún bounded context específico.

Los middlewares por-ruta (`authMiddleware`, `captchaVerificationMiddleware`, `roleMiddleware`, `ownershipMiddleware`, `validateRequestMiddleware`, `fileUploadMiddleware`) son funciones reutilizables que las feature stories importan desde `src/shared/interface/middlewares/` o desde un barrel `src/shared/interface/index.ts`.

### Use Cases / Application Services

No aplica. Los middlewares son capas de interface/infraestructura transversales — no implementan use cases.

### Controllers / Routes

No aplica. US-091 no crea nuevos endpoints. La modificación de `app.ts` es la única actualización de routing: reemplazar los stubs de US-089/090 con las implementaciones reales de los middlewares globales.

### DTOs / Schemas

**Error envelope** (per Doc 14 §18):

```typescript
// Estructura del error envelope — no producción:
interface ErrorEnvelope {
  code: string;          // e.g. "UNAUTHORIZED", "FORBIDDEN", "VALIDATION_ERROR"
  message: string;       // mensaje legible
  correlationId: string; // req.correlationId
  details?: Array<{ field: string; message: string }>; // solo en VALIDATION_ERROR
}
```

**Tipos de error del shared kernel** (creados en US-090, extendidos aquí si es necesario):

| Clase | HTTP Code | `code` |
|---|---|---|
| `UnauthorizedError` (extends `AppError`) | 401 | `UNAUTHORIZED` |
| `ForbiddenError` (extends `AppError`) | 403 | `FORBIDDEN` |
| `NotFoundError` (extends `AppError`) | 404 | `NOT_FOUND` |
| `ValidationError` (ya en shared kernel) | 400 | `VALIDATION_ERROR` |
| `BadRequestError` (extends `AppError`) | 400 | `BAD_REQUEST` |
| `TooManyRequestsError` (extends `AppError`) | 429 | `RATE_LIMIT_EXCEEDED` |
| Error genérico / `AppError` base | 500 | `INTERNAL_SERVER_ERROR` |

**Nota**: Si `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `BadRequestError`, `TooManyRequestsError` no existen aún en `src/shared/domain/errors/`, deben crearse en esta US.

### Diseño detallado de cada middleware

#### 1. `correlation-id.middleware.ts` (Global)

```
Input:  req.headers['x-correlation-id'] (opcional)
Output: req.correlationId = UUID (generado o reutilizado)
        res.setHeader('x-correlation-id', req.correlationId)
Error:  Nunca lanza — siempre llama next()
```

#### 2. `request-logger.middleware.ts` (Global)

```
Input:  req.method, req.path, req.correlationId
Output: Log estructurado al finalizar response (res.on('finish'))
        { correlationId, method, path, statusCode, durationMs }
Prohibido: no loguear req.headers['Authorization'], contraseñas, tokens
```

Usar `res.on('finish', ...)` para capturar el status code final.

#### 3. `json-body-parser.middleware.ts` (Global)

```
Implementación: express.json({ limit: config.JSON_BODY_LIMIT })
Error HTTP:     400 si body supera el límite (Express lo maneja internamente)
```

#### 4. `cors.middleware.ts` (Global)

```
Librería: cors npm package
Config:   origin: config.CORS_ORIGINS.split(',') (allowlist desde env)
          credentials: true
          optionsSuccessStatus: 204
Error:    403 si origin no está en allowlist (cors library lo maneja)
```

#### 5. `helmet.middleware.ts` (Global)

```
Implementación: helmet() con configuración por defecto
Toggle:         if (config.HELMET_ENABLED) app.use(helmet())
Headers activos: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
                 Strict-Transport-Security, X-XSS-Protection
```

#### 6. `rate-limit.middleware.ts` (Global + por ruta)

```
Librería:     express-rate-limit
Global laxo:  windowMs: config.RATE_LIMIT_WINDOW_MS, max: config.RATE_LIMIT_MAX
              standardHeaders: true  → genera Retry-After automáticamente
              legacyHeaders: false
Auth estricto: windowMs: 10 * 60 * 1000, max: config.AUTH_RATE_LIMIT_MAX
               Solo en rutas /auth/register, /auth/login, /auth/password-reset/request
               (configurado en feature stories de identity-access)
Error HTTP:   429 con cabecera Retry-After
```

#### 7. `auth.middleware.ts` (Por ruta)

```
Input:   Authorization: Bearer <token> o cookie de sesión
Process: jwt.verify(token, config.JWT_SECRET)
Output:  req.user = { id: string, role: string, ...decoded }
Error:   next(new UnauthorizedError()) → 401
         Token ausente, expirado, firma inválida → siempre 401, nunca 403
```

#### 8. `captcha-verification.middleware.ts` (Por ruta — solo /auth sensibles)

```
Input:   req.body.captchaToken
Process: if (config.CAPTCHA_PROVIDER === 'mock'):
           válido si captchaToken === '__test__'
           inválido cualquier otro valor
         else:
           llamar API de captcha external (stub en MVP)
Aplicación: SOLO en POST /auth/register, /auth/login, /auth/password-reset/request
Error:   next(new BadRequestError('Invalid captcha')) → 400
```

#### 9. `role.middleware.ts` (Por ruta)

```
Factory: roleMiddleware(allowedRoles: string[]): RequestHandler
Input:   req.user.role (requiere authMiddleware aplicado antes)
Process: if (!allowedRoles.includes(req.user.role)) → next(new ForbiddenError())
Error:   next(new ForbiddenError()) → 403
         Nunca 401 (el usuario está autenticado; solo falla el rol)
```

#### 10. `ownership.middleware.ts` (Por ruta)

```
Factory: ownershipMiddleware(resolver: OwnershipResolver): RequestHandler
Type:    OwnershipResolver = (req: Request) => Promise<boolean>
Process: const isOwner = await resolver(req)
         if (!isOwner) → next(new NotFoundError())  ← 404 enmascarado, no 403
Error:   next(new NotFoundError()) → 404
         Razón del 404: prevenir enumeración de IDs de recursos privados (Doc 14 §17.2)
```

#### 11. `validate-request.middleware.ts` (Por ruta)

```
Factory: validateRequestMiddleware(schema: ZodSchema): RequestHandler
Input:   { body: req.body, params: req.params, query: req.query }
Process: schema.safeParse(input)
         if (!result.success):
           const details = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
           next(new ValidationError('Validation failed', details))
         else:
           req.validated = result.data
Error:   next(new ValidationError(...)) → 400 con details
```

#### 12. `file-upload.middleware.ts` (Por ruta — rutas multipart)

```
Librería: multer
Config:   storage: memoryStorage() (archivos en memoria para MVP)
          fileFilter: MIME allow-list genérica (image/jpeg, image/png, application/pdf, etc.)
          limits: { fileSize: config.FILE_SIZE_LIMIT }
Error:    next(new BadRequestError('Invalid file type or size')) → 400
Nota:     MIME types específicos por flujo (portafolio vendor, brief quote) se configuran
          en las feature stories de attachments sobreescribiendo este middleware base
```

#### 13. `not-found.middleware.ts` (Global — penúltimo)

```
Implementación: (req, res) → res.status(404).json({ code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found`, correlationId: req.correlationId })
```

#### 14. `error-handler.middleware.ts` (Global — último, Express 4-arg handler)

```
Firma: (err: Error, req: Request, res: Response, next: NextFunction): void
Process:
  1. Determinar HTTP status code:
     - UnauthorizedError   → 401
     - ForbiddenError      → 403
     - NotFoundError       → 404
     - ValidationError     → 400
     - BadRequestError     → 400
     - TooManyRequestsError → 429
     - AppError subclass    → 400 (default para errores de dominio)
     - Otros               → 500
  2. Para 5xx: message = 'Internal server error' (nunca el mensaje real del error)
  3. Para 4xx: message = err.message
  4. NUNCA incluir err.stack en la respuesta
  5. SIEMPRE incluir correlationId: req.correlationId
  6. Si code no está definido: code = 'INTERNAL_SERVER_ERROR'
```

### Repository / Persistence

No aplica directamente. `ownershipMiddleware` recibe el resolver como inyección — no consulta repositorios directamente.

### Validation Rules

| Regla | Middleware | Comportamiento |
|---|---|---|
| VR-01: `authMiddleware` → 401 para token ausente o inválido | `auth.middleware.ts` | `next(new UnauthorizedError())` → 401 |
| VR-02: `roleMiddleware` → 403 para rol incorrecto | `role.middleware.ts` | `next(new ForbiddenError())` → 403 |
| VR-03: `ownershipMiddleware` → 404 enmascarado | `ownership.middleware.ts` | `next(new NotFoundError())` → 404 |
| VR-04: `errorHandlerMiddleware` sin stack trace | `error-handler.middleware.ts` | `err.stack` nunca en response JSON |
| VR-05: `rateLimitMiddleware` con `Retry-After` | `rate-limit.middleware.ts` | `standardHeaders: true` en express-rate-limit |
| VR-06: `validateRequestMiddleware` con details Zod | `validate-request.middleware.ts` | `details: [{ field, message }]` en ValidationError |

### Error Handling

El `errorHandlerMiddleware` es el punto centralizado de manejo de errores. Todos los middlewares propagan errores usando `next(err)`. Diseño:

```
Jerarquía de errores del shared kernel:
AppError (base)
├── UnauthorizedError  → 401
├── ForbiddenError     → 403
├── NotFoundError      → 404
├── ValidationError    → 400 + details
├── BadRequestError    → 400
└── TooManyRequestsError → 429
```

Los errores que no son instancias de `AppError` son tratados como `500` con mensaje genérico.

### Transactions

No aplica.

### Observability

| Middleware | Evento observado |
|---|---|
| `correlationIdMiddleware` | Propaga `correlationId` — base de toda la observabilidad |
| `requestLoggerMiddleware` | Log por request: `{ correlationId, method, path, statusCode, durationMs }` al finalizar |
| `authMiddleware` | Fallos de auth loguean: `{ correlationId, event: 'AUTH_FAILURE', reason }` (NFR-OBS-003) |
| `errorHandlerMiddleware` | Errores 5xx loguean el stack trace a `stderr` (no a la respuesta) para debugging |

---

## 8. Frontend Technical Design

No aplica — US-091 es exclusivamente backend.

---

## 9. API Contract Design

US-091 no crea nuevos endpoints. Define los contratos de error de todos los endpoints existentes y futuros.

**Error envelope estándar** (aplica a todos los endpoints del MVP):

| Tipo de error | HTTP | `code` | `message` | `details` | `correlationId` |
|---|---|---|---|---|---|
| Sin autenticación | 401 | `UNAUTHORIZED` | `"Authentication required"` | — | Sí |
| Rol insuficiente | 403 | `FORBIDDEN` | `"Insufficient permissions"` | — | Sí |
| Recurso privado de otro usuario | 404 | `NOT_FOUND` | `"Resource not found"` | — | Sí |
| Captcha inválido | 400 | `BAD_REQUEST` | `"Invalid captcha"` | — | Sí |
| Validación Zod | 400 | `VALIDATION_ERROR` | `"Validation failed"` | `[{field, message}]` | Sí |
| Body muy grande | 400 | `BAD_REQUEST` | `"Request too large"` | — | Sí |
| Rate limit excedido | 429 | `RATE_LIMIT_EXCEEDED` | `"Too many requests"` | — | Sí + `Retry-After` header |
| CORS bloqueado | 403 | `FORBIDDEN` | `"Origin not allowed"` | — | Sí |
| Error interno | 500 | `INTERNAL_SERVER_ERROR` | `"Internal server error"` | — | Sí |
| Ruta no encontrada | 404 | `NOT_FOUND` | `"Route X not found"` | — | Sí |

---

## 10. Database / Prisma Design

No aplica directamente.

`ownershipMiddleware` recibe un resolver inyectable que puede consultar el repositorio de cualquier entidad. La lógica de consulta al repositorio pertenece a las feature stories que aplican `ownershipMiddleware`.

---

## 11. AI / PromptOps Design

No aplica — US-091 no invoca IA.

---

## 12. Security & Authorization Design

### Authentication

**`authMiddleware`**:
- Extrae el JWT de `Authorization: Bearer <token>`.
- Usa `jwt.verify(token, config.JWT_SECRET)`.
- Tipo del decoded token: `{ id: string; role: string; iat: number; exp: number }`.
- Asigna `req.user = { id, role }`.
- En caso de fallo (token ausente, expirado, firma inválida): `next(new UnauthorizedError())` → 401.
- **Nunca** retorna 403 por error de autenticación.

### Authorization

**`roleMiddleware`**:
- Solo aplica después de `authMiddleware` (requiere `req.user`).
- Compara `req.user.role` contra el array `allowedRoles`.
- Retorna 403 si el rol no está permitido.

**`ownershipMiddleware`**:
- Solo aplica después de `authMiddleware` (requiere `req.user.id`).
- El resolver recibe el `Request` completo y retorna `Promise<boolean>`.
- Si `isOwner === false`: `next(new NotFoundError())` → 404 enmascarado.

### Ownership Rules

El patrón de inyección `ownershipMiddleware(resolver)` desacopla la verificación de ownership de la lógica de consulta:

```typescript
// Ejemplo de uso en feature story (no implementado en esta US):
router.get('/events/:id',
  authMiddleware,
  ownershipMiddleware(async (req) => {
    const event = await eventRepo.findById(req.params.id);
    return event?.organizerId === req.user?.id;
  }),
  eventController.getById
);
```

La interfaz `OwnershipResolver` debe definirse en esta US:

```typescript
// src/shared/interface/middlewares/ownership.middleware.ts
export type OwnershipResolver = (req: Request) => Promise<boolean>;
```

### Role Rules

`roleMiddleware` es una factory — recibe el array de roles permitidos como argumento:

```typescript
// Ejemplo de uso (no implementado en esta US):
router.post('/events',
  authMiddleware,
  roleMiddleware(['organizer', 'admin']),
  validateRequestMiddleware(CreateEventSchema),
  eventController.create
);
```

### Negative Authorization Scenarios

| Escenario | Middleware responsable | HTTP Code | Código en envelope |
|---|---|---|---|
| Token JWT ausente en ruta protegida | `authMiddleware` | 401 | `UNAUTHORIZED` |
| Token JWT inválido o expirado | `authMiddleware` | 401 | `UNAUTHORIZED` |
| Rol incorrecto para la ruta | `roleMiddleware` | 403 | `FORBIDDEN` |
| Ownership violation en recurso privado | `ownershipMiddleware` | 404 | `NOT_FOUND` |
| Captcha inválido en /auth/register | `captchaVerificationMiddleware` | 400 | `BAD_REQUEST` |
| Rate limit global excedido | `rateLimitMiddleware` | 429 | `RATE_LIMIT_EXCEEDED` |
| Origin CORS no en allowlist | `corsMiddleware` | 403 | `FORBIDDEN` |

### Audit Requirements

`requestLoggerMiddleware` registra todos los requests — suficiente para observabilidad en MVP. Los `AdminAction` específicos (acciones de admin) son responsabilidad de las feature stories de `admin-governance`.

### Sensitive Data Handling

| Control | Implementación |
|---|---|
| Sin stack trace en responses 5xx | `errorHandlerMiddleware`: nunca incluye `err.stack` en el JSON de respuesta |
| Sin `Authorization` header en logs | `requestLoggerMiddleware`: excluir explícitamente `req.headers['authorization']` del log |
| Sin contraseñas en logs | `requestLoggerMiddleware`: excluir `req.body.password`, `req.body.captchaToken` |
| JWT verificado con `JWT_SECRET` de env var | `authMiddleware`: `config.JWT_SECRET` del schema Zod validado en US-089 |
| Captcha `'__test__'` solo en modo mock | `captchaVerificationMiddleware`: el token mock no debe aceptarse cuando `CAPTCHA_PROVIDER !== 'mock'` |

---

## 13. Testing Strategy

### Unit Tests

**`correlationIdMiddleware`**

| ID | Escenario | Herramienta |
|---|---|---|
| TS-01 | Request sin `x-correlation-id` → UUID generado y devuelto en cabecera | Vitest (mock de req/res/next) |
| EC-01 check | Request con `x-correlation-id: 'abc'` → `req.correlationId = 'abc'` reutilizado | Vitest |

**`validateRequestMiddleware`**

| ID | Escenario | Herramienta |
|---|---|---|
| TS-04 | Body válido contra schema Zod → `req.validated` disponible | Vitest |
| NT-06 | Body inválido → next recibe `ValidationError` con details | Vitest |

**`errorHandlerMiddleware`**

| ID | Escenario | Herramienta |
|---|---|---|
| TS-05 | Error en handler → envelope sin stack trace | Vitest |
| — | `UnauthorizedError` → 401 con `code: 'UNAUTHORIZED'` | Vitest |
| — | Error genérico (no AppError) → 500 con mensaje genérico | Vitest |

### Integration Tests (Supertest sobre `app`)

**Autenticación**

| ID | Escenario | Expected | Herramienta |
|---|---|---|---|
| TS-02 | Request con JWT válido a ruta protegida → `req.user` poblado, handler alcanzado | 200 (ruta stub) | Supertest + Vitest |
| NT-01 | Token JWT ausente en ruta protegida | 401 `UNAUTHORIZED` | Supertest + Vitest |
| NT-02 | Token JWT expirado o firmado con secret incorrecto | 401 `UNAUTHORIZED` | Supertest + Vitest |

**RBAC**

| ID | Escenario | Expected | Herramienta |
|---|---|---|---|
| NT-03 | Usuario con role `vendor` accede a endpoint `roleMiddleware(['organizer'])` | 403 `FORBIDDEN` | Supertest + Vitest |
| AUTH-TS-01 | Token válido + rol correcto → request llega al handler | 200 (ruta stub) | Supertest + Vitest |
| AUTH-TS-02 | Token válido + rol incorrecto | 403 | Supertest + Vitest |
| AUTH-TS-03 | Sin token | 401 | Supertest + Vitest |

**Ownership**

| ID | Escenario | Expected | Herramienta |
|---|---|---|---|
| NT-04 | Organizer accede a recurso de otro organizer (resolver mock retorna false) | 404 `NOT_FOUND` enmascarado | Supertest + Vitest |
| AUTH-TS-04 | Token válido + recurso de otro usuario | 404 | Supertest + Vitest |

**Captcha**

| ID | Escenario | Expected | Herramienta |
|---|---|---|---|
| TS-03 | `/auth/login` con `captchaToken: '__test__'` (modo mock) | Request continúa (no 400) | Supertest + Vitest |
| NT-05 | `/auth/register` sin `captchaToken` | 400 `BAD_REQUEST` | Supertest + Vitest |

**Rate limit y otros**

| ID | Escenario | Expected | Herramienta |
|---|---|---|---|
| NT-07 | Rate limit global excedido | 429 + `Retry-After` header | Supertest + Vitest |
| NT-08 | Body que supera `JSON_BODY_LIMIT` | 400 envelope | Supertest + Vitest |
| NT-09 | Origin CORS no en allowlist | 403 | Supertest + Vitest |

**Orden del pipeline**

| ID | Escenario | Expected | Herramienta |
|---|---|---|---|
| TS-06 | Inspección del orden de middlewares globales en `app.ts` | Orden correcto per Doc 14 §8.2 | Inspección estática / `tsc` |

### API Tests

Cubiertos por los Integration Tests con Supertest.

### E2E Tests

No aplica en esta US.

### Security Tests

| Check | Herramienta |
|---|---|
| `errorHandlerMiddleware` no expone `err.stack` en 5xx | Supertest: trigger error intencional; assert `res.body.stack` es `undefined` |
| `requestLoggerMiddleware` no loguea header `Authorization` | Vitest: spy en logger; assert que `authorization` no aparece en el log output |
| Captcha `'__test__'` solo aceptado con `CAPTCHA_PROVIDER=mock` | Vitest: test con `CAPTCHA_PROVIDER=recaptcha`; assert que `'__test__'` es rechazado |

### Accessibility Tests

No aplica.

### AI Tests

No aplica.

### Seed / Demo Tests

No aplica.

### CI Checks

| Check | Comando | Pasa si |
|---|---|---|
| Todos los tests pasan | `vitest run` | 0 failures |
| TypeScript compila | `tsc --noEmit` | Sin errores (incluyendo tipos de Express extendidos) |
| ESLint | `eslint src/` | Sin errores de lint |

---

## 14. Observability & Audit

### Logs

**`requestLoggerMiddleware`** — log por request al finalizar:

```json
{
  "level": "info",
  "correlationId": "uuid",
  "method": "POST",
  "path": "/api/v1/events",
  "statusCode": 201,
  "durationMs": 42
}
```

**Campos prohibidos en logs**: `authorization`, `password`, `captchaToken`, `jwt_secret`, cualquier secret.

**`authMiddleware`** — fallo de autenticación:

```json
{
  "level": "warn",
  "correlationId": "uuid",
  "event": "AUTH_FAILURE",
  "reason": "Token expired"
}
```

**`errorHandlerMiddleware`** — errores 5xx (a stderr, no a la respuesta):

```json
{
  "level": "error",
  "correlationId": "uuid",
  "message": "Unhandled error",
  "stack": "..."
}
```

### Correlation ID

`correlationIdMiddleware` es el origen del `correlationId` en cada request. El ID se propaga:
- En `req.correlationId` hacia handlers y middlewares subsecuentes.
- En la cabecera `x-correlation-id` de la respuesta (visible para el cliente).
- En todos los logs del request (`requestLoggerMiddleware`, fallos de auth, error handler).
- En el error envelope JSON de todos los errores.

### AdminAction

No aplica en esta US. Las acciones de admin se auditan en las feature stories de `admin-governance`.

### Error Tracking

Los errores 5xx deben loguearse a stderr con stack trace para debugging. En MVP, stdout/stderr es suficiente (NFR-OBS-006). Integración con Sentry o similar es P4.

### Metrics

No aplica en MVP. `uptimeMs` en `GET /health` (US-089) es el único indicador de salud expuesto.

---

## 15. Seed / Demo Data Impact

No aplica — US-091 no crea ni requiere datos de seed.

---

## 16. Documentation Alignment Required

No documentation alignment issues detected para US-091.

Los 14 middlewares, sus HTTP codes y el orden del pipeline están consistentemente documentados en Doc 14 §8.2, §16 y §17.2. Las ADRs ADR-SEC-001, ADR-SEC-003, ADR-SEC-004 y ADR-SEC-006 están aceptadas y son vinculantes.

---

## 17. Technical Risks & Mitigations

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Orden incorrecto de middlewares globales en `app.ts` | Alto — CORS bloqueado antes de auth, o errorHandler no captura errores de parser | AC-08 + inspección estática en PR review; test TS-06 |
| `errorHandlerMiddleware` expone stack trace en 5xx | Alto — vulnerabilidad de seguridad; revela detalles internos al cliente | Test de seguridad explícito: trigger error, assert `res.body.stack === undefined` |
| Tipos de Request de Express no extendidos correctamente | Alto — `req.user` y `req.correlationId` requieren `as any`; errores TypeScript en feature stories | Crear `express.d.ts` con augmentación de tipos en esta US; verificar con `tsc --noEmit` |
| `ownershipMiddleware` sin interfaz `OwnershipResolver` definida | Medio — feature stories no pueden tipar el resolver correctamente | Formalizar el tipo `OwnershipResolver` en `ownership.middleware.ts` (minor note del Approval Gate) |
| `authMiddleware` retorna 403 en lugar de 401 | Medio — viola la distinción 401/403 formal; confunde a frontend y QA | VR-01 explícito; test NT-01/NT-02 verifican 401 |
| `captchaVerificationMiddleware` acepta `'__test__'` en producción | Alto — bypass de seguridad crítico | Guard: `if (config.CAPTCHA_PROVIDER !== 'mock') throw new Error('mock token rejected')` |
| Rate limit no incluye `Retry-After` header | Bajo — viola VR-05 y NFR-SEC-004 | Usar `standardHeaders: true` en `express-rate-limit`; test NT-07 verifica el header |
| `requestLoggerMiddleware` loguea header `Authorization` | Medio — expone tokens en logs; viola NFR-OBS-003 | Test de seguridad: spy en logger, assert que `authorization` no aparece |

---

## 18. Implementation Guidance for Coding Agents

### Archivos a modificar/crear

```
src/
├── app.ts                              # Modificar: reemplazar stubs con middlewares reales
├── shared/
│   ├── interface/
│   │   ├── express.d.ts               # NUEVO: augmentación de tipos Request
│   │   └── middlewares/               # Reemplazar stubs de US-090 con implementaciones reales
│   │       ├── correlation-id.middleware.ts
│   │       ├── request-logger.middleware.ts
│   │       ├── json-body-parser.middleware.ts
│   │       ├── cors.middleware.ts
│   │       ├── helmet.middleware.ts
│   │       ├── rate-limit.middleware.ts
│   │       ├── auth.middleware.ts
│   │       ├── captcha-verification.middleware.ts
│   │       ├── role.middleware.ts
│   │       ├── ownership.middleware.ts
│   │       ├── validate-request.middleware.ts
│   │       ├── file-upload.middleware.ts
│   │       ├── not-found.middleware.ts
│   │       └── error-handler.middleware.ts
│   └── domain/
│       └── errors/                    # Agregar si no existen:
│           ├── unauthorized.error.ts
│           ├── forbidden.error.ts
│           ├── not-found.error.ts
│           ├── bad-request.error.ts
│           └── too-many-requests.error.ts
└── tests/
    ├── unit/
    │   ├── correlation-id.middleware.test.ts
    │   ├── validate-request.middleware.test.ts
    │   └── error-handler.middleware.test.ts
    └── integration/
        ├── auth.middleware.test.ts
        ├── role.middleware.test.ts
        ├── ownership.middleware.test.ts
        ├── captcha.middleware.test.ts
        └── rate-limit.middleware.test.ts
```

### Dependencias a instalar

```
dependencies:
  cors
  helmet
  express-rate-limit
  jsonwebtoken
  multer
  uuid (si no está ya)

devDependencies:
  @types/cors
  @types/jsonwebtoken
  @types/multer
```

### Orden de implementación recomendado

1. **Tipos de error** — crear `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `BadRequestError`, `TooManyRequestsError` en `src/shared/domain/errors/`.
2. **`express.d.ts`** — augmentación de tipos `Request` con `correlationId`, `user`, `validated`.
3. **Middlewares globales sin lógica de auth** — `correlationId`, `requestLogger`, `jsonBodyParser`, `cors`, `helmet`, `rateLimit`, `notFound`, `errorHandler`.
4. **`app.ts` actualizado** — reemplazar stubs con los middlewares globales reales en el orden correcto.
5. **Tests de middlewares globales** — TS-01, TS-05, NT-07, NT-08, NT-09.
6. **`authMiddleware`** — JWT verification con `jwt.verify`.
7. **`roleMiddleware`** — factory con array de roles.
8. **`ownershipMiddleware`** — factory con `OwnershipResolver`.
9. **`captchaVerificationMiddleware`** — con mock mode.
10. **`validateRequestMiddleware`** — Zod integration.
11. **`fileUploadMiddleware`** — multer con MIME allow-list genérica.
12. **Tests de middlewares por-ruta** — NT-01..NT-06, TS-02..TS-04, AUTH-TS-01..AUTH-TS-04.
13. **Verificación final** — `tsc --noEmit`, `eslint src/`, `vitest run`.

### Decisiones que no deben reabrirse

| Decisión | Resolución formal |
|---|---|
| `authMiddleware` → 401 (no 403) para token ausente o inválido | Doc 14 §17.2; VR-01; formalizado en PO/BA Decisions |
| `ownershipMiddleware` → 404 enmascarado (no 403) | Doc 14 §17.2; VR-03; formalizado en PO/BA Decisions |
| Captcha solo en `/auth/register`, `/auth/login`, `/auth/password-reset/request` | BR-AUTH-011; ADR-SEC-004; formalizado en PO/BA Decisions |
| Mock captcha: `CAPTCHA_PROVIDER=mock` + `'__test__'` | Doc 19 §captcha; formalizado en PO/BA Decisions |
| Rate limit global en esta US; estricto por endpoint en feature stories de identity-access | PO/BA Decisions |
| `fileUploadMiddleware` genérico; MIME types específicos en feature stories | PO/BA Decisions |
| No CSRF token complejo (Out of Scope) | ADR-SEC-006 usa CORS + SameSite; no requiere doble submit |

### Lo que NO debe implementarse en esta US

- Rate limit estricto por endpoint de auth (feature stories de identity-access).
- Lógica de ownership para ningún recurso concreto (feature stories).
- Validaciones Zod de request específicas de feature (feature stories).
- MIME types específicos por flujo en `fileUploadMiddleware` (attachments feature stories).
- Sesiones HTTP-only con cookies (PB-P0-006).
- Google OAuth (Future).
- Integración con Sentry, APM, OpenTelemetry (P4).

### Supuestos a preservar

- `app.ts` exporta `app` sin llamar `listen` — no romper este contrato de US-089.
- `authMiddleware` NO consulta la base de datos — solo verifica la firma JWT.
- El `correlationId` siempre está disponible en `req.correlationId` cuando llega al `errorHandlerMiddleware` (el middleware de correlación es el primero en registrarse).
- Los errores de Express `express.json()` (body too large) son capturados por `errorHandlerMiddleware`.

---

## 19. Task Generation Notes

### Grupos de tareas sugeridos

**Grupo 1 — Tipos de error y augmentación de tipos (prerequisito)**
- Crear `unauthorized.error.ts`, `forbidden.error.ts`, `not-found.error.ts`, `bad-request.error.ts`, `too-many-requests.error.ts`.
- Crear `src/shared/interface/express.d.ts` con augmentación de Request.

**Grupo 2 — Middlewares globales (pueden desarrollarse en paralelo)**
- `correlationIdMiddleware` + test TS-01.
- `requestLoggerMiddleware` + test de seguridad (no loguea Authorization).
- `jsonBodyParser` + test NT-08.
- `corsMiddleware` + test NT-09.
- `helmet` (sin test unitario complejo — solo verificar que está activo).
- `rateLimitMiddleware` + test NT-07.
- `notFoundMiddleware`.
- `errorHandlerMiddleware` + tests TS-05, seguridad (sin stack), 5xx genérico.

**Grupo 3 — Actualizar `app.ts` con middlewares globales reales**
- Reemplazar todos los stubs con las implementaciones del Grupo 2.
- Verificar el orden exacto per Doc 14 §8.2 (AC-08).

**Grupo 4 — Middlewares por-ruta (pueden desarrollarse en paralelo)**
- `authMiddleware` + tests NT-01, NT-02, TS-02, AUTH-TS-01, AUTH-TS-02, AUTH-TS-03.
- `roleMiddleware` + test NT-03.
- `ownershipMiddleware` + tests NT-04, AUTH-TS-04 (con resolver mock).
- `captchaVerificationMiddleware` + tests TS-03, NT-05.
- `validateRequestMiddleware` + tests TS-04, NT-06.
- `fileUploadMiddleware` (smoke test básico).

**Grupo 5 — Integración y CI**
- Verificación final `tsc --noEmit`.
- `vitest run` — todos los tests verdes.
- Actualizar `.env.example` con las nuevas variables del pipeline.

### Tareas QA requeridas

- Tests unitarios: TS-01 (correlationId), TS-04 (validateRequest), TS-05 (errorHandler sin stack).
- Tests de integración Supertest: NT-01..NT-09 (9 negative tests), TS-02..TS-03 (2 functional), AUTH-TS-01..AUTH-TS-04 (4 auth tests).
- Test de seguridad: `err.stack` ausente en responses 5xx.
- Test de seguridad: `Authorization` header ausente en logs.
- Test de seguridad: `captchaToken = '__test__'` solo aceptado en modo mock.

### Tareas de seguridad requeridas

- PR review del `errorHandlerMiddleware`: verificar que ninguna rama retorna `err.stack`.
- PR review del `requestLoggerMiddleware`: verificar exclusión de headers sensibles.
- PR review del `captchaVerificationMiddleware`: verificar guard para modo no-mock.
- PR review de la distinción 401/403/404 en `authMiddleware`/`roleMiddleware`/`ownershipMiddleware`.

### Tareas de seed/demo

No aplica.

### Tareas de documentación

- Formalizar la interfaz `OwnershipResolver` en el archivo `ownership.middleware.ts` (minor note del Approval Gate).
- Actualizar `.env.example` con: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `CORS_ORIGINS`, `HELMET_ENABLED`, `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET`, `JSON_BODY_LIMIT`.

### Dependencias entre tareas

```
Grupo 1 (tipos de error) → Grupos 2 y 4 (middlewares usan los tipos de error)
Grupo 2 (middlewares globales) → Grupo 3 (app.ts actualizado)
Grupo 3 → Grupo 4 (tests de integración requieren app.ts funcional)
Grupo 4 → Grupo 5 (verificación final)
```

Grupos 2 y 4 pueden ejecutarse en paralelo internamente; ambos dependen de Grupo 1.

### Consolidación del backlog item PB-P0-002

Al completarse US-089, US-090 y US-091, generar:

```
management/technical-specs/P0/PB-P0-002/PB-P0-002-integration-checklist.md
```

Con los siguientes checks de integración:
1. `GET /health` responde 200 con `{ status, version, uptimeMs }` y `x-correlation-id` en cabecera de respuesta.
2. Request a ruta protegida sin token → 401 con `correlationId` en envelope.
3. `tsc --noEmit` limpio en toda la estructura `src/`.
4. `eslint src/` sin errores (incluyendo import boundaries de US-090).
5. `vitest run` verde (todos los tests de US-089, US-090 y US-091).
6. Scripts `typecheck`, `lint`, `test` verdes en CI.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story aprobada o explícitamente habilitada para draft spec | Pass — Approved with Minor Notes |
| Product Backlog mapping encontrado | Pass — PB-P0-002, US-091 posición 3 de 3 |
| Decision Resolution revisado si presente | Pass — 7 decisiones formalizadas; ninguna bloqueante |
| Scope claro | Pass — 14 middlewares implementados; registro global en app.ts; middlewares por-ruta como funciones reutilizables |
| Architecture alignment claro | Pass — Express middleware chain, JWT, RBAC, ownership masking, error envelope |
| API impact claro | Pass — error envelope estándar para todos los endpoints; tablas de HTTP codes por escenario |
| DB impact claro | Pass — no aplica directamente; ownershipMiddleware usa resolver inyectable |
| AI impact claro | N/A — no invoca IA |
| Security impact claro | Pass — 7 controles de seguridad documentados; distinción 401/403/404 formalizada |
| Testing strategy clara | Pass — 15 test cases con herramientas y escenarios explícitos; 3 tests de seguridad específicos |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown**

US-091 tiene el scope más complejo del trilogy PB-P0-002 pero está completamente especificada: 14 middlewares con comportamientos observables, HTTP codes exactos, distinción 401/403/404 formalizada, mock de captcha determinista, y 15 test cases con herramientas explícitas. Las 7 decisiones PO/BA formalizadas eliminan todas las ambigüedades de implementación.

La única acción de seguimiento del Approval Gate — formalizar la interfaz `OwnershipResolver` en el archivo `ownership.middleware.ts` — está incluida en las tareas de documentación de este spec y no bloquea el inicio del desarrollo.

Una vez completada esta US, el backbone de seguridad transversal del MVP de EventFlow estará operativo: autenticación JWT, RBAC, ownership masking, captcha en flujos sensibles, rate limiting, CORS, helmet, validación Zod y error envelope sin stack trace — todo listo para ser consumido por las feature stories subsecuentes.
