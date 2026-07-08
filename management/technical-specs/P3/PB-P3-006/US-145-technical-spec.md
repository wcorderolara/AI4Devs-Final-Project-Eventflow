# Technical Specification — US-145: Garantía verificada de `BookingIntent.confirmed_intent` + reseña visible del vendor demo principal

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-145 |
| Source User Story | `management/user-stories/US-145-ensure-confirmed-booking-visible.md` |
| Decision Resolution Artifact | No aplica — no existe artefacto de resolución de decisiones para US-145 (confirmado). |
| Priority | P3 |
| Backlog ID | PB-P3-006 |
| Backlog Title | Seed visible con BookingIntent + reseña demo (Seed garantiza ≥1 `confirmed_intent` + ≥1 reseña verificada para vendor demo) |
| Backlog Execution Order | P3 #6 (sexto ítem P3; posición PB-P3-001..006 por orden de aparición en el backlog priorizado) |
| User Story Position in Backlog Item | 1 de 1 (US-145 es la única User Story del ítem) |
| Related User Stories in Backlog Item | US-145 (única) |
| Epic | EPIC-DEMO-001 / EPIC-SEED-001 |
| Backlog Item Dependencies | PB-P0-014 (US-085 runner, US-086 reset, US-087 evento, US-088 fixtures BookingIntent/Review) |
| Feature | Demo readiness guard — seed verification |
| Module / Domain | `seed-demo` / QA (verificación automatizada post-seed, solo lectura) |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-07-08 |
| Last Updated | 2026-07-08 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P3-006 — "Seed visible con BookingIntent + reseña demo"** (`management/artifacts/4-Product-Backlog-Prioritized.md`).

- Priority: **P3**. MoSCoW: **Must Have**. Type: **Demo**. Primary Role: **System**.
- Epic: **EPIC-DEMO-001 / EPIC-SEED-001**.
- Title: "Seed garantiza ≥1 `confirmed_intent` + ≥1 reseña verificada para vendor demo".
- Description: Validar que el seed (PB-P0-014) incluye explícitamente ≥1 `BookingIntent.confirmed_intent` visible en demo y ≥1 reseña verificada del vendor demo principal.
- Acceptance Summary: Verificación automatizada del seed · Vendor demo principal con reseña · Mapeado al guion.
- Dependencies: **PB-P0-014**.
- Traceability: Decisión PO US-145.
- Related User Stories: US-145 (única).

### Execution Order Rationale

Se deriva del orden de aparición de los ítems P3 en el backlog priorizado: PB-P3-001 (reset), PB-P3-002 (monitoring), PB-P3-003 (guion de demo), PB-P3-004 (checklist pre-demo), PB-P3-005 (toggle Mock/OpenAI) y **PB-P3-006 (esta historia)**. Por posición, PB-P3-006 es el **sexto** ítem P3 → **Execution Order P3 #6**.

La historia se trabaja después de que su dependencia dura **PB-P0-014 (US-085/086/087/088)** ya está entregada (fixtures de `BookingIntent`/`Review`, runner CLI `npm run seed`, endpoint de reset y evento demo). US-145 no puede verificar el estado post-seed hasta que el seed exista. Además, aporta la garantía ejecutable que respalda el guion de demo de **PB-P3-003 (US-142)**, ya especificado antes en el mismo bloque P3.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-145 | Verificación / garantía de demo readiness (única historia del ítem) | 1 |

---

## 3. Executive Technical Summary

US-145 entrega una **verificación automatizada de demo readiness** (test/aserción de integración estilo Vitest, ADR-TEST-001) que se ejecuta **después** del seed demo y **garantiza** que el **vendor demo principal** (persona `approved` de SEED-USER-003 / SEED-VENDOR-001) cumple dos invariantes demo-críticas:

1. Tiene **≥1 `BookingIntent` con `status='confirmed_intent'`, `is_seed=true`, `is_simulated=true`** visible en el flujo de demo (SEED-BOOKING-001).
2. Tiene **≥1 `Review` verificada**: `status='published'`, `is_seed=true`, `rating ∈ {1..5}`, con `booking_intent_id` que referencia ese `confirmed_intent` del vendor demo (SEED-REVIEW-001, BR-REVIEW-001, BR-REVIEW-003, BR-SEED-007).

