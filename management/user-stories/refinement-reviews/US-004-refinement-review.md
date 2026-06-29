# User Story Refinement Review — US-004

## Source User Story File

management/user-stories/US-004-recover-password.md

## Decision Resolution Artifact

management/user-stories/decision-resolutions/US-004-decision-resolution.md

## Review Date

2026-06-25

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| User Story ID                              | US-004                                                                  |
| File Path                                  | management/user-stories/US-004-recover-password.md                      |
| Backlog Item                               | PB-P1-004 — Recuperación de contraseña                                  |
| Epic                                       | EPIC-AUTH-001 — Authentication & User Access                            |
| Estado actual                              | Draft                                                                   |
| Estado recomendado                         | Needs Refinement                                                        |
| Nivel de riesgo                            | Medio                                                                   |
| Calidad general                            | Media                                                                   |
| Requiere decisión PO                       | Sí                                                                      |
| Requiere decisión técnica                  | No                                                                      |
| Requiere decisión QA                       | No                                                                      |
| Requiere decisión Seguridad                | No                                                                      |
| Decision Resolution artifact found         | No                                                                      |
| User Story file updated                    | No                                                                      |
| Refinement review artifact created/updated | Yes                                                                     |
| Refinement review path                     | management/user-stories/refinement-reviews/US-004-refinement-review.md  |

---

## 2. Diagnóstico PO/BA

US-004 cubre un flujo Must Have del MVP (recuperación autoservida vía email simulado). El alcance respeta MVP (sin SMS, sin preguntas de seguridad, sin 2FA). Problemas:

