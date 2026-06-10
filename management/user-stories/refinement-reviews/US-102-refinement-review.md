# User Story Refinement Review — US-102

> **Carácter del artefacto:** Evidencia de refinamiento **no bloqueante**. La User Story fue actualizada en su archivo original porque no quedaron decisiones bloqueantes pendientes: el boundary completo estaba formalizado upstream (DR-100 Decisión 1, DR-101 Decisiones 3–4) y las decisiones restantes son derivables de Doc 18 con respaldo documental explícito.

## Source User Story File

`management/user-stories/US-102-db-constraints.md`

## Decision Resolution Artifact

`management/user-stories/decision-resolutions/US-102-decision-resolution.md` — **No existe** (no fue necesario para refinar). Decisiones heredadas de:

* `decision-resolutions/US-100-decision-resolution.md` (Decisión 1/Q1 — US-102 = check constraints, unique parciales, enforcement append-only).
* `decision-resolutions/US-101-decision-resolution.md` (Decisión 3 — los 4 unique parciales pertenecen a US-102; Decisión 4 — `uq_users_email_lower` pertenece a US-101 y NO se duplica).

## Review Date

2026-06-10

---

## 1. Resultado Ejecutivo

| Campo                                      | Evaluación                                                       |
| ------------------------------------------ | ----------------------------------------------------------------- |
| User Story ID                              | US-102                                                            |
| File Path                                  | `management/user-stories/US-102-db-constraints.md`                |
| Backlog Item                               | PB-P0-001 — Database Schema, Migrations & Constraints             |
| Epic                                       | EPIC-DB-001 — Database & Prisma Physical Model                    |
| Estado actual                              | Ready for Approval (tras refinamiento; antes: Draft)              |
| Estado recomendado                         | Ready for Approval                                                |
| Nivel de riesgo                            | Bajo                                                              |
| Calidad general                            | Alta (tras refinamiento; la versión original era Baja)            |
| Requiere decisión PO                       | No                                                                |
| Requiere decisión técnica                  | No (decisiones derivadas con respaldo documental; validación acotada al PR) |
| Requiere decisión QA                       | No                                                                |
| Requiere decisión Seguridad                | No                                                                |
| Decision Resolution artifact found         | No (heredadas de DR-100 / DR-101)                                 |
| User Story file updated                    | Yes                                                               |
| Refinement review artifact created/updated | Yes (evidencia, no bloqueante)                                    |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-102-refinement-review.md` |

---

## 2. Diagnóstico PO/BA

La versión original era el mismo stub genérico que tenía US-101 antes de su refinamiento: ACs de boilerplate (env vars, boot, healthcheck) sin relación con constraints, el NFR inexistente `NFR-PERF-API-001`, y ninguna mención a qué constraints se entregan ni cómo se valida el catálogo C-001..C-062 que exige PB-P0-001.

El valor de negocio es claro: defensa en el motor para invariantes críticas (una cotización vigente por solicitud — C-030, un booking confirmado por categoría — C-037, rating 1–5 — C-041, montos no negativos — C-017) y cierre con evidencia del Acceptance Summary de PB-P0-001 ("Constraints C-001..C-062 enforced... Tests de constraints pasan en CI").

El hallazgo central del refinamiento: **la mayoría del catálogo C-001..C-062 NO es DB-enforceable** — Doc 18 §24 asigna mecanismo service layer, job, middleware o "ausencia de tabla" a gran parte de las filas. Por eso la historia se especificó con dos entregables complementarios: (a) el subconjunto DB-enforceable vía raw SQL (11 checks + 4 unique parciales), y (b) la **matriz de validación C-001..C-062** que clasifica cada constraint con su mecanismo y su historia owner — eso es lo que "validar los 62" significa sin scope creep (implementar service layer aquí invadiría las historias backend).

---

## 3. Hallazgos Principales

| Severidad | Hallazgo | Impacto | Recomendación |
| --------- | -------- | ------- | ------------- |
| Alta | ACs originales no testables ni relacionadas con constraints (boilerplate de bootstrap). | Historia no implementable. | **Aplicado:** AC-01..AC-08 reescritos: 11 checks + 4 unique parciales con definiciones literales de Doc 18, tests de violación (SQLSTATE 23514/23505), matriz C-001..C-062. |
| Alta | El catálogo C-001..C-062 mezcla mecanismos (DB / service / job / middleware / ausencia); la historia original no delimitaba qué enforcement entrega. | Riesgo de scope creep masivo (implementar service layer) o de entrega vacía. | **Aplicado:** decisión formalizada — US-102 entrega solo el subconjunto DB-enforceable + matriz de clasificación con owners; el resto queda trazado a sus historias. |
| Alta | `NFR-PERF-API-001` no existe en Doc 10. | Trazabilidad falsa. | **Aplicado:** corregido a NFR-DATA-001..NFR-DATA-008 (verificados, Must Have), NFR-DEMO-003, NFR-OBS-001 (C-050). |
| Media | DR-100 asigna "enforcement append-only" a `ai_prompt_versions`, pero Doc 18 §20.1 define `admin_actions` como la tabla append-only y §21.2 no especifica trigger para prompt versions. | Ambigüedad sobre qué enforcement entregar. | **Aplicado:** precisión formalizada — `admin_actions` append-only por convención + service layer (`REVOKE` diferido, "opcional MVP" §20.1); `ai_prompt_versions` inmutable por versionado híbrido + `uq_prompt_versions_active`. Registrado como Documentation Alignment (DR-100 es inmutable). |
| Media | Sin boundary explícito con US-101: riesgo de duplicar `uq_users_email_lower`. | Conflicto de objetos físicos entre migrations. | **Aplicado:** exclusión explícita citando DR-101 Decisión 4 (tal como esa decisión exigía). |
| Media | `DEFAULT valid_until` (C-031) aparecía agrupado en el raw SQL de la antigua baseline (Doc 18 §35.2). | Riesgo de implementar un default semánticamente incorrecto (aplica al `sent`, no al INSERT). | **Aplicado:** descartado para MVP con respaldo de Doc 18 §16.2 (service layer canónico, refuerzo "opcional"). |
| Baja | Ruido de template (SEC middleware, KPI time-to-deploy, UX "si aplica"). | Confusión para implementador/QA. | **Aplicado:** secciones reescritas o `No aplica` justificado. |

---

## 4. Validación de Alcance MVP

| Check                                | Resultado | Comentario |
| ------------------------------------ | --------- | ---------- |
| No introduce pagos reales            | Pass      | C-053/C-055 ("ausencia de tabla") quedan clasificados en la matriz como out-of-scope estructural. |
| No introduce contratos firmados      | Pass      | — |
| No introduce WhatsApp/chat/push      | Pass      | — |
| Respeta human-in-the-loop IA         | N/A       | Constraints sobre tablas IA son soporte estructural (timeout/retry/versión activa), no comportamiento IA. |
| Respeta backend como source of truth | Pass      | El motor es última línea; service layer sigue siendo la primera (documentado en EC-03). |
| Respeta seed/demo si aplica          | Pass      | El seed (EPIC-SEED-001) deberá ser válido contra los constraints; sin tareas seed aquí. |
| No introduce RAG/vector DB           | Pass      | — |
| No introduce multi-tenant enterprise | Pass      | — |
| No introduce P4/Future scope         | Pass      | `REVOKE` y triggers diferidos/descartados con respaldo documental, no promovidos. |

---

## 5. Revisión de Acceptance Criteria

| AC | Calidad | Problema detectado | Acción recomendada |
| --- | --- | --- | --- |
| AC-01 original ("Capacidad técnica habilitada") | Not Testable | Genérico, sin constraints. | **Reescrito** como AC-01 (migration aplicable, comentada, ordenada). |
| AC-02 original ("Compatibilidad multi-environment") | Not Testable | Sin criterio. | **Reemplazado** por AC-07 (idempotencia + jobs CI). |
| EC-01 original (env var faltante) | Out of Scope | Pertenece a bootstrap (PB-P0-002). | **Eliminado**; edge cases reales: datos violatorios en re-deploy, falso drift, semántica de errores, ordering. |

ACs resultantes (AC-01..AC-08): tablas literales de los 11 checks y 4 unique parciales con fuentes (C-IDs / secciones Doc 18), tests de violación con SQLSTATE esperado, **coexistencia histórica** de los unique parciales (AC-05 — el caso de negocio que un unique total rompería), matriz completa sin filas sin clasificar (AC-06) y exclusiones verificables (AC-08).

---

## 6. Gaps Detectados

### Producto / Negocio

Resuelto: valor articulado contra NFR-DATA-001..008 y el cierre de PB-P0-001. No aplica gap restante.

### Backend / API

No aplica — sin endpoints. La relación con el error envelope (US-093) quedó documentada en EC-03.

### Frontend / UX

No aplica.

### Base de Datos

Resuelto: inventario exacto (11 checks AC-02 + 4 unique parciales AC-03) con definiciones literales y verificación vía `pg_constraint` / `pg_indexes`.

### Seguridad / Autorización

Resuelto: reglas de pipeline heredadas; SEC-05 documenta el estado del append-only de `admin_actions` y su endurecimiento diferido.

### IA / PromptOps

Resuelto: constraints sobre `ai_recommendations`/`ai_prompt_versions` clasificados como soporte estructural; sin invocación IA.

### QA / Testing

Resuelto: TS-01..TS-08 + NT-01..NT-10, incluyendo violaciones por SQLSTATE y coexistencia histórica.

### Seed / Demo

No requiere cambios de seed/demo. Nota: el seed futuro debe respetar los constraints (responsabilidad de EPIC-SEED-001).

### Documentación / Trazabilidad

Resuelto: NFR corregidos; matriz C-001..C-062 como entregable de trazabilidad; BRs citados solo para enforcement DB directo.

---

## 7. Preguntas Pendientes

```text
No pending blocking questions.
```

Las decisiones de boundary estaban formalizadas (DR-100 Decisión 1; DR-101 Decisiones 3–4) y las restantes (REVOKE diferido, sin triggers, default `valid_until` descartado, matriz como mecanismo de "validar los 62") tienen respaldo documental explícito en Doc 18 §14.1/§16.2/§20.1/§24/§28.3. No se re-preguntó ninguna.

---

## 8. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| ------------------ | ------------------- | ---------------- | ------------------ | -------------------- |
| DR-100 (texto Decisión 1) | Asigna "enforcement append-only" a `ai_prompt_versions`; Doc 18 §20.1 define `admin_actions` como tabla append-only y §21.2 no especifica trigger para prompt versions. | Precisión formalizada en US-102: `admin_actions` por convención + service layer (`REVOKE` diferido); `ai_prompt_versions` inmutable por versionado + unique parcial. | Ninguna edición a DR-100 (inmutable); registrar la precisión en el DR de US-102 cuando se genere. | No |
| Doc 18 §35.2 | Baseline antigua agrupa raw SQL de checks, unique parciales y default `valid_until`. | Split US-100/101/102 aprobado; default descartado (§16.2). | Amendar post-merge (ya tracked desde US-100/US-101). | No |

---

## 9. File Update Result

| Campo                                      | Valor                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| User Story file updated                    | Yes                                                                                     |
| User Story file path                       | `management/user-stories/US-102-db-constraints.md`                                      |
| User Story ID verified                     | Yes (US-102, preservado)                                                                |
| Decision Resolution artifact found         | No (decisiones heredadas de DR-100 / DR-101)                                            |
| Decision Resolution path                   | `management/user-stories/decision-resolutions/US-102-decision-resolution.md` (no requerido para refinar) |
| Refinement review artifact created/updated | Yes (evidencia no bloqueante)                                                           |
| Refinement review path                     | `management/user-stories/refinement-reviews/US-102-refinement-review.md`                |
| Final recommended status                   | Ready for Approval                                                                      |
| Next recommended skill                     | eventflow-po-ba-decision-resolver (para consolidar el DR de US-102) o eventflow-user-story-approval |
| Reason                                     | Sin decisiones bloqueantes; boundary formalizado upstream; entregables exactos derivados de Doc 18 §24/§35.3 y Doc 6 §17. |

---

## 10. Cambios Aplicados

### Metadata

* Agregado `Backlog Item: PB-P0-001`; Epic completo; Owner → Tech Lead / Backend Lead; `Status: Ready for Approval`; `Last Updated: 2026-06-10`.

### Business Context

* Context Summary reescrito con los 4 entregables (11 checks, 4 unique parciales, matriz C-001..C-062, tests de violación).
* `PO/BA Decisions Applied` con 10 decisiones (scope, exclusión `uq_users_email_lower`, boundary US-099, service-layer no implementado, append-only, prompt versions, sin triggers, default descartado, mecánica, validación estructural).

### Traceability

* NFR inexistente → NFR-DATA-001..008, NFR-DEMO-003, NFR-OBS-001. ADRs: + ADR-DB-001, ADR-DB-005. BRs de enforcement DB directo citados con sus C-IDs.

### Scope Guardrails

* Out of Scope explícito: US-101 (índice funcional), service-layer/jobs/middleware (con owners), `REVOKE` diferido, triggers, default `valid_until`, seed, RDS.

### Acceptance Criteria

* AC-01..AC-08 con tablas literales y SQLSTATE esperados; EC-01..EC-04 reales (datos violatorios, drift, semántica de errores, ordering).

### Technical Notes

* Path y generación de la migration, queries de verificación (`pg_constraint`, `pg_indexes`), ubicación sugerida de la matriz.

### QA Notes

* TS-01..TS-08 y NT-01..NT-10 alineados a los AC.

### Definition of Ready / Done

* Checklists reales y verificables; pendiente única: validación Tech Lead.

### Notes

* Cierre de la decomposición PB-P0-001, no-duplicación con US-101, owners del enforcement no-DB, diferimientos con respaldo documental.

---

## Addendum — Second Validation Pass (2026-06-10, post decision resolution)

Segunda pasada de refinamiento ejecutada después de crear `decision-resolutions/US-102-decision-resolution.md` (10 decisiones consolidadas). Ninguna decisión fue re-preguntada.

**Resultado: confirmado `Ready for Approval`, con un hallazgo de completitud corregido.**

* **Hallazgo (Media) — inventario de checks incompleto:** el sweep exhaustivo de los CHECK de motor en Doc 18 reveló **5 check constraints ausentes** de la lista AC-02 original (11): `chk_budgets_totals_nonneg` (§14.4), `languages_supported` no vacío en `vendor_profiles` (§15.1), `base_price >= 0` en `vendor_services` (§15.2), `total_price >= 0` en `quotes` (§16.2) y `size_bytes >= 0` en `attachments` (§19.1). **Corregido:** AC-02 ahora lista **16 checks**; agregado NT-11 (violaciones de los 5 nuevos); actualizados TS-02, DoD, Success Criteria (20 objetos) y el conteo en DR-102 Decisión 1.
* **Hallazgo (Baja) — naming:** Doc 18 §15.1 nombra el check de cambios de categoría como `chk_vendor_profiles_category_change_max` con regla `category_change_count <= 5` (la historia decía `_count` y `BETWEEN 0 AND 5`). **Corregido** al nombre y regla canónicos. Los 4 checks de columna sin nombre explícito en Doc 18 siguen la convención `chk_<tabla>_<descripcion>` de §7 (nota agregada en AC-02).
* Consistencia con DR-102 verificada (las 10 decisiones intactas; solo se actualizó el conteo factual de la Decisión 1).
* Sin nuevos hallazgos Alta, sin preguntas pendientes, sin scope creep (los 5 checks agregados son especificación literal de Doc 18, no alcance nuevo).

---

## 11. Recomendación Final

**`Ready for Approval`**

La historia quedó completamente especificada: el subconjunto DB-enforceable es exacto (11 checks + 4 unique parciales con definiciones literales de Doc 18), la obligación de PB-P0-001 de "validar los 62 constraints" se cumple sin scope creep mediante la matriz de clasificación con owners, los boundaries con US-099/US-100/US-101 están cerrados por decisiones ya aprobadas, y los diferimientos (`REVOKE`, triggers, default `valid_until`) tienen respaldo documental explícito. Siguiente paso recomendado: `eventflow-po-ba-decision-resolver` para consolidar el DR de US-102 (incluyendo la precisión sobre el wording de DR-100), o directamente `eventflow-user-story-approval`.
