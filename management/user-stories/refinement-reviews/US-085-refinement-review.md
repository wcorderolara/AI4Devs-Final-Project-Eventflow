# User Story Refinement Review — US-085

## Source User Story File
management/user-stories/US-085-run-seed-script.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-085-decision-resolution.md

## Review Date
2026-06-22

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                            |
| ------------------------------------------ | --------------------------------------------------------------------- |
| User Story ID                              | US-085                                                                |
| File Path                                  | management/user-stories/US-085-run-seed-script.md                     |
| Backlog Item                               | PB-P0-014 — Seed Script Idempotente + Datos Demo                      |
| Epic                                       | EPIC-SEED-001 — Seed Data & Demo Scenarios                            |
| Estado actual                              | Draft → Ready for Approval                                            |
| Estado recomendado                         | Ready for Approval                                                    |
| Nivel de riesgo                            | Bajo                                                                  |
| Calidad general                            | Alta (después de refinamiento)                                        |
| Requiere decisión PO                       | No                                                                    |
| Requiere decisión técnica                  | No                                                                    |
| Requiere decisión QA                       | No                                                                    |
| Requiere decisión Seguridad                | No                                                                    |
| Decision Resolution artifact found         | No                                                                    |
| User Story file updated                    | Yes                                                                   |
| Refinement review artifact created/updated | Yes (este archivo — evidencia post-refinamiento, no bloqueante)       |
| Refinement review path                     | management/user-stories/refinement-reviews/US-085-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-085 representa el runner del seed reproducible, una de las foundations P0 del MVP de EventFlow. Su valor de entrega es claro: sin un CLI único e idempotente, ni la demo guiada (UC-DEMO-001), ni la suite E2E sobre seed (PB-P2-016), ni la evaluación académica reproducible son viables. La historia está correctamente clasificada como `Must Have` y alineada con EPIC-SEED-001 y PB-P0-014.

En su versión Draft la historia presentaba un patrón de plantilla genérica que reutilizaba secciones diseñadas para historias de endpoints HTTP (autorización por rol, códigos 403, validaciones DTO Zod sobre request bodies, layout/route frontend) que no aplican a un CLI ejecutado por un developer u operador de demo. El refinamiento normalizó la historia al contexto correcto: un script CLI con gating por variables de entorno y reglas operativas, alineado con Doc 14 §10.16 (módulo `seed-demo`, flag `SEED_DEMO_ENABLED`).

