# User Story Refinement Review — US-101

> **Carácter del artefacto:** Evidencia de refinamiento **no bloqueante**. La User Story fue actualizada en su archivo original porque no quedaron decisiones bloqueantes pendientes (todas las decisiones de boundary fueron formalizadas previamente en DR-099 y DR-100).

## Source User Story File

`management/user-stories/US-101-critical-indexes.md`

## Decision Resolution Artifact

`management/user-stories/decision-resolutions/US-101-decision-resolution.md` — **No existe** (no fue necesario). Las decisiones aplicables se heredan de:

* `management/user-stories/decision-resolutions/US-099-decision-resolution.md` (Decisión 1 — alcance US-099 vs US-100/101/102).
* `management/user-stories/decision-resolutions/US-100-decision-resolution.md` (Decisión 1 / Q1 — boundary raw SQL: US-101 índices funcionales/GIN/parciales; US-102 unique parciales y checks).

## Review Date

2026-06-10

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ----------------------------------------------------------------- |
| User Story ID                              | US-101                                                            |
| File Path                                  | `management/user-stories/US-101-critical-indexes.md`              |
| Backlog Item                               | PB-P0-001 — Database Schema, Migrations & Constraints             |
| Epic                                       | EPIC-DB-001 — Database & Prisma Physical Model                    |
| Estado actual                              | Ready for Approval (tras refinamiento; antes: Draft)              |
| Estado recomendado                         | Ready for Approval                                                |
| Nivel de riesgo                            | Bajo                                                              |
| Calidad general                            | Alta (tras refinamiento; la versión original era Baja)            |
| Requiere decisión PO                       | No                                                                |
| Requiere decisión técnica                  | No (riesgo drift Prisma documentado como EC-01, validable en PR)  |
| Requiere decisión QA                       | No                                                                |
| Requiere decisión Seguridad                | No                                                                |
| Decision Resolution artifact found         | No (heredadas de DR-099 / DR-100)                                 |
| User Story file updated                    | Yes                                                               |
| Refinement review artifact created/updated | Yes (evidencia, no bloqueante)                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-101-refinement-review.md` |

---

## 2. Diagnóstico PO/BA

La versión original de US-101 era un stub genérico de template: el título mencionaba índices críticos pero los Acceptance Criteria hablaban de "capacidad técnica habilitada", validación de env vars al boot y healthcheck — contenido copiado de historias de bootstrap, sin relación con índices. No era testable, no enumeraba ningún índice y citaba un NFR inexistente (`NFR-PERF-API-001`).

El valor de negocio sí existe y es claro: sin índices críticos, los listados, bandejas, jobs de expiración/cierre y el reset de seed degradan a sequential scans, comprometiendo NFR-PERF-001 (P95 < 1.5 s, Should Have) y NFR-PERF-005 (directorio usable, **Must Have**). La historia es pieza obligatoria del cierre de PB-P0-001.

El refinamiento fue posible sin preguntas bloqueantes porque el boundary completo ya estaba formalizado: DR-099 Decisión 1 y DR-100 Decisión 1 establecen que US-101 entrega raw SQL para índices funcionales / GIN / parciales, US-102 entrega unique parciales + checks, y los `@@index` simples pertenecen al schema declarativo de US-099. El catálogo canónico de índices existe en Doc 18 §25, con política de creación en §25.1, índices `is_seed` en §27.5 y política raw SQL en §28.3.

---

## 3. Hallazgos Principales

| Severidad | Hallazgo | Impacto | Recomendación |
| --------- | -------- | ------- | ------------- |
| Alta | Los AC originales no describían índices: eran boilerplate de bootstrap (env vars, boot, healthcheck). | Historia no testable ni implementable; QA sin criterio de verificación. | **Aplicado:** AC-01..AC-08 reescritos contra el catálogo Doc 18 §25 con verificación vía `pg_indexes`. |
| Alta | Traceability citaba `NFR-PERF-API-001`, ID inexistente en Doc 10 (los reales son NFR-PERF-001..006). | Trazabilidad falsa; viola la regla "no fake IDs". | **Aplicado:** corregido a NFR-PERF-001, NFR-PERF-005, NFR-DEMO-003, NFR-OBS-001. |
| Media | Faltaba el campo `Backlog Item` (PB-P0-001) en Metadata y el boundary con US-099/US-100/US-102. | Riesgo de duplicar trabajo (unique parciales) u omitirlo (índices `is_seed`). | **Aplicado:** Metadata completada; sección `PO/BA Decisions Applied` documenta el boundary heredado de DR-099/DR-100. |
| Media | Ambigüedad de ownership de `uq_users_email_lower` (funcional **y** único): ¿US-101 o US-102? | Riesgo de que ninguna historia lo entregue o ambas lo dupliquen. | **Aplicado:** clasificado como índice funcional (categoría #3 de Doc 18 §28.3) → US-101. Derivación documentada en la historia. |
| Media | Riesgo técnico: `prisma migrate diff --exit-code` (job de US-100) puede reportar falso drift por índices raw SQL no representables en Prisma Schema Language. | El job CI de drift podría bloquear el PR de US-101. | **Aplicado:** documentado como EC-01 con handling (validar en PR; ajuste documentado del job sin desactivar drift detection global). No bloquea refinamiento. |
| Baja | Secciones de template con ruido irrelevante (SEC "middleware de seguridad", KPI "time-to-deploy", UX "aplica si tiene UI"). | Confunde al implementador y a QA. | **Aplicado:** secciones reescritas o marcadas `No aplica` explícitamente. |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario |
| ------------------------------------ | --------- | ---------- |
| No introduce pagos reales            | Pass      | Capa física de persistencia. |
| No introduce contratos firmados      | Pass      | — |
| No introduce WhatsApp/chat/push      | Pass      | — |
| Respeta human-in-the-loop IA         | N/A       | No invoca IA; índices sobre `ai_recommendations` solo soportan jobs/auditoría. |
| Respeta backend como source of truth | Pass      | No introduce lógica de autorización. |
| Respeta seed/demo si aplica          | Pass      | Entrega los índices `is_seed` que habilitan el reset quirúrgico (Doc 18 §27.5, NFR-DEMO-003). |
| No introduce RAG/vector DB           | Pass      | GIN/trigram explícitamente diferido (Doc 18 §25.1); sin `pg_trgm`. |
| No introduce multi-tenant enterprise | Pass      | — |
| No introduce P4/Future scope         | Pass      | El único candidato Future (índice trigram) queda diferido y requiere decisión PO + evidencia de latencia. |

---

## 5. Revisión de Acceptance Criteria

Evaluación de los AC **originales** (versión Draft) y acción aplicada:

| AC | Calidad | Problema detectado | Acción recomendada |
| --- | --- | --- | --- |
| AC-01 (original: "Capacidad técnica habilitada") | Not Testable | Genérico; no menciona índices ni criterio verificable. | **Reescrito** como AC-01 (migration raw SQL aplicable, comentada, timestamp correcto). |
| AC-02 (original: "Compatibilidad multi-environment") | Not Testable | "Funciona consistentemente" sin criterio. | **Reemplazado** por AC-06/AC-07 (idempotencia `migrate deploy` + jobs CI verdes). |
| EC-01 (original: "Configuración faltante / env var") | Out of Scope | Las migrations no validan env vars al boot; eso es bootstrap (PB-P0-002). | **Eliminado**; reemplazado por edge cases reales (drift Prisma, locks, ordering, duplicados). |

AC resultantes (AC-01..AC-08): específicos, testables vía `pg_indexes` / CI, cubren happy path (creación, unicidad funcional, parciales, `is_seed`, inventario, idempotencia), negativos (NT-01..NT-06) y boundary (AC-08: sin artefactos de US-102/GIN).

---

## 6. Gaps Detectados

### Producto / Negocio

Resuelto: valor articulado contra NFR-PERF-001/005 y reset demo. No aplica gap restante.

### Backend / API

No aplica — sin endpoints. Nota README backend (sección Database Migrations) incluida como tarea.

### Frontend / UX

No aplica.

### Base de Datos

Resuelto: catálogo exacto (1 funcional + 12 parciales + `is_seed` por tabla operativa) con definiciones literales de Doc 18 §25; verificación de inventario con exclusiones explícitas (4 unique parciales → US-102; GIN trigram diferido).

### Seguridad / Autorización

Resuelto: reglas heredadas de US-100 (sin secretos en migration, ejecución vía pipeline). Sin runtime authorization.

### IA / PromptOps

No aplica.

### QA / Testing

Resuelto: TS-01..TS-08 + NT-01..NT-06; extensión del smoke CI de US-100 con inventario de índices.

### Seed / Demo

Resuelto: índices `is_seed` parciales en todas las tablas operativas (Doc 18 §27.5). No requiere cambios de seed/demo adicionales (el seed real pertenece a EPIC-SEED-001).

### Documentación / Trazabilidad

Resuelto: NFR inexistente corregido; trazabilidad a Doc 16/18/20/21/22, ADR-DB-001, ADR-DB-005; BRs citados solo como soporte de consulta (sin enforcement, que es de US-102).

---

## 7. Preguntas Pendientes

```text
No pending blocking questions.
```

Todas las decisiones de boundary estaban formalizadas en DR-099 (Decisión 1) y DR-100 (Decisión 1/Q1) y en las secciones `PO/BA Decisions Applied` de US-099/US-100 aprobadas. No se re-preguntaron.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| Doc 18 §35.2 | Describe la baseline `20260601000000_init` incluyendo raw SQL de índices (ya rastreado por US-100). | Split aprobado: baseline schema-only (US-100), índices raw SQL (US-101), constraints (US-102). | Amendar Doc 18 §35.2 post-merge (ya tracked en US-100). | No |
| Doc 18 §25 vs §25.1 | §25 lista `idx_vendor_profiles_business_name_trgm` como "gin/trigram opcional" mientras §25.1 lo declara out of scope inicial. | US-101 formaliza el diferimiento (sin `pg_trgm`, sin GIN); promoción futura requiere decisión PO + evidencia de latencia. | Amendar §25 para marcar el índice trigram como diferido post-MVP. | No |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                     |
| User Story file path                       | `management/user-stories/US-101-critical-indexes.md`                                    |
| User Story ID verified                     | Yes (US-101, preservado)                                                                |
| Decision Resolution artifact found         | No (decisiones heredadas de DR-099 / DR-100)                                            |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-101-decision-resolution.md` (no requerido) |
| Refinement review artifact created/updated | Yes (evidencia no bloqueante)                                                           |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-101-refinement-review.md`                |
| Final recommended status                   | Ready for Approval                                                                      |
| Next recommended skill                     | eventflow-user-story-approval                                                           |
| Reason                                     | Sin decisiones bloqueantes: boundary formalizado upstream; historia reescrita contra Doc 18 §25/§25.1/§27.5/§28.3. |

---

## 10. Cambios Aplicados

### Metadata

* Agregado `Backlog Item: PB-P0-001`; Epic con nombre completo; Owner cambiado a Tech Lead / Backend Lead; `Status: Ready for Approval`; `Last Updated: 2026-06-10`.

### Business Context

* Context Summary reescrito: deliverables concretos (1 índice funcional, 12 parciales, `is_seed` por tabla, verificación de inventario §25) y consecuencia de no implementar.
* Agregada sección `PO/BA Decisions Applied` con 10 decisiones derivadas de DR-099/DR-100 y Doc 18 (incluye ownership de `uq_users_email_lower`, diferimiento GIN, no-CONCURRENTLY, validación estructural vs medición P95).

### Traceability

* `NFR-PERF-API-001` (inexistente) → NFR-PERF-001, NFR-PERF-005, NFR-DEMO-003, NFR-OBS-001.
* ADRs: agregados ADR-DB-001 y ADR-DB-005 (raw SQL policy).
* BRs citados como soporte de consulta: BR-EVENT-013, BR-VENDOR-005, conteo C-027b.

### Scope Guardrails

* Out of Scope explícito: unique parciales/checks (US-102), GIN/`pg_trgm` (diferido), `CONCURRENTLY`, medición P95, seed, CD/RDS.

### Acceptance Criteria

* AC-01..AC-08 nuevos, testables, con la tabla literal de índices y predicados `WHERE` de Doc 18 §25.
* Edge cases reales: EC-01 (falso drift Prisma), EC-02 (locks de `CREATE INDEX`), EC-03 (duplicados vs `@@index`), EC-04 (ordering de timestamps).

### Technical Notes

* Path y generación de la migration, query de inventario `pg_indexes`, exclusiones explícitas, reutilización de scripts/jobs de US-100.

### QA Notes

* TS-01..TS-08 y NT-01..NT-06 alineados a los AC; extensión del smoke CI.

### Definition of Ready

* Checklist real: boundary formalizado, ownership email index, GIN diferido, `is_seed` incluido. Pendiente única: validación Tech Lead (no bloqueante para approval gate PO/BA).

### Definition of Done

* Checklist verificable: migration mergeada, inventario verde, idempotencia, jobs CI, README.

### Notes

* Delimitación con US-102, diferimiento GIN, justificación de `uq_users_email_lower` en US-101, riesgo drift documentado.

---

## Addendum — Second Validation Pass (2026-06-10, post decision resolution)

Segunda pasada de refinamiento ejecutada después de crear `decision-resolutions/US-101-decision-resolution.md` (9 decisiones consolidadas).

**Resultado: confirmado `Ready for Approval`.**

* Decision Resolution artifact found: **Yes** — leído antes de validar; ninguna de las 9 decisiones fue re-preguntada.
* La historia es consistente con las 9 decisiones (alcance, boundaries US-099/US-100/US-102, ownership `uq_users_email_lower`, GIN diferido, `is_seed`, aceptación estructural, drift EC-01, sin `CONCURRENTLY`).
* Trazabilidad re-verificada contra fuentes: NFR-PERF-001, NFR-PERF-005, NFR-DEMO-003, NFR-OBS-001 existen en Doc 10; ADR-ARCH-001, ADR-BE-001, ADR-DB-001, ADR-DB-005 existen y están Accepted en Doc 22.
* **Único ajuste aplicado (Baja):** la anotación de NFR-OBS-001 decía "(logs CI)"; Doc 10 define NFR-OBS-001 como registro de auditoría en `AdminAction`. Se precisó la anotación: el vínculo real es que los índices de `admin_actions` del catálogo §25 (verificados por AC-05) soportan la consulta eficiente de auditoría.
* Sin nuevos hallazgos Alta/Media, sin preguntas pendientes, sin scope creep, sin conflictos con ADRs aceptados.

---

## 11. Recomendación Final

**`Ready for Approval`**

La historia quedó completamente especificada contra el catálogo canónico de índices (Doc 18 §25), con boundary formalizado por decisiones ya aprobadas (DR-099/DR-100), sin scope creep (GIN diferido, unique parciales delegados a US-102), con AC testables estructuralmente y riesgo técnico residual (falso drift de Prisma) documentado como edge case con handling. Siguiente paso: ejecutar `eventflow-user-story-approval`.
