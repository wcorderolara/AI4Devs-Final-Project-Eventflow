# Technical Specification — US-092: Validación con Zod en todos los DTOs

## 1. Metadata

| Campo | Valor |
|---|---|
| User Story ID | US-092 |
| Source User Story | management/user-stories/US-092-zod-validation.md |
| Decision Resolution Artifact | management/user-stories/decision-resolutions/US-092-decision-resolution.md |
| Priority | P0 |
| Backlog ID | PB-P0-003 |
| Backlog Title | Backend Validation, Error Envelope & Logger |
| Backlog Execution Order | 3 (tercero en el bloque P0 Foundation) |
| User Story Position in Backlog Item | 1 de 2 |
| Related User Stories in Backlog Item | US-092 (esta historia), US-093 |
| Epic | EPIC-BE-001 — Backend Modular Monolith |
| Backlog Item Dependencies | PB-P0-002 (Backend Modular Monolith Bootstrap — US-089) |
| Feature | Validación DTO con Zod |
| Module / Domain | Platform/BE — shared-kernel + todos los módulos |
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

PB-P0-003 es el tercer backlog item P0, inmediatamente después de PB-P0-002 (Backend Bootstrap). Debe ejecutarse antes de PB-P0-004 (REST API Endpoints Foundation), ya que todos los endpoints de la API dependen del middleware de validación Zod y del error envelope unificado. Sin esta historia, PB-P0-004 no puede producir respuestas 400 estructuradas ni tipos TypeScript derivados de los schemas.

### Related User Stories in Same Backlog Item

| User Story | Rol en el Backlog Item | Orden sugerido |
|---|---|---|
| **US-092** (esta historia) | Implementar `validateRequestMiddleware(schema)` con Zod; schemas de request/response/AI output por módulo | 1 — infraestructura de validación de entrada |
| US-093 | Implementar `errorHandlerMiddleware`, error envelope `{code, message, details?, correlationId}`, helpers `success()`/`failure()`, jerarquía de errores de dominio y `ErrorCodes.ts` | 2 — infraestructura de errores que US-092 consume |

> **Nota de coordinación:** US-093 debe implementarse antes o en paralelo a US-092. El `validateRequestMiddleware` retorna errores usando el formato `VALIDATION_ERROR` que provee US-093. En desarrollo paralelo, US-092 puede usar un stub temporal del error envelope hasta que US-093 esté integrado.

---

## 3. Executive Technical Summary

US-092 implementa la capa de validación sintáctica en la frontera HTTP del backend modular monolith. El núcleo es `validateRequestMiddleware(schema: ZodSchema)`, un middleware Express reutilizable que valida `req.body`, `req.params` y `req.query` con el schema Zod declarado en la ruta, y retorna `400 VALIDATION_ERROR` con `details[]` por campo cuando la validación falla. Los schemas Zod se organizan en `src/modules/<module>/dto/` por feature. Todos los schemas de entrada usan `.strict()` por defecto; `.passthrough()` está prohibido y detectado por lint rule en CI. Adicionalmente, US-092 declara los schemas Zod para validar outputs del LLM antes de persistirlos (AI Output DTOs), completando la estrategia de validación en todos los límites de la arquitectura. Los tipos TypeScript de cada Request DTO se derivan directamente del schema Zod con `z.infer<typeof Schema>`, eliminando duplicación tipo/validador.

---

## 4. Scope Boundary

### In Scope

- Implementación de `validateRequestMiddleware(schema: ZodSchema)` en `src/shared/interface/middlewares/`
- Schemas Zod `.strict()` para `body`, `params` y `query` en todos los endpoints P0 del MVP
- Organización de schemas en `src/modules/<module>/dto/` (archivos `<action>-<entity>.request.ts`, `<entity>.response.ts`)
- Schemas Zod para AI Output DTOs (e.g., `EventPlanAIOutput`) en `src/modules/<module>/dto/`
- Lint rule que prohíbe `.passthrough()` en CI
- Tipos TypeScript derivados de schemas con `z.infer<>`
- Tests unitarios del middleware (input válido, inválido, campos inesperados, tipo incorrecto)
- Test de validación de AI output no conforme (NT-05)

### Out of Scope

