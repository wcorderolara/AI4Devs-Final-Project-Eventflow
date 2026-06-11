# Technical Specification — US-093: Error Envelope Unificado

## 1. Metadata

| Campo | Valor |
|---|---|
| User Story ID | US-093 |
| Source User Story | management/user-stories/US-093-unified-error-envelope.md |
| Decision Resolution Artifact | management/user-stories/decision-resolutions/US-093-decision-resolution.md |
| Priority | P0 |
| Backlog ID | PB-P0-003 |
| Backlog Title | Backend Validation, Error Envelope & Logger |
| Backlog Execution Order | 3 (tercero en el bloque P0 Foundation) |
| User Story Position in Backlog Item | 2 de 2 |
| Related User Stories in Backlog Item | US-092, US-093 (esta historia) |
| Epic | EPIC-BE-001 — Backend Modular Monolith |
| Backlog Item Dependencies | PB-P0-002 (Backend Modular Monolith Bootstrap — US-089) |
| Feature | Error envelope |
| Module / Domain | Platform/BE — shared-kernel (transversal) |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-11 |
| Last Updated | 2026-06-11 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P0-003 — Backend Validation, Error Envelope & Logger**

Implementar validación de DTOs request/response con Zod, error envelope estándar con códigos consistentes, logger estructurado base y propagación de correlation ID por request. El error envelope es contrato con frontend MSW y agentes IA; todos los DTOs validan con Zod en el borde HTTP; el correlation ID es generado o propagado por request; los tests del error envelope cubren 4xx y 5xx.

### Execution Order Rationale

PB-P0-003 es el tercer backlog item P0. US-093 es la segunda historia dentro del backlog item, pero técnicamente debería implementarse **antes** o en paralelo con US-092: el `validateRequestMiddleware` de US-092 lanza `ValidationError` que US-093 define y serializa. Sin la jerarquía de errores de dominio y el `errorHandlerMiddleware`, US-092 no puede producir respuestas 400 estructuradas. El orden de implementación recomendado es US-093 → US-092, o desarrollo paralelo con un stub.

### Related User Stories in Same Backlog Item

| User Story | Rol en el Backlog Item | Orden sugerido |
|---|---|---|
| US-092 | Implementar `validateRequestMiddleware(schema)` con Zod; consume `ValidationError` de US-093 | 2 — validación de entrada; depende del contrato de error de US-093 |
| **US-093** (esta historia) | Implementar `errorHandlerMiddleware`, error envelope estándar, helpers, jerarquía de errores, catálogo de códigos y `correlationIdMiddleware` | 1 — infraestructura de respuesta; provee el contrato de error que US-092 consume |

> **Nota de coordinación:** US-093 provee los tipos `DomainError`, `ValidationError`, `ErrorCodes`, y el `errorHandlerMiddleware` que todos los demás componentes consumen. Es la infraestructura transversal del backend. Si se desarrolla en paralelo con US-092, US-092 puede usar un stub tipado de `ValidationError` hasta que US-093 esté integrado.

---

## 3. Executive Technical Summary

US-093 implementa la capa transversal de respuesta del backend modular monolith. El objeto de esta historia es doble: (1) infraestructura de correlación — `correlationIdMiddleware` (primer middleware del pipeline) que garantiza que cada request tenga un `X-Correlation-Id` trazable a través de logs, respuestas y el error envelope; (2) infraestructura de errores — jerarquía de clases de errores de dominio e infraestructura (`DomainError`, 7 subclases, `InfrastructureError`, 4 subclases, `UnexpectedError`), catálogo de códigos estables en `ErrorCodes.ts`, helpers `success(data, meta?)` y `failure(code, message, details?)` que producen el envelope canónico, y `errorHandlerMiddleware` (último middleware del pipeline) que captura cualquier error, lo mapea al código HTTP correcto y serializa el error envelope sin exponer stack traces al cliente. El resultado es un contrato de error predecible, trazable y consumible uniformemente por el frontend, los tests MSW y los agentes IA.

---

## 4. Scope Boundary

### In Scope

- `correlationIdMiddleware` en `src/shared/interface/middlewares/`
- `errorHandlerMiddleware` en `src/shared/interface/middlewares/`
- Jerarquía de errores de dominio e infraestructura en `src/shared/errors/`
- `ErrorCodes.ts` — catálogo base de códigos como constantes TypeScript
- Helpers `success()` y `failure()` en `src/shared/response/`
- Tipos TypeScript del error envelope y success envelope
- Masking `AuthorizationError(maskedAs404=true)` para recursos privados (Doc 14 §17.3)
- Tests unitarios de helpers y middlewares (TS-01 a TS-05)
- Tests negativos del mapeo de errores (NT-01 a NT-10)
- Tests de seguridad AUTH-TS-01 y AUTH-TS-02

### Out of Scope

- Configuración del logger estructurado (pino/winston) — cubierto en US-089 o historia de observabilidad; este spec solo asume que el logger existe
- `validateRequestMiddleware` con Zod — US-092; US-093 define el contrato de error que US-092 consume
- Códigos de error de negocio específicos (`CURRENCY_IMMUTABLE`, `MAX_QUOTE_REQUESTS_EXCEEDED`, `QUOTE_LIMIT_REACHED`) — se declaran en las historias de features que los necesitan
- Observabilidad enterprise (OpenTelemetry, APM, ELK, distributed tracing) — NFR-OBS-006
- Localización de `error.message` con `Accept-Language` — futura iteración; MVP: español por defecto
- Microservicios, Kubernetes, brokers — MVP guardrail

