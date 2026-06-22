# 🧾 User Story: Ejecutar `npm run seed` reproducible e idempotente

## 🆔 Metadata

| Field              | Value                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| ID                 | US-085                                                                |
| Epic               | EPIC-SEED-001 — Seed Data & Demo Scenarios                            |
| Backlog Item       | PB-P0-014 — Seed Script Idempotente + Datos Demo                      |
| Feature            | Seed reproducible (CLI runner)                                        |
| Module / Domain    | `seed-demo` (Backend, transversal de escritura controlada)            |
| User Role          | Developer / Demo Runner (operador local o de CI)                      |
| Priority           | Must Have                                                             |
| Status             | Approved                                                              |
| Owner              | Product Owner / Business Analyst                                      |
| Approved By        | PO/BA Review                                                          |
| Approval Date      | 2026-06-22                                                            |
| Ready for Development Tasks | Yes                                                          |
| Sprint / Milestone | MVP — Foundation P0                                                   |
| Created Date       | 2026-06-09                                                            |
| Last Updated       | 2026-06-22                                                            |

---

## 🎯 User Story

**As a** developer o demo runner del MVP de EventFlow
**I want** ejecutar el script `npm run seed` con un único comando documentado
**So that** el ambiente quede cargado con datos LATAM coherentes, idempotentes y consistentes con la estrategia seed (Doc 11), habilitando la demo guiada de 10–15 minutos y la suite QA E2E sobre datos estables.

---

## 🧠 Business Context

### Context Summary

El script `npm run seed` es el runner único y reproducible que ejecuta el `SeedDemoDataUseCase` del módulo `seed-demo` (Doc 14 §10.16). Es la base operativa de la demo académica, del onboarding de devs y de la suite E2E sobre seed (PB-P2-016). El script debe ser idempotente: ejecutarlo N veces sobre la misma base no genera duplicados ni rompe invariantes; todas las entidades sembradas quedan marcadas con `is_seed=true` para auditoría y separación lógica frente a datos operativos reales.

Esta historia cubre el runner del CLI. El reset administrativo expuesto como endpoint HTTP (`POST /api/v1/admin/seed/reset`) pertenece a US-086 (`SeedDemoController`). El contenido específico de eventos (mix `draft`/`active`/`completed`) y el `BookingIntent.confirmed_intent` se aseguran en US-087 y US-088.

### Related Domain Concepts

