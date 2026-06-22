# 🧾 User Story: Seed fixture garantiza mix de eventos `draft`/`active`/`completed`

## 🆔 Metadata

| Field                       | Value                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| ID                          | US-087                                                           |
| Epic                        | EPIC-SEED-001 — Seed Data & Demo Scenarios                       |
| Backlog Item                | PB-P0-014 — Seed Script Idempotente + Datos Demo                 |
| Feature                     | Cobertura de estados de evento en seed (content fixture)         |
| Module / Domain             | `seed-demo` (Backend, content fixture transversal)               |
| User Role                   | System (seed fixture invariant)                                  |
| Priority                    | Must Have                                                        |
| Status                      | Approved                                                         |
| Owner                       | Product Owner / Business Analyst                                 |
| Approved By                 | PO/BA Review                                                     |
| Approval Date               | 2026-06-22                                                       |
| Ready for Development Tasks | Yes                                                              |
| Sprint / Milestone          | MVP — Foundation P0                                              |
| Created Date                | 2026-06-09                                                       |
| Last Updated                | 2026-06-22                                                       |

---

## 🎯 User Story

**As the** sistema seed de EventFlow (operando vía `SeedDemoDataUseCase` provisto por US-085)
**I want** generar un fixture de `Event` que cubra explícitamente los estados `draft`, `active` y `completed` (con `cancelled` y `auto_completed=true` como complemento documentado en Doc 11)
**So that** la demo guiada (UC-DEMO-001), la suite QA E2E y la evaluación académica puedan recorrer el ciclo de vida completo del evento (BR-EVENT-005) sin requerir transiciones manuales en tiempo de demo.

---

## 🧠 Business Context

### Context Summary

US-087 garantiza el contenido (fixture) de eventos generado por el seed runner (US-085). No introduce un runner ni un endpoint adicionales: define qué eventos deben existir tras `npm run seed` y tras `POST /api/v1/admin/seed/reset` (US-086) para que la demo pueda mostrar el lifecycle completo `draft → active → completed | cancelled` documentado en BR-EVENT-005 / FR-EVENT-005.

El volumen y la matriz de escenarios están explícitos en Doc 11 §"Eventos" (cantidades por estado, tipo de evento, currency y locale): `draft` 2–3, `active` 4–5, `completed` 2–3, `cancelled` 1–2, más al menos un evento "cercano a auto-completar" (NFR-REL-005) y al menos un evento ya auto-completado (`auto_completed=true`). Todos los eventos sembrados llevan `is_seed=true` (BR-SEED-005) y son consistentes con la cobertura cultural LATAM (BR-SEED-004).

### Related Domain Concepts

* Entidades: `Event` (estados `draft`, `active`, `completed`, `cancelled`), `EventType`, `User` (organizadores seed), `Location`, `Currency`, `Language`, `Budget`, `EventTask`.
* Banderas/columns: `Event.status`, `Event.auto_completed`, `Event.completed_at`, `Event.cancelled_reason`, `Event.is_seed`.
* Use cases consumidores: `SeedDemoDataUseCase` (US-085) inserta los eventos vía repositorios; `ResetDemoUseCase` (US-086) repuebla los mismos eventos tras el reset.
* Job relacionado: `AutoCompleteEventsJob` — la fixture cercana a auto-completar cubre QA del job sin requerir time-travel manual.

### PO/BA Decisions Applied

* La distribución mínima sigue Doc 11 §"Eventos" (no se altera por esta historia).
* `cancelled` y `auto_completed=true` se mantienen como complementos obligatorios para cubrir Doc 11 §"Estados requeridos".
* Los eventos seed conviven con datos `is_seed=false` generados durante la demo; el fixture nunca depende de datos operativos para mantener las invariantes (BR-SEED-008).
* El contenido (nombres, descripciones, ubicaciones) sigue la matriz Doc 11 §"Campos mínimos / matriz de escenarios" y BR-SEED-004 (coherencia cultural LATAM).
* Esta historia no entrega endpoint HTTP ni UI. El runner pertenece a US-085, el endpoint admin a US-086 y la UI futura a PB-P3-001 / US-140.