La verificación consulta el **estado real post-seed** mediante lecturas (PrismaClient/repositorios existentes); **no** reimplementa fixtures, use cases de negocio, endpoints, UI ni schema. Su valor central es evitar el **"falso verde"**: debe **fallar (rojo, exit code ≠ 0) con un mensaje accionable** cuando falte cualquiera de las dos condiciones (AC-03/EC-01). Además, **mapea** esos registros garantizados al guion de demo (US-142 / PB-P3-003) vía referencias estables SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003. La creación/distribución de los fixtures es propiedad de **US-088 (PB-P0-014)**; US-145 sólo **verifica y garantiza** el subconjunto demo-crítico y **coordina** un pinning mínimo con US-088 si su matriz general no fija el vendor demo específico.

---

## 4. Scope Boundary

### In Scope

- Una **verificación automatizada post-seed** (integración, Vitest, solo lectura) que garantiza, para el vendor demo principal (SEED-USER-003 / SEED-VENDOR-001 `approved`):
  - ≥1 `BookingIntent.confirmed_intent` (`is_seed=true`, `is_simulated=true`) visible.
  - ≥1 `Review` verificada (`published`, `is_seed=true`, `rating 1..5`, `booking_intent_id` → ese `confirmed_intent`).
- **Semántica de fallo sin falso verde**: la verificación falla en rojo con mensaje claro/accionable cuando falta cualquiera de las dos condiciones.
- **Mapeo al guion de demo (US-142)**: referencia estable de los registros a SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003.
- **Integración en CI** como quality gate ejecutado **después** del seed.
- **Nota de coordinación (no duplicación)** con US-088 para el pinning mínimo del vendor demo principal, si su matriz general no lo fija.

### Out of Scope

- Reimplementar los fixtures de US-088 (`booking-intents.fixture.ts`, `reviews.fixture.ts`) ni la matriz Doc 11 §21/§22.
- Implementar `ConfirmBookingIntentUseCase`, `CancelBookingIntentUseCase`, `CreateReviewUseCase`, `HideReviewUseCase` (módulos `event-planning` / `reviews-moderation`).
- Crear UI, endpoints HTTP o cambios de schema/migraciones.
- Generar datos manuales o ejecutar flujos de negocio para producir el `confirmed_intent`/reseña (deben provenir del seed).

### Explicit Non-Goals

- No re-abre decisiones de US-088 (distribución general de fixtures, unicidad `(event, category)`, coherencia presupuestal).
- No introduce un nuevo concepto de "reseña verificada": reutiliza la definición de BR-REVIEW-001 (`published` + `booking_intent_id` → `confirmed_intent`).
- No cubre ítems P4/Future.

---

## 5. Architecture Alignment

### Backend Architecture

Módulo `seed-demo` (Doc 14 §10.16). US-145 **no** agrega use cases de negocio: la verificación es un **test/aserción de integración** que consulta el estado real post-seed con lecturas vía `PrismaClient` o repositorios existentes. Respeta Modular Monolith y Clean/Hexagonal (sin acoplar lógica de negocio nueva).

### Frontend Architecture

`No aplica` — la historia no entrega UI. La visibilidad en demo se apoya en vistas ya cubiertas por sus propias User Stories (perfil de vendor, reseñas públicas).

### Database Architecture

Solo lectura sobre `BookingIntent`, `Review`, `VendorProfile` (`User` del vendor demo). Sin cambios de schema, sin migraciones, sin nuevos índices. Se aprovechan índices existentes (`is_seed`, `(event_id, service_category_id)`) creados por US-101/US-088.

### API Architecture

`No aplica` — no crea ni consume endpoints nuevos.

### AI / PromptOps Architecture

`No aplica` — la historia no invoca IA.

### Security Architecture

