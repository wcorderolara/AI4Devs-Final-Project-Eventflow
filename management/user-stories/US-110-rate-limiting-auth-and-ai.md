# 🧾 User Story: Rate limiting en auth y endpoints IA

## 🆔 Metadata

| Field              | Value |
| ------------------ | ----- |
| ID                 | US-110 |
| Epic               | EPIC-SEC-001 |
| Feature            | Rate limiting |
| Module / Domain    | Security / Identity Access / AI Assistance |
| User Role          | System |
| Priority           | Must Have (P0) |
| Status             | Approved |
| Owner              | Product Owner / Business Analyst |
| Approved By        | Product Owner / Business Analyst Review |
| Approval Date      | 2026-06-16 |
| Ready for Development Tasks | Yes |
| Sprint / Milestone | MVP |
| Created Date       | 2026-06-09 |
| Last Updated       | 2026-06-16 |

---

## 🎯 User Story

**As a** sistema EventFlow  
**I want** aplicar rate limiting estricto y configurable en endpoints sensibles de autenticación y generación IA  
**So that** reduzcamos fuerza bruta, abuso de recuperación de contraseña, spam automatizado y consumo descontrolado de proveedor LLM sin bloquear el flujo demo del MVP.

---

## 🧠 Business Context

### Context Summary

EventFlow expone endpoints públicos sensibles de autenticación y endpoints autenticados de generación IA. Los endpoints públicos pueden ser atacados con fuerza bruta, credential stuffing, registro masivo o abuso de password reset. Los endpoints IA pueden generar costo operativo y degradar la demo si se invocan repetidamente sin control.

US-110 implementa la capa estricta de rate limiting por endpoint sensible, complementando el rate limit global laxo de US-091. El orden del pipeline, `helmet` y CORS quedan cubiertos por US-111.

### Related Domain Concepts

* `rateLimitMiddleware`.
* Auth public sensitive endpoints.
* AI generation endpoints.
* `RATE_LIMIT_EXCEEDED`.
* `Retry-After`.
* `X-RateLimit-Limit`.
* `X-RateLimit-Remaining`.
* `correlationId`.
* `LLMProvider`.
* `AIRecommendation`.

### Assumptions

* US-091 provee rate limit global laxo y la base del middleware pipeline.
* US-109 provee captcha para register/login/password reset request.
* US-111 provee orden seguro de middlewares, `helmet`, CORS y error handling.
* Los límites son configurables por env vars, pero los defaults del MVP deben ser seguros y demo-friendly.
* El storage MVP del limiter es in-memory por proceso; Redis/Memcached queda fuera de scope hasta que exista escalamiento horizontal real.

### Dependencies

* PB-P0-002 — Backend Modular Monolith Bootstrap.
* PB-P0-004 — REST API Endpoints.
* PB-P0-006 — Security Cookies HTTP-Only + Captcha.
* PB-P0-007 — Rate limiting en login/recovery/AI y cadena de middlewares en orden.
* US-091 — Middleware pipeline.
* US-109 — Integrate Captcha Auth.
* US-111 — Middleware chain order.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| -------- | ------------------ |
| Auth rate limits | `POST /api/v1/auth/login`: 10 intentos por IP cada 10 min. `POST /api/v1/auth/register`: 5 intentos por IP cada 10 min. `POST /api/v1/auth/password/reset-request`: 3 intentos por email normalizado cada 1 h. |
| AI endpoints covered | Aplicar rate limit a todos los endpoints `POST` de generación IA implementados en el MVP bajo `/api/v1/.../ai/*`, incluyendo event plan, checklist, budget suggestion, vendor categories, quote brief, comparison summary y task prioritization. Si un endpoint IA futuro/optional no está implementado, US-110 no lo crea. |
| AI default limit | Default MVP: `AI_RATE_LIMIT_MAX=10` generaciones por usuario autenticado por ventana de `AI_RATE_LIMIT_WINDOW_MS=3600000` (1 h), agregado a través de endpoints IA cubiertos. |
| AI limiter key | Key canónica IA: `ai:user:{userId}`. Se registra `feature` y route pattern para observabilidad, pero el límite default es agregado por usuario para controlar costo total. |
| Environment behavior | Local/CI pueden sobrescribir ventanas y máximos con valores pequeños para tests deterministas. QA/Demo usan defaults seguros salvo ajuste explícito documentado en env vars; no se desactiva rate limit en Demo. |
| Storage MVP | In-memory per process para MVP, alineado con ADR-SEC-004. Redis/Memcached o rate limiting distribuido queda fuera de scope y requiere decisión futura si se escala. |
| QA strategy | Tests usan fake timers o clock inyectable y store reseteable para no depender de esperas reales. |
| Safe logs | Logs de rate limit permiten `correlationId`, route pattern, limiter policy, key type, hashed/normalized key identifier, remaining/reset metadata y status. Prohibido loggear password, cookies, JWT, reset tokens, captcha tokens, prompt completo, respuesta LLM, secrets y email completo. |
| Separation from US-111 | US-110 excluye orden de middlewares, `helmet` y CORS; US-111 los cubre. US-110 sólo debe integrarse en la posición definida por el pipeline. |

