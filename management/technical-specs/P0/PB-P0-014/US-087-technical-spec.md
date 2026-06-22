# Technical Specification — US-087: Seed fixture garantiza mix de eventos `draft`/`active`/`completed`

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-087 |
| Source User Story | `management/user-stories/US-087-seed-event-mix.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-087-decision-resolution.md` (no existe; no requerido) |
| Priority | P0 |
| Backlog ID | PB-P0-014 |
| Backlog Title | Seed Script Idempotente + Datos Demo |
| Backlog Execution Order | P0 #14 (foundation MVP) |
| User Story Position in Backlog Item | 3 de 4 (US-085 → US-086 → **US-087** → US-088) |
| Related User Stories in Backlog Item | US-085, US-086, US-087, US-088 |
| Epic | EPIC-SEED-001 — Seed Data & Demo Scenarios |
| Backlog Item Dependencies | PB-P0-001 (schema + migraciones), PB-P0-002 (backend bootstrap) |
| Feature | Cobertura de estados de evento en seed (content fixture) |
| Module / Domain | `seed-demo` (Backend, content fixture transversal) |
| User Story Status | Approved (2026-06-22) |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-22 |
| Last Updated | 2026-06-22 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-014 (Seed Script Idempotente + Datos Demo). Compuesto por US-085 (runner CLI), US-086 (endpoint HTTP reset), **US-087** (fixture de eventos) y US-088 (`confirmed_intent` + reseña verificada). Dependencias: PB-P0-001 (schema Prisma + `is_seed` y columnas auxiliares de `Event`) y PB-P0-002 (backend bootstrap).

### Execution Order Rationale

US-087 se ejecuta después de US-085/US-086 porque depende del runner y del use case `SeedDemoDataUseCase` ya operativos. US-088 a su vez consume eventos `completed` de US-087 para crear los `BookingIntent.confirmed_intent` y reseñas verificadas.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-085 | Runner CLI `npm run seed` (`SeedDemoDataUseCase`) | 1 |
| US-086 | Endpoint HTTP admin reset (`ResetDemoUseCase`) | 2 |
| **US-087** | Fixture de eventos cubriendo estados | 3 |
| US-088 | `BookingIntent.confirmed_intent` + reseña verificada | 4 |

---

## 3. Executive Technical Summary

Implementar el fixture de `Event` consumido por `SeedDemoDataUseCase` (US-085) que cubre los estados `draft`, `active`, `completed` y `cancelled` del lifecycle BR-EVENT-005, con las cantidades mínimas de Doc 11 §"Eventos" (10–15 eventos totales: `draft` 2–3, `active` 4–5, `completed` 2–3, `cancelled` 1–2), más al menos un evento "cercano a auto-completar" para QA de NFR-REL-005 y al menos un evento `auto_completed=true`. La fixture cubre además cobertura cultural LATAM con al menos 2 currencies (`GTQ`/`USD`) y 2 locales (`es-LATAM`/`en`), alineada con NFR-I18N-005/006.

El fixture vive como módulo TypeScript dentro de `apps/api/src/modules/seed-demo/fixtures/events.fixture.ts` (o equivalente). Los eventos se persisten vía `prisma.event.upsert` con claves naturales deterministas (`id` UUID determinista o `slug` único por organizador) para garantizar idempotencia (BR-SEED-001). Las fechas de los eventos "cercanos a auto-completar" se computan en runtime (`hoy − 2 días`) para que la QA sea reproducible sin time-travel.

US-087 no entrega runner, endpoint, UI ni job. Solo define el contenido del fixture y los tests de invariantes que QA debe ejecutar tras seed/reset.

---

## 4. Scope Boundary

### In Scope

* Archivo de fixture `events.fixture.ts` con la matriz de Doc 11 §"Matriz de escenarios".
* Inserción vía upsert por clave natural respetando el orden FK (organizador, event type, currency, language preexistentes).
* Cálculo dinámico de `event_date` para el evento "cercano a auto-completar".
* Insert directo en el estado destino sin transiciones de máquina de estados (BR-EVENT-005).
* Marcado `is_seed=true` en todos los eventos.
* Tests de integración cubriendo los AC del User Story (conteos, banderas, multi-currency/locale, referencias, idempotencia).

### Out of Scope

