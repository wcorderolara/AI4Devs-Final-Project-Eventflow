# PO/BA Decision Resolution — US-098

## Source User Story File

`management/user-stories/US-098-openapi-snapshot.md`

## Source Refinement Review File

`management/user-stories/refinement-reviews/US-098-refinement-review.md`

## Decision Date

2026-06-15

## 1. Resumen Ejecutivo

| Campo | Valor |
| ----- | ----- |
| User Story ID | US-098 |
| User Story file path | `management/user-stories/US-098-openapi-snapshot.md` |
| Refinement review artifact path | `management/user-stories/refinement-reviews/US-098-refinement-review.md` |
| Existing decision resolution found | No |
| Backlog Item | PB-P0-005 — OpenAPI Snapshot desde Zod |
| Epic | EPIC-API-001 — REST API Endpoints |
| Estado antes de decisiones | Ready for Approval |
| Cantidad de preguntas revisadas | 1 documentation alignment issue; 0 preguntas bloqueantes |
| Decisiones PO/BA tomadas | 1 |
| Decisiones técnicas recomendadas | 0 |
| ¿Desbloquea aprobación? | Sí |
| User Story file updated | Yes |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-098-decision-resolution.md` |
| Próximo paso recomendado | `eventflow-user-story-approval` |

El refinement review de US-098 no contiene preguntas bloqueantes. La única decisión requerida es formalizar la alineación documental entre PB-P0-005, que pide `openapi.json`, y Doc 16 §43, que menciona `/api/openapi.yaml`. La decisión queda formalizada para evitar que futuras revisiones reabran el conflicto de formato/path.

## 2. Decisiones Respondidas

## Decisión 1 — Artefacto canónico OpenAPI

### Pregunta original

El refinement review no registra una pregunta bloqueante, pero sí identifica esta alineación documental:

> PB-P0-005 indica `openapi.json`; Doc 16 §43 menciona `/api/openapi.yaml`. Para US-098, `backend/openapi.json` queda como snapshot canónico versionado; YAML puede ser derivado local si se necesita.

### Respuesta PO/BA

Se mantiene `backend/openapi.json` como artefacto canónico versionado para US-098 porque PB-P0-005 es el backlog item específico de la historia y define explícitamente que el comando CI genera `openapi.json`, que el diff en PR detecta cambios contractuales y que el snapshot vive en el repositorio.

Doc 16 §43 conserva su valor como guía de estrategia OpenAPI: Zod como fuente, `cookieAuth`, componentes comunes, `operationId`, server `/api/v1` y `redocly lint`. La referencia a `/api/openapi.yaml` se interpreta como una salida documental previa o derivada, no como una segunda fuente de verdad para esta historia.

### Decisión formal

```text
US-098 usa `backend/openapi.json` como snapshot OpenAPI canónico, versionado y validado en CI. Cualquier `openapi.yaml`, Swagger UI o Redoc local/demo debe generarse desde ese snapshot o desde el mismo generador, y no puede convertirse en una definición manual paralela ni en una segunda fuente de verdad.
```

### Rationale

Esta decisión respeta la jerarquía documental del workflow: PB-P0-005 es el backlog item específico para US-098 y ya contiene la decisión PO de usar `zod-to-openapi`, snapshot en repo y generación de `openapi.json` en CI. También respeta Doc 16 §43 en sus elementos sustantivos: generación desde Zod, componentes comunes, security schemes, `operationId`, versionado `/api/v1` y validación CI con `redocly lint`.

La decisión evita doble fuente de verdad, reduce drift contractual, mantiene el scope MVP y no contradice ADRs aceptados. No introduce endpoints nuevos, SDKs de producción, portal público ni capacidades fuera del MVP.

### Impacto en la User Story

| Sección | Cambio requerido |
| ------- | ---------------- |
| PO/BA Decisions Applied | Agregar decisión explícita de artefacto canónico `backend/openapi.json`. |
| Assumptions | Ya contenía la regla de snapshot canónico; se mantiene. |
| Technical Notes | Ya contenía el path sugerido; se mantiene. |
| Notes | Ya contenía `Documentation Alignment Required`; se mantiene. |

## 3. Consolidated Decision Table

| ID | Área | Decisión | Fuente principal | Bloquea aprobación | Estado |
| -- | ---- | -------- | ---------------- | ------------------ | ------ |
| DR-US-098-001 | OpenAPI artifact | `backend/openapi.json` es el snapshot canónico versionado para CI; YAML/UI son derivados, no fuente paralela. | PB-P0-005; Doc 16 §43; refinement review US-098 | No | Resolved |

## 4. Cambios Aplicados a la User Story

| Sección | Cambio aplicado |
| ------- | --------------- |
| `## 🧩 PO/BA Decisions Applied` | Se agregó la fila `Artefacto canónico del snapshot` con fuente `Decision Resolution US-098; Product Backlog PB-P0-005`. |
| Metadata | Sin cambios; la historia ya estaba en `Ready for Approval` con fecha `2026-06-15`. |
| Acceptance Criteria | Sin cambios; AC-01, AC-02, AC-03 y AC-06 ya reflejan la decisión. |
| Technical Notes | Sin cambios; ya indicaba `backend/openapi.json`. |
| Notes | Sin cambios; se conserva el alignment note no bloqueante. |

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| Product Backlog PB-P0-005 vs Doc 16 §43 | PB-P0-005 indica `openapi.json`; Doc 16 §43 menciona `/api/openapi.yaml`. | `backend/openapi.json` es el snapshot canónico versionado para US-098; YAML puede existir solo como derivado local/demo. | Actualizar Doc 16 §43 en una futura alineación documental para indicar `backend/openapi.json` como snapshot canónico y YAML como derivado opcional, o registrar esta decisión como nota en technical spec. | No |

## 6. Estado recomendado después de aplicar decisiones

`Ready for Approval`.

No quedan preguntas bloqueantes de PO, BA, QA, Seguridad ni Tech Lead. La decisión formalizada no introduce scope creep, no contradice ADRs aceptados y mantiene la historia dentro de PB-P0-005.

## 7. Próximo Paso Recomendado

Ejecutar `eventflow-user-story-approval` sobre `management/user-stories/US-098-openapi-snapshot.md`.