---

## 🔗 Traceability

| Source                 | Reference |
| ---------------------- | --------- |
| Backlog Item           | PB-P0-007 — Rate limiting en login/recovery/AI y cadena de middlewares en orden |
| FRD Requirement(s)     | FR-AUTH-002, FR-AUTH-004..006, FR-AI-001..006, FR-AI-009, FR-AI-014..015 |
| Use Case(s)            | UC-AUTH-001, UC-AUTH-002, UC-AUTH-003, UC-AUTH-005, UC-AI-001..006 |
| Business Rule(s)       | BR-AUTH-011, BR-AI-001, BR-AI-005, BR-AI-009, BR-PRIVACY-* |
| Permission Rule(s)     | Auth endpoints públicos sensibles; AI endpoints autenticados con RBAC + ownership según Doc 5 / ADR-SEC-003 |
| Data Entity / Entities | `User`, `Credential`, `AIRecommendation` (no se crea si request IA es rate limited) |
| API Endpoint(s)        | `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/password/reset-request`, `POST /api/v1/events/:eventId/ai/*`, `POST /api/v1/quote-requests/:quoteRequestId/ai/comparison-summary` |
| NFR Reference(s)       | NFR-SEC-004, NFR-TEST-006, NFR-OBS-003, NFR-OBS-006, NFR-AI-003, NFR-PERF-006 |
| Related ADR(s)         | ADR-SEC-001, ADR-SEC-004, ADR-SEC-006, ADR-API-002, ADR-API-004, ADR-AI-001 |
| Related Document(s)    | `/docs/14-Backend-Technical-Design.md`, `/docs/16-API-Design-Specification.md`, `/docs/17-AI-Architecture-and-PromptOps-Design.md`, `/docs/19-Security-and-Authorization-Design.md`, `/docs/20-Testing-Strategy.md`, `/docs/21-Deployment-and-DevOps-Design.md`, `/docs/22-Architecture-Decision-Records.md`, `management/artifacts/4-Product-Backlog-Prioritized.md` |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (P0)

### Explicitly Out of Scope

* Definir o modificar orden de middlewares, `helmet` o CORS — cubierto por US-111.
* Implementar captcha provider o token plumbing — cubierto por US-109.
* Modificar cookies HTTP-only — cubierto por US-108.
* Crear endpoints IA nuevos sólo para aplicar rate limit.
* Implementar Redis, Memcached, WAF, API Gateway throttling o rate limiting distribuido enterprise.
* Persistir counters de rate limit en base de datos.
* Cambiar timeout, fallback, prompt registry o persistencia de `AIRecommendation`.
* Cambiar el cap funcional de regeneraciones IA definido para US-026.
* Introducir pagos, contratos, WhatsApp, real-time chat, native mobile, RAG o decisiones IA autónomas.

### Scope Notes

* US-110 agrega límites estrictos por endpoint sensible encima del rate limit global laxo de US-091.
* En requests IA rate limited, el backend no debe llamar a `LLMProvider` ni crear `AIRecommendation`.
* En password reset request rate limited, el backend no debe crear reset token ni emitir email simulado.
* Los límites son configurables, pero los defaults documentados son el contrato MVP para QA y Demo.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Login aplica rate limit estricto por IP

**Given** un cliente anónimo supera 10 intentos contra `POST /api/v1/auth/login` desde la misma IP dentro de 10 minutos  
**When** envía otro intento dentro de la misma ventana  
**Then** el backend responde `429 RATE_LIMIT_EXCEEDED`, incluye `Retry-After` cuando aplique, no ejecuta validación de credenciales y registra un evento seguro de rate limit.