* Runner CLI → US-085.
* Endpoint HTTP reset → US-086.
* `BookingIntent.confirmed_intent` + reseña verificada → US-088.
* Implementación del job `AutoCompleteEventsJob` (esta historia solo proveee fixtures para QA del job).
* Transiciones de estado en runtime mediante use cases del módulo `event-planning`.
* UI admin / panel demo.

### Explicit Non-Goals

* No agrega nuevas columnas al modelo `Event` (dependencia con US-100).
* No introduce migraciones Prisma.
* No reemplaza la matriz documental de Doc 11; la consume.
* No genera datos `is_seed=false`.

---

## 5. Architecture Alignment

### Backend Architecture

* Stack: Node.js, Express.js, TypeScript, Prisma, PostgreSQL.
* Modular Monolith, módulo `seed-demo` (Doc 14 §10.16).
* Fixture invocado desde `SeedDemoDataUseCase` (US-085); no introduce nuevo use case ni controller.
* Datos consistentes con BR-EVENT-005, BR-SEED-003/004/005, BR-SEED-008.

### Frontend Architecture

No aplica.

### Database Architecture

* Modelo `Event` con columnas `status`, `auto_completed`, `completed_at`, `cancelled_reason`, `event_date`, `is_seed`, `organizer_id`, `event_type_id`, `currency_code`, `language_code`, `slug`.
* Índices: `is_seed` (US-101), `organizer_id`, posiblemente `(slug)` único por organizador.
* Sin migraciones nuevas en esta historia.

### API Architecture

No aplica.

### AI / PromptOps Architecture

No aplica directamente. Las `AIRecommendation` asociadas a eventos las inserta US-085 vía `MockAIProvider` (BR-AI-005/006).

### Security Architecture

* Sin endpoints nuevos.
* Sin PII real (BR-SEED-010, BR-PRIVACY-010, NFR-PRIV-004).

### Testing Architecture

* Vitest + Supertest para integration sobre DB efímera.
* Pruebas de invariantes (conteos, banderas, multi-currency/locale, idempotencia).
* MSW no aplica.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — Distribución mínima por estado | Fixture define explícitamente N eventos por estado; upsert ejecutado por `SeedDemoDataUseCase`. | Backend (fixture), DB |
| AC-02 — `auto_completed=true` y "cercano a auto-completar" | Fixture incluye registros específicos con banderas; cálculo dinámico de `event_date`. | Backend (fixture) |
| AC-03 — Multi-currency / multi-locale | Fixture cubre al menos `GTQ`/`USD` y `es-LATAM`/`en`. | Backend (fixture) |
| AC-04 — Referencias relacionales | Fixture enlaza con `User` (organizador seed) y `EventType` existentes. | Backend (fixture), DB |
| AC-05 — Idempotencia | Upsert por clave natural; tests verifican conteos tras doble ejecución. | Backend (fixture), QA |
| EC-01 — Migraciones faltantes | El runner falla rápido si las columnas requeridas no existen. | Backend (runner), QA |
| EC-02 — Coexistencia con `is_seed=false` | Claves naturales no colisionan con datos operativos; upsert respeta convención. | Backend (fixture) |
| EC-03 — Fecha relativa | `event_date = hoy − 2 días` calculado en runtime, no literal. | Backend (fixture), QA |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

* Módulo principal: `seed-demo` (Doc 14 §10.16).
* Punto de extensión: `apps/api/src/modules/seed-demo/fixtures/events.fixture.ts`.

### Use Cases / Application Services

* `SeedDemoDataUseCase` (US-085) — consume el fixture; no se modifica salvo para invocar el fixture si aún no lo hace.

### Controllers / Routes

No aplica.

### DTOs / Schemas

`EventSeedRecord` (tipo interno):

```ts
type EventSeedRecord = {
  id: string;                // UUID determinista
  slug: string;
  organizerSlug: string;     // FK lógica al fixture de organizadores
  eventTypeCode: string;
  title: { 'es-LATAM': string; 'en'?: string; 'es-ES'?: string; 'pt'?: string };
  description: { 'es-LATAM': string; 'en'?: string };
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  eventDate: Date | (() => Date); // relativo si función
  currencyCode: 'GTQ' | 'USD' | 'EUR';
  languageCode: 'es-LATAM' | 'en' | 'es-ES' | 'pt';
  autoCompleted?: boolean;
  completedAt?: Date | null;
  cancelledReason?: string | null;
  isSeed: true;
};
```

