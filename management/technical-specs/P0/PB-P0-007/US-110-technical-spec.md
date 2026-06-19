# Technical Specification — US-110: Rate limiting en auth y endpoints IA

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-110 |
| Source User Story | `management/user-stories/US-110-rate-limiting-auth-and-ai.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-110-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-007 |
| Backlog Title | Rate limiting en login/recovery/AI y cadena de middlewares en orden |
| Backlog Execution Order | 7 |
| User Story Position in Backlog Item | 1 of 2 |
| Related User Stories in Backlog Item | US-110, US-111 |
| Epic | EPIC-SEC-001 |
| Backlog Item Dependencies | PB-P0-006 |
| Feature | Rate limiting |
| Module / Domain | Security / Identity Access / AI Assistance |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-16 |
| Last Updated | 2026-06-16 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-007 endurece el backend con rate limiting en endpoints sensibles y valida el orden seguro de middlewares. US-110 cubre exclusivamente las políticas estrictas de rate limiting para autenticación pública y generación IA. US-111 cubre el orden de middlewares, `helmet`, CORS, `notFoundMiddleware` y `errorHandlerMiddleware`.

### Execution Order Rationale

Este backlog item se ejecuta después de PB-P0-006 porque depende de cookies HTTP-only y captcha para completar la protección de auth. US-110 debe ir antes o en paralelo temprano con US-111 porque define las políticas que el pipeline debe ubicar correctamente.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-110 | Define rate limit estricto para auth y AI | 1 |
| US-111 | Define y valida orden seguro de middlewares | 2 |

---

## 3. Executive Technical Summary

Implementar políticas de `rateLimitMiddleware` configurables para:

- `POST /api/v1/auth/login`: 10 intentos por IP cada 10 minutos.
- `POST /api/v1/auth/register`: 5 intentos por IP cada 10 minutos.
- `POST /api/v1/auth/password/reset-request`: 3 intentos por email normalizado cada 1 hora.
- Endpoints `POST /api/v1/.../ai/*` de generación IA implementados en MVP: 10 generaciones agregadas por usuario autenticado cada 1 hora.

El limiter usa storage in-memory por proceso en MVP, validación de env vars en bootstrap, error envelope estándar con `RATE_LIMIT_EXCEEDED`, headers `X-RateLimit-*`/`Retry-After`, logs seguros con `correlationId`, y debe cortar el flujo antes de side effects: no credential check, no creación de usuario, no reset token/email, no llamada a `LLMProvider` y no creación de `AIRecommendation`.

---

## 4. Scope Boundary

### In Scope

- Policies de rate limit por endpoint auth.
- Policy agregada de rate limit para generación IA por `userId`.
- Configuración y validación de env vars.
- Headers y error envelope para 429.
- Integración del limiter en la posición definida por US-111.
- Tests unitarios, integración, API, seguridad, AI no-call y demo smoke.
- Logs seguros y redacción de campos sensibles.

### Out of Scope

- Orden de middlewares, `helmet`, CORS y error handler global, cubiertos por US-111.
- Captcha provider y token plumbing, cubiertos por US-109.
- Cookies HTTP-only, cubiertas por US-108.
- Redis/Memcached/WAF/API Gateway throttling.
- Persistir counters en DB.
- Crear endpoints IA nuevos.
- Cambiar timeout/fallback/prompt registry/persistencia de `AIRecommendation`.
- Cambiar el cap funcional de regeneraciones IA de US-026.

### Explicit Non-Goals

- No implementar infraestructura distribuida de rate limiting.
- No desactivar rate limiting en Demo.
- No usar frontend como fuente de verdad para cuotas.
- No usar password, tokens, cookies, prompt completo o payload completo como key.
- No generar production code desde esta especificación.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. Implementar como middleware/policies en la Interface Layer de Express, usando TypeScript, configuración validada con Zod y manteniendo controllers delgados. El limiter no debe introducir lógica de negocio en controllers.

### Frontend Architecture

Impacto mínimo. El frontend sólo debe consumir `429 RATE_LIMIT_EXCEEDED`, `Retry-After`, `X-RateLimit-*` y `correlationId` si el API client aún no lo hace. No calcula cuotas ni persiste estado de limiter.

### Database Architecture

No aplica. No hay tablas, migrations, índices ni persistencia de counters.

### API Architecture

Aplica. Mantener REST JSON bajo `/api/v1`, error envelope estándar y headers de rate limit.

### AI / PromptOps Architecture

Aplica sólo como protección previa. US-110 no invoca IA, no modifica prompts y no crea `AIRecommendation`; debe impedir llamada a `LLMProvider` cuando el request está rate limited.

### Security Architecture

Aplica. Backend as source of truth, anti-abuse server-side, redacción de logs, no secrets en frontend, no side effects después de 429, y respeto de ADR-SEC-004.

### Testing Architecture

Aplica. Vitest para policies/unit, Supertest para API/integration, fake timers o clock inyectable para ventanas, `MockAIProvider`/spy para verificar no-call, y checks CI.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Login rate limit | Policy por IP confiable para login con ventana 10 min y máximo 10; 429 antes de credential check | Backend, API, Security, QA |
| AC-02 Register rate limit | Policy por IP confiable con máximo 5/10 min; 429 antes de crear usuario/perfil | Backend, API, Security, QA |
| AC-03 Password reset rate limit | Policy por email normalizado con máximo 3/hora; 429 sin reset token ni email y sin enumeración | Backend, API, Security, QA |
| AC-04 AI generation rate limit | Policy agregada `ai:user:{userId}` con máximo 10/hora; 429 antes de `LLMProvider` y `AIRecommendation` | Backend, AI boundary, Security, QA |
| AC-05 Config fail-fast | Env vars positivas y válidas con Zod en bootstrap | Backend, DevOps, QA |
| AC-06 Headers/error envelope | `RATE_LIMIT_EXCEEDED` 429, `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` | API, Frontend API client, QA |
| AC-07 Observabilidad segura | Log estructurado con metadata mínima y sin secretos/PII/prompt | Observability, Security |
| AC-08 Tests | Cobertura de límites, reset de ventana, no side effects y exclusiones | QA, CI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `shared/interface/middlewares/rate-limit` o equivalente para middleware genérico.
- `shared/infrastructure/rate-limit` para store in-memory, clock, policy registry y config.
- `identity-access/interface/routes` para aplicar policies auth.
- `ai-assistance/interface/routes` para aplicar policy agregada IA.
- `shared/infrastructure/config` para env vars.
- `shared/infrastructure/logger` para logs seguros.

### Use Cases / Application Services

No crear use cases de dominio. El rate limiting es una preocupación de Interface/Security previa a Application. Puede existir un servicio técnico `RateLimitService` o `RateLimiterPolicyEvaluator` sin depender de Express directamente.

### Controllers / Routes

Aplicar middleware antes del handler en:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/password/reset-request`
- `POST /api/v1/events/:eventId/ai/event-plan`
- `POST /api/v1/events/:eventId/ai/checklist`
- `POST /api/v1/events/:eventId/ai/budget-suggestion`
- `POST /api/v1/events/:eventId/ai/vendor-categories`
- `POST /api/v1/events/:eventId/ai/quote-brief`
- `POST /api/v1/quote-requests/:quoteRequestId/ai/comparison-summary`
- `POST /api/v1/events/:eventId/ai/task-prioritization`

No aplicar policy estricta de US-110 a endpoints fuera de scope.

### DTOs / Schemas

No cambiar DTOs funcionales. Agregar schemas de configuración:

- `AUTH_LOGIN_RATE_LIMIT_MAX`
- `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS`
- `AUTH_REGISTER_RATE_LIMIT_MAX`
- `AUTH_REGISTER_RATE_LIMIT_WINDOW_MS`
- `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`
- `AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS`
- `AI_RATE_LIMIT_MAX`
- `AI_RATE_LIMIT_WINDOW_MS`

Todos deben ser enteros positivos.

### Repository / Persistence

No aplica. Store in-memory por proceso con TTL/window y API de reset para tests.

### Validation Rules

- IP confiable para login/register.
- Email normalizado `trim().toLowerCase()` para password reset.
- `userId` autenticado para AI.
- No usar secretos/tokens/payload como key.
- Fail-fast ante config inválida.

### Error Handling

Responder 429 con error envelope estándar:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "correlationId": "<correlationId>"
  }
}
```

El mensaje puede ser localizado por frontend/i18n, pero el code debe ser estable. Incluir `Retry-After` cuando se pueda calcular.

### Transactions

No abrir transacciones para requests rate limited. El limiter debe correr antes de cualquier handler que cree usuario, reset token, email simulado, llamada LLM o `AIRecommendation`.

### Observability

Emitir evento estructurado como `security.rate_limit.exceeded` o equivalente con campos permitidos:

- `correlationId`
- route pattern
- limiter policy
- key type
- hashed/normalized key identifier
- remaining/reset metadata
- status

Prohibido: password, cookie, JWT, reset token, captcha token, provider secret, prompt completo, LLM response, email completo, raw body.

---

## 8. Frontend Technical Design

### Routes / Pages

No hay rutas nuevas.

### Components

No hay componentes nuevos obligatorios.

### Forms

No hay cambios de formularios salvo mostrar mensaje genérico si API retorna `RATE_LIMIT_EXCEEDED`.

### State Management

No persistir cuotas localmente. El backend es fuente de verdad.

### Data Fetching

El API client debe preservar acceso a `error.code`, `correlationId`, `Retry-After` y headers `X-RateLimit-*` si el manejo actual no los expone.

### Loading / Empty / Error / Success States

Sólo error state genérico/reintentable para 429.

### Accessibility

No aplica como UI nueva. Si se agrega mensaje de error, debe ser anunciado por el patrón existente de errores de formulario.

### i18n

El mensaje de `RATE_LIMIT_EXCEEDED` debe mapearse a copy traducible existente o nuevo key de i18n si el cliente renderiza texto propio.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Login con límite 10/IP/10 min | No | Login DTO + captcha según US-109 | Auth response | 400, 401, 422, 429 `RATE_LIMIT_EXCEEDED` |
| POST | `/api/v1/auth/register` | Registro con límite 5/IP/10 min | No | Register DTO + captcha según US-109 | 201 | 400, 409, 422, 429 |
| POST | `/api/v1/auth/password/reset-request` | Solicitud reset con límite 3/email/h | No | Email DTO + captcha según US-109 | 202 / respuesta anti-enumeración | 400, 429 |
| POST | `/api/v1/events/:eventId/ai/event-plan` | Generar AI event plan con límite 10/user/h agregado | Sí | AI request DTO | AI response | 401, 403, 404, 422, 429, 503 |
| POST | `/api/v1/events/:eventId/ai/checklist` | Generar checklist IA | Sí | AI request DTO | AI response | 401, 403, 404, 422, 429, 503 |
| POST | `/api/v1/events/:eventId/ai/budget-suggestion` | Generar budget suggestion | Sí | AI request DTO | AI response | 401, 403, 404, 422, 429, 503 |
| POST | `/api/v1/events/:eventId/ai/vendor-categories` | Generar categorías IA | Sí | AI request DTO | AI response | 401, 403, 404, 422, 429, 503 |
| POST | `/api/v1/events/:eventId/ai/quote-brief` | Generar quote brief | Sí | AI request DTO | AI response | 401, 403, 404, 422, 429, 503 |
| POST | `/api/v1/quote-requests/:quoteRequestId/ai/comparison-summary` | Generar comparación IA | Sí | AI request DTO | AI response | 401, 403, 404, 422, 429, 503 |
| POST | `/api/v1/events/:eventId/ai/task-prioritization` | Generar priorización IA | Sí | AI request DTO | AI response | 401, 403, 404, 422, 429, 503 |

Headers esperados cuando aplique:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `Retry-After`

---

## 10. Database / Prisma Design

### Models Impacted

No aplica.

### Fields / Columns

No aplica.

### Relations

No aplica.

### Indexes

No aplica.

### Constraints

No aplica.

### Migrations Impact

No migrations.

### Seed Impact

No requiere cambios de seed.

---

## 11. AI / PromptOps Design

### AI Feature

No genera contenido IA. Protege endpoints de generación IA.

### Provider

No invocar `LLMProvider` cuando el request está rate limited. En tests puede usarse spy/mock para verificar que no se llama.

### Prompt Version

No aplica.

### Input Schema

No cambia schemas IA. El limiter se evalúa antes de llamar al provider y después de auth/ownership según el pipeline definido.

### Output Schema

No aplica.

### Human-in-the-loop

No cambia HITL. Si el request no está limitado, aplican reglas existentes de `AIRecommendation` pending/accept/discard.

### Fallback

No fallback para 429. El limiter retorna error controlado sin provider timeout/fallback.

### Persistence

No crear `AIRecommendation` si el request está rate limited.

### Safety Rules

- No loggear prompt completo ni LLM response.
- No usar payload IA como key.
- No exponer provider secrets.

---

## 12. Security & Authorization Design

### Authentication

Auth endpoints públicos no requieren sesión; AI endpoints requieren usuario autenticado antes de aplicar key por `userId`.

### Authorization

AI endpoints deben pasar RBAC/ownership/policy antes de consumir cuota costosa y antes de llamar a `LLMProvider`. Si auth falla, responder 401 antes de rate limit por user.

### Ownership Rules

Eventos y quote requests deben validar ownership/assignment conforme a Doc 19 antes de `LLMProvider`.

### Role Rules

- Auth endpoints: anonymous.
- AI endpoints de evento/quote: organizer según contrato actual.
- No crear ni proteger endpoints future que no estén implementados.

### Negative Authorization Scenarios

- Anónimo llama AI endpoint -> 401.
- Usuario sin ownership -> 403/404 antes de provider.
- Usuario excede límite AI -> 429 antes de provider/persistencia.
- Login/register/reset exceden límite -> 429 antes de side effects.

### Audit Requirements

No `AdminAction`. Los eventos de rate limit se registran en logs estructurados de seguridad.

### Sensitive Data Handling

Redactar passwords, cookies, JWT, reset tokens, captcha tokens, provider secrets, prompt completo, LLM response, email completo y raw request body.

---

## 13. Testing Strategy

### Unit Tests

- Policy de login: max 10, window 10 min, key IP.
- Policy de register: max 5, window 10 min, key IP.
- Policy de password reset: max 3, window 1 h, key email normalizado.
- Policy AI: max 10, window 1 h, key `ai:user:{userId}`.
- Config validation con valores inválidos.
- Store in-memory reset y clock/fake timers.

### Integration Tests

- Supertest sobre auth endpoints para 429 y no side effects.
- Supertest sobre AI endpoints con `MockAIProvider` spy para verificar no-call.
- Ventana expirada reinicia contador.

### API Tests

- Error envelope `RATE_LIMIT_EXCEEDED`.
- Headers `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.
- Endpoints fuera de scope no reciben policy estricta de US-110.

### E2E Tests

No obligatorio. Smoke demo puede cubrir login y generación IA sin exceder límites.

### Security Tests

- Logs sin password, tokens, cookies, captcha token, email completo.
- Logs IA sin prompt completo, LLM response ni provider secret.
- AI ownership failure ocurre antes de provider.

### Accessibility Tests

No aplica salvo que se agregue UI para error 429; usar patrón existente.

### AI Tests

- `LLMProvider` no llamado si rate limited.
- `AIRecommendation` no creada si rate limited.
- No fallback por 429.

### Seed / Demo Tests

- Guion demo normal no excede 10 AI generations/user/h.
- Login/register/password reset smoke no excede límites.

### CI Checks

- Ejecutar unit/integration/security tests en CI.
- No usar esperas reales para ventanas.
- Store aislado por test.

---

## 14. Observability & Audit

### Logs

Evento recomendado: `security.rate_limit.exceeded`.

Campos permitidos: `correlationId`, route pattern, limiter policy, key type, hashed/normalized key identifier, remaining, resetAt/Retry-After, status.

### Correlation ID

Obligatorio en logs y error envelope. Depende de `correlationIdMiddleware` de US-111/US-091.

### AdminAction

No aplica.

### Error Tracking

429 no debe tratarse como error inesperado. Registrar como warning/security event. Config inválida en bootstrap puede registrarse como error seguro sin secretos.

### Metrics

Opcional para MVP. Si existe infraestructura de métricas, contar `rate_limit.exceeded` por policy/route sin PII.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No requiere seed.

### Demo Scenario Supported

Protege demo frente a abuso de auth y costos IA. El guion normal debe mantenerse dentro de límites default.

### Reset / Isolation Notes

En Demo, si se repite el guion muchas veces, resetear proceso o documentar espera de ventana. No desactivar rate limit silenciosamente.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| NFR-SEC-004 / BR-AUTH-011 vs ADR-SEC-004 / Doc 16 | Algunos documentos enfatizan captcha/anti-bot en register/login; ADR-SEC-004 y Doc 16 incluyen password reset request y rate limit. | Aplicar rate limit a login, register y password reset request con umbrales de ADR-SEC-004. | Alinear BR/NFR en revisión documental futura. | No |
| Doc 14 | Menciona rate limit por IP global laxo, por IP estricto en auth y crear QuoteRequest; PB-P0-007 menciona AI generations. | US-091 cubre global laxo; US-110 cubre auth y AI. QuoteRequest no entra en US-110. | Crear historia futura si se promueve QuoteRequest rate limit. | No |
| PB-P0-007 | Agrupa rate limiting, middleware order y Helmet. | US-110 cubre rate limiting; US-111 cubre middleware order, Helmet y CORS. | Mantener separación en tasks/specs. | No |
| Doc 16 §35.3 | Lista `POST /vendors/me/ai/bio`, pero vendor AI bio/package puede ser future/optional. | US-110 sólo protege endpoints IA implementados en MVP y no crea endpoints futuros. | No implementar AI-007 si está fuera del MVP. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| In-memory store no coordina múltiples instancias | Límites inconsistentes si escala horizontalmente | Aceptado para MVP; Redis/Memcached futuro si se escala |
| `TRUST_PROXY` mal configurado | IP spoofing o bloqueo incorrecto | Validar config por entorno y no confiar en headers arbitrarios |
| Rate limit aplicado antes de auth en AI | No existe `userId`; key incorrecta | US-111 debe ubicar auth/ownership antes del limiter AI por user o aplicar limiter AI después de auth |
| Password reset revela existencia por 429/email | Enumeración de cuentas | Mantener mensajes genéricos y no loggear email completo |
| Tests flakey por ventanas reales | CI lento o inestable | Fake timers/clock inyectable y store reseteable |
| Logs exponen PII/prompt | Riesgo de privacidad | Redaction tests obligatorios |
| Demo excede cuota por repetición | Fricción en presentación | Documentar límites y reset del proceso; no desactivar controles silenciosamente |

---

## 18. Implementation Guidance for Coding Agents

- Archivos probables:
  - `apps/backend/src/shared/interface/middlewares/rate-limit.middleware.ts`
  - `apps/backend/src/shared/infrastructure/rate-limit/*`
  - `apps/backend/src/shared/infrastructure/config/*`
  - `apps/backend/src/modules/identity-access/interface/routes/*`
  - `apps/backend/src/modules/ai-assistance/interface/routes/*`
  - `apps/backend/src/shared/infrastructure/logger/*`
  - tests bajo `*.spec.ts` / `*.int.spec.ts` según patrón del repo.
- Orden recomendado:
  1. Config schema y defaults.
  2. Store in-memory con clock inyectable.
  3. Policy evaluator genérico.
  4. Policies auth.
  5. Policy AI agregada por user.
  6. Error envelope/headers.
  7. Logs seguros.
  8. Tests unit/integration/security.
- No reabrir decisiones:
  - Auth thresholds de ADR-SEC-004.
  - AI default `10/user/1 h`.
  - Store in-memory MVP.
  - US-111 maneja orden de middlewares/Helmet/CORS.
- No implementar:
  - Redis/Memcached.
  - DB counters.
  - New AI endpoints.
  - Frontend quota calculation.
  - Rate limit para QuoteRequest en esta US.
- Preservar:
  - Backend as source of truth.
  - No side effects después de 429.
  - Logs redactados.
  - CI determinístico.

---

## 19. Task Generation Notes

- Suggested task groups:
  - Backend config and store.
  - Auth rate limit policies.
  - AI rate limit policy.
  - API error envelope and headers.
  - Observability/security logging.
  - Frontend API client handling if needed.
  - QA/unit/integration/security tests.
  - DevOps/env documentation.
  - Demo smoke validation.
- Required QA tasks:
  - Fake timers/clock.
  - Store reset between tests.
  - Supertest 429 cases.
  - No side effects assertions.
- Required security tasks:
  - Redaction tests.
  - Auth/ownership before provider tests.
  - IP/proxy config tests.
- Required seed/demo tasks:
  - Confirm no seed changes.
  - Demo smoke does not exceed defaults.
- Required documentation tasks:
  - `.env.example` variables.
  - Notes for Demo repeated runs.
- Dependencies:
  - Config/store before policies.
  - Policies before route wiring.
  - Route wiring before integration tests.
  - Logging before security tests.
- Parent backlog consolidated tasks:
  - PB-P0-007 may later benefit from a consolidated view combining US-110 and US-111, but development tasks should remain story-specific first.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | Pass |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | N/A |
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-110 está técnicamente lista para generar Development Tasks. Las decisiones de producto, seguridad, QA y arquitectura están formalizadas; el scope es MVP-safe; la implementación puede dividirse en configuración, middleware/policies, route wiring, error contract, observability y pruebas.