1. Trazabilidad incorrecta a FR/BR no relacionados con recovery.
2. Paths del endpoint divergen de Doc 16 (`/auth/password/forgot` vs canónico `/auth/password/reset-request`).
3. Status codes y catálogo de errores no alineados al error envelope (Doc 16 §22).
4. TTL del token: la US sugiere "30 min". El Backlog PB-P1-004 lo formaliza como 30 min (Decisión PO US-004). Doc 19 §11 documenta 15 min — conflicto Documentation Alignment, no bloqueante.
5. VR-05 ("nueva contraseña ≠ anterior") es una asunción técnica no formalizada en Doc 19 §11.2; requiere decisión PO.
6. Invalidación de sesiones tras reset queda como TODO en Notes; requiere decisión PO.
7. Status `200` vs `202` en `/reset-request`: conflicto interno entre Doc 19 SEC-POL-AUTH-005 (`200`) y Doc 16 §22.3 (`202`); requiere decisión PO.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                  | Impacto                                                                                                                | Recomendación                                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad incorrecta: `FR-AUTH-007` (rol único) y `FR-AUTH-008` (acceso por rol) no aplican a recovery. `BR-AUTH-007` (permisos vendor) y `BR-AUTH-008` (permisos admin) tampoco aplican.              | Trazabilidad inválida.                                                                                                | Reemplazar por `FR-AUTH-006`, `BR-AUTH-004`, `BR-AUTH-011`, `BR-PRIVACY-008`, `BR-PRIVACY-009`. Mantener `UC-AUTH-004`.                                                                              |
| Alta      | Status code en `/reset-request`: Doc 19 SEC-POL-AUTH-005 dice `200`; Doc 16 §22.3 dice `202`. La US dice `200`. Conflicto interno entre fuentes.                                                          | No se puede cerrar AC sin decisión PO.                                                                                | Decisión PO US-004 #1: `202 Accepted` (alineado a Doc 16, semántica correcta para "encolada") o `200 OK` (alineado a SEC-POL-AUTH-005). Recomendación: `202`.                                       |
| Alta      | VR-05 ("nueva contraseña ≠ anterior") introduce regla no formalizada en Doc 19 §11.2 (política MVP: ≥10 chars, letra+número, ≠ localpart). Asunción técnica.                                              | Scope creep aparente; afecta AC y tests.                                                                              | Decisión PO US-004 #2: ¿Incluir VR-05 en MVP o eliminarla y usar únicamente la política Doc 19 §11.2?                                                                                                |
| Alta      | Invalidación de sesiones tras reset: TODO en Notes; el backlog dice "Cambio de password invalida otras sesiones (US-006)" — se aplica a cambio (US-006), no claramente a reset (US-004).                  | Sin decisión, comportamiento ambiguo.                                                                                  | Decisión PO US-004 #3: ¿Tras reset exitoso, US-004 invalida otras sesiones activas del mismo usuario? En el modelo MVP (sin tabla `sessions`, rotación de cookie según US-005) → No es factible global; recomendación: No invalidar otras sesiones en MVP. |
| Media     | Paths del endpoint: la US usa `/auth/password/forgot`; Doc 16 §22.3 y Doc 19 §6 documentan `/auth/password/reset-request` y `/auth/password/reset`.                                                       | Documentation Alignment Required (no bloquea si se renombra a los paths canónicos).                                    | Renombrar a `/auth/password/reset-request` y `/auth/password/reset`.                                                                                                                                 |
| Media     | TTL token: backlog formaliza 30 min (Decisión PO US-004). Doc 19 §11 y SEC-POL-AUTH-006 dicen 15 min.                                                                                                     | Conflicto Documentation Alignment, no bloquea por precedencia del backlog.                                            | Mantener 30 min (precedencia backlog) y registrar Documentation Alignment Required sobre Doc 19 §11.                                                                                                |
| Media     | Catálogo de errores: la US usa `400 TOKEN_EXPIRED/USED/INVALID`. Doc 16 §22.3 documenta `410 Gone` para token expirado; `400` para validación; `401` para credenciales; `422` semántico.                  | Inconsistencia con error envelope.                                                                                    | Alinear: `410 GONE_TOKEN_EXPIRED`/`410 GONE`, `400 INVALID_TOKEN`/`400 USED_TOKEN`, `422 VALIDATION_ERROR` para política de contraseña, `429 RATE_LIMIT_EXCEEDED`.                                    |
| Media     | Dependencias `EPIC-DB-001` / `EPIC-SEC-001` / `EPIC-NOT-001` no existen como Epics formales.                                                                                                              | Trazabilidad imprecisa.                                                                                                | Reemplazar por `PB-P0-001` (schema `users`/`password_reset_tokens`), `PB-P0-006` (captcha + cookie), `PB-P0-007` (rate limit + middleware) y `PB-P1-003` (login predecesor).                          |
| Media     | `MockEmailService` mencionado sin localización canónica.                                                                                                                                                  | Riesgo de duplicación.                                                                                                | Documentar como puerto `EmailSender` con adapter `MockEmailSender` (log estructurado) en `modules/notifications`; selección de adapter por entorno.                                                  |
| Baja      | `SEC-05` rate limiting menciona "por IP y email" sin valores; Doc 19 §6 fija `3/email/h` en `/reset-request` y `5/IP/10min` en `/reset`.                                                                  | Resoluble por alignment.                                                                                              | Adoptar los valores canónicos.                                                                                                                                                                       |
| Baja      | `Note Authorization`: "Usuario autenticado invoca /forgot → permitido pero con logueo" no requiere AC, pero documentar.                                                                                  | Bajo.                                                                                                                  | Mantener como nota.                                                                                                                                                                                 |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                          |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      |                                                                                                     |
| No introduce contratos firmados      | Pass      |                                                                                                     |
| No introduce WhatsApp/chat/push      | Pass      | SMS/WhatsApp explícitamente Out of Scope.                                                            |
| Respeta human-in-the-loop IA         | N/A       | No invoca IA.                                                                                       |
| Respeta backend como source of truth | Pass      | Hash del token y validación viven en backend.                                                       |
| Respeta seed/demo si aplica          | Pass      | Reutiliza seeds existentes.                                                                         |
| No introduce RAG/vector DB           | Pass      |                                                                                                     |
| No introduce multi-tenant enterprise | Pass      |                                                                                                     |
| No introduce P4/Future scope         | Pass      | 2FA / biometría / preguntas de seguridad fuera de alcance.                                          |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad             | Problema detectado                                                                                              | Acción recomendada                                                                                                                                                                                                                                                                                  |
| ----- | ------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail        | Status code (`200` vs `202`), atributos de token y `correlationId` no explícitos.                              | Reescribir post decisión #1: `POST /api/v1/auth/password/reset-request` con `ForgotPasswordRequestDto { email, captchaToken }`, captcha verificado, token random ≥32 bytes, hash persistido con TTL `30 min` y respuesta `<status>` neutra siempre.                                                  |
| AC-02 | Needs Detail        | No cita política de contraseña ni el path canónico.                                                              | Reescribir: `POST /api/v1/auth/password/reset` con `ResetPasswordRequestDto { token, newPassword }`. Validar política Doc 19 §11.2. Hashear con `argon2id`. Marcar `consumed_at=now()`. Responder `204 No Content`. Redirección frontend a `/auth/login`.                                              |
| AC-03 | Clear               | OK conceptualmente.                                                                                              | Mantener; alinear al status code definitivo de #1.                                                                                                                                                                                                                                                  |
| EC-01 | Out of Scope as written | Status `400` vs `410` ambiguo.                                                                                  | `410 GONE` con `errorCode=TOKEN_EXPIRED`.                                                                                                                                                                                                                                                            |
| EC-02 | Needs Detail        | Status `400` ok; ampliar logging.                                                                                | `400 TOKEN_USED` con log `correlationId`.                                                                                                                                                                                                                                                            |
| EC-03 | Needs Detail        | Token alterado tratado como `400 TOKEN_INVALID`.                                                                | `400 TOKEN_INVALID`; el rate limit `5/IP/10min` del endpoint cubre el "agresivo".                                                                                                                                                                                                                  |