### Explicit Non-Goals

- No adherir literalmente a RFC 7807 (ADR-API-002 lo confirma: inspiración, no spec literal)
- No exponer campo `type`, `status`, ni `title` al estilo RFC 7807
- No generar errores de negocio específicos en esta historia — solo la infraestructura base
- No implementar `AdminAction` para errores de validación (operacional, no auditable)

---

## 5. Architecture Alignment

### Backend Architecture

US-093 opera exclusivamente en `shared-kernel` de la arquitectura modular monolith. Sus artefactos viven en `src/shared/` y son importados por todos los módulos. Dos middlewares anclan la historia en el pipeline Express:

```
Pipeline Express (Doc 14 §8.2):
1. correlationIdMiddleware          ← US-093 — PRIMER middleware
2. requestLoggerMiddleware
3. jsonBodyParser (con límite de tamaño)
4. corsMiddleware
5. helmet
6. rateLimitMiddleware (global laxo)
7. /api/v1 routes
   ├── authMiddleware
   ├── roleMiddleware
   ├── ownershipMiddleware
   ├── validateRequestMiddleware(schema)   ← US-092
   └── controller.handler
8. notFoundMiddleware
9. errorHandlerMiddleware           ← US-093 — ÚLTIMO middleware
```

`correlationIdMiddleware` debe ser el primer middleware registrado en `app.ts` para garantizar que cualquier error que ocurra en middlewares anteriores tenga `correlationId`. `errorHandlerMiddleware` debe registrarse con la firma de 4 argumentos de Express (`(err, req, res, next)`) y colocarse al final de toda la cadena de middlewares.

### Frontend Architecture

No aplica directamente. El frontend consume el error envelope de US-093:
- Lee `error.code` para lógica programática (mostrar formulario, redirigir, etc.)
- Lee `error.message` para mostrar mensajes al usuario
- Lee `error.correlationId` para reportar a soporte
- Los tests MSW mockean respuestas usando el envelope canónico de esta historia

### Database Architecture

No aplica. US-093 actúa en la capa Interface/Shared Kernel sin acceso a la base de datos.

### API Architecture

El error envelope y el success envelope son el contrato universal de todas las respuestas:

**Error envelope (ADR-API-002):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [{ "field": "email", "message": "Formato inválido" }],
    "correlationId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Success envelope (ADR-API-002):**
```json
{
  "data": { /* recurso */ },
  "pagination": { /* opcional */ },
  "meta": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-06-11T10:00:00.000Z"
  }
}
```

### AI / PromptOps Architecture

Los códigos `AI_PROVIDER_TIMEOUT (504)` y `AI_PROVIDER_ERROR (502)` se declaran en `ErrorCodes.ts` y las clases `AIProviderError` y `AITimeoutError` forman parte de la jerarquía de `InfrastructureError`. Sin embargo, el lanzamiento de estos errores es responsabilidad de las historias de features IA (PB-P0-009, PB-P0-011). US-093 solo declara la infraestructura y el mapeo HTTP.

### Security Architecture

- `errorHandlerMiddleware` garantiza que ninguna respuesta exponga stack traces, paths internos, queries SQL, API keys ni datos de BD.
- Masking 403→404: `AuthorizationError` con flag `maskedAs404=true` previene enumeración de IDs privados (IDOR mitigation).
- Errores 500 siempre retornan mensaje genérico; el `correlationId` permite correlación con el log interno sin exponer información técnica.
- Los logs de errores incluyen el stack completo con `correlationId` para debugging interno, nunca para el cliente.

### Testing Architecture

- Vitest para tests unitarios (helpers, jerarquía de errores, middleware).
- Supertest para tests de integración del `errorHandlerMiddleware` con endpoints reales.
- Tests negativos cubren toda la jerarquía de errores (NT-01 a NT-10).

---

## 6. Functional Interpretation

| Acceptance Criterion | Interpretación Técnica | Capa(s) Impactada(s) |
|---|---|---|
| AC-01: Error envelope estándar en todas las respuestas de error | `errorHandlerMiddleware` captura cualquier error lanzado en la cadena (via `next(err)`), lo mapea al código HTTP correcto y serializa `{ error: { code, message, correlationId, details? } }`. El helper `failure()` produce el mismo envelope desde los controladores para rechazos explícitos. | Interface / shared-kernel |
| AC-02: Correlation ID generado o propagado | `correlationIdMiddleware` lee `req.headers['x-correlation-id']` o genera `uuidv4()`. Escribe en `req.correlationId`. Propaga al response header `X-Correlation-Id`. El `errorHandlerMiddleware` lee `req.correlationId` para incluirlo en `error.correlationId`. | Interface / shared-kernel |
| AC-03: Mapeo correcto de errores de dominio a HTTP | `errorHandlerMiddleware` contiene un mapa explícito de clases de error a código HTTP + código de catálogo. Usa `instanceof` para detectar la clase. Un bloque catch-all maneja errores genéricos con 500 `INTERNAL_ERROR`. | Interface / shared-kernel |
| AC-04: Helpers tipados y disponibles | `success(data, meta?)` retorna el success envelope completo con `meta.correlationId` y `meta.timestamp`. `failure(code, message, details?)` retorna el error envelope. Los tipos TypeScript garantizan la forma correcta mediante overloads o tipos condicionales para `details[]` obligatorio. | Interface / shared-kernel |
| AC-05: Stack trace no expuesto | `errorHandlerMiddleware` loguea `error.stack` + contexto completo (con `correlationId`) en el logger. Retorna al cliente solo `code`, `message` (seguro), `correlationId`. Para errores 500 no mapeados, `message` siempre es el genérico de `INTERNAL_ERROR`. | Interface / shared-kernel |
| AC-06: Tests cubren 4xx y 5xx | Tests de integración con Supertest que provocan cada tipo de error usando las clases de dominio y verifican el envelope resultante. | Tests |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Todo vive en `shared-kernel` (`src/shared/`). Ningún módulo de feature modifica estos artefactos; solo los importan. El directorio `src/shared/` expone un barrel (`index.ts`) para imports limpios.

