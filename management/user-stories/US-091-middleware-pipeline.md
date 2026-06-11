# 🧾 User Story: Pipeline de middlewares global (Express)

## 🆔 Metadata

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| ID                 | US-091                                   |
| Epic               | EPIC-BE-001 — Backend Modular Monolith   |
| Feature            | Cadena de middlewares                    |
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
**I want** implementar los 14 middlewares del pipeline Express en el orden correcto definido en Doc 14 §8.2 — desde `correlationIdMiddleware` hasta `errorHandlerMiddleware` — con comportamiento seguro por defecto (CORS, helmet, rate limit, captcha, RBAC, ownership, Zod validation, error envelope sin stack)  
**So that** todos los endpoints del MVP sean seguros, observables y consistentes sin que cada feature story deba re-implementar estas capas transversales

---

## 🧠 Business Context

### Context Summary
Sin el pipeline de middlewares, cada endpoint sería vulnerable, no observable y producirían errores no estandarizados. Esta historia implementa la "plomería de seguridad" transversal del backend: autenticación, autorización, correlación, logging, rate limit, captcha, validación y manejo de errores. Una vez completada, las feature stories solo deben aplicar los middlewares pertinentes a sus rutas.

### Related Domain Concepts
* RBAC + Ownership + Assignment-based authorization (ADR-SEC-003)
* Captcha + Rate Limiting en flujos sensibles (ADR-SEC-004)
* CORS, Security Headers (helmet), error envelope seguro (ADR-SEC-006)
* Correlation ID transversal (Doc 14 §16, §25)
* Fail-fast y logging estructurado a stdout (NFR-OBS-006)

### Assumptions
* US-089 completado: servidor Express inicializado con `app.ts` y `server.ts`.
* US-090 completado: `src/shared/interface/middlewares/` existe con stubs placeholder.
* Los endpoints de auth (`/auth/register`, `/auth/login`, `/auth/password-reset/request`) son los únicos que requieren `captchaVerificationMiddleware`.
* El modo dev/test usa `CAPTCHA_PROVIDER=mock` con token fijo `'__test__'` para pruebas deterministas (Doc 19 §captcha).
* `JWT_SECRET` y `CAPTCHA_SECRET` están configurados en env vars; nunca en repositorio (ADR-SEC-005).

### Dependencies
* US-089 (servidor Express compilable e inicializado).
* US-090 (estructura de módulos con placeholders de middlewares).
* Feature stories de auth, eventos, vendors, etc. dependen de los middlewares de esta US.

### PO/BA Decisions Applied

| Decisión | Resolución |
| -------- | ---------- |
| NFR IDs aplicables | `NFR-SEC-001`, `NFR-SEC-002`, `NFR-SEC-003`, `NFR-SEC-004`, `NFR-SEC-007`, `NFR-OBS-003`, `NFR-OBS-006`. `NFR-PERF-API-001` no existe en Doc 10; `NFR-OBS-001` aplica solo a AdminAction logging y no al pipeline de middlewares. |
| ADRs centrales | `ADR-BE-001` (Express + TypeScript), `ADR-SEC-001` (injection prevention), `ADR-SEC-003` (RBAC + ownership + assignment), `ADR-SEC-004` (captcha + rate limiting en flujos sensibles), `ADR-SEC-006` (CORS, security headers, error handling seguro). Todos aceptados. |
| Distinción `401 vs 403 vs 404 enmascarado` | `authMiddleware` → `401 Unauthorized` para token ausente o inválido. `roleMiddleware` → `403 Forbidden` para rol incorrecto. `ownershipMiddleware` → `404 Not Found` enmascarado para recursos privados de otro usuario (evita enumeración de IDs) per Doc 14 §17.2. |
| Scope de captcha | `captchaVerificationMiddleware` se aplica exclusivamente a `/auth/register`, `/auth/login`, `/auth/password-reset/request` per BR-AUTH-011 y ADR-SEC-004. No se aplica a otros endpoints. |
| Mock de captcha para tests | `CAPTCHA_PROVIDER=mock` acepta el token fijo `'__test__'` y rechaza cualquier otro valor. Permite pruebas deterministas sin llamadas externas per Doc 19 §captcha. |
| Scope del rate limit en esta US | Esta US implementa únicamente el rate limit global laxo (`RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS`). Los límites estrictos por endpoint (e.g., `/auth/login`: 10 por IP por 10 min) se configuran en las feature stories del módulo `identity-access`. |
| Scope de `fileUploadMiddleware` | Esta US establece el middleware base con MIME allow-list y size limit genéricos. Los tipos MIME permitidos por flujo específico (portafolio vendor, brief de quote) se configuran en las feature stories de `attachments`. |

