# 🧾 User Story: Configurar cookies HTTP-only firmadas

## 🆔 Metadata

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| ID                 | US-108                                          |
| Epic               | EPIC-SEC-001 — Security & Authorization         |
| Feature            | Cookies de sesión                               |
| Backlog Item       | PB-P0-006                                       |
| Module / Domain    | Security / Identity Access                      |
| User Role          | System                                          |
| Priority           | Must Have (P0)                                  |
| Status             | Approved                                        |
| Owner              | Product Owner / Business Analyst                |
| Approved By        | Product Owner / Business Analyst Review         |
| Approval Date      | 2026-06-15                                      |
| Ready for Development Tasks | Yes                                  |
| Sprint / Milestone | MVP                                             |
| Created Date       | 2026-06-09                                      |
| Last Updated       | 2026-06-15                                      |

---

## 🎯 User Story

**As the** sistema backend de EventFlow  
**I want** emitir, validar y limpiar cookies de sesión HTTP-only firmadas con atributos seguros por entorno  
**So that** las sesiones de registro/login/logout sean resistentes a robo por XSS, manipulación de cookie y configuración insegura en Local, CI, QA y Demo

---

## 🧠 Business Context

### Context Summary

EventFlow usa autenticación basada en sesión/cookie gestionada por el backend. La cookie debe ser inaccesible para JavaScript (`HttpOnly`), firmada con un secreto backend, enviada sólo bajo configuración segura en entornos no-locales y compatible con el despliegue MVP. Esta historia pertenece a PB-P0-006 y configura la base de sesión segura que consumen los endpoints AUTH de US-094 y el frontend.

La historia no implementa registro/login completos ni captcha; define la política y helpers de emisión/limpieza/verificación de cookie que dichos endpoints usan. También evita que tokens terminen en `localStorage`, payload JSON, logs o código cliente.

### Related Domain Concepts

* `eventflow.sid` — cookie de sesión opaca y firmada.
* `SESSION_SECRET` / `COOKIE_SECRET` — secreto backend para firmar/verificar cookie.
* `Session` — sesión activa o payload opaco según implementación definida por auth.
* `Set-Cookie` — header que transporta atributos `HttpOnly`, `Secure`, `SameSite`, `Path` y `Max-Age`.
* `cookieAuth` — esquema documental del contrato OpenAPI para autenticación por cookie.
* CORS with credentials — configuración necesaria para que el navegador envíe cookies al backend.
* CSRF mitigation — `SameSite=Lax` por defecto y validación de `Origin`/`Referer` en mutaciones; si `SameSite=None`, debe existir mitigación CSRF compatible con ADR-SEC-006.

### Assumptions

* US-089/US-091 proveen el servidor Express, middleware pipeline, CORS, logging, error handling y validación de configuración base.
* US-094 usa los helpers de sesión/cookie para login, logout y resolución de usuario autenticado.
* PB-P0-006 define lifetime de sesión de 30 días para la cookie.
* En Local/CI se permite configuración compatible con HTTP local; en QA/Demo/producción `Secure=true` es obligatorio.
* `SameSite=Lax` es el default MVP cuando frontend y backend operan en contexto same-site o dominio custom compatible.
* `SameSite=None; Secure` sólo se permite para despliegues cross-site como Amplify ↔ App Runner, y requiere CORS allowlist con `credentials=true` y mitigación CSRF conforme a ADR-SEC-006.
* La cookie se firma con secreto backend de al menos 32 bytes y el contenido permanece opaco al cliente.

### Dependencies

* PB-P0-002 — Backend Modular Monolith Bootstrap.
* PB-P0-003 — Validation, Error Envelope & Logger.
* PB-P0-004 / US-094 — Auth endpoints that issue/clear/read session cookies.
* US-091 — Middleware pipeline, CORS, request logging and safe error handling.
* US-109 — Captcha en auth, dentro del mismo PB-P0-006 pero fuera de esta historia.