- Validación semántica (referencias existen, estado coherente) — capa Application
- Validación de reglas de negocio (BR-*) — capa Domain
- Error envelope unificado (`errorHandlerMiddleware`, helpers, jerarquía, `ErrorCodes.ts`) — US-093
- Generación automática de OpenAPI desde schemas Zod (`zod-to-openapi`) — PB-P0-005/US-098
- Validación de variables de entorno (ya cubierta por `src/config/env.ts` en US-089/PB-P0-002)
- Schemas para endpoints de P1/P2/P3 — se agregan cuando el endpoint se implementa en su historia correspondiente
- Microservicios, Kubernetes, event brokers — MVP guardrail

### Explicit Non-Goals

- No usar `class-validator` ni `reflect-metadata` (rechazado en ADR-API-003)
- No crear un directorio global de schemas; cada feature es dueña de sus DTOs
- No generar documentación OpenAPI en esta historia

---

## 5. Architecture Alignment

### Backend Architecture

US-092 pertenece exclusivamente a la **capa Interface** del backend modular monolith (Clean/Hexagonal Architecture). El middleware vive en `src/shared/interface/middlewares/` y los schemas en `src/modules/<module>/dto/`. La validación sintáctica es responsabilidad única de esta capa; no hay lógica de negocio en los schemas.

Pipeline Express relevante (Doc 14 §8.2):

```
1. correlationIdMiddleware         ← US-093
2. requestLoggerMiddleware
3. jsonBodyParser (límite de tamaño)
4. corsMiddleware
5. helmet
6. rateLimitMiddleware (global laxo)
7. /api/v1 routes
   ├── authMiddleware             ← rutas protegidas
   ├── roleMiddleware             ← rutas RBAC
   ├── ownershipMiddleware        ← recursos privados
   ├── validateRequestMiddleware(schema)  ← US-092
   └── controller.handler
8. notFoundMiddleware
9. errorHandlerMiddleware         ← US-093
```

`validateRequestMiddleware` se aplica **por ruta**, después de `authMiddleware`/`roleMiddleware`/`ownershipMiddleware` y antes del controlador. Esto es intencional: la autenticación/autorización puede necesitar rechazar antes de validar el body.

### Frontend Architecture

No aplica directamente. El frontend consumirá los errores `400 VALIDATION_ERROR` a través del error envelope de US-093. En el futuro, React Hook Form + Zod puede reutilizar schemas del backend (fuera del scope de esta historia).

### Database Architecture

No aplica. US-092 actúa en la capa Interface sin acceso a la base de datos.

### API Architecture

El middleware es transversal a todos los endpoints `/api/v1/*`. El contrato de error de validación es:

```json
HTTP 400
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "name", "message": "Required" }
    ],
    "correlationId": "uuid-v4"
  }
}
```

Este formato lo provee US-093 (`errorHandlerMiddleware` + helper `failure()`). `validateRequestMiddleware` lanza `ValidationError` que el handler de US-093 convierte al envelope.

### AI / PromptOps Architecture

Los schemas de AI Output DTO (e.g., `EventPlanAIOutput`, `ChecklistAIOutput`, `BudgetSuggestionAIOutput`) se declaran en `src/modules/<module>/dto/` como parte de US-092. Estos schemas son consumidos por los use cases de `ai-assistance` al validar el output del LLM antes de persistirlo. Si el output no cumple el schema, se rechaza, se registra con correlationId y se notifica al usuario (sin persistir el output inválido).

### Security Architecture

- Zod `.strict()` en todos los Request DTOs previene la inyección de campos no declarados en el contrato HTTP.
- Los mensajes de validación exponen únicamente el campo afectado y el tipo esperado; nunca stack traces ni datos internos.
- Los logs de errores de validación no contienen PII ni secretos.
- La validación ocurre en la capa Interface, antes de que cualquier dato llegue a Application/Domain/Persistence.

### Testing Architecture

- Vitest para tests unitarios del middleware y schemas.
- Supertest para tests de integración de endpoints (request válido/inválido).
- Lint rule (ESLint o Biome) para detectar `.passthrough()` en CI.
- MockAIProvider para tests de validación de AI output (NT-05).

---

## 6. Functional Interpretation