### Assumptions

* US-085 ya provee el runner CLI `npm run seed` y `SeedDemoDataUseCase`.
* US-086 ya provee `POST /api/v1/admin/seed/reset` que reusa la misma siembra.
* Los modelos Prisma de `Event`, `EventType`, `User`, `Currency`, `Language` y campos auxiliares (`is_seed`, `auto_completed`, `completed_at`, `cancelled_reason`) están disponibles (US-099 / US-100).
* `BR-EVENT-005` se respeta: los eventos seed se insertan ya en el estado destino vía repositorios; no se ejecutan transiciones de máquina de estados en tiempo de seeding.
* `MockAIProvider` provee respuestas deterministas para AI relacionados con los eventos (vinculado a US-085 / BR-AI-005).

### Dependencies

* **PB-P0-001 / US-099 / US-100**: schema Prisma con `Event.status`, `Event.auto_completed`, `Event.completed_at`, `Event.cancelled_reason`, `is_seed`.
* **PB-P0-002 / US-089**: backend modular monolith con módulo `seed-demo` (Doc 14 §10.16).
* **PB-P0-014 / US-085**: runner CLI y `SeedDemoDataUseCase` (consumidor del fixture).
* **PB-P0-014 / US-086**: endpoint HTTP reset (re-aplica el fixture).
* **PB-P0-014 / US-088**: complementaria — `BookingIntent.confirmed_intent` y reseña verificada usan eventos `completed` provistos por esta historia.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-SEED-002, FR-EVENT-005, FR-DEMO-001                                                                                                   |
| Use Case(s)            | UC-DEMO-001, UC-EVENT-002, UC-EVENT-005                                                                                                  |
| Business Rule(s)       | BR-SEED-001, BR-SEED-002, BR-SEED-003, BR-SEED-004, BR-SEED-005, BR-EVENT-005, BR-EVENT-010                                                |
| Permission Rule(s)     | Sistema seed (no rol de aplicación). El acceso operativo a los datos sigue las reglas estándar de `Event` (Doc 19 §10).                   |
| Data Entity / Entities | `Event`, `EventType`, `User` (organizadores seed), `Location`, `Currency`, `Language`, `Budget`, `EventTask`                              |
| API Endpoint(s)        | No aplica — esta historia entrega contenido (fixture), no endpoints. El consumo se realiza vía `SeedDemoDataUseCase` (US-085) y `ResetDemoUseCase` (US-086). |
| NFR Reference(s)       | NFR-DEMO-001, NFR-DEMO-002, NFR-DEMO-005, NFR-REL-005, NFR-I18N-005, NFR-I18N-006                                                          |
| Related ADR(s)         | ADR-DEVOPS-003 (App Runner), ADR-DEVOPS-004 (RDS)                                                                                         |
| Related Document(s)    | `/docs/3-MVP-Scope-Definition.md` §7.16, §14.4; `/docs/11-Data-Seed-Strategy.md` §"Eventos" / §"Estados requeridos" / §"Matriz de escenarios"; `/docs/9-Functional-Requirements-Document.md` §FR-SEED-002 / §FR-EVENT-005; `/docs/4-Business-Rules-Document.md` §BR-SEED-003 / §BR-EVENT-005; `/management/artifacts/4-Product-Backlog-Prioritized.md` PB-P0-014 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope

* Definir el fixture de `Event` insertado por `SeedDemoDataUseCase` (consumido por US-085 y US-086) cubriendo los estados `draft`, `active`, `completed` y `cancelled` con las cantidades mínimas de Doc 11 §"Eventos".
* Garantizar al menos un evento "cercano a auto-completar" (`event_date = hoy − 2 días`, `status='active'`) para QA del job `AutoCompleteEventsJob` (NFR-REL-005).
* Garantizar al menos un evento ya auto-completado (`auto_completed=true`, `status='completed'`) per Doc 11 §"Cantidad recomendada".
* Cubrir la matriz de escenarios LATAM (multi-currency `GTQ`/`USD`/`EUR`, multi-locale `es-LATAM`/`en`/`es-ES`/`pt`) explícita en Doc 11 §"Matriz de escenarios" (BR-SEED-004, NFR-I18N-005/006).
* Marcar todos los eventos sembrados con `is_seed=true` (BR-SEED-005).
* Garantizar idempotencia: ejecutar `npm run seed` o `POST /admin/seed/reset` N veces deja el mismo fixture sin duplicados.

