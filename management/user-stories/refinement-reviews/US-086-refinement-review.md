# User Story Refinement Review — US-086

## Source User Story File
management/user-stories/US-086-admin-reset-demo.md

## Decision Resolution Artifact
management/user-stories/decision-resolutions/US-086-decision-resolution.md

## Review Date
2026-06-22

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                            |
| ------------------------------------------ | --------------------------------------------------------------------- |
| User Story ID                              | US-086                                                                |
| File Path                                  | management/user-stories/US-086-admin-reset-demo.md                    |
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
| Refinement review path                     | management/user-stories/refinement-reviews/US-086-refinement-review.md |

---

## 2. Diagnóstico PO/BA

US-086 entrega el endpoint HTTP `POST /api/v1/admin/seed/reset` que materializa la operación de reset surgical descrita en Doc 11 §29, Doc 14 §10.16 / §11 #46 y Doc 16 §39.2. Es complementaria de US-085 (runner CLI) y permite reiniciar el estado del entorno demo desde la API protegida sin redeploy ni acceso shell al backend, habilitando demos académicas reproducibles y la suite QA E2E sobre datos estables.

En su versión Draft la historia presentaba el patrón de plantilla genérica reutilizada: trazabilidad imprecisa (citaba `BR-SEED-009` que es multi-idioma, no reset), UX de "Layout/Form/Modal/Cancelar" propia de pantallas de usuario que no aplica a un endpoint admin sin UI en este alcance, AC genéricos no testeables, edge cases que no reflejan la semántica del endpoint (`409` por estado inválido era ambiguo), y omisión de los guardarraíles operativos críticos (`SEED_DEMO_ENABLED`, `404` ante flag apagado, filtro `is_seed=true`, `AdminAction`).

El refinamiento normaliza la historia al contexto correcto:

* HTTP endpoint admin protegido por rol + feature flag.
* Filtro surgical por `is_seed=true`.
* Auditoría obligatoria en `AdminAction`.
* Idempotencia verificable y manejo de concurrencia.
* Boundary explícito frente a US-085 / US-087 / US-088 y la futura UI (PB-P3-001 / US-140).

