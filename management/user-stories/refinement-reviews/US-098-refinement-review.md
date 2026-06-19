# User Story Refinement Review — US-098

## Source User Story File

`management/user-stories/US-098-openapi-snapshot.md`

## Decision Resolution Artifact

`management/user-stories/decision-resolutions/US-098-decision-resolution.md`

## Review Date

2026-06-15

## 1. Resultado Ejecutivo

| Campo | Evaluación |
| ----- | ---------- |
| User Story ID | US-098 |
| File Path | `management/user-stories/US-098-openapi-snapshot.md` |
| Backlog Item | PB-P0-005 — OpenAPI Snapshot desde Zod |
| Epic | EPIC-API-001 — REST API Endpoints |
| Estado actual | Draft |
| Estado recomendado | Ready for Approval |
| Nivel de riesgo | Medio |
| Calidad general | Alta |
| Requiere decisión PO | No |
| Requiere decisión técnica | No |
| Requiere decisión QA | No |
| Requiere decisión Seguridad | No |
| Decision Resolution artifact found | No |
| User Story file updated | Yes |
| Refinement review artifact created/updated | Yes |
| Refinement review path | `management/user-stories/refinement-reviews/US-098-refinement-review.md` |

US-098 fue refinada desde un placeholder técnico genérico hacia una historia lista para approval gate. La versión refinada define un snapshot OpenAPI 3.x generado desde Zod, versionado como `backend/openapi.json`, validado en CI, consumible por frontend/MSW/tests de contrato y limitado a documentar el contrato REST MVP ya existente.

La historia queda lista para ejecutar `eventflow-user-story-approval`.

## 2. Diagnóstico PO/BA

La historia es valiosa para el MVP porque reduce drift entre backend, frontend, MSW y QA. Está alineada con PB-P0-005, Doc 16 §43, Doc 20 y Doc 21 §17. La historia no introduce producto nuevo ni endpoints nuevos; habilita una capacidad transversal de contrato y quality gate.

La versión original no era aprobable porque usaba acceptance criteria genéricos, trazabilidad incompleta, decisiones no explicitadas y scope técnico ambiguo. La versión refinada ya define artefacto canónico, comandos esperados, validaciones, seguridad documental, edge cases, QA/CI y Definition of Ready/Done.

## 3. Hallazgos Principales

| Severidad | Hallazgo | Impacto | Recomendación |
| --------- | -------- | ------- | ------------- |
| Alta | Los acceptance criteria originales eran genéricos y no testeaban OpenAPI. | QA no podía derivar pruebas ni detectar drift contractual. | Reescribir ACs alrededor de generación determinista, snapshot versionado, lint, diff CI y componentes comunes. |
| Media | La historia no declaraba el artefacto canónico ni el comportamiento ante drift. | Implementación podía producir YAML/JSON divergentes o documentación manual paralela. | Definir `backend/openapi.json` como snapshot canónico versionado para CI. |
| Media | Trazabilidad insuficiente a PB-P0-005, Doc 16 §43, Doc 20, Doc 21 y ADRs API/testing. | Approval gate no tendría evidencia documental suficiente. | Agregar referencias transversales y ADRs relevantes. |
| Media | Faltaba seguridad documental para evitar exposición de secretos/PII en ejemplos OpenAPI. | Riesgo de filtrar datos sensibles en repositorio. | Agregar reglas SEC/VR para prohibir secretos, tokens, PII y datos seed reales. |
| Baja | No existía DoR/DoD específico. | Dificulta convertir la historia a technical spec y tasks. | Agregar DoR/DoD enfocado en snapshot, CI y documentación local. |

## 4. Validación de Alcance MVP

| Check | Resultado | Comentario |
| ----- | --------- | ---------- |
| No introduce pagos reales | Pass | Solo documenta contrato API existente. |
| No introduce contratos firmados | Pass | No se agregan endpoints de contratos legales ni e-signature. |
| No introduce WhatsApp/chat/push | Pass | No agrega canales ni mensajería. |
| Respeta human-in-the-loop IA | Pass | No invoca IA ni cambia materialización de outputs IA. |
| Respeta backend como source of truth | Pass | OpenAPI documenta security schemes; no reemplaza AuthZ runtime. |
| Respeta seed/demo si aplica | Pass | No requiere cambios de seed/demo. |
| No introduce RAG/vector DB | Pass | No aplica. |
| No introduce multi-tenant enterprise | Pass | No aplica. |
| No introduce P4/Future scope | Pass | Se limita a PB-P0-005. |

## 5. Revisión de Acceptance Criteria

| AC | Calidad | Problema detectado | Acción recomendada |
| -- | ------- | ------------------ | ------------------ |
| AC-01 original | Not Testable | "Capacidad técnica habilitada" no definía artefacto, comando ni resultado. | Reescrito como generación determinista de `openapi.json`. |
| AC-02 original | Needs Detail | "Compatibilidad multi-environment" era demasiado amplio. | Absorbido en CI, drift detection y generación reproducible. |
| AC-01 refinado | Clear | Define OpenAPI 3.x, path, componentes y determinismo. | Aplicado. |
| AC-02 refinado | Clear | Define snapshot versionado y restricciones de secretos/PII. | Aplicado. |
| AC-03 refinado | Clear | Define gate CI de generación, lint y diff. | Aplicado. |
| AC-04 refinado | Clear | Define componentes compartidos y error envelope. | Aplicado. |
| AC-05 refinado | Clear | Define `/api/v1` y security schemes. | Aplicado. |
| AC-06 refinado | Clear | Define documentación local desde snapshot generado. | Aplicado. |

