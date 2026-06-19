# PO/BA Decision Resolution — US-109

## Source User Story File

`management/user-stories/US-109-integrate-captcha-auth.md`

## Source Refinement Review File

`management/user-stories/refinement-reviews/US-109-refinement-review.md`

## Decision Date

2026-06-15

## 1. Resumen Ejecutivo

| Campo | Valor |
| ----- | ----- |
| User Story ID | US-109 |
| User Story file path | `management/user-stories/US-109-integrate-captcha-auth.md` |
| Refinement review artifact path | `management/user-stories/refinement-reviews/US-109-refinement-review.md` |
| Existing decision resolution found | No |
| Backlog Item | PB-P0-006 — Security Cookies HTTP-Only + Captcha |
| Epic | EPIC-SEC-001 — Security & Authorization |
| Estado antes de decisiones | Ready for Approval |
| Cantidad de preguntas revisadas | 0 bloqueantes · 2 `Documentation Alignment Required` |
| Decisiones PO/BA tomadas | 2 |
| Decisiones técnicas recomendadas | 0 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-109-decision-resolution.md` |
| Próximo paso recomendado | Run `eventflow-user-story-approval` |

US-109 no tenía preguntas bloqueantes pendientes. El refinement review identificó dos diferencias documentales no bloqueantes: algunos documentos base mencionan captcha sólo en registro/login, mientras ADR-SEC-004 y US-091 incluyen también `password reset request`; y los documentos usan nombres variables para provider (`recaptcha`, `hcaptcha`, `turnstile` o equivalente).

Este artefacto formaliza las decisiones vigentes para que futuros ciclos no reabran la discusión. La User Story permanece en `Ready for Approval` y sólo se agregó una fila breve en `PO/BA Decisions Applied` para referenciar esta resolución.

---

## 2. Decisiones Respondidas

## Decisión 1 — Alcance de endpoints protegidos por captcha

### Pregunta original

> Algunos documentos base mencionan captcha sólo en registro/login, pero ADR-SEC-004 y US-091 incluyen también `password reset request`. ¿A qué endpoints aplica US-109?

### Respuesta PO/BA

US-109 debe aplicar captcha exclusivamente a los tres endpoints sensibles de autenticación:

1. `POST /api/v1/auth/register`
2. `POST /api/v1/auth/login`
3. `POST /api/v1/auth/password/reset-request`

No debe aplicarse captcha a todos los endpoints públicos del MVP ni al endpoint de confirmación `password reset`.

### Decisión formal

```text
Captcha es obligatorio sólo en POST /api/v1/auth/register, POST /api/v1/auth/login y POST /api/v1/auth/password/reset-request. La inclusión de password reset request queda gobernada por ADR-SEC-004 y US-091 Decision Resolution; los documentos que sólo mencionan register/login requieren alineación documental.
```

### Rationale

`password reset request` es un flujo público sensible: puede usarse para abuso de email, enumeración indirecta y carga automatizada. ADR-SEC-004 ya elevó captcha + rate limiting a control obligatorio para flujos sensibles de auth, y US-091 formalizó el alcance del middleware. Mantener el scope en estos tres endpoints protege el MVP sin introducir fricción innecesaria en el resto del producto.

### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Formalizada la alineación documental mediante fila `Alineación documental`. |
| Business Context | Ya indicaba `register`, `login` y `password reset request`; sin cambio adicional. |
| Assumptions | Ya referenciaba US-091 y el alcance de captcha; sin cambio adicional. |
| Traceability | Ya listaba los tres endpoints; sin cambio adicional. |
| Scope Guardrails | Ya excluía aplicar captcha a todos los endpoints públicos; sin cambio adicional. |
| Acceptance Criteria | AC-01, AC-02 y AC-03 ya cubren los tres endpoints; sin cambio adicional. |
| Technical Notes | Ya aplica middleware sólo a endpoints auth sensibles; sin cambio adicional. |
| QA Notes | Ya incluye tests para los tres endpoints; sin cambio adicional. |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Nombres de provider y contrato de configuración

### Pregunta original

> Los documentos usan nombres variables para provider (`recaptcha`, `hcaptcha`, `turnstile` o equivalente). ¿Qué providers debe declarar US-109 como contrato MVP?

### Respuesta PO/BA

US-109 debe declarar como contrato MVP:

* `CAPTCHA_PROVIDER=mock` para Local/CI.
* `CAPTCHA_PROVIDER=recaptcha` para reCAPTCHA v3.
* `CAPTCHA_PROVIDER=hcaptcha` para hCaptcha.

`turnstile` o cualquier equivalente no queda bloqueado por producto, pero no forma parte del contrato primario de esta US salvo decisión técnica documentada en technical spec o ADR si se reemplaza el proveedor principal.

### Decisión formal

```text
El contrato MVP de US-109 usa CAPTCHA_PROVIDER=mock|recaptcha|hcaptcha. reCAPTCHA v3 y hCaptcha son los providers reales primarios; Turnstile/equivalentes sólo pueden usarse si el Tech Lead lo documenta como decisión técnica compatible sin cambiar ACs ni alcance MVP.
```

### Rationale

PB-P0-006, FRD y Doc 19 documentan reCAPTCHA v3 / hCaptcha como opciones primarias. La arquitectura usa un adapter/port (`CaptchaVerifier`), por lo que la elección operativa no debe cambiar el comportamiento esperado por QA ni el contrato del middleware. Mantener `mock|recaptcha|hcaptcha` evita ambigüedad en ACs, configuración y tests.

### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Formalizada la alineación documental mediante fila `Alineación documental`. |
| Related Domain Concepts | Ya define `CaptchaProvider` como `mock`, `recaptcha` o `hcaptcha`; sin cambio adicional. |
| Assumptions | Ya indica proveedor real `recaptcha` o `hcaptcha`; sin cambio adicional. |
| Acceptance Criteria | AC-04 ya exige `mock`, `recaptcha` y `hcaptcha`; sin cambio adicional. |
| Validation Rules | VR-03 ya fija providers permitidos; sin cambio adicional. |
| Technical Notes | Ya define adapters `MockCaptchaProvider`, `RecaptchaProvider`, `HcaptchaProvider`; sin cambio adicional. |
| QA Notes | Ya cubre mock CI y provider real QA/Demo; sin cambio adicional. |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

| # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | ---- | -------- | ---- | ---------------------- | -------------------- |
| 1 | Endpoints captcha | Captcha sólo en `POST /api/v1/auth/register`, `POST /api/v1/auth/login` y `POST /api/v1/auth/password/reset-request`. | PO / BA | No | No requiere |
| 2 | Provider contract | `CAPTCHA_PROVIDER=mock|recaptcha|hcaptcha`; equivalentes requieren documentación técnica compatible. | PO / BA | No | No requiere |

---

## 4. Cambios Aplicados a la User Story

### Metadata

Sin cambios. La historia ya estaba en `Ready for Approval` y `Last Updated` permanece en `2026-06-15`.

### Business Context

Sin cambios. Ya reflejaba el alcance y separación frente a cookies, endpoints auth completos y rate limiting.

### PO/BA Decisions Applied

Se agregó una fila:

```text
Alineación documental — Las diferencias documentales sobre alcance register/login vs register/login/password reset request y nombres de provider quedan resueltas por ADR-SEC-004, US-091 y Doc 19; no bloquean approval.
```

### Assumptions

Sin cambios. Ya incluía `CAPTCHA_PROVIDER=mock`, token `'__test__'` y provider real fuera de CI.

### Scope Guardrails

Sin cambios. Ya excluía captcha global, auth completo, cookies, rate limiting y scope no MVP.

### Acceptance Criteria

Sin cambios. AC-01 a AC-08 ya eran consistentes con las decisiones formalizadas.

### Technical Notes

Sin cambios. Ya definía `CaptchaVerifier`, adapters y configuración.

### QA Notes

Sin cambios. Ya cubría tests funcionales, negativos, authorization, accessibility y demo/CI.

### Definition of Ready

Sin cambios.

### Definition of Done

Sin cambios.

### Notes

Sin cambios adicionales; el detalle completo vive en este Decision Resolution artifact.

---

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| BR-AUTH-011 / FR-AUTH-002 vs ADR-SEC-004 / US-091 | Algunos documentos base mencionan captcha sólo en registro/login; ADR-SEC-004 y US-091 incluyen también `password reset request`. | Aplicar captcha a `register`, `login` y `password reset request`. | Alinear BR/FR en próxima revisión documental o registrar la decisión en technical spec. | No |
| Doc 14 / Doc 19 / PB-P0-006 | Los documentos usan nombres variables para provider (`recaptcha`, `hcaptcha`, `turnstile` o equivalente). | US-109 define contrato MVP `CAPTCHA_PROVIDER=mock|recaptcha|hcaptcha`; equivalentes requieren decisión técnica documentada. | Normalizar nombres de `CAPTCHA_PROVIDER` en docs técnicos o documentar override en technical spec. | No |

---

## 6. File Update Result

| Campo | Valor |
| ----- | ----- |
| User Story file updated | Yes |
| User Story file path | `management/user-stories/US-109-integrate-captcha-auth.md` |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-109-decision-resolution.md` |
| New User Story status | Ready for Approval |
| Remaining blockers | No |
| Reason | Las diferencias documentales fueron formalizadas como alineación no bloqueante y la US ya contenía ACs, reglas y tests consistentes. |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

US-109 está lista para el approval gate. No hay blockers PO, BA, QA, Security ni Tech Lead. Las decisiones formalizadas no introducen scope creep, no contradicen ADRs aceptados y preservan backend como source of truth para seguridad de auth.

---

## 8. Próximo Paso Recomendado

1. Revisar la User Story actualizada.
2. Ejecutar `eventflow-user-story-refinement` sólo si se desea una segunda validación.
3. Ejecutar `eventflow-user-story-approval` para el formal approval gate.