### AC-02: Registro aplica rate limit estricto por IP

**Given** un cliente anónimo supera 5 intentos contra `POST /api/v1/auth/register` desde la misma IP dentro de 10 minutos  
**When** envía otro intento dentro de la misma ventana  
**Then** el backend responde `429 RATE_LIMIT_EXCEEDED`, no crea `User`, `Credential` ni `VendorProfile`, y conserva el error envelope estándar.

### AC-03: Password reset request aplica rate limit por email normalizado

**Given** un cliente solicita `POST /api/v1/auth/password/reset-request` más de 3 veces para el mismo email normalizado dentro de 1 hora  
**When** envía otra solicitud dentro de la misma ventana  
**Then** el backend responde `429 RATE_LIMIT_EXCEEDED`, no genera nuevo reset token, no dispara email simulado y no revela si el email existe.

### AC-04: AI generation endpoints aplican rate limit agregado por usuario

**Given** un usuario autenticado supera `AI_RATE_LIMIT_MAX=10` generaciones IA agregadas por `userId` dentro de `AI_RATE_LIMIT_WINDOW_MS=3600000`  
**When** intenta invocar otro endpoint `POST /api/v1/.../ai/*` cubierto dentro de la misma ventana  
**Then** el backend responde `429 RATE_LIMIT_EXCEEDED`, no llama a `LLMProvider`, no crea `AIRecommendation` nueva y registra el evento sin prompt ni payload sensible.

### AC-05: Configuración fail-fast para rate limit

**Given** variables de rate limit inválidas, negativas, cero, no numéricas o inseguras  
**When** la aplicación inicia  
**Then** el backend falla el boot con error seguro y accionable, sin exponer secretos ni stack trace al cliente.

### AC-06: Headers y error envelope son consistentes