---

## 🔗 Traceability

| Source                 | Reference                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — habilita autenticación, RBAC, observabilidad y seguridad de todos los FR protegidos              |
| Use Case(s)            | Transversal — precondición para todos los UC que requieren autenticación o autorización                         |
| Business Rule(s)       | BR-AUTH-001, BR-AUTH-011                                                                                        |
| Permission Rule(s)     | RBAC: `roleMiddleware`; Ownership: `ownershipMiddleware`; Captcha: endpoints `/auth/*` (BR-AUTH-011)            |
| Data Entity / Entities | —                                                                                                               |
| API Endpoint(s)        | Transversal — aplica a todos los endpoints protegidos de `/api/v1`                                              |
| NFR Reference(s)       | NFR-SEC-001, NFR-SEC-002, NFR-SEC-003, NFR-SEC-004, NFR-SEC-007, NFR-OBS-003, NFR-OBS-006                     |
| Related ADR(s)         | ADR-BE-001, ADR-SEC-001, ADR-SEC-003, ADR-SEC-004, ADR-SEC-006                                                 |
| Related Document(s)    | /docs/14, /docs/16, /docs/19, /docs/20                                                                          |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P0)

### Explicitly Out of Scope
* Middleware de CSRF token complejo (ADR-SEC-006 aplica CORS + SameSite cookie; no se implementa CSRF token de doble submit en MVP).
* APM, distributed tracing, ELK, OpenTelemetry (NFR-OBS-006: logging a stdout es suficiente).
* Middleware de autenticación con Google OAuth (marcado Future en ADR-SEC-002 Addendum).
* Reglas de rate limit específicas por feature (las rutas estrictas se configuran en los módulos de feature correspondientes; esta US configura el rate limit global laxo).
* Microservicios, brokers en MVP.

### Scope Notes
* El `authMiddleware`, `roleMiddleware` y `ownershipMiddleware` se implementan como funciones reutilizables; su aplicación a rutas concretas ocurre en las feature stories correspondientes.
* El orden de registro en `app.ts` debe seguir exactamente Doc 14 §8.2.
* `fileUploadMiddleware`: implementar con MIME allow-list y size limit; los tipos MIME permitidos específicos por feature (portafolio de vendor, brief de quote) se configuran en las feature stories de attachments.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Correlation ID propagado en cada request
**Given** un request llega al servidor sin cabecera `x-correlation-id`  
**When** pasa por `correlationIdMiddleware`  
**Then** se genera un UUID, se asigna a `req.correlationId`, y se devuelve como cabecera `x-correlation-id` en la respuesta; si la cabecera ya viene en el request, su valor se reutiliza

### AC-02: `authMiddleware` autentica correctamente con token válido
**Given** una ruta protegida y un request con token JWT válido en `Authorization: Bearer <token>` o cookie de sesión válida  
**When** el request pasa por `authMiddleware`  
**Then** `req.user` queda poblado con `{ id, role, ... }` y el request continúa hacia el siguiente handler

### AC-03: `roleMiddleware` aplica RBAC correctamente
**Given** una ruta protegida con `roleMiddleware(['organizer'])` y un usuario autenticado con `role='vendor'`  
**When** el request llega al middleware  
**Then** la respuesta es `403 Forbidden` con error envelope estándar (sin exponer detalles internos)