### PO/BA Decisions Applied

| Decisión | Fuente | Aplicado |
| -------- | ------ | -------- |
| Transporte de sesión | ADR-SEC-002, Doc 16 §10, Doc 19 §10 | La sesión se transporta mediante cookie HTTP-only firmada; no se usan tokens legibles por JS ni `localStorage`. |
| Nombre de cookie | Doc 19 §10 | Usar `eventflow.sid` salvo override técnico documentado en env/config. |
| Lifetime de cookie | Product Backlog PB-P0-006; priorization input US-003 | `Max-Age` MVP: 30 días; configurable por `SESSION_COOKIE_MAX_AGE_DAYS` con default 30. |
| SameSite por entorno | ADR-SEC-002, ADR-SEC-006, Doc 19 §22, Doc 21 §10.6 | Default `SameSite=Lax`; permitir `SameSite=None; Secure` sólo para hosting cross-site con CORS allowlist y mitigación CSRF compatible. |
| Secure por entorno | PB-P0-006, Doc 19 §10, Doc 21 | `Secure=true` obligatorio en QA/Demo/producción; Local/CI puede desactivarlo sólo para HTTP local controlado. |
| Logout | FR-AUTH-005, BR-AUTH-003, Doc 8 UC-AUTH-003 | Logout limpia la cookie con `Max-Age=0` y, si existe store/lista de sesiones, revoca la sesión o `jti`. |
| Alineación documental | US-108 Decision Resolution | Las diferencias documentales sobre lifetime de 30 días vs 24 horas y `SameSite=Lax` vs `SameSite=None; Secure` quedan resueltas por PB-P0-006 y ADR-SEC-002/006; no bloquean approval. |

---

## 🔗 Traceability

| Source                 | Reference |
| ---------------------- | --------- |
| FRD Requirement(s)     | FR-AUTH-003, FR-AUTH-004, FR-AUTH-005, FR-AUTH-008, FR-AUTH-010 |
| Use Case(s)            | UC-AUTH-002, UC-AUTH-003, UC-AUTH-004 |
| Business Rule(s)       | BR-AUTH-001, BR-AUTH-003, BR-AUTH-009, BR-PRIVACY-009 |
| Permission Rule(s)     | SEC-POL-AUTH-008; backend validates cookie/session before protected endpoints |
| Data Entity / Entities | Session, User |
| API Endpoint(s)        | POST `/api/v1/auth/login`; POST `/api/v1/auth/logout`; GET `/api/v1/users/me`; all protected `/api/v1/*` routes |
| NFR Reference(s)       | NFR-SEC-001, NFR-SEC-002, NFR-SEC-003, NFR-SEC-007, NFR-TEST-001, NFR-TEST-005, NFR-OBS-003, NFR-OBS-006 |
| Related ADR(s)         | ADR-SEC-001, ADR-SEC-002, ADR-SEC-003, ADR-SEC-005, ADR-SEC-006, ADR-API-001, ADR-API-002, ADR-TEST-001 |
| Related Document(s)    | /docs/4, /docs/8, /docs/9, /docs/10, /docs/14, /docs/15, /docs/16, /docs/19, /docs/20, /docs/21, /docs/22, /management/artifacts/4-Product-Backlog-Prioritized.md |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (P0)

### Explicitly Out of Scope

* Implementar pantallas de login/logout.
* Implementar registro/login completos — cubiertos por US-094.
* Integrar captcha — cubierto por US-109.
* Implementar OAuth Google, SSO, MFA, refresh token rotation enterprise o sesión multi-dispositivo avanzada.
* Crear session store distribuido enterprise, Redis obligatorio o revocación global por dispositivo.
* Usar `localStorage` o `sessionStorage` para credenciales.
* Usar `Authorization: Bearer` en frontend como mecanismo MVP principal.
* Implementar CSRF token complejo si el despliegue se mantiene con `SameSite=Lax`; si se activa `SameSite=None`, debe existir mitigación CSRF compatible con ADR-SEC-006.

