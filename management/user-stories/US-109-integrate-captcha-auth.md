# 🧾 User Story: Integrar captcha en auth

## 🆔 Metadata

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| ID                 | US-109                                          |
| Epic               | EPIC-SEC-001 — Security & Authorization         |
| Feature            | Captcha anti-bot                                |
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
**I want** verificar captcha anti-bot server-side en los endpoints sensibles de autenticación, con proveedor real configurable y mock determinista para Local/CI  
**So that** registro, login y solicitud de recuperación de contraseña estén protegidos contra abuso automatizado sin hacer que las pruebas dependan de servicios externos

---

## 🧠 Business Context

### Context Summary

EventFlow permite registro público, login y solicitud pública de recuperación de contraseña. Esos flujos son objetivos naturales para bots, credential stuffing, creación masiva de cuentas y abuso de email. PB-P0-006 exige captcha en auth; ADR-SEC-004 y la resolución de US-091 formalizan que el control aplica a `register`, `login` y `password reset request`.

Esta historia define la integración de captcha como capacidad transversal de seguridad: contrato de token desde frontend, verificación server-side, selección de proveedor por entorno, mock determinista para pruebas, errores controlados, redacción de logs y expectativas QA. No implementa el flujo completo de auth, cookies de sesión ni rate limiting estricto; esas responsabilidades quedan en historias relacionadas.

### Related Domain Concepts

* `CaptchaVerifier` — puerto backend para validar tokens sin acoplarse a un proveedor.
* `captchaVerificationMiddleware` — middleware que exige y valida `captchaToken` en endpoints auth sensibles.
* `CaptchaProvider` — proveedor configurado por entorno: `mock`, `recaptcha` o `hcaptcha`.
* `MockCaptchaProvider` — proveedor determinista para Local/CI que acepta únicamente `'__test__'`.
* `RecaptchaProvider` / `HcaptchaProvider` — adaptadores para proveedor real seleccionado.
* `captchaToken` — token enviado por frontend y verificado por backend.
* `captchaAction` — acción esperada cuando el proveedor lo soporta, por ejemplo `register`, `login` o `password_reset_request`.
* `captchaScore` — score usado por reCAPTCHA v3 si aplica.
* `CAPTCHA_PROVIDER`, `RECAPTCHA_SECRET_KEY`, `HCAPTCHA_SECRET_KEY` — configuración backend.
* `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` — site keys públicas del frontend.

### Assumptions

* US-091 provee el pipeline de middlewares y ya formalizó el alcance de captcha para auth.
* US-094 provee los endpoints AUTH y DTOs donde se recibirá `captchaToken`.
* US-108 cubre cookies HTTP-only firmadas y no forma parte de esta historia.
* Local/CI usan `CAPTCHA_PROVIDER=mock`; el único token válido en mock es `'__test__'`.
* QA/Demo/producción usan proveedor real (`recaptcha` o `hcaptcha`) con secretos gestionados fuera del repositorio.
* La verificación de captcha ocurre después de validación básica de payload y antes de procesar credenciales, crear usuarios, generar reset tokens o emitir cookies.
* El backend es source of truth: el frontend obtiene el token, pero nunca decide si el captcha es válido.

### Dependencies

* PB-P0-002 — Backend Modular Monolith Bootstrap.
* PB-P0-003 — Validation, Error Envelope & Logger.
* PB-P0-004 / US-094 — Auth endpoints that consume captcha verification.
* PB-P0-006 / US-108 — Session cookies, complementary security capability.
* US-091 — Middleware pipeline and formal captcha scope.
* US-110 — Rate limiting en auth como control complementario, fuera de esta historia.
* US-138 — Secrets Manager para secretos captcha en entornos no-locales.

### PO/BA Decisions Applied