| Acceptance Criterion | Interpretación Técnica | Capa(s) Impactada(s) |
|---|---|---|
| AC-01: Middleware de validación Zod operativo | Implementar `validateRequestMiddleware(schema)` en `src/shared/interface/middlewares/validate-request.middleware.ts`. Recibe un `ZodSchema`, valida `req.body`, `req.params`, `req.query` con `.strict()`. En éxito, coloca el resultado en `req.validated` y llama `next()`. | Interface / shared-kernel |
| AC-02: Rechazo de input inválido con 400 VALIDATION_ERROR | Cuando `schema.safeParse()` falla, el middleware construye un `ValidationError` (de US-093) con `details[]` mapeados desde `ZodError.errors`, y llama `next(err)` para que `errorHandlerMiddleware` lo serialice como 400. | Interface / shared-kernel |
| AC-03: Organización de schemas por módulo | Los schemas residen en `src/modules/<module>/dto/<action>-<entity>.request.ts` y `src/modules/<module>/dto/<entity>.response.ts`. Cada schema usa `.strict()`. Los tipos se exportan como `type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>`. | Interface (por módulo) |
| AC-04: Validación de output de IA con Zod | Los schemas `*AIOutputSchema` se declaran en `src/modules/<module>/dto/`. El use case de `ai-assistance` llama `OutputSchema.safeParse(llmResponse)` antes de persistir. En fallo, lanza error controlado sin persistir. | Application (ai-assistance) + Interface (dto/) |
| AC-05: Compatibilidad multi-environment | El middleware no depende de variables de entorno ni de configuración por entorno; es determinista. Los tests CI ejecutan el mismo middleware que producción. | Transversal |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

`validateRequestMiddleware` vive en `shared-kernel` (shared interface layer). Los schemas Zod viven en cada módulo de feature en su carpeta `dto/`. Esta separación respeta el encapsulamiento modular: el mecanismo de validación es compartido; los contratos de datos son privados a cada módulo.

### Use Cases / Application Services

No aplica para el middleware en sí. Los schemas de AI Output DTO son consumidos por los use cases de `ai-assistance`:

- `GenerateEventPlanUseCase` → consume `EventPlanAIOutputSchema`
- `GenerateChecklistUseCase` → consume `ChecklistAIOutputSchema`
- `GenerateBudgetSuggestionUseCase` → consume `BudgetSuggestionAIOutputSchema`
- `GenerateQuoteBriefUseCase` → consume `QuoteBriefAIOutputSchema`

Cada use case llama `Schema.safeParse(llmOutput)` y delega el manejo de error al `errorHandlerMiddleware` de US-093.

### Controllers / Routes

Los controladores declaran el middleware por ruta:

```typescript
// Patrón de uso (no código de producción):
router.post(
  '/events',
  authMiddleware,
  roleMiddleware(['organizer']),
  validateRequestMiddleware(CreateEventRequestSchema),
  eventController.createEvent
)
```

El controlador recibe `req.validated.body` (tipado) en lugar de `req.body` (sin tipar).

### DTOs / Schemas

**Estructura de archivos por módulo:**

```
src/modules/event-planning/dto/
  ├── create-event.request.ts       // CreateEventRequestSchema + type
  ├── update-event.request.ts       // UpdateEventRequestSchema + type
  ├── list-events.query.ts          // ListEventsQuerySchema + type
  ├── event.response.ts             // EventResponseSchema + type
  └── event-plan-ai-output.ts       // EventPlanAIOutputSchema + type

src/modules/identity-access/dto/
  ├── register-user.request.ts      // RegisterUserRequestSchema + type
  ├── login-user.request.ts         // LoginUserRequestSchema + type
  └── user.response.ts              // UserResponseSchema + type

src/modules/quote-flow/dto/
  ├── create-quote-request.request.ts
  ├── respond-quote.request.ts
  ├── list-quotes.query.ts
  └── quote-brief-ai-output.ts

src/shared/interface/middlewares/
  └── validate-request.middleware.ts  // validateRequestMiddleware(schema)
```

**Convenciones de naming (Doc 14 §16):**

| Tipo de archivo | Patrón | Ejemplo |
|---|---|---|
| Request DTO | `<action>-<entity>.request.ts` | `create-event.request.ts` |
| Response DTO | `<entity>.response.ts` | `event.response.ts` |
| Query DTO | `<entity>.query.ts` | `list-events.query.ts` |
| AI Output DTO | `<entity>-ai-output.ts` | `event-plan-ai-output.ts` |

**Schemas representativos P0 (basados en Doc 14 §14.4):**

`RegisterUserRequestSchema`:

| Campo | Tipo Zod | Validación |
|---|---|---|
| `email` | `z.string().email().max(254)` | Normalizar lowercase en transform |
| `password` | `z.string().min(10)` | ≥ 1 mayús, ≥ 1 dígito (refine) |
| `name` | `z.string().min(1).max(80).trim()` | |
| `role` | `z.enum(['organizer', 'vendor'])` | Admin no se registra por API |
| `language` | `z.string().optional()` | ∈ soportadas; default `es-LATAM` |
| `captchaToken` | `z.string().min(1)` | No vacío |

