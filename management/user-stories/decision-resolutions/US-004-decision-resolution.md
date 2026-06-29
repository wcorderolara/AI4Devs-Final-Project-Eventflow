# PO/BA Decision Resolution — US-004

## Source User Story File

management/user-stories/US-004-recover-password.md

## Source Refinement Review File

management/user-stories/refinement-reviews/US-004-refinement-review.md

## Decision Date

2026-06-25

## 1. Resumen Ejecutivo

| Campo                                        | Valor                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| User Story ID                                | US-004                                                                                 |
| User Story file path                         | management/user-stories/US-004-recover-password.md                                     |
| Refinement review artifact path              | management/user-stories/refinement-reviews/US-004-refinement-review.md                  |
| Existing decision resolution found           | No                                                                                     |
| Backlog Item                                 | PB-P1-004 — Recuperación de contraseña                                                 |
| Epic                                         | EPIC-AUTH-001 — Authentication & User Access                                           |
| Estado antes de decisiones                   | Needs Refinement                                                                       |
| Cantidad de preguntas revisadas              | 4                                                                                      |
| Decisiones PO/BA tomadas                     | 4                                                                                      |
| Decisiones técnicas recomendadas             | 0 (todas tienen base documental directa)                                               |
| ¿Desbloquea aprobación?                      | Sí                                                                                     |
| User Story file updated                      | Yes                                                                                    |
| Decision Resolution artifact created/updated | Yes                                                                                    |
| Decision Resolution path                     | management/user-stories/decision-resolutions/US-004-decision-resolution.md              |
| Próximo paso recomendado                     | Run `eventflow-user-story-approval`                                                    |

---

## 2. Decisiones Respondidas

## Decisión 1 — Status code de `/auth/password/reset-request`

### Pregunta original

> ¿`202 Accepted` (Doc 16) o `200 OK` (Doc 19 SEC-POL-AUTH-005)?

### Respuesta PO/BA

`202 Accepted` con mensaje genérico siempre.

### Decisión formal

```text
POST /api/v1/auth/password/reset-request responde 202 Accepted con mensaje genérico siempre (independiente de la existencia del email). Override formal sobre Doc 19 SEC-POL-AUTH-005 (200) → Documentation Alignment Required.
```

### Rationale

- Doc 16 §22.3 documenta `202` para la solicitud de reset.
- `202 Accepted` es semánticamente correcto: el envío de email se procesa de forma asíncrona.
- Mantiene consistencia con el resto del catálogo de Doc 16 (NFR-API).
- La idempotencia de la respuesta (SEC-POL-AUTH-005) se preserva: siempre `202` con el mismo mensaje.

### Impacto en la User Story

| Sección                 | Cambio requerido |
| ----------------------- | ---------------- |
| PO/BA Decisions Applied | Añadir decisión |
| Acceptance Criteria     | AC-01 y AC-03 con `202` |
| Authorization & Security Rules | SEC-04 cita `202` |
| Test Scenarios          | TS-05 idempotencia |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — VR-05 "nueva contraseña ≠ anterior"

### Pregunta original

> ¿Incluir VR-05 en MVP o eliminarla y usar solo la política Doc 19 §11.2?

### Respuesta PO/BA

Eliminar VR-05. Usar solo la política Doc 19 §11.2 (≥10 caracteres, letra+número, distinta del localpart del email).

### Decisión formal

```text
VR-05 se elimina del alcance MVP. La política de contraseña en /auth/password/reset es la política MVP de Doc 19 §11.2. Cumplir "≠ anterior" requeriría persistir o comparar contra el hash previo, complejidad innecesaria para MVP académico.
```

### Rationale

- No está formalizada en Doc 19 §11.2 ni en ADRs.
- Implementarla requeriría comparar contra el hash anterior, sumando latencia y complejidad.
- La política MVP ya provee mínimos razonables para academic demo.

### Impacto en la User Story

