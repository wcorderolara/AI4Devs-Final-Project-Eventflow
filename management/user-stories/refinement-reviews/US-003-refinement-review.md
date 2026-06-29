# User Story Refinement Review — US-003

## Source User Story File

management/user-stories/US-003-login-email-password.md

## Decision Resolution Artifact

management/user-stories/decision-resolutions/US-003-decision-resolution.md

## Review Date

2026-06-25

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| User Story ID                              | US-003                                                                                           |
| File Path                                  | management/user-stories/US-003-login-email-password.md                                           |
| Backlog Item                               | PB-P1-003 — Login con email/password + logout                                                    |
| Epic                                       | EPIC-AUTH-001 — Authentication & User Access                                                     |
| Estado actual                              | Draft                                                                                            |
| Estado recomendado                         | Needs Refinement                                                                                 |
| Nivel de riesgo                            | Medio                                                                                            |
| Calidad general                            | Media                                                                                            |
| Requiere decisión PO                       | Sí                                                                                               |
| Requiere decisión técnica                  | No                                                                                               |
| Requiere decisión QA                       | No                                                                                               |
| Requiere decisión Seguridad                | No                                                                                               |
| Decision Resolution artifact found         | No                                                                                               |
| User Story file updated                    | No                                                                                               |
| Refinement review artifact created/updated | Yes                                                                                              |
| Refinement review path                     | management/user-stories/refinement-reviews/US-003-refinement-review.md                           |

---

## 2. Diagnóstico PO/BA

La US-003 cubre un flujo Must Have del MVP (login con email/password + cookie de sesión persistente + protección anti-bot) alineado con PB-P1-003, UC-AUTH-002, FR-AUTH-002/003/004 y BR-AUTH-001/003/011. La estructura del documento es completa (rol, valor, AC, edge cases, seguridad, observabilidad, tests, DoR/DoD).

Sin embargo, existen tres tipos de problemas:

1. Trazabilidad incorrecta: la US cita identificadores que no corresponden al flujo de login (UC-AUTH-003 es logout, FR-AUTH-005 es logout, FR-AUTH-006 es password recovery, BR-AUTH-004/005/006 no son las reglas del flujo).
2. Decisiones PO no formalizadas: política de captcha en login (siempre vs condicional), umbral N, duración del cooldown y tratamiento de cuentas suspendidas.
3. Documentation alignment menor sobre lifetime de cookie y path de `/me` que no bloquea aprobación cuando las decisiones queden formalizadas.