### Scope Notes

* Esta historia define helpers/configuración de cookie y verificación de flags. La lógica de credenciales, hashing, captcha, rate limiting y endpoints AUTH se implementa en historias relacionadas.
* Backend sigue siendo source of truth para autenticación/autorización.
* No introduce pagos, contratos firmados, WhatsApp, chat, push, RAG, app nativa ni decisiones autónomas de IA.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Login emite cookie de sesión HTTP-only firmada

**Given** que el endpoint de login de US-094 autentica correctamente a un usuario  
**When** el backend emite la sesión  
**Then** la respuesta incluye `Set-Cookie` para `eventflow.sid`  
**And** la cookie tiene `HttpOnly`, `Path=/`, firma válida y `Max-Age` equivalente a 30 días por default  
**And** el JSON de respuesta no incluye token de sesión, JWT, `sid`, `jti` ni secreto.

### AC-02: Atributos `Secure` y `SameSite` se aplican por entorno

**Given** una configuración de entorno válida  
**When** el backend emite la cookie  
**Then** en QA/Demo/producción la cookie se emite con `Secure=true`  
**And** por default se emite con `SameSite=Lax`  
**And** si `COOKIE_SAMESITE=None`, también exige `Secure=true`, CORS allowlist con credentials y mitigación CSRF compatible.

### AC-03: `authMiddleware` verifica cookie firmada y pobla usuario autenticado

**Given** un request a endpoint protegido con cookie de sesión válida  
**When** pasa por `authMiddleware` o helper equivalente  
**Then** el backend valida firma, expiración y vigencia de sesión  
**And** asigna `req.user` con datos mínimos seguros  
**And** continúa hacia el handler protegido.

### AC-04: Cookie inválida, manipulada, expirada o ausente retorna 401

**Given** un request a endpoint protegido sin cookie válida  
**When** el backend valida la sesión  
**Then** responde `401 AUTHENTICATION_REQUIRED` con error envelope estándar  
**And** no expone si el error fue firma inválida, expiración, sesión revocada o ausencia de cookie.

### AC-05: Logout limpia la cookie y deja la sesión inutilizable

**Given** un usuario autenticado con cookie vigente  
**When** llama `POST /api/v1/auth/logout`  
**Then** el backend responde limpiando `eventflow.sid` con `Max-Age=0` o expiración equivalente  
**And** si existe store/lista de sesión, revoca `sid`/`jti`  
**And** requests protegidos posteriores con esa cookie responden `401`.

### AC-06: Configuración insegura falla al boot

**Given** un entorno no-local sin `SESSION_SECRET`/`COOKIE_SECRET` suficiente, con `Secure=false`, con wildcard CORS y credentials, o con `SameSite=None` sin `Secure=true`  
**When** el servidor inicia  
**Then** falla en boot con mensaje claro y exit code distinto de cero  
**And** no levanta un backend que pueda emitir cookies inseguras.

### AC-07: Logs y errores no exponen cookies ni secretos

**Given** requests de login/logout o requests protegidos con cookie  
**When** se registran logs o errores  
**Then** `set-cookie`, `cookie`, `authorization`, `SESSION_SECRET`, `COOKIE_SECRET`, `sid`, `jti` y tokens quedan redactados o ausentes  
**And** los errores devueltos al cliente mantienen el envelope seguro.

### AC-08: Frontend/API client usa cookies con credentials sin leer tokens

**Given** el frontend consume endpoints protegidos  
**When** realiza requests al backend  
**Then** usa `credentials: "include"` o configuración equivalente  
**And** no lee ni almacena tokens de sesión en `localStorage`, `sessionStorage` ni estado cliente.

---

## ⚠️ Edge Cases

### EC-01: Cookie manipulada manualmente