| Sección                 | Cambio requerido |
| ----------------------- | ---------------- |
| Validation Rules        | Eliminar VR-05 (queda VR-01..VR-04) |
| PO/BA Decisions Applied | Añadir decisión |
| Scope Guardrails        | Mover "≠ anterior" a Out of Scope |
| Acceptance Criteria     | AC-05 referencia política Doc 19 §11.2 |
| Test Scenarios          | NT-04 sólo política Doc 19 §11.2 |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Invalidación de sesiones tras reset

### Pregunta original

> ¿Tras reset exitoso, se invalidan las sesiones activas del usuario en otros dispositivos?

### Respuesta PO/BA

No invalidar otras sesiones en MVP.

### Decisión formal

```text
US-004 no invalida otras sesiones activas tras reset en MVP. La estrategia de invalidación adoptada en US-005 es rotación de cookie sin tabla sessions, lo que impide la revocación global. La cookie de sesiones existentes mantiene validez hasta su Max-Age o hasta logout explícito. Si se promueve la tabla sessions con sid revocado, se introduce esta funcionalidad por ADR.
```

### Rationale

- Consistente con la Decisión PO US-005 #3 (rotación de cookie).
- El caso de uso típico de reset es "el usuario olvidó la contraseña" — en general no hay sesiones activas en otros dispositivos del propio usuario.
- Evita scope creep y mantiene la arquitectura simple para MVP.

### Impacto en la User Story

| Sección                 | Cambio requerido |
| ----------------------- | ---------------- |
| PO/BA Decisions Applied | Añadir decisión |
| Scope Guardrails        | Invalidación global de sesiones en Out of Scope |
| Authorization & Security Rules | SEC-08 lo formaliza |
| Notes                   | Quitar TODO; referencia ADR futuro |

### ¿Bloqueaba aprobación?

Sí.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — TTL del token

### Pregunta original

> ¿Confirmas TTL `30 min` (Backlog PB-P1-004) frente a `15 min` (Doc 19 §11)?

### Respuesta PO/BA

Sí. `TTL = 30 minutos`.

### Decisión formal

```text
El token de reset usa TTL = 30 minutos. Override formal sobre Doc 19 §11 (15 min) y SEC-POL-AUTH-006 → Documentation Alignment Required (sin ADR), porque la decisión PO está formalizada en PB-P1-004.
```

### Rationale

