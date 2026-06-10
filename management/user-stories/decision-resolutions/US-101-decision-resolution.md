# PO/BA Decision Resolution — US-101

## Source User Story File

`management/user-stories/US-101-critical-indexes.md`

## Source Refinement Review File

`management/user-stories/refinement-reviews/US-101-refinement-review.md`

## Decision Date

2026-06-10

---

## 1. Resumen Ejecutivo

El refinement review de US-101 cerró con **cero preguntas bloqueantes pendientes**: todas las decisiones de boundary fueron derivadas durante el refinamiento a partir de decisiones ya formalizadas upstream (`US-099-decision-resolution.md` Decisión 1 y `US-100-decision-resolution.md` Decisión 1/Q1) y de la documentación física canónica (Doc 18 §25, §25.1, §27.5, §28.3).

Este artefacto **formaliza y consolida** esas decisiones bajo el ID US-101 para que:

1. Pasadas futuras de `eventflow-user-story-refinement` las encuentren en el nivel 2 de precedencia (Decision Resolution artifact) y no las reabran.
2. El Approval Gate y la generación de Development Tasks tengan una única fuente consolidada del alcance de índices.

No se tomaron decisiones nuevas que contradigan ADRs aceptados ni que introduzcan scope creep. Dos decisiones de mecánica técnica quedan etiquetadas como `Recommended Decision — Requires Tech Lead Validation` (validables en el PR de implementación, no bloquean el Approval Gate PO/BA).

| Campo | Valor |
| --- | --- |
| User Story ID | US-101 |
| User Story file path | `management/user-stories/US-101-critical-indexes.md` |
| Refinement review artifact path | `management/user-stories/refinement-reviews/US-101-refinement-review.md` |
| Existing decision resolution found | No (este artefacto se crea por primera vez) |
| Backlog Item | PB-P0-001 — Database Schema, Migrations & Constraints |
| Epic | EPIC-DB-001 — Database & Prisma Physical Model |
| Estado antes de decisiones | Ready for Approval (refinada el 2026-06-10) |
| Cantidad de preguntas revisadas | 0 bloqueantes; 9 decisiones derivadas formalizadas |
| Decisiones PO/BA tomadas | 7 |
| Decisiones técnicas recomendadas | 2 (validación en PR por Tech Lead) |
| ¿Desbloquea aprobación? | Sí (no había bloqueo; se consolida la evidencia) |
| User Story file updated | Yes (referencia a este artefacto; sin cambios de alcance) |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-101-decision-resolution.md` |
| Próximo paso recomendado | Run `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Alcance de US-101

### Pregunta original

> ¿Qué entrega exactamente US-101 dentro de la decomposición de PB-P0-001 (US-099 schema / US-100 migraciones / US-101 índices / US-102 constraints)?

### Respuesta PO/BA

US-101 entrega exclusivamente: (a) migration(s) raw SQL para el índice funcional `uq_users_email_lower` y los 12 índices parciales no-únicos del catálogo Doc 18 §25; (b) los índices parciales `is_seed` en todas las tablas operativas (Doc 18 §27.5); (c) la verificación de inventario de que el catálogo obligatorio Doc 18 §25 quedó materializado tras `migrate deploy`.

### Decisión formal

```text
US-101 = migration(s) raw SQL para índices funcionales y parciales no-únicos + índices is_seed + verificación de inventario del catálogo Doc 18 §25. Nada más.
```

### Rationale

Ratifica DR-099 Decisión 1 y DR-100 Decisión 1 (Q1), ya aprobadas. Mantiene la separación Prisma declarativo → baseline → índices raw SQL → constraints físicos alineada con ADR-DB-005 y Doc 18 §10/§28.3.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado durante refinamiento (fila "Scope of US-101") |
| Scope Guardrails | Ya aplicado (Scope Boundary + Out of Scope) |

### ¿Bloqueaba aprobación?