**Given** cualquier endpoint protegido por rate limit  
**When** la respuesta se emite antes o después de exceder el límite  
**Then** el backend usa el error envelope estándar con `RATE_LIMIT_EXCEEDED` para 429 y expone `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `Retry-After` cuando aplique.

### AC-07: Observabilidad segura

**Given** un request es rate limited  
**When** el backend registra el evento  
**Then** el log incluye `correlationId`, route pattern, limiter policy, key type, hashed/normalized key identifier, remaining/reset metadata y status, pero no incluye password, token captcha, reset token, prompt completo, respuesta LLM, cookies, JWT, secrets ni email completo.

### AC-08: Tests cubren límites y exclusiones

**Given** la suite de backend se ejecuta en CI  
**When** corren tests unitarios e integración  
**Then** se verifica login/register/reset/AI con límite excedido, reset de ventana determinista, no ejecución del handler protegido, no llamada a `LLMProvider`, no creación de `AIRecommendation`, headers 429, y que endpoints fuera de scope no quedan rate limited por políticas estrictas.

---

## ⚠️ Edge Cases

### EC-01: IP no confiable o proxy mal configurado

**Given** `TRUST_PROXY` está mal configurado o no se puede resolver una IP confiable  
**When** se evalúa un limiter por IP  
**Then** el sistema usa el mecanismo seguro documentado por Express/config o falla configuración en bootstrap si el entorno requiere proxy confiable.

#### Handling

* Validar `TRUST_PROXY` por entorno.
* No confiar en headers arbitrarios si el proxy no está configurado.

### EC-02: Email inválido en password reset request

**Given** un request de password reset tiene email inválido  
**When** se procesa la request  
**Then** la validación de DTO responde 400 según contrato; si el email es válido, se normaliza antes de generar la key del rate limiter.

#### Handling

* Usar email normalizado lower-case/trimmed para la key.
* No loggear email completo.

### EC-03: Ventana de rate limit expira

**Given** una key excedió el límite y luego expira la ventana configurada  
**When** el mismo cliente o usuario realiza otro request  
**Then** el contador se reinicia y el request puede continuar al siguiente middleware/handler.

#### Handling

* Tests con fake timers o clock inyectable.

### EC-04: Endpoint IA rate limited en Demo

**Given** un usuario demo excede el límite IA durante una sesión repetida  
**When** intenta generar otra sugerencia IA  
**Then** recibe `429 RATE_LIMIT_EXCEEDED` con mensaje reintentable; la demo no llama al proveedor real ni crea recomendaciones parciales.

#### Handling

* Demo debe documentar límites y reset del proceso si se requiere repetir el guion muchas veces.
* No desactivar rate limit en Demo.

---

## 🚫 Validation Rules

| ID | Rule | Message / Behavior |
| -- | ---- | ------------------ |
| VR-01 | `AUTH_LOGIN_RATE_LIMIT_MAX`, `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS`, `AUTH_REGISTER_RATE_LIMIT_MAX`, `AUTH_REGISTER_RATE_LIMIT_WINDOW_MS`, `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`, `AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS`, `AI_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_MS` deben ser enteros positivos | Fail-fast en bootstrap |
| VR-02 | Login/register usan key por IP confiable | 429 por exceso de intentos en ventana |
| VR-03 | Password reset request usa key por email normalizado | 429 por exceso sin enumerar existencia de cuenta |
| VR-04 | AI generation usa key `ai:user:{userId}` | 429 agregado por usuario autenticado |
| VR-05 | Un request rate limited no ejecuta handler ni side effects | No credencial check, no reset token, no email, no `LLMProvider`, no `AIRecommendation` |
| VR-06 | Headers de rate limit usan valores coherentes con la política aplicada | `X-RateLimit-*` y `Retry-After` cuando aplique |

---

## 🔐 Authorization & Security Rules

| ID | Rule |
| -- | ---- |
| SEC-01 | Rate limiting se ejecuta en backend; el frontend no decide ni calcula cuotas. |
| SEC-02 | Login y register limitan por IP confiable para clientes anónimos. |
| SEC-03 | Password reset request limita por email normalizado y conserva anti-enumeración. |
| SEC-04 | AI generation limita por usuario autenticado; auth/ownership/policy deben cumplirse antes de consumir cuota costosa y antes de llamar a `LLMProvider`. |
| SEC-05 | No usar password, captcha token, reset token, JWT, cookies, prompt o payload completo como key de limiter. |
| SEC-06 | Logs de rate limit deben estar redactados y no exponer secretos ni PII innecesaria. |
| SEC-07 | Rate limiter no reemplaza captcha, auth, RBAC, ownership, validation ni políticas de dominio. |

### Negative Authorization Scenarios

* Login excede 10 intentos/IP/10 min → 429, no credential check.
* Register excede 5 intentos/IP/10 min → 429, no crea usuario.
* Password reset request excede 3/email/hora → 429, no crea token ni email.
* Usuario anónimo intenta endpoint IA → 401 antes de rate limit IA por user.
* Usuario autenticado sin ownership intenta endpoint IA → 403/404 antes de llamar a `LLMProvider`.
* Usuario autenticado excede límite IA → 429, no crea `AIRecommendation`.
* Configuración insegura o inválida → fail-fast, no deploy.

---

## 🤖 AI Behavior

### AI Involvement

* AI Feature: None — esta historia no genera contenido IA.
* Provider Layer: Not applicable for this story.
* Human Validation Required: Not applicable.
* Persist AIRecommendation: No para requests rate limited.
* Fallback Required: No.

### AI Input

* Not applicable.

### AI Output

* Not applicable.

### Human-in-the-loop Rules

* US-110 no modifica reglas HITL. Cuando un endpoint IA no está rate limited y genera output, aplican las reglas HITL del módulo AI correspondiente.

### AI Error / Fallback Behavior

* Rate limit se evalúa antes de invocar `LLMProvider`. Si retorna 429, no hay timeout, fallback ni persistencia de `AIRecommendation`.

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | N/A — historia técnica backend |
| Main UI Pattern     | N/A |
| Primary Action      | N/A |
| Secondary Actions   | N/A |
| Empty State         | N/A |
| Loading State       | N/A |
| Error State         | Frontend debe manejar `429 RATE_LIMIT_EXCEEDED` con mensaje genérico y reintentable |
| Success State       | N/A |
| Accessibility Notes | No aplica — no introduce UI |
| Responsive Notes    | No aplica |
| i18n Notes          | Mensajes públicos de 429 deben ser traducibles por el mecanismo existente |
| Currency Notes      | No aplica |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: N/A.
* Components: N/A.
* State Management: N/A.
* Forms: N/A.
* API Client: Debe consumir `429 RATE_LIMIT_EXCEEDED`, `Retry-After` y `correlationId` si están presentes. No calcula cuotas localmente.

### Backend

* Use Case / Service: `rateLimitMiddleware` policies.
* Controller / Route: auth public sensitive endpoints y AI generation endpoints.
* Authorization Policy: AI endpoints requieren auth + RBAC/ownership/policy antes de llamar a `LLMProvider`.
* Validation: Zod en boundary para DTOs y env config.
* Transaction Required: No.
* Store MVP: in-memory per process con reset controlado en tests.
* Config defaults:
  * `AUTH_LOGIN_RATE_LIMIT_MAX=10`
  * `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS=600000`
  * `AUTH_REGISTER_RATE_LIMIT_MAX=5`
  * `AUTH_REGISTER_RATE_LIMIT_WINDOW_MS=600000`
  * `AUTH_PASSWORD_RESET_RATE_LIMIT_MAX=3`
  * `AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_MS=3600000`
  * `AI_RATE_LIMIT_MAX=10`
  * `AI_RATE_LIMIT_WINDOW_MS=3600000`

### Database

* Main Tables: N/A.
* Constraints: N/A.
* Index Considerations: N/A.
* No migrations required.
* No persistence of counters in MVP.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/v1/auth/login` | Limit 10/IP/10 min |
| POST | `/api/v1/auth/register` | Limit 5/IP/10 min |
| POST | `/api/v1/auth/password/reset-request` | Limit 3/email normalized/1 h |
| POST | `/api/v1/events/:eventId/ai/event-plan` | AI limit 10/user/1 h aggregate |
| POST | `/api/v1/events/:eventId/ai/checklist` | AI limit 10/user/1 h aggregate |
| POST | `/api/v1/events/:eventId/ai/budget-suggestion` | AI limit 10/user/1 h aggregate |
| POST | `/api/v1/events/:eventId/ai/vendor-categories` | AI limit 10/user/1 h aggregate |
| POST | `/api/v1/events/:eventId/ai/quote-brief` | AI limit 10/user/1 h aggregate |
| POST | `/api/v1/quote-requests/:quoteRequestId/ai/comparison-summary` | AI limit 10/user/1 h aggregate |
| POST | `/api/v1/events/:eventId/ai/task-prioritization` | AI limit 10/user/1 h aggregate |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes, `security.rate_limit.exceeded` or equivalent structured event.
* AdminAction Required: No.
* AIRecommendation Required: No for rate limited requests.
* Allowed log fields: `correlationId`, route pattern, limiter policy, key type, hashed/normalized key identifier, remaining, resetAt/Retry-After, status.
* Prohibited log fields: password, cookie, JWT, reset token, captcha token, provider secret, prompt completo, LLM response, email completo, raw request body.

