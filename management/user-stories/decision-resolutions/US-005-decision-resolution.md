# PO/BA Decision Resolution — US-005

## Source User Story File

management/user-stories/US-005-logout-session.md

## Source Refinement Review File

management/user-stories/refinement-reviews/US-005-refinement-review.md

## Decision Date

2026-06-25

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| User Story ID                                | US-005                                                                                 |
| User Story file path                         | management/user-stories/US-005-logout-session.md                                       |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-005-refinement-review.md                  |
| Existing decision resolution found           | No                                                                                     |
| Backlog Item                                 | PB-P1-003 — Login con email/password + logout                                          |
| Epic                                         | EPIC-AUTH-001 — Authentication & User Access                                           |
| Estado antes de decisiones                   | Needs Refinement                                                                       |
| Cantidad de preguntas revisadas              | 4                                                                                      |
| Decisiones PO/BA tomadas                     | 4                                                                                      |
| Decisiones técnicas recomendadas             | 0 (todas tienen base documental directa)                                               |
| ¿Desbloquea aprobación?                      | Sí                                                                                     |
| User Story file updated                      | Yes                                                                                    |
| Decision Resolution artifact created/updated | Yes                                                                                    |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-005-decision-resolution.md              |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                    |

---

## 2. Decisiones Respondidas

## Decisión 1 — Idempotente vs estricto

### Pregunta original

> ¿`/auth/logout` es idempotente (`204` aun sin sesión) o estricto (`401` sin sesión, alineado con Doc 16 §22.3 y SEC-POL-AUTH-009)?

### Respuesta PO/BA

Estricto. Requiere sesión activa; sin sesión → `401 AUTHENTICATION_REQUIRED`.

### Decisión formal

```text
POST /api/v1/auth/logout requiere sesión activa. Sin sesión válida responde 401 AUTHENTICATION_REQUIRED. El frontend trata 401 y 204 igual y redirige al login, manteniendo UX equivalente en cualquier caso.
```

### Rationale

- Doc 16 §22.3 documenta `auth required` para `/auth/logout` y `401` como única respuesta de error.
- SEC-POL-AUTH-009 explicita "Logout invalida sesión actual" (presupone sesión).
- El frontend igual redirige al login ante `401` global; UX equivalente sin desviar el contrato canónico.

### Impacto en la User Story

| Sección                 | Cambio requerido |
| ----------------------- | ---------------- |
| PO/BA Decisions Applied | Añadir decisión |
| Acceptance Criteria     | EC-01 reescrito a `401` |
| Authorization & Security Rules | SEC-01 cita `authMiddleware` |
| Validation Rules        | VR-04 nueva |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Código de éxito

### Pregunta original

> ¿Código de éxito `204 No Content` (alineado a Doc 16 §22.3) o `200 OK`?

### Respuesta PO/BA

`204 No Content` sin body.

### Decisión formal

```text
Respuesta exitosa: 204 No Content sin body ni Content-Type. Alineado a Doc 16 §22.3.
```

### Rationale

- Doc 16 §22.3 documenta `204` para logout.
- Catálogo NFR-API-005 prefiere `204` cuando no hay payload.

### Impacto en la User Story

| Sección                 | Cambio requerido |
| ----------------------- | ---------------- |
| Acceptance Criteria     | AC-01 cita `204` |
| Validation Rules        | VR-03 nueva |
| Test Scenarios          | TS-01 / AUTH-TS-01 alineados |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Estrategia de invalidación

### Pregunta original

> ¿Rotación de cookie con `Max-Age=0` (simple, MVP-friendly) o tabla `sessions` con `sid` revocado?

### Respuesta PO/BA

Rotación de cookie con `Max-Age=0`. Sin tabla `sessions` en MVP.

### Decisión formal

```text
La invalidación de sesión se realiza por rotación de cookie con Set-Cookie: session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax. No se persiste tabla sessions en MVP. La alternativa con sid revocado (Doc 19 §9.6) queda reservada para post-MVP y requeriría ADR.
```

### Rationale

- Doc 19 §9.6 admite explícitamente la rotación como alternativa simple "para MVP, aceptando ventana corta de reuso si el cliente conserva la cookie".
- Evita introducir nueva entidad (`sessions`) y mantiene la simplicidad alineada con US-003 (sin persistencia de auth_attempts en MVP).
- Riesgo residual (reuso de cookie en navegador comprometido) está aceptado para MVP académico.

### Impacto en la User Story

| Sección                 | Cambio requerido |
| ----------------------- | ---------------- |
| Business Context        | Mencionar rotación de cookie |
| Scope Guardrails        | Tabla `sessions` movida a Out of Scope |
| Acceptance Criteria     | AC-01 cita rotación, AC-03 nuevo de reuso |
| Authorization & Security Rules | SEC-02/SEC-03 alineados |
| Technical Notes         | Backend: `SessionCookieIssuer.invalidate()` rota cookie |
| Database                | Confirmar No aplica |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional. Recomendación: si en el futuro se requiere logout instantáneo en multi-instancia, abrir ADR para introducir tabla `sessions`.

---

## Decisión 4 — Modal de confirmación

### Pregunta original

> ¿Modal de confirmación previo (todos / sólo admin / ninguno)?

### Respuesta PO/BA

Ninguno. Logout inmediato al clic.

### Decisión formal