`CreateEventRequestSchema`:

| Campo | Tipo Zod | Validación |
|---|---|---|
| `name` | `z.string().min(1).max(120)` | |
| `event_type_id` | `z.string().uuid()` | ∈ `EventType` activos (semántica en Application) |
| `event_date` | `z.string().datetime()` | ISO datetime; ≥ ahora + 1 día (semántica en Application) |
| `location_country` | `z.string().length(2)` | Código ISO 3166-1 alpha-2 |
| `location_city` | `z.string().min(1).max(80)` | |
| `currency` | `z.enum([...SUPPORTED_CURRENCIES])` | Inmutable después (BR-BUDGET-001 en Domain) |
| `language` | `z.string().optional()` | ∈ soportadas |
| `description` | `z.string().max(2000).optional()` | |

> Los schemas completos para todos los módulos P0 se crean en las historias de feature correspondientes (PB-P0-004). US-092 provee el middleware y los schemas para los módulos P0 que los necesiten (identity-access, event-planning, quote-flow, ai-assistance).

### Repository / Persistence

No aplica. La capa Interface no accede a la base de datos.

### Validation Rules

| ID | Regla | Comportamiento |
|---|---|---|
| VR-01 | Todos los Request DTOs usan `.strict()` | Campos no declarados → 400 VALIDATION_ERROR |
| VR-02 | `.passthrough()` prohibido | Lint rule en CI; falla el build |
| VR-03 | Schemas en `src/modules/<module>/dto/` | Por convención de arquitectura (ADR-API-003) |
| VR-04 | AI Output validado con Zod antes de persistir | Rechazo y log si no cumple schema |
| VR-05 | Tipos TypeScript derivados con `z.infer<>` | Sin duplicación tipo/validador |

### Error Handling

`validateRequestMiddleware` no maneja errores directamente. Al detectar un schema inválido:

1. Mapea `ZodError.errors` a `Array<{ field: string; message: string }>`.
2. Construye un `ValidationError` (definido en US-093).
3. Llama `next(err)` para delegarlo al `errorHandlerMiddleware` de US-093.

Este flujo garantiza que el formato de error sea idéntico al de otros errores del sistema.

**Mapeo Zod → details[]:**

```
ZodError.errors[i] {
  path: ['email'],                   → field: 'email'
  message: 'Invalid email'           → message: 'Invalid email'
}
```

Para paths anidados: `path.join('.')` → `'address.city'`.

### Transactions

No aplica. El middleware no tiene acceso a la base de datos.

### Observability

- Los errores de validación se loguean a nivel `warn` con:
  - `correlationId` (proveniente de US-093)
  - `method` + `path`
  - Lista de campos fallidos (sin valores para evitar log de PII)
- Los valores de los campos **no** se loguean (prevención de log de datos sensibles como contraseñas o captcha tokens).

---

## 8. Frontend Technical Design

No aplica. US-092 es una capacidad técnica del backend sin UI propia. El frontend consumirá los errores `400 VALIDATION_ERROR` a través del error envelope de US-093.

---

## 9. API Contract Design

El middleware es transversal; no define endpoints propios. El contrato de error que produce es:

| Campo | Valor |
|---|---|
| HTTP Status | `400 Bad Request` |
| Error code | `VALIDATION_ERROR` |
| Error message | `"Validation failed"` (o similar en español) |
| `details[]` | Array de `{ field: string, message: string }`, uno por campo inválido |
| `correlationId` | UUID del request (propagado por US-093) |

Ejemplo completo de respuesta 400:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [
      { "field": "email", "message": "Formato de email inválido" },
      { "field": "password", "message": "Mínimo 10 caracteres" },
      { "field": "unknownField", "message": "Campo no reconocido" }
    ],
    "correlationId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## 10. Database / Prisma Design

No aplica. US-092 actúa en la capa Interface sin modificar el modelo de datos.

---

## 11. AI / PromptOps Design

### AI Feature

Validación de AI Output DTOs con Zod antes de persistir. Esta no es una feature IA en sí misma, sino la infraestructura de validación que protege la persistencia de outputs LLM.

### Provider

`LLMProvider` (abstracción). Los schemas Zod son agnósticos al proveedor.

### Prompt Version

No aplica directamente. Los schemas de output deben mantenerse alineados con el `outputSchema` declarado en cada `AIPromptVersion` (cubierto en PB-P0-010).

### Input Schema

No aplica en esta historia.

### Output Schema