### Use Cases / Application Services

No aplica. US-093 es infraestructura transversal; no hay use cases de negocio.

### Controllers / Routes

`correlationIdMiddleware` y `errorHandlerMiddleware` se registran en `src/app.ts`:

```typescript
// Patrón de registro (no código de producción):
// Primero
app.use(correlationIdMiddleware)

// ... resto de middlewares, routes ...

// Último
app.use(errorHandlerMiddleware)  // firma Express de 4 parámetros
```

Ningún controlador usa `errorHandlerMiddleware` directamente. Los controladores usan los helpers `success()` / `failure()` para respuestas explícitas y llaman `next(err)` para delegar errores al handler global.

### DTOs / Schemas

**Tipos del error envelope y success envelope** (en `src/shared/response/types.ts`):

```typescript
// Tipos (no código de producción — referencia de diseño)
interface ErrorDetail {
  field: string
  message: string
}

interface ErrorEnvelope {
  error: {
    code: string
    message: string
    details?: ErrorDetail[]
    correlationId: string
  }
}

interface SuccessEnvelope<T> {
  data: T
  pagination?: PaginationMeta
  meta: {
    correlationId: string
    timestamp: string
  }
}

interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}
```

### Repository / Persistence

No aplica. US-093 no accede a la base de datos.

### Validation Rules

| ID | Regla | Comportamiento |
|---|---|---|
| VR-01 | `error.message` sin stack traces, SQL, paths ni datos sensibles | Error envelope seguro; stack en log interno |
| VR-02 | `error.correlationId` presente en todas las respuestas de error | Obligatorio por ADR-API-004 |
| VR-03 | `details[]` obligatorio en `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION` | Tipado en `failure()` fuerza el campo; falla en compilación si se omite |
| VR-04 | Ningún controlador construye el envelope manualmente | Lint rule o code review policy; helper `failure()` / `success()` es el único punto de salida |
| VR-05 | Códigos de error como constantes TypeScript en `ErrorCodes.ts` | Sin strings literales en código de producción |

### Error Handling

**Jerarquía de errores de dominio** (Doc 14 §18.1):

```
DomainError (abstract)
 ├── ValidationError                → 400 VALIDATION_ERROR
 ├── AuthenticationError            → 401 AUTHENTICATION_REQUIRED
 ├── AuthorizationError             → 403 FORBIDDEN
 │    └── (con maskedAs404=true)    → 404 RESOURCE_NOT_FOUND
 ├── NotFoundError                  → 404 RESOURCE_NOT_FOUND
 ├── ConflictError                  → 409 CONFLICT
 ├── BusinessRuleViolationError     → 422 BUSINESS_RULE_VIOLATION
 └── RateLimitError                 → 429 RATE_LIMIT_EXCEEDED

InfrastructureError (abstract)
 ├── AIProviderError                → 502 AI_PROVIDER_ERROR
 ├── AITimeoutError                 → 504 AI_PROVIDER_TIMEOUT
 ├── ExternalIntegrationError       → 502 AI_PROVIDER_ERROR (o código específico)
 └── PrismaPersistenceError         → 500 PERSISTENCE_ERROR / INTERNAL_ERROR

UnexpectedError                     → 500 INTERNAL_ERROR
```

**Catálogo base de códigos** (`ErrorCodes.ts`) — basado en ADR-API-002:

| Código | HTTP | Descripción |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input de usuario no pasa validación Zod |
| `AUTHENTICATION_REQUIRED` | 401 | Token ausente, inválido o expirado |
| `FORBIDDEN` | 403 | Autorización RBAC o ownership falla (recurso público) |
| `RESOURCE_NOT_FOUND` | 404 | Recurso no encontrado o 403 enmascarado (recurso privado) |
| `CONFLICT` | 409 | Estado conflictivo (e.g., duplicado, transición inválida) |
| `BUSINESS_RULE_VIOLATION` | 422 | Regla de negocio violada; requiere `details[]` |
| `RATE_LIMIT_EXCEEDED` | 429 | Límite de requests superado |
| `AI_PROVIDER_ERROR` | 502 | Error en proveedor IA (upstream) |
| `AI_PROVIDER_TIMEOUT` | 504 | Timeout en llamada al proveedor IA |
| `PERSISTENCE_ERROR` | 500 | Error en capa de persistencia (Prisma) |
| `INTERNAL_ERROR` | 500 | Error inesperado no mapeado |