### AC-04: `rateLimitMiddleware` global laxo activo desde el arranque
**Given** el servidor levantado con las configuraciones de env vars `RATE_LIMIT_WINDOW_MS` y `RATE_LIMIT_MAX`  
**When** se supera el umbral global de requests por IP dentro de la ventana configurada  
**Then** el middleware responde `429 Too Many Requests` con cabecera `Retry-After`

### AC-05: `captchaVerificationMiddleware` aplicado solo a `/auth` sensibles
**Given** los endpoints `/auth/register`, `/auth/login`, `/auth/password-reset/request` con `captchaVerificationMiddleware` activo  
**When** un request llega sin `captchaToken` o con token inválido  
**Then** la respuesta es `400 Bad Request`; y **cuando** el request llega con `captchaToken` válido (o `'__test__'` en modo mock), continúa sin error

### AC-06: `validateRequestMiddleware` retorna detalles Zod en errores de validación
**Given** una ruta con `validateRequestMiddleware(SomeZodSchema)` y un body inválido  
**When** el middleware valida el request  
**Then** la respuesta es `400 Bad Request` con `{ code: "VALIDATION_ERROR", message: "...", details: [{ field, message }] }` conforme al error envelope de Doc 14 §18

### AC-07: `errorHandlerMiddleware` devuelve error envelope seguro
**Given** cualquier middleware o handler lanza un error no capturado con `next(err)`  
**When** `errorHandlerMiddleware` lo procesa  
**Then** la respuesta incluye `{ code, message, correlationId }` sin stack trace, sin mensajes SQL, sin detalles internos; y errores 5xx devuelven mensaje genérico

### AC-08: Orden de middlewares globales correcto en `app.ts`
**Given** el servidor Express inicializado  
**When** se inspecciona el registro de middlewares en `app.ts`  
**Then** el orden es: `correlationIdMiddleware` → `requestLoggerMiddleware` → `jsonBodyParser` → `corsMiddleware` → `helmet` → `rateLimitMiddleware` → rutas `/api/v1` → `notFoundMiddleware` → `errorHandlerMiddleware` (Doc 14 §8.2)

---

## ⚠️ Edge Cases

### EC-01: Request sin cabecera `x-correlation-id`
**Given** un request llega sin la cabecera `x-correlation-id`  
**When** `correlationIdMiddleware` lo procesa  
**Then** genera un UUID nuevo, lo propaga en `req.correlationId` y lo devuelve como cabecera de respuesta; el request nunca falla por ausencia de esta cabecera

#### Handling
* El middleware lee `req.headers['x-correlation-id'] || uuidv4()`.

### EC-02: Token JWT ausente o expirado en ruta protegida
**Given** un request a una ruta protegida sin cabecera `Authorization` o con token JWT expirado  
**When** `authMiddleware` lo procesa  
**Then** la respuesta es `401 Unauthorized` con error envelope estándar; nunca 403

#### Handling
* `authMiddleware` verifica el token; si falta o es inválido, llama `next(new UnauthorizedError())`.

### EC-03: Usuario autenticado accede a recurso de otro usuario (ownership violation)
**Given** un organizer autenticado intenta `GET /events/:id` donde el evento pertenece a otro organizer  
**When** `ownershipMiddleware` resuelve el recurso  
**Then** responde `404 Not Found` enmascarado (no 403) para evitar enumeración de IDs de recursos privados (Doc 14 §17.2)

#### Handling
* `ownershipMiddleware` consulta el repositorio; si el resource no pertenece al actor, pasa `next(new NotFoundError())`.

### EC-04: Body JSON que supera el límite de tamaño
**Given** un request con body que supera `JSON_BODY_LIMIT` (default `1mb`)  
**When** `jsonBodyParser` intenta parsearlo  
**Then** Express retorna `400 Bad Request`; el error es capturado por `errorHandlerMiddleware` y devuelto en envelope estándar

