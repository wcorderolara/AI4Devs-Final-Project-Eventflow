# User Story Refinement Review — US-146

## Source User Story File
management/user-stories/US-146-demo-url-smoke.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-146-decision-resolution.md (no existe — no requerido)

## Review Date
2026-07-08

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| User Story ID                              | US-146                                                           |
| File Path                                  | management/user-stories/US-146-demo-url-smoke.md                 |
| Backlog Item                               | PB-P3-007 — Smoke test sobre Demo URL                            |
| Epic                                       | EPIC-DEMO-001 — Demo Readiness                                   |
| Estado actual                              | Draft → refinada                                                 |
| Estado recomendado                         | Ready for Approval                                              |
| Nivel de riesgo                            | Bajo                                                            |
| Calidad general                            | Alta                                                           |
| Requiere decisión PO                       | No                                                             |
| Requiere decisión técnica                  | No (todas derivables de Doc 20 / Doc 21 / backlog)             |
| Requiere decisión QA                       | No                                                            |
| Requiere decisión Seguridad                | No                                                            |
| Decision Resolution artifact found         | No                                                            |
| User Story file updated                    | Yes                                                           |
| Refinement review artifact created/updated | Yes (no bloqueante)                                            |
| Refinement review path                     | management/user-stories/refinement-reviews/US-146-refinement-review.md |

---

## 2. Diagnóstico PO/BA

La historia es valiosa y clara: entrega una red de seguridad de demo readiness (smoke mínimo post-deploy) alineada con PB-P3-007, Doc 20 (§6.6, PT-09) y Doc 21 (§16.1 `smoke.yml`, §25.4). Contribuye directamente a mitigar el riesgo "Demo URL inestable cerca de la presentación". El borrador original era genérico (plantilla sin especializar); la refinición lo ancló al Acceptance Summary del backlog, delimitó su alcance frente a la suite E2E completa (US-128 / PB-P2-016) y fijó determinismo vía Mock. Es lo suficientemente pequeña para implementarse y no introduce scope creep.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo | Impacto | Recomendación |
| --------- | -------- | ------- | ------------- |
| Media | El borrador no distinguía el smoke mínimo de la suite E2E completa (US-128). | Riesgo de duplicar/ampliar alcance. | Delimitado en Out of Scope: US-146 reutiliza infra de US-128, no la reimplementa. Aplicado. |
| Media | No se explicitaba el modo de IA para estabilidad del smoke. | Flakiness y consumo de cuota externa. | Fijado modo Mock/fallback determinista (AC-03, EC-03, VR-03). Aplicado. |
| Baja | Faltaba precondición de estado reproducible del seed. | Falsos rojos por datos alterados. | Añadida precondición seed/reset (US-140) y EC-02. Aplicado. |
| Baja | Faltaba el objetivo de tiempo (<5 min) y evidencia en fallo. | Criterio de aceptación no verificable. | Añadidos AC-04 (<5 min) y AC-06 (evidencia/exit code). Aplicado. |
| Baja | Referencia NFR-OBS-001 en el borrador es tangencial (aplica a AdminAction). | Trazabilidad imprecisa. | Se conservó como referencia de observabilidad de la corrida (correlationId/logs) sin sobreafirmar. |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario |
| ------------------------------------ | --------- | ---------- |
| No introduce pagos reales            | Pass      | No aplica. |
| No introduce contratos firmados      | Pass      | No aplica. |
| No introduce WhatsApp/chat/push      | Pass      | No aplica. |
| Respeta human-in-the-loop IA         | N/A       | No introduce IA nueva; ejerce flujo Mock. |
| Respeta backend como source of truth | Pass      | El smoke se autentica con el flujo real. |
| Respeta seed/demo si aplica          | Pass      | Consume seed; referencia reset (US-140). |
| No introduce RAG/vector DB           | Pass      | No aplica. |
| No introduce multi-tenant enterprise | Pass      | No aplica. |
| No introduce P4/Future scope         | Pass      | Alcance limitado al Acceptance Summary de PB-P3-007. |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad | Problema detectado | Acción recomendada |
| ----- | ------- | ------------------ | ------------------ |
| AC-01 | Clear   | — | Ejecutable contra Demo URL pública parametrizable. |
| AC-02 | Clear   | — | Cobertura mínima: login, eventos, IA Mock, comparador. |
| AC-03 | Clear   | — | Determinismo por Mock/fallback. |
| AC-04 | Clear   | — | <5 min (PB-P3-007). |
| AC-05 | Clear   | — | Runbook manual + `smoke.yml`. |
| AC-06 | Clear   | — | Resultado verde/rojo, correlationId, evidencia en fallo. |