Todas las decisiones aplicadas son derivables de documentación aprobada (FR-SEED-002/007, FR-DEMO-001, BR-SEED-001/002/005/008/010, BR-ADMIN-004/011, BR-PRIVACY-010, NFR-PERF-001, NFR-DEMO-001/002/003, NFR-OBS-001/006, NFR-PRIV-004, NFR-SEC-008, Doc 11 §29, Doc 14 §10.16 / §11 #46, Doc 16 §39, Doc 19 §THR-012, PB-P0-014, PB-P3-001). No se requirieron nuevas decisiones de PO, Tech Lead, QA ni Security.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo                                                                                                                                | Impacto                                                                                | Recomendación                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alta      | Trazabilidad citaba `BR-SEED-009` (multi-idioma) en lugar de los BRs reales del reset (`BR-SEED-001/002/005/008`, `BR-ADMIN-004/011`).   | Cobertura documental rota; QA buscaría reglas erróneas; auditoría AdminAction omitida. | Trazabilidad reescrita con IDs verificados (FR-SEED-002/007, FR-DEMO-001, BR-SEED-001/002/005/008/010, BR-ADMIN-004/011, BR-PRIVACY-010, NFR-PERF-001, NFR-DEMO-001/002/003, NFR-OBS-001, NFR-SEC-008). Aplicado. |
| Alta      | AC originales (`AC-01 Flujo principal`, `AC-02 Persistencia`) son boilerplate no testeables; no reflejan el contrato del endpoint.       | DoD ambiguo; QA no podía derivar pruebas reales del reset.                              | Reescritos 4 AC en GWT cubriendo happy path con `ResetReport`, idempotencia, registro en `AdminAction` y reflejo en `GET /admin/seed/status`. Aplicado.                                          |
| Alta      | EC-01 (`Estado inválido → 409`) era ambiguo y no reflejaba el flujo real del endpoint.                                                  | Pruebas mal alineadas; comportamiento de error indefinido.                              | Reemplazado por 3 edge cases reales: `EC-01` flag apagado → `404`, `EC-02` falla parcial con rollback, `EC-03` concurrencia → `409 seed_reset_in_progress`. Aplicado.                          |
| Alta      | UX/UI (Layout, Form/List/Modal, Cancelar, Skeleton, i18n 4 locales) era ruido de plantilla para un endpoint admin sin UI.                | Backlog técnico inflado; confusión sobre el alcance.                                    | Sección UX marcada `No aplica`; clarificado que el panel admin pertenece a PB-P3-001 / US-140. Aplicado.                                                                                       |
| Alta      | Faltaba el gating crítico por `SEED_DEMO_ENABLED` y el comportamiento `404` ante flag apagado (Doc 19 §THR-012 + PB-P3-001).             | Riesgo de seguridad (endpoint expuesto en `prod`) y fingerprinting.                     | Añadidas `SEC-02`, `SEC-03`, `VR-02`, `EC-01`, `NT-03` y `AUTH-TS-04`. Aplicado.                                                                                                              |
| Alta      | Faltaba el invariante surgical (`solo is_seed=true`) en AC, SEC y QA.                                                                    | Riesgo de borrar datos operativos reales en demo o staging compartido.                  | Añadidos `SEC-04`, `AC-01`, `TS-05` y `SD-T-02` verificando preservación de `is_seed=false`. Aplicado.                                                                                         |
| Alta      | Faltaba el registro obligatorio en `AdminAction` (BR-ADMIN-004/011, NFR-OBS-001).                                                       | Auditoría incompleta; incumplimiento de NFR-OBS-001.                                    | Añadidos `SEC-05`, `AC-03`, `TS-03` y manejo de `SEED_RESET_FAILED` en falla parcial. Aplicado.                                                                                                |
| Media     | Boundary contra US-085/087/088/140 implícito; el lector no sabía qué entrega US-086 vs sus pares.                                       | Riesgo de superposición de alcance entre historias hermanas.                            | `Explicitly Out of Scope`, `Notes` y `Dependencies` enumeran explícitamente los boundaries. Aplicado.                                                                                          |
| Media     | API tabulaba método vacío (`—`) y endpoint sin prefijo de versión.                                                                       | Confusión técnica sobre el contrato del endpoint.                                       | API normalizada a `POST /api/v1/admin/seed/reset` con success `202` y mapa de errores `401/403/404/409/422/500`. Aplicado.                                                                     |
| Media     | Concurrencia no contemplada; dos resets simultáneos podrían generar inconsistencias.                                                    | Riesgo operacional en demo concurrente o E2E paralelos.                                 | Añadido `EC-03` con `409 Conflict` y semáforo a nivel de aplicación. Aplicado.                                                                                                                |
| Baja      | `Last Updated 2026-06-09` desactualizado.                                                                                              | Trazabilidad de la fecha de refinamiento.                                               | Actualizado a 2026-06-22. Aplicado.                                                                                                                                                            |
| Baja      | DoR/DoD eran genéricos.                                                                                                                | Bajo, cosmético.                                                                       | DoR/DoD reescritos con criterios verificables del endpoint. Aplicado.                                                                                                                          |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario                                                                                                  |
| ------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------- |
| No introduce pagos reales            | Pass      | El endpoint opera sobre datos seed; no toca pagos (BR-OOS-001).                                              |
| No introduce contratos firmados      | Pass      | Excluido por BR-OOS-002/003.                                                                                |
| No introduce WhatsApp/chat/push      | Pass      | No aplica.                                                                                                  |
| Respeta human-in-the-loop IA         | Pass      | El endpoint no toma decisiones autónomas; admin dispara explícitamente la acción.                            |
| Respeta backend como source of truth | Pass      | Backend es el único responsable de los deletes/upserts; cliente solo invoca HTTP.                            |
| Respeta seed/demo si aplica          | Pass      | Es exactamente la operación de reset surgical sobre datos seed.                                             |
| No introduce RAG/vector DB           | Pass      | No aplica.                                                                                                  |
| No introduce multi-tenant enterprise | Pass      | No aplica.                                                                                                  |
| No introduce P4/Future scope         | Pass      | La UI admin pertenece a PB-P3-001 / US-140 (fuera de alcance MVP en esta historia).                          |

---

## 5. Revisión de Acceptance Criteria

| AC    | Calidad | Problema detectado                                       | Acción recomendada                                                                                          |
| ----- | ------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| AC-01 | Clear   | Cubre happy path con `ResetReport` y filtro surgical.    | Aplicado.                                                                                                   |
| AC-02 | Clear   | Cubre idempotencia (BR-SEED-001).                        | Aplicado.                                                                                                   |
| AC-03 | Clear   | Cubre auditoría obligatoria (BR-ADMIN-004/011, NFR-OBS-001). | Aplicado.                                                                                                |
| AC-04 | Clear   | Cubre reflejo en `GET /admin/seed/status`.              | Aplicado.                                                                                                   |
| EC-01 | Clear   | Flag apagado → `404`.                                    | Aplicado.                                                                                                   |
| EC-02 | Clear   | Falla parcial con rollback por lote.                     | Aplicado.                                                                                                   |
| EC-03 | Clear   | Concurrencia → `409 seed_reset_in_progress`.             | Aplicado.                                                                                                   |

---

## 6. Gaps Detectados

### Producto / Negocio

* Boundary explícito frente a US-085, US-087, US-088 y la futura UI (PB-P3-001 / US-140) documentado en `Explicitly Out of Scope` y `Notes`.

### Backend / API

* `ResetDemoUseCase` (Doc 14 §11 #46) documentado con secuencia operativa: verificar flag → lock → deletes por lotes → repoblado vía `SeedDemoDataUseCase` → `AdminAction` → liberar lock.
* `SeedDemoController` (Doc 14 §10.16, Doc 16 §39.2) registra la ruta condicionalmente.
* DTO `ResetReport` documentado con `entitiesDeleted`, `entitiesReseeded`, `seedVersion`, `correlationId`, `durationMs`.
* Manejo explícito de concurrencia con semáforo y `409`.

### Frontend / UX

No aplica.

### Base de Datos

* Confirmar índice sobre `is_seed` (US-101) para acelerar deletes.
* `AdminAction` ya cubierta por índices existentes (Doc 14 §13).

### Seguridad / Autorización

* Rol `admin` + feature flag `SEED_DEMO_ENABLED=true` aplican como doble gate (Doc 14 §10.16, Doc 19 §THR-012).
* Respuesta `404` ante flag apagado mitigando fingerprinting.
* Sin secretos en `ResetReport`, logs ni `AdminAction` (NFR-SEC-008).

### IA / PromptOps

No aplica directamente; las `AIRecommendation` se siembran durante el repoblado vía `SeedDemoDataUseCase` (definido en US-085).

### QA / Testing

* Tests de integración cubriendo happy path, idempotencia, surgical, auditoría, falla parcial, concurrencia, autorización.
* Test de preservación de filas `is_seed=false`.

### Seed / Demo

* La historia es el habilitador HTTP de la operación de reset surgical; aplica BR-SEED-001/002/005/008/010 y NFR-DEMO-001..003.

### Documentación / Trazabilidad

* Trazabilidad actualizada con IDs verificados.
* Eliminada referencia incorrecta a `BR-SEED-009` (multi-idioma).
* Documentos referenciados: Doc 3, Doc 11, Doc 14, Doc 16, Doc 19, PB-P0-014.

---

## 7. Preguntas Pendientes

No pending blocking questions.

Todas las decisiones aplicadas son derivables de:

* FR-SEED-002, FR-SEED-007, FR-DEMO-001 (Doc 9).
* BR-SEED-001, BR-SEED-002, BR-SEED-005, BR-SEED-008, BR-SEED-010, BR-ADMIN-004, BR-ADMIN-011, BR-PRIVACY-010 (Doc 4).
* NFR-PERF-001, NFR-DEMO-001/002/003, NFR-OBS-001/006, NFR-PRIV-004, NFR-SEC-008 (Doc 10).
* Doc 11 §29 — Estrategia de reset surgical filtrada por `is_seed=true`.
* Doc 14 §10.16 / §11 #46 — `ResetDemoUseCase`, módulo `seed-demo`, flag `SEED_DEMO_ENABLED`.
* Doc 16 §39 — Contrato `POST /admin/seed/reset` (`202 / 401 / 403 / 422`).
* Doc 19 §THR-012, §9.2 — Mitigaciones de seed/demo y autorización admin.
* PB-P0-014 (US-086 listada como Related User Story).
* PB-P3-001 — UI admin para reset (fuera de alcance de US-086).

---

## 8. Documentation Alignment Required

No documentation alignment issues detected.

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| —                  | —                   | —                | —                  | No                   |

Nota: PB-P3-001 menciona "Endpoint admin de reset del entorno Demo" con dependencia `PB-P0-014, PB-P2-022..024`; se interpreta como la UI admin que dispara el endpoint entregado en US-086 (esta historia). No genera bloqueo: PB-P0-014 explícitamente lista US-086 como Related User Story.

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                    |
| User Story file path                       | `management/user-stories/US-086-admin-reset-demo.md`                                   |
| User Story ID verified                     | Yes (US-086)                                                                           |
| Decision Resolution artifact found         | No                                                                                     |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-086-decision-resolution.md` (no existe)|
| Refinement review artifact created/updated | Yes                                                                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-086-refinement-review.md`               |
| Final recommended status                   | Ready for Approval                                                                     |
| Next recommended skill                     | eventflow-user-story-approval                                                          |
| Reason                                     | Refinamiento completado sin decisiones bloqueantes; trazabilidad, AC y guardarraíles ajustados al contexto real del endpoint admin. |

---

## 10. Cambios Aplicados o Recomendados

### Metadata

* `Status: Draft → Ready for Approval`.
* `Last Updated: 2026-06-22`.
* `Backlog Item: PB-P0-014 — Seed Script Idempotente + Datos Demo` añadido.
* `Module / Domain: seed-demo (Backend, transversal de escritura controlada)` precisado per Doc 14 §10.16.
* `User Role: Admin (Product Owner / operador de demo) + Sistema (flag)` precisado.
* `Sprint / Milestone: MVP — Foundation P0` añadido.

### Business Context

* `Context Summary` reescrito describiendo el endpoint HTTP y su relación con `ResetDemoUseCase`, `SeedDemoController` y `AdminAction`.
* `Related Domain Concepts` enumera entidades con `is_seed=true`, use cases, controller, `AdminAction`, jobs y flag.
* `Assumptions` explícitas (US-085 provee siembra, US-099/100 proveen `is_seed`, `SEED_DEMO_ENABLED=false` por defecto en `prod`, sin PII).
* `Dependencies` documenta US-085, US-087, US-088, US-099, US-100, PB-P0-002 y boundary con PB-P3-001 / US-140.

### PO/BA Decisions Applied

* Sección añadida con decisiones derivables ya formalizadas (surgical, `404` ante flag apagado, auditoría obligatoria, síncrono dentro del timeout estándar, sin UI en este alcance).

### Traceability

* FR: FR-SEED-002, FR-SEED-007, FR-DEMO-001.
* BR: BR-SEED-001, BR-SEED-002, BR-SEED-005, BR-SEED-008, BR-SEED-010, BR-ADMIN-004, BR-ADMIN-011, BR-PRIVACY-010.
* NFR: NFR-PERF-001, NFR-DEMO-001/002/003, NFR-OBS-001/006, NFR-PRIV-004, NFR-SEC-008.
* ADR: ADR-DEVOPS-003/004/006.
* Docs: `/docs/3 §7.16/§14.4`, `/docs/11 §29`, `/docs/14 §10.16 / §11 #46`, `/docs/16 §39`, `/docs/19 §THR-012 / §9.2`, `PB-P0-014`.
* Eliminada referencia incorrecta a `BR-SEED-009`.

### Scope Guardrails

* `In Scope` explícito: `ResetDemoUseCase`, endpoint, gating por flag + rol, filtro `is_seed=true`, repoblado idempotente, `AdminAction`, `202` + `ResetReport`, `404` ante flag apagado.
* `Explicitly Out of Scope`: UI admin (US-140 / PB-P3-001), datos `is_seed=false`, resets parciales por entidad, snapshots/backups, ejecución en `prod`.

### Acceptance Criteria

* Reescritos los AC originales por 4 AC GWT testeables (AC-01..04).
* EC-01/NT-01 originales reemplazados por 3 edge cases reales del endpoint (EC-01..03).

### Technical Notes

* Backend: `ResetDemoUseCase` con secuencia operativa, `SeedDemoController`, DTO `ResetReport`, política de autorización + flag, validación Zod `strict()`, transacciones por lote.
* Frontend: `No aplica`.
* Database: filtro `WHERE is_seed = true`, índices recomendados, `AdminAction`.
* API: `POST /api/v1/admin/seed/reset` con success `202` y mapa de errores `401/403/404/409/422/500`.
* Observability: `correlationId`, logs estructurados `seed.reset.{started,completed,failed}`, `AdminAction` obligatorio, métricas opcionales.

### QA Notes

* Functional Tests TS-01..05 reescritos.
* Negative Tests NT-01..06 reescritos al contexto HTTP.
* AI Tests: `No aplica`.
* Authorization Tests AUTH-TS-01..04 cubriendo doble gate (rol + flag).
* Seed/Demo Tests SD-T-01..02 añadidos.

### Definition of Ready

* Checklist completado salvo `PO/BA validó` (queda para el Approval Gate).

### Definition of Done

* Reescrita reflejando criterios verificables del endpoint: filtro surgical, idempotencia, auditoría, concurrencia, observabilidad, tests verdes.

### Notes

* Boundary explícito vs US-085, US-087, US-088 y PB-P3-001 / US-140.
* Documentación del `404` ante flag apagado para evitar reportes falsos de bug.
* Integración del endpoint en el harness QA E2E (PB-P2-016).

---

## 11. Recomendación Final

**Ready for Approval.**

US-086 quedó alineada con la estrategia de reset surgical (Doc 11 §29), el diseño técnico del módulo `seed-demo` (Doc 14 §10.16 / §11 #46), el contrato API (Doc 16 §39) y las mitigaciones de seguridad seed/demo (Doc 19 §THR-012). Todas las decisiones aplicadas se derivan de documentación aprobada; no hay decisiones de PO, Tech Lead, QA ni Security pendientes. Próximo paso: ejecutar `eventflow-user-story-approval` sobre el archivo refinado.

---

User Story file updated: Yes
Path: management/user-stories/US-086-admin-reset-demo.md
Status: Ready for Approval
Next step: Run `eventflow-user-story-approval`.