### EC-05: CORS: origin no permitido
**Given** un request con cabecera `Origin` que no está en la lista blanca definida en `CORS_ORIGINS`  
**When** `corsMiddleware` evalúa el origen  
**Then** el middleware responde `403 Forbidden` sin exponer la lista de orígenes permitidos

---

## 🚫 Validation Rules

| ID    | Rule                                                                                    | Message / Behavior                                              |
| ----- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| VR-01 | `authMiddleware` retorna `401` (no `403`) para token ausente o inválido                | `{ code: "UNAUTHORIZED", message: "Authentication required" }`  |
| VR-02 | `roleMiddleware` retorna `403` para rol incorrecto                                      | `{ code: "FORBIDDEN", message: "Insufficient permissions" }`    |
| VR-03 | `ownershipMiddleware` retorna `404` enmascarado para recursos privados de otro usuario  | `{ code: "NOT_FOUND", message: "Resource not found" }`          |
| VR-04 | `errorHandlerMiddleware` nunca expone stack trace, SQL ni detalles internos al cliente  | Mensajes genéricos en `5xx`; `correlationId` siempre presente   |
| VR-05 | `rateLimitMiddleware` incluye cabecera `Retry-After` en respuestas `429`                | `429 Too Many Requests` con `Retry-After: <seconds>`            |
| VR-06 | `validateRequestMiddleware` retorna detalles de campo en `400`                          | `{ code: "VALIDATION_ERROR", details: [{ field, message }] }`   |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| SEC-01 | CORS configurado con allowlist explícita desde `CORS_ORIGINS`; sin wildcard `*` con credenciales (ADR-SEC-006). |
| SEC-02 | `helmet` habilitado por defecto con security headers estándar (ADR-SEC-006).                               |
| SEC-03 | `authMiddleware` verifica JWT firmado con `JWT_SECRET`; cualquier token manipulado retorna `401`.          |
| SEC-04 | `captchaVerificationMiddleware` solo se aplica a `/auth/register`, `/auth/login`, `/auth/password-reset/request` (BR-AUTH-011, ADR-SEC-004). |
| SEC-05 | `errorHandlerMiddleware` nunca expone stack trace, SQL, ni mensajes de error internos en responses 5xx (ADR-SEC-006). |
| SEC-06 | `rateLimitMiddleware` aplica límite laxo global (configurable) y límite estricto adicional en endpoints de auth (ADR-SEC-004, NFR-SEC-004). |
| SEC-07 | `requestLoggerMiddleware` no registra valores de `Authorization`, contraseñas, ni otros secretos en los logs (NFR-OBS-003). |

### Negative Authorization Scenarios

| Scenario                                              | Expected HTTP Code | Middleware responsable       |
| ----------------------------------------------------- | ------------------ | -----------------------------|
| Token JWT ausente en ruta protegida                  | 401                | `authMiddleware`             |
| Token JWT inválido o expirado                        | 401                | `authMiddleware`             |
| Rol incorrecto para la ruta (e.g., vendor en /events) | 403               | `roleMiddleware`             |
| Ownership violation en recurso privado               | 404 enmascarado    | `ownershipMiddleware`        |
| Captcha inválido o ausente en /auth/register         | 400                | `captchaVerificationMiddleware` |
| Rate limit global excedido                           | 429 + Retry-After  | `rateLimitMiddleware`        |
| Origin CORS no permitido                             | 403                | `corsMiddleware`             |

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

Los 14 middlewares implementados en `src/shared/interface/middlewares/` (Doc 14 §16):