---

## 🧪 Test Scenarios

### Functional Tests

| ID | Scenario | Type |
| -- | -------- | ---- |
| TS-01 | Login permite hasta 10 intentos/IP/10 min y rechaza el siguiente | Unit/Integration |
| TS-02 | Register permite hasta 5 intentos/IP/10 min y rechaza el siguiente | Unit/Integration |
| TS-03 | Password reset request permite hasta 3 intentos/email/hora y rechaza el siguiente | Unit/Integration |
| TS-04 | AI generation permite hasta 10 generaciones/user/hora agregadas y rechaza la siguiente | Unit/Integration |
| TS-05 | Ventana expirada reinicia contador con fake timer/clock inyectable | Unit |

### Negative Tests

| ID | Scenario | Expected Result |
| -- | -------- | --------------- |
| NT-01 | Login rate limited | 429, no credential check |
| NT-02 | Register rate limited | 429, no user/profile creation |
| NT-03 | Password reset request rate limited | 429, no reset token, no email simulated |
| NT-04 | AI generation rate limited | 429, no `LLMProvider` call, no `AIRecommendation` |
| NT-05 | Env var inválida | Fail-fast bootstrap |
| NT-06 | Endpoint fuera de scope | No usa política estricta de US-110 |

### AI Tests

| ID | Scenario | Expected Result |
| -- | -------- | --------------- |
| AI-TS-01 | AI request excede límite antes de provider | `LLMProvider` mock no es llamado |
| AI-TS-02 | AI request excede límite antes de persistencia | No se crea `AIRecommendation` |

