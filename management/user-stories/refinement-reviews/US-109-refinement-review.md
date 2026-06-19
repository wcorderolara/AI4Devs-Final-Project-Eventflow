# User Story Refinement Review — US-109

## Source User Story File

`management/user-stories/US-109-integrate-captcha-auth.md`

## Decision Resolution Artifact

`management/user-stories/decision-resolutions/US-109-decision-resolution.md`

## Review Date

2026-06-15

## 1. Resultado Ejecutivo

| Campo | Evaluación |
| ----- | ---------- |
| User Story ID | US-109 |
| File Path | `management/user-stories/US-109-integrate-captcha-auth.md` |
| Backlog Item | PB-P0-006 — Security Cookies HTTP-Only + Captcha |
| Epic | EPIC-SEC-001 — Security & Authorization |
| Estado actual | Draft |
| Estado recomendado | Ready for Approval |
| Nivel de riesgo | Medio |
| Calidad general | Alta |
| Requiere decisión PO | No |
| Requiere decisión técnica | No |
| Requiere decisión QA | No |
| Requiere decisión Seguridad | No |
| Decision Resolution artifact found | No |
| User Story file updated | Yes |
| Refinement review artifact created/updated | Yes |
| Refinement review path | `management/user-stories/refinement-reviews/US-109-refinement-review.md` |

US-109 fue refinada desde un placeholder genérico hacia una historia de seguridad clara, testeable y trazable para integrar captcha en los endpoints sensibles de autenticación. La historia ahora cubre provider selection, mock determinista, verificación server-side, secretos, redacción de logs, frontend token plumbing, edge cases y QA.

No quedan preguntas bloqueantes. La decisión de aplicar captcha también a `password reset request` ya está formalizada en ADR-SEC-004 y en la resolución de US-091; los documentos anteriores que sólo mencionan registro/login quedan como alineación documental no bloqueante.

## 2. Diagnóstico PO/BA

La historia aporta valor directo al MVP porque reduce abuso automatizado en flujos públicos de autenticación y preserva la reproducibilidad de CI mediante `CAPTCHA_PROVIDER=mock`. Está alineada con PB-P0-006, EPIC-SEC-001, FR-AUTH-002, BR-AUTH-011, Doc 19, ADR-SEC-004 y US-091.

La versión original no era aprobable porque tenía ACs genéricos, no listaba endpoints, no definía mock/test behavior, no resolvía secretos por entorno, mezclaba IA condicional no aplicable y no dejaba claro qué parte correspondía a frontend, backend, QA o DevOps. La versión refinada queda lista para approval gate y posterior technical spec.

## 3. Hallazgos Principales

| Severidad | Hallazgo | Impacto | Recomendación |
| --------- | -------- | ------- | ------------- |
| Alta | Acceptance Criteria originales no especificaban captcha real. | QA no podía validar endpoints, token, provider, mock ni errores. | Reescribir ACs por endpoint, entorno, mock, provider failures y frontend token. |
| Alta | No estaba definido el mock de captcha para CI. | Tests podían depender de servicios externos y volverse no deterministas. | Aplicar decisión US-091: `CAPTCHA_PROVIDER=mock` + token `'__test__'`. |
| Alta | Scope de endpoints estaba incompleto. | Riesgo de omitir `password reset request`, flujo sensible documentado en ADR-SEC-004. | Incluir register, login y password/reset-request como scope formal. |
| Media | Provider naming varía entre documentos. | Puede generar confusión entre reCAPTCHA, hCaptcha y alternativas equivalentes. | Usar `recaptcha`/`hcaptcha` como proveedores primarios; cualquier equivalente requiere decisión técnica documentada. |
| Media | Seguridad estaba genérica. | Riesgo de secretos en frontend/logs o fallback inseguro a mock. | Agregar reglas de secretos, redacción, fail-fast y prohibición de mock fuera de Local/CI. |
| Baja | IA estaba descrita como condicional. | Ruido y scope confusion. | Marcar IA como `Not applicable`. |

## 4. Validación de Alcance MVP

| Check | Resultado | Comentario |
| ----- | --------- | ---------- |
| No introduce pagos reales | Pass | No aplica. |
| No introduce contratos firmados | Pass | No aplica. |
| No introduce WhatsApp/chat/push | Pass | No aplica. |
| Respeta human-in-the-loop IA | N/A | No invoca IA. |
| Respeta backend como source of truth | Pass | Backend verifica captcha server-side. |
| Respeta seed/demo si aplica | Pass | No requiere seed; define mock CI y proveedor real QA/Demo. |
| No introduce RAG/vector DB | Pass | No aplica. |
| No introduce multi-tenant enterprise | Pass | No aplica. |
| No introduce P4/Future scope | Pass | MFA/OAuth/SSO quedan fuera de scope. |

## 5. Revisión de Acceptance Criteria