Los siguientes AI Output Schemas se declaran como parte de US-092:

| Schema | Módulo | Uso |
|---|---|---|
| `EventPlanAIOutputSchema` | `ai-assistance` / `event-planning` | Output del LLM para plan de evento |
| `ChecklistAIOutputSchema` | `ai-assistance` / `task-management` | Output del LLM para checklist |
| `BudgetSuggestionAIOutputSchema` | `ai-assistance` / `budget-management` | Output del LLM para presupuesto |
| `QuoteBriefAIOutputSchema` | `ai-assistance` / `quote-flow` | Output del LLM para brief de cotización |

Cada schema usa `.strict()`. La estructura exacta de cada uno se define basándose en Doc 14 §14.4 y Doc 17.

### Human-in-the-loop

No aplica en esta historia. El HITL es responsabilidad de las historias de feature IA (PB-P0-010 y siguientes).

### Fallback

No aplica en esta historia.

### Persistence

Los schemas de AI Output son consumidos **antes** de persistir. Si la validación falla, no se persiste nada.

### Safety Rules

- Si `OutputSchema.safeParse(llmOutput)` falla → rechazar output, registrar error con `correlationId`, notificar al usuario con error controlado.
- Nunca persistir un output LLM que no pase la validación Zod.
- Los valores inválidos del output LLM **no** se loguean completos (pueden contener contenido inesperado).

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente. El middleware de validación actúa después de `authMiddleware` pero no depende de él.

### Authorization

No aplica directamente. La validación Zod es pre-autorización para la forma del request; la autorización es responsabilidad de `authMiddleware`, `roleMiddleware` y `ownershipMiddleware`.

### Ownership Rules

No aplica. Los schemas validan sintaxis; las reglas de ownership son semánticas (Application/Domain).

### Role Rules

No aplica directamente. Sin embargo, algunos campos pueden tener validaciones condicionales según el rol (e.g., `role: z.enum(['organizer', 'vendor'])` en registro excluye `admin`). Esto sí es validación sintáctica y pertenece al schema.

### Negative Authorization Scenarios

| Escenario | Comportamiento |
|---|---|
| Request con campo no declarado en `.strict()` | 400 VALIDATION_ERROR; el campo no pasa al controlador |
| Request con tipo de campo incorrecto | 400 VALIDATION_ERROR con campo y mensaje específico |
| Output LLM no conforme al schema | Rechazado; sin persistencia; sin stack trace al usuario |
| Intento de inyectar campos extra | Zod `.strict()` los rechaza antes de llegar a Application |

### Audit Requirements

No aplica. Los errores de validación son eventos operacionales normales, no auditoría de seguridad. Se loguean a nivel `warn` con correlationId para observabilidad, pero no requieren `AdminAction`.

### Sensitive Data Handling

- Los valores de los campos de entrada **no se loguean** (prevención de log de passwords, captcha tokens, datos personales).
- Los mensajes de error de validación exponen únicamente el nombre del campo y el tipo esperado.
- Los logs de errores de AI Output **no incluyen el contenido completo** del output inválido.

---

## 13. Testing Strategy

### Unit Tests

| ID | Escenario | Herramienta | Verificación |
|---|---|---|---|
| UT-01 | Request con body válido pasa el middleware | Vitest | `next()` llamado sin error; `req.validated.body` contiene el DTO tipado |
| UT-02 | Request con campo faltante requerido | Vitest | `next(err)` llamado con `ValidationError`; `details[]` contiene el campo |
| UT-03 | Request con campo extra (`.strict()`) | Vitest | `next(err)` con `VALIDATION_ERROR`; campo extra no pasa |
| UT-04 | Request con tipo de campo incorrecto | Vitest | `next(err)` con `VALIDATION_ERROR`; campo y mensaje en `details[]` |
| UT-05 | Middleware reutilizable con distintos schemas | Vitest | Mismo middleware, schemas distintos → comportamiento correcto en ambos |
| UT-06 | Schema `.passthrough()` detectado | Vitest / ESLint | Lint rule falla en CI (NT-06) |

### Integration Tests

| ID | Escenario | Herramienta | Verificación |
|---|---|---|---|
| IT-01 | POST /api/v1/auth/register con body válido | Supertest | 201 o 400 por captcha (no por validación Zod) |
| IT-02 | POST /api/v1/auth/register con email inválido | Supertest | 400 `VALIDATION_ERROR`; `details[0].field = 'email'` |
| IT-03 | POST /api/v1/events con body completo válido | Supertest | Request pasa validación; llega al controlador |
| IT-04 | POST /api/v1/events con campo inesperado | Supertest | 400 `VALIDATION_ERROR` |
| IT-05 | GET /api/v1/events con query param inválido | Supertest | 400 `VALIDATION_ERROR` con campo de query |