### Explicitly Out of Scope

* Runner CLI `npm run seed` → US-085.
* Endpoint HTTP `POST /api/v1/admin/seed/reset` → US-086.
* `BookingIntent.confirmed_intent` y reseña verificada del vendor demo principal → US-088.
* Job `AutoCompleteEventsJob` (lógica de auto-completado) — esta historia solo proveee fixtures para QA del job, no su implementación (entrega en otra US del módulo event-planning).
* Cualquier transición de estado en runtime mediante la máquina de estados (`UpdateEventStatusUseCase`); el seed inserta directamente en el estado destino respetando BR-EVENT-005.
* UI admin / panel demo → PB-P3-001 / US-140.
* Conversión automática de moneda (BR-OOS-015).
* Cualquier item P4/Future (BR-OOS-001..017).

### Scope Notes

* La matriz exacta vive en Doc 11 §"Matriz de escenarios" y debe respetarse. Esta historia consume esa matriz; no la redefine.
* La fixture cancelled cubre BR-EVENT-005 (transición a estado terminal); incluye `cancelled_reason` para preservar trazabilidad.
* Los eventos seed son consistentes con los `QuoteRequest`/`Quote`/`BookingIntent` que US-088 referencia, evitando referencias colgantes.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Distribución mínima por estado tras `npm run seed`
**Given** un entorno con migraciones aplicadas y `SEED_DEMO_ENABLED=true`
**When** se ejecuta `npm run seed` (US-085) o `POST /api/v1/admin/seed/reset` (US-086)
**Then** la tabla `Event` filtrada por `is_seed=true` contiene al menos:
  - 2 eventos en `status='draft'`,
  - 4 eventos en `status='active'`,
  - 2 eventos en `status='completed'`,
  - 1 evento en `status='cancelled'` con `cancelled_reason` no nulo,
**And** el total de eventos seed está entre 10 y 15 (BR-SEED-002).

### AC-02: Cobertura de banderas `auto_completed` y "cercano a auto-completar"
**Given** seed ejecutado exitosamente
**When** se consulta la tabla `Event` filtrada por `is_seed=true`
**Then** existe al menos 1 evento con `auto_completed=true`, `status='completed'`, `completed_at` no nulo
**And** existe al menos 1 evento con `status='active'` y `event_date = hoy − 2 días` (para QA de `AutoCompleteEventsJob`, NFR-REL-005).

### AC-03: Cobertura cultural LATAM y multi-currency/locale
**Given** seed ejecutado exitosamente
**When** se consulta la tabla `Event` filtrada por `is_seed=true`
**Then** los eventos cubren al menos 2 currencies distintas (`GTQ` y `USD`) y al menos 2 locales (`es-LATAM` y `en`)
**And** la matriz cubre al menos 4 tipos de evento distintos (`wedding`, `xv`, `corporate`, `birthday` o `baby_shower` / `baptism`) consistentes con BR-SEED-004 y NFR-I18N-005/006.

### AC-04: Coherencia con organizadores seed y referencias relacionales
**Given** seed ejecutado exitosamente
**When** se consulta la relación `Event.organizer`
**Then** cada evento seed referencia un `User` con `is_seed=true` y rol `organizer`
**And** al menos un organizador tiene al menos un evento en cada estado `draft`/`active`/`completed`/`cancelled` (Doc 11 §"Eventos").

### AC-05: Idempotencia del fixture
**Given** seed ejecutado exitosamente al menos una vez
**When** se ejecuta el runner nuevamente sin reset previo
**Then** los conteos por estado, currency y locale permanecen iguales
**And** no se generan duplicados (verificación por clave natural `Event.id` o `(organizer_id, slug)`).

---

## ⚠️ Edge Cases