| Decisión | Fuente | Aplicado |
| -------- | ------ | -------- |
| Endpoints protegidos por captcha | ADR-SEC-004; US-091 Decision Resolution; Doc 19 §9.7 | Aplicar captcha sólo a `POST /api/v1/auth/register`, `POST /api/v1/auth/login` y `POST /api/v1/auth/password/reset-request`. |
| Verificación server-side | BR-AUTH-011; FR-AUTH-002; Doc 8 UC-AUTH-001/002; Doc 19 | El frontend sólo envía `captchaToken`; backend verifica con secreto antes de ejecutar el caso de uso. |
| Mock determinista | US-091 Decision Resolution; Doc 19 §9.7 | `CAPTCHA_PROVIDER=mock` acepta únicamente `'__test__'`; cualquier otro token retorna error controlado. |
| Proveedor real configurable | PB-P0-006; Doc 19 §9.7; FRD | Soportar `recaptcha` o `hcaptcha` por adapter/config; la elección operativa no cambia el contrato del middleware. |
| Secretos fuera del cliente | Doc 19; ADR-SEC-005; US-138 | Secret keys sólo en backend/Secrets Manager; site keys públicas sólo en variables `NEXT_PUBLIC_*`. |
| Sin persistencia de tokens captcha | Doc 18; Doc 19 | No guardar `captchaToken`, response del proveedor ni secretos en base de datos, logs o analytics. |
| Rate limiting complementario | ADR-SEC-004; US-091 Decision Resolution | Esta historia no define umbrales de rate limit; coordina con US-110 para defensa combinada. |
| Alineación documental | US-109 Decision Resolution | Las diferencias documentales sobre alcance `register/login` vs `register/login/password reset request` y nombres de provider quedan resueltas por ADR-SEC-004, US-091 y Doc 19; no bloquean approval. |

---

## 🔗 Traceability

| Source                 | Reference |
| ---------------------- | --------- |
| FRD Requirement(s)     | FR-AUTH-001, FR-AUTH-002, FR-AUTH-003, FR-AUTH-006 |
| Use Case(s)            | UC-AUTH-001, UC-AUTH-002, UC-AUTH-004 |
| Business Rule(s)       | BR-AUTH-011, BR-PRIVACY-009 |
| Permission Rule(s)     | Anonymous may call auth endpoints only through public contract with valid captcha; backend verifies before processing |
| Data Entity / Entities | No persistence; downstream entities affected: User, Session, PasswordResetToken |
| API Endpoint(s)        | POST `/api/v1/auth/register`; POST `/api/v1/auth/login`; POST `/api/v1/auth/password/reset-request` |
| NFR Reference(s)       | NFR-SEC-004, NFR-SEC-007, NFR-OBS-003, NFR-OBS-006, NFR-TEST-001, NFR-TEST-006 |
| Related ADR(s)         | ADR-SEC-001, ADR-SEC-004, ADR-SEC-005, ADR-SEC-006, ADR-API-002, ADR-TEST-001 |
| Related Document(s)    | /docs/4, /docs/8, /docs/8.1, /docs/9, /docs/10, /docs/12, /docs/13, /docs/14, /docs/15, /docs/16, /docs/18, /docs/19, /docs/20, /docs/21, /docs/22, /management/artifacts/4-Product-Backlog-Prioritized.md |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (P0)

### Explicitly Out of Scope

* Implementar los endpoints AUTH completos — cubierto por US-094.
* Configurar cookies HTTP-only firmadas — cubierto por US-108.
* Definir umbrales estrictos de rate limiting por endpoint — cubierto por US-110.
* Aplicar captcha a todos los endpoints públicos del producto.
* Implementar MFA, OAuth, SSO enterprise o verificación biométrica.
* Resolver captcha automáticamente o delegar decisiones de seguridad a IA.
* Persistir tokens captcha, scores, secretos o respuestas completas del proveedor.
* Depender de llamadas reales a proveedores captcha en CI.
* Agregar pagos, contratos firmados, WhatsApp, chat real-time, push notifications, RAG, marketplace transaccional o app móvil nativa.

### Scope Notes

* Esta historia puede requerir plumbing mínimo en frontend para obtener y enviar `captchaToken` desde formularios existentes de auth, pero no rediseña pantallas.
* El control se valida siempre en backend, aunque el widget o script viva en frontend.
* El modo `mock` sólo es aceptable en Local/CI y no debe estar habilitado en QA/Demo/producción.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Registro valida captcha antes de crear usuario

**Given** un visitante envía `POST /api/v1/auth/register` con payload válido y `captchaToken` válido  
**When** el request pasa por `captchaVerificationMiddleware`  
**Then** el backend verifica el token server-side con el proveedor configurado  
**And** sólo si la verificación es exitosa continúa al caso de uso de registro  
**And** si el captcha falla no se crea `User`, `Credential`, `VendorProfile` ni sesión.