> Los códigos de negocio específicos (`CURRENCY_IMMUTABLE`, `QUOTE_LIMIT_REACHED`, `MAX_ATTACHMENTS_REACHED`, etc.) se declaran en cada historia de feature y son valores adicionales en `ErrorCodes.ts`.

**Lógica del `errorHandlerMiddleware`:**

```text
Recibe (err, req, res, next):
1. Si err instanceof ValidationError:
   → 400 VALIDATION_ERROR con details[]
2. Si err instanceof AuthenticationError:
   → 401 AUTHENTICATION_REQUIRED
3. Si err instanceof AuthorizationError:
   → Si err.maskedAs404: 404 RESOURCE_NOT_FOUND; log registra "masked 403"
   → Si no: 403 FORBIDDEN
4. Si err instanceof NotFoundError:
   → 404 RESOURCE_NOT_FOUND
5. Si err instanceof ConflictError:
   → 409 CONFLICT
6. Si err instanceof BusinessRuleViolationError:
   → 422 BUSINESS_RULE_VIOLATION con details[]
7. Si err instanceof RateLimitError:
   → 429 RATE_LIMIT_EXCEEDED
8. Si err instanceof AIProviderError:
   → 502 AI_PROVIDER_ERROR
9. Si err instanceof AITimeoutError:
   → 504 AI_PROVIDER_TIMEOUT
10. Si err instanceof PrismaPersistenceError:
    → 500 PERSISTENCE_ERROR
11. Catch-all (UnexpectedError o cualquier Error genérico):
    → 500 INTERNAL_ERROR; loguear stack completo con correlationId
```

En todos los casos:
- Incluir `error.correlationId` desde `req.correlationId`
- Loguear el stack internamente a nivel `error` (con correlationId)
- Nunca incluir `err.stack` en la respuesta HTTP

### Transactions

No aplica. US-093 no tiene acceso a la base de datos.

### Observability

**`correlationIdMiddleware`:**
- Lee `req.headers['x-correlation-id']` (o la variante `X-Correlation-Id`)
- Si presente: reutiliza el valor (trazabilidad desde cliente/proxy)
- Si ausente: genera `uuidv4()`
- Escribe en `req.correlationId`
- Retorna en response header `X-Correlation-Id`

**Propagación cross-capa del correlationId:**
- El Tech Lead decide entre `AsyncLocalStorage` (Node.js nativo, sin acoplamiento a Express) y `req.context.correlationId` (más simple, acoplado al ciclo de request)
- Para jobs: usar `job-<name>-<timestamp>` como correlationId artificial (Doc 14 §20)
- El logger debe incluir `correlationId` automáticamente en cada línea

**`errorHandlerMiddleware` — observabilidad:**
- Nivel `error` para errores 5xx (con `err.stack`, `err.message`, `correlationId`, `method`, `path`)
- Nivel `warn` para errores 4xx (sin stack completo; con `err.code`, `correlationId`, `method`, `path`)
- Para masking 403→404: loguear a nivel `warn` con nota "authorization_masked_as_404"

---

## 8. Frontend Technical Design

No aplica directamente. El frontend consumirá el error envelope a través del cliente HTTP:
- `error.code` para lógica programática (discriminar tipo de error)
- `error.message` para mostrar al usuario (MVP: español por defecto)
- `error.details[]` para errores por campo en formularios (validation errors)
- `error.correlationId` para reportes de soporte

Los tests MSW del frontend mockearán respuestas usando el envelope canónico de esta historia. La localización de `error.message` (Accept-Language) está fuera del scope del MVP.

---

## 9. API Contract Design

El error envelope aplica globalmente; no hay endpoints propios. Contratos para los casos más comunes:

| Caso | HTTP | Code | `details[]` | Notas |
|---|---|---|---|---|
| Input inválido (Zod) | 400 | `VALIDATION_ERROR` | Obligatorio | `[{ field, message }]` por campo |
| Token ausente / inválido | 401 | `AUTHENTICATION_REQUIRED` | Opcional | |
| Rol insuficiente (recurso público) | 403 | `FORBIDDEN` | Opcional | |
| Ownership violado (recurso privado) | 404 | `RESOURCE_NOT_FOUND` | Opcional | Masking 403→404 |
| Recurso no encontrado | 404 | `RESOURCE_NOT_FOUND` | Opcional | |
| Estado conflictivo | 409 | `CONFLICT` | Opcional | |
| Regla de negocio violada | 422 | `BUSINESS_RULE_VIOLATION` | Obligatorio | `[{ field, message }]` |
| Rate limit superado | 429 | `RATE_LIMIT_EXCEEDED` | Opcional | Header `Retry-After` recomendado |
| Error IA upstream | 502 | `AI_PROVIDER_ERROR` | Opcional | |
| Timeout IA | 504 | `AI_PROVIDER_TIMEOUT` | Opcional | |
| Error inesperado | 500 | `INTERNAL_ERROR` | Nunca | Solo `message` genérico |

**Success envelope** (para referencia — todos los controladores usan `success()`):

```json
{
  "data": { "id": "uuid", "name": "..." },
  "pagination": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 },
  "meta": {
    "correlationId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-06-11T10:00:00.000Z"
  }
}
```

---

## 10. Database / Prisma Design

No aplica. US-093 actúa en la capa Interface/Shared Kernel sin modificar el modelo de datos.

---

## 11. AI / PromptOps Design

### AI Feature