### Repository / Persistence

* `prisma.event.upsert({ where: { id }, create, update })` por evento.
* Orden de inserción: organizadores → event types → currencies/languages → eventos (provistos por US-085).
* Idempotencia garantizada por UUID determinista (`id` estable entre ejecuciones).

### Validation Rules

| Validación | Resultado |
|---|---|
| Todos los registros con `isSeed=true` | Fallo del runner ante registro con `false` (VR-01) |
| `status` ∈ enum BR-EVENT-005 | Fallo del runner (VR-02) |
| `currencyCode` y `languageCode` existen en fixtures previos | Fallo del runner (VR-03/04) |
| Total final 10–15 | Falla QA fuera del rango (VR-05) |
| `cancelled` tiene `cancelledReason` | Falla QA si nulo (VR-06) |

### Error Handling

* Errores de schema (columnas faltantes) → falla el runner con `migration_required` (EC-01) reusando el manejo de US-085.
* Errores de FK (organizador / event type ausente) → falla el runner con mensaje explícito.

### Transactions

* La transacción es responsabilidad de US-085 (`$transaction` por lote).
* Esta historia se asegura de que los upserts del fixture sean atómicos por lote.

### Observability

* Conteos por estado reportados en el `SeedReport` (US-085) y en el `ResetReport` (US-086).
* Logs estructurados de `seed.events.completed` con conteos.

---

## 8. Frontend Technical Design

No aplica.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

### Models Impacted

* `Event` (reads/writes filtrados por `is_seed=true`).
* Dependencias relacionales lectura: `User`, `EventType`, `Currency`, `Language`.

### Fields / Columns

* `status`, `auto_completed`, `completed_at`, `cancelled_reason`, `event_date`, `is_seed`, `organizer_id`, `event_type_id`, `currency_code`, `language_code`, `slug`.

### Relations

Sin cambios.

### Indexes

* Índice parcial por `is_seed = true` recomendado (US-101).
* Índice por `status` ya existente para queries del módulo `event-planning`.

### Constraints

* `Event.status` ∈ {`draft`, `active`, `completed`, `cancelled`} (BR-EVENT-005).
* `Event.currency_code` FK a `Currency`.

### Migrations Impact

Ninguna nueva. La historia depende de las migraciones de US-100 (PB-P0-001) para que existan `auto_completed`, `completed_at`, `cancelled_reason`.

### Seed Impact

Esta historia ES el fixture de eventos seed.

---

## 11. AI / PromptOps Design

No aplica.

---

## 12. Security & Authorization Design

* Sin endpoints nuevos.
* Datos sin PII real (BR-SEED-010, BR-PRIVACY-010, NFR-PRIV-004).
* No expone secretos ni configuración sensible.

---

## 13. Testing Strategy

### Unit Tests (Vitest)

* Validación del fixture: forma de los registros, banderas, idempotencia de UUID determinista, cálculo dinámico de fecha.

### Integration Tests (Vitest + Supertest / DB efímera)

* TS-01 — Conteos por estado tras seed.
* TS-02 — Banderas `auto_completed` y evento cercano a auto-completar.
* TS-03 — Currency (`GTQ`/`USD`) y locale (`es-LATAM`/`en`).
* TS-04 — Cobertura de al menos 4 tipos de evento.
* TS-05 — Referencias relacionales válidas.
* TS-06 — Idempotencia con doble ejecución.

### API Tests

No aplica.

### E2E Tests

No aplica directamente; el harness QA E2E (PB-P2-016) consume el fixture.

### Security Tests

No aplica.

### Accessibility Tests

No aplica.

### AI Tests

No aplica.

### Seed / Demo Tests

* SD-T-01..03 según US-087.

### CI Checks

* `npm test` (Vitest unit + integration) en el job de PR.

---

## 14. Observability & Audit

* Conteos por estado de `Event` reportados en el `SeedReport` (US-085) y `ResetReport` (US-086).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

El fixture de eventos definido en esta historia.

### Demo Scenario Supported

* Recorrido del lifecycle completo del evento en la demo guiada.
* QA del `AutoCompleteEventsJob` (NFR-REL-005).
* QA E2E reproducible.