Verificación de solo lectura sobre datos seed ficticios (`is_seed=true`), sin PII real, sin endpoint HTTP protegido ni runtime authorization. No introduce superficie de autorización.

### Testing Architecture

Núcleo de la historia. Vitest + Supertest (ADR-TEST-001) sobre DB con seed aplicado; la verificación vive como suite `*.demo-readiness.test.ts` en `apps/api/src/modules/seed-demo/**` y se integra como quality gate en CI tras el seed (NFR-TEST-002/004).

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 — `confirmed_intent` visible del vendor demo principal | Query de solo lectura: `count(BookingIntent WHERE status='confirmed_intent' AND is_seed=true AND is_simulated=true AND vendor_profile_id = <vendor demo principal>) ≥ 1`. Assertion verde solo si ≥1. | Testing / DB (read-only) |
| AC-02 — Reseña verificada del vendor demo principal | Query: `count(Review WHERE status='published' AND is_seed=true AND rating BETWEEN 1 AND 5 AND vendor_profile_id = <vendor demo> AND booking_intent_id ∈ {confirmed_intent del vendor demo}) ≥ 1`. | Testing / DB (read-only) |
| AC-03 — Falla (rojo) ante ausencia; sin falso verde | Cuando VR-01 o VR-02 dan 0, la aserción falla con exit code ≠ 0 y mensaje que identifica la condición ausente (`demo_readiness_missing_confirmed_intent` / `demo_readiness_missing_verified_review`). | Testing / CI |
| AC-04 — Mapeo al guion de demo | Documentar referencia estable de los registros garantizados a SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003 y al guion US-142 (PB-P3-003). | Documentación |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo `seed-demo` (Doc 14 §10.16). No se tocan `event-planning` ni `reviews-moderation`.

### Use Cases / Application Services

**No new use cases.** La verificación es un test/aserción de integración que lee el estado real post-seed. No se implementa ni modifica `ConfirmBookingIntentUseCase`, `CreateReviewUseCase`, `HideReviewUseCase` ni `CancelBookingIntentUseCase`.

### Controllers / Routes

`No aplica` — sin endpoints.

### DTOs / Schemas

`No aplica` — no se exponen contratos. Internamente, la resolución del "vendor demo principal" puede apoyarse en helpers deterministas de seed ya existentes (namespace `seed:*` de US-088/US-085) sin duplicarlos.

### Repository / Persistence

Lecturas de solo lectura vía `PrismaClient` o repositorios existentes (`bookingIntent`, `review`, `vendorProfile`). Sin escrituras, sin transacciones.

### Validation Rules

Se verifican (no se crean) las invariantes: `status='confirmed_intent'`, `is_seed=true`, `is_simulated=true` (BookingIntent); `status='published'`, `is_seed=true`, `rating 1..5`, `booking_intent_id` → `confirmed_intent` (Review). VR-01/VR-02/VR-03 (§ Validation Rules del US).

### Error Handling

En contexto de test: fallo de aserción con mensaje accionable. En integración de CI: exit code ≠ 0 detiene el quality gate.

### Transactions

`No aplica` — solo lectura.

### Observability

Mensaje de fallo claro que identifique la condición ausente (log de test / salida de CI). Sin correlation ID (no es request HTTP).

---

## 8. Frontend Technical Design

`No aplica` — la historia no entrega rutas, componentes, formularios ni estado de UI.

---

## 9. API Contract Design

`No aplica` — la historia no crea ni consume endpoints nuevos (verificación de estado post-seed).

---

## 10. Database / Prisma Design

### Models Impacted

Solo lectura (referencia): `BookingIntent`, `Review`, `VendorProfile` (y `User` del vendor demo principal). **Sin cambios.**

### Fields / Columns

- `BookingIntent`: `id`, `status`, `vendor_profile_id`, `is_seed`, `is_simulated`, `confirmed_at`.
- `Review`: `id`, `booking_intent_id`, `vendor_profile_id`, `rating`, `status`, `is_seed`.
- `VendorProfile`: `id`, `user_id`, `status` (vendor demo principal `approved`).