### EC-01: Migraciones desactualizadas en columnas requeridas
**Given** el schema Prisma no incluye `Event.auto_completed`, `Event.completed_at` o `cancelled_reason`
**When** se ejecuta el seed
**Then** el runner falla rápido con mensaje explicativo (`migration_required`) y exit code distinto de 0
**And** no se insertan eventos parciales.

#### Handling
* Dependencia con US-100 (migraciones). El seed no aplica migraciones.

### EC-02: Conflicto entre fixture y datos `is_seed=false` con misma clave natural
**Given** existen datos operativos con la misma clave natural que un evento seed planeado
**When** el runner intenta insertar
**Then** el upsert prioriza la clave natural y respeta la convención `is_seed=true` sin pisar datos operativos
**And** se loggea una advertencia estructurada.

#### Handling
* Las claves naturales del fixture (`slug`, `id` determinista) deben elegirse para no colisionar con datos operativos (Doc 11 §29 y BR-SEED-008).

### EC-03: Fecha relativa del evento "cercano a auto-completar"
**Given** se requiere un evento con `event_date = hoy − 2 días`
**When** el seed se ejecuta hoy
**Then** el fixture calcula la fecha dinámicamente (no la persiste como literal vieja) para que QA de NFR-REL-005 sea reproducible.

#### Handling
* La fecha se computa en runtime; el seed no congela un valor estático.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                                | Message / Behavior                              |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| VR-01 | Todos los eventos sembrados deben tener `is_seed=true`.                                                              | Falla del runner si algún registro queda con `false`. |
| VR-02 | `Event.status` debe pertenecer a {`draft`, `active`, `completed`, `cancelled`} (BR-EVENT-005).                       | Falla del runner ante valor inválido.           |
| VR-03 | `Event.currency_code` debe existir en `Currency` con `is_seed=true`.                                                 | Falla del runner ante FK ausente.               |
| VR-04 | `Event.language_code` debe existir en `Language` con `is_seed=true`.                                                  | Falla del runner ante FK ausente.               |
| VR-05 | El total final de eventos seed debe estar entre 10 y 15 (BR-SEED-002, AC-01).                                       | QA falla si está fuera de rango.                |
| VR-06 | El evento cancelado debe tener `cancelled_reason` no nulo (BR-EVENT-005, EC-EVENT lifecycle).                       | QA falla si el campo queda nulo.                |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-01 | Esta historia no introduce endpoints HTTP. La autorización aplica al runner (US-085) y al endpoint admin (US-086), no al fixture.            |
| SEC-02 | Todos los eventos seed deben usar datos ficticios consistentes con LATAM. Sin PII real (BR-SEED-010, BR-PRIVACY-010, NFR-PRIV-004).            |
| SEC-03 | Los organizadores seed referenciados existen ya con `is_seed=true` y no acceden a datos `is_seed=false` (BR-SEED-008).                       |

### Negative Authorization Scenarios

* No aplica directamente — el fixture es contenido, no flujo HTTP. Los flujos protegidos consumidores (`/events/*`) ya gestionan sus propios escenarios negativos en sus User Stories.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No (las `AIRecommendation` asociadas a eventos seed las inserta `SeedDemoDataUseCase` vía `MockAIProvider`; fuera del alcance de US-087)
* Fallback Required: Not applicable

### AI Input
* Not applicable for this story.

### AI Output
* Not applicable for this story.

### Human-in-the-loop Rules
* Not applicable for this story.

### AI Error / Fallback Behavior
* Not applicable for this story.

---

## 🎨 UX / UI Notes

No aplica — esta historia entrega un fixture de contenido seed, no UI. Los flujos que muestran eventos (dashboard organizador, lista admin, detalle público) se cubren en sus User Stories propias.

| Area                | Notes        |
| ------------------- | ------------ |
| Screen / Route      | No aplica    |
| Main UI Pattern     | No aplica    |
| Primary Action      | No aplica    |
| Secondary Actions   | No aplica    |
| Empty State         | No aplica    |
| Loading State       | No aplica    |
| Error State         | No aplica    |
| Success State       | No aplica    |
| Accessibility Notes | No aplica    |
| Responsive Notes    | No aplica    |
| i18n Notes          | El fixture cubre 4 locales (BR-SEED-004, NFR-I18N-006) |
| Currency Notes      | El fixture cubre al menos 2 currencies (NFR-I18N-006) |