El alcance respeta MVP. No introduce pagos, SSO empresarial, MFA, magic link ni P4/Future.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                                                                                  | Impacto                                                                                                                | Recomendación                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Política de captcha en login no formalizada: BR-AUTH-011 y UC-AUTH-002 dicen "captcha en login" sin condicionar; PB-P1-003 y la US dicen "condicional tras N intentos".                                    | Sin decisión PO, los AC, validation rules y tests no se pueden cerrar; bloquea Technical Spec.                         | Formalizar Decisión PO US-003 #1: ¿captcha siempre obligatorio en login o condicional tras N fallos? Si es condicional, fijar N (umbral) en un valor entero por IP y por email candidato.       |
| Alta      | Umbral N de captcha y duración del cooldown no especificados (las Notes lo reconocen explícitamente como pendiente).                                                                                       | Imposible escribir AC testables y configuración.                                                                       | Formalizar Decisión PO US-003 #2 (N) y #3 (cooldown) o delegar explícitamente a Doc 19 §10 y Doc 16 §22.6 (10 intentos/IP/10 min → 429).                                                        |
| Alta      | Trazabilidad incorrecta: el documento lista FR-AUTH-004, FR-AUTH-005, FR-AUTH-006 y UC-AUTH-003.                                                                                                           | Confusión en QA y trazabilidad inválida con FRD/UC Spec.                                                               | Reemplazar por FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, FR-AUTH-012 y UC-AUTH-002.                                                                                                                |
| Alta      | Business Rules referenciadas incorrectas: BR-AUTH-004 (recuperación), BR-AUTH-005 (mono-rol) y BR-AUTH-006 (permisos del organizador) no aplican al flujo de login.                                        | Confusión y posible scope creep aparente.                                                                              | Reemplazar por BR-AUTH-001, BR-AUTH-003, BR-AUTH-009 y mantener BR-AUTH-011.                                                                                                                    |
| Media     | EC-03 marcado como "Future / opcional MVP" pero descrito como comportamiento esperado.                                                                                                                     | Ambigüedad de alcance; QA no sabe si validarlo en MVP.                                                                 | Decisión PO US-003 #4: incluir EC-03 en MVP (status `suspended` ya existe en Doc 16 DTO) o moverlo explícitamente a Out of Scope MVP.                                                           |
| Media     | "EPIC-SEC-001" y "EPIC-API-001" usadas como dependencias no existen como Epics formales en la documentación.                                                                                               | Trazabilidad imprecisa.                                                                                                | Reemplazar dependencias por PB-P0-001 (schema users), PB-P0-004 (REST API Foundation), PB-P0-006 (Cookies + Captcha), PB-P0-007 (Rate Limiting + Middleware Chain).                            |
| Media     | Mensajes de error inconsistentes con catálogo: la US usa "Email o contraseña incorrectos" y "Verificación de seguridad fallida" en VR; Doc 16 §22.6 estandariza `401 AUTHENTICATION_REQUIRED` genérico y `429`. | Riesgo de inconsistencia con el catálogo de errores y enumeración de cuentas.                                          | Alinear a códigos del error envelope (Doc 16): `401 AUTHENTICATION_REQUIRED`, `400 CAPTCHA_REQUIRED`/`CAPTCHA_INVALID`, `409 ALREADY_AUTHENTICATED`, `429 RATE_LIMITED`.                       |
| Media     | Validación criptográfica no incluye parámetros mínimos de `argon2id` ni la alternativa `bcrypt` documentada.                                                                                               | Configuración variable entre entornos.                                                                                 | Citar Doc 19 §11.2: `argon2id memoryCost=19MiB, timeCost=2, parallelism=1` o `bcrypt rounds=12` como alternativa formal.                                                                       |
| Media     | Atributos de cookie incompletos en el documento: faltan `Path=/`, `Secure` condicionado por entorno, política `Max-Age` explícita.                                                                         | Riesgo de configuración inconsistente entre entornos.                                                                  | Citar Doc 19 §10 y `Max-Age` definido por la decisión PO (30 días formalizada en backlog).                                                                                                     |
| Baja      | Endpoint `/api/v1/users/me` referenciado mientras Doc 16 §23 documenta `/me`.                                                                                                                              | Confusión con la implementación.                                                                                       | Documentation Alignment Required (no bloquea): mantener consistencia con la US-001 ya aprobada y formalizar el path en la Technical Spec referenciando Doc 16 §23.                              |
| Baja      | El bloque "Secondary Actions" referencia "Olvidé mi contraseña" y "Crear cuenta" sin definir su tratamiento si son links externos a esta US.                                                               | Riesgo menor de cruzar alcance con US-001/US-002/US-004.                                                                | Aclarar que son enlaces de navegación (no implementan funcionalidad de esas US) y mantener Out of Scope claro.                                                                                  |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                          |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                                                          |
| No introduce contratos firmados      | Pass      | No aplica.                                                                                                          |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                          |
| Respeta human-in-the-loop IA         | N/A       | La US no invoca IA.                                                                                                 |
| Respeta backend como source of truth | Pass      | Sesión, rol y autorización viven en backend (cookie firmada HTTP-only); rol nunca confiable desde cliente.          |
| Respeta seed/demo si aplica          | Pass      | Reusa seeds de usuarios definidos en Doc 11; no requiere seed adicional.                                            |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                          |
| No introduce multi-tenant enterprise | Pass      | No aplica.                                                                                                          |
| No introduce P4/Future scope         | Pass      | OAuth Google explícitamente Out of Scope; MFA/SSO/magic link/biometría Out of Scope.                                |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad             | Problema detectado                                                                                                                                                                                                             | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Needs Detail        | No declara atributos de cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=30d`), ni que el body responde un `AuthUserResponseDto` (Doc 16 §22.4), ni la verificación del captcha cuando aplique.                | Reescribir: **Given** un usuario `status='active'` con credenciales válidas y, cuando aplique, captcha verificado, **When** envía `POST /api/v1/auth/login`, **Then** el sistema verifica el password con `argon2id` (Doc 19 §11.2) en tiempo constante, emite cookie de sesión firmada HTTP-only/Secure/SameSite=Lax/Path=/, `Max-Age=30d` y devuelve `200` con `AuthUserResponseDto`.                                                                                                                                                                              |
| AC-02 | Clear               | OK conceptual, pero depende de definir el path final `/me` o `/users/me` (Documentation Alignment Required) y de que `AuthUserResponseDto` exponga `role`.                                                                     | Conservar AC-02 y alinear el path en Technical Spec.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| AC-03 | Needs Detail        | "Persistente" no cuantificado.                                                                                                                                                                                                 | Reescribir explicitando que la cookie expira a los 30 días desde su emisión (PO US-003 — backlog) y que el sistema preserva sesión activa mientras la cookie no caduque ni se invalide por logout.                                                                                                                                                                                                                                                                                                                                                              |
| EC-01 | Missing Negative Case | El catálogo de errores no aparece alineado con Doc 16 (`401 AUTHENTICATION_REQUIRED`).                                                                                                                                          | Especificar respuesta canónica `401 AUTHENTICATION_REQUIRED` con `correlationId`, mensaje genérico y `errorCode` del envelope; no exponer si el email existe o no.                                                                                                                                                                                                                                                                                                                                                                                              |
| EC-02 | Out of Scope as written | Depende de la decisión PO sobre captcha condicional vs siempre. Además N=3 está fijado en el texto sin formalización PO.                                                                                                       | No cerrar este AC hasta que PO confirme la política. Si captcha es siempre obligatorio, EC-02 se transforma en "captcha mandatorio incluido en el formulario en todo intento". Si es condicional, fijar N por PO y declarar respuesta cuando se omite captcha esperado (`400 CAPTCHA_REQUIRED`) y cuando es inválido (`400 CAPTCHA_INVALID`).                                                                                                                                                                                                                  |
| EC-03 | Out of Scope as written | "Future / opcional MVP" contradice que `status='suspended'` ya está modelado en Doc 16 §22.4 y debería responderse hoy.                                                                                                          | Decisión PO US-003 #4. Si entra en MVP: AC explícito que valida cuenta `suspended` → respuesta neutra `401 AUTHENTICATION_REQUIRED` (o `403 ACCOUNT_SUSPENDED` según envelope), sin filtrar motivo. Si queda Out of Scope: moverlo a "Explicitly Out of Scope" para evitar confusión.                                                                                                                                                                                                                                                                            |

---

## 6. Gaps Detectados

### Producto / Negocio

- Falta sección `PO/BA Decisions Applied` con: (i) política captcha en login, (ii) umbral N, (iii) cooldown, (iv) lifetime cookie 30 días formalizado, (v) alcance MVP del status `suspended`.
- "Confirmar duración de cookie de sesión" en Notes ya está resuelto (30 días en PB-P1-003). Debe quedar como decisión aplicada, no pendiente.

### Backend / API

- DTO de request/response no citado: usar `LoginRequestDto` y `AuthUserResponseDto` (Doc 16 §22.4).
- Códigos de error no alineados al envelope: `400`, `401`, `409`, `422`, `429` (Doc 16 §22.3 y §22.6).
- Falta mencionar rotación/invalidación de sesión en logout (BR-AUTH-003) por consistencia, aunque la implementación de logout pertenece a US-005.

### Frontend / UX

- Falta declarar comportamiento si ya existe sesión activa (Doc 16: `409` o redirección al layout del rol).
- Falta declarar manejo del captcha widget en función de la política decidida (siempre vs condicional con flag desde el backend).

### Base de Datos

- `auth_attempts` se menciona como opcional. Doc 19 §10 no requiere persistencia para 24h MVP; con la decisión PO de 30 días podría reforzarse, pero no es obligatorio. Quede como opcional con justificación.

### Seguridad / Autorización

- Falta explicitar verificación de password en tiempo constante (`argon2id`) y parámetros mínimos.
- Falta explicitar política completa de cookie (`Path=/`, `Max-Age`, `Secure` en no-locales).
- Falta citar la matriz Doc 19 §6 (`/auth/login` público, captcha + rate limit 10/IP/10 min).
- Falta declarar la rotación de `SESSION_SECRET` o estrategia de invalidación si se introduce más adelante (referenciar Doc 19 §10).

### IA / PromptOps

- No aplica.

### QA / Testing

- Faltan tests de seguridad concretos: timing attacks (no medible directo, pero verificar que el hash siempre se ejecute aun si el email no existe), rate-limit `429`, cookie con flags correctos en respuesta.
- Faltan tests de contrato para `LoginRequestDto` y `AuthUserResponseDto`.
- Faltan tests E2E para 3 roles (organizador, vendor, admin) leyendo `/me` y redirigiendo al layout correcto.

### Seed / Demo

- Reutiliza seeds existentes de organizador, vendor y admin. Confirmar que existen credenciales seed conocidas en Doc 11 para los 3 roles.

### Documentación / Trazabilidad

- Corregir FR-AUTH-004/005/006 → FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, FR-AUTH-012.
- Corregir UC-AUTH-003 → UC-AUTH-002.
- Corregir BR-AUTH-004/005/006 → BR-AUTH-001, BR-AUTH-003, BR-AUTH-009 y mantener BR-AUTH-011.
- Reemplazar Epics no existentes ("EPIC-SEC-001", "EPIC-API-001") por dependencias PB-P0-001, PB-P0-004, PB-P0-006, PB-P0-007.

---

## 7. Preguntas Pendientes

| Tipo | Pregunta                                                                                                                                                                                                                                          | Bloquea aprobación | Responsable    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------- |
| PO   | ¿Captcha en login es siempre obligatorio (consistente con UC-AUTH-002 y BR-AUTH-011) o condicional tras N intentos fallidos (consistente con PB-P1-003 y borrador US-003)?                                                                          | Sí                 | Product Owner  |
| PO   | Si captcha es condicional, ¿cuál es el valor de N (umbral de intentos fallidos consecutivos) por IP y por email candidato que activa el captcha?                                                                                                    | Sí                 | Product Owner  |
| PO   | ¿Cuál es la duración del cooldown temporal tras superar un umbral mayor, y bajo qué disparador? ¿O delegamos al rate limit canónico (10 intentos/IP/10 min → 429 de Doc 16 §22.6 y Doc 19 §6) sin cooldown adicional?                              | Sí                 | Product Owner  |
| PO   | ¿EC-03 (cuenta `suspended` intentando login) entra en MVP con respuesta `401`/`403` genérica, o queda Out of Scope MVP y se mueve fuera de los Edge Cases?                                                                                          | Sí                 | Product Owner  |
| PO   | ¿Confirmas formalmente que la cookie de sesión `Max-Age=30d` (Backlog PB-P1-003) prevalece sobre el "24h" recomendado en Doc 19 §10, y autorizas el override (sin necesidad de ADR) por ser una decisión PO ya documentada en el Product Backlog? | No                 | Product Owner  |

---

## 8. Documentation Alignment Required

| Documento / Fuente                              | Conflicto detectado                                                                                                            | Decisión vigente                                                                                | Acción recomendada                                                                                                                                       | ¿Bloquea aprobación? |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Doc 19 §10 (Session and cookie strategy)         | Doc 19 indica `Max-Age` de 24 horas; PB-P1-003 fija 30 días para la cookie de sesión.                                          | 30 días (PB-P1-003 y backlog "Decisión PO US-003").                                              | Actualizar Doc 19 §10 con override formal o crear ADR breve; no bloquea US-003 si PO confirma.                                                          | No                   |
| Doc 16 §23 (User / Profile API)                  | Doc 16 documenta `GET /me`; la US y US-001 ya aprobada citan `/api/v1/users/me`.                                               | El path canónico es el documentado por Doc 16, pero el frontend lo expone bajo `/users/me`.    | Documentation Alignment Required; resolver definitivamente el path en la Technical Spec referenciando Doc 16 §23 y la convención de Doc 15.            | No                   |
| Doc 16 §22.6 + Doc 19 §6 (rate limit `/auth/login`) | La US habla de "cooldown temporal" sin cuantificar; Doc 16 y Doc 19 ya fijan 10 intentos/IP/10 min → `429`.                    | Doc 16 §22.6 (10/IP/10 min, `429`).                                                              | Alinear la US a los valores canónicos y eliminar texto ambiguo de "cooldown" salvo que PO defina algo adicional.                                        | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| User Story file updated                    | No                                                                                                                   |
| User Story file path                       | `management/user-stories/US-003-login-email-password.md`                                                              |
| User Story ID verified                     | Yes                                                                                                                  |
| Decision Resolution artifact found         | No                                                                                                                   |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-003-decision-resolution.md`                                          |
| Refinement review artifact created/updated | Yes                                                                                                                  |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-003-refinement-review.md`                                              |
| Final recommended status                   | Needs Refinement                                                                                                     |
| Next recommended skill                     | eventflow-po-ba-decision-resolver                                                                                    |
| Reason                                     | Existen decisiones PO bloqueantes (captcha en login, umbral N, cooldown, EC-03) que deben formalizarse antes de aprobar. |

---

## 10. Cambios Aplicados o Recomendados

La User Story file no fue actualizada. Los siguientes cambios deben aplicarse después de resolver las decisiones PO listadas en §7.

### Metadata

- Actualizar `Status` a `Ready for Approval` solo después de la resolución de decisiones.
- Actualizar `Last Updated` a la fecha de la actualización.

### Business Context

- En "Context Summary", reemplazar la mención a Decisión PO 8.1 #8 por la decisión PO efectiva sobre captcha en login (siempre vs condicional + N).
- En "Dependencies", reemplazar "EPIC-SEC-001" y "EPIC-API-001" por `PB-P0-001`, `PB-P0-004`, `PB-P0-006`, `PB-P0-007`.

### PO/BA Decisions Applied

- Añadir esta sección con: política captcha resuelta, N (si aplica), cooldown (o referencia a 10/IP/10 min), lifetime cookie 30 días, manejo de cuentas `suspended`.

### Traceability

- `FRD Requirement(s)`: `FR-AUTH-002, FR-AUTH-003, FR-AUTH-004, FR-AUTH-012`.
- `Use Case(s)`: `UC-AUTH-002`.
- `Business Rule(s)`: `BR-AUTH-001, BR-AUTH-003, BR-AUTH-009, BR-AUTH-011`.
- `Permission Rule(s)`: `Anonymous → cualquier rol según User.role` (mantener).
- `API Endpoint(s)`: `POST /api/v1/auth/login`, `GET /api/v1/users/me` (con nota de alignment a Doc 16 §23).
- `NFR Reference(s)`: `NFR-SEC-003`, `NFR-PERF-API-001`.
- `Related ADR(s)`: `ADR-SEC-001`.
- `Related Document(s)`: `/docs/19 §10, §11.2`, `/docs/16 §22, §23`, `/docs/8 UC-AUTH-002`, `/docs/2 §captcha`, `/docs/8.1 #8`.