### Relations

`Review.booking_intent_id` → `BookingIntent(confirmed_intent)`; `BookingIntent.vendor_profile_id` / `Review.vendor_profile_id` → `VendorProfile` del vendor demo.

### Indexes

Sin nuevos índices. Se aprovechan los existentes (`is_seed` de US-101; `(event_id, service_category_id)` de US-088).

### Constraints

Sin nuevas constraints. Se apoya en las existentes (CHECK `rating 1..5`, FK `booking_intent_id`).

### Migrations Impact

**Ninguno.** No hay migraciones.

### Seed Impact

Ver Sección 15. La historia **verifica** el seed; no lo modifica (los fixtures son de US-088).

---

## 11. AI / PromptOps Design

`No aplica` — la historia no invoca IA.

---

## 12. Security & Authorization Design

### Authentication

`No aplica` — sin flujo HTTP.

### Authorization

`No aplica` — sin runtime authorization. Los flujos consumidores (`/reviews/*`, `/booking-intents/*`) gestionan su autorización en sus propias User Stories.

### Ownership Rules

`No aplica`.

### Role Rules

`No aplica`.

### Negative Authorization Scenarios

`No aplica` — sin endpoints protegidos.

### Audit Requirements

`No aplica` — no genera `AdminAction`.

### Sensitive Data Handling

La verificación opera sobre datos seed ficticios (`is_seed=true`), sin PII real (SEC-01/SEC-02 del US). Solo lectura; no muta estado.

---

## 13. Testing Strategy

> **Núcleo de la historia.** La "implementación" de US-145 ES la verificación automatizada. Esta sección detalla los tests derivados de los AC/EC/VR/TS del US.

### Unit Tests

`No aplica` como foco — no hay lógica de negocio unitaria nueva. Opcional: un helper puro de resolución del "vendor demo principal" (si se introduce) podría tener un unit test de mapeo determinista, pero no debe reimplementar fixtures.

### Integration Tests

Núcleo (Vitest + Supertest / DB con seed aplicado, ADR-TEST-001):

- **TS-01** — Tras seed, existe ≥1 `BookingIntent.confirmed_intent` (`is_seed=true`, `is_simulated=true`) del vendor demo principal (AC-01 / VR-01). Integration.
- **TS-02** — Tras seed, existe ≥1 `Review` `published` (`is_seed=true`, `rating 1..5`) ligada a un `confirmed_intent` del vendor demo (AC-02 / VR-02). Integration.

### API Tests

`No aplica` — sin endpoints.

### E2E Tests

`No aplica` como entregable propio. La visibilidad en el flujo de demo se apoya en E2E ya cubiertos por otras historias (perfil de vendor, reseñas públicas). US-145 evidencia la precondición de datos, no el recorrido UI.

### Security Tests

`No aplica` — sin superficie de autorización nueva.

### Accessibility Tests

`No aplica`.

### AI Tests

`No aplica`.

### Seed / Demo Tests

- **TS-03** — El mapeo al guion (SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003 / US-142) está documentado y es coherente (AC-04). Documentation / Review.
- **SD-T-01** — Guardia de demo readiness: tras `npm run seed`, el vendor demo principal tiene `confirmed_intent` + reseña verificada → verde solo si ambas condiciones se cumplen.
- **SD-T-02** — Con seed incompleto, la guardia falla en rojo con mensaje accionable (no falso verde) (EC-01).

Negative Tests (guardia contra falso verde):

- **NT-01** — Seed sin `confirmed_intent` del vendor demo principal → falla con mensaje claro `demo_readiness_missing_confirmed_intent` (VR-01 / EC-01).
- **NT-02** — Seed sin reseña `published` ligada a un `confirmed_intent` del vendor demo → falla con `demo_readiness_missing_verified_review` (VR-02 / EC-01).
- **NT-03** — Reseña del vendor demo `hidden`/`removed` o `published` sin `booking_intent_id` a un `confirmed_intent` → no satisface "verificada"; falla si no hay otra que sí (EC-02, BR-REVIEW-001).