No aplica en esta historia. US-093 no invoca IA.

### Provider

No aplica.

### Prompt Version

No aplica.

### Input Schema

No aplica.

### Output Schema

No aplica.

### Human-in-the-loop

No aplica.

### Fallback

No aplica.

### Persistence

No aplica.

### Safety Rules

Los códigos `AI_PROVIDER_ERROR` y `AI_PROVIDER_TIMEOUT` se declaran en `ErrorCodes.ts` y las clases `AIProviderError` y `AITimeoutError` en la jerarquía de `InfrastructureError`. Son infraestructura; el lanzamiento real ocurre en las historias de features IA (PB-P0-009, PB-P0-011).

---

## 12. Security & Authorization Design

### Authentication

No aplica. US-093 implementa la infraestructura de respuesta, no la lógica de autenticación.

### Authorization

No aplica directamente. La única excepción es el masking 403→404 (EC-04) que es un mecanismo de respuesta, no de autorización.

### Ownership Rules

No aplica. Las reglas de ownership las implementan `ownershipMiddleware` y los use cases de Application. US-093 solo serializa el resultado.

### Role Rules

No aplica.

### Negative Authorization Scenarios

| Escenario | Respuesta al cliente | Log interno |
|---|---|---|
| `AuthorizationError` (recurso público, mutación no autorizada) | 403 `FORBIDDEN` | `warn` con `correlationId` |
| `AuthorizationError` (recurso privado, `maskedAs404=true`) | 404 `RESOURCE_NOT_FOUND` | `warn` "authorization_masked_as_404" con `correlationId` |
| Error 500 inesperado | 500 `INTERNAL_ERROR` + mensaje genérico + `correlationId` | `error` con stack completo y contexto |
| Stack trace en respuesta | Nunca — rechazado por `errorHandlerMiddleware` | Stack se loguea internamente |

### Audit Requirements

No aplica. Los errores de validación y autorización son eventos operacionales logueados con `warn`; no requieren `AdminAction`. Solo las acciones administrativas sensibles generan `AdminAction` (cubierto en PB-P0-008 y features admin).

### Sensitive Data Handling

- Ningún valor de campo sensible (passwords, tokens, captcha) aparece en `error.message` ni en `details[].message`
- El `err.stack` se loguea internamente pero nunca se incluye en la respuesta HTTP
- Los logs a nivel `error` (5xx) incluyen el stack; los logs a nivel `warn` (4xx) no incluyen valores de campos de entrada
- El masking 403→404 protege la privacidad de la existencia de recursos ajenos

---

## 13. Testing Strategy

### Unit Tests

| ID | Escenario | Herramienta | Verificación |
|---|---|---|---|
| UT-01 | `success(data, meta?)` produce envelope con `meta.correlationId` y `meta.timestamp` | Vitest | Envelope tiene la forma correcta |
| UT-02 | `failure(code, message)` produce error envelope sin `details` | Vitest | `error.correlationId` presente; `details` ausente |
| UT-03 | `failure("VALIDATION_ERROR", msg, details)` incluye `details[]` | Vitest | TypeScript y runtime verifican `details[]` |
| UT-04 | `correlationIdMiddleware` propaga ID existente del header | Vitest | `req.correlationId === header_value`; response header coincide |
| UT-05 | `correlationIdMiddleware` genera UUID v4 cuando no hay header | Vitest | `req.correlationId` es UUID válido; response header presente |
| UT-06 | `AuthorizationError(maskedAs404=true)` genera respuesta 404 | Vitest | HTTP 404; `RESOURCE_NOT_FOUND` en code |
| UT-07 | Cada clase de `DomainError` instancia correctamente | Vitest | Constructor, `message`, `code`, propiedades específicas |

### Integration Tests

| ID | Escenario | Herramienta | Verificación |
|---|---|---|---|
| IT-01 | `ValidationError` → 400 `VALIDATION_ERROR` con `details[]` | Supertest | Envelope completo; `details` con `field` y `message` |
| IT-02 | `AuthenticationError` → 401 `AUTHENTICATION_REQUIRED` | Supertest | Envelope; sin stack; `correlationId` presente |
| IT-03 | `AuthorizationError` → 403 `FORBIDDEN` | Supertest | Envelope; sin stack; `correlationId` presente |
| IT-04 | `AuthorizationError(maskedAs404)` → 404 `RESOURCE_NOT_FOUND` | Supertest | HTTP 404; `RESOURCE_NOT_FOUND` en code |
| IT-05 | `NotFoundError` → 404 `RESOURCE_NOT_FOUND` | Supertest | Envelope correcto |
| IT-06 | `ConflictError` → 409 `CONFLICT` | Supertest | Envelope correcto |
| IT-07 | `BusinessRuleViolationError` → 422 `BUSINESS_RULE_VIOLATION` con `details[]` | Supertest | Envelope con `details[]` |
| IT-08 | Error genérico JavaScript → 500 `INTERNAL_ERROR` | Supertest | Envelope genérico; sin stack en response |
| IT-09 | `error.correlationId` presente en todos los 4xx y 5xx | Supertest | Verificación en IT-01 a IT-08 |
| IT-10 | Response header `X-Correlation-Id` presente en error | Supertest | Header coincide con `error.correlationId` |

### API Tests

Cubiertos por los Integration Tests con Supertest.

### E2E Tests