---

## 6. Gaps Detectados

### Producto / Negocio

- Falta `PO/BA Decisions Applied` con: status code de `/reset-request`, VR-05, invalidación de sesiones, TTL formalizado, paths canónicos, política de contraseñas.

### Backend / API

- DTOs no nombrados (`ForgotPasswordRequestDto`, `ResetPasswordRequestDto`).
- Falta referencia explícita a `MockEmailSender` y `EmailSender` puerto.
- Falta declarar transacción en `/reset` (cambiar password + marcar `consumed_at`).

### Frontend / UX

- Falta interceptar `410` como caso específico (link expirado) con CTA "Solicitar nuevo enlace".
- Falta declarar i18n del email simulado.

### Base de Datos

- Tabla `password_reset_tokens` no existe en P0; el backlog dice depende de PB-P1-003. Confirmar si la migración entra como parte de US-004 o si ya está prevista en PB-P0-001.

### Seguridad / Autorización

- Falta explicitar SEC-POL-AUTH-005 (respuesta uniforme) y SEC-POL-AUTH-006 (token uso único).
- Falta declarar redacción de logs del token.

### IA / PromptOps

- No aplica.

### QA / Testing

- Faltan tests específicos de SEC-POL-AUTH-005 (idempotencia de respuesta).
- Falta test de política de contraseñas en reset.
- Falta test de redacción de logs.

### Seed / Demo

- Asegurar que existe al menos un usuario seed con email conocido para demo del flujo.

### Documentación / Trazabilidad

- Corregir `FR-AUTH-007/008` → `FR-AUTH-006`.
- Corregir `BR-AUTH-007/008` → `BR-AUTH-004`, `BR-AUTH-011`, `BR-PRIVACY-008`, `BR-PRIVACY-009`.
- Reemplazar Epics inexistentes por dependencias `PB-P0-001`, `PB-P0-006`, `PB-P0-007`, `PB-P1-003`.

---

## 7. Preguntas Pendientes

| Tipo | Pregunta                                                                                                                                                                  | Bloquea aprobación | Responsable    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------- |
| PO   | Status code de `/auth/password/reset-request`: ¿`202 Accepted` (alineado a Doc 16) o `200 OK` (alineado a Doc 19 SEC-POL-AUTH-005)?                                        | Sí                 | Product Owner  |
| PO   | ¿VR-05 ("nueva contraseña ≠ anterior") es parte del MVP o se elimina y se usa solo la política Doc 19 §11.2?                                                                | Sí                 | Product Owner  |
| PO   | ¿Tras un reset exitoso (US-004), se invalidan las sesiones activas del usuario en otros dispositivos? Considerar que la estrategia MVP es rotación de cookie (US-005, sin tabla `sessions`). | Sí                 | Product Owner  |
| PO   | ¿Confirmas que el TTL del token es `30 min` (Decisión PO US-004 ya documentada en PB-P1-004), aceptando override formal sobre Doc 19 §11 (15 min)?                          | No                 | Product Owner  |

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado                                                                                                | Decisión vigente                                          | Acción recomendada                                                          | ¿Bloquea aprobación? |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------- |
| Doc 19 §11 y SEC-POL-AUTH-006 | Doc 19 fija TTL en `15 min`. Backlog PB-P1-004 fija `30 min` como Decisión PO US-004.                              | 30 min (precedencia backlog).                             | Actualizar Doc 19 §11 con override formal a 30 min para US-004.             | No                   |
| Doc 16 §22.3 vs Doc 19 SEC-POL-AUTH-005 | Doc 16 dice `202`; Doc 19 dice `200`.                                                                              | Pendiente decisión PO #1.                                | Resolver decisión y alinear el documento perdedor.                          | Sí (vía decisión)    |
| Doc 16 §22.3       | Catálogo `400/401/410/422` no completamente reflejado en VR/EC de la US.                                            | Doc 16 (canónico).                                       | Alinear EC-01 → `410`, otros → `400`/`422`.                                   | No                   |
| US-paths (forgot)  | `/auth/password/forgot` vs canónicos `/auth/password/reset-request` y `/auth/password/reset`.                       | Doc 16/19 (canónico).                                    | Renombrar en la US.                                                          | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                     |
| User Story file path                       | `management/user-stories/US-004-recover-password.md`                                    |
| User Story ID verified                     | Yes                                                                                    |
| Decision Resolution artifact found         | No                                                                                     |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-004-decision-resolution.md`            |
| Refinement review artifact created/updated | Yes                                                                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-004-refinement-review.md`                |
| Final recommended status                   | Needs Refinement                                                                       |
| Next recommended skill                     | eventflow-po-ba-decision-resolver                                                      |
| Reason                                     | 3 decisiones PO bloqueantes + 1 confirmación + correcciones de trazabilidad y alignment. |

