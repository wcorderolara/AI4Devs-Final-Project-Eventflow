# PO/BA Decision Resolution — US-095

## Source User Story File

`management/user-stories/US-095-event-endpoints-implementation.md`

## Source Refinement Review File

`management/user-stories/refinement-reviews/US-095-refinement-review.md`

## Decision Date

2026-06-12

---

## 1. Resumen Ejecutivo

| Campo | Valor |
| --- | --- |
| User Story ID | US-095 |
| Backlog Item | PB-P0-004 — REST API Endpoints Foundation (Doc 16) |
| Epic | EPIC-API-001 — REST API Contract |
| Estado antes de decisiones | Ready for Approval |
| Preguntas bloqueantes encontradas | 0 |
| Alineaciones documentales revisadas | 3 |
| Decisiones PO/BA tomadas | 3 |
| Decisiones técnicas recomendadas | 0 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-095-decision-resolution.md` |
| Próximo paso recomendado | `eventflow-user-story-approval` |

El refinement review de US-095 no contiene preguntas bloqueantes. Las decisiones formalizadas abajo consolidan tres conflictos de documentación no bloqueantes para evitar que futuras revisiones reabran alcance P0/P1 o rutas del contrato Event.

La historia permanece en `Ready for Approval`.

---

## 2. Decisiones Respondidas

## Decisión 1 — Admin event endpoints fuera de P0

### Pregunta original

Doc 16 §24 incluye `GET /admin/events`, pero PB-P0-004 indica que los endpoints admin se incorporan en P1.

### Respuesta PO/BA

US-095 no debe implementar `GET /api/v1/admin/events` ni lectura admin auditada. El alcance P0 es el contrato de eventos propios para `organizer`; los endpoints admin pertenecen a PB-P1-010/US-016.

### Decisión formal

```text
US-095 excluye `/api/v1/admin/events` y cualquier lectura admin auditada. Esos endpoints quedan para PB-P1-010/US-016 y no bloquean la aprobación de la historia P0 de eventos propios.
```

### Rationale

PB-P0-004 define la foundation REST, pero sus notas separan admin/review/notification como P1. Incluir admin en US-095 ampliaría el alcance y mezclaría permisos/auditoría admin con el contrato base de eventos del organizer.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| `PO/BA Decisions Applied` | Ya contiene la decisión de excluir admin event read-only de P0. |
| `Scope Guardrails` | Ya mantiene admin endpoints fuera de alcance. |
| `Traceability` | No se agregan endpoints admin. |

---

## Decisión 2 — Rutas canónicas de lifecycle Event

### Pregunta original

Doc 14 menciona `POST /:id/status` y `DELETE /:id`, mientras que Doc 16 §24 define rutas de acción específicas `activate` y `cancel`.

### Respuesta PO/BA

US-095 debe seguir Doc 16 como contrato API canónico para PB-P0-004. Las rutas del lifecycle son `POST /api/v1/events/:eventId/activate` y `POST /api/v1/events/:eventId/cancel`. No se implementan aliases `POST /:id/status` ni `DELETE /:id` en esta historia.

### Decisión formal

```text
US-095 usa `POST /api/v1/events/:eventId/activate` y `POST /api/v1/events/:eventId/cancel` como rutas canónicas del ciclo de vida Event. Las referencias de Doc 14 a `POST /:id/status` y `DELETE /:id` se clasifican como Documentation Alignment Required.
```

### Rationale

Doc 16 es la fuente contractual para PB-P0-004 y ya define métodos, paths, status y errores. Usar rutas de acción explícitas reduce ambigüedad, evita hard delete accidental y mantiene el contrato alineado con los ACs refinados.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| `PO/BA Decisions Applied` | Se agregó decisión explícita de rutas `activate`/`cancel`. |
| `Acceptance Criteria` | AC-06 y AC-07 ya usan las rutas canónicas. |
| `Technical Notes / API` | Mantener tabla API con `activate` y `cancel`. |

---

## Decisión 3 — Auto-completion T+2 fuera de US-095

### Pregunta original

FRD/use cases tratan auto-completion T+2 como Must Have, pero el backlog lo planifica como job separado en PB-P1-009.

### Respuesta PO/BA

US-095 no implementa el job de auto-completion T+2. La historia sólo debe preservar campos/contrato compatibles, como `autoCompleted` y estados de evento, para que PB-P1-009 implemente el job posteriormente.

### Decisión formal

```text
US-095 excluye el job programado de auto-completion T+2. La regla sigue vigente para el MVP, pero su implementación pertenece a PB-P1-009; US-095 sólo mantiene compatibilidad de schema, DTO y lifecycle.
```

### Rationale

La historia es una foundation de endpoints REST, no una historia de jobs. Incluir scheduling ampliaría alcance, dependencia operativa y pruebas de tiempo simulado en un story cuyo objetivo es contrato API.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| `PO/BA Decisions Applied` | Ya contiene decisión de dejar auto-completion job fuera de US-095. |
| `Scope Guardrails` | Ya lista auto-completion job T+2 como fuera de alcance. |
| `Acceptance Criteria` | No se agregan ACs de job. |

---

## 3. Consolidated Decision Table

| ID | Tema | Decisión | Owner | Bloquea aprobación |
| --- | --- | --- | --- | --- |
| DEC-US095-001 | Admin event endpoints | Excluir `/api/v1/admin/events` de US-095; queda en PB-P1-010/US-016. | PO/BA | No |
| DEC-US095-002 | Event lifecycle routes | Usar Doc 16: `POST /events/:eventId/activate` y `POST /events/:eventId/cancel`. | PO/BA | No |
| DEC-US095-003 | Auto-completion job | Excluir job T+2 de US-095; queda en PB-P1-009. | PO/BA | No |

---

## 4. Cambios Aplicados a la User Story

| Sección | Cambio aplicado |
| --- | --- |
| Metadata | `Last Updated` actualizado a `2026-06-12`. |
| `PO/BA Decisions Applied` | Agregada decisión formal sobre rutas canónicas `activate` y `cancel` de Doc 16. |

No se modificaron acceptance criteria, endpoint table, alcance ni prioridad porque la historia ya estaba refinada y lista para aprobación.

---

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| --- | --- | --- | --- | --- |
| Doc 16 §24 vs PB-P0-004/PB-P1-010 | Doc 16 incluye `GET /admin/events`; PB-P0-004 indica admin endpoints en P1. | US-095 excluye `/admin/events`; queda para PB-P1-010/US-016. | Aclarar scope P0/P1 antes de OpenAPI snapshot. | No |
| Doc 14 EventsController vs Doc 16 §24 | Doc 14 menciona `POST /:id/status` y `DELETE /:id`; Doc 16 define `activate`/`cancel`. | US-095 sigue Doc 16: `activate` y `cancel`. | Alinear Doc 14 o registrar aliases sólo si Tech Lead/PO lo aprueban después. | No |
| FRD/use cases auto-completion | Auto-completion T+2 es Must Have pero PB-P1-009 lo planifica como job separado. | US-095 no implementa job; mantiene compatibilidad de schema/DTO. | Mantener job en PB-P1-009 y validar en su historia específica. | No |

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

Ejecutar `eventflow-user-story-approval` para US-095.