Todas las decisiones necesarias se derivan de fuentes ya aprobadas (FR-SEED-001..007, BR-SEED-001..009, NFR-DEMO-001..006, Doc 11, Doc 14 §10.16, PB-P0-014). No se requirieron nuevas decisiones de PO, Tech Lead, QA ni Security.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                          | Impacto                                                                                  | Recomendación                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | AC originales (`AC-01 Flujo principal`, `AC-02 Persistencia`) son boilerplate no testeables; no reflejan invariantes BR-SEED-001/002/005/006. | QA no puede derivar tests; DoD ambiguo; riesgo de aceptación sin verificación real.       | Reemplazados por 6 AC específicos en GWT cubriendo idempotencia, volúmenes, `is_seed`, catálogos cerrados, determinismo IA y `SeedReport`. Aplicado.                                |
| Alta      | EC-01 (`Estado inválido → 409`) y NT-01 (`Sin permisos → 403`) describen comportamiento HTTP que no aplica a un CLI.                | Aceptación incorrecta; QA construiría tests de endpoint inexistente.                     | Reemplazados por edge cases reales del CLI: DB inaccesible (exit 1), migraciones pendientes (exit 2), `SEED_DEMO_ENABLED` ausente (exit 2), falla parcial con rollback. Aplicado.    |
| Alta      | Trazabilidad inventaba `BR-SEED-001..010` (no existe `010`) y refería a un único `FR-SEED-001`, omitiendo FR-SEED-002..007 y NFR-DEMO-001..006. | Trazabilidad rota; cobertura de invariantes documentales incompleta.                     | Trazabilidad reescrita con IDs verificados (FR-SEED-001..007, FR-DEMO-003, BR-SEED-001..009, NFR-DEMO-001..006, ADR-DEVOPS-003/004/006). Aplicado.                                  |
| Alta      | `npm run seed` aparecía como `API Endpoint` y la sección API tabulaba un método; no es un endpoint HTTP.                          | Confusión sobre el tipo de entrega (CLI vs API).                                          | API marcada como `No aplica`; clarificado que el endpoint admin pertenece a US-086 (`SeedDemoController`). Aplicado.                                                                |
| Alta      | Frontend/UX (route, formularios RHF + Zod, skeleton, banner inline) era ruido de plantilla.                                       | Backlog técnico inflado con tareas inexistentes.                                          | Sección UX marcada como `No aplica — CLI`. Aplicado.                                                                                                                               |
| Media     | Sección `AI Behavior` decía "no invoca IA" pero FR-SEED-006 exige sembrar `AIRecommendation` deterministas del `MockAIProvider`.   | Cobertura AI seed quedaría omitida en QA.                                                | Sección AI reescrita: el seed siembra `AIRecommendation` con `accepted=true` para AI-001..AI-008 con `MockAIProvider` determinista (BR-AI-005/006, NFR-AI-008). Aplicado.            |
| Media     | Boundary contra US-086/087/088 implícito; lector no sabía qué entrega US-085 vs sus pares.                                         | Riesgo de superposición de alcance entre historias hermanas del backlog.                  | `Explicitly Out of Scope` enumera explícitamente lo que pertenece a US-086 (endpoint admin), US-087 (event mix) y US-088 (`confirmed_intent`). Aplicado.                            |
| Media     | Faltaba gating por entorno; un script seed sin guardarrail puede ejecutarse en producción.                                         | Riesgo operacional/seguridad (BR-PRIVACY-010, NFR-SEC-008).                              | Añadidas reglas SEC-02/03/04, VR-02, EC-03 y NT-02 exigiendo `SEED_DEMO_ENABLED=true` y `NODE_ENV !== production`. Derivable directamente de Doc 14 §10.16. Aplicado.                |
| Baja      | `Permission Rule: Según rol System / Developer` y `AUTH-TS-01/02` reflejaban autorización HTTP que no aplica.                       | Bajo (cosmético) pero generaba ruido en backlog.                                          | Eliminadas pruebas de autorización HTTP; clarificado que el control es por env del operador. Aplicado.                                                                              |
| Baja      | `Last Updated 2026-06-09` desactualizado.                                                                                          | Trazabilidad de la fecha de refinamiento.                                                | Actualizado a 2026-06-22. Aplicado.                                                                                                                                                |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                  |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | El seed no toca pagos; sólo simula `BookingIntent.confirmed_intent` per BR-BOOKING-* / BR-OOS-001..003.       |
| No introduce contratos firmados      | Pass      | Excluido por BR-OOS-002.                                                                                    |
| No introduce WhatsApp/chat/push      | Pass      | Excluido por BR-NOTIF-006 / BR-OOS-004/006/017.                                                              |
| Respeta human-in-the-loop IA         | Pass      | Las `AIRecommendation` sembradas reflejan estados validados por humano (`accepted=true`).                   |
| Respeta backend como source of truth | Pass      | El backend es el único responsable de inserción; CLI ejecutado contra el backend.                            |
| Respeta seed/demo si aplica          | Pass      | Es exactamente la historia que materializa la estrategia seed.                                                |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                  |
| No introduce multi-tenant enterprise | Pass      | No aplica.                                                                                                  |
| No introduce P4/Future scope         | Pass      | El reset administrativo HTTP queda fuera (US-086). El `AnthropicProvider` permanece stub (Doc 8.1 §5).        |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad        | Problema detectado                                       | Acción recomendada                                                                                          |
| ----- | -------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| AC-01 | Clear          | Idempotencia explícita ya cubierta por AC-02.            | Mantenido como happy path principal con volúmenes y `exit code 0`. Aplicado.                                |
| AC-02 | Clear          | Verifica la invariante crítica BR-SEED-001/NFR-DEMO-003. | Mantenido como re-ejecución idempotente, sin duplicados, conteos invariantes.                                |
| AC-03 | Clear          | Cubre BR-SEED-005 (`is_seed=true`).                      | Verifica 100% de registros sembrados con `is_seed=true`.                                                     |
| AC-04 | Clear          | Cubre catálogos cerrados (NFR-DEMO-005, BR-SEED-004/009).| Verifica `EventType`, `ServiceCategory`, `Language` y `Currency`.                                            |
| AC-05 | Clear          | Cubre FR-SEED-006 + determinismo IA.                     | Verifica `AIRecommendation` sembradas para AI-001..AI-008 con `MockAIProvider`.                              |
| AC-06 | Clear          | Cubre observabilidad mínima del runner (NFR-OBS-006).    | Verifica `correlationId`, conteos por dominio y `durationMs` en `SeedReport`.                                |
| EC-01 | Clear          | DB inaccesible; `exit code 1`.                           | Aplicado.                                                                                                   |
| EC-02 | Clear          | Migraciones pendientes; `exit code 2`.                   | Aplicado.                                                                                                   |
| EC-03 | Clear          | Flag/entorno productivo; `exit code 2`.                  | Aplicado.                                                                                                   |
| EC-04 | Clear          | Falla parcial; rollback por lote.                        | Aplicado.                                                                                                   |