---

## 🛠 Technical Notes

### Frontend

No aplica.

### Backend

* Module: `seed-demo` (Doc 14 §10.16).
* Punto de extensión: dataset/factory de `Event` invocado por `SeedDemoDataUseCase` (US-085). Implementación sugerida: archivo de fixtures TS dentro de `apps/api/src/modules/seed-demo/fixtures/events.fixture.ts` o equivalente.
* Datos relacionales: el fixture debe enlazar con los fixtures de `User` (organizadores seed), `EventType`, `Currency`, `Language` y `Location` ya provistos por US-085.
* Inserciones via `prisma.event.upsert` con claves naturales deterministas (recomendado: `slug` único por organizador o `id` UUID determinista per ADR-DEVOPS-* y Doc 11 §"UUID determinista").
* Cálculo de fechas: `event_date` se computa en runtime para los eventos cercanos a auto-completar (EC-03).

### Database

* Tablas: `Event` (lectura del schema US-099/100).
* Columnas requeridas: `status`, `auto_completed`, `completed_at`, `cancelled_reason`, `is_seed`, `event_date`, `organizer_id`, `event_type_id`, `currency_code`, `language_code`.
* Constraints: respetar máquina de estados (insert directo en estado destino).
* Index Considerations: índice sobre `is_seed` (US-101) acelera los queries de QA.

### API

No aplica — sin endpoint nuevo. El acceso a estos eventos pasa por `SeedDemoDataUseCase` (US-085) y `ResetDemoUseCase` (US-086).

### Observability / Audit

* Correlation ID Required: Yes (heredado del runner / endpoint que invoca el fixture).
* Log Event Required: Yes — el `SeedReport` de US-085 / `ResetReport` de US-086 debe reportar conteos por entidad incluyendo `Event` por estado.
* AdminAction Required: No directamente — el `AdminAction` lo registra el endpoint reset (US-086).
* AIRecommendation Required: No (las `AIRecommendation` asociadas a eventos las inserta el fixture separado de IA en US-085).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                                  | Type        |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Distribución mínima por estado tras seed: `draft≥2`, `active≥4`, `completed≥2`, `cancelled≥1`, total 10–15 (AC-01, VR-05). | Integration |
| TS-02 | Existencia de evento `auto_completed=true` y evento cercano a auto-completar (AC-02).                                       | Integration |
| TS-03 | Cobertura currency (`GTQ`, `USD`) y locale (`es-LATAM`, `en`) (AC-03).                                                      | Integration |
| TS-04 | Cobertura de al menos 4 tipos de evento (AC-03).                                                                            | Integration |
| TS-05 | Referencias relacionales válidas: cada evento referencia un `organizer` y `event_type` seed (AC-04).                        | Integration |
| TS-06 | Idempotencia: doble seed deja los mismos conteos por estado y currency (AC-05).                                             | Integration |

### Negative Tests

| ID    | Scenario                                                                            | Expected Result                     |
| ----- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| NT-01 | Algún evento seed sin `is_seed=true`                                                  | Falla del runner / test rojo (VR-01) |
| NT-02 | `Event.status` con valor fuera de la máquina de estados                              | Falla del runner / test rojo (VR-02) |
| NT-03 | Evento cancelado sin `cancelled_reason`                                              | Falla del runner / test rojo (VR-06) |
| NT-04 | Schema sin columnas `auto_completed` / `completed_at` / `cancelled_reason`           | Runner falla con `migration_required` (EC-01) |
| NT-05 | Evento cercano a auto-completar con fecha literal vieja en lugar de relativa         | Test rojo (EC-03)                    |

### AI Tests

Not applicable for this story.

### Authorization Tests

No aplica — sin endpoints HTTP nuevos.

### Accessibility Tests

No aplica.

### Seed / Demo Tests