---

## 10. Cambios Aplicados o Recomendados

La User Story file no fue actualizada. Cambios a aplicar tras resolución:

### Metadata

- `Status` → `Ready for Approval`.
- `Last Updated` → `2026-06-25`.
- Agregar `Backlog Item: PB-P1-004`.

### Business Context

- Reescribir `Context Summary` con paths canónicos, TTL formalizado, captcha y `MockEmailSender`.
- Reemplazar dependencias `EPIC-*` por `PB-P0-001`, `PB-P0-006`, `PB-P0-007`, `PB-P1-003`.

### PO/BA Decisions Applied

- Crear sección con las decisiones formalizadas (status code, VR-05, invalidación, TTL 30 min, paths canónicos, política contraseñas, `MockEmailSender`).

### Traceability

- `FRD Requirement(s)`: `FR-AUTH-006`.
- `Use Case(s)`: `UC-AUTH-004`.
- `Business Rule(s)`: `BR-AUTH-004`, `BR-AUTH-011`, `BR-PRIVACY-008`, `BR-PRIVACY-009`.
- `Permission Rule(s)`: mantener (anónimo + dueño del token).
- `API Endpoint(s)`: `POST /api/v1/auth/password/reset-request`, `POST /api/v1/auth/password/reset`.
- Related Document(s): `/docs/8 UC-AUTH-004`, `/docs/16 §22.3`, `/docs/19 §6, §11, §SEC-POL-AUTH-005/006`.

### Scope Guardrails

- Sin cambios estructurales. Reafirmar Out of Scope (SMS, 2FA, preguntas, etc.).

### Acceptance Criteria

- Reescribir AC-01, AC-02, AC-03 según decisiones.
- Convertir EC-01 a `410 GONE_TOKEN_EXPIRED`.
- Mantener EC-02 (`400 TOKEN_USED`) y EC-03 (`400 TOKEN_INVALID`).
- Agregar AC para `429 RATE_LIMIT_EXCEEDED`.
- Agregar AC para política de contraseña (`422 VALIDATION_ERROR`).

### Validation Rules

- Confirmar VR-05 según decisión #2.

### Authorization & Security Rules

- Añadir SEC-POL-AUTH-005 (respuesta uniforme) y SEC-POL-AUTH-006 (token uso único, TTL 30 min) explícitos.
- Citar redacción de logs (sin token plano).

### Technical Notes

- Backend: nombrar DTOs (`ForgotPasswordRequestDto`, `ResetPasswordRequestDto`), `argon2id`, transacción en `/reset`, puerto `EmailSender` + adapter `MockEmailSender`.
- Frontend: páginas `/auth/forgot-password` y `/auth/reset-password` con mensajes neutros, `410` con CTA.

### QA Notes

- Añadir tests SEC-POL-AUTH-005 idempotencia, política contraseña, redacción de logs, `410` con `Retry-After`.

### Definition of Ready

- Marcar `PO/BA validó` post-resolución.

### Definition of Done

- Actualizar con paths canónicos, `429`, `410`, política de contraseñas y captcha verificado.

### Notes

- Eliminar TODOs ya resueltos (TTL, invalidación de sesiones).

---

## 11. Recomendación Final

`Needs Refinement`.

La historia es valiosa pero requiere tres decisiones PO formales antes de aprobarse. Próxima skill recomendada: `eventflow-po-ba-decision-resolver`.