---

## 6. Gaps Detectados

### Producto / Negocio

* Boundary explícito frente a US-086, US-087, US-088 ahora documentado en `Explicitly Out of Scope` y en `Notes`.

### Backend / API

* Entry point CLI `apps/api/src/scripts/seed.ts` documentado.
* `package.json` debe exponer `"seed": "tsx src/scripts/seed.ts"` (o equivalente runtime TS).
* `prisma.$transaction` por lote para consistencia ante falla parcial.

### Frontend / UX

No aplica.

### Base de Datos

* `is_seed` confirmado en todas las entidades del Data Model (US-099/US-100).
* Índices por `is_seed` y claves naturales (US-101).

### Seguridad / Autorización

* Gating por env (`SEED_DEMO_ENABLED=true`, `NODE_ENV !== production`) explícitamente documentado.
* Sin PII real (BR-PRIVACY-010, NFR-PRIV-004, NFR-SEC-008).

### IA / PromptOps

* Respuestas deterministas del `MockAIProvider` para AI-001..AI-008 (BR-AI-005/006, NFR-AI-008).

### QA / Testing

* Cobertura de tests definida (integration, negativos, determinismo IA, seed/demo).
* Test cruzado con US-088 para verificar `≥1 confirmed_intent` y ≥1 review verificada.

### Seed / Demo

* Esta es la historia de seed; aplican BR-SEED-001..009.

### Documentación / Trazabilidad

* Trazabilidad actualizada con IDs verificados en FR/BR/NFR/ADR/Docs.
* Eliminadas referencias a IDs inexistentes (`BR-SEED-010`, endpoint HTTP en US-085).

---

## 7. Preguntas Pendientes

No pending blocking questions.

Todas las decisiones aplicadas son derivables de:

* FR-SEED-001..007 (Doc 9).
* BR-SEED-001..009 (Doc 4).
* NFR-DEMO-001..006, NFR-AI-008, NFR-OBS-006, NFR-PRIV-004, NFR-SEC-008 (Doc 10).
* Doc 11 — Data Seed Strategy.
* Doc 14 §10.16 / §11 #45 — módulo `seed-demo`, flag `SEED_DEMO_ENABLED`.
* PB-P0-014 — Seed Script Idempotente + Datos Demo.

---

## 8. Documentation Alignment Required

