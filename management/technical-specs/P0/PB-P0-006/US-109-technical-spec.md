# Technical Specification — US-109: Integrar captcha en auth

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-109 |
| Source User Story | `management/user-stories/US-109-integrate-captcha-auth.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-109-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-006 |
| Backlog Title | Security Cookies HTTP-Only + Captcha |
| Backlog Execution Order | 6 |
| User Story Position in Backlog Item | 2 of 2 |
| Related User Stories in Backlog Item | US-108, US-109 |
| Epic | EPIC-SEC-001 |
| Backlog Item Dependencies | PB-P0-002, PB-P0-004 |
| Feature | Captcha anti-bot |
| Module / Domain | Security / Identity Access |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-16 |
| Last Updated | 2026-06-16 |

---

## 2. Backlog Execution Context

### Product Backlog Item

US-109 pertenece a PB-P0-006, cuyo objetivo es configurar controles de seguridad base para autenticación: cookies de sesión HTTP-only firmadas y captcha en auth. Esta especificación cubre únicamente la integración captcha anti-bot. La política de cookie/session queda cubierta por US-108.

El backlog define captcha verificable en registro/login, fake en CI y real en preview/Demo. La decisión formal US-109, gobernada por ADR-SEC-004 y US-091, extiende el alcance efectivo a los tres endpoints sensibles de auth: `register`, `login` y `password reset request`.

### Execution Order Rationale

PB-P0-006 es el sexto item P0 del Product Backlog. Debe ejecutarse después de PB-P0-002 y PB-P0-004 porque requiere servidor Express, middleware pipeline y endpoints AUTH donde aplicar `captchaVerificationMiddleware`. Dentro de PB-P0-006, US-109 se ejecuta después o en paralelo coordinado con US-108: captcha protege las operaciones públicas antes de que los endpoints creen usuarios, validen credenciales, generen reset tokens o emitan cookies.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-108 | Configura cookies de sesión HTTP-only firmadas y session helpers | 1 |
| US-109 | Integra captcha anti-bot con mock CI y proveedor real | 2 |

---

## 3. Executive Technical Summary

Implementar captcha server-side para los endpoints públicos sensibles de autenticación mediante un puerto `CaptchaVerifier`, adapters `mock`, `recaptcha` y `hcaptcha`, middleware Express y configuración validada por entorno. El backend debe verificar `captchaToken` antes de ejecutar casos de uso de registro, login o solicitud de reset password.

La implementación debe permitir tests deterministas con `CAPTCHA_PROVIDER=mock` y token fijo `'__test__'` en Local/CI, y proveedor real en QA/Demo/producción con secretos backend. El frontend sólo obtiene y envía `captchaToken` usando site keys públicas; nunca decide validez ni conoce secret keys.

No se implementan endpoints AUTH completos, cookies, rate limiting estricto, OAuth/MFA ni captcha global para todo endpoint público.

---

## 4. Scope Boundary

### In Scope

- Puerto backend `CaptchaVerifier`.
- Adapters `MockCaptchaProvider`, `RecaptchaProvider` y `HcaptchaProvider`.
- Middleware `captchaVerificationMiddleware`.
- Validación server-side de `captchaToken`.
- Provider config con `CAPTCHA_PROVIDER=mock|recaptcha|hcaptcha`.
- Secrets backend para provider real.
- Site keys públicas para frontend.
- Modo mock determinista en Local/CI con token `'__test__'`.
- Fail-fast si `mock` se usa en QA/Demo/producción.
- Fail-fast si provider real no tiene secret key requerida.
- Validación de action y score cuando el proveedor lo soporte.
- Error handling seguro para token ausente, inválido, action mismatch, score bajo, provider timeout y provider error.
- Redacción de `captchaToken`, secrets y provider raw response en logs.
- Plumbing frontend mínimo para obtener/enviar token en register, login y forgot password.
- Tests unitarios, integration/Supertest, negativos, security, accessibility mínima y demo/CI.

### Out of Scope

- Implementar endpoints AUTH completos.
- Configurar cookies HTTP-only firmadas.
- Definir umbrales estrictos de rate limiting por endpoint.
- Aplicar captcha a todos los endpoints públicos.
- Implementar MFA, OAuth, SSO, biometría o Google login.
- Persistir tokens, scores, secrets o raw responses de captcha.
- Depender de proveedores reales en CI.
- Fallback automático a `mock` fuera de Local/CI.
- Resolver captcha con IA o delegar decisiones de seguridad a IA.
- Introducir pagos, contratos firmados, WhatsApp, chat real-time, push, RAG, marketplace transaccional o app móvil nativa.

### Explicit Non-Goals

- No reemplazar rate limiting; captcha y rate limiting son controles complementarios.
- No revelar existencia de cuenta, validez de password, score exacto ni detalles internos del proveedor.
- No crear un provider SDK público para frontend.
- No guardar tokens captcha en base de datos ni analytics.
- No cambiar el contrato de US-094 más allá de requerir/usar `captchaToken` en DTOs sensibles.

---

## 5. Architecture Alignment

### Backend Architecture

La implementación vive en el backend Node.js + Express + TypeScript dentro del modular monolith. Debe seguir Clean/Hexagonal Architecture:

- `identity-access` consume captcha antes de casos de uso auth sensibles.
- `shared-kernel` o `infrastructure/security/captcha` puede alojar middleware/adapters.
- Controllers permanecen delgados.
- `CaptchaVerifier` es un puerto; providers reales son adapters de infraestructura.
- Config validation ocurre en boot con Zod o el config system existente.

### Frontend Architecture

El frontend Next.js debe integrar un `CaptchaWidget` o hook equivalente en formularios existentes de register, login y forgot password. Debe usar site keys públicas `NEXT_PUBLIC_*` y enviar `captchaToken` al backend. No debe acceder a secrets ni persistir tokens.

### Database Architecture

No aplica. Captcha no introduce tablas ni migraciones. No se persisten tokens, scores, provider responses ni secrets.

### API Architecture

REST JSON bajo `/api/v1`. Los DTOs de `POST /api/v1/auth/register`, `POST /api/v1/auth/login` y `POST /api/v1/auth/password/reset-request` incluyen `captchaToken` y opcionalmente `captchaAction` si el provider/implementación lo requiere.

### AI / PromptOps Architecture

No aplica. Esta historia no invoca IA, no usa `LLMProvider`, no persiste `AIRecommendation` y no tiene human-in-the-loop.

### Security Architecture

Alineado con ADR-SEC-004, ADR-SEC-005 y ADR-SEC-006:

- Verificación backend-only.
- Secret keys sólo backend/Secrets Manager.
- Token y raw provider responses redactados.
- No fallback inseguro a `mock`.
- Rechazo antes de procesar credenciales o mutaciones.
- Respuestas genéricas para evitar enumeración.

### Testing Architecture

Usar Vitest para adapters/config y Supertest para middleware/API integration. CI usa `CAPTCHA_PROVIDER=mock` con token `'__test__'`. QA/Demo debe validar provider real con secrets gestionados.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 | `POST /api/v1/auth/register` exige `captchaToken`; middleware verifica antes de crear `User`, `Credential`, `VendorProfile` o sesión. | API, Middleware, Security, Application |
| AC-02 | `POST /api/v1/auth/login` verifica captcha antes de password hash check o cookie/session issuance; errores no revelan validez de credenciales. | API, Middleware, Security |
| AC-03 | `POST /api/v1/auth/password/reset-request` verifica captcha antes de generar reset token o email simulado; mantiene anti-enumeración. | API, Middleware, Security, Notifications |
| AC-04 | Config validation selecciona `mock`, `recaptcha` o `hcaptcha`; real providers exigen secrets/site keys; config inválida falla al boot. | Config, DevOps, Backend, Frontend |
| AC-05 | `MockCaptchaProvider` acepta sólo `'__test__'`; CI no llama servicios externos. | Backend, Testing |
| AC-06 | Real providers validan success, action y score cuando aplique. | Backend adapters, Security |
| AC-07 | Provider error/timeout retorna error controlado, no procesa operación y loggea outcome sin datos sensibles. | Backend, Observability, Security |
| AC-08 | Frontend obtiene token con site key pública, lo envía y renueva/reset ante error. | Frontend, Forms, API client |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `identity-access`: endpoints auth y use cases que consumen captcha.
- `shared-kernel` / `shared/interface/http`: middleware de captcha y error mapping.
- `infrastructure/captcha`: provider adapters.
- `infrastructure/config`: env validation.
- `infrastructure/logging`: redaction rules.

### Use Cases / Application Services

No se crean casos de uso de negocio nuevos. Se agregan servicios técnicos:

- `CaptchaVerifier` port:
  - `verify(input: CaptchaVerificationInput): Promise<CaptchaVerificationResult>`
- `MockCaptchaProvider`
- `RecaptchaProvider`
- `HcaptchaProvider`
- `CaptchaProviderFactory`
- `CaptchaConfigProvider`

Input sugerido:

- `token`
- `action`
- `remoteIp` opcional si se decide enviar al provider
- `requestId` / correlation context para logs

Output sugerido:

- `success`
- `provider`
- `actionMatched`
- `score` opcional, sólo para decisión interna
- `failureReason` interno, no expuesto al cliente

### Controllers / Routes

No se crean rutas nuevas. Se aplica middleware a:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/password/reset-request`