---

## 6. Gaps Detectados

### Producto / Negocio
No aplica — valor y alcance alineados con PB-P3-007.

### Backend / API
No aplica — no implementa endpoints; observa `/health` y rutas existentes.

### Frontend / UX
No aplica — no entrega UI nueva.

### Base de Datos
No aplica — consume seed existente.

### Seguridad / Autorización
Cubierto — secretos vía Secrets Manager, sin secretos en logs/evidencia (SEC-01..03).

### IA / PromptOps
Cubierto — modo Mock determinista para el paso de IA.

### QA / Testing
Cubierto — TS-01..05, NT-01..03; reutiliza infra de US-128.

### Seed / Demo
Cubierto — precondición de estado reproducible; reset como acción correctiva.

### Documentación / Trazabilidad
Cubierto — Doc 20, Doc 21, Doc 11, Doc 22; backlog PB-P3-007.

---

## 7. Preguntas Pendientes

No pending blocking questions.

---

## 8. Documentation Alignment Required

No documentation alignment issues detected.

---

## 9. File Update Result

| Campo                                      | Valor                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                   |
| User Story file path                       | `management/user-stories/US-146-demo-url-smoke.md`                                     |
| User Story ID verified                     | Yes (US-146)                                                                           |
| Decision Resolution artifact found         | No                                                                                    |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-146-decision-resolution.md`          |
| Refinement review artifact created/updated | Yes (no bloqueante)                                                                   |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-146-refinement-review.md`              |
| Final recommended status                   | Ready for Approval                                                                    |
| Next recommended skill                     | eventflow-user-story-approval                                                          |
| Reason                                     | Sin decisiones bloqueantes; ambigüedades resueltas desde documentación aprobada.      |

---

## 10. Cambios Aplicados o Recomendados

### Metadata
Título especializado; `Priority` a Must Have (P3); `Status` a Ready for Approval; `Last Updated` a 2026-07-08.

### Business Context
Reescrito para describir smoke mínimo post-deploy, supuestos, y dependencias reales (US-128, US-140, US-116, US-144).

### Traceability
Añadido Backlog Item PB-P3-007; endpoints/UC marcados como observados (no implementados); NFR y ADRs precisados.

### Scope Guardrails
Out of Scope explícito frente a US-128, seed/reset, healthcheck, rollback y OpenAI real.

### Acceptance Criteria
AC-01..AC-06 en GWT verificables (Demo URL, cobertura, Mock, <5 min, runbook, evidencia).

### Technical Notes
Precisadas secciones frontend/backend/API/observabilidad para reflejar naturaleza de smoke.

### QA Notes
TS-01..05 y NT-01..03; captura de screenshots/trazas en fallo.

### Definition of Ready / Done
Actualizadas y alineadas al alcance; pendientes solo validación de Tech Lead.

### Notes
Confirmar runbook/`smoke.yml` y reutilización de infra de US-128 con Tech Lead.

---

## 11. Recomendación Final

`Ready for Approval` — La User Story quedó clara, testeable, trazable y dentro del alcance MVP, sin decisiones PO/Tech/QA/Seguridad bloqueantes. Todas las ambigüedades del borrador se resolvieron con documentación aprobada (Doc 20, Doc 21, backlog PB-P3-007). Próximo paso: `eventflow-user-story-approval`.