**Given** una cookie `eventflow.sid` con payload o firma alterados  
**When** el request llega a una ruta protegida  
**Then** el backend responde `401 AUTHENTICATION_REQUIRED`.

#### Handling

* Verificar firma con `SESSION_SECRET`/`COOKIE_SECRET`.
* No indicar al cliente cuál parte de la cookie falló.

### EC-02: Cookie expirada

**Given** una cookie con `exp` vencido o `Max-Age` expirado  
**When** el request llega a una ruta protegida  
**Then** el backend responde `401` y puede emitir limpieza defensiva de cookie.

#### Handling

* Validar expiración en backend además del atributo del navegador.

### EC-03: `SameSite=None` configurado sin `Secure`

**Given** `COOKIE_SAMESITE=None` y `COOKIE_SECURE=false`  
**When** el servidor inicia  
**Then** falla en boot por configuración insegura.

#### Handling

* Validación de env en boot.

### EC-04: CORS wildcard con credenciales

**Given** `CORS_ALLOWED_ORIGINS=*` y `CORS_CREDENTIALS=true`  
**When** el servidor inicia  
**Then** falla en boot o rechaza esa configuración.

#### Handling

* CORS allowlist explícita por entorno.

### EC-05: Logout idempotente sin cookie

**Given** un request a logout sin cookie o con cookie ya expirada  
**When** llama `POST /api/v1/auth/logout`  
**Then** responde de forma idempotente según contrato AUTH y emite limpieza defensiva sin error interno.

#### Handling

* El clear-cookie no depende de sesión activa.

---

## 🚫 Validation Rules

| ID    | Rule | Message / Behavior |
| ----- | ---- | ------------------ |
| VR-01 | `SESSION_SECRET` / `COOKIE_SECRET` requerido y con longitud mínima de 32 bytes | Fail-fast en boot |
| VR-02 | `Secure=true` obligatorio en QA/Demo/producción | Fail-fast si se desactiva fuera de Local/CI |
| VR-03 | `SameSite=None` requiere `Secure=true` | Fail-fast |
| VR-04 | `SameSite=None` requiere CORS allowlist + credentials y mitigación CSRF compatible | Fail-fast o blocker de configuración |
| VR-05 | `Max-Age` default 30 días | Cookie emitida con expiración consistente |
| VR-06 | No usar `localStorage`/`sessionStorage` para tokens | Lint/review/test bloquea credenciales en browser storage |
| VR-07 | Logs redactan cookies/secrets | Tests o snapshot logs verifican redacción |

---

## 🔐 Authorization & Security Rules

| ID     | Rule |
| ------ | ---- |
| SEC-01 | Cookie de sesión debe ser `HttpOnly`, firmada y opaca al cliente. |
| SEC-02 | Cookie debe usar `Secure=true` en QA/Demo/producción. |
| SEC-03 | Default `SameSite=Lax`; `SameSite=None` sólo con `Secure=true`, CORS allowlist y mitigación CSRF compatible. |
| SEC-04 | Backend valida firma, expiración y vigencia de sesión antes de poblar `req.user`. |
| SEC-05 | `localStorage` y `sessionStorage` están prohibidos para credenciales de sesión. |
| SEC-06 | Logout limpia cookie y revoca sesión si existe store/lista de revocación. |
| SEC-07 | Cookies, secrets y tokens se redactan en logs y nunca se exponen en JSON. |

### Negative Authorization Scenarios

| Scenario | Expected Result |
| -------- | --------------- |
| Request protegido sin cookie | 401 `AUTHENTICATION_REQUIRED` |
| Cookie manipulada | 401 `AUTHENTICATION_REQUIRED` |
| Cookie expirada | 401 `AUTHENTICATION_REQUIRED` |
| Cookie revocada tras logout | 401 `AUTHENTICATION_REQUIRED` |
| `SameSite=None` sin `Secure` | Backend no inicia |
| CORS wildcard con credentials | Backend no inicia o configuración rechazada |

---

## 🤖 AI Behavior