## 6. Gaps Detectados

### Producto / Negocio

Resuelto. El valor quedó vinculado a reducción de drift, readiness de frontend/MSW/QA y evidencia académica.

### Backend / API

Resuelto. Se definió generación desde Zod, registry/metadata OpenAPI, artifact `backend/openapi.json`, common responses, security schemes y prefijo `/api/v1`.

### Frontend / UX

Resuelto. No hay UI de producto; se documentó consumo futuro por MSW/clientes y documentación local/demo.

### Base de Datos

No aplica.

### Seguridad / Autorización

Resuelto. La historia no introduce runtime authorization, pero exige no exponer secretos/PII y documentar security schemes + 401/403 cuando aplique.

### IA / PromptOps

No aplica — esta historia no invoca IA directamente.

### QA / Testing

Resuelto. Se agregaron pruebas funcionales, negativas, contract/CI y casos de drift.

### Seed / Demo

No requiere cambios de seed/demo.

### Documentación / Trazabilidad

Resuelto con una nota de alineación documental no bloqueante sobre `openapi.json` vs `/api/openapi.yaml`.

## 7. Preguntas Pendientes

No pending blocking questions.

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| Product Backlog PB-P0-005 vs Doc 16 §43 | PB-P0-005 indica `openapi.json`; Doc 16 §43 menciona `/api/openapi.yaml`. | Para US-098, `backend/openapi.json` queda como snapshot canónico versionado; YAML puede ser derivado local si se necesita. | Alinear Doc 16 o registrar nota en technical spec para evitar doble fuente de verdad. | No |

## 9. File Update Result

| Campo | Valor |
| ----- | ----- |
| User Story file updated | Yes |
| User Story file path | `management/user-stories/US-098-openapi-snapshot.md` |
| User Story ID verified | Yes |
| Decision Resolution artifact found | No |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-098-decision-resolution.md` |
| Refinement review artifact created/updated | Yes |
| Refinement review path | `management/user-stories/refinement-reviews/US-098-refinement-review.md` |
| Final recommended status | Ready for Approval |
| Next recommended skill | eventflow-user-story-approval |
| Reason | No hay preguntas bloqueantes; las decisiones necesarias ya están en PB-P0-005 y Doc 16 §43. |

## 10. Cambios Aplicados o Recomendados

### Metadata

* Agregado `Backlog Item: PB-P0-005`.
* Ajustado epic a `EPIC-API-001 — REST API Endpoints`.
* Ajustado módulo a `API / Platform`.
* Actualizado `Status` a `Ready for Approval`.
* Actualizado `Last Updated` a `2026-06-15`.

### Business Context

* Reescrito el contexto para explicar drift contractual, Zod como fuente y snapshot versionado.
* Agregados conceptos de `openapi.json`, `zod-to-openapi`, registry, contract drift y lint.
* Agregadas dependencias explícitas con US-092 a US-097 y PB-P0-004.

### PO/BA Decisions Applied

* Agregada sección con decisiones ya formalizadas: generación desde Zod, snapshot en repo, drift detection en CI, Doc 16 como fuente normativa hasta OpenAPI validado y no crear endpoints nuevos.

### Traceability

* Reemplazadas referencias vacías por trazabilidad transversal a PB-P0-005, Doc 16 §43-44, Doc 20, Doc 21 §17 y ADRs API/testing/devops.

### Scope Guardrails

* Agregados límites explícitos para evitar SDKs externos, portal público, endpoints nuevos, GraphQL/gRPC/BFF y scope creep de pagos/chat/WhatsApp/RAG.

### Acceptance Criteria

* Reemplazados ACs genéricos por seis ACs específicos y testeables:
  * Generación determinista.
  * Snapshot versionado.
  * Drift detection en CI.
  * Componentes compartidos.
  * Security schemes y `/api/v1`.
  * Documentación local.

### Technical Notes

* Agregados comandos sugeridos, artifact path, condiciones de determinismo y responsabilidad backend/frontend.

### QA Notes

* Agregados tests funcionales, negativos, contract/CI y escenario de security documentation incompleta.

### Definition of Ready

* Agregada DoR específica para dependencias, herramienta, path canónico y no creación de endpoints.

### Definition of Done

* Agregada DoD verificable para snapshot, CI, components, seguridad documental y README.

### Notes

* Agregada nota `Documentation Alignment Required` no bloqueante para `openapi.json` vs `/api/openapi.yaml`.

## 11. Recomendación Final

`Ready for Approval`.

La historia puede avanzar al approval gate porque no quedan preguntas bloqueantes de PO, Tech Lead, QA ni Seguridad. El alcance está dentro del MVP, no introduce funcionalidades fuera de scope y el único conflicto documental detectado es de alineación de formato/path del artefacto, ya resuelto dentro de la historia con una decisión canónica no contradictoria con ADRs aceptados.