No aplica en esta historia. Los tests E2E de flujos completos son responsabilidad de las historias de feature.

### Security Tests

| ID | Escenario | Verificación |
|---|---|---|
| SEC-T-01 | Error 500 no contiene `stack`, `err.message` original, ni paths internos | `JSON.stringify(response.body)` no contiene "at " (stack trace marker) |
| SEC-T-02 | `AuthorizationError(maskedAs404)` retorna 404 al cliente (no 403) | HTTP status 404; code `RESOURCE_NOT_FOUND` |
| SEC-T-03 | `correlationId` en error 500 es el mismo del response header | `response.body.error.correlationId === response.headers['x-correlation-id']` |

### Accessibility Tests

No aplica — capacidad técnica sin UI.

### AI Tests

No aplica en esta historia. Los tests de `AIProviderError` y `AITimeoutError` se ejecutan en las historias de features IA cuando el `LLMProvider` lanza esos errores.

### Seed / Demo Tests

No aplica. El seed no pasa por el `errorHandlerMiddleware`.

### CI Checks

| Check | Herramienta | Criterio de éxito |
|---|---|---|
| Type check | TypeScript `tsc --noEmit` | Jerarquía de errores, helpers y tipos compilan sin errores |
| Unit tests | Vitest | UT-01 a UT-07 pasan |
| Integration tests | Supertest + Vitest | IT-01 a IT-10 pasan |
| Security tests | Supertest + Vitest | SEC-T-01 a SEC-T-03 pasan |
| No stack en responses | Grep o test assertion | Ninguna respuesta de error contiene `"at "` (stack marker) |

---

## 14. Observability & Audit

### Logs

**`correlationIdMiddleware`:** No genera log propio — solo propaga el ID.

**`errorHandlerMiddleware`:**

| Nivel | Cuándo | Payload |
|---|---|---|
| `warn` | Errores 4xx mapeados | `{ level: "warn", event: "domain_error", correlationId, code, method, path, httpStatus }` |
| `warn` | Masking 403→404 | `{ level: "warn", event: "authorization_masked_as_404", correlationId, method, path, realStatus: 403 }` |
| `error` | Errores 5xx (incluye UnexpectedError) | `{ level: "error", event: "unexpected_error", correlationId, method, path, stack, message }` |

Los logs **no incluyen** valores del body de la request (prevención de log de PII).

### Correlation ID

El `correlationId` es el artefacto central de esta historia. Flujo completo:

```
Client → X-Correlation-Id header (opcional)
         ↓
correlationIdMiddleware (primer middleware)
  → req.correlationId = header ?? uuidv4()
         ↓
Logger (todos los logs del request)
  → incluye correlationId automáticamente
         ↓
Respuesta HTTP
  → response header: X-Correlation-Id
  → success envelope: meta.correlationId
  → error envelope: error.correlationId
```

Para jobs: `req.correlationId` no existe; usar `AsyncLocalStorage` o pasar explícitamente como parámetro al use case con valor `job-<name>-<timestamp>`.

### AdminAction

No aplica. Los errores de dominio son operacionales.

### Error Tracking

Solo errores 5xx generan log nivel `error`. En producción pueden configurar alertas sobre tasa de logs `error` o sobre presencia de `event: "unexpected_error"` (fuera del scope MVP).

### Metrics

No aplica en MVP (NFR-OBS-006 excluye instrumentación enterprise). La frecuencia de errores por tipo puede inferirse de los logs estructurados.

---

## 15. Seed / Demo Data Impact

No aplica. US-093 es infraestructura; el seed no pasa por `errorHandlerMiddleware`.

---

## 16. Documentation Alignment Required

| Documento / Fuente | Conflicto | Decisión vigente | Acción recomendada | ¿Bloquea implementación? |
|---|---|---|---|---|
| Doc 14 §18.3 usa `VALIDATION_FAILED` | Conflicto con ADR-API-002 y Doc 16 §14.2 que usan `VALIDATION_ERROR` | `VALIDATION_ERROR` es el canónico (Decisión 7 del Decision Resolution, ADR-API-002 Accepted) | Actualizar Doc 14 §18.3: `VALIDATION_FAILED` → `VALIDATION_ERROR` | No |
| Doc 14 §18.3 usa `NOT_FOUND` | ADR-API-002 establece `RESOURCE_NOT_FOUND` como código canónico | `RESOURCE_NOT_FOUND` es el canónico (ADR-API-002) | Actualizar Doc 14 §18.3: `NOT_FOUND` → `RESOURCE_NOT_FOUND` | No |
| Doc 14 §18.3 usa `RATE_LIMITED` | ADR-API-002 establece `RATE_LIMIT_EXCEEDED` como código canónico | `RATE_LIMIT_EXCEEDED` es el canónico (ADR-API-002) | Actualizar Doc 14 §18.3: `RATE_LIMITED` → `RATE_LIMIT_EXCEEDED` | No |
| Doc 14 §18.3 usa `BUSINESS_RULE_VIOLATION` a 409 o 422 | ADR-API-002 establece 422 para `BUSINESS_RULE_VIOLATION` | 422 es el código HTTP canónico | Implementar con 422; nota en Doc 14 §18.3 | No |

> Todas las inconsistencias son ejemplos históricos en Doc 14. Los códigos canónicos son los establecidos en ADR-API-002 (Accepted). Se recomienda actualizar Doc 14 §18.3 en el próximo ciclo de documentación.