This story does not invoke AI directly.

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

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | No aplica a usuario final; afecta login/logout y requests autenticados. |
| Main UI Pattern     | N/A. |
| Primary Action      | N/A. |
| Secondary Actions   | N/A. |
| Empty State         | N/A. |
| Loading State       | N/A. |
| Error State         | Sesión inválida/expirada debe surfacerse por historias frontend/auth como redirect/login o mensaje genérico. |
| Success State       | Login queda autenticado por cookie gestionada por navegador. |
| Accessibility Notes | No aplica directamente; flujos UI se cubren en historias frontend/auth. |
| Responsive Notes    | No aplica. |
| i18n Notes          | Mensajes visibles de sesión expirada corresponden a historias frontend/auth. |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: No crea rutas nuevas.
* Components: N/A.
* State Management: No almacenar tokens; estado de sesión se obtiene vía endpoints backend.
* Forms: N/A.
* API Client: usar `credentials: "include"` o equivalente; prohibido leer cookie HTTP-only.

### Backend

* Use Case / Service: session cookie helpers / auth middleware integration.
* Controller / Route: login/logout de US-094 consumen helpers; esta historia no crea endpoints nuevos.
* Authorization Policy: protected routes rely on valid signed session cookie.
* Validation: env/config validation at boot.
* Transaction Required: No, salvo revocación de sesión si se usa store persistente.
* Cookie name: `eventflow.sid`.
* Default cookie lifetime: 30 días.
* Cookie attributes: `HttpOnly`, `Path=/`, signed, `Secure` by environment, `SameSite` by environment.

### Database