| Middleware                      | Alcance        | Comportamiento clave                                                             | Error HTTP |
| ------------------------------- | -------------- | -------------------------------------------------------------------------------- | ---------- |
| `correlationIdMiddleware`       | Global         | Lee `x-correlation-id` header o genera UUID; propaga a `req.correlationId`       | Nunca falla |
| `requestLoggerMiddleware`       | Global         | Log estructurado con `correlationId`, method, path, status, duración              | Nunca falla |
| `jsonBodyParser`                | Global         | Parsea body; limit `JSON_BODY_LIMIT` (default `1mb`)                             | 400        |
| `corsMiddleware`                | Global         | CORS allowlist desde `CORS_ORIGINS`; sin wildcard con credenciales               | 403        |
| `helmet`                        | Global         | Security headers estándar; configurable vía `HELMET_ENABLED`                     | —          |
| `rateLimitMiddleware`           | Global + ruta  | Global laxo: `RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS`; estricto en /auth          | 429        |
| `authMiddleware`                | Por ruta       | Verifica JWT; popula `req.user`; 401 si ausente o inválido                        | 401        |
| `captchaVerificationMiddleware` | `/auth/*` sensibles | Verifica `captchaToken`; mock aceptable en test con `CAPTCHA_PROVIDER=mock`  | 400        |
| `roleMiddleware(roles[])`       | Por ruta       | Verifica `req.user.role` contra roles permitidos; 403 si no coincide             | 403        |
| `ownershipMiddleware(resolver)` | Por ruta       | Resuelve recurso y verifica propiedad; 404 enmascarado en recursos privados       | 404 / 403  |
| `validateRequestMiddleware(schema)` | Por ruta  | Valida `req.body/params/query` con Zod schema; popula `req.validated`             | 400        |
| `fileUploadMiddleware`          | Rutas multipart | MIME allow-list + size limit; tipos específicos definidos por feature story       | 400        |
| `notFoundMiddleware`            | Global (penúltimo) | 404 estructurado para rutas no registradas                                   | 404        |
| `errorHandlerMiddleware`        | Global (último)| Error envelope JSON `{ code, message, correlationId }` sin stack ni SQL          | 4xx / 5xx  |

* Use Case / Service: N/A
* Controller / Route: N/A (los middlewares son transversales; aplicación por ruta en feature stories)
* Authorization Policy: implementada en los middlewares `authMiddleware`, `roleMiddleware`, `ownershipMiddleware`
* Validation: `validateRequestMiddleware` + Zod
* Transaction Required: No

### Database
* Main Tables: — (sin acceso directo a DB en esta US, excepto `ownershipMiddleware` que usa puertos de repositorio para resolver ownership)
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| —      | Transversal | Los middlewares aplican a todos los endpoints de `/api/v1` |

### Observability / Audit
* Correlation ID Required: Yes — `correlationIdMiddleware` lo genera y propaga en cada request
* Log Event Required: Yes — `requestLoggerMiddleware` registra cada request con `correlationId`, método, ruta, status y duración
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                               | Type        | Tool               |
| ----- | -------------------------------------------------------------------------------------- | ----------- | ------------------ |
| TS-01 | Request sin `x-correlation-id` → UUID generado y devuelto en cabecera de respuesta    | Unit        | Vitest             |
| TS-02 | Request autenticado a ruta protegida → `req.user` poblado correctamente               | Integration | Supertest + Vitest |
| TS-03 | Request autenticado con captcha válido a `/auth/login` → no retorna 400               | Integration | Supertest + Vitest |
| TS-04 | Body válido contra schema Zod → `req.validated` disponible, handler continúa          | Unit        | Vitest             |
| TS-05 | Error en handler → `errorHandlerMiddleware` retorna envelope sin stack trace           | Unit        | Vitest             |
| TS-06 | Orden de middlewares globales en `app.ts` es el correcto (Doc 14 §8.2)                | Static      | Inspección / tsc   |

### Negative Tests