No (decisión heredada, ya formalizada upstream).

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Boundary con US-099 y gap-fill de índices btree simples

### Pregunta original

> Los `@@index` btree simples del catálogo §25 pertenecen a US-099 ("si aplica"). ¿Quién garantiza que ninguno falte?

### Respuesta PO/BA

US-099 declara los `@@index` simples como parte natural del modelo; US-101 es la historia responsable de **garantizar el catálogo completo**: su test de inventario detecta cualquier btree simple obligatorio faltante y, si existe, US-101 lo gap-fillea vía `@@index` en `schema.prisma` + migration dentro de su propio alcance, documentándolo en el PR.

### Decisión formal

```text
US-101 verifica el catálogo completo Doc 18 §25 y gap-fillea vía @@index cualquier índice btree simple obligatorio ausente del schema de US-099.
```

### Rationale

Doc 18 §35.4 exige "Todos los índices del §25 creados" como checklist de readiness; US-101 ("índices críticos") es el owner natural de ese checklist. Evita un hueco de responsabilidad sin reabrir US-099 (ya aprobada y mergeada).

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (fila "Boundary con US-099") |
| Acceptance Criteria | Ya aplicado (AC-05) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Boundary con US-102 (unique parciales y checks)

### Pregunta original

> El catálogo §25 incluye 4 unique parciales (`uq_quote_requests_event_vendor_active`, `uq_quotes_request_active`, `uq_booking_intents_event_category_confirmed`, `uq_prompt_versions_active`). ¿Los crea US-101?

### Respuesta PO/BA

No. Los unique parciales son enforcement de reglas de negocio (C-027, C-030, C-037, una versión activa por prompt) y pertenecen a **US-102**, junto con check constraints y enforcement append-only. US-101 los excluye explícitamente de su migration y de su verificación de inventario.

### Decisión formal

```text
Los 4 unique parciales del catálogo §25 pertenecen a US-102. US-101 los excluye de su migration (AC-08) y de su test de inventario (AC-05).
```

### Rationale

Ratifica DR-100 Decisión 1 (Q1): "check constraints, unique parciales y enforcement append-only → US-102". Evita duplicación de objetos físicos entre migrations.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (fila "Boundary con US-102") |
| Acceptance Criteria | Ya aplicado (AC-05 exclusiones, AC-08) |
| Notes | Ya aplicado |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Ownership de `uq_users_email_lower`

### Pregunta original

> `uq_users_email_lower` es funcional **y** único. ¿Pertenece a US-101 (índices funcionales) o a US-102 (constraints de unicidad)?

### Respuesta PO/BA

Pertenece a **US-101**. Es el ejemplo canónico de la categoría raw SQL #3 "Índices funcionales (`LOWER(email)`)" de Doc 18 §28.3, distinta de la categoría #1 "Unique parciales". No tiene cláusula `WHERE`, por lo que no es un unique parcial.

### Decisión formal

```text
uq_users_email_lower (UNIQUE INDEX ON users (LOWER(email))) se entrega en US-101 como índice funcional. US-102 NO lo duplica.
```

### Rationale

La taxonomía de Doc 18 §28.3 y el texto literal de DR-100 ("índices funcionales / GIN / parciales → US-101") lo clasifican por su naturaleza funcional, no por su efecto de unicidad. Asignarlo a una sola historia elimina el riesgo de omisión o duplicación.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (fila "uq_users_email_lower ownership") |
| Acceptance Criteria | Ya aplicado (AC-02, NT-01) |
| Notes | Ya aplicado |

### ¿Bloqueaba aprobación?

No (derivable de decisiones formalizadas; se consolida aquí para US-102).

### Validación adicional requerida

No requiere validación adicional. **Nota de coordinación:** el equipo que refine US-102 debe citar esta decisión para no recrear el índice.

---

## Decisión 5 — Diferimiento del índice GIN/trigram