### CI Checks

La suite `*.demo-readiness.test.ts` se ejecuta **después** del seed en CI como quality gate de demo readiness. Falla del gate ⇒ bloqueo de merge/demo (Doc 20 §9 "compuertas de calidad en CI"; NFR-TEST-002/004). Complementa el "doble run de seed en CI" del RISK #2 del backlog priorizado.

---

## 14. Observability & Audit

### Logs

Mensaje de fallo claro/accionable que identifica la condición ausente (`demo_readiness_missing_confirmed_intent` / `demo_readiness_missing_verified_review`), emitido en la salida del test/CI.

### Correlation ID

`No aplica` — no es request HTTP.

### AdminAction

`No aplica`.

### Error Tracking

Exit code ≠ 0 del test integra el fallo en el pipeline de CI.

### Metrics

`No aplica` — sin métricas de runtime nuevas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

La historia **consume** (no produce) los datos del seed de US-088:

- **SEED-BOOKING-001** (Doc 11 §21): ≥3 `confirmed_intent` totales; US-145 requiere que **≥1 de ellos pertenezca al vendor demo principal** (`is_seed=true`, `is_simulated=true`).
- **SEED-REVIEW-001** (Doc 11 §22): 20–40 reseñas (70% `published`); US-145 requiere **≥1 `published` (`rating 1..5`) del vendor demo principal, con `booking_intent_id` → su `confirmed_intent`** (BR-REVIEW-001, BR-SEED-007).
- **SEED-USER-003 / SEED-VENDOR-001**: el "vendor demo principal" es una de las personas `approved` (8–12 vendors `approved`). SEED-EVENT-001 provee el evento ancla.

### Queries por vendor (solo lectura, post-seed)

1. `BookingIntent` del vendor demo:
   `WHERE status='confirmed_intent' AND is_seed=true AND is_simulated=true AND vendor_profile_id = <VendorProfile del vendor demo principal>` → conteo ≥ 1 (VR-01).
2. `Review` verificada del vendor demo:
   `WHERE status='published' AND is_seed=true AND rating BETWEEN 1 AND 5 AND vendor_profile_id = <mismo vendor> AND booking_intent_id IN (<confirmed_intent del paso 1>)` → conteo ≥ 1 (VR-02).

La resolución del `vendor_profile_id` del vendor demo principal debe usar un ancla estable de seed (helpers deterministas de US-085/US-088, namespace `seed:*`), no un valor hardcodeado frágil.

### Demo Scenario Supported

Cierre del flujo evidenciable en la demo (NFR-DEMO-006, 10–15 min): booking confirmado + reseña verificada visibles en el perfil del vendor demo principal. Mapeo estable a SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003 para el guion US-142 (PB-P3-003) (AC-04).

### Reset / Isolation Notes

La verificación se ejecuta tras `npm run seed` (US-085) o tras el reset admin (US-086), sobre estado ya materializado. No altera aislamiento ni idempotencia del seed.

### Boundary con US-088 (PB-P0-014)

US-088 **crea y distribuye** los fixtures (`booking-intents.fixture.ts`, `reviews.fixture.ts`, matriz Doc 11 §21/§22) y valida sus invariantes de construcción. US-145 **no** los reimplementa: verifica el **resultado demo-crítico** para el vendor demo principal y lo mapea al guion. Si la matriz general de US-088 no fija explícitamente un `confirmed_intent` + reseña `published` al vendor demo principal, US-145 lo documenta y coordina un **pinning mínimo** con US-088 (nota de coordinación no bloqueante), sin duplicar fixtures.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| US-088 / Doc 11 §21/§22 (matriz de fixtures) | La matriz general garantiza ≥3 `confirmed_intent` y 70% reseñas `published` a nivel global, pero **no fija explícitamente** que el vendor demo principal (SEED-USER-003) tenga un `confirmed_intent` + reseña `published` propios. | US-145 verifica esta invariante demo-crítica por vendor; la propia verificación **evidencia** si el pinning es necesario. | Coordinar con US-088 un **pinning mínimo** del vendor demo principal (ancla determinista), sin duplicar fixtures. Nota de coordinación (no bloqueante). | No |
| US-145 (stub previo) — IDs de trazabilidad | El stub incluía `NFR-PERF-API-001` (inexistente) y `NFR-OBS-001` (no relevante). | Ya corregido en el US refinado: se resolvió a `NFR-TEST-004`/`NFR-TEST-002`; se conservan `FR-SEED-004`, `UC-DEMO-001`, `BR-SEED-006/007`, `BR-REVIEW-001/003`, `NFR-DEMO-006`, `ADR-TEST-001`. | Ninguna acción adicional; registrado como limpieza ya aplicada (priority/reframe/traceability). | No |