```text
No se exige modal de confirmación antes de cerrar sesión. El clic en "Cerrar sesión" ejecuta el logout inmediato para los tres roles (organizer, vendor, admin).
```

### Rationale

- Patrón estándar de UX en aplicaciones similares.
- Reduce fricción y testing.
- El usuario puede iniciar sesión nuevamente sin penalización; el costo del clic accidental es bajo.

### Impacto en la User Story

| Sección                 | Cambio requerido |
| ----------------------- | ---------------- |
| UX / UI Notes           | Primary Action "Cerrar sesión — sin confirmación" |
| Scope Guardrails        | Modal de confirmación en Out of Scope |
| Acceptance Criteria     | Sin AC adicional |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                          | Decisión                                                                                  | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | ----------------------------- | ----------------------------------------------------------------------------------------- | ---- | ---------------------- | -------------------- |
|  1 | Idempotencia                  | Estricto: `401` sin sesión                                                                | PO   | Sí                     | Ninguna              |
|  2 | Código de éxito               | `204 No Content`                                                                          | PO   | Sí                     | Ninguna              |
|  3 | Invalidación                  | Rotación de cookie `Max-Age=0`; sin `sessions` en MVP                                     | PO   | Sí                     | Ninguna              |
|  4 | Modal de confirmación         | Sin modal; logout inmediato                                                               | PO   | Sí                     | Ninguna              |

---

## 4. Cambios Aplicados a la User Story

### Metadata

- `Status`: `Draft` → `Ready for Approval`.
- `Last Updated`: `2026-06-09` → `2026-06-25`.
- Agregado `Backlog Item: PB-P1-003`.

### Business Context

- `Context Summary` reescrito con estrategia, código y dependencias.
- Dependencias reemplazadas: `EPIC-SEC-001` → `PB-P0-006` + `PB-P0-004`; `US-003` explícito.

### PO/BA Decisions Applied

- Nueva sección con 6 filas (4 decisiones + 2 derivadas con soporte documental: catálogo de errores y atributos canónicos de la cookie).

### Traceability

- `FRD Requirement(s)`: `FR-AUTH-004`, `FR-AUTH-005`.
- `Use Case(s)`: `UC-AUTH-003`.
- `Business Rule(s)`: `BR-AUTH-003`, `BR-PRIVACY-009`.
- Related Document(s) actualizados.

### Scope Guardrails

- `Explicitly Out of Scope` ampliado: tabla `sessions`, modal de confirmación, logout silencioso.

### Acceptance Criteria

- AC-01 reescrito (`204`, atributos canónicos).
- AC-02 reforzado con invalidación TanStack Query.
- AC-03 nuevo (reuso de cookie no permite acceso).
- EC-01 reescrito (`401`).
- EC-02 reescrito (multi-pestaña por `401` global).
- EC-03 nuevo (`405 METHOD_NOT_ALLOWED`).

### Validation Rules

- VR-03 (`204` sin body).
- VR-04 (`401` sin sesión).

### Authorization & Security Rules

- SEC-01..SEC-06 actualizados.

### Technical Notes

- Backend: `LogoutUseCase` + `authMiddleware` + rotación cookie.
- Frontend: invalidación de queries `auth.*` y `me.*`.

### QA Notes

- Tests para reuso de cookie, multi-pestaña, 3 roles, `405` y `401`.

### Definition of Ready

- `PO/BA validó` marcado.

### Definition of Done

- Actualizada con atributos de cookie, eventos y tests específicos.

### Notes

- Quitadas las preguntas resueltas; agregada nota sobre evolución futura a `sessions`.

---

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| Doc 19 §9.6        | Doc 19 ofrece dos alternativas (rotación / tabla `sessions`) sin elegir una explícitamente. | Rotación de cookie con `Max-Age=0` (Decisión PO US-005 #3) para MVP. | Anotar en Doc 19 §9.6 que la alternativa MVP elegida es la rotación; ADR sólo si se promueve a `sessions` en el futuro. | No |

No otros conflictos detectados; Doc 16 §22.3 ya estaba alineado con las decisiones tomadas (`204` y `401`).

---

## 6. File Update Result

| Campo                                        | Valor                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                    |
| User Story file path                         | `management/user-stories/US-005-logout-session.md`                                      |
| Decision Resolution artifact created/updated | Yes                                                                                    |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-005-decision-resolution.md`            |
| New User Story status                        | Ready for Approval                                                                     |
| Remaining blockers                           | No                                                                                     |
| Reason                                       | Las 4 decisiones PO/BA están formalizadas en la US y en este artefacto.                |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

Las cuatro decisiones PO/BA quedan formalizadas en la sección `PO/BA Decisions Applied` y en este artefacto. Trazabilidad corregida (`FR-AUTH-004/005`, `UC-AUTH-003`, `BR-AUTH-003`, `BR-PRIVACY-009`) y dependencias alineadas a `PB-P0-006`/`PB-P0-004`/`US-003`. Documentation alignment con Doc 19 §9.6 marcada como no bloqueante.

---

## 8. Próximo Paso Recomendado

`Run User Story Approval Gate`.

Sequence:

```text
1. Revisar la User Story actualizada en management/user-stories/US-005-logout-session.md.
2. Ejecutar `eventflow-user-story-approval` con la US-005.
3. Si la aprobación devuelve `Approved` o `Approved with Minor Notes` no bloqueantes, ejecutar `eventflow-user-story-technical-spec`.
```