* Todas las entidades del Data Model con `is_seed=true`: `User`, `OrganizerProfile`, `VendorProfile`, `VendorService`, `EventType`, `ServiceCategory`, `Event`, `EventTask`, `Budget`, `BudgetItem`, `QuoteRequest`, `Quote`, `BookingIntent`, `Review`, `AIRecommendation`, `Notification`, `Language`, `Currency`, `AdminAction`.
* Use Cases: `SeedDemoDataUseCase` (Doc 14 §10.16, §11 #45).
* Job de fondo relacionado: `SeedResetJob` (Doc 14 §10.16).
* Flag operativo: `SEED_DEMO_ENABLED=true` (Doc 14 §10.16).

### Assumptions

* La base de datos PostgreSQL está accesible vía las credenciales del entorno actual (`DATABASE_URL`).
* Las migraciones Prisma están aplicadas previamente (US-100 / PB-P0-013). El script no aplica migraciones; falla con mensaje claro si el schema no está al día.
* El `MockAIProvider` provee respuestas deterministas para sembrar `AIRecommendation` (BR-AI-005/006, NFR-AI-008).
* El script no introduce PII real (BR-PRIVACY-010, NFR-PRIV-004, NFR-SEC-008): datos LATAM ficticios alineados con Doc 11 §6.

### Dependencies

* **PB-P0-001 / US-099 / US-100**: Schema Prisma + migraciones aplicadas.
* **PB-P0-002 / US-089**: Backend modular monolith bootstrap.
* **PB-P0-014**: Estrategia y volúmenes de seed (Doc 11).
* **US-087**: Seed event mix (`draft`/`active`/`completed`).
* **US-088**: Seed `BookingIntent.confirmed_intent`.
* **US-086**: Admin reset demo (endpoint HTTP) — fuera del alcance de esta historia.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-SEED-001, FR-SEED-002, FR-SEED-003, FR-SEED-004, FR-SEED-005, FR-SEED-006, FR-SEED-007, FR-DEMO-003          |
| Use Case(s)            | UC-DEMO-001                                                                                                     |
| Business Rule(s)       | BR-SEED-001, BR-SEED-002, BR-SEED-003, BR-SEED-004, BR-SEED-005, BR-SEED-006, BR-SEED-007, BR-SEED-008, BR-SEED-009; BR-PRIVACY-010 |
| Permission Rule(s)     | Operador del entorno (no rol de aplicación); CLI gated por `SEED_DEMO_ENABLED=true` y `NODE_ENV !== production` |
| Data Entity / Entities | Todas las entidades con `is_seed=true` (ver §Related Domain Concepts)                                           |
| API Endpoint(s)        | No aplica — esta historia entrega un CLI (`npm run seed`), no un endpoint HTTP. El endpoint admin pertenece a US-086. |
| NFR Reference(s)       | NFR-DEMO-001, NFR-DEMO-002, NFR-DEMO-003, NFR-DEMO-005, NFR-AI-008, NFR-OBS-006, NFR-PRIV-004, NFR-SEC-008      |
| Related ADR(s)         | ADR-DEVOPS-003 (App Runner), ADR-DEVOPS-004 (RDS), ADR-DEVOPS-006 (GitHub Actions)                              |
| Related Document(s)    | `/docs/3-MVP-Scope-Definition.md` §7.16, §14.4; `/docs/11-Data-Seed-Strategy.md`; `/docs/14-Backend-Technical-Design.md` §10.16 / §11 #45; `/management/artifacts/4-Product-Backlog-Prioritized.md` PB-P0-014 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have (Foundation P0)

### In Scope

* Script `npm run seed` documentado y reproducible.
* Idempotencia: ejecuciones repetidas no duplican registros (BR-SEED-001, NFR-DEMO-003).
* Marca `is_seed=true` en todas las entidades sembradas (BR-SEED-005).
* Volúmenes mínimos definidos por BR-SEED-002 / FR-SEED-002/003/004/005.
* Coherencia cultural LATAM (BR-SEED-004).
* Cobertura multi-idioma y multi-moneda básica del catálogo (BR-SEED-009, NFR-I18N-006).
* Generación de `SeedReport` (resumen estructurado por dominio) en stdout.
* Códigos de salida del proceso: `0` éxito, `1` error de ejecución, `2` precondición incumplida.
* Bandera operativa `SEED_DEMO_ENABLED=true` requerida; en producción el script aborta con `exit code 2`.

### Explicitly Out of Scope

* Endpoint HTTP `POST /api/v1/admin/seed/run` o `/reset` (pertenece a US-086).
* Datos específicos del mix de eventos `draft`/`active`/`completed` (US-087).
* Datos específicos del `BookingIntent.confirmed_intent` y reseñas vinculadas (US-088).
* Aplicación de migraciones Prisma (US-100).
* Demo Script narrativo (PB-P3-002).
* Conversión real de moneda (BR-OOS-015).
* Pagos, contratos, WhatsApp, push nativo o cualquier ítem P4/Future (BR-OOS-001..017).

### Scope Notes

* El script puede recibir flags opcionales no destructivos: `--dry-run` (no escribe) y `--report-only` (lee y emite el `SeedReport`). El comportamiento por defecto es **upsert idempotente**.
* El reset destructivo (`TRUNCATE` o equivalente) no se ejecuta desde este CLI; cualquier necesidad de reset se delega a US-086 (admin endpoint) o al `SeedResetJob`.

---

## ✅ Acceptance Criteria

### 🎯 Happy Path

#### AC-01: Ejecución idempotente desde estado limpio

**Given** una base PostgreSQL accesible vía `DATABASE_URL`, con migraciones Prisma aplicadas y `SEED_DEMO_ENABLED=true`,
**When** el developer ejecuta `npm run seed` por primera vez en un repositorio limpio,
**Then** el proceso termina con `exit code 0`, emite un `SeedReport` en stdout y la base contiene los volúmenes mínimos definidos por BR-SEED-002 (5–10 organizadores, 10–20 proveedores aprobados, 10–15 eventos, 10–15 `ServiceCategory`, 15–25 `QuoteRequest`, 10–20 `Quote`, 20–40 `Review`, ≥1 `BookingIntent.confirmed_intent`).

#### AC-02: Re-ejecución idempotente sin duplicados

**Given** una base ya poblada por una ejecución previa de `npm run seed`,
**When** el developer ejecuta `npm run seed` nuevamente,
**Then** el proceso termina con `exit code 0`, el `SeedReport` reporta `created: 0` y `updated/unchanged > 0` para todos los dominios, y los conteos por entidad son idénticos a los de la primera ejecución (BR-SEED-001, NFR-DEMO-003).

#### AC-03: Marca `is_seed=true` en todas las entidades sembradas

**Given** una ejecución exitosa de `npm run seed`,
**When** se consulta la base por entidad sembrada,
**Then** el 100% de los registros generados por el script presentan `is_seed=true` (BR-SEED-005).

#### AC-04: Catálogos cerrados y coherencia LATAM

**Given** una ejecución exitosa,
**When** se inspeccionan los catálogos cerrados,
**Then** existen exactamente 6 `EventType` MVP (`wedding`, `xv`, `baptism`, `baby_shower`, `birthday`, `corporate`), 10–15 `ServiceCategory` con jerarquía de hasta 2 niveles culturalmente coherentes con LATAM, y los catálogos `Language` (`es-LATAM`, `es-ES`, `pt`, `en`) y `Currency` (`GTQ`, `USD`, `EUR`, `MXN`, `COP`) están activos (FR-SEED-003, NFR-DEMO-005, BR-SEED-004, BR-SEED-009).

#### AC-05: Cobertura de AIRecommendation determinista

**Given** `LLM_PROVIDER=mock` y `SEED_DEMO_ENABLED=true`,
**When** se ejecuta `npm run seed`,
**Then** se cargan ejemplos seed de `AIRecommendation` con `accepted=true` para las 8 features AI-001..AI-008, todas con respuestas deterministas del `MockAIProvider` (FR-SEED-006, BR-AI-005/006, NFR-AI-008).

#### AC-06: Reporte de ejecución estructurado

**Given** una ejecución exitosa,
**When** termina el script,
**Then** se emite por stdout un `SeedReport` que incluye `correlationId` (UUID), `startedAt`, `finishedAt`, `durationMs`, conteos por dominio (`created`, `updated`, `unchanged`, `skipped`) y la versión del script; el `correlationId` es único por ejecución (NFR-OBS-006).

### ⚠️ Edge Cases

#### EC-01: Base de datos no disponible

**Given** la base de datos no es alcanzable o las credenciales son inválidas,
**When** el developer ejecuta `npm run seed`,
**Then** el proceso termina con `exit code 1`, registra un log estructurado con `error.code` y `correlationId`, y no escribe ningún registro parcial.

#### EC-02: Migraciones Prisma desactualizadas

**Given** el schema de la base no coincide con el snapshot Prisma actual,
**When** se ejecuta el script,
**Then** el proceso aborta con `exit code 2`, mensaje claro `"Run prisma migrate deploy before seeding"` y enlace a la US-100; no se inserta ningún registro.

#### EC-03: Flag de seguridad ausente o entorno productivo

**Given** `SEED_DEMO_ENABLED` no está definido o es `false`, o `NODE_ENV=production`,
**When** se ejecuta `npm run seed`,
**Then** el proceso aborta con `exit code 2` y mensaje `"Seed disabled for current environment"`; no se ejecuta ninguna escritura (NFR-SEC-008, BR-PRIVACY-010).

#### EC-04: Falla parcial durante la ejecución

**Given** una falla transitoria durante la ejecución (p. ej. constraint violation por estado inconsistente),
**When** el script captura la excepción,
**Then** el proceso revierte el lote atómico en curso vía transacción Prisma, termina con `exit code 1` y reporta el dominio afectado en el `SeedReport`; las entidades ya confirmadas por lotes anteriores permanecen consistentes (NFR-OBS-006).

---

## 🚫 Validation Rules

| ID    | Rule                                                                                  | Message / Behavior                                                    |
| ----- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| VR-01 | Validar variables de entorno requeridas (`DATABASE_URL`, `SEED_DEMO_ENABLED`, `LLM_PROVIDER`) con Zod antes de iniciar. | Falla con `exit code 2` y mensaje específico de la variable faltante. |
| VR-02 | Validar que `NODE_ENV !== production` antes de cualquier escritura.                   | Aborta con `exit code 2` y mensaje `"Seed disabled for current environment"`. |
| VR-03 | Validar que todas las entidades sembradas cumplen `is_seed=true` y constraints del Data Model (C-008, C-022, C-026b, C-027b, C-031, C-041, C-043). | Aborta el lote vía transacción y reporta el constraint violado.       |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | El CLI no expone autenticación de aplicación; la autorización es a nivel de sistema operativo del operador que ejecuta el script. |
| SEC-02 | El script requiere `SEED_DEMO_ENABLED=true` y `NODE_ENV !== production` (Doc 14 §10.16; NFR-SEC-008).                            |
| SEC-03 | Sin PII real ni credenciales en repositorio: datos LATAM ficticios alineados con Doc 11 §6 (BR-PRIVACY-010, NFR-PRIV-004).        |
| SEC-04 | El acceso a `DATABASE_URL` se obtiene exclusivamente del entorno (no embebido en código fuente).                                  |

### Negative Authorization Scenarios

* `NODE_ENV=production` → aborta antes de cualquier escritura con `exit code 2`.
* `SEED_DEMO_ENABLED` ausente o `false` → aborta antes de cualquier escritura con `exit code 2`.
* Esta historia no introduce endpoints HTTP ni roles de aplicación, por lo que no aplican respuestas 401/403.

---

## 🤖 AI Behavior

Esta historia no invoca IA en tiempo real, pero **siembra** ejemplos deterministas de `AIRecommendation` para evidenciar el ciclo human-in-the-loop.

### AI Involvement

* AI Feature: AI-001..AI-008 (vía datos seed).
* Provider Layer: `MockAIProvider` (determinista).
* Human Validation Required: Las recomendaciones sembradas reflejan estados ya validados por humano (`accepted=true`).
* Persist `AIRecommendation`: Yes (seed data).
* Fallback Required: No aplica — el seed es offline (FR-DEMO-003).

### AI Input

* Plantillas fijas y deterministas del `MockAIProvider` (BR-AI-005/006).

### AI Output

* Registros `AIRecommendation` con `accepted=true`, `is_seed=true` y `prompt_version` documentado.

### Human-in-the-loop Rules

* Las recomendaciones seed representan decisiones que ya pasaron por validación humana en la narrativa demo (FR-AI-007).

### AI Error / Fallback Behavior

* No aplica — el `MockAIProvider` no falla y opera offline.

---

## 🎨 UX / UI Notes

No aplica — esta historia entrega un CLI sin interfaz gráfica.

| Area              | Notes                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Screen / Route    | N/A — CLI                                                          |
| Output Format     | stdout con `SeedReport` estructurado (texto plano legible + tabla) |
| Accessibility     | N/A — herramienta para developers                                  |
| i18n              | El contenido sembrado cubre `es-LATAM`, `es-ES`, `pt`, `en` (BR-I18N-001..008) |

---

## 🛠 Technical Notes

### Backend

* Use Case / Service: `SeedDemoDataUseCase` (Doc 14 §10.16, §11 #45).
* Entry point CLI: `apps/api/src/scripts/seed.ts` (o equivalente bajo el módulo `seed-demo`, según Doc 14 §10.16).
* `package.json` expone `"seed": "tsx src/scripts/seed.ts"` (o equivalente runtime TS).
* Authorization Policy: gating por env (`SEED_DEMO_ENABLED=true`, `NODE_ENV !== production`).
* Validation: Zod schema para variables de entorno; validaciones de constraints delegadas a Prisma / repositorios.
* Transaction Required: Sí, por dominio/lote (`prisma.$transaction`) para garantizar consistencia ante fallas parciales.
* Idempotencia: estrategia `upsert` con claves naturales estables (`is_seed=true` + ID semilla determinista por dominio).

### Frontend

No aplica.

### Database

* Main Tables: Todas las entidades del Data Model con campo `is_seed`.
* Constraints relevantes: C-008, C-022, C-026b, C-027b, C-031, C-041, C-043, C-056, C-057, C-058, C-060 (Doc 6 / Doc 18).
* Index Considerations: Índices por `is_seed`, `id` y claves naturales del dominio (US-101).
* Soft delete activo donde aplica (`Attachment`, `Review`) per Doc 8.1 §6 #19.

### API

No aplica — esta historia no expone endpoints HTTP. El endpoint `POST /api/v1/admin/seed/*` pertenece a US-086.

### Observability / Audit

* Correlation ID Required: Yes (`correlationId` UUID por ejecución, emitido en cada log y en el `SeedReport`).
* Log Event Required: Yes — logs estructurados a stdout (NFR-OBS-006), uno por dominio sembrado con conteos.
* AdminAction Required: No — esta ejecución es un CLI de developer; las acciones admin las registra US-086.
* AIRecommendation Required: Yes — sembradas con `is_seed=true` y `accepted=true`.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                | Type        |
| ----- | ----------------------------------------------------------------------- | ----------- |
| TS-01 | Ejecución desde base limpia genera los volúmenes mínimos (BR-SEED-002). | Integration |
| TS-02 | Re-ejecución consecutiva no crea duplicados (BR-SEED-001).              | Integration |
| TS-03 | Todas las entidades sembradas tienen `is_seed=true`.                    | Integration |
| TS-04 | Catálogos cerrados (`EventType`, `ServiceCategory`, `Language`, `Currency`) cumplen los conteos y enums esperados. | Integration |
| TS-05 | El `SeedReport` se emite con `correlationId`, conteos por dominio y `durationMs`. | Integration |
| TS-06 | Las `AIRecommendation` sembradas son deterministas y referencian respuestas del `MockAIProvider`. | Integration |

### Negative Tests

| ID    | Scenario                                                       | Expected Result                                                    |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| NT-01 | `SEED_DEMO_ENABLED` ausente o `false`.                         | Aborta con `exit code 2` y mensaje claro; no escribe.              |
| NT-02 | `NODE_ENV=production`.                                         | Aborta con `exit code 2` y mensaje `"Seed disabled for current environment"`; no escribe. |
| NT-03 | `DATABASE_URL` inválida o base inaccesible.                    | Aborta con `exit code 1`; log estructurado con `error.code` y `correlationId`. |
| NT-04 | Schema desactualizado (migraciones pendientes).                | Aborta con `exit code 2`; mensaje sugiere `prisma migrate deploy`. |
| NT-05 | Falla durante un lote (constraint violation simulada).         | Revierte la transacción del lote; `exit code 1`; resto consistente.|

### AI Tests

| ID      | Scenario                                                                                            | Type        |
| ------- | --------------------------------------------------------------------------------------------------- | ----------- |
| AI-T-01 | Las `AIRecommendation` sembradas para AI-001..AI-008 coinciden byte-a-byte entre dos ejecuciones (determinismo). | Integration |

### Authorization Tests

No aplica — esta historia no expone endpoints ni roles de aplicación. Las pruebas de autorización admin se cubren en US-086.

### Accessibility Tests

No aplica.

### Seed / Demo Tests

| ID      | Scenario                                                                            | Type        |
| ------- | ----------------------------------------------------------------------------------- | ----------- |
| SD-T-01 | Tras ejecutar `npm run seed`, la base soporta UC-DEMO-001 sin carga manual adicional. | Integration |
| SD-T-02 | Verificación automatizada de invariantes: ≥1 `confirmed_intent`, ≥1 review verificada (delegada a US-088 + verificación cruzada). | Integration |

---

## 📊 Business Impact

| Field               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| KPI Affected        | Demo readiness, time-to-onboarding de developers, estabilidad de la suite QA E2E. |
| Expected Impact     | Habilita la demo guiada de 10–15 min (NFR-DEMO-006), la suite E2E Playwright (PB-P2-016) y la evaluación académica reproducible. |
| Success Criteria    | `npm run seed` ejecutado dos veces sin duplicados; volúmenes BR-SEED-002 cumplidos; demo de UC-DEMO-001 ejecutable end-to-end sin intervención manual. |
| Academic Demo Value | Foundation P0 imprescindible: sin seed reproducible la evaluación académica no es repetible. |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

No aplica.

### Potential Backend Tasks

* Implementar `SeedDemoDataUseCase` con orquestación por dominios y `prisma.$transaction` por lote.
* Implementar entry point CLI `apps/api/src/scripts/seed.ts` que valida envs (Zod), inicializa correlation ID y ejecuta el use case.
* Exponer el script `seed` en `package.json` (`"seed": "tsx src/scripts/seed.ts"` o equivalente).
* Implementar `SeedReport` con conteos por dominio y `durationMs`.
* Strategia `upsert` con claves naturales estables para garantizar idempotencia.

### Potential Database Tasks

* Verificar que las migraciones Prisma incluyen `is_seed` en todas las entidades del Data Model (US-099/US-100).
* Confirmar índices por `is_seed` y claves naturales (US-101).

### Potential AI / PromptOps Tasks

* Garantizar respuestas deterministas del `MockAIProvider` para AI-001..AI-008 utilizadas por el seed.

### Potential QA Tasks

* Tests de integración para idempotencia, volúmenes, `is_seed=true`, catálogos cerrados y `SeedReport`.
* Tests negativos para envs faltantes / producción / DB inaccesible / migraciones desactualizadas.
* Test determinismo `AIRecommendation`.

### Potential DevOps / Config Tasks

* Job de GitHub Actions que ejecuta `npm run seed` sobre base efímera (NFR-DEMO-003, PB-P2-016 prerequisitos).
* Documentar variables `SEED_DEMO_ENABLED`, `LLM_PROVIDER`, `DATABASE_URL` en el README de operación.

---

## ✅ Definition of Ready

* [x] Rol claro (developer / demo runner del MVP).
* [x] Goal/valor claros (CLI único, idempotente, reproducible para demo y QA).
* [x] FRD/UC/BR enlazados (FR-SEED-001..007, BR-SEED-001..009, UC-DEMO-001).
* [x] Permisos identificados (gating por env, sin rol HTTP).
* [x] Entidades listadas (todas con `is_seed=true`).
* [x] AC en GWT (6 happy path + 4 edge cases).
* [x] Edge cases documentados (DB, migraciones, env, falla parcial).
* [x] Validación clara (Zod env, transacciones por lote).
* [x] Out of Scope explícito (US-086 endpoint, US-087 mix, US-088 confirmed_intent).
* [x] Dependencias conocidas (PB-P0-001/002/014, US-099/100, US-087/088).
* [x] UX states identificados (N/A — CLI con `SeedReport`).
* [x] API definida (N/A — esta historia es CLI; US-086 cubre el endpoint).
* [x] Tests definidos (integration, negativos, determinismo IA, seed/demo).
* [ ] PO/BA validó (pendiente Approval Gate — `eventflow-user-story-approval`).

---

## 🏁 Definition of Done

* [ ] `npm run seed` ejecutable desde repositorio limpio y produce volúmenes BR-SEED-002.
* [ ] Re-ejecución del comando no genera duplicados (BR-SEED-001, NFR-DEMO-003).
* [ ] 100% de entidades sembradas con `is_seed=true` (BR-SEED-005).
* [ ] Catálogos cerrados (`EventType`, `ServiceCategory`, `Language`, `Currency`) cumplen los enums esperados (NFR-DEMO-005).
* [ ] `AIRecommendation` deterministas para AI-001..AI-008 sembradas (FR-SEED-006).
* [ ] `SeedReport` con `correlationId`, conteos por dominio y `durationMs` emitido a stdout.
* [ ] Tests de integración y negativos en verde en CI.
* [ ] Script abortado correctamente cuando `SEED_DEMO_ENABLED!=true` o `NODE_ENV=production`.
* [ ] README de operación documenta el comando, variables de entorno y prerequisitos.
* [ ] PO valida (vía `eventflow-user-story-approval`).

---

## 📝 Notes

* El reset destructivo y el endpoint HTTP de admin pertenecen a US-086 (`SeedDemoController`, `ResetDemoUseCase`). Esta historia delibera el CLI exclusivamente.
* La cobertura de invariantes demo (≥1 `confirmed_intent`, ≥1 review verificada) se asegura combinando esta historia con US-087 y US-088.
* Trazabilidad académica: este script es la base operativa de la suite E2E (PB-P2-016) y de la evaluación académica reproducible (Doc 3 §14.4).