### Pregunta original

> DR-100 asigna "índices GIN" a US-101, pero Doc 18 §25.1 declara los GIN/GIST "out of scope inicial". ¿Se crea `idx_vendor_profiles_business_name_trgm`?

### Respuesta PO/BA

No se crea. Doc 18 §25.1 prevalece: los índices GIN/GIST solo se evalúan si el MVP detecta latencia crítica en la búsqueda libre del directorio. US-101 tampoco instala la extensión `pg_trgm`. DR-100 asigna la **categoría** GIN a US-101 (si algún día se promueve, esta historia/línea de trabajo sería su hogar), pero la promoción requiere evidencia de latencia + decisión PO explícita.

### Decisión formal

```text
Decision: Out of Scope for MVP (diferido). idx_vendor_profiles_business_name_trgm y CREATE EXTENSION pg_trgm NO se entregan en US-101. Promoción futura requiere evidencia de latencia en directorio + decisión PO. No requiere ADR salvo que se promueva.
```

### Rationale

MVP-first y no scope creep: con 10–20 vendors seed (NFR-PERF-005), la búsqueda del directorio no necesita trigram. Instalar extensiones de motor sin necesidad medida contradice Doc 18 §25.1.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (fila "GIN / trigram") |
| Scope Guardrails | Ya aplicado (Explicitly Out of Scope) |
| Acceptance Criteria | Ya aplicado (AC-08, NT-03) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional. Requiere decisión PO adicional **solo si** se promueve post-MVP.

---

## Decisión 6 — Índices parciales `is_seed` dentro de US-101

### Pregunta original

> ¿Los índices `idx_<tabla>_is_seed (is_seed) WHERE is_seed = true` (Doc 18 §27.5) forman parte de US-101 o de EPIC-SEED-001?

### Respuesta PO/BA

Forman parte de **US-101**: son índices parciales (categoría raw SQL de esta historia) y Doc 18 §35.4 los exige en el checklist de índices. EPIC-SEED-001 entrega los datos seed y el reset, no la estructura física que los soporta. La lista exacta de tablas se deriva del schema de US-099 (toda tabla que declara `is_seed`).

### Decisión formal

```text
US-101 crea idx_<tabla>_is_seed (is_seed) WHERE is_seed = true en todas las tablas operativas que declaran is_seed. EPIC-SEED-001 consume estos índices, no los crea.
```

### Rationale

Seed-first demo readiness: el reset quirúrgico del demo (NFR-DEMO-003, US-086) depende de borrar filas seed sin sequential scans. La estructura física pertenece a la foundation DB (PB-P0-001).

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (fila "Índices is_seed") |
| Acceptance Criteria | Ya aplicado (AC-04, TS-04) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 7 — Criterio de aceptación estructural vs medición de performance

### Pregunta original

> ¿US-101 debe demostrar mejoras de latencia (EXPLAIN / P95) o basta la verificación estructural de índices?

### Respuesta PO/BA

Basta la verificación **estructural** (existencia y definición exacta vía `pg_indexes`). La medición P95 (NFR-PERF-001/005) requiere seed cargado y pertenece a la estrategia QA de Doc 20 post-EPIC-SEED-001. Verificaciones EXPLAIN sobre tablas vacías serían no determinísticas (el planner prefiere seq scan con volúmenes mínimos).

### Decisión formal

```text
El criterio de aceptación de US-101 es estructural (pg_indexes). La medición de NFR-PERF-001/005 se ejecuta con seed cargado conforme a Doc 20, fuera de US-101.
```

### Rationale

Mantiene la historia pequeña, determinística y testable en CI; evita falsos negativos por comportamiento del query planner con tablas vacías.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (fila "Validación de performance") |
| Test Scenarios | Ya aplicado (TS-02..TS-05 estructurales) |
| Notes | Ya aplicado |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