### Reset / Isolation Notes

* Reset surgical (US-086) reaplica el fixture sin duplicados.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Doc 10 NFR-DEMO-002 | Lista `advanced` como estado del lifecycle; BR-EVENT-005 no contempla `advanced`. | El fixture sigue BR-EVENT-005 (`draft`, `active`, `completed`, `cancelled`). | Revisar Doc 10 NFR-DEMO-002 en próxima alineación documental. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Drift del fixture frente a Doc 11 §"Matriz de escenarios" | Demo pierde cobertura LATAM | Tests verifican la matriz de tipos/currency/locales |
| Colisión de clave natural con datos operativos | Pisado accidental | UUIDs deterministas con namespace `seed:event:*` |
| Fecha relativa congelada | QA del job `AutoCompleteEventsJob` falla | Cálculo dinámico en runtime + test EC-03 |
| Cambio de schema sin migrar | Runner falla | Dependencia explícita con US-100 |
| Insert directo en estado terminal sin respetar invariantes | Inconsistencia | Tests SD-T-01 verifican coherencia con BR-EVENT-005 |

---

## 18. Implementation Guidance for Coding Agents

### Files / folders likely impacted

* `apps/api/src/modules/seed-demo/fixtures/events.fixture.ts` (nuevo).
* `apps/api/src/modules/seed-demo/fixtures/index.ts` (registro del fixture).
* `apps/api/src/modules/seed-demo/application/use-cases/seed-demo-data.use-case.ts` (extender invocación si necesario — coordinar con responsable de US-085).
* Tests: `apps/api/src/modules/seed-demo/__tests__/events.fixture.test.ts`, `apps/api/src/modules/seed-demo/__tests__/seed-events.integration.test.ts`.

### Recommended order of implementation

1. Definir tipo `EventSeedRecord` y namespace UUID determinista.
2. Crear `events.fixture.ts` con la matriz de Doc 11.
3. Implementar cálculo dinámico de fecha relativa.
4. Integrar el fixture en `SeedDemoDataUseCase` (US-085) si aún no está conectado.
5. Tests unitarios y de integración.
6. Verificar idempotencia con doble ejecución.

### Decisions that must not be reopened

* Insert directo en estado destino sin transiciones de máquina de estados (BR-EVENT-005).
* `is_seed=true` en todos los registros.
* Sin PII real.
* Sin endpoint HTTP nuevo.

### What must not be implemented

* Runner CLI (pertenece a US-085).
* Endpoint reset (US-086).
* `BookingIntent.confirmed_intent` + reseña (US-088).
* Job `AutoCompleteEventsJob`.
* UI admin.

### Assumptions to preserve

* `SeedDemoDataUseCase` está operativo (US-085).
* Schema con columnas requeridas disponible (US-099/100).
* Fixtures de `User`, `EventType`, `Currency`, `Language` ya provistos por US-085.

---

## 19. Task Generation Notes

### Suggested task groups

* **BE**: fixture, tipo, cálculo de fechas, integración con US-085.
* **DB**: verificar columnas requeridas.
* **QA**: tests de invariantes.
* **DOC**: runbook con cobertura del fixture.

### Required QA tasks

* Tests de integración por cada AC.
* Test EC-01 (migración faltante) — opcional pero recomendado.
* Test EC-03 (fecha relativa).

### Required security tasks

No aplica directamente.

### Required seed/demo tasks

* La historia ES el fixture seed; tests cubren la cobertura.

### Required documentation tasks

* Actualizar runbook de demo con la lista de eventos disponibles por estado.

### Dependencies between tasks

* BE-01 (tipo) → BE-02 (fixture) → BE-03 (cálculo de fechas).
* QA tasks bloquean a documentación.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A |
| DB impact clear | Pass |
| AI impact clear | N/A |
| Security impact clear | N/A |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

**Ready for Task Breakdown.**

US-087 cuenta con un fixture técnico definido, idempotente, trazable contra Doc 11 §"Eventos" y BR-EVENT-005. El alcance está acotado al contenido seed; sin endpoint, sin UI, sin job. Una sola alineación documental no bloqueante (Doc 10 NFR-DEMO-002 lista `advanced`). Siguiente paso: ejecutar `eventflow-user-story-to-development-tasks`.
