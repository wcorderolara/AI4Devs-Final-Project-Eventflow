# User Story Refinement Review — `US-030`

## Source User Story File
management/user-stories/US-030-change-task-status.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-030-decision-resolution.md (no requerido — no existe)

## Review Date
2026-06-26

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| User Story ID                              | US-030                                                            |
| File Path                                  | management/user-stories/US-030-change-task-status.md              |
| Backlog Item                               | PB-P1-018 — CRUD de tareas manuales y máquina de estados          |
| Epic                                       | EPIC-TASK-001 — Checklist & Task Management                      |
| Estado actual                              | Draft → Ready for Approval                                        |
| Estado recomendado                         | Ready for Approval                                                |
| Nivel de riesgo                            | Bajo                                                              |
| Calidad general                            | Alta                                                              |
| Requiere decisión PO                       | No                                                                |
| Requiere decisión técnica                  | No                                                                |
| Requiere decisión QA                       | No                                                                |
| Requiere decisión Seguridad                | No                                                                |
| Decision Resolution artifact found         | No                                                                |
| User Story file updated                    | Yes                                                               |
| Refinement review artifact created/updated | Yes                                                               |
| Refinement review path                     | management/user-stories/refinement-reviews/US-030-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-030 es una historia con alto riesgo de duplicación frente a US-029, que ya cubre los tres endpoints canónicos (`PATCH content`, `PATCH status`, `DELETE`) con su state machine, ownership, mutabilidad atómica, telemetría backend y testing. La decisión de refinamiento fue **Opción C — refinar con handoff explícito a US-029**:

* US-029 entrega el backend, la state machine y la auditoría.
* US-030 se especializa en la **capa de UX de transición rápida** (toggle de un solo toque + optimistic update + rollback + telemetría de cliente + i18n + accesibilidad).
* No se introducen endpoints, controllers, schemas, repositorios ni migraciones nuevos.

Esta separación preserva la integridad de PB-P1-018 (que lista las 4 historias US-027/028/029/030 como entregables separados) y evita una recomendación de Split Required que reabriría discusiones de backlog ya cerradas.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                            | Impacto                                                              | Recomendación                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Baja      | El draft original sugería un endpoint `PATCH /api/v1/tasks/:id/status` que duplicaba US-029.        | Confusión técnica si se intentara implementar.                       | Reemplazado por reuso explícito del endpoint canónico de US-029.                                    |
| Baja      | El draft no diferenciaba `TaskStatusMenu` (US-029) de `TaskStatusQuickToggle` (US-030).             | Riesgo de re-implementar el menú general.                            | Refinamiento separa explícitamente ambos componentes y define el subconjunto de transiciones rápidas. |
| Media     | El draft no especificaba la mensajería de error localizada para cada código HTTP del backend.        | UX inconsistente entre 409 / 404 / 403 / 5xx.                        | Tabla canónica de mapeo `error_code → clave i18n` en PO/BA Decisions #6.                            |
| Baja      | El draft mencionaba "optimistic update con rollback" sin definir cómo verificar el snapshot.        | Test difícil de aterrizar.                                           | VR-04 requiere `deep equal` de snapshot vs. post-rollback.                                          |
| Baja      | Telemetría no definida en draft.                                                                    | Métricas de UX ausentes.                                             | 4 eventos de cliente con namespace `task.status.quick_action.*` claros.                              |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                 |
| ------------------------------------ | --------- | -------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | No aplica.                                                                  |
| No introduce contratos firmados      | Pass      | No aplica.                                                                  |
| No introduce WhatsApp/chat/push      | Pass      | Notificaciones quedan fuera (Future).                                       |
| Respeta human-in-the-loop IA         | Pass      | El usuario dispara explícitamente la transición; sin IA.                    |
| Respeta backend como source of truth | Pass      | Backend de US-029 valida y persiste; cliente solo refleja.                  |
| Respeta seed/demo si aplica          | N/A       | Sin seed nuevo.                                                              |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                  |
| No introduce multi-tenant enterprise | Pass      | No aplica.                                                                  |
| No introduce P4/Future scope         | Pass      | Out of scope explícito en §Scope Guardrails.                                |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad                                                                                        | Problema detectado | Acción recomendada |
| ----- | ---------------------------------------------------------------------------------------------- | ------------------ | ------------------ |
| AC-01 | Clear; cubre happy path con verificación de telemetría y cache.                                | —                  | —                  |
| AC-02 | Clear; transición de skip desde in_progress.                                                    | —                  | —                  |
| AC-03 | Clear; transición de unckeck `done → in_progress`.                                              | —                  | —                  |
| AC-04 | Clear; transición de `skipped → in_progress`.                                                   | —                  | —                  |
| AC-05 | Clear; idempotencia same-state percibida correctamente.                                          | —                  | —                  |

---

## 6. Gaps Detectados

### Producto / Negocio
No aplica.

### Backend / API
No aplica (delegado a US-029).

### Frontend / UX
Cubierto en PO/BA Decisions Applied #2..#7 y AC-01..05 + EC-01..08.

### Base de Datos
No aplica.

### Seguridad / Autorización
Cubierto en SEC-01..05 y delegado a US-029 para ownership backend.

### IA / PromptOps
No aplica.