| AC | Calidad | Problema detectado | Acción recomendada |
| -- | ------- | ------------------ | ------------------ |
| AC-01 original | Not Testable | "Capacidad operativa" no definía endpoint ni comportamiento. | Reemplazado por registro con captcha server-side antes de crear usuario. |
| AC-02 original | Needs Detail | Smoke multi-env sin contrato verificable. | Reemplazado por provider config, mock, frontend y negative tests. |
| AC-01 refinado | Clear | Define register con captcha válido antes de creación de usuario. | Aplicado. |
| AC-02 refinado | Clear | Define login con captcha antes de credential processing. | Aplicado. |
| AC-03 refinado | Clear | Define password reset request con captcha antes de generar token. | Aplicado. |
| AC-04 refinado | Clear | Define selección de proveedor y fail-fast de config. | Aplicado. |
| AC-05 refinado | Clear | Define mock determinista para CI. | Aplicado. |
| AC-06 refinado | Clear | Define action/score para proveedores reales. | Aplicado. |
| AC-07 refinado | Clear | Define error handling y observabilidad segura. | Aplicado. |
| AC-08 refinado | Clear | Define integración frontend sin secretos. | Aplicado. |

## 6. Gaps Detectados

### Producto / Negocio

Resuelto. Valor vinculado a reducción de abuso bot, estabilidad de auth y demo readiness.

### Backend / API

Resuelto. Se definieron endpoints, middleware, provider port/adapters, config fail-fast y errores.

### Frontend / UX

Resuelto. Se aclaró que el frontend obtiene/envía `captchaToken` con site key pública y maneja reintentos; no se rediseñan pantallas.

### Base de Datos

No aplica. No hay nuevas tablas ni persistencia de tokens captcha.

### Seguridad / Autorización

Resuelto. Se agregaron reglas de server-side verification, secretos, no logging, no fallback a mock y errores anti-enumeración.

### IA / PromptOps

No aplica.

### QA / Testing

Resuelto. Se agregaron tests unitarios de adapters, integration/Supertest con mock, negativos, seguridad, accesibilidad básica y smoke QA/Demo.

### Seed / Demo

Resuelto. No requiere seed; requiere config real en QA/Demo y mock en CI.

### Documentación / Trazabilidad

Resuelto con referencias a PB-P0-006, FR-AUTH, UC-AUTH, BR-AUTH, NFR, ADRs, Doc 19 y US-091 decision resolution.

## 7. Preguntas Pendientes

No pending blocking questions.

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| BR-AUTH-011 / FR-AUTH-002 vs ADR-SEC-004 / US-091 | Algunos documentos base mencionan captcha sólo en registro/login; ADR-SEC-004 y US-091 incluyen también `password reset request`. | Aplicar captcha a `register`, `login` y `password reset request`. | Alinear BR/FR en próxima revisión documental o registrar nota en technical spec. | No |
| Doc 14 / Doc 19 / PB-P0-006 | Los documentos usan nombres variables para provider (`recaptcha`, `hcaptcha`, `turnstile` o equivalente). | US-109 define proveedores primarios `recaptcha`/`hcaptcha` y adapter configurable; equivalentes requieren decisión técnica documentada. | Normalizar nombres de `CAPTCHA_PROVIDER` en docs técnicos. | No |

## 9. File Update Result

| Campo | Valor |
| ----- | ----- |
| User Story file updated | Yes |
| User Story file path | `management/user-stories/US-109-integrate-captcha-auth.md` |
| User Story ID verified | Yes |
| Decision Resolution artifact found | No |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-109-decision-resolution.md` |
| Refinement review artifact created/updated | Yes |
| Refinement review path | `management/user-stories/refinement-reviews/US-109-refinement-review.md` |
| Final recommended status | Ready for Approval |
| Next recommended skill | eventflow-user-story-approval |
| Reason | No quedan blockers; decisiones necesarias están cubiertas por PB-P0-006, ADR-SEC-004, Doc 19 y US-091 Decision Resolution. |

## 10. Cambios Aplicados o Recomendados

### Metadata

* Agregado `Backlog Item: PB-P0-006`.
* Ajustado módulo a `Security / Identity Access`.
* Actualizado `Status` a `Ready for Approval`.
* Actualizado `Last Updated` a `2026-06-15`.

### Business Context

* Expandido contexto de riesgo bot en register/login/password reset request.
* Separado scope de captcha frente a cookies, auth endpoints completos y rate limiting.

### PO/BA Decisions Applied

* Agregadas decisiones sobre endpoints protegidos, verificación server-side, mock determinista, provider real configurable, secretos, no persistencia y relación con rate limiting.

### Traceability

* Reemplazadas referencias genéricas por FR/UC/BR/NFR/ADR y endpoints concretos.

### Scope Guardrails

* Agregado out-of-scope para auth completo, cookies, rate limiting, captcha global, MFA/OAuth/SSO, IA y scope no MVP.

### Acceptance Criteria

* Reescritos ACs para register, login, password reset request, provider config, mock, action/score, provider failures y frontend token.

### Technical Notes

* Detallada arquitectura de `CaptchaVerifier`, adapters, middleware, config, frontend env vars y observability.

### QA Notes

* Agregados tests funcionales, negativos, authorization, accessibility y demo/CI.

### Definition of Ready

* Agregada checklist de readiness.

### Definition of Done

* Agregado DoD específico de captcha, config, logs y pruebas.

### Notes

* Dos notas de `Documentation Alignment Required` no bloqueantes.

## 11. Recomendación Final

`Ready for Approval`.

US-109 está lista para approval gate. La historia es clara, testeable, trazable, MVP-safe y no requiere decisiones pendientes de PO, Tech Lead, QA ni Seguridad. Las diferencias documentales detectadas son de alineación, no bloquean aprobación porque la decisión vigente está formalizada por ADR-SEC-004 y US-091.