### API Tests

Cubiertos por Integration Tests con Supertest.

### E2E Tests

No aplica en esta historia. Los tests E2E de flujos de usuario son responsabilidad de las historias de feature (PB-P0-004+).

### Security Tests

| ID | Escenario | Verificación |
|---|---|---|
| SEC-T-01 | Inyección de campo `role: admin` en registro | 400 VALIDATION_ERROR (`.enum(['organizer', 'vendor'])` rechaza `admin`) |
| SEC-T-02 | Campo extra potencialmente malicioso en body | 400 VALIDATION_ERROR; campo no llega al controlador |
| SEC-T-03 | Password en mensaje de error | El `details[]` no contiene el valor del campo (solo el nombre) |

### Accessibility Tests

No aplica — capacidad técnica sin UI.

### AI Tests

| ID | Escenario | Herramienta | Verificación |
|---|---|---|---|
| AI-T-01 | Output LLM conforme al schema | Vitest + MockAIProvider | Output pasa validación; fluye a persistencia |
| AI-T-02 | Output LLM con campos faltantes | Vitest + MockAIProvider | `safeParse` falla; error registrado; sin persistencia |
| AI-T-03 | Output LLM con campos extra (`.strict()`) | Vitest + MockAIProvider | `safeParse` falla; output rechazado |

### Seed / Demo Tests

No aplica directamente. El seed no pasa por `validateRequestMiddleware`.

### CI Checks

| Check | Herramienta | Criterio de éxito |
|---|---|---|
| Lint rule `.passthrough()` | ESLint custom rule o Biome | Ningún archivo `dto/*.ts` contiene `.passthrough()` |
| Type check | TypeScript `tsc --noEmit` | Todos los tipos derivados de Zod compilan sin errores |
| Unit tests | Vitest | UT-01 a UT-06 pasan |
| Integration tests | Supertest + Vitest | IT-01 a IT-05 pasan |

---

## 14. Observability & Audit

### Logs

Los errores de validación se loguean a nivel `warn` con el siguiente payload estructurado:

```json
{
  "level": "warn",
  "event": "validation_failed",
  "correlationId": "uuid-v4",
  "method": "POST",
  "path": "/api/v1/auth/register",
  "fields": ["email", "password"],
  "timestamp": "ISO-8601"
}
```

- `fields` contiene los nombres de los campos fallidos, **sin los valores**.
- No se loguea `req.body` ni `req.params` completo para prevenir log de PII.

### Correlation ID

El `correlationId` en los logs de validación proviene de `req.correlationId`, que es poblado por `correlationIdMiddleware` de US-093 antes de que el request llegue a `validateRequestMiddleware`.

### AdminAction

No aplica. Los errores de validación son eventos operacionales, no acciones administrativas auditables.

### Error Tracking

Los errores de validación son `warn`; no generan alertas de error tracking (nivel `error` o superior). Solo los errores inesperados (5xx) generan alertas.

### Metrics

No aplica en MVP. La frecuencia de errores de validación puede inferirse de los logs (NFR-OBS-006 excluye métricas enterprise en MVP).

---

## 15. Seed / Demo Data Impact

No aplica. El seed script no pasa por `validateRequestMiddleware`. El seed usa los use cases directamente o inserta con Prisma Client, no a través de la API HTTP.

---

## 16. Documentation Alignment Required

| Documento / Fuente | Conflicto | Decisión vigente | Acción recomendada | ¿Bloquea implementación? |
|---|---|---|---|---|
| Doc 14 §18.3 usa `VALIDATION_FAILED` | Conflicto con ADR-API-002 y Doc 16 §14.2 que usan `VALIDATION_ERROR` | `VALIDATION_ERROR` es el código canónico (Decisión 7 del Decision Resolution de US-093) | Actualizar Doc 14 §18.3: `VALIDATION_FAILED` → `VALIDATION_ERROR` | No |

---

