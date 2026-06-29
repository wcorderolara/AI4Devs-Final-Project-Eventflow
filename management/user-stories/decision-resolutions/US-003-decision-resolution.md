# PO/BA Decision Resolution — US-003

## Source User Story File

management/user-stories/US-003-login-email-password.md

## Source Refinement Review File

management/user-stories/refinement-reviews/US-003-refinement-review.md

## Decision Date

2026-06-25

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| User Story ID                                | US-003                                                                                 |
| User Story file path                         | management/user-stories/US-003-login-email-password.md                                  |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-003-refinement-review.md                  |
| Existing decision resolution found           | No                                                                                     |
| Backlog Item                                 | PB-P1-003 — Login con email/password + logout                                          |
| Epic                                         | EPIC-AUTH-001 — Authentication & User Access                                           |
| Estado antes de decisiones                   | Needs Refinement                                                                       |
| Cantidad de preguntas revisadas              | 5                                                                                      |
| Decisiones PO/BA tomadas                     | 5                                                                                      |
| Decisiones técnicas recomendadas             | 0 (todas tienen base documental directa)                                               |
| ¿Desbloquea aprobación?                      | Sí                                                                                     |
| User Story file updated                      | Yes                                                                                    |
| Decision Resolution artifact created/updated | Yes                                                                                    |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-003-decision-resolution.md              |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                    |

---

## 2. Decisiones Respondidas

## Decisión 1 — Política de captcha en login: siempre vs condicional

### Pregunta original

> ¿Captcha en login es siempre obligatorio (consistente con UC-AUTH-002 y BR-AUTH-011) o condicional tras N intentos fallidos (consistente con PB-P1-003 y borrador US-003)?

### Respuesta PO/BA

Captcha condicional tras N intentos fallidos consecutivos por IP+email candidato.

### Decisión formal

```text
El captcha en /auth/login es CONDICIONAL: no se exige en los primeros intentos. Se activa a partir del intento N consecutivo fallido por la combinación IP + email candidato dentro de la ventana de 10 minutos. Antes de superar el umbral, el endpoint ignora `captchaToken`.
```

### Rationale