### AC-02: Login valida captcha antes de procesar credenciales

**Given** un visitante envía `POST /api/v1/auth/login` con email, password y `captchaToken` válido  
**When** el backend recibe el request  
**Then** verifica captcha antes de validar credenciales contra hashes o emitir sesión  
**And** si el captcha falla retorna error controlado sin indicar si el email o password eran válidos.

### AC-03: Solicitud de reset password valida captcha antes de generar token

**Given** un visitante envía `POST /api/v1/auth/password/reset-request` con email y `captchaToken` válido  
**When** el backend procesa la solicitud  
**Then** verifica captcha antes de generar token de reset o registrar notificación/email simulado  
**And** conserva la respuesta anti-enumeración definida para recuperación de contraseña.

### AC-04: Configuración por entorno selecciona proveedor correcto

**Given** una configuración de entorno válida  
**When** el servidor inicia  
**Then** `CAPTCHA_PROVIDER=mock` se permite sólo en Local/CI  
**And** `CAPTCHA_PROVIDER=recaptcha` exige `RECAPTCHA_SECRET_KEY` y site key frontend correspondiente  
**And** `CAPTCHA_PROVIDER=hcaptcha` exige `HCAPTCHA_SECRET_KEY` y site key frontend correspondiente  
**And** cualquier proveedor o secreto inválido falla al boot con mensaje claro.

### AC-05: Mock captcha es determinista para pruebas

**Given** `CAPTCHA_PROVIDER=mock`  
**When** un test envía `captchaToken='__test__'`  
**Then** el middleware acepta el captcha sin llamadas externas  
**And** cualquier token distinto, vacío o ausente retorna `400 CAPTCHA_INVALID` o `400 CAPTCHA_REQUIRED` según corresponda  
**And** CI no requiere conectividad hacia reCAPTCHA, hCaptcha ni servicios externos.

### AC-06: Proveedor real maneja action/score cuando aplica

**Given** `CAPTCHA_PROVIDER=recaptcha` o `hcaptcha`  
**When** el backend verifica un token  
**Then** valida que el token sea exitoso para el site configurado  
**And** cuando el proveedor soporte action, valida que coincida con `register`, `login` o `password_reset_request`  
**And** cuando reCAPTCHA v3 entregue score, aplica el umbral configurado por entorno.

### AC-07: Fallas del proveedor retornan error seguro y observable

**Given** el proveedor real responde error, timeout o payload inválido  
**When** el backend intenta verificar captcha  
**Then** retorna error controlado sin procesar credenciales ni mutaciones posteriores  
**And** registra evento estructurado con correlation ID, endpoint, provider y outcome  
**And** no registra `captchaToken`, secret keys, email completo ni response sensible del proveedor.

### AC-08: Frontend obtiene y envía token sin conocer secretos

**Given** un usuario usa formularios de registro, login o recuperación de contraseña  
**When** envía el formulario  
**Then** el frontend obtiene `captchaToken` desde el widget/provider configurado y lo incluye en el request  
**And** usa sólo site keys públicas `NEXT_PUBLIC_*`  
**And** reinicia o renueva el token cuando el backend responde `CAPTCHA_INVALID`, token expirado o timeout.

---

## ⚠️ Edge Cases

### EC-01: Token ausente

**Given** un request a endpoint auth sensible sin `captchaToken`  
**When** el backend valida el payload  
**Then** responde `400 CAPTCHA_REQUIRED`.

#### Handling

* Rechazar antes de ejecutar casos de uso de auth.
* No llamar al proveedor si el token está ausente.

### EC-02: Token inválido, expirado o duplicado

**Given** un request con `captchaToken` inválido, expirado, ya usado o rechazado por el proveedor  
**When** el middleware verifica el captcha  
**Then** responde `400 CAPTCHA_INVALID`.

#### Handling

* Devolver mensaje genérico de verificación de seguridad fallida.
* Permitir que frontend solicite un nuevo token.

### EC-03: Action incorrecta

**Given** un token emitido para una acción distinta al endpoint solicitado  
**When** el backend compara `captchaAction` esperada contra la respuesta del proveedor  
**Then** responde `400 CAPTCHA_INVALID`.

#### Handling

* Mapear endpoint a action esperada.
* Registrar outcome `action_mismatch` sin incluir token.