Requiere validación QA Lead (no bloqueante): confirmar que la medición P95 post-seed queda cubierta en la suite de Doc 20 (US-126/US-128).

---

## Decisión 8 — Manejo del falso drift de `prisma migrate diff` (EC-01)

### Pregunta original

> Los índices raw SQL no representables en Prisma Schema Language pueden hacer que el job CI `prisma-migrate-diff` (US-100) reporte drift falso. ¿Cómo se maneja?

### Respuesta PO/BA

`Recommended Decision — Requires Tech Lead Validation`: validar el comportamiento real de la versión de Prisma del stack en el PR de US-101. Si hay falso positivo, ajustar el job de drift de forma documentada (allowlist o diff dirigido) **sin desactivar** la detección de drift global. Documentar en README backend § Database Migrations.

### Decisión formal

```text
Recommended Decision — Requires Tech Lead Validation: validar drift real en el PR; ante falso positivo, ajuste documentado del job prisma-migrate-diff sin desactivar drift detection global.
```

### Rationale

La arquitectura raw-SQL-en-migrations-separadas + drift detection fue aprobada en DR-100; el riesgo de interacción es una limitación conocida de Prisma que se resuelve operativamente, no re-decidiendo el boundary. No bloquea el Approval Gate PO/BA porque el handling está definido (EC-01) y es verificable en el PR.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| Acceptance Criteria | Ya aplicado (AC-07) |
| Edge Cases | Ya aplicado (EC-01 con Handling) |
| Technical Notes | Ya aplicado (Runbook) |
| Definition of Done | Ya aplicado (ítem de jobs CI con ajuste documentado) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

Requiere validación Tech Lead (en el PR de implementación).

---

## Decisión 9 — `CREATE INDEX` estándar (sin `CONCURRENTLY`)

### Pregunta original

> ¿Se usa `CREATE INDEX CONCURRENTLY` para evitar locks en re-deploys sobre entornos con datos?

### Respuesta PO/BA

`Recommended Decision — Requires Tech Lead Validation`: usar `CREATE INDEX` estándar. `CONCURRENTLY` no puede ejecutarse dentro de la transacción con la que Prisma aplica migrations, y el volumen MVP (seed 10–20 vendors) hace el lock despreciable. Se documenta como deuda consciente si el volumen crece post-MVP.

### Decisión formal

```text
Recommended Decision — Requires Tech Lead Validation: CREATE INDEX estándar en US-101; CONCURRENTLY descartado para MVP (incompatible con transacción Prisma + volumen despreciable).
```

### Rationale

Restricción técnica de PostgreSQL/Prisma + principio MVP-first. La alternativa (migrations fuera de transacción) agregaría complejidad operativa sin beneficio al volumen actual.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (fila "CREATE INDEX CONCURRENTLY") |
| Edge Cases | Ya aplicado (EC-02 con Handling) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

Requiere validación Tech Lead (en el PR de implementación).

---

## 3. Consolidated Decision Table

|  # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --- | --- | --- | --- | --- |
| 1 | Alcance US-101 | Raw SQL funcionales + parciales no-únicos + `is_seed` + inventario §25 | PO (ratifica DR-099/DR-100) | No | — |
| 2 | Boundary US-099 / gap-fill | US-101 verifica catálogo completo y gap-fillea btree simples faltantes vía `@@index` | PO / BA | No | — |
| 3 | Boundary US-102 | 4 unique parciales + checks + append-only → US-102; excluidos de US-101 | PO (ratifica DR-100) | No | Coordinación al refinar US-102 |
| 4 | `uq_users_email_lower` | Índice funcional → US-101; US-102 no lo duplica | PO / BA | No | Coordinación al refinar US-102 |
| 5 | GIN / trigram | Out of Scope MVP (diferido); sin `pg_trgm`; promoción requiere evidencia + decisión PO | PO | No | PO solo si se promueve |
| 6 | Índices `is_seed` | En US-101, todas las tablas operativas con `is_seed` | PO / BA | No | — |
| 7 | Aceptación estructural vs P95 | Estructural en US-101; P95 post-seed en Doc 20 | PO / QA Recommendation | No | QA Lead (no bloqueante) |
| 8 | Falso drift Prisma (EC-01) | Validar en PR; ajuste documentado del job sin desactivar drift global | Tech Recommendation | No | Tech Lead (en PR) |
| 9 | Sin `CONCURRENTLY` | `CREATE INDEX` estándar para MVP | Tech Recommendation | No | Tech Lead (en PR) |