Nota (no bloqueante): la reformulación de US-145 de "crear datos" a "verificar/garantizar" (reframe P3, alcance de verificación) y la limpieza de trazabilidad ya fueron aplicadas en el US aprobado. La verificación de US-145 es también el mecanismo que **surface** si US-088 necesita pinning explícito del vendor demo.

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Seed no fija el `confirmed_intent`/reseña al vendor demo principal específico | La guardia falla aunque el seed global sea válido | Coordinar pinning mínimo con US-088 (ancla determinista del vendor demo); documentar en nota de coordinación. |
| Resolución frágil del vendor demo principal (hardcode) | Falsos rojos/verdes si cambian datos | Resolver `vendor_profile_id` vía helper determinista de seed (namespace `seed:*`), no por valor literal. |
| Falso verde por criterio de reseña laxo | Demo readiness aprobado con seed incompleto | Exigir `published` + `booking_intent_id` → `confirmed_intent` del mismo vendor + `rating 1..5` (NT-03, BR-REVIEW-001). |
| Verificación no integrada post-seed en CI | La guardia no protege la demo | Integrar la suite como quality gate ejecutado tras el seed (Doc 20 §9); coordinar con DevOps. |
| Acoplamiento accidental a lógica de fixtures de US-088 | Scope creep / duplicación | Mantener solo lectura sobre estado real; no importar ni reimplementar fixtures. |

---

## 18. Implementation Guidance for Coding Agents

### Archivos / carpetas probablemente impactados

- Nueva suite de verificación (solo lectura): `apps/api/src/modules/seed-demo/**/*.demo-readiness.test.ts` (p. ej. `apps/api/src/modules/seed-demo/__tests__/demo-readiness.test.ts`), consistente con la convención de tests de US-088 (`apps/api/src/modules/seed-demo/fixtures/__tests__/`).
- Reutilización (sin modificar) de helpers deterministas de seed para resolver el ancla del vendor demo principal (namespace `seed:*` de US-085/US-088).
- Documentación de mapeo al guion de demo (referencia estable SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003 / US-142), enlazada desde el material de demo readiness (PB-P3-003/PB-P3-004).

### Consultas de solo lectura (exactas)

1. `prisma.bookingIntent.count({ where: { status: 'confirmed_intent', is_seed: true, is_simulated: true, vendor_profile_id: <vendorDemoPrincipalId> } })` → debe ser ≥ 1.
2. `prisma.review.count({ where: { status: 'published', is_seed: true, rating: { gte: 1, lte: 5 }, vendor_profile_id: <vendorDemoPrincipalId>, booking_intent: { status: 'confirmed_intent' } } })` (o filtro equivalente por `booking_intent_id ∈ confirmed_intent del vendor`) → debe ser ≥ 1.

### Mensajes de fallo (sin falso verde)

- Falta `confirmed_intent`: `demo_readiness_missing_confirmed_intent` — indicar vendor demo y sugerir re-ejecutar seed (US-085) o revisar pinning (US-088).
- Falta reseña verificada: `demo_readiness_missing_verified_review` — indicar vendor demo y la condición (`published` + link a `confirmed_intent`).

### Orden recomendado de implementación

