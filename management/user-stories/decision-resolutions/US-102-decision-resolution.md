# PO/BA Decision Resolution — US-102

## Source User Story File

`management/user-stories/US-102-db-constraints.md`

## Source Refinement Review File

`management/user-stories/refinement-reviews/US-102-refinement-review.md`

## Decision Date

2026-06-10

---

## 1. Resumen Ejecutivo

El refinement review de US-102 cerró con **cero preguntas bloqueantes**: el boundary estaba formalizado upstream (DR-100 Decisión 1; DR-101 Decisiones 3–4) y las decisiones restantes se derivaron de Doc 18 con respaldo documental explícito (§14.1, §16.2, §20.1, §21.2, §24, §28.3).

Este artefacto **formaliza bajo el ID US-102** las 10 decisiones consolidadas para que pasadas futuras de refinamiento las encuentren en el nivel 2 de precedencia y no las reabran, y deja registrada la **precisión sobre el wording de DR-100** ("enforcement append-only de `ai_prompt_versions`" → la tabla append-only canónica es `admin_actions`; la inmutabilidad de prompt versions es por versionado híbrido).

Ninguna decisión contradice ADRs aceptados ni introduce scope creep. Una decisión de mecánica técnica queda etiquetada `Recommended Decision — Requires Tech Lead Validation` (validable en el PR, no bloquea el Approval Gate).

