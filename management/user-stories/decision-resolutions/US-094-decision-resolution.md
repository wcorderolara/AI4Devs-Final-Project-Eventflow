# PO/BA Decision Resolution — US-094

## Source User Story File

`management/user-stories/US-094-auth-endpoints-implementation.md`

## Source Refinement Review File

`management/user-stories/refinement-reviews/US-094-refinement-review.md`

## Decision Date

2026-06-12

---

## 1. Resumen Ejecutivo

| Campo | Valor |
| --- | --- |
| User Story ID | US-094 |
| Backlog Item | PB-P0-004 — REST API Endpoints Foundation (Doc 16) |
| Epic | EPIC-API-001 — REST API Contract |
| Estado antes de decisiones | Ready for Approval |
| Preguntas bloqueantes encontradas | 0 |
| Alineaciones documentales revisadas | 2 |
| Decisiones PO/BA tomadas | 2 |
| Decisiones técnicas recomendadas | 0 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-094-decision-resolution.md` |
| Próximo paso recomendado | `eventflow-user-story-approval` |

El refinement review de US-094 no contiene preguntas bloqueantes pendientes. Sí identifica dos conflictos de documentación no bloqueantes que deben formalizarse para evitar que futuras revisiones reabran decisiones ya aplicadas en la historia.

La historia permanece en `Ready for Approval`.

---

## 2. Decisiones Respondidas

## Decisión 1 — Ruta canónica de perfil propio

### Pregunta original

El refinement review detectó un conflicto documental: Doc 16 §10/§23 y Doc 19 §9.2 usan `/api/v1/me`, mientras que Epic Map y US-094 usan `/api/v1/users/me`.

### Respuesta PO/BA

US-094 debe conservar `/api/v1/users/me` como ruta canónica para el contrato de esta historia, porque ya está alineada con el Epic Map, el draft refinado y la agrupación de endpoints de perfil propio bajo `users`.

### Decisión formal

```text
US-094 conserva `/api/v1/users/me`, `PATCH /api/v1/users/me`, `PATCH /api/v1/users/me/preferred-language` y `POST /api/v1/users/me/change-password` como rutas canónicas de perfil propio para PB-P0-004. Las referencias `/api/v1/me` en Doc 16 y Doc 19 se tratan como Documentation Alignment Required y no bloquean aprobación.
```

### Rationale

La decisión no contradice ADR aceptados, no introduce scope creep y no crea imposibilidad técnica. Mantener una ruta explícita bajo `/users/me` reduce ambigüedad de ownership y conserva consistencia con la historia ya refinada.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| `PO/BA Decisions Applied` | Ya contiene la decisión de conservar `/api/v1/users/me`. |
| `Traceability` | Ya lista los endpoints `/api/v1/users/me`. |
| `Technical Notes / API` | Ya usa `/api/v1/users/me`. |
| `Documentation Alignment Required` | Mantener nota no bloqueante. |

---

## Decisión 2 — Status code de password reset request

### Pregunta original

El refinement review detectó un conflicto documental: Doc 16 §22 usa `202` para reset-request, mientras que Doc 19 §9.5 menciona `200` genérico.

### Respuesta PO/BA

US-094 debe usar `202 Accepted` para `POST /api/v1/auth/password/reset-request`, siguiendo Doc 16 como contrato API canónico de PB-P0-004 y preservando la regla anti-enumeración.

### Decisión formal

```text
`POST /api/v1/auth/password/reset-request` responde `202 Accepted` con respuesta genérica tanto si el email existe como si no existe. La referencia `200` en Doc 19 se clasifica como Documentation Alignment Required y no bloquea aprobación.
```

### Rationale

`202 Accepted` comunica correctamente una operación recibida para procesamiento posterior y evita revelar si la cuenta existe. Esta decisión está alineada con el contrato API de Doc 16 y con el objetivo de seguridad anti-enumeración de US-094.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| `PO/BA Decisions Applied` | Se agregó la decisión explícita de usar `202 Accepted`. |
| `Acceptance Criteria` | AC-06 ya exige `202` y respuesta genérica. |
| `Documentation Alignment Required` | Mantener nota no bloqueante. |

---

## 3. Consolidated Decision Table

| ID | Tema | Decisión | Owner | Bloquea aprobación |
| --- | --- | --- | --- | --- |
| DEC-US094-001 | Ruta de perfil propio | Usar `/api/v1/users/me` como ruta canónica en US-094. | PO/BA | No |
| DEC-US094-002 | Password reset request status | Usar `202 Accepted` para `POST /api/v1/auth/password/reset-request`. | PO/BA | No |

---

## 4. Cambios Aplicados a la User Story

| Sección | Cambio aplicado |
| --- | --- |
| Metadata | `Last Updated` actualizado a `2026-06-12`. |
| `PO/BA Decisions Applied` | Agregada decisión formal sobre `202 Accepted` para password reset request. |

No se cambiaron acceptance criteria, endpoints, scope, seguridad ni prioridad porque la historia ya estaba refinada y lista para aprobación.

---

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| --- | --- | --- | --- | --- |
| Doc 16 §10/§23 y Doc 19 §9.2 | Usan `/api/v1/me`; US-094 usa `/api/v1/users/me`. | US-094 conserva `/api/v1/users/me`. | Unificar Doc 16/Doc 19 o registrar decisión canónica antes del snapshot OpenAPI. | No |
| Doc 16 §22 vs Doc 19 §9.5 | Doc 16 usa `202` para reset-request; Doc 19 menciona `200` genérico. | US-094 usa `202 Accepted`. | Alinear Doc 19 con Doc 16 manteniendo anti-enumeración. | No |

---

## 6. Estado recomendado después de aplicar decisiones

| Campo | Valor |
| --- | --- |
| Estado recomendado | Ready for Approval |
| Motivo | No quedan preguntas bloqueantes; las alineaciones documentales fueron formalizadas y no contradicen ADRs ni guardrails MVP. |
| Requiere otra ronda de refinement | Opcional |
| Puede pasar a approval gate | Sí |

---

## 7. Próximo Paso Recomendado

Ejecutar `eventflow-user-story-approval` para US-094.