1. Resolver ancla determinista del vendor demo principal (helper existente).
2. Implementar la query/aserción de `confirmed_intent` (TS-01/VR-01).
3. Implementar la query/aserción de reseña verificada (TS-02/VR-02).
4. Añadir tests negativos (NT-01..03, SD-T-02) que verifiquen el fallo en rojo.
5. Documentar el mapeo al guion (AC-04 / TS-03).
6. Integrar la suite en CI **después** del paso de seed.

### Decisiones que NO deben re-abrirse

- Fixtures y su distribución son de US-088 (Doc 11 §21/§22); no reimplementar.
- "Reseña verificada" = `published` + `booking_intent_id` → `confirmed_intent` (BR-REVIEW-001); no inventar concepto nuevo.
- Stack de pruebas: Vitest + Supertest (ADR-TEST-001).

### Qué NO implementar

- Ningún use case de negocio, endpoint, UI, schema o migración.
- Ninguna escritura sobre `BookingIntent`/`Review`/`VendorProfile`.
- Ninguna generación manual de datos fuera del seed.

### Assumptions a preservar

- El seed (US-085/086/087/088) ya produce el estado a verificar.
- `is_seed=true` marca datos ficticios sin PII real.
- La verificación es de solo lectura y se ejecuta post-seed.

---

## 19. Task Generation Notes

### Suggested task groups

- **QA / Verificación (núcleo):** implementar la verificación automatizada post-seed (TS-01/TS-02) y sus negativos (NT-01..03, SD-T-01/02).
- **DevOps / CI:** integrar la suite `*.demo-readiness.test.ts` como quality gate ejecutado después del seed.
- **Documentación:** mapear registros garantizados al guion de demo (US-142) y a SEED-BOOKING-001 / SEED-REVIEW-001 / SEED-USER-003 (AC-04); nota de coordinación con US-088 sobre pinning mínimo.

### Required QA tasks

- Verificación de `confirmed_intent` del vendor demo principal (AC-01).
- Verificación de reseña verificada del vendor demo principal (AC-02).
- Tests negativos que aseguren fallo en rojo sin falso verde (AC-03 / EC-01/02).

### Required security tasks

Ninguna — solo lectura sobre datos seed ficticios (SEC-01/SEC-02). No aplica.

### Required seed/demo tasks

- Guardia de demo readiness ejecutada tras `npm run seed`/reset.
- Coordinación (no duplicación) con US-088 para pinning mínimo del vendor demo principal si su matriz general no lo fija.

### Required documentation tasks

- Referencia estable de mapeo al guion de demo (US-142).
- Nota de coordinación con US-088 (pinning).

### Dependencies between tasks

- QA depende de que el seed de US-088 esté disponible.
- La integración en CI depende de que exista el paso de seed en el pipeline.
- El mapeo documental depende de que la verificación identifique los registros garantizados.

### Consolidated tasks.md

PB-P3-006 contiene una única User Story (US-145); su `tasks.md` puede vivir directamente bajo el ítem sin consolidación con historias hermanas (no las hay).

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass (Approved with Minor Notes) |
| Product Backlog mapping found | Pass (PB-P3-006) |
| Decision Resolution reviewed if present | N/A (no existe artefacto) |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | N/A (No aplica) |
| DB impact clear | Pass (solo lectura, sin cambios) |
| AI impact clear | N/A (No aplica) |
| Security impact clear | N/A (solo lectura, sin autorización nueva) |
| Testing strategy clear | Pass (núcleo de la historia) |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-145 tiene alcance claro y acotado (verificación de solo lectura post-seed), backlog mapping confirmado (PB-P3-006, P3 #6), dependencias satisfechas (PB-P0-014 entregado), trazabilidad verificada (FR-SEED-004, UC-DEMO-001, BR-SEED-006/007, BR-REVIEW-001/003, NFR-DEMO-006, NFR-TEST-002/004, ADR-TEST-001) y una estrategia de testing que constituye el entregable central. No introduce use cases, endpoints, UI, schema ni scope creep. El único punto abierto —el pinning explícito del vendor demo principal en US-088— es una **coordinación no bloqueante** que la propia verificación evidencia. Procede a la generación de Development Tasks.