* Main Tables: `Session` si la implementación usa sesión server-side; no aplica si se usa cookie firmada opaca/JWT opaco sin store.
* Constraints: Si existe `Session`, debe soportar revocación/expiración por `sid`/`jti`.
* Index Considerations: Si existe `Session`, índice por `sid`/`jti` y `userId`.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/v1/auth/login` | Emite cookie de sesión tras credenciales válidas. |
| POST | `/api/v1/auth/logout` | Limpia/revoca cookie de sesión. |
| GET | `/api/v1/users/me` | Verifica cookie y retorna usuario autenticado. |
| — | Protected `/api/v1/*` | Consumen cookie vía `authMiddleware`. |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes, para fallos de autenticación/configuración; sin cookie/secrets.
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario | Type |
| ----- | -------- | ---- |
| TS-01 | Login exitoso emite `Set-Cookie` con `HttpOnly`, firma válida, `Path=/`, `Max-Age` 30 días y sin token en JSON | Supertest / Integration |
| TS-02 | Cookie válida permite acceder a endpoint protegido y poblar usuario autenticado | Integration |
| TS-03 | Logout limpia cookie con `Max-Age=0` y sesión posterior responde 401 | Integration |
| TS-04 | API client/frontend usa `credentials: "include"` y no storage de tokens | Unit / Static / Review |

### Negative Tests

| ID    | Scenario | Expected Result |
| ----- | -------- | --------------- |
| NT-01 | Cookie ausente en endpoint protegido | 401 |
| NT-02 | Cookie manipulada | 401 sin detalle interno |
| NT-03 | Cookie expirada | 401 y limpieza defensiva si aplica |
| NT-04 | `SESSION_SECRET` corto o ausente | Fail-fast al boot |
| NT-05 | `SameSite=None` sin `Secure=true` | Fail-fast al boot |
| NT-06 | CORS wildcard con credentials | Fail-fast o configuración rechazada |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario | Expected Result |
| ---------- | -------- | --------------- |
| AUTH-TS-01 | Request protegido con cookie válida | Success |
| AUTH-TS-02 | Request protegido tras logout | 401 |
| AUTH-TS-03 | Cookie válida pero rol/ownership insuficiente | Continúa a middleware AuthZ correspondiente; 403/404 se cubre en historias RBAC/ownership |

### Security Tests

| ID        | Scenario | Expected Result |
| --------- | -------- | --------------- |
| SEC-TS-01 | Inspección de `Set-Cookie` en QA/Demo config | `HttpOnly`, `Secure`, `SameSite` esperado, `Path=/`, `Max-Age` |
| SEC-TS-02 | Logs de login/logout | No contienen `cookie`, `set-cookie`, `sid`, `jti`, secrets ni tokens |
| SEC-TS-03 | Intento de leer token desde frontend storage | No hay token en `localStorage`/`sessionStorage` |

### Accessibility Tests

* No aplica directamente; flujos UI se cubren en historias frontend/auth.

---

## 📊 Business Impact

| Field               | Value |
| ------------------- | ----- |
| KPI Affected        | Seguridad de sesión, estabilidad de auth, demo readiness |
| Expected Impact     | Reduce riesgo de robo de sesión por XSS, cookies manipuladas y configuración insegura |
| Success Criteria    | Headers `Set-Cookie` seguros, tests de sesión verdes, CI bloquea configuración insegura |
| Academic Demo Value | Evidencia clara de hardening de sesión y cumplimiento ADR/security design |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Configurar API client con `credentials: "include"`.
* Verificar que no se usan tokens en browser storage.

### Potential Backend Tasks

* Implementar session cookie helper.
* Validar env/config de cookies al boot.
* Integrar helper con login/logout/auth middleware.
* Redactar cookies/secrets en logger.

### Potential Database Tasks

* Sólo si se usa `Session` server-side: soporte para expiración/revocación de `sid`/`jti`.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Supertest de `Set-Cookie`, cookie inválida, logout, config fail-fast y redacción de logs.
* Playwright/smoke de login persistente si existe frontend auth.

### Potential DevOps / Config Tasks

* Definir `SESSION_SECRET` / `COOKIE_SECRET`, `SESSION_COOKIE_MAX_AGE_DAYS`, `COOKIE_SECURE`, `COOKIE_SAMESITE`, `CORS_ALLOWED_ORIGINS`, `CORS_CREDENTIALS`.
* Asegurar valores seguros por Local/CI/QA/Demo.

---

## ✅ Definition of Ready

* [x] Rol claro (`System`).
* [x] Backlog item identificado (`PB-P0-006`).
* [x] Valor de seguridad claro.
* [x] Dependencias explícitas.
* [x] Decisiones de cookie formalizadas desde ADR-SEC-002 y PB-P0-006.
* [x] Acceptance Criteria específicos y testeables.
* [x] Edge cases y configuración insegura documentados.
* [x] Out of Scope explícito.
* [x] Seguridad, QA y DevOps definidos.
* [x] IA marcada como no aplicable.
* [x] Documentation alignment no bloqueante identificado.

---

## ✅ Definition of Done

* [ ] Cookie de sesión emitida por login con atributos esperados.
* [ ] Logout limpia cookie y deja sesión inutilizable.
* [ ] Backend rechaza cookie ausente, inválida, expirada o manipulada con 401 seguro.
* [ ] Configuración insegura falla al boot.
* [ ] Logs no exponen cookies, `sid`, `jti`, tokens ni secrets.
* [ ] Frontend/API client usa `credentials: "include"` y no storage de tokens.
* [ ] Tests Supertest/security verdes en CI.

---

## 📝 Notes

* Documentation Alignment Required: PB-P0-006 define lifetime de sesión de 30 días, mientras Doc 19 §10 menciona 24 horas. Para esta historia se aplica la decisión más específica del backlog: 30 días configurable.
* Documentation Alignment Required: Doc 19/Doc 16 usan `SameSite=Lax` como default, mientras Doc 21 requiere `SameSite=None; Secure` para Amplify ↔ App Runner cross-site. ADR-SEC-002 resuelve el conflicto permitiendo ambos por entorno; `SameSite=None` exige mitigación CSRF compatible con ADR-SEC-006.