| ID    | Scenario                                                                                | Expected Result                           | Tool               |
| ----- | --------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------ |
| NT-01 | Token JWT ausente en ruta protegida                                                     | 401 con error envelope                    | Supertest + Vitest |
| NT-02 | Token JWT expirado o firmado con secret incorrecto                                      | 401 con error envelope                    | Supertest + Vitest |
| NT-03 | Usuario con role `vendor` accede a endpoint `roleMiddleware(['organizer'])`             | 403 con error envelope                    | Supertest + Vitest |
| NT-04 | Organizer accede a evento de otro organizer (`ownershipMiddleware`)                     | 404 enmascarado                           | Supertest + Vitest |
| NT-05 | Request a `/auth/register` sin `captchaToken`                                           | 400 Bad Request                           | Supertest + Vitest |
| NT-06 | Body inválido contra schema Zod                                                         | 400 con `{ code: "VALIDATION_ERROR", details }` | Supertest + Vitest |
| NT-07 | Rate limit global excedido                                                              | 429 con cabecera `Retry-After`            | Supertest + Vitest |
| NT-08 | Request con body que supera `JSON_BODY_LIMIT`                                           | 400 con error envelope                    | Supertest + Vitest |
| NT-09 | Origin CORS no en allowlist                                                             | 403                                       | Supertest + Vitest |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                                   | Expected Result        |
| ---------- | ---------------------------------------------------------- | ---------------------- |
| AUTH-TS-01 | Token válido + rol correcto → request llega al handler     | 200 (ruta stub)        |
| AUTH-TS-02 | Token válido + rol incorrecto → bloqueado por roleMiddleware | 403                  |
| AUTH-TS-03 | Sin token → bloqueado por authMiddleware                   | 401                    |
| AUTH-TS-04 | Recurso privado de otro usuario → ownershipMiddleware       | 404 enmascarado        |

### Accessibility Tests
* N/A — no tiene UI.

---

## 📊 Business Impact

| Field               | Value                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| KPI Affected        | Seguridad técnica, observabilidad, tiempo de desarrollo de features                       |
| Expected Impact     | Elimina la necesidad de re-implementar auth/logging/validation en cada feature story       |
| Success Criteria    | Pipeline completo, todos los NT verdes, `errorHandlerMiddleware` sin stack en respuesta    |
| Academic Demo Value | Pipeline de seguridad demostrable: CORS, auth, RBAC, captcha, rate limit, error envelope  |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* N/A.

### Potential Backend Tasks
* Implementar `correlationIdMiddleware` (genera/propaga UUID; Doc 14 §16).
* Implementar `requestLoggerMiddleware` (log estructurado con `correlationId`, método, path, status, duración; sin PII ni secrets).
* Configurar `jsonBodyParser` con `JSON_BODY_LIMIT` desde env vars.
* Configurar `corsMiddleware` con allowlist desde `CORS_ORIGINS`.
* Configurar `helmet` (enabled por defecto, toggleable por `HELMET_ENABLED`).
* Implementar `rateLimitMiddleware` global laxo (`express-rate-limit` o equivalente; `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`).
* Implementar `authMiddleware` (verifica JWT con `JWT_SECRET`; popula `req.user`; 401 si inválido/ausente).
* Implementar `captchaVerificationMiddleware` (verifica token con `CAPTCHA_PROVIDER`; mock determinista en dev/test con token `'__test__'`).
* Implementar `roleMiddleware(roles[])` (verifica `req.user.role`; 403 si no coincide).
* Implementar `ownershipMiddleware(resolver)` (resuelve recurso por repo; 404 enmascarado si no es propietario).
* Implementar `validateRequestMiddleware(schema)` (Zod parse de `req.body/params/query`; 400 con detalles si inválido).
* Implementar `fileUploadMiddleware` (MIME allow-list + size limit; tipos específicos configurables por ruta).
* Implementar `notFoundMiddleware` (404 estructurado para rutas desconocidas).
* Implementar `errorHandlerMiddleware` (envelope `{ code, message, correlationId }` sin stack; 5xx mensaje genérico).
* Registrar middlewares en `app.ts` en el orden exacto de Doc 14 §8.2.

### Potential Database Tasks
* N/A — `ownershipMiddleware` usa puertos de repositorio ya definidos en US-090; sin nuevas tablas.

### Potential AI / PromptOps Tasks
* N/A.