---

## 17. Technical Risks & Mitigations

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `errorHandlerMiddleware` no captura errores en middlewares anteriores | Errores en middlewares globales (auth, rate limit) podrían no seguir el envelope | Verificar en tests IT que errores lanzados antes de los routes también siguen el envelope; colocar `errorHandlerMiddleware` después de todos los middlewares incluyendo `notFoundMiddleware` |
| Dependency circular US-093 ↔ US-092 | `validateRequestMiddleware` (US-092) necesita `ValidationError` de US-093 | US-093 se implementa primero o provee un tipo stub; la dependencia es unidireccional (US-092 → US-093, no al revés) |
| Propagación de correlationId cross-capa (AsyncLocalStorage vs req.context) | Si el mecanismo no cubre todos los paths de ejecución, algunos logs pierden el ID | Tech Lead decide y prueba en sprint; IT-09/IT-10 verifican presencia en response; tests de logs verifican propagación |
| Controlador que olvida usar `success()` / `failure()` | Respuesta con envelope incorrecto o ausente | Lint rule o convention documentada; revisar en PR antes de merge |
| Jerarquía de errores con `instanceof` rompe en algunos transpiladores / bundlers | El `errorHandlerMiddleware` no detecta la clase correctamente | Usar `instanceof` + clase base `DomainError` como fallback; tests UT-07 verifican la jerarquía |
| Masking 403→404 implementado incorrectamente | Expone 403 cuando debería ser 404 (violación de privacy) | SEC-T-02 y NT-04 verifican específicamente el masking; AUTH-TS-01 es requisito de DoD |
| Logger no inicializado cuando ocurre error temprano | Error en bootstrap antes de que el logger esté listo → silencio en logs | Usar `console.error` como fallback en `errorHandlerMiddleware` cuando el logger no esté disponible |

---

## 18. Implementation Guidance for Coding Agents

### Archivos y carpetas impactados

```
src/shared/errors/
  ├── domain-error.ts               [NUEVO] — clase base abstracta DomainError
  ├── validation-error.ts           [NUEVO] — ValidationError extends DomainError
  ├── authentication-error.ts       [NUEVO]
  ├── authorization-error.ts        [NUEVO] — con flag maskedAs404
  ├── not-found-error.ts            [NUEVO]
  ├── conflict-error.ts             [NUEVO]
  ├── business-rule-violation-error.ts [NUEVO]
  ├── rate-limit-error.ts           [NUEVO]
  ├── infrastructure-error.ts       [NUEVO] — clase base abstracta InfrastructureError
  ├── ai-provider-error.ts          [NUEVO]
  ├── ai-timeout-error.ts           [NUEVO]
  ├── prisma-persistence-error.ts   [NUEVO]
  ├── unexpected-error.ts           [NUEVO]
  ├── ErrorCodes.ts                 [NUEVO] — catálogo base de códigos
  └── index.ts                      [NUEVO] — barrel exports

src/shared/response/
  ├── success.ts                    [NUEVO] — helper success()
  ├── failure.ts                    [NUEVO] — helper failure()
  ├── types.ts                      [NUEVO] — ErrorEnvelope, SuccessEnvelope, tipos
  └── index.ts                      [NUEVO] — barrel exports

src/shared/interface/middlewares/
  ├── correlation-id.middleware.ts  [NUEVO]
  └── error-handler.middleware.ts   [NUEVO]

src/app.ts                          [MODIFICADO] — registrar middlewares en posiciones correctas
```

### Orden de implementación recomendado

1. **`ErrorCodes.ts`** y jerarquía de errores de dominio — base de todo lo demás
2. **Tipos del envelope** (`src/shared/response/types.ts`) — antes de los helpers
3. **Helpers `success()` y `failure()`** — usados por controladores y por tests
4. **`correlationIdMiddleware`** — independiente; tests UT-04/UT-05
5. **`errorHandlerMiddleware`** — depende de la jerarquía de errores; tests UT-06, IT-01 a IT-10
6. **Registro en `src/app.ts`** — posición crítica (primero/último)
7. **Tests de seguridad** SEC-T-01 a SEC-T-03

### Decisiones que no deben reabrirse

- Formato del error envelope (ADR-API-002 — Accepted)
- Códigos de error como constantes TypeScript (Decisión 2 del Decision Resolution)
- `correlationIdMiddleware` como primer middleware (ADR-API-004 — Decisión 3)
- Stack traces nunca al cliente (ADR-API-002 — Decisión 4)
- `details[]` obligatorio en `VALIDATION_ERROR` y `BUSINESS_RULE_VIOLATION` (Decisión 5)
- Masking 403→404 con flag `maskedAs404` (Decisión 6)
- `VALIDATION_ERROR` como código canónico (no `VALIDATION_FAILED`) (Decisión 7)

### Qué no debe implementarse

- Configuración del logger (asumido como disponible de US-089)
- Códigos de error de negocio específicos (`CURRENCY_IMMUTABLE`, etc.) — historias de features
- Localización de `error.message` con `Accept-Language` — futura iteración
- OpenTelemetry / APM / distributed tracing — NFR-OBS-006
- El middleware `validateRequestMiddleware` — US-092

### Suposiciones a preservar