No aplicar a:

- `POST /api/v1/auth/password/reset`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- endpoints públicos no auth.

### DTOs / Schemas

Extender o confirmar schemas Zod:

- `RegisterRequestDto` incluye `captchaToken: string` y opcional `captchaAction`.
- `LoginRequestDto` incluye `captchaToken: string` y opcional `captchaAction`.
- `PasswordResetRequestDto` incluye `captchaToken: string` y opcional `captchaAction`.

Schemas internos:

- `CaptchaConfigSchema`
  - `CAPTCHA_PROVIDER`: `mock | recaptcha | hcaptcha`
  - `RECAPTCHA_SECRET_KEY`: requerido si provider `recaptcha`
  - `HCAPTCHA_SECRET_KEY`: requerido si provider `hcaptcha`
  - `CAPTCHA_SCORE_THRESHOLD`: opcional para reCAPTCHA v3; default técnico documentado
  - `CAPTCHA_VERIFY_TIMEOUT_MS`: timeout corto y configurable
  - `APP_ENV` / `NODE_ENV`: usado para bloquear `mock` fuera de Local/CI.

### Repository / Persistence

No aplica. Captcha es stateless desde la perspectiva de EventFlow. No crear tablas.

### Validation Rules

- `captchaToken` ausente: `400 CAPTCHA_REQUIRED`.
- `captchaToken` inválido, expirado, duplicado, action mismatch o score bajo: `400 CAPTCHA_INVALID`.
- Provider no permitido: fail-fast.
- Provider real sin secret: fail-fast.
- `CAPTCHA_PROVIDER=mock` fuera de Local/CI: fail-fast.
- No procesar credenciales, usuarios, reset tokens ni sesiones si captcha falla.
- No llamar proveedor si validación DTO básica ya falló y no hay token.