| Campo | Valor |
| --- | --- |
| User Story ID | US-102 |
| User Story file path | `management/user-stories/US-102-db-constraints.md` |
| Refinement review artifact path | `management/user-stories/refinement-reviews/US-102-refinement-review.md` |
| Existing decision resolution found | No (este artefacto se crea por primera vez) |
| Backlog Item | PB-P0-001 — Database Schema, Migrations & Constraints |
| Epic | EPIC-DB-001 — Database & Prisma Physical Model |
| Estado antes de decisiones | Ready for Approval (refinada el 2026-06-10) |
| Cantidad de preguntas revisadas | 0 bloqueantes; 10 decisiones derivadas formalizadas |
| Decisiones PO/BA tomadas | 9 |
| Decisiones técnicas recomendadas | 1 (validación en PR por Tech Lead) |
| ¿Desbloquea aprobación? | Sí (no había bloqueo; se consolida la evidencia) |
| User Story file updated | Yes (referencia a este artefacto; sin cambios de alcance) |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-102-decision-resolution.md` |
| Próximo paso recomendado | Run `eventflow-user-story-approval` |

---

## 2. Decisiones Respondidas

## Decisión 1 — Alcance de US-102

### Pregunta original

> ¿Qué entrega exactamente US-102 dentro de la decomposición de PB-P0-001, dado que el catálogo C-001..C-062 mezcla mecanismos DB, service layer, jobs y middleware?

### Respuesta PO/BA

US-102 entrega: (a) migration raw SQL con los **16 check constraints** del diseño físico (AC-02 de la historia; inventario exhaustivo de Doc 18 confirmado en la segunda pasada de refinamiento) y los **4 unique parciales** (C-027, C-030, C-037, `uq_prompt_versions_active`); (b) la **matriz de validación C-001..C-062** clasificando cada constraint por mecanismo + historia owner; (c) **tests de violación** por cada constraint DB-enforced nuevo.

### Decisión formal

```text
US-102 = raw SQL (16 checks + 4 unique parciales) + matriz de validación C-001..C-062 + tests de violación. La obligación "validar los 62 constraints" de PB-P0-001 se cumple vía la matriz, no implementando enforcement no-DB.
```

### Rationale

Ratifica DR-100 Decisión 1 y DR-101 Decisión 3. Doc 18 §24 asigna mecanismo no-DB a gran parte del catálogo; implementarlo aquí invadiría las historias backend (scope creep). La matriz da la evidencia trazable que exige el Acceptance Summary sin duplicar trabajo.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (filas "Scope of US-102" y "Constraints service-layer") |
| Acceptance Criteria | Ya aplicado (AC-02, AC-03, AC-04, AC-06) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 2 — Exclusión de `uq_users_email_lower`

### Pregunta original

> ¿US-102 crea el índice funcional único de email (es un constraint de unicidad C-001)?

### Respuesta PO/BA

No. Fue entregado por US-101 como índice funcional (DR-101 Decisión 4). La matriz clasifica C-001 con owner US-101.

### Decisión formal

```text
uq_users_email_lower NO se duplica en US-102. C-001 → US-101 en la matriz.
```

### Rationale

Ratifica DR-101 Decisión 4, que exigía explícitamente esta cita al refinar US-102.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado |
| Scope Guardrails / Notes / AC-08 | Ya aplicado (exclusión verificable) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 3 — Boundary con US-099 (constraints ya materializados)

### Pregunta original

> ¿Qué hace US-102 con los constraints ya expresables en Prisma (FKs, NOT NULL, enums, uniques simples, defaults)?

### Respuesta PO/BA

Los verifica vía matriz, no los recrea: C-015 (`budgets.event_id` unique), C-019 (`vendor_profiles.user_id` unique), C-040 (`uq_reviews_event_vendor`), `uq_prompt_versions_prompt_version`, C-002/C-005 (enums), C-046 y `timeout_ms` default ya viven en el schema US-099 y la baseline US-100.

### Decisión formal

```text
Constraints representables en Prisma pertenecen a US-099/US-100; US-102 los verifica en la matriz con owner "DB — US-099 baseline".
```

### Rationale

Evita duplicación de objetos físicos y respeta la decomposición aprobada (DR-099 Decisión 1).

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (fila "Boundary con US-099") |
| Acceptance Criteria | Ya aplicado (AC-06) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 4 — Append-only de `admin_actions` (C-050)

### Pregunta original

> ¿US-102 implementa el `REVOKE UPDATE, DELETE` sobre `admin_actions` para enforcement append-only?

### Respuesta PO/BA

No. El append-only se preserva por **convención + service layer** (sin code paths de UPDATE/DELETE) + clasificación en la matriz. El `REVOKE` queda **diferido**: Doc 18 §20.1 lo marca explícitamente "opcional MVP" y su implementación requiere separación de roles DB (rol de migración ≠ rol de aplicación), que pertenece al provisioning (US-137+).

### Decisión formal

```text
C-050 append-only: convención + service layer en MVP. REVOKE UPDATE/DELETE diferido a la disponibilidad de separación de roles DB (US-137+). No requiere ADR salvo promoción futura.
```

### Rationale

Decisión documentada en Doc 18 ("opcional MVP") — se aplica directamente como decisión de proyecto. Incluir REVOKE hoy acoplaría la migration a una topología de roles que no existe en CI ephemeral ni en local.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado |
| Authorization & Security Rules | Ya aplicado (SEC-05) |
| Scope Guardrails | Ya aplicado (Out of Scope) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 5 — Inmutabilidad de `ai_prompt_versions` y precisión sobre DR-100

### Pregunta original

> DR-100 Decisión 1 menciona "enforcement append-only (`ai_prompt_versions`)" para US-102, pero Doc 18 §21.2 no especifica trigger ni REVOKE para esa tabla. ¿Qué se entrega?

### Respuesta PO/BA

La inmutabilidad de `ai_prompt_versions` se garantiza por el **enfoque híbrido de versionado** (Doc 18 §21.2): cada versión publicada es una fila nueva, las versiones no se editan, `template_hash` detecta drift contra el repositorio, y US-102 entrega el unique parcial `uq_prompt_versions_active` (una sola versión activa por `prompt_id`). Sin trigger ni REVOKE. El wording de DR-100 se precisa: la tabla append-only canónica del diseño es `admin_actions` (Decisión 4).

### Decisión formal

```text
ai_prompt_versions: inmutabilidad por versionado híbrido + uq_prompt_versions_active (entregado en US-102). Sin trigger. La mención de DR-100 a "append-only (ai_prompt_versions)" queda precisada como Documentation Alignment, no como entregable adicional.
```

### Rationale

Doc 18 §21.2 es la especificación física vigente y no define enforcement de motor adicional; inventarlo sería scope creep. DR-100 es inmutable; la precisión se registra aquí (nivel 2 de precedencia para futuras pasadas).

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado |
| Acceptance Criteria | Ya aplicado (AC-03 incluye `uq_prompt_versions_active`) |
| Notes / Documentation Alignment | Ya aplicado |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 6 — Sin triggers en US-102

### Pregunta original

> US-099 delegó "triggers" genéricamente a US-101/US-102. ¿Se crea algún trigger?

### Respuesta PO/BA

No. Doc 18 §28.3 no lista triggers entre los casos válidos de raw SQL y §14.1 descarta explícitamente el trigger de inmutabilidad de `currency_code` como overengineering MVP (C-008 es service layer). Ningún constraint del catálogo especifica trigger como mecanismo.

### Decisión formal

```text
US-102 no crea triggers. C-008 (currency_code inmutable) permanece en service layer conforme a Doc 18 §14.1 y NFR-DATA-001.
```

### Rationale

MVP-first; el catálogo §24 no asigna mecanismo trigger a ninguna fila.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado |
| Validation Rules / AC-08 | Ya aplicado (prohibición verificable por regex) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 7 — `DEFAULT valid_until` descartado (C-031)

### Pregunta original

> Doc 18 §35.2 agrupaba un `DEFAULT (CURRENT_DATE + INTERVAL '15 days')` para `quotes.valid_until` en la antigua baseline. ¿Lo entrega US-102?

### Respuesta PO/BA

No. La regla de negocio aplica al transicionar la quote a `sent`, no al INSERT (las quotes nacen `draft`); un DEFAULT de motor sería semánticamente incorrecto. El mecanismo canónico es service layer (Doc 18 §16.2, donde el DEFAULT figura solo como "refuerzo opcional").

### Decisión formal

```text
Decision: Out of Scope for MVP (descartado). C-031 se enforcea en service layer (historias de quotes, US-052/US-053). Sin DEFAULT de motor.
```

### Rationale

Corrección semántica con respaldo documental; evita un default que poblaría valores incorrectos en filas `draft`.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado |
| Scope Guardrails / AC-08 | Ya aplicado |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## Decisión 8 — Matriz de validación C-001..C-062 como entregable

### Pregunta original

> ¿Cómo cumple US-102 el Acceptance Summary de PB-P0-001 ("Constraints C-001..C-062 enforced... Tests de constraints pasan en CI") si la mayoría no es DB-enforceable?

### Respuesta PO/BA

Mediante la **matriz de validación versionada**: cada fila del catálogo (Doc 6 §17, incluyendo sub-IDs C-022b/C-026b/C-027b) clasificada con mecanismo físico (Doc 18 §24), historia owner y evidencia (constraint/test o referencia a historia futura). Cero filas sin clasificar (AC-06). Los tests CI cubren el subconjunto DB-enforced.

### Decisión formal

```text
La matriz C-001..C-062 (ubicación sugerida: management/technical-specs/P0/PB-P0-001/constraints-validation-matrix.md) es el mecanismo formal de validación del catálogo. PB-P0-001 cierra su acceptance con: enforcement DB verificado por tests + resto trazado a owners.
```

### Rationale

Traceability is mandatory (principio EventFlow #9) + evidencia académica; evita tanto el scope creep como el cierre vacío del backlog item.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| Acceptance Criteria | Ya aplicado (AC-06) |
| Technical Notes | Ya aplicado (ubicación sugerida) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

Requiere validación QA Lead (no bloqueante): confirmar que las filas service-layer de la matriz queden cubiertas por tests en sus historias owner (seguimiento transversal, fuera de US-102).

---

## Decisión 9 — Mecánica de entrega y manejo de drift

### Pregunta original

> ¿Cómo se entrega la migration y cómo interactúa con los jobs CI ante objetos raw SQL no representables en PSL?

### Respuesta PO/BA

`Recommended Decision — Requires Tech Lead Validation`: migration separada `<ts>_db_constraints` con timestamp posterior a `<ts>_critical_indexes` (US-101), aplicada con el flujo `db:migrate:*` y jobs CI heredados. El manejo de drift reutiliza lo validado empíricamente en US-101 (DR-101 Decisión 8); validar en el PR que los checks y unique parciales no introducen un caso nuevo de falso drift.

### Decisión formal

```text
Recommended Decision — Requires Tech Lead Validation: migration <ts>_db_constraints post-US-101; drift handling heredado de DR-101 Decisión 8, validado en el PR con los nuevos tipos de objeto (CHECK constraints).
```

### Rationale

Consistencia operativa con la cadena US-100/US-101; los CHECK constraints son un tipo de objeto distinto a índices y merecen su propia verificación empírica puntual.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| PO/BA Decisions Applied | Ya aplicado (fila "Mecánica de entrega") |
| Edge Cases | Ya aplicado (EC-02, EC-04) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

Requiere validación Tech Lead (en el PR de implementación).

---

## Decisión 10 — Criterio de validación estructural

### Pregunta original

> ¿El criterio de aceptación incluye medición de performance o comportamiento runtime?

### Respuesta PO/BA

No. Validación **estructural** (existencia/definición vía `pg_constraint` con `pg_get_constraintdef` y `pg_indexes`) + **tests de violación** (SQLSTATE 23514/23505) + **coexistencia histórica** de los unique parciales (AC-05). El mapeo de errores de motor a error envelope pertenece a US-093 (EC-03); la performance, a Doc 20 post-seed.

### Decisión formal

```text
Aceptación de US-102 = estructural + violación + coexistencia histórica. Error UX → US-093. Performance → Doc 20 post-seed.
```

### Rationale

Determinístico, ejecutable en CI sin seed, consistente con DR-101 Decisión 7.

### Impacto en la User Story

| Sección | Cambio requerido |
| --- | --- |
| Test Scenarios | Ya aplicado (TS-01..TS-08, NT-01..NT-10) |
| Edge Cases | Ya aplicado (EC-03) |

### ¿Bloqueaba aprobación?

No.

### Validación adicional requerida

No requiere validación adicional.

---

## 3. Consolidated Decision Table

|  # | Tema | Decisión | Tipo | ¿Bloqueaba aprobación? | Validación adicional |
| -: | --- | --- | --- | --- | --- |
| 1 | Alcance US-102 | 16 checks + 4 unique parciales + matriz + tests de violación | PO (ratifica DR-100/DR-101) | No | — |
| 2 | `uq_users_email_lower` | No se duplica; C-001 → US-101 | PO (ratifica DR-101 D4) | No | — |
| 3 | Boundary US-099 | Constraints Prisma-representables se verifican vía matriz, no se recrean | PO / BA | No | — |
| 4 | Append-only `admin_actions` | Convención + service layer; `REVOKE` diferido (US-137+) | PO (respaldo Doc 18 §20.1) | No | — |
| 5 | `ai_prompt_versions` / precisión DR-100 | Versionado híbrido + `uq_prompt_versions_active`; sin trigger; wording DR-100 precisado | PO / BA | No | — |
| 6 | Triggers | Ninguno en US-102; C-008 en service layer | PO (respaldo Doc 18 §14.1/§28.3) | No | — |
| 7 | `DEFAULT valid_until` | Descartado; C-031 en service layer (US-052/US-053) | PO (respaldo Doc 18 §16.2) | No | — |
| 8 | Matriz C-001..C-062 | Mecanismo formal de "validar los 62"; cero filas sin clasificar | PO / QA Recommendation | No | QA Lead (seguimiento transversal, no bloqueante) |
| 9 | Mecánica + drift | Migration post-US-101; drift handling heredado, validado en PR con CHECKs | Tech Recommendation | No | Tech Lead (en PR) |
| 10 | Criterio de validación | Estructural + violación + coexistencia histórica | PO / QA | No | — |

---

## 4. Cambios Aplicados a la User Story

La User Story ya contenía las decisiones aplicadas (incorporadas durante el refinamiento del 2026-06-10). En esta pasada del resolver se aplicó únicamente:

### Notes

* Agregada la referencia explícita a este Decision Resolution artifact como fuente formal de las decisiones (nivel 2 de precedencia para futuras pasadas).

### Metadata

* `Last Updated: 2026-06-10 (PO/BA decision resolution)`.

### Resto de secciones

* Sin cambios — el contenido ya estaba alineado con las 10 decisiones consolidadas.

---

## 5. Documentation Alignment Required

| Documento / Fuente | Conflicto detectado | Decisión vigente | Acción recomendada | ¿Bloquea aprobación? |
| --- | --- | --- | --- | --- |
| DR-100 (texto Decisión 1) | Asigna "enforcement append-only" a `ai_prompt_versions`; Doc 18 §20.1 define `admin_actions` como tabla append-only y §21.2 no especifica enforcement de motor para prompt versions. | Decisión 5 de este artefacto: versionado híbrido + unique parcial; `admin_actions` por convención (Decisión 4). | Ninguna edición a DR-100 (inmutable); la precisión queda formalizada aquí. | No |
| Doc 18 §35.2 | Baseline antigua agrupa checks, unique parciales y default `valid_until` en un solo archivo. | Split US-100/101/102 aprobado; default descartado (Decisión 7). | Amendar post-merge (ya tracked desde US-100/US-101; agregar la nota del default descartado). | No |
| Doc 18 §24 (C-031) | Lista "Service layer + opcional `DEFAULT` en motor". | Decisión 7: DEFAULT descartado definitivamente para MVP. | Amendar la celda de C-031 al hacer el housekeeping de Doc 18. | No |

---

## 6. File Update Result

| Campo | Valor |
| --- | --- |
| User Story file updated | Yes |
| User Story file path | `management/user-stories/US-102-db-constraints.md` |
| Decision Resolution artifact created/updated | Yes |
| Decision Resolution path | `management/user-stories/decision-resolutions/US-102-decision-resolution.md` |
| New User Story status | Ready for Approval |
| Remaining blockers | No |
| Reason | No existían preguntas bloqueantes; las decisiones derivadas quedan formalizadas bajo US-102, incluida la precisión sobre el wording de DR-100. |

---

## 7. Estado recomendado después de aplicar decisiones

**`Ready for Approval`**

Las 10 decisiones están formalizadas (9 PO/BA con respaldo documental + 1 recomendación técnica con validación acotada al PR). El alcance respeta los MVP guardrails, los boundaries con US-099/US-100/US-101 están cerrados y la trazabilidad del catálogo completo queda garantizada por la matriz.

---

## 8. Próximo Paso Recomendado

`Run User Story Approval Gate`

```text
1. Review the updated User Story file.
2. (Opcional) Run `eventflow-user-story-refinement` again — debería retornar Ready for Approval sin preguntas nuevas.
3. Run `eventflow-user-story-approval`.
4. Tras la aprobación: `eventflow-user-story-technical-spec` y `eventflow-user-story-to-development-tasks`.
5. Al cerrar US-102, consolidar el `tasks.md` del backlog item PB-P0-001 (recomendado en el spec de US-101 §19) y ejecutar el housekeeping documental agrupado (Doc 18 §35.2, §24 C-031, §25 trigram, PB-P0-001 wording).
```