### EC-04: Score bajo en reCAPTCHA v3

**Given** reCAPTCHA v3 devuelve score menor al umbral configurado  
**When** el backend evalúa la respuesta  
**Then** rechaza con `400 CAPTCHA_INVALID`.

#### Handling

* Umbral configurable por entorno.
* No revelar score al cliente.

### EC-05: Proveedor no disponible

**Given** el proveedor real no responde dentro del timeout configurado  
**When** el backend verifica captcha  
**Then** retorna error controlado y no procesa la operación protegida.

#### Handling

* Timeout corto y configurable.
* Log estructurado con outcome `provider_timeout`.
* No fallback automático a `mock` fuera de Local/CI.

### EC-06: Mock habilitado en entorno no permitido

**Given** `CAPTCHA_PROVIDER=mock` en QA, Demo o producción  
**When** el servidor inicia  
**Then** falla al boot.

#### Handling

* Validación de env al inicio.
* Mensaje claro para corregir configuración.

---

## 🚫 Validation Rules

| ID    | Rule | Message / Behavior |
| ----- | ---- | ------------------ |
| VR-01 | `captchaToken` es requerido en `register`, `login` y `password/reset-request` | `400 CAPTCHA_REQUIRED` |
| VR-02 | `captchaToken` inválido, expirado, duplicado o rechazado | `400 CAPTCHA_INVALID` |
| VR-03 | `CAPTCHA_PROVIDER` debe ser `mock`, `recaptcha` o `hcaptcha` | Fail-fast en boot |
| VR-04 | `mock` sólo permitido en Local/CI | Fail-fast fuera de Local/CI |
| VR-05 | Proveedor real requiere secret key backend correspondiente | Fail-fast en boot |
| VR-06 | Site key pública requerida en frontend cuando proveedor real está activo | Build/config check falla o UI deshabilita submit con error controlado |
| VR-07 | `captchaAction` debe coincidir con el endpoint cuando el proveedor lo soporte | `400 CAPTCHA_INVALID` |
| VR-08 | `captchaScore` debe superar umbral configurado cuando aplique | `400 CAPTCHA_INVALID` |
| VR-09 | Tokens, secretos y responses sensibles no se persisten ni se loguean | Test/review bloquea exposición |

---

## 🔐 Authorization & Security Rules

| ID     | Rule |
| ------ | ---- |
| SEC-01 | Captcha se verifica server-side; frontend nunca decide validez. |
| SEC-02 | Secret keys de captcha viven sólo en backend/Secrets Manager, nunca en cliente ni repositorio. |
| SEC-03 | `captchaToken`, secrets, cookies, password y provider responses sensibles se redactan de logs. |
| SEC-04 | Captcha aplica exclusivamente a `POST /api/v1/auth/register`, `POST /api/v1/auth/login` y `POST /api/v1/auth/password/reset-request` en MVP. |
| SEC-05 | Verificación captcha ocurre antes de credential check, creación de usuario, emisión de sesión, generación de reset token o email simulado. |
| SEC-06 | No hay fallback automático de proveedor real a `mock` en QA/Demo/producción. |
| SEC-07 | Errores de captcha no revelan existencia de email, validez de password, score exacto ni detalles internos del proveedor. |
| SEC-08 | Rate limiting complementario se mantiene coordinado con US-110; captcha no sustituye rate limit. |

### Negative Authorization Scenarios

| Scenario | Expected Result |
| -------- | --------------- |
| Anonymous llama auth sensible sin captcha | `400 CAPTCHA_REQUIRED` |
| Bot envía token inválido | `400 CAPTCHA_INVALID`; no se procesa operación |
| Token de register se usa en login | `400 CAPTCHA_INVALID` por action mismatch |
| Mock token `'__test__'` se usa con proveedor real | Rechazo por proveedor real; no bypass |
| `CAPTCHA_PROVIDER=mock` en Demo | Fail-fast en boot |
| Provider timeout durante login | Error controlado; no credential check |

---

## 🤖 AI Behavior

No aplica — esta historia no invoca IA directamente.

### AI Involvement

* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: Not applicable
* Fallback Required: Not applicable

### AI Input

Not applicable.

### AI Output

Not applicable.

### Human-in-the-loop Rules

Not applicable.