---

## 4. Cambios Aplicados a la User Story

La User Story ya contenía todas las decisiones aplicadas (fueron incorporadas durante el refinamiento del 2026-06-10, al no existir bloqueos). En esta pasada del resolver se aplicó únicamente:

### Business Context

* Sin cambios de contenido — la sección `PO/BA Decisions Applied` ya refleja las decisiones 1–7 y 9.

### Notes

* Agregada la referencia explícita a este Decision Resolution artifact (`decision-resolutions/US-101-decision-resolution.md`) como fuente formal de las decisiones, para que futuras pasadas de refinamiento lo encuentren en el nivel 2 de precedencia.

### Metadata

* `Last Updated: 2026-06-10 (PO/BA decision resolution)`.

### Resto de secciones

* Sin cambios — el contenido ya estaba alineado con las 9 decisiones consolidadas.

---

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| --- | --- | --- | --- | --- |
| Doc 18 §35.2 | Describe la baseline `20260601000000_init` incluyendo raw SQL de índices (índice funcional email, parciales). | Split aprobado US-100/US-101/US-102: baseline schema-only; índices raw SQL en US-101. | Amendar Doc 18 §35.2 post-merge (ya tracked desde DR-100). | No |
| Doc 18 §25 | Lista `idx_vendor_profiles_business_name_trgm` como "gin/trigram opcional" sin marcar diferimiento explícito. | Decisión 5: diferido; sin `pg_trgm` en MVP; promoción requiere evidencia + decisión PO. | Amendar §25 para marcar el índice trigram como "Diferido post-MVP (ver US-101 DR Decisión 5)". | No |
| DR-100 (texto Decisión 1) | Asigna la categoría "GIN" a US-101, lo que podría leerse como obligación de crearlos en MVP. | Decisión 5: la categoría pertenece a US-101 pero su instancia única está diferida por Doc 18 §25.1. | Ninguna edición a DR-100 (artefacto inmutable); este artefacto registra la precisión. | No |

---

## 6. File Update Result

| Campo | Valor |
| --- | --- |
| User Story file updated | Yes |
| User Story file path | `management/user-stories/US-101-critical-indexes.md` |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-101-decision-resolution.md` |
| New User Story status | Ready for Approval |
| Remaining blockers | No |
| Reason | No existían preguntas bloqueantes; las decisiones derivadas quedan formalizadas bajo US-101 y referenciadas desde la historia. |

---

## 7. Estado recomendado después de aplicar decisiones

**`Ready for Approval`**

No quedan preguntas bloqueantes. Las 9 decisiones están formalizadas (7 PO/BA + 2 recomendaciones técnicas con handling definido y validación acotada al PR de implementación). El alcance respeta los MVP guardrails (GIN diferido, sin extensiones, sin scope creep) y la trazabilidad es completa y verídica.

---

## 8. Próximo Paso Recomendado

`Run User Story Approval Gate`

```text
1. Review the updated User Story file.
2. (Opcional) Run `eventflow-user-story-refinement` again for a second validation pass — debería retornar Ready for Approval sin preguntas nuevas.
3. Run `eventflow-user-story-approval`.
4. Al refinar US-102, citar las Decisiones 3 y 4 de este artefacto (unique parciales en US-102; uq_users_email_lower NO se duplica).
```
