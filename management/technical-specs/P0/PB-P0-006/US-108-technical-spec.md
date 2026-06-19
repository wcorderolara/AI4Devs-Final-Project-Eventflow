# Technical Specification — US-108: Configurar cookies HTTP-only firmadas

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-108 |
| Source User Story | `management/user-stories/US-108-configure-httponly-cookies.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-108-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-006 |
| Backlog Title | Security Cookies HTTP-Only + Captcha |
| Backlog Execution Order | 6 |
| User Story Position in Backlog Item | 1 of 2 |
| Related User Stories in Backlog Item | US-108, US-109 |
| Epic | EPIC-SEC-001 |
| Backlog Item Dependencies | PB-P0-002, PB-P0-004 |
| Feature | Cookies de sesión |
| Module / Domain | Security / Identity Access |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-15 |
| Last Updated | 2026-06-15 |

---

## 2. Backlog Execution Context

### Product Backlog Item

US-108 pertenece a PB-P0-006, cuyo objetivo es configurar controles de seguridad base para autenticación: cookies de sesión HTTP-only firmadas y captcha en auth. Esta especificación cubre únicamente la parte de cookies de sesión. La parte captcha queda en US-109.

El backlog define cookies `HttpOnly`, `Secure` en entornos no-locales, `SameSite=Lax`, firmadas, con lifetime de sesión de 30 días. La decisión formal de US-108 permite `SameSite=None; Secure` sólo para despliegue cross-site con CORS allowlist, `credentials=true` y mitigación CSRF compatible con ADR-SEC-006.

### Execution Order Rationale

PB-P0-006 es el sexto item P0 del Product Backlog. Debe ejecutarse después de PB-P0-002 y PB-P0-004 porque requiere servidor Express, middleware pipeline, contrato AUTH y endpoints de login/logout donde se emite y limpia la cookie. Dentro de PB-P0-006, US-108 debe implementarse antes o en paralelo coordinado con US-109, porque login/logout y endpoints protegidos dependen de una política de sesión estable.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-108 | Configura la política de cookie de sesión HTTP-only firmada, validación y limpieza | 1 |
| US-109 | Integra captcha anti-bot para auth con mock CI y proveedor real | 2 |

---

## 3. Executive Technical Summary

Implementar la capa técnica de sesión por cookie HTTP-only firmada para EventFlow. La solución debe emitir `eventflow.sid` en login, validarla en endpoints protegidos, limpiar/revocar sesión en logout y bloquear configuraciones inseguras en boot.

La implementación debe respetar Node.js + Express + TypeScript dentro del modular monolith, con controllers delgados, helpers o servicios de sesión dentro de `identity-access`/`shared-kernel`, validación de configuración con Zod, logs estructurados y redacción de cookies/secrets. El frontend no debe leer tokens: sólo debe enviar cookies gestionadas por navegador usando `credentials: "include"`.

No se implementan pantallas, credenciales, captcha, rate limiting ni endpoints AUTH completos en esta historia; se integran con las capacidades existentes o relacionadas.

---

## 4. Scope Boundary

### In Scope

- Helper/service para emitir cookie `eventflow.sid` firmada.
- Helper/service para limpiar cookie en logout.
- Validación de firma, expiración y vigencia de sesión desde `authMiddleware` o helper equivalente.
- Configuración por entorno de `HttpOnly`, `Secure`, `SameSite`, `Path` y `Max-Age`.
- Default `Max-Age` de 30 días mediante `SESSION_COOKIE_MAX_AGE_DAYS`.
- Default `SameSite=Lax`.
- Soporte condicionado para `SameSite=None; Secure` en despliegue cross-site.
- Validación fail-fast de `SESSION_SECRET` / `COOKIE_SECRET`, `COOKIE_SECURE`, `COOKIE_SAMESITE`, CORS allowlist y credentials.
- Prohibición de tokens de sesión en JSON, `localStorage`, `sessionStorage` o logs.
- Integración con login/logout y endpoints protegidos existentes.
- Tests Supertest/security para `Set-Cookie`, 401, logout, configuración y redacción.

### Out of Scope

- Implementar registro/login/logout completos.
- Implementar pantallas frontend de auth.
- Integrar captcha.
- Definir rate limiting.
- Implementar OAuth, SSO, MFA o Google login.
- Crear session store distribuido enterprise, Redis obligatorio o multi-device session management avanzado.
- Implementar rotación automática de secretos.
- Crear CSRF token complejo si `SameSite=Lax` se mantiene; si se usa `SameSite=None`, sólo se prepara/activa mitigación compatible con ADR-SEC-006.
- Introducir pagos, contratos firmados, WhatsApp, chat real-time, push, RAG, app nativa o decisiones autónomas de IA.

### Explicit Non-Goals

- No exponer `sid`, `jti`, JWT, token de sesión ni secret en response JSON.
- No usar `Authorization: Bearer` como mecanismo principal de sesión MVP en frontend.
- No permitir wildcard CORS con credentials.
- No permitir `SameSite=None` sin `Secure=true`.
- No debilitar backend como source of truth para autenticación/autorización.

---

## 5. Architecture Alignment

### Backend Architecture

La implementación vive en el backend Express/TypeScript dentro del modular monolith. Debe respetar Clean/Hexagonal Architecture:

- `identity-access` emite y revoca sesiones desde login/logout.
- `shared-kernel` o infraestructura de seguridad puede contener helpers transversales de cookie/session.
- Controllers no deben contener lógica de firma, expiración o redacción.
- `authMiddleware` valida cookie y pobla `req.user` con identidad mínima segura.
- Config validation debe ejecutarse en boot usando Zod o el mecanismo de configuración ya definido por US-089/US-091.

### Frontend Architecture

No se crean rutas ni componentes. El API client Next.js/TanStack Query debe usar `credentials: "include"` o configuración equivalente. El frontend nunca lee la cookie HTTP-only ni guarda tokens en browser storage.

### Database Architecture

No se requiere migración obligatoria si la sesión es cookie firmada/opaca sin store. Si el diseño existente usa `Session` server-side o lista de revocación por `sid`/`jti`, US-108 debe integrarse con ese store para logout y expiración. La decisión de modelo exacto debe respetar US-094 y el diseño DB vigente.

### API Architecture

REST JSON bajo `/api/v1`. La cookie se emite principalmente en `POST /api/v1/auth/login`, se limpia en `POST /api/v1/auth/logout` y se consume en `GET /api/v1/users/me` y rutas protegidas. OpenAPI debe documentar `cookieAuth` como security scheme cuando aplique.

### AI / PromptOps Architecture

No aplica. Esta historia no invoca IA, no usa `LLMProvider`, no persiste `AIRecommendation` y no requiere human-in-the-loop.

### Security Architecture

Debe alinearse con ADR-SEC-002 y ADR-SEC-006:

- Cookie HTTP-only firmada.
- `Secure=true` fuera de Local/CI.
- `SameSite=Lax` por defecto.
- `SameSite=None; Secure` sólo para cross-site con CORS allowlist y mitigación CSRF.
- Secretos sólo backend/Secrets Manager.
- Logs redactados.
- 401 seguro para cookies ausentes, manipuladas, expiradas o revocadas.

### Testing Architecture

Usar Vitest/Supertest para integración backend y security tests. Usar pruebas estáticas o unitarias para API client si existe frontend. Playwright puede cubrir login persistente en una historia frontend/auth posterior, pero no es obligatorio para cerrar US-108.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 | Login, desde US-094, debe llamar helper de sesión que emite `Set-Cookie: eventflow.sid` con `HttpOnly`, `Path=/`, firma válida y `Max-Age` 30 días por default; response JSON no contiene tokens. | Backend, API, Security |
| AC-02 | Cookie config factory aplica `Secure`/`SameSite` por entorno y bloquea `SameSite=None` sin `Secure`, CORS allowlist y mitigación CSRF. | Backend config, DevOps, Security |
| AC-03 | `authMiddleware` o helper equivalente valida firma, expiración y vigencia de sesión antes de poblar `req.user`. | Middleware, Security, Application |
| AC-04 | Cookie ausente, inválida, manipulada, expirada o revocada retorna `401 AUTHENTICATION_REQUIRED` sin filtrar causa exacta. | Middleware, API error handling |
| AC-05 | Logout limpia `eventflow.sid` con `Max-Age=0` y revoca `sid`/`jti` si existe store/lista de sesión. | Backend, API, Persistence optional |
| AC-06 | Config validation falla en boot ante secret insuficiente, `Secure=false` fuera de local, wildcard CORS con credentials o `SameSite=None` inseguro. | Config, DevOps, Security |
| AC-07 | Logger redacta `cookie`, `set-cookie`, `authorization`, session IDs, secrets y tokens. | Observability, Security |
| AC-08 | API client/frontend usa `credentials: "include"` y no lee ni guarda tokens de sesión. | Frontend, API client, Security |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `identity-access`: integración con login/logout y current user.
- `shared-kernel` / `shared/interface/http`: cookie helpers, auth middleware integration, error envelope.
- `infrastructure/security`: signing/verifying session cookie, secret handling.
- `infrastructure/config`: env parsing and fail-fast validation.
- `infrastructure/logging`: redaction rules.

### Use Cases / Application Services

No se crean nuevos casos de uso de negocio. US-108 aporta servicios técnicos consumidos por use cases existentes:

- `SessionCookieService` o equivalente:
  - `issueSessionCookie(response, sessionPayloadOrId)`
  - `clearSessionCookie(response)`
  - `verifySessionCookie(request)`
- `SessionRevocationService` o integración con `SessionRepository`, si existe store server-side.
- `CookieConfigProvider` para atributos por entorno.

### Controllers / Routes

US-108 no crea rutas nuevas. Se integra con:

- `POST /api/v1/auth/login`: emite cookie tras autenticación exitosa.
- `POST /api/v1/auth/logout`: limpia cookie y revoca sesión si aplica.
- `GET /api/v1/users/me`: valida cookie y retorna usuario autenticado.
- Protected `/api/v1/*`: consumen `authMiddleware`.

### DTOs / Schemas

No agrega DTOs públicos. Agrega o ajusta schemas internos de configuración:

- `SESSION_SECRET` o `COOKIE_SECRET`: requerido, mínimo 32 bytes.
- `SESSION_COOKIE_NAME`: default `eventflow.sid` si se permite override.
- `SESSION_COOKIE_MAX_AGE_DAYS`: default `30`, entero positivo.
- `COOKIE_SECURE`: boolean por entorno.
- `COOKIE_SAMESITE`: `lax | none | strict` si se usa enum; default `lax`.
- `CORS_ALLOWED_ORIGINS`: allowlist explícita cuando credentials está activo.
- `CORS_CREDENTIALS`: boolean.
- `APP_ENV` / `NODE_ENV`: usado para bloquear config insegura fuera de Local/CI.

### Repository / Persistence

Opcional, según estrategia de sesión definida por US-094:

- Si existe `Session` server-side:
  - `SessionRepository.create`
  - `SessionRepository.findValidByIdOrJti`
  - `SessionRepository.revoke`
  - `SessionRepository.deleteExpired` si ya existe mantenimiento.
- Si se usa cookie firmada opaca/JWT-like sin store:
  - No hay persistencia nueva.
  - Logout debe limpiar cookie; revocación global queda limitada salvo lista de revocación ya prevista.

La Technical Spec no fuerza Redis, session store distribuido ni multi-device session management.

### Validation Rules

- Rechazar boot si secret falta o mide menos de 32 bytes.
- Rechazar boot si entorno no-local tiene `COOKIE_SECURE=false`.
- Rechazar boot si `COOKIE_SAMESITE=none` y `COOKIE_SECURE=false`.
- Rechazar boot si `COOKIE_SAMESITE=none` sin CORS allowlist y `credentials=true`.
- Rechazar boot si `CORS_ALLOWED_ORIGINS=*` y `CORS_CREDENTIALS=true`.
- Emitir `Max-Age` default 30 días.
- No incluir session token, `sid`, `jti` ni secret en JSON.

### Error Handling

- `AUTHENTICATION_REQUIRED` con HTTP 401 para cookie ausente, inválida, manipulada, expirada o revocada.
- No distinguir causa exacta en response.
- Config inválida debe fallar con error claro en boot y exit code distinto de cero.
- Error envelope estándar y correlation ID según PB-P0-003.

### Transactions

- Login: transacción sólo si crear sesión server-side requiere persistencia atómica con auditoría/metadata.
- Logout: transacción sólo si revoca sesión persistida.
- Auth middleware: no inicia transacción; sólo lee/verifica sesión.

### Observability

- Log structured events para:
  - `session.cookie.issued`
  - `session.cookie.cleared`
  - `session.cookie.invalid`
  - `session.config.invalid`
- Redactar siempre:
  - `cookie`
  - `set-cookie`
  - `authorization`
  - `eventflow.sid`
  - `sid`
  - `jti`
  - `SESSION_SECRET`
  - `COOKIE_SECRET`
  - tokens.

---

## 8. Frontend Technical Design

### Routes / Pages

No se crean rutas ni páginas nuevas.

### Components

No aplica.

### Forms

No aplica.

### State Management

El frontend no almacena tokens de sesión. El estado autenticado debe resolverse mediante endpoint backend como `/api/v1/users/me` y cache controlado por TanStack Query si aplica.

### Data Fetching

El API client debe enviar cookies con:

- `credentials: "include"` en `fetch`.
- `withCredentials: true` si se usa cliente compatible tipo Axios.

No debe leer `document.cookie` para autenticación.

### Loading / Empty / Error / Success States

Los estados visibles de sesión expirada o 401 corresponden a historias frontend/auth. Esta US sólo exige que el contrato permita recibir 401 seguro y que el cliente no use tokens en storage.

### Accessibility

No aplica directamente. Cualquier UI de sesión expirada pertenece a historias frontend/auth.

### i18n

No aplica directamente. Mensajes visibles de sesión deben manejarse en historias frontend con next-intl.

---

## 9. API Contract Design

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Emitir `eventflow.sid` tras credenciales válidas | No, captcha/rate limit en historias relacionadas | Login DTO de US-094 | `Set-Cookie` HTTP-only firmado + public user/envelope sin token | 400/401/422/429; no token JSON |
| POST | `/api/v1/auth/logout` | Limpiar cookie y revocar sesión si aplica | Sí o idempotente según contrato AUTH | Cookie vigente opcional según contrato | Clear cookie `eventflow.sid` con `Max-Age=0` | 401 si contrato exige auth; no error interno si cookie ausente cuando se defina idempotente |
| GET | `/api/v1/users/me` | Validar cookie y retornar usuario autenticado | Sí, cookie válida | Cookie `eventflow.sid` | Public current user DTO | 401 `AUTHENTICATION_REQUIRED` |
| Any | Protected `/api/v1/*` | Consumir sesión backend source of truth | Sí | Cookie `eventflow.sid` | Handler protegido | 401 si cookie inválida/ausente/expirada/revocada |

OpenAPI debe declarar `cookieAuth` con `type: apiKey`, `in: cookie`, `name: eventflow.sid` o el nombre configurado si se permite override documentado.

---

## 10. Database / Prisma Design

### Models Impacted

- `Session` si el diseño de US-094/DB foundation usa sesión server-side.
- `User` sólo como entidad cargada para `req.user`; no requiere cambio.

### Fields / Columns

Si existe `Session`, se esperan campos equivalentes a:

- `id` o `sid`
- `userId`
- `expiresAt`
- `revokedAt`
- `createdAt`
- `lastSeenAt` si ya está previsto
- `jti` si la cookie contiene identificador revocable.

### Relations

- `Session.userId -> User.id`, si se usa store server-side.

### Indexes

Si existe `Session`:

- Índice único por `sid` o `jti`.
- Índice por `userId`.
- Índice por `expiresAt` si se limpian sesiones expiradas.

### Constraints

- Sesiones expiradas o revocadas no deben autenticar.
- Cookies/secrets nunca se persisten en JSONB ni logs.

### Migrations Impact

No se requiere migración obligatoria para US-108 si el modelo `Session` ya existe o si se usa cookie firmada sin store. Si US-094 decide session store persistente y aún no existe tabla, la migración pertenece a esa coordinación de auth/session, no a un scope enterprise.

### Seed Impact

No requiere cambios de seed. Las cuentas seed existentes podrán iniciar sesión y recibir cookie cuando auth esté implementado.

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

La autenticación de endpoints protegidos se basa en cookie `eventflow.sid` HTTP-only firmada. El backend valida firma, expiración y vigencia antes de poblar `req.user`.

### Authorization

US-108 no implementa RBAC/ownership. Después de autenticación exitosa, los middlewares de rol, ownership o assignment continúan como source of truth para autorización.

### Ownership Rules

No aplica directamente. Ownership se evalúa en historias/middlewares específicos después de autenticar la sesión.

### Role Rules

No aplica directamente. `req.user.role` debe estar disponible sólo si la cookie/sesión es válida; reglas de rol se aplican aguas abajo.

### Negative Authorization Scenarios

| Scenario | Expected Result |
|---|---|
| Cookie ausente en endpoint protegido | 401 `AUTHENTICATION_REQUIRED` |
| Cookie manipulada | 401 sin detalle interno |
| Cookie expirada | 401; limpieza defensiva si aplica |
| Cookie revocada tras logout | 401 |
| `SameSite=None` sin `Secure` | Backend no inicia |
| CORS wildcard con credentials | Backend no inicia o rechaza config |

### Audit Requirements

No requiere `AdminAction`. Registrar eventos técnicos/security logs para emisión, limpieza, invalid session y config inválida, sin datos sensibles.

### Sensitive Data Handling

- `SESSION_SECRET` / `COOKIE_SECRET` sólo backend/Secrets Manager.
- `Set-Cookie` y `Cookie` redactados de logs.
- No token/session ID en JSON.
- No `localStorage` ni `sessionStorage`.
- Cookie firmada con HMAC o mecanismo equivalente robusto.

---

## 13. Testing Strategy

### Unit Tests

- `CookieConfigProvider` calcula atributos por entorno.
- Validación de env falla con secret corto, `Secure=false` no-local, `SameSite=None` sin `Secure`, wildcard CORS con credentials.
- `SessionCookieService` genera clear cookie con `Max-Age=0`.
- Redaction rules eliminan cookie/secrets de logs.

### Integration Tests

- Login exitoso emite `Set-Cookie` con `HttpOnly`, `Path=/`, firma válida y `Max-Age` 30 días.
- QA/Demo config emite cookie con `Secure=true`.
- `SameSite=Lax` default.
- `SameSite=None; Secure` sólo cuando config cross-site es válida.
- Logout limpia cookie y request posterior retorna 401.

### API Tests

- Protected endpoint con cookie válida retorna success.
- Protected endpoint sin cookie retorna 401.
- Cookie manipulada retorna 401.
- Cookie expirada retorna 401.
- Response JSON de login no contiene `sid`, `jti`, JWT ni token.

### E2E Tests

Opcional para esta US. Un smoke Playwright de login persistente puede agregarse si ya existe UI auth, pero no bloquea la Technical Spec.

### Security Tests

- Inspección de `Set-Cookie`.
- Verificación de no token en browser storage.
- Verificación de redacción de logs.
- Fail-fast de configuración insegura.
- CORS wildcard + credentials bloqueado.

### Accessibility Tests

No aplica directamente.

### AI Tests

No aplica.

### Seed / Demo Tests

- No requiere seed nuevo.
- Demo/QA debe usar secretos y CORS/cookie config segura.
- Si Amplify ↔ App Runner está cross-site, validar `SameSite=None; Secure` y credentials.

### CI Checks

- Vitest unit.
- Supertest integration/security.
- Static check o test frontend para evitar `localStorage`/`sessionStorage` en auth client si existe frontend code.
- Config validation tests ejecutados con matrices Local/CI/QA-like.

---

## 14. Observability & Audit

### Logs

Logs estructurados para sesión, sin cookies/secrets. Eventos recomendados:

- `session.cookie.issued`
- `session.cookie.cleared`
- `session.cookie.invalid`
- `session.config.invalid`

### Correlation ID

Debe propagarse desde middleware existente y aparecer en errores/logs relacionados.

### AdminAction

No aplica. No es acción administrativa.

### Error Tracking

Errores de config boot y fallas inesperadas de session verification deben ser observables sin filtrar secretos.

### Metrics

No requiere métricas nuevas. Si existe observability foundation, puede contar 401 por sesión inválida y logout success como eventos técnicos.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No requiere seed nuevo.

### Demo Scenario Supported

Soporta demo de login/logout seguro, sesión persistente por cookie y acceso a `/api/v1/users/me` o rutas protegidas.

### Reset / Isolation Notes

El reset de seed no debe depender de cookies existentes. Las sesiones demo pueden invalidarse al reiniciar backend o rotar secret según configuración local.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| PB-P0-006 vs Doc 19 §10 | PB-P0-006 indica lifetime de cookie de 30 días; Doc 19 §10 menciona 24 horas. | US-108 aplica 30 días configurable por `SESSION_COOKIE_MAX_AGE_DAYS`. | Alinear Doc 19 §10 en revisión documental futura o mantener esta technical spec como decisión aplicada. | No |
| Doc 16/Doc 19 vs Doc 21/ADR-SEC-002 | Doc 16/19 usan `SameSite=Lax`; Doc 21 requiere `SameSite=None; Secure` para Amplify ↔ App Runner cross-site. | Default `SameSite=Lax`; `SameSite=None; Secure` sólo para cross-site con CORS allowlist y mitigación CSRF compatible. | Alinear documentación de deploy/security por entorno. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cookie no enviada por CORS/cross-site | Login parece exitoso pero frontend queda no autenticado | Validar CORS allowlist, `credentials=true`, frontend `credentials: "include"` y `SameSite=None; Secure` cuando aplique |
| Config insegura llega a QA/Demo | Sesiones vulnerables o cookies rechazadas por navegador | Fail-fast por entorno y tests de config |
| Tokens o cookies aparecen en logs | Riesgo de toma de cuenta o fuga de secretos | Redaction rules obligatorias y tests |
| Logout no invalida sesión server-side | Replay de cookie tras logout | Revocar `sid`/`jti` si existe store; limpiar cookie siempre |
| Diferencia Lax vs None reabre decisiones | Retraso por ambigüedad documental | Usar US-108 Decision Resolution como fuente formal |
| Session store no definido en US-094 | Implementación puede duplicar estrategia | Mantener abstracción `SessionCookieService`; no forzar Redis ni store enterprise |

---

## 18. Implementation Guidance for Coding Agents

- Archivos o carpetas probablemente impactadas:
  - `backend/src/modules/identity-access/`
  - `backend/src/shared/security/`
  - `backend/src/shared/http/middleware/`
  - `backend/src/shared/config/`
  - `backend/src/shared/logger/`
  - `frontend/src/shared/api/` o API client equivalente si existe frontend.
- Orden recomendado:
  1. Revisar implementación real de auth/session de US-094 y middleware de US-091.
  2. Agregar/ajustar config schema para cookie/session/CORS.
  3. Implementar `SessionCookieService` o adaptar helper existente.
  4. Integrar emisión en login y limpieza en logout.
  5. Integrar verificación en `authMiddleware`.
  6. Agregar redacción de logs.
  7. Ajustar API client para `credentials: "include"` si aplica.
  8. Agregar tests unitarios, integration y security.
- Decisiones que no deben reabrirse:
  - Cookie name default `eventflow.sid`.
  - Lifetime default 30 días.
  - `SameSite=Lax` default.
  - `SameSite=None; Secure` sólo para cross-site con mitigación.
  - No tokens en JSON ni browser storage.
- No implementar:
  - OAuth/MFA.
  - Redis obligatorio.
  - Session enterprise multi-device.
  - Captcha.
  - Rate limiting.
  - UI auth nueva.
- Preservar supuestos:
  - Backend es source of truth.
  - Secrets no salen del backend.
  - Local/CI puede operar con HTTP local controlado.
  - QA/Demo/producción requieren cookies seguras.

---

## 19. Task Generation Notes

- Suggested task groups:
  - Backend config/env validation.
  - Backend session cookie service.
  - Auth middleware integration.
  - Login/logout integration.
  - Logger redaction/security hardening.
  - Frontend API client credentials check.
  - Unit/integration/security tests.
  - Documentation alignment note in technical docs or runbook.
- Required QA tasks:
  - Supertest for `Set-Cookie`.
  - 401 scenarios.
  - Logout invalidation.
  - Config fail-fast.
  - Logs redaction.
- Required security tasks:
  - Verify cookie flags.
  - Verify secrets length and source.
  - Verify CORS credentials allowlist.
  - Verify no browser storage tokens.
- Required seed/demo tasks:
  - No seed changes.
  - Demo env config validation for cookie/CORS.
- Required documentation tasks:
  - Record 30-day cookie lifetime and SameSite-by-environment decision in implementation notes/runbook.
- Dependencies between tasks:
  - Config validation before cookie service tests.
  - Cookie service before login/logout integration.
  - Auth middleware integration before protected route tests.
  - Logger redaction before final security test pass.
- Parent backlog item consolidated tasks:
  - PB-P0-006 may later generate a consolidated task view combining US-108 and US-109, but development tasks should remain traceable per US.

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
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-108 está técnicamente lista para generar Development Tasks. Las decisiones críticas de sesión, cookie lifetime, `SameSite` por entorno, secretos, redacción y alcance MVP están formalizadas y no hay blockers técnicos pendientes.