### Error Handling

Errores públicos:

- `CAPTCHA_REQUIRED`
- `CAPTCHA_INVALID`
- Error controlado de provider no disponible, usando el envelope estándar y sin revelar detalles internos.

Errores internos/log outcomes:

- `missing_token`
- `invalid_token`
- `expired_or_duplicate`
- `action_mismatch`
- `score_too_low`
- `provider_timeout`
- `provider_error`
- `config_invalid`

### Transactions

No iniciar transacciones para captcha. Las transacciones downstream de register/reset/login no deben abrirse hasta que captcha sea válido.

### Observability

Log structured events:

- `captcha.verify.succeeded`
- `captcha.verify.failed`
- `captcha.provider.timeout`
- `captcha.config.invalid`

Campos permitidos:

- correlation ID
- endpoint
- provider
- outcome
- action esperada
- env

Campos prohibidos:

- `captchaToken`
- provider secret
- raw provider response
- password
- cookie
- full email

---

## 8. Frontend Technical Design

### Routes / Pages

Aplicar a formularios existentes o planificados:

- Register.
- Login.
- Forgot password / password reset request.

No crear rediseño completo de pantallas.

### Components

Componente o hook recomendado:

- `CaptchaWidget`
- `useCaptchaToken`
- Provider-specific adapter wrapper si se necesita diferenciar `recaptcha` / `hcaptcha`.