- Backlog PB-P1-004 documenta explícitamente "Decisión PO US-004: 30 minutos".
- Precedencia de decisión: backlog (#4) > design docs (#6).
- 30 min ofrece mejor UX para usuarios académicos sin comprometer seguridad significativa (token de uso único + hash + rate limit).

### Impacto en la User Story

| Sección                 | Cambio requerido |
| ----------------------- | ---------------- |
| Business Context        | TTL 30 min citado |
| PO/BA Decisions Applied | Añadir decisión |
| Acceptance Criteria     | AC-01 cita `expires_at = now() + 30 min` |
| Authorization & Security Rules | SEC-03 cita TTL 30 min |
| Notes                   | Quitar TODO TTL |

### ¿Bloqueaba aprobación?

No (era confirmación).

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema                          | Decisión                                                                                  | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | ----------------------------- | ----------------------------------------------------------------------------------------- | ---- | ---------------------- | -------------------- |
|  1 | Status `/reset-request`       | `202 Accepted` siempre                                                                    | PO   | Sí                     | Ninguna              |
|  2 | VR-05                         | Eliminada; usar política Doc 19 §11.2                                                     | PO   | Sí                     | Ninguna              |
|  3 | Invalidación de sesiones      | No invalidar otras sesiones en MVP                                                        | PO   | Sí                     | Ninguna              |
|  4 | TTL token                     | 30 minutos (PB-P1-004)                                                                    | PO   | No                     | Ninguna              |

---

## 4. Cambios Aplicados a la User Story

### Metadata

- `Status`: `Draft` → `Ready for Approval`.
- `Last Updated`: → `2026-06-25`.
- Añadido `Backlog Item: PB-P1-004`.

### Business Context

- Reescrito `Context Summary` con paths canónicos, TTL formalizado, `MockEmailSender` y captcha + rate limits.
- Dependencias reemplazadas por `PB-P0-001`, `PB-P0-006`, `PB-P0-007`, `PB-P1-003`.

### PO/BA Decisions Applied

- Nueva sección con 10 filas (4 decisiones + 6 derivadas con soporte documental directo).

### Traceability

- `FRD Requirement(s)`: `FR-AUTH-006`, `FR-AUTH-012`.
- `Use Case(s)`: `UC-AUTH-004`.
- `Business Rule(s)`: `BR-AUTH-004`, `BR-AUTH-011`, `BR-PRIVACY-008`, `BR-PRIVACY-009`.
- Related Document(s) actualizados.

### Scope Guardrails

- `Explicitly Out of Scope` ampliado: invalidación global de sesiones, regla "≠ anterior".

### Acceptance Criteria

- AC-01 reescrito con DTOs, `202`, captcha, `expires_at`.
- AC-02 reescrito con `204`, `argon2id`, `consumed_at`.
- AC-03 mantiene `202` neutro.
- AC-04 nuevo (rate limit con valores canónicos).
- AC-05 nuevo (política Doc 19 §11.2).
- EC-01 → `410 GONE_TOKEN_EXPIRED`.
- EC-02 → `400 TOKEN_USED`.
- EC-03 → `400 TOKEN_INVALID`.

### Validation Rules

- VR-05 eliminada.
- VR-01..VR-04 alineadas al error envelope.

### Authorization & Security Rules

- SEC-01..SEC-08 actualizadas (incluyendo SEC-POL-AUTH-005/006 e invalidación MVP).

### Technical Notes

- DTOs nombrados, `argon2id`, transacción en `/reset`, puerto `EmailSender` + `MockEmailSender`.

### QA Notes

- TS-05 idempotencia; NT-07/NT-08 captcha; NT-09 redacción de logs.

### Definition of Ready

- `PO/BA validó` marcado.

### Definition of Done

- Actualizada con paths canónicos, codes (202/204/400/410/422/429), política Doc 19 §11.2 y captcha.

### Notes

- Quitados TODOs resueltos; añadida nota sobre ADR futuro de invalidación.

---

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| Doc 19 §11 + SEC-POL-AUTH-006 | TTL 15 min | TTL 30 min (Decisión PO US-004 #4, PB-P1-004) | Anotar override en Doc 19 §11. Sin ADR. | No |
| Doc 19 SEC-POL-AUTH-005 | `200 OK` | `202 Accepted` (Decisión PO US-004 #1, Doc 16 §22.3) | Anotar override en Doc 19 SEC-POL-AUTH-005. Sin ADR. | No |
| Doc 16 §22.3 vs draft | `/auth/password/forgot` | `/auth/password/reset-request` (canónico) | US ya alineada al canónico. | No |

---

## 6. File Update Result

| Campo                                        | Valor                                                                                  |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| User Story file updated                      | Yes                                                                                    |
| User Story file path                         | `management/user-stories/US-004-recover-password.md`                                    |
| Decision Resolution artifact created/updated | Yes                                                                                    |
| Decision Resolution path                     | `management/user-stories/decision-resolutions/US-004-decision-resolution.md`            |
| New User Story status                        | Ready for Approval                                                                     |
| Remaining blockers                           | No                                                                                     |
| Reason                                       | Las 4 decisiones PO/BA están formalizadas en la US y en este artefacto.                |

---

## 7. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

Las cuatro decisiones PO/BA quedan formalizadas. Trazabilidad corregida (`FR-AUTH-006/012`, `UC-AUTH-004`, `BR-AUTH-004/011`, `BR-PRIVACY-008/009`) y dependencias alineadas a `PB-P0-001/006/007` y `PB-P1-003`. Documentation Alignment con Doc 19 §11 y SEC-POL-AUTH-005 marcada como no bloqueante.

---

## 8. Próximo Paso Recomendado

`Run User Story Approval Gate`.

Sequence:

```text
1. Revisar la User Story actualizada en management/user-stories/US-004-recover-password.md.
2. Ejecutar `eventflow-user-story-approval` con la US-004.
3. Si la aprobación devuelve `Approved` o `Approved with Minor Notes` no bloqueantes, ejecutar `eventflow-user-story-technical-spec`.
```