### AI Error / Fallback Behavior

Not applicable.

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | Registro, login y recuperación de contraseña, según rutas frontend existentes. |
| Main UI Pattern     | Formulario auth con widget/script captcha o token invisible según proveedor. |
| Primary Action      | Submit del formulario sólo envía request con `captchaToken` vigente. |
| Secondary Actions   | Reintentar captcha cuando expire o falle. |
| Empty State         | N/A. |
| Loading State       | Submit deshabilitado mientras se obtiene token o se valida el request. |
| Error State         | Mensaje genérico: verificación de seguridad fallida; solicitar reintento. |
| Success State       | Continuar flujo normal de register/login/reset request. |
| Accessibility Notes | El formulario debe seguir siendo navegable por teclado; mensajes de error deben anunciarse; si el proveedor requiere challenge visible, usar integración accesible documentada por el proveedor. |
| Responsive Notes    | Widget no debe romper layout móvil. |
| i18n Notes          | Mensajes frontend en locale activo; códigos backend permanecen estables. |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: formularios de register, login y forgot password.
* Components: `CaptchaWidget` o hook equivalente, integrado con formularios auth.
* State Management: estado local del formulario; no almacenar tokens captcha persistentes.
* Forms: agregar `captchaToken` y, si aplica, `captchaAction`.
* API Client: enviar `captchaToken` en body de requests auth sensibles.
* Env: usar sólo `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` o `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`.

### Backend

* Use Case / Service: `CaptchaVerifier` port con adapters `MockCaptchaProvider`, `RecaptchaProvider`, `HcaptchaProvider`.
* Controller / Route: middleware aplicado a `register`, `login` y `password/reset-request`.
* Authorization Policy: endpoints permanecen públicos/anonymous, pero requieren captcha válido antes del caso de uso.
* Validation: Zod en boundary para `captchaToken` requerido y provider config al boot.
* Transaction Required: No para captcha; las transacciones downstream no deben iniciar si captcha falla.
* Provider Timeout: configurable y corto; error controlado sin fallback inseguro.

### Database