Debe exponer:

- `getToken(action)`
- `resetCaptcha()`
- loading/error state interno.

### Forms

Formularios auth deben:

- Obtener `captchaToken` antes del submit.
- Enviar `captchaToken` en body.
- Enviar `captchaAction` si se adopta en contrato frontend/backend.
- Renovar token si backend retorna `CAPTCHA_INVALID`, timeout o token expirado.

### State Management

Estado local del formulario. No persistir `captchaToken` en storage ni cache global.

### Data Fetching

Usar el API client existente. No se requieren cambios de session/cookie más allá de coexistir con US-108.

### Loading / Empty / Error / Success States

- Loading: deshabilitar submit mientras se obtiene token.
- Error: mensaje genérico de verificación de seguridad fallida.
- Success: continuar flujo auth normal.
- Empty: No aplica.

### Accessibility

- Mensajes de error anunciables.
- No bloquear navegación por teclado.
- Si provider muestra challenge, usar implementación accesible documentada por provider.
- Widget no debe romper layout móvil.

### i18n

Mensajes visibles deben usar next-intl/localización existente. Error codes backend permanecen estables en inglés técnico.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/register` | Crear cuenta con captcha válido | No | Register DTO + `captchaToken` | Continúa a contrato US-094 | `400 CAPTCHA_REQUIRED`, `400 CAPTCHA_INVALID`, provider error controlado |
| POST | `/api/v1/auth/login` | Iniciar sesión con captcha válido | No | Login DTO + `captchaToken` | Continúa a contrato US-094; cookie emitida por US-108 | `400 CAPTCHA_REQUIRED`, `400 CAPTCHA_INVALID`, provider error controlado |
| POST | `/api/v1/auth/password/reset-request` | Solicitar reset con captcha válido | No | Email + `captchaToken` | Respuesta anti-enumeración definida por US-094 | `400 CAPTCHA_REQUIRED`, `400 CAPTCHA_INVALID`, provider error controlado |

OpenAPI debe documentar `captchaToken` como campo requerido en esos tres requests y no debe documentar secret keys.

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

No persistir `captchaToken`, score, secret, provider raw response ni failure details sensibles.

### Migrations Impact

No requiere migraciones.

### Seed Impact

No requiere seed data. Tests y seed/demo pueden usar token mock `'__test__'` sólo en Local/CI.

---

## 11. AI / PromptOps Design

### AI Feature

No aplica.

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

No aplica.

---

## 12. Security & Authorization Design

### Authentication

Endpoints permanecen públicos/anonymous, pero requieren captcha válido antes de procesar auth. Captcha no autentica al usuario; sólo mitiga abuso bot antes del caso de uso.

### Authorization

No aplica RBAC directo. El control es pre-auth. Backend sigue siendo source of truth.

### Ownership Rules

No aplica.

### Role Rules

No aplica. Register sigue restringido a roles permitidos por US-094, pero esa regla no pertenece a US-109.

### Negative Authorization Scenarios

| Scenario | Expected Result |
|---|---|
| Anonymous llama register/login/reset-request sin `captchaToken` | `400 CAPTCHA_REQUIRED`; no use case execution |
| Anonymous envía token inválido | `400 CAPTCHA_INVALID`; no use case execution |
| Token de action incorrecta | `400 CAPTCHA_INVALID` |
| Token mock `'__test__'` usado con provider real | Rechazo; no bypass |
| `CAPTCHA_PROVIDER=mock` en Demo/production | Backend no inicia |
| Provider timeout | Error controlado; no credential check ni mutación |
| Endpoint no auth protegido accidentalmente con captcha | Debe fallar test de route mapping |

### Audit Requirements

No requiere `AdminAction`. Requiere security logs técnicos con correlation ID y redacción completa.

### Sensitive Data Handling

- Secret keys sólo en backend/Secrets Manager.
- Site keys pueden ser públicas.
- No loggear `captchaToken`.
- No loggear raw provider response.
- No persistir score ni token.
- No exponer score ni provider reason al cliente.

---

## 13. Testing Strategy

### Unit Tests

- `MockCaptchaProvider` acepta sólo `'__test__'`.
- `MockCaptchaProvider` rechaza token vacío, nulo o distinto.
- `CaptchaProviderFactory` selecciona provider correcto.
- Config validation falla con provider inválido, secret faltante o `mock` fuera de Local/CI.
- `RecaptchaProvider` mapea responses success/failure, score bajo y action mismatch.
- `HcaptchaProvider` mapea success/failure y errores de API.

### Integration Tests

- Register con mock token válido continúa al use case.
- Login con mock token válido continúa al use case.
- Password reset request con mock token válido continúa al use case.
- Request sin token no llama provider.
- Token inválido no ejecuta use case.
- Provider timeout corta el flujo antes de credenciales/mutaciones.

### API Tests

- `POST /api/v1/auth/register` requiere `captchaToken`.
- `POST /api/v1/auth/login` requiere `captchaToken`.
- `POST /api/v1/auth/password/reset-request` requiere `captchaToken`.
- `POST /api/v1/auth/password/reset` no requiere captcha.
- Endpoints no auth no requieren captcha accidentalmente.

### E2E Tests

Opcional para esta US. Si UI auth ya existe, agregar smoke de register/login/forgot password con provider mock o test key. No depender de provider real en CI.

### Security Tests

- Secrets no aparecen en frontend bundle/config pública.
- Logs no contienen `captchaToken`, secret, raw response, password, cookie ni full email.
- `CAPTCHA_PROVIDER=mock` bloqueado en Demo/production-like config.
- Provider real no cae a mock automáticamente.

### Accessibility Tests

- Error captcha visible y anunciable.
- Formulario mantiene navegación por teclado.
- Widget/challenge no rompe layout móvil.

### AI Tests

No aplica.

### Seed / Demo Tests

- CI usa `CAPTCHA_PROVIDER=mock` y token `'__test__'`.
- QA/Demo usa provider real con secret backend y site key pública.
- Demo checklist verifica captcha funcional en auth.

### CI Checks

- Vitest unit.
- Supertest integration.
- Static/config tests para env.
- Frontend component tests con provider mock/stub si UI existe.
- No red externa requerida para CI.

---

## 14. Observability & Audit

### Logs

Logs estructurados con:

- endpoint
- provider
- outcome
- correlation ID
- action esperada
- timeout/config failure cuando aplique.

### Correlation ID

Obligatorio. Debe venir del middleware de US-091 y propagarse en captcha logs.

### AdminAction

No aplica.

### Error Tracking

Provider timeouts, provider errors y config invalid deben ser visibles en error tracking/logs sin secretos.

### Metrics

No se requieren métricas nuevas para MVP. Si existe observabilidad foundation, puede contar captcha success/failure por endpoint/provider sin tokens ni PII.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No requiere seed nuevo.

### Demo Scenario Supported

Soporta demo de registro/login/forgot password protegidos por captcha. En Demo/QA el proveedor real debe estar configurado.

### Reset / Isolation Notes

Tests y seed reset no deben depender de servicios externos. Local/CI usa `CAPTCHA_PROVIDER=mock` y `'__test__'`.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| BR-AUTH-011 / FR-AUTH-002 vs ADR-SEC-004 / US-091 | Algunos documentos base mencionan captcha sólo en registro/login; ADR-SEC-004 y US-091 incluyen también `password reset request`. | Aplicar captcha a `register`, `login` y `password reset request`. | Alinear BR/FR en revisión documental futura o mantener esta technical spec como decisión aplicada. | No |
| Doc 14 / Doc 19 / PB-P0-006 | Documentos usan nombres variables para provider (`recaptcha`, `hcaptcha`, `turnstile` o equivalente). | Contrato MVP `CAPTCHA_PROVIDER=mock|recaptcha|hcaptcha`; equivalentes requieren decisión técnica documentada. | Normalizar nombres de `CAPTCHA_PROVIDER` en docs técnicos o documentar override si Tech Lead elige equivalente. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Provider real no disponible | Auth sensible queda bloqueado temporalmente | Timeout corto, error controlado, observability; no fallback a mock fuera de Local/CI |
| CI depende de red externa | Tests frágiles y lentos | `CAPTCHA_PROVIDER=mock` + token `'__test__'` |
| Secret captcha expuesto al frontend/logs | Compromiso de seguridad | Secrets backend-only, redaction tests, env naming separado `NEXT_PUBLIC_*` vs secret |
| Captcha aplicado a endpoints incorrectos | Fricción innecesaria o gaps de seguridad | Route mapping tests y decision resolution como fuente formal |
| Action/score mal configurado | Falsos rechazos o bypass | Config defaults documentados, unit tests de adapter, logs de outcome sin detalles sensibles |
| Documentación provider inconsistente | Reapertura de decisiones | Usar US-109 Decision Resolution como fuente vinculante |

---

## 18. Implementation Guidance for Coding Agents

- Archivos o carpetas probablemente impactadas:
  - `backend/src/modules/identity-access/`
  - `backend/src/shared/http/middleware/`
  - `backend/src/shared/security/captcha/`
  - `backend/src/infrastructure/captcha/`
  - `backend/src/shared/config/`
  - `backend/src/shared/logger/`
  - `frontend/src/features/auth/` o ruta equivalente si ya existe UI.
- Orden recomendado:
  1. Revisar rutas y DTOs AUTH de US-094.
  2. Agregar config schema de captcha.
  3. Crear `CaptchaVerifier` port.
  4. Implementar `MockCaptchaProvider`.
  5. Implementar adapters `RecaptchaProvider` y `HcaptchaProvider`.
  6. Crear `captchaVerificationMiddleware`.
  7. Aplicar middleware sólo a los tres endpoints definidos.
  8. Integrar frontend token plumbing en formularios auth existentes.
  9. Agregar redaction/logging.
  10. Agregar unit/integration/security/frontend tests.
- Decisiones que no deben reabrirse:
  - Endpoints: register, login, password reset request.
  - Providers MVP: `mock|recaptcha|hcaptcha`.
  - Mock token: `'__test__'`.
  - No provider real en CI.
  - No fallback a mock fuera de Local/CI.
- No implementar:
  - Captcha global.
  - Rate limit thresholds.
  - OAuth/MFA.
  - Persistencia de captcha.
  - IA para resolver/verificar captcha.
- Supuestos a preservar:
  - Backend decide validez.
  - Secrets sólo backend.
  - Frontend sólo usa site key pública.
  - Error al usuario es genérico.

---

## 19. Task Generation Notes

- Suggested task groups:
  - Backend captcha config validation.
  - Backend `CaptchaVerifier` port and provider factory.
  - Mock provider.
  - Real provider adapters.
  - Middleware integration and route mapping.
  - Frontend captcha token plumbing.
  - Security logging/redaction.
  - Unit/integration/API/security/accessibility tests.
  - Demo/DevOps config documentation.
- Required QA tasks:
  - Supertest happy path with `__test__`.
  - Negative tests for missing/invalid token.
  - Provider timeout/action/score tests.
  - Config fail-fast tests.
  - Logs redaction tests.
- Required security tasks:
  - Verify secret isolation.
  - Verify no persistence.
  - Verify no fallback to mock in Demo/production.
  - Verify only intended endpoints use middleware.
- Required seed/demo tasks:
  - No seed changes.
  - Demo config check for real provider.
  - CI config check for mock provider.
- Required documentation tasks:
  - Document env vars and provider setup.
  - Record provider naming decision in implementation notes/runbook.
- Dependencies between tasks:
  - Config schema before provider factory.
  - Mock provider before Supertest integration.
  - Middleware before route mapping tests.
  - Frontend token plumbing after backend DTO contract confirmed.
- Parent backlog item consolidated tasks:
  - PB-P0-006 may later consolidate US-108 and US-109 security setup, but tasks must remain traceable per US.

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
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-109 está técnicamente lista para generar Development Tasks. El alcance, providers, mock CI, endpoints aplicables, reglas de seguridad, frontend token plumbing y estrategia QA están definidos sin blockers.