### Authorization Tests

| ID | Scenario | Expected Result |
| -- | -------- | --------------- |
| AUTH-TS-01 | Anónimo llama endpoint IA | 401 antes de rate limit por user |
| AUTH-TS-02 | Usuario sin ownership llama endpoint IA | 403/404 antes de provider |
| AUTH-TS-03 | Usuario autenticado excede límite IA | 429 |

### Accessibility Tests

No aplica — no introduce UI.

### Security Tests

| ID | Scenario | Expected Result |
| -- | -------- | --------------- |
| SEC-TS-01 | Logs de auth rate limited | Sin password, cookie, JWT, captcha token ni email completo |
| SEC-TS-02 | Logs de AI rate limited | Sin prompt completo, LLM response ni provider secret |
| SEC-TS-03 | Headers 429 | `Retry-After` y `X-RateLimit-*` coherentes |
| SEC-TS-04 | Store reseteable en tests | Sin contaminación entre casos |

### Seed / Demo Tests

| ID | Scenario | Expected Result |
| -- | -------- | --------------- |
| DEMO-TS-01 | Demo smoke de login/register/password reset | No excede límites con guion normal |
| DEMO-TS-02 | Demo smoke de generación IA con `MockAIProvider` | No excede 10 generaciones/user/hora en guion normal |

---

## 📊 Business Impact

| Field               | Value |
| ------------------- | ----- |
| KPI Affected        | Seguridad operativa, costo IA, estabilidad API, demo readiness |
| Expected Impact     | Reduce abuso en auth y controla consumo LLM sin agregar infraestructura fuera del MVP |
| Success Criteria    | Tests 429 verdes en CI; `LLMProvider` no se llama si excede límite; logs seguros con `correlationId` |
| Academic Demo Value | Evidencia de seguridad, anti-abuse y control de costos IA trazable |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Manejo genérico de `429 RATE_LIMIT_EXCEEDED` si el API client aún no lo soporta.

### Potential Backend Tasks

* Implementar policies de rate limit por auth endpoint.
* Implementar policy agregada para endpoints IA.
* Validar env vars en bootstrap.
* Agregar headers y error envelope 429.
* Agregar logs seguros.

### Potential Database Tasks

* No aplica.

### Potential AI / PromptOps Tasks

* Verificar que requests rate limited no invocan `LLMProvider` ni crean `AIRecommendation`.

### Potential QA Tasks

* Tests unitarios de policy/keying/window.
* Integration tests con Supertest.
* Tests con fake timers/clock inyectable.
* Security tests de logs y no side effects.

### Potential DevOps / Config Tasks

* Documentar env vars en `.env.example`.
* Validar defaults en Local/CI/QA/Demo.
* Asegurar que CI ejecuta suite de security/rate limit.

---

## ✅ Definition of Ready

| Item | Status |
| ---- | ------ |
| Business value clear | Ready |
| Backlog item identified | Ready |
| Acceptance Criteria testable | Ready |
| Dependencies identified | Ready |
| Security expectations clear | Ready |
| AI expectations clear | Ready |
| QA expectations clear | Ready |
| Seed/demo impact clear | Ready |
| Out of scope explicit | Ready |
| No blocking PO/BA decisions | Ready |

---

## ✅ Definition of Done

* Auth rate limits implementados con defaults de ADR-SEC-004 / Doc 16.
* AI rate limit implementado con default `10/user/1 h` agregado sobre endpoints IA cubiertos.
* Configuración validada con fail-fast en bootstrap.
* 429 usa `RATE_LIMIT_EXCEEDED`, error envelope estándar y headers de rate limit.
* Requests rate limited no ejecutan handlers ni side effects.
* AI requests rate limited no llaman a `LLMProvider` ni crean `AIRecommendation`.
* Logs de rate limit son estructurados, tienen `correlationId` y están redactados.
* Tests con fake timers/clock inyectable cubren ventanas, reset y límites.
* CI ejecuta suite de rate limit/security como quality gate.

---

## 📝 Notes

* US-110 no reemplaza captcha. Captcha sigue siendo obligatorio según US-109.
* US-110 no define orden de middlewares. US-111 gobierna la composición del pipeline.
* Redis/Memcached queda fuera de scope hasta que el MVP requiera escalamiento horizontal.