### Scope Guardrails

- Mover EC-03 a "Explicitly Out of Scope" si PO lo deja fuera de MVP.

### Acceptance Criteria

- Reescribir AC-01, AC-03, EC-01, EC-02 según §5.
- Añadir AC para `409 ALREADY_AUTHENTICATED` cuando un usuario autenticado intenta login.
- Añadir AC para `429 RATE_LIMITED` tras superar el rate limit canónico.

### Technical Notes

- Backend: agregar referencia a `LoginRequestDto`/`AuthUserResponseDto` (Doc 16 §22.4), `argon2id memoryCost=19MiB, timeCost=2, parallelism=1` (Doc 19 §11.2), atributos completos de cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=30d`).
- Frontend: declarar comportamiento ante sesión existente y consumo de `/api/v1/users/me` con `AuthUserResponseDto`.

### QA Notes

- Añadir tests de timing (hash siempre ejecutado), de flags de cookie, de error envelope, y de los 3 layouts por rol con seeds existentes.

### Definition of Ready

- Marcar `PO/BA validó` solo cuando se cierren las decisiones del §7.

### Definition of Done

- Añadir verificación de error envelope alineado a Doc 16 y de rate limit `429`.

### Notes

- Eliminar las notas que ya quedan resueltas tras decisiones PO (cookie 30 días, N, cooldown).

---

## 11. Recomendación Final

`Needs Refinement`.

La historia es valiosa y cabe en el MVP, pero requiere cinco decisiones PO antes de poder aprobarse y avanzar a Technical Specification. Las correcciones de trazabilidad y de alineamiento de cookie/`/me` son no bloqueantes y se aplicarán al refinar el archivo. Próxima skill recomendada: `eventflow-po-ba-decision-resolver`.