### QA / Testing
Cubierto en TS-01..08, NT-01..06, AUTH-TS-01..03, A11Y-01..04, CONC-01..02.

### Seed / Demo
No requiere cambios de seed/demo.

### Documentación / Trazabilidad
Trazabilidad corregida a FR-TASK-004/011, UC-TASK-004 transversal, BR-TASK-004/010, NFR-PERF-001, NFR-OBS-001, NFR-A11Y-001.

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado                                                                                       | Decisión vigente                                          | Acción recomendada                                                  | ¿Bloquea aprobación? |
| ------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- | -------------------- |
| `/docs/10`         | El draft referenciaba `NFR-PERF-API-001` (stale).                                                          | Canónico: `NFR-PERF-001` (de US-029) propagado a UX.       | Cleanup editorial en `/docs/10`.                                    | No                   |
| `/docs/8`          | El draft referenciaba `UC-TASK-004` aislado; canónico ancla a `UC-TASK-001` transversal con `UC-TASK-004` específico. | Mantener `UC-TASK-004` con anclaje a `UC-TASK-001`.       | Aclaración liviana en `/docs/8`.                                    | No                   |
| `/docs/15`         | `/docs/15` no especifica explícitamente el patrón `onMutate`/`onError`/`onSuccess`/`onSettled` para snapshot/rollback. | Patrón canónico aplicado por US-030.                       | Sugerir adición al doc 15 como patrón referenciable.                | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                    |
| User Story file path                       | `management/user-stories/US-030-change-task-status.md`                                  |
| User Story ID verified                     | Yes                                                                                    |
| Decision Resolution artifact found         | No                                                                                     |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-030-decision-resolution.md` (no existe) |
| Refinement review artifact created/updated | Yes                                                                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-030-refinement-review.md`                |
| Final recommended status                   | Ready for Approval                                                                     |
| Next recommended skill                     | `eventflow-user-story-approval`                                                         |
| Reason                                     | Story refinada como capa UX especializada con handoff explícito a US-029. Sin decisiones bloqueantes. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata
Title canónico: "Cambiar el estado de mi tarea con un toque rápido (Organizer)". Backlog Item `PB-P1-018` agregado. UI Surface y Feature precisados.

### Business Context
Context Summary reescrito para clarificar que es la capa de UX de transición rápida sobre el endpoint canónico de US-029. Related Domain Concepts, Assumptions y Dependencies precisados (US-029 + US-027 + PB-P0-001 + PB-P0-014).

### PO/BA Decisions Applied
9 decisiones formalizadas: sin backend propio (#1), nuevo componente `TaskStatusQuickToggle` (#2), tabla de transiciones rápidas habilitadas (#3), optimistic update con rollback verificable (#4), telemetría dedicada de UX (#5), mensajería localizada por código de error (#6), accesibilidad WCAG AA (#7), sin acción admin (#8), i18n en 4 locales (#9).

### Traceability
Corregida: `FR-TASK-004/011`, `UC-TASK-004` transversal, `BR-TASK-004/010`, `NFR-PERF-001`, `NFR-OBS-001`, `NFR-A11Y-001`. PO Decision PB-P1-018 referenciada. Endpoint reusado de US-029.

### Scope Guardrails
Out of Scope expandido: sin backend, sin menú completo (US-029), sin bulk (US-031), sin workflow customizable, sin auto-completion, sin notificaciones push, sin recordatorios.

### Acceptance Criteria
5 AC en GWT (AC-01 marcar como hecho, AC-02 saltar, AC-03 desmarcar hecho, AC-04 reanudar, AC-05 idempotencia same-state).

### Edge Cases
8 EC: 409 INVALID_TRANSITION, 409 EVENT_NOT_MUTABLE, 404 NOT_FOUND, 403 FORBIDDEN, 5xx con retry, doble click, evento bloqueado al cargar, soft-deleted transitorio.

### Validation Rules
VR-01..06 enfocadas en la capa UX (renderizado condicional, disabled durante mutación, rollback verificable, payload sin campos extra, claves i18n existentes).

### Authorization & Security Rules
SEC-01..05 delegando ownership a US-029 y enforcing no-revelación + redacción de PII en telemetría UX.

### AI Behavior
No aplica explicitado.

### Technical Notes
Frontend extensivo (componente, hook wrapper, telemetría, i18n). Backend / Database / Migraciones: explícitamente "no aplica".

### Test Scenarios
TS-01..08 + NT-01..06 + AUTH-TS-01..03 + A11Y-01..04 + CONC-01..02.

### Business Impact
Velocidad percibida, satisfacción, demo de optimistic UI.

### Definition of Ready
Todos los checks marcados excepto "PO/BA validó".

### Definition of Done
Componente operativo, optimistic+rollback verificado, telemetría completa, i18n 4 locales, WCAG AA validado, sin backend modificado, tests verdes, PO valida.

---

## 11. Recomendación Final

`Ready for Approval`

US-030 queda refinada como historia UX-only con dependencia explícita y formalizada de US-029. No hay decisiones bloqueantes; las 3 Documentation Alignment son cleanup editorial. El componente, la telemetría, la accesibilidad y la i18n están claramente delineados y testeable. Recomendado proceder al `eventflow-user-story-approval`.