- US-089 ya está implementado: Express, TypeScript, `src/app.ts`, `src/shared/` base, logger disponible
- El logger (`pino` u otro) acepta un campo `correlationId` en cada entrada; US-093 no configura el logger, solo lo usa
- `uuidv4()` está disponible (del paquete `uuid`) o equivalente nativo (Node 14.17+ tiene `crypto.randomUUID()`)
- Los controladores usarán siempre `success()` / `failure()`; no construirán envelopes manualmente

---

## 19. Task Generation Notes

### Grupos de tareas sugeridos

| Grupo | Tareas clave |
|---|---|
| **Errores base** | Implementar `DomainError`, `InfrastructureError`, `UnexpectedError`; `ErrorCodes.ts` con catálogo base |
| **Jerarquía dominio** | 7 subclases de `DomainError` con propiedades específicas (e.g., `maskedAs404` en `AuthorizationError`) |
| **Jerarquía infraestructura** | 4 subclases de `InfrastructureError` (AI, Prisma, External) |
| **Response types** | Tipos `ErrorEnvelope`, `SuccessEnvelope`, `PaginationMeta` |
| **Helpers** | `success()` y `failure()` con tipado correcto para `details[]` obligatorio |
| **correlationIdMiddleware** | Implementación + tests UT-04/UT-05 |
| **errorHandlerMiddleware** | Implementación + mapeo completo + tests IT-01 a IT-10 |
| **Integración en app.ts** | Registrar ambos middlewares en posiciones correctas |
| **Security tests** | SEC-T-01, SEC-T-02, SEC-T-03 |
| **Documentation alignment** | Actualizar Doc 14 §18.3 (maintenance task, no bloqueante) |

### Tareas QA requeridas

- NT-01 a NT-10 — cobertura completa de la jerarquía de errores (requeridos por DoD)
- NT-09 específico — verificar ausencia de stack trace en response 500
- NT-10 — verificar `correlationId` en todos los 4xx y 5xx
- Tests de `details[]` obligatorio en VALIDATION_ERROR y BUSINESS_RULE_VIOLATION

### Tareas de seguridad requeridas

- SEC-T-01 (no stack en responses)
- SEC-T-02 (masking 403→404 correcto)
- SEC-T-03 (correlationId consistente en error y response header)
- AUTH-TS-01 (masking retorna 404 y no 403)
- AUTH-TS-02 (error 500 sin información técnica explorable)

### Tareas de seed/demo requeridas

No aplica.

### Tareas de documentación requeridas

- Actualizar Doc 14 §18.3: `VALIDATION_FAILED` → `VALIDATION_ERROR`, `NOT_FOUND` → `RESOURCE_NOT_FOUND`, `RATE_LIMITED` → `RATE_LIMIT_EXCEEDED` (maintenance task, no bloquea desarrollo).

### Dependencias entre tareas

```
ErrorCodes.ts + jerarquía base (DomainError, InfrastructureError)
    ├── 7 subclases DomainError
    │     └── errorHandlerMiddleware
    │             ├── Tests IT-01 a IT-10
    │             └── Tests SEC-T-01, SEC-T-02, SEC-T-03
    ├── 4 subclases InfrastructureError
    └── Response types (ErrorEnvelope, SuccessEnvelope)
              ├── Helper success()
              └── Helper failure()  ← necesario también por US-092 (validateRequestMiddleware)

correlationIdMiddleware (independiente)
    └── Tests UT-04, UT-05, IT-10

Integración en app.ts
    └── Depende de: correlationIdMiddleware + errorHandlerMiddleware
```

### Consolidated tasks.md para PB-P0-003

Después de generar las tareas de US-092 y US-093, crear:

```
management/development-tasks/P0/PB-P0-003/PB-P0-003-tasks.md
```

Con la vista consolidada que incluya:
- US-093 primero (infraestructura base)
- US-092 segundo (consume lo de US-093)
- Dependencias cruzadas explícitas
- Criterio de DoD conjunto del backlog item

---

## 20. Technical Spec Readiness

| Check | Estado |
|---|---|
| User Story aprobada o explícitamente permitida para draft spec | Pass |
| Product Backlog mapping encontrado | Pass |
| Decision Resolution revisado si existe | Pass (7 decisiones formalizadas) |
| Scope claro | Pass |
| Architecture alignment claro | Pass |
| API impact claro | Pass |
| DB impact claro | Pass (No aplica) |
| AI impact claro | Pass (solo declaración de códigos AI en catálogo) |
| Security impact claro | Pass (masking 403→404, no stack en responses) |
| Testing strategy claro | Pass |
| **Ready for Development Task Breakdown** | **Yes** |

---

## 21. Final Recommendation

**Ready for Task Breakdown**

US-093 está completamente especificada. La implementación es clara: 2 middlewares de posición fija en el pipeline Express, una jerarquía de clases de errores con mapeo HTTP explícito, helpers tipados que son el único punto de salida para envelopes, y un catálogo de códigos base. Las 7 decisiones PO/BA están formalizadas y no deben reabrirse. El único punto de decisión técnica pendiente (AsyncLocalStorage vs `req.context` para propagación cross-capa) es una decisión de implementación del Tech Lead que no cambia los contratos ni los tests de la historia.

La coordinación con US-092 es unidireccional: US-093 provee la infraestructura; US-092 la consume. Implementar US-093 primero o en paralelo con un stub de `ValidationError`.

Siguiente paso: ejecutar `eventflow-user-story-to-development-tasks` para US-093.