| ID      | Scenario                                                                                                  | Expected Result                       |
| ------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| SD-T-01 | Tras seed, la demo puede recorrer un evento en cada estado sin transiciones manuales (UC-DEMO-001).      | Recorrido válido por estado.          |
| SD-T-02 | El evento cercano a auto-completar permite QA del `AutoCompleteEventsJob` sin time-travel (NFR-REL-005). | El job procesa el evento esperado.    |
| SD-T-03 | Reset surgical (US-086) reaplica los conteos del fixture sin duplicados (AC-05).                          | Conteos iguales tras N resets.        |

---

## 📊 Business Impact

| Field               | Value                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Demo readiness; QA E2E reproducibility; evaluación académica                                                  |
| Expected Impact     | La demo guiada recorre el lifecycle de evento sin operaciones manuales; QA dispone de fixtures estables.       |
| Success Criteria    | Conteos mínimos por estado siempre cumplidos; fixture idempotente; cobertura cultural LATAM verificable.       |
| Academic Demo Value | Evidencia el ciclo de vida completo de `Event` y la cobertura multi-currency/locale del MVP.                  |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

No aplica.

### Potential Backend Tasks

* Definir/editar el archivo de fixtures de `Event` consumido por `SeedDemoDataUseCase` (US-085).
* Implementar cálculo dinámico de fechas para eventos cercanos a auto-completar.
* Asegurar upserts idempotentes por clave natural.
* Coordinar enlace con fixtures de `User`/`EventType`/`Currency`/`Language`.

### Potential Database Tasks

* Verificar que `Event.auto_completed`, `Event.completed_at`, `Event.cancelled_reason` existen en el schema (US-099/100). Si faltan, escalar a US-100.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests de integración por estado, por currency/locale, por idempotencia, por referencias relacionales y por banderas.
* Test de schema mínimo (EC-01).

### Potential DevOps / Config Tasks

* No aplica directamente (la configuración del flag está en US-085 / US-086).

---

## ✅ Definition of Ready

* [x] Rol claro (System / seed fixture).
* [x] Goal/valor claros (cobertura completa del lifecycle del evento en la demo).
* [x] FRD/UC/BR enlazados con IDs verificados.
* [x] Permisos identificados (no aplica HTTP — fixture content).
* [x] Entidades listadas (`Event` + relaciones).
* [x] AC en GWT específicos y testeables (AC-01..05).
* [x] Edge cases documentados (EC-01..03).
* [x] Validación clara (VR-01..06).
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (US-085, US-086, US-088, US-099, US-100, US-101).
* [x] UX states identificados (No aplica — fixture content).
* [x] API definida (No aplica — fixture content).
* [x] Tests definidos (TS, NT, SD-T).
* [ ] PO/BA validó (queda para el Approval Gate).

---

## 🏁 Definition of Done

* [ ] Fixture de `Event` insertado por `SeedDemoDataUseCase` cubre los conteos mínimos por estado (AC-01).
* [ ] Al menos 1 evento con `auto_completed=true` y al menos 1 evento cercano a auto-completar (AC-02).
* [ ] Cobertura multi-currency y multi-locale verificada (AC-03).
* [ ] Cada evento referencia un organizador seed válido (AC-04).
* [ ] Idempotencia validada por doble ejecución (AC-05).
* [ ] Tests de integración verdes en CI.
* [ ] Documentado en el runbook de demo qué eventos están disponibles y para qué casos (demo guiada).
* [ ] PO valida.

---

## 📝 Notes

* Boundary explícito:
  * **US-085** entrega el runner CLI y el use case `SeedDemoDataUseCase`.
  * **US-086** entrega el endpoint HTTP `POST /api/v1/admin/seed/reset` y `ResetDemoUseCase`.
  * **US-087** (esta historia) entrega el fixture de eventos cubriendo los estados.
  * **US-088** entrega `BookingIntent.confirmed_intent` y reseña verificada, complementando los eventos `completed` provistos aquí.
* La matriz de escenarios (Doc 11 §"Campos mínimos / matriz de escenarios") es la fuente autoritativa para nombres, tipos y locales del fixture.
* El evento cercano a auto-completar evita time-travel manual durante la QA de `AutoCompleteEventsJob` (NFR-REL-005).