- PB-P1-003 (Backlog Prioritized, fuente de precedencia #4) define explícitamente "Captcha condicional tras N intentos fallidos. … Captcha aparece tras N intentos."
- BR-AUTH-011 obliga a que los formularios "incluyan captcha y mecanismos anti-bot"; la activación condicional cumple esa obligación cuando combinada con rate limit canónico.
- UC-AUTH-002 (Doc 8, precedencia #6) describe captcha en step 1 como patrón general; la decisión PO en backlog tiene mayor precedencia y queda registrada como Documentation Alignment Required sobre Doc 8 sin necesidad de ADR.
- Reduce fricción en logins legítimos del demo académico y mantiene defensa anti-bot mediante captcha + rate limit cuando aparecen patrones abusivos.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Business Context        | Reemplazar "captcha tras intentos fallidos" por "captcha condicional con N formalizado".                  |
| PO/BA Decisions Applied | Añadir decisión formal.                                                                                   |
| Scope Guardrails        | Aclarar comportamiento condicional.                                                                       |
| Acceptance Criteria     | AC-01 explicita "sin captcha cuando intento ≤ 2"; EC-02 reescrito.                                        |
| Authorization & Security Rules | SEC-04 redactado como "captcha condicional".                                                       |
| Technical Notes         | Backend: contador IP+email, activación condicional.                                                       |
| Test Scenarios          | TS-05/TS-06 nuevos; NT-03/NT-04 nuevos.                                                                   |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Valor de N (umbral de captcha)

### Pregunta original

> Si captcha es condicional, ¿cuál es el valor de N (umbral de intentos fallidos consecutivos) por IP y por email candidato que activa el captcha?

### Respuesta PO/BA

`N = 3` intentos fallidos consecutivos por combinación IP+email candidato dentro de la ventana de 10 minutos. Reset del contador en login exitoso o al expirar la ventana.

### Decisión formal

```text
N = 3 intentos fallidos consecutivos por (IP + email candidato) dentro de una ventana deslizante de 10 minutos. El contador se reinicia al login exitoso o cuando la ventana expira.
```

### Rationale

- Coincide con el borrador del autor de la US (EC-02 mencionaba 3 intentos) sin introducir requisitos nuevos.
- 3 es un umbral común que protege sin penalizar errores tipográficos normales.
- Combinar IP+email reduce falsos positivos cuando varios usuarios comparten una IP (corporativa, NAT).
- La ventana de 10 minutos alinea con la ventana del rate limit canónico (10/IP/10 min), facilitando la implementación con la misma infraestructura.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Registrar `N=3` y ventana de 10 min.                                                                      |
| Acceptance Criteria     | EC-02 referencia `N=3`.                                                                                   |
| Authorization & Security Rules | SEC-04 cita "tras N=3 fallos".                                                                       |
| Technical Notes         | Backend: ventana 10 min; tabla opcional `auth_attempts`.                                                   |
| Notes                   | Eliminar el TODO "Confirmar valor de N".                                                                  |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Cooldown temporal

### Pregunta original

> ¿Cuál es la duración del cooldown temporal tras superar un umbral mayor, y bajo qué disparador? ¿O delegamos al rate limit canónico (10 intentos/IP/10 min → 429) de Doc 16 §22.6 y Doc 19 §6 sin cooldown adicional?

### Respuesta PO/BA

Delegar al rate limit canónico, sin introducir cooldown adicional en MVP.

### Decisión formal

```text
No se introduce cooldown adicional. Se delega al rate limit canónico `/auth/login`: 10 intentos / IP / 10 minutos → 429 RATE_LIMIT_EXCEEDED (Doc 19 §6, Doc 16 §22.6). Captcha condicional (N=3) opera como capa previa de defensa anti-bot.
```

### Rationale

- Doc 19 §6 y Doc 16 §22.6 ya fijan el rate limit canónico. Introducir un cooldown propietario solo dispersaría la lógica de seguridad.
- Defensa en capas suficiente para MVP académico: captcha condicional (N=3) + rate limit (10/IP/10 min) + mensajes genéricos + tiempo constante.
- No requiere persistencia adicional ni configuración nueva.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| PO/BA Decisions Applied | Registrar la decisión.                                                                                    |
| Scope Guardrails        | Reemplazar "cooldown temporal" por referencia al rate limit canónico.                                     |
| Acceptance Criteria     | Añadir AC-05 (429 con `Retry-After`).                                                                     |
| Authorization & Security Rules | SEC-03 cita `10/IP/10min → 429 RATE_LIMIT_EXCEEDED`.                                                  |
| Technical Notes         | Backend: middleware canónico.                                                                             |
| Notes                   | Eliminar TODO "Confirmar cooldown".                                                                       |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — EC-03 cuenta `suspended`

### Pregunta original

> ¿EC-03 (cuenta `suspended` intentando login) entra en MVP con respuesta `401`/`403` genérica, o queda Out of Scope MVP y se mueve fuera de los Edge Cases?

### Respuesta PO/BA

Out of Scope MVP. Se mueve a la sección "Explicitly Out of Scope". El backend mantiene la respuesta neutra `401 AUTHENTICATION_REQUIRED` ante cualquier credencial no operativa, lo cual cubre implícitamente el caso `suspended` sin requerir lógica diferenciada.

### Decisión formal

```text
EC-03 sale del alcance MVP. No hay US administrativa para suspender usuarios en MVP (BR-AUTH-008 no incluye suspensión), por lo que el caso es inalcanzable en operación normal. El backend responde 401 AUTHENTICATION_REQUIRED genérico ante cualquier `status` no activo, sin distinguir motivo.
```

### Rationale

- BR-AUTH-008 (permisos del admin) no incluye flujo de suspensión de usuarios en MVP.
- `AuthUserResponseDto.status` admite `suspended` pero ninguna US del MVP lo provoca.
- Implementar el AC añadiría complejidad sin valor demostrable.
- La respuesta genérica `401` ya cubre el caso si el seed lo produjera, sin filtrar el motivo.

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Scope Guardrails        | Mover EC-03 a "Explicitly Out of Scope" con explicación.                                                  |
| Edge Cases              | Eliminar EC-03; EC-01 cubre el caso genérico con `401 AUTHENTICATION_REQUIRED`.                           |
| Acceptance Criteria     | Ningún AC adicional.                                                                                      |
| PO/BA Decisions Applied | Registrar la decisión.                                                                                    |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Confirmación lifetime cookie 30 días

### Pregunta original

> ¿Confirmas formalmente que la cookie de sesión `Max-Age=30d` (Backlog PB-P1-003) prevalece sobre el "24h" recomendado en Doc 19 §10, y autorizas el override (sin necesidad de ADR) por ser una decisión PO ya documentada en el Product Backlog?

### Respuesta PO/BA

Sí. La cookie de sesión usa `Max-Age = 30 días`. La discrepancia con Doc 19 §10 queda como Documentation Alignment Required, sin necesidad de ADR adicional porque la decisión está formalizada en el backlog.

### Decisión formal

```text
La cookie de sesión usa `Max-Age = 30 días` desde la emisión. La recomendación 24h de Doc 19 §10 queda formalmente overridden por la decisión PO US-003 en PB-P1-003. Documentation Alignment Required sobre Doc 19 §10 sin ADR adicional.
```

### Rationale

- PB-P1-003 cita explícitamente "Lifetime cookie sesión: 30 días (Decisión PO US-003)".
- La decisión PO en backlog tiene precedencia #4, superior a las recomendaciones de Doc 19 §10 (#6).
- Mejor UX para usuarios recurrentes en el MVP académico sin comprometer seguridad (cookie `HttpOnly` + `Secure` + `SameSite=Lax` + rotación opcional en logout).

### Impacto en la User Story

| Sección                 | Cambio requerido                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Business Context        | Mencionar lifetime 30d como decisión aplicada.                                                            |
| PO/BA Decisions Applied | Registrar el override + Documentation Alignment Required (no bloquea).                                    |
| Acceptance Criteria     | AC-03 cuantifica 30 días; AC-01 incluye atributos completos de cookie.                                    |
| Authorization & Security Rules | SEC-05 explicita `Max-Age=30d`.                                                                      |
| Technical Notes         | Backend: cookies con `Max-Age=30d`.                                                                       |
| Notes                   | Eliminar TODO sobre duración de cookie.                                                                   |

### ¿Bloqueaba aprobación?

No (era confirmación; ya estaba formalizada en el backlog).

### Validación adicional requerida

No requiere validación adicional. Recomendado: registrar la actualización pendiente de Doc 19 §10 en el siguiente ciclo de mantenimiento documental.

---

## 3. Consolidated Decision Table

|  # | Tema                                | Decisión                                                                                          | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | ----------------------------------- | ------------------------------------------------------------------------------------------------- | ---- | ---------------------- | -------------------- |
|  1 | Política captcha en login           | Condicional tras `N` fallos consecutivos por IP+email                                              | PO   | Sí                     | Ninguna              |
|  2 | Umbral N                            | `N = 3` en ventana de 10 min; reset en login exitoso o expiración                                 | PO   | Sí                     | Ninguna              |
|  3 | Cooldown                            | Sin cooldown adicional; delega al rate limit canónico `10/IP/10min → 429`                          | PO   | Sí                     | Ninguna              |
|  4 | EC-03 cuenta `suspended`            | Out of Scope MVP; respuesta neutra `401` cubre el caso genérico                                    | PO   | Sí                     | Ninguna              |
|  5 | Lifetime cookie                     | `Max-Age = 30 días` (override formal de Doc 19 §10 24h vía Documentation Alignment Required)       | PO   | No                     | Ninguna              |

---

## 4. Cambios Aplicados a la User Story

### Metadata

- `Status`: `Draft` → `Ready for Approval`.
- `Last Updated`: `2026-06-09` → `2026-06-25`.

### Business Context

- Reescritura del `Context Summary` para citar las decisiones PO formalizadas, 30 días y `/api/v1/users/me`.
- Dependencias reemplazadas: `EPIC-SEC-001`/`EPIC-API-001` → `PB-P0-001`, `PB-P0-004`, `PB-P0-006`, `PB-P0-007`.
- `Assumptions` actualizadas para incluir lifetime 30d y captcha condicional.

### PO/BA Decisions Applied

- Nueva sección con 8 filas (5 decisiones formales + 3 derivadas técnicas con soporte documental directo: hashing argon2id, atributos canónicos de cookie, catálogo de errores).

### Assumptions

- Incluyen `status='active'` y el patrón de captcha condicional según señal del backend.

### Scope Guardrails

- `Explicitly Out of Scope` ampliado para incluir cuentas `suspended` (EC-03), logout (US-005), recovery (US-004) y OAuth Google.
- `Scope Notes` reemplaza "no bloquear cuentas permanentemente" por la decisión canónica del rate limit.

### Acceptance Criteria

- AC-01 reescrito con DTOs y atributos canónicos de cookie.
- AC-02 alineado a `AuthUserResponseDto` y rutas localizadas.
- AC-03 cuantificado a 30 días.
- Nuevo AC-04 (`409 ALREADY_AUTHENTICATED`).
- Nuevo AC-05 (`429 RATE_LIMIT_EXCEEDED` con `Retry-After`).
- EC-01 alineado al error envelope (`401 AUTHENTICATION_REQUIRED`).
- EC-02 reescrito con `N=3`, ventana 10 min y códigos `400 CAPTCHA_REQUIRED` / `400 CAPTCHA_INVALID`.
- EC-03 eliminado y movido a Out of Scope.

### Technical Notes

- Backend completado con `argon2id` parámetros, atributos canónicos de cookie, middleware canónico de rate limit y descripción del contador IP+email.
- Database menciona índice por `User.email` y tabla opcional `auth_attempts`.

### QA Notes

- TS-05/TS-06 nuevos para captcha condicional.
- NT-03 a NT-07 nuevos cubriendo error envelope completo y timing.

### Definition of Ready

- `PO/BA validó` marcado como cumplido.

### Definition of Done

- Lista actualizada con atributos canónicos de cookie, captcha condicional `N=3`, rate limit, error envelope alineado y tests de regresión de timing.

### Notes

- Eliminadas las dudas resueltas; permanece nota opcional sobre tracking IP/User-Agent.

---

## 5. Documentation Alignment Required

| Documento / Fuente                                 | Conflicto detectado                                                                                                  | Decisión vigente                                                                                | Acción recomendada                                                                                       | ¿Bloquea aprobación? |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------- |
| Doc 19 §10 (Session and cookie strategy)           | Doc 19 indica `Max-Age` 24h; PB-P1-003 + Decisión PO US-003 #5 fijan 30 días.                                          | 30 días.                                                                                         | Actualizar Doc 19 §10 con override formal a 30d para US-003; no requiere ADR.                            | No                   |
| Doc 8 (UC-AUTH-002, step 1)                        | UC-AUTH-002 describe captcha siempre en el formulario; PB-P1-003 + Decisión PO US-003 #1/#2 lo hacen condicional con `N=3`. | Captcha condicional `N=3`.                                                                       | Anotar override en Doc 8 referenciando la decisión PO de PB-P1-003 y US-003; no requiere ADR.            | No                   |
| Doc 16 §23 (User / Profile API)                    | Doc 16 documenta `GET /me`; la US (y US-001 ya aprobada) referencia `/api/v1/users/me`.                              | Canónico técnico documentado en Doc 16; las US lo expresan como `/api/v1/users/me` por consistencia con frontend (Doc 15). | Reconciliar definitivamente el path en la Technical Specification de PB-P1-003. No bloquea US-003.        | No                   |
| Backlog Notes — "Confirmar valor de N"             | Notes del borrador pedían confirmación de N.                                                                          | `N = 3` formalizado en Decisión PO US-003 #2.                                                    | Eliminar el TODO en Notes (aplicado en esta resolución).                                                  | No                   |
| Backlog Notes — "Confirmar duración de cookie"     | Notes del borrador pedían confirmación de lifetime.                                                                   | 30 días formalizado en PB-P1-003 + Decisión PO US-003 #5.                                        | Eliminar el TODO en Notes (aplicado en esta resolución).                                                  | No                   |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                    |
| User Story file path                         | `management/user-stories/US-003-login-email-password.md`                                |
| Decision Resolution artifact created/updated | Yes                                                                                    |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-003-decision-resolution.md`            |
| New User Story status                        | Ready for Approval                                                                     |
| Remaining blockers                           | No                                                                                     |
| Reason                                       | Las 5 decisiones PO/BA están formalizadas en la US y registradas en este artefacto.    |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

Las cinco decisiones PO/BA quedan formalizadas en la sección `PO/BA Decisions Applied` de la User Story y en este artefacto. La trazabilidad fue corregida (FR-AUTH-002/003/004/012, UC-AUTH-002, BR-AUTH-001/003/009/011, PB-P0-001/004/006/007). Los conflictos restantes con Doc 8, Doc 16 §23 y Doc 19 §10 quedan en Documentation Alignment Required, no bloqueantes.

---

## 8. Próximo Paso Recomendado

`Run User Story Approval Gate`.

Sequence:

```text
1. Revisar la User Story actualizada en management/user-stories/US-003-login-email-password.md.
2. Ejecutar `eventflow-user-story-approval` con la US-003.
3. Si la aprobación devuelve `Approved` o `Approved with Minor Notes` no bloqueantes, ejecutar `eventflow-user-story-technical-spec`.
```