### Potential QA Tasks
* Tests unitarios por middleware (Vitest): TS-01, TS-04, TS-05.
* Tests de integración con Supertest sobre la app completa: NT-01..NT-09, AUTH-TS-01..AUTH-TS-04.
* Verificar que `requestLoggerMiddleware` no filtra headers `Authorization` en los logs.

### Potential DevOps / Config Tasks
* Variables de entorno: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `CORS_ORIGINS`, `HELMET_ENABLED`, `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET`, `JSON_BODY_LIMIT` en `.env.example`.

---

## ✅ Definition of Ready

* [x] Rol claro (System).
* [x] Goal técnico claro (14 middlewares implementados en orden correcto con comportamientos seguros definidos).
* [x] Referencias a Docs de Arquitectura (/docs/14, /docs/16, /docs/19, /docs/20).
* [x] ADRs relevantes referenciados (ADR-BE-001, ADR-SEC-001, ADR-SEC-003, ADR-SEC-004, ADR-SEC-006).
* [x] NFRs correctos referenciados (NFR-SEC-001..NFR-SEC-004, NFR-SEC-007, NFR-OBS-003, NFR-OBS-006).
* [x] Business Rules referenciadas (BR-AUTH-001, BR-AUTH-011).
* [x] Permisos / Seguridad definidos: tabla de negative authorization scenarios completa.
* [x] Entidades: N/A explícito.
* [x] AC en GWT específicos y testeables (8 AC).
* [x] Edge cases documentados (sin correlationId, JWT expirado, ownership violation, body oversized, CORS).
* [x] Validation Rules específicas con HTTP codes exactos (VR-01..VR-06).
* [x] Out of Scope explícito (CSRF token, APM, Google OAuth).
* [x] Dependencias conocidas (US-089, US-090; todas las feature stories dependen de esta US).
* [x] UX: N/A explícito.
* [x] API: transversal explícito (no hay endpoints propios).
* [x] Tests definidos con herramientas (Vitest + Supertest).
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] Los 14 middlewares implementados en `src/shared/interface/middlewares/` conforme a Doc 14 §16.
* [ ] `app.ts` registra los middlewares globales en el orden correcto (Doc 14 §8.2).
* [ ] Tests unitarios Vitest verdes: `correlationIdMiddleware`, `validateRequestMiddleware`, `errorHandlerMiddleware`.
* [ ] Tests de integración Supertest verdes: NT-01..NT-09 y AUTH-TS-01..AUTH-TS-04.
* [ ] `errorHandlerMiddleware` verificado que no expone stack trace ni mensajes internos en respuestas 5xx.
* [ ] `requestLoggerMiddleware` verificado que no registra cabecera `Authorization` ni secrets en logs.
* [ ] Variables de entorno del pipeline actualizadas en `.env.example`.
* [ ] Tech Lead valida el orden de middlewares y los controles de seguridad.

---

## 📝 Notes

* El modo mock de captcha (`CAPTCHA_PROVIDER=mock`) es determinista en tests: acepta el token `'__test__'` y rechaza cualquier otro. Esto permite tests reproducibles sin llamadas externas (Doc 19 §captcha).
* `ownershipMiddleware` no es stateless para recursos privados — hace una consulta al repositorio para resolver el owner. Esto tiene implicaciones de performance para rutas de alta frecuencia, pero es aceptable en el MVP bajo NFR-PERF-001.
* Los límites estrictos de rate limit por endpoint (e.g., `/auth/login`: 10 por IP por 10 min) se configuran en los módulos de feature (identity-access), no en esta US. Esta US solo implementa el rate limit global laxo.
* `helmet` incluye `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` y otras cabeceras por defecto. La configuración específica de CSP puede ajustarse si el frontend sirve iframes o recursos externos.
* `fileUploadMiddleware` en esta US establece el middleware base con MIME allow-list y size limit genéricos; la lista de MIME types permitidos por flujo (portafolio vendor, brief quote) se configura en las feature stories de attachments.