## 17. Technical Risks & Mitigations

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Dependency circular US-092 ↔ US-093 | `validateRequestMiddleware` necesita `ValidationError` de US-093; US-093 necesita la infraestructura de US-089 | Implementar US-093 primero o en paralelo; US-092 puede usar un stub temporal de `ValidationError` durante desarrollo |
| Schema incompleto → campos no validados llegan al controlador | Seguridad / correctness | Lint rule que verifica que cada ruta con input tenga `validateRequestMiddleware` declarado; revision en PR |
| `.passthrough()` accidental en schema de AI Output | Output LLM con campos no declarados pasa a persistencia | Lint rule extiende a archivos `ai-output.ts`; tests AI-T-03 |
| Schemas de AI Output divergen del prompt actual | Validación falla en producción con outputs LLM reales | Schemas se mantienen alineados con `outputSchema` en `AIPromptVersion` (coordinación con PB-P0-010) |
| Mapeo de `ZodError.path` a `field` string | Paths anidados pueden ser confusos para el frontend | Usar `path.join('.')` consistentemente; documentar convención en `validateRequestMiddleware` |
| Lint rule no configurada antes de PB-P0-004 | Developers agregan `.passthrough()` sin saberlo | La lint rule se configura como parte de esta historia (NT-06); bloquea CI desde el inicio |

---

## 18. Implementation Guidance for Coding Agents

### Archivos y carpetas impactados

```
src/shared/interface/middlewares/
  └── validate-request.middleware.ts       [NUEVO]

src/modules/identity-access/dto/
  ├── register-user.request.ts             [NUEVO]
  ├── login-user.request.ts                [NUEVO]
  └── user.response.ts                     [NUEVO]

src/modules/event-planning/dto/
  ├── create-event.request.ts              [NUEVO]
  ├── update-event.request.ts              [NUEVO]
  ├── list-events.query.ts                 [NUEVO]
  ├── event.response.ts                    [NUEVO]
  └── event-plan-ai-output.ts              [NUEVO]

src/modules/quote-flow/dto/
  ├── create-quote-request.request.ts      [NUEVO]
  ├── respond-quote.request.ts             [NUEVO]
  ├── list-quotes.query.ts                 [NUEVO]
  └── quote-brief-ai-output.ts             [NUEVO]

src/modules/ai-assistance/dto/
  ├── checklist-ai-output.ts               [NUEVO]
  └── budget-suggestion-ai-output.ts       [NUEVO]

.eslintrc.js / biome.json                  [MODIFICADO — lint rule]
```

### Orden de implementación recomendado

1. **Verificar US-093 (o stub)** — Asegurar que `ValidationError` esté disponible en `src/shared/errors/` antes de implementar el middleware.
2. **Implementar `validate-request.middleware.ts`** — El middleware genérico; sin dependencias de feature.
3. **Tests unitarios del middleware** (UT-01 a UT-06) — Antes de los schemas de feature.
4. **Configurar lint rule `.passthrough()`** — Antes de crear los schemas para garantizar enforcement desde el inicio.
5. **Crear schemas P0 por módulo** — Siguiendo el orden de módulos: `identity-access` → `event-planning` → `quote-flow` → `ai-assistance`.
6. **Crear AI Output schemas** — `EventPlanAIOutputSchema`, `ChecklistAIOutputSchema`, `BudgetSuggestionAIOutputSchema`, `QuoteBriefAIOutputSchema`.
7. **Integration tests** (IT-01 a IT-05) — Después de que al menos un endpoint de PB-P0-004 exista.

### Decisiones que no deben reabrirse

- Zod como librería de validación (ADR-API-003 — Accepted).
- `.strict()` por defecto en todos los schemas de entrada (ADR-API-003).
- `.passthrough()` prohibido (ADR-API-003 + Decision Resolution US-092 Decisión 2).
- Schemas en `src/modules/<module>/dto/` (Decision Resolution US-092 Decisión 3).
- AI Output validado con Zod antes de persistir (Decision Resolution US-092 Decisión 4).
- `class-validator` rechazado (ADR-API-003 — alternativa evaluada y descartada).

### Qué no debe implementarse

- Error envelope (`errorHandlerMiddleware`, helpers, jerarquía) — US-093.
- Generación de OpenAPI (`zod-to-openapi`) — PB-P0-005/US-098.
- Schemas para endpoints P1/P2/P3 — se agregan en sus historias correspondientes.
- Validación semántica (referencias existen) — capa Application.
- Validación de reglas de negocio (BR-*) — capa Domain.
- Microservicios, brokers, OpenTelemetry — MVP guardrail.

### Suposiciones a preservar