* Main Tables: ninguna nueva tabla.
* Constraints: no persistir tokens captcha ni provider responses.
* Index Considerations: N/A.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/v1/auth/register` | Crear cuenta con captcha válido |
| POST | `/api/v1/auth/login` | Iniciar sesión con captcha válido |
| POST | `/api/v1/auth/password/reset-request` | Solicitar reset password con captcha válido |

### Observability / Audit

* Correlation ID Required: Yes.
* Log Event Required: Yes for captcha failure, provider timeout, config error and suspicious repeated failures.
* AdminAction Required: No.
* AIRecommendation Required: No.
* Sensitive Fields Redacted: `captchaToken`, provider secret, password, cookie, authorization, full email, provider raw response.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario | Type |
| ----- | -------- | ---- |
| TS-01 | Register con `CAPTCHA_PROVIDER=mock` y token `'__test__'` continúa al caso de uso | Integration / Supertest |
| TS-02 | Login con token mock válido continúa al caso de uso | Integration / Supertest |
| TS-03 | Password reset request con token mock válido continúa al caso de uso | Integration / Supertest |
| TS-04 | Adapter real mapea request/response del proveedor a resultado `success`/`failure` | Unit |
| TS-05 | Frontend incluye `captchaToken` en requests de register/login/reset request | Component / Integration |

### Negative Tests

| ID    | Scenario | Expected Result |
| ----- | -------- | --------------- |
| NT-01 | Request sin `captchaToken` | `400 CAPTCHA_REQUIRED`; no provider call |
| NT-02 | Token mock distinto de `'__test__'` | `400 CAPTCHA_INVALID` |
| NT-03 | Token con action incorrecta | `400 CAPTCHA_INVALID` |
| NT-04 | Score reCAPTCHA bajo | `400 CAPTCHA_INVALID` |
| NT-05 | Provider timeout | Error controlado; no credential check ni mutación |
| NT-06 | `CAPTCHA_PROVIDER=mock` en Demo/production | Fail-fast en boot |
| NT-07 | Secret key faltante para proveedor real | Fail-fast en boot |
| NT-08 | Logs ante captcha inválido | No contienen `captchaToken`, secret, password ni raw provider response |

### AI Tests

No aplica — esta historia no invoca IA.

### Authorization Tests

| ID         | Scenario | Expected Result |
| ---------- | -------- | --------------- |
| AUTH-TS-01 | Anonymous con captcha válido llama register/login/reset-request | Allowed to reach use case |
| AUTH-TS-02 | Anonymous sin captcha válido llama endpoint auth sensible | Rejected before use case |
| AUTH-TS-03 | Endpoint no auth no requiere captcha por accidente | No captcha middleware fuera de scope |

### Accessibility Tests

| ID      | Scenario | Expected Result |
| ------- | -------- | --------------- |
| A11Y-01 | Error de captcha en formulario auth | Mensaje visible y anunciado por lector de pantalla |
| A11Y-02 | Formulario en mobile con widget captcha | No hay overflow ni bloqueo de submit accesible |

### Seed / Demo Tests

| ID      | Scenario | Expected Result |
| ------- | -------- | --------------- |
| DEMO-01 | Demo/QA con proveedor real configurado | Captcha funciona con site key pública y secret backend |
| DEMO-02 | CI con `CAPTCHA_PROVIDER=mock` | Suite pasa sin red externa |

---

## 📊 Business Impact

| Field               | Value |
| ------------------- | ----- |
| KPI Affected        | Seguridad de auth, tasa de abuso bloqueado, estabilidad CI, demo readiness |
| Expected Impact     | Reduce abuso automatizado en registro/login/reset request sin fricción técnica para pruebas |
| Success Criteria    | Auth sensible rechaza tokens ausentes/inválidos; CI usa mock determinista; QA/Demo usan proveedor real |
| Academic Demo Value | Evidencia clara de seguridad MVP, ADR-SEC-004 y testing determinista |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Integrar `CaptchaWidget`/hook en register, login y forgot password.
* Configurar site key pública por proveedor.
* Enviar `captchaToken` y renovar token ante error.
* Agregar tests de formulario y mensajes accesibles.

### Potential Backend Tasks

* Crear `CaptchaVerifier` port y adapters `mock`, `recaptcha`, `hcaptcha`.
* Implementar `captchaVerificationMiddleware`.
* Agregar validación Zod/config para provider, secrets y entornos permitidos.
* Aplicar middleware sólo a endpoints auth sensibles.
* Implementar redacción de logs y errores estándar.

### Potential Database Tasks

* No aplica.

### Potential AI / PromptOps Tasks

* No aplica.

### Potential QA Tasks

* Tests unitarios de adapters.
* Tests integration/Supertest con `CAPTCHA_PROVIDER=mock`.
* Tests negativos de token ausente, inválido, action mismatch, provider timeout y config fail-fast.
* Verificación de logs sin token/secrets.
* Smoke QA/Demo con proveedor real configurado.

### Potential DevOps / Config Tasks

* Definir variables `CAPTCHA_PROVIDER`, secret keys backend y site keys frontend.
* Asegurar que secretos reales vengan de Secrets Manager o configuración segura.
* Bloquear `mock` fuera de Local/CI.
* Documentar configuración en runbook de demo/deploy.

---

## ✅ Definition of Ready Checklist

| Check | Status |
| ----- | ------ |
| User Story tiene valor y alcance claro | Ready |
| Backlog Item y Epic trazados | Ready |
| Acceptance Criteria son testeables | Ready |
| Endpoints afectados definidos | Ready |
| Dependencias y out-of-scope claros | Ready |
| Seguridad y secretos definidos | Ready |
| AI marcado correctamente como no aplicable | Ready |
| QA expectations incluidas | Ready |
| Seed/demo impact aclarado | Ready |
| No hay decisiones bloqueantes pendientes | Ready |

---

## 🏁 Definition of Done

* Captcha se verifica server-side en los tres endpoints auth sensibles definidos.
* `CAPTCHA_PROVIDER=mock` funciona en Local/CI con token `'__test__'` y rechaza otros tokens.
* Proveedor real `recaptcha` o `hcaptcha` se configura por entorno con secretos backend.
* Configuración insegura falla al boot.
* Tokens, secretos y responses sensibles no se persisten ni aparecen en logs.
* Frontend envía `captchaToken` en formularios auth aplicables.
* Tests unitarios, integration, negativos, seguridad y smoke aplicables pasan en CI.
* No se implementa scope fuera de MVP.