No documentation alignment issues detected.

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| —                  | —                   | —                | —                  | No                   |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                    |
| User Story file path                       | `management/user-stories/US-085-run-seed-script.md`                                    |
| User Story ID verified                     | Yes (US-085)                                                                           |
| Decision Resolution artifact found         | No                                                                                     |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-085-decision-resolution.md` (no existe)|
| Refinement review artifact created/updated | Yes                                                                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-085-refinement-review.md`               |
| Final recommended status                   | Ready for Approval                                                                     |
| Next recommended skill                     | eventflow-user-story-approval                                                          |
| Reason                                     | Refinamiento completado sin decisiones bloqueantes; trazabilidad y AC ajustados.       |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* `Status: Draft → Ready for Approval`.
* `Last Updated: 2026-06-22`.
* `Backlog Item: PB-P0-014` añadido.
* `Module / Domain: seed-demo (Backend, transversal)` precisado per Doc 14 §10.16.
* `User Role` clarificado como `Developer / Demo Runner (operador local o de CI)`.

### Business Context

* Reformulado `Context Summary` describiendo el runner CLI vs el endpoint admin (US-086).
* `Related Domain Concepts` enumera entidades con `is_seed=true` y use cases (`SeedDemoDataUseCase`).
* `Assumptions` explícitas (DB accesible, migraciones aplicadas, `MockAIProvider`, sin PII).
* `Dependencies` documenta US-086/087/088/099/100 y PB-P0-001/002/014.

### PO/BA Decisions Applied

No se introdujeron nuevas decisiones de PO; sólo se aplicaron decisiones ya formalizadas en FR/BR/NFR/Doc 11/Doc 14.

### Traceability

* FR: FR-SEED-001..007, FR-DEMO-003.
* BR: BR-SEED-001..009, BR-PRIVACY-010.
* NFR: NFR-DEMO-001/002/003/005, NFR-AI-008, NFR-OBS-006, NFR-PRIV-004, NFR-SEC-008.
* ADR: ADR-DEVOPS-003/004/006.
* Docs: `/docs/3 §7.16/§14.4`, `/docs/11`, `/docs/14 §10.16/§11 #45`, `PB-P0-014`.
* Eliminada referencia inexistente `BR-SEED-010`.

### Scope Guardrails

* `In Scope` explícito (CLI, idempotencia, `is_seed`, volúmenes BR-SEED-002, coherencia LATAM, gating por env).
* `Explicitly Out of Scope` enumera endpoint HTTP (US-086), event mix (US-087), `confirmed_intent` (US-088), migraciones (US-100), conversión de moneda (BR-OOS-015) y todos los P4/Future.

### Acceptance Criteria

* Reescritos los AC originales por 6 AC GWT testeables + 4 edge cases reales del CLI (DB, migraciones, env, falla parcial).

### Technical Notes

* Backend: `SeedDemoDataUseCase`, entry point `apps/api/src/scripts/seed.ts`, script `package.json`, transacciones por lote, `upsert` con claves naturales.
* Frontend: `No aplica`.
* Database: tablas, constraints y soft delete documentados.
* API: `No aplica` (endpoint HTTP pertenece a US-086).
* Observability: `correlationId`, logs estructurados, `SeedReport`.

### QA Notes

* Functional Tests TS-01..TS-06 reescritos.
* Negative Tests NT-01..NT-05 reescritos al contexto CLI.
* AI Tests AI-T-01 añadido (determinismo).
* Authorization Tests: `No aplica`.
* Seed/Demo Tests SD-T-01/02 añadidos.

### Definition of Ready

* Checklist completado salvo `PO/BA validó` (queda para el Approval Gate).

### Definition of Done

* Reescrita reflejando criterios verificables del CLI, idempotencia, `is_seed`, catálogos, `SeedReport` y tests verdes.

### Notes

* Aclara boundary contra US-086, US-087, US-088 y la base operativa que esta historia provee para PB-P2-016.

---

## 11. Recomendación Final

**Ready for Approval.**

US-085 quedó alineada con la estrategia seed documentada (Doc 11), el diseño técnico del módulo `seed-demo` (Doc 14 §10.16) y las invariantes BR-SEED-001..009 / NFR-DEMO-001..006. Todas las decisiones aplicadas se derivan de documentación aprobada; no hay decisiones de PO, Tech Lead, QA ni Security pendientes. Próximo paso: ejecutar `eventflow-user-story-approval` sobre el archivo refinado.

---

User Story file updated: Yes
Path: management/user-stories/US-085-run-seed-script.md
Status: Ready for Approval
Next step: Run `eventflow-user-story-approval`.