- US-089 (PB-P0-002) ya está implementado: Express, TypeScript, Prisma, estructura de carpetas base.
- US-093 provee `ValidationError` y el error envelope. Si se desarrolla en paralelo, usar un stub tipado de `ValidationError` durante el desarrollo de US-092.
- Los schemas de AI Output se declaran ahora pero son consumidos activamente cuando los use cases de `ai-assistance` se implementen (PB-P0-009, PB-P0-010, PB-P0-011).

---

## 19. Task Generation Notes

### Grupos de tareas sugeridos

| Grupo | Tareas clave |
|---|---|
| **Setup** | Verificar disponibilidad de `ValidationError` (US-093 o stub); configurar lint rule `.passthrough()` |
| **Core Middleware** | Implementar `validate-request.middleware.ts`; tests unitarios UT-01 a UT-06 |
| **Schemas P0 — Identity** | `RegisterUserRequestSchema`, `LoginUserRequestSchema`, `UserResponseSchema` |
| **Schemas P0 — Events** | `CreateEventRequestSchema`, `UpdateEventRequestSchema`, `ListEventsQuerySchema`, `EventResponseSchema` |
| **Schemas P0 — Quote Flow** | `CreateQuoteRequestSchema`, `RespondQuoteRequestSchema`, `ListQuotesQuerySchema` |
| **Schemas AI Output** | `EventPlanAIOutputSchema`, `ChecklistAIOutputSchema`, `BudgetSuggestionAIOutputSchema`, `QuoteBriefAIOutputSchema` |
| **Integration Tests** | IT-01 a IT-05 con Supertest (dependen de PB-P0-004) |
| **Security Tests** | SEC-T-01, SEC-T-02, SEC-T-03 |
| **AI Tests** | AI-T-01, AI-T-02, AI-T-03 con MockAIProvider |
| **CI** | Verificar lint rule activa en pipeline (depende de PB-P0-017) |

### Tareas QA requeridas

- Tests negativos por cada schema (NT-01 a NT-05) — requeridos por ADR-API-003.
- Lint rule `.passthrough()` activa en CI (NT-06).
- Tests de no-log de valores sensibles (SEC-T-03).

### Tareas de seguridad requeridas

- SEC-T-01 (campo `role: admin` rechazado en registro).
- SEC-T-02 (campo extra potencialmente malicioso rechazado).
- SEC-T-03 (password no aparece en mensaje de error).

### Tareas de seed/demo requeridas

No aplica — el seed no usa `validateRequestMiddleware`.

### Tareas de documentación requeridas

- Actualizar Doc 14 §18.3: `VALIDATION_FAILED` → `VALIDATION_ERROR` (no bloqueante para desarrollo).

### Dependencias entre tareas

```
US-093 (o stub ValidationError)
    └── validateRequestMiddleware (Core Middleware)
            ├── Tests unitarios UT-01 a UT-06
            ├── Schemas P0 — Identity
            ├── Schemas P0 — Events
            ├── Schemas P0 — Quote Flow
            └── Schemas AI Output
                    └── Integration Tests (IT-01 a IT-05)
                            └── Depende también de PB-P0-004 (endpoints existentes)
```

### Consolidated tasks.md para PB-P0-003

Después de generar las tareas de US-092 y US-093, se recomienda crear:

```
management/development-tasks/P0/PB-P0-003/PB-P0-003-tasks.md
```

con la vista consolidada de todas las tareas del backlog item, incluyendo las dependencias cruzadas entre US-092 y US-093.

---

## 20. Technical Spec Readiness

| Check | Estado |
|---|---|
| User Story aprobada o explícitamente permitida para draft spec | Pass |
| Product Backlog mapping encontrado | Pass |
| Decision Resolution revisado si existe | Pass |
| Scope claro | Pass |
| Architecture alignment claro | Pass |
| API impact claro | Pass |
| DB impact claro | Pass (No aplica) |
| AI impact claro | Pass |
| Security impact claro | Pass |
| Testing strategy claro | Pass |
| **Ready for Development Task Breakdown** | **Yes** |

---

## 21. Final Recommendation

**Ready for Task Breakdown**

US-092 está completamente especificada. El middleware `validateRequestMiddleware(schema)` tiene una implementación clara, un lugar definido en la arquitectura, dependencias explícitas (US-093 o stub), un conjunto de schemas P0 identificados, y una estrategia de testing completa. Las cuatro decisiones PO/BA están formalizadas y no deben reabrirse. El único punto de coordinación activo es la implementación paralela con US-093: se puede resolver con un stub tipado de `ValidationError` durante el desarrollo y reemplazarlo al integrar ambas historias.

Siguiente paso: ejecutar `eventflow-user-story-to-development-tasks` para US-092.
