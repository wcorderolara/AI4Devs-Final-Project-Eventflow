# 🧾 User Story: Reset surgical del entorno Demo desde panel admin

## 🆔 Metadata

| Field              | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| ID                 | US-140                                                       |
| Epic               | EPIC-OPS-001 / EPIC-SEED-001                                 |
| Feature            | Reset del entorno Demo (panel admin)                         |
| Module / Domain    | Admin / Seed / DevOps                                        |
| User Role          | Admin                                                        |
| Priority           | Must Have (P3)                                               |
| Status             | Approved with Minor Notes                                    |
| Owner              | Product Owner / Business Analyst                             |
| Approved By        | PO/BA Review                                                 |
| Approval Date      | 2026-07-07                                                  |
| Ready for Development Tasks | Yes                                                 |
| Sprint / Milestone | MVP — Demo Readiness (R4)                                    |
| Created Date       | 2026-06-09                                                  |
| Last Updated       | 2026-07-07                                                  |

> Backlog: **PB-P3-001 — Reset surgical del entorno Demo desde panel admin** (P3, Must Have). Alineación de prioridad realizada desde `Must Have (P0)` a `Must Have (P3)` según `management/artifacts/4-Product-Backlog-Prioritized.md` (fuente autoritativa por precedencia de decisiones).

---

## 🎯 User Story

**As an** admin del entorno Demo
**I want** disparar desde el panel admin un reset surgical del entorno Demo que limpia y vuelve a aplicar el seed
**So that** cada demo o ensayo académico comience desde un estado conocido, reproducible y auditado, sin redeploy ni intervención manual en base de datos

---

## 🧠 Business Context

### Context Summary
El MVP de EventFlow requiere que la demo guiada de 10–15 minutos (FR-DEMO-001 / UC-DEMO-001) pueda reiniciarse de forma reproducible entre sesiones. La capacidad de **reset surgical** (limpieza de filas `is_seed=true` + repoblado idempotente) ya está implementada como servicio backend y endpoint HTTP `POST /api/v1/admin/seed/reset` por **US-086 (PB-P0-014)**, que además define el contrato `ResetReportDto`. Esta historia (US-140 / PB-P3-001) entrega la **experiencia operativa desde el panel admin**: un control protegido, disponible únicamente en entorno Demo, que invoca ese endpoint, muestra el reporte de resultado y garantiza que la acción sea segura, auditada y trazable. No reimplementa el motor de reset; lo reutiliza.

### Related Domain Concepts
* Reset surgical filtrado por `is_seed=true` (Doc 11 §29).
* Repoblado idempotente vía `SeedDemoDataUseCase` (US-085 / US-086).
* `ResetReportDto` (contrato definido en US-086): `entitiesDeleted`, `entitiesReseeded`, `seedVersion`, `correlationId`, `durationMs`.
* Gating operativo por entorno Demo (`APP_ENV=demo` / feature flag `SEED_DEMO_ENABLED=true`).
* Auditoría obligatoria en `AdminAction` (`action='SEED_RESET'` / `'SEED_RESET_FAILED'`).
* Correlation ID (`X-Correlation-Id`) propagado a logs, respuesta y `AdminAction`.

### Assumptions
* US-086 (PB-P0-014) ya entrega el endpoint `POST /api/v1/admin/seed/reset`, el core `ResetDemoUseCase` y el DTO `ResetReportDto`. US-140 los consume, no los reimplementa.
* El feature flag `SEED_DEMO_ENABLED=true` está activo únicamente en entornos Demo/Dev; en el resto la ruta no se registra y el backend responde `404` (Doc 19 §THR-012).
* Existe una cuenta admin sembrada (SEED-USER-001) para operar el panel (Doc 11 §12).
* La UI admin base (panel/layout autenticado) está disponible como dependencia de las historias P2 de frontend admin.

### Dependencies
* **PB-P0-014 / US-086** — endpoint `POST /api/v1/admin/seed/reset` + `ResetReportDto` (dependencia dura; US-140 reutiliza este contrato).
* **PB-P2-022 / PB-P2-023 / PB-P2-024** — deploy backend en AWS, RDS PostgreSQL gestionado y Secrets Manager (entorno Demo desplegado con secretos gestionados).
* Panel admin autenticado (layout admin) como contenedor de la acción.

---

## 🔗 Traceability

| Source                 | Reference                                                                 |
| ---------------------- | ------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-DEMO-001                                                               |
| Use Case(s)            | UC-DEMO-001                                                               |
| Business Rule(s)       | BR-SEED-002, BR-SEED-005, BR-ADMIN-004, BR-ADMIN-011                      |
| Permission Rule(s)     | SEC-POL-ADMIN-003 (Doc 19); solo rol `admin` + `SEED_DEMO_ENABLED=true`   |
| Data Entity / Entities | `AdminAction`; entidades con `is_seed=true` (lectura/reset vía US-086)    |
| API Endpoint(s)        | `POST /api/v1/admin/seed/reset` (reutilizado de US-086); `GET /api/v1/admin/seed/status` |
| NFR Reference(s)       | NFR-DEMO-003 (idempotencia), NFR-OBS-001 (auditoría), NFR-PERF-001 (P95 < 1.5s), NFR-SEC-008 (sin secretos en logs/repo) |
| Related ADR(s)         | ADR-TEST-001 (Vitest + Supertest), ADR-SEC-003 (RBAC backend), ADR-SEC-005 (secretos en Secret Manager), ADR-DEVOPS-001 (deploy AWS) |
| Related Document(s)    | Doc 11 §29, Doc 16 §39, Doc 19 §THR-012/§SEC-POL-ADMIN-003, Doc 20, Doc 21 |
| Threat Reference       | THR-012 (Doc 19) — seed reset en producción                              |
| Reused Contract        | `ResetReportDto` (definido en `management/technical-specs/P0/PB-P0-014/US-086-technical-spec.md`) |

> Nota de trazabilidad: la referencia previa `NFR-PERF-API-001` no existe en Doc 10 y fue reemplazada por `NFR-PERF-001` (P95 < 1.5s en endpoints no-IA). El comodín `NFR-TEST-*` se reemplazó por `NFR-DEMO-003` y `NFR-SEC-008` verificados.

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have (P3 — Demo Readiness)

### Explicitly Out of Scope
* **Motor de reset core** (`ResetDemoUseCase`, deletes por lote filtrados por `is_seed=true`, orden FK, lock de concurrencia) → pertenece a **US-086 (PB-P0-014)**. US-140 lo reutiliza, no lo reimplementa.
* Definición o cambio del contrato `ResetReportDto` → propiedad de US-086.
* Runner CLI `npm run seed` / `seed:reset` → US-085 (PB-P0-014).
* Ejecución del reset en producción o fuera del entorno Demo.
* Resets parciales por entidad, snapshots, backups previos o reset programado (cron).
* Modificación de filas con `is_seed=false`.
* Aplicación o reversión de migraciones Prisma.

### Scope Notes
* Esta historia no introduce pagos, contratos, chat en tiempo real, WhatsApp, push nativo ni IA autónoma.
* Esta historia no debe reabrir decisiones ya formalizadas en US-086 (reset surgical, `404` ante flag apagado, `AdminAction` obligatorio, repoblado idempotente delegado).
* El backend permanece como única fuente de verdad de autorización; el panel no implementa lógica de autorización propia.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Reset disparado desde el panel admin en entorno Demo
**Given** un admin autenticado en el panel admin de un entorno con `APP_ENV=demo` / `SEED_DEMO_ENABLED=true`
**When** confirma la acción "Reset del entorno Demo"
**Then** el panel invoca `POST /api/v1/admin/seed/reset`, recibe `202 Accepted` con un `ResetReportDto` y muestra el resumen (`entitiesDeleted`, `entitiesReseeded`, `seedVersion`, `durationMs`, `correlationId`).

### AC-02: Reset idempotente
**Given** un reset ejecutado con éxito desde el panel
**When** el admin ejecuta el reset una segunda vez consecutiva
**Then** el entorno converge al mismo estado seed (conteos por entidad equivalentes), sin duplicados, cumpliendo NFR-DEMO-003.

### AC-03: Acción auditada con correlation ID
**Given** una invocación de reset (exitosa o fallida) desde el panel
**When** se procesa la solicitud
**Then** se registra una fila en `AdminAction` (`action='SEED_RESET'` en éxito, `'SEED_RESET_FAILED'` en error) con el mismo `correlationId` presente en la respuesta y en el header `X-Correlation-Id` (NFR-OBS-001, BR-ADMIN-004/011).

---

## ⚠️ Edge Cases

### EC-01: Entorno no Demo → acción no disponible / 404
**Given** un entorno con `APP_ENV != demo` / `SEED_DEMO_ENABLED=false`
**When** se intenta acceder al control de reset o invocar `POST /api/v1/admin/seed/reset`
**Then** la ruta no está registrada y el backend responde `404 Not Found`; el panel no expone el control operativo (Doc 19 §THR-012).

#### Handling
* El control de reset se oculta o se deshabilita en entornos no Demo.
* Ante `404`, el panel muestra un estado informativo ("no disponible en este entorno") sin filtrar la existencia del endpoint.

### EC-02: Reset en curso (concurrencia)
**Given** un reset ya en ejecución
**When** un segundo disparo llega antes de completar el primero
**Then** el backend responde `409 seed_reset_in_progress` y el panel muestra que hay un reset en curso, sin reintentar automáticamente.

#### Handling
* Deshabilitar el botón mientras el request está en vuelo (loading state).
* Mostrar el `correlationId` para diagnóstico.

### EC-03: Falla parcial durante el reset
**Given** una falla transitoria durante la limpieza/repoblado
**When** el backend aborta el lote
**Then** responde `500` con `{ code: 'seed_reset_failed', correlationId }`, registra `AdminAction` con `action='SEED_RESET_FAILED'` y el panel muestra un mensaje de error controlado sin exponer stack traces.

#### Handling
* Error state con mensaje neutral y `correlationId` visible.
* No exponer trazas internas ni SQL en la UI.

---

## 🚫 Validation Rules

| ID    | Rule                                                         | Message / Behavior                                  |
| ----- | ------------------------------------------------------------ | --------------------------------------------------- |
| VR-01 | Solo disponible si `SEED_DEMO_ENABLED=true` (entorno Demo).  | Fuera de Demo → ruta no registrada → `404`.         |
| VR-02 | Requiere confirmación explícita antes de invocar el reset.   | Modal de confirmación obligatorio en el panel.      |
| VR-03 | Body opcional `reason` (Zod `strict`, ≤ 500 chars).          | Campo desconocido / inválido → `400` (contrato US-086). |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------ |
| SEC-01 | Solo rol `admin` autenticado puede disparar el reset (backend como fuente de verdad, ADR-SEC-003). |
| SEC-02 | Doble gate: `requireAuth()` + `requireRole('admin')` + `SEED_DEMO_ENABLED=true` (SEC-POL-ADMIN-003). |
| SEC-03 | Fuera de entorno Demo la ruta no se registra → `404` (no `403`), evitando fingerprinting (THR-012). |
| SEC-04 | Sin secretos ni tokens en logs ni en la respuesta; secretos solo vía Secrets Manager (NFR-SEC-008, ADR-SEC-005). |
| SEC-05 | Toda invocación (éxito o fallo) queda auditada en `AdminAction` (NFR-OBS-001, BR-ADMIN-004/011).  |

### Negative Authorization Scenarios
* Usuario anónimo → `401 unauthorized`.
* Usuario `organizer` / `vendor` autenticado → `403 forbidden`.
* Admin en entorno no Demo (`SEED_DEMO_ENABLED=false`) → `404 not found` (ruta no registrada).
* Token expirado → `401 unauthorized`.
* Acción admin siempre auditada en `AdminAction`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No
* Fallback Required: Not applicable

### AI Input
* Not applicable for this story.

### AI Output
* Not applicable for this story.

### Human-in-the-loop Rules
* Not applicable for this story.

### AI Error / Fallback Behavior
* Not applicable for this story. Las `AIRecommendation` se resiembran vía `SeedDemoDataUseCase` (US-086), no por esta historia.

---

## 🎨 UX / UI Notes

| Area                | Notes                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Screen / Route      | Panel admin — sección operativa Demo (visible solo si `SEED_DEMO_ENABLED=true`).            |
| Main UI Pattern     | Acción con modal de confirmación + panel de resultado (`ResetReport`).                      |
| Primary Action      | Botón "Reset del entorno Demo".                                                             |
| Secondary Actions   | Cancelar / Cerrar reporte.                                                                  |
| Empty State         | Sin ejecuciones previas: mostrar estado de `GET /api/v1/admin/seed/status`.                 |
| Loading State       | Botón deshabilitado + spinner mientras el request está en vuelo.                            |
| Error State         | Mensaje neutral con `correlationId`; sin stack traces ni datos sensibles.                   |
| Success State       | Resumen del `ResetReportDto` (conteos por entidad, `seedVersion`, `durationMs`).            |
| Accessibility Notes | Confirmación accesible por teclado; foco gestionado en el modal; labels/ARIA en el botón.   |
| Responsive Notes    | Panel usable en desktop/tablet.                                                              |
| i18n Notes          | Textos del control en `es-LATAM`, `es-ES`, `pt`, `en`.                                       |
| Currency Notes      | No aplica.                                                                                   |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: Sección operativa Demo dentro del panel admin (render condicional a `SEED_DEMO_ENABLED`).
* Components: Botón de reset, modal de confirmación, panel de `ResetReport`, estado desde `seed/status`.
* State Management: TanStack Query (mutation para el POST reset; query para el status).
* Forms: Confirmación con `reason` opcional (validación cliente alineada al schema de US-086).
* API Client: Método `resetDemoSeed()` que consume `POST /api/v1/admin/seed/reset` y tipa la respuesta con `ResetReportDto`.

### Backend
* Use Case / Service: **Ninguno nuevo.** Reutiliza `ResetDemoUseCase` y el endpoint de US-086.
* Controller / Route: `POST /api/v1/admin/seed/reset` (existente, US-086 / `SeedDemoController`).
* Authorization Policy: RBAC admin + feature flag (implementado en US-086; US-140 no lo reimplementa).
* Validation: Contrato `ResetRequestSchema` (US-086).
* Transaction Required: No aplica a US-140 (la transacción vive en el core de US-086).

### Database
* Main Tables: `AdminAction` (auditoría, gestionada por US-086). Sin cambios de esquema en US-140.
* Constraints: No introduce constraints ni migraciones.
* Index Considerations: N/A (índices sobre `is_seed` los coordina US-101).

### API

| Method | Endpoint                        | Purpose                                                        |
| ------ | ------------------------------- | ------------------------------------------------------------- |
| POST   | `/api/v1/admin/seed/reset`      | Disparar reset surgical + repoblado (reutilizado de US-086).  |
| GET    | `/api/v1/admin/seed/status`     | Mostrar estado del seed (`lastRunAt`, `recordCount`).         |

### Observability / Audit
* Correlation ID Required: Yes (`X-Correlation-Id` propagado y mostrado en el panel).
* Log Event Required: Yes (`seed.reset.{started,completed,failed}` — emitidos por US-086).
* AdminAction Required: Yes (`SEED_RESET` / `SEED_RESET_FAILED`).
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                 | Type              |
| ----- | ------------------------------------------------------------------------ | ----------------- |
| TS-01 | Panel dispara reset en Demo → `202` + `ResetReport` renderizado.          | Integration / E2E |
| TS-02 | Doble ejecución consecutiva → estado idempotente (conteos equivalentes).  | Integration       |
| TS-03 | `AdminAction` registrado con `SEED_RESET` y mismo `correlationId`.         | Integration       |
| TS-04 | Estado del seed refleja `lastRunAt`/`recordCount` tras el reset.          | Integration       |

### Negative Tests

| ID    | Scenario                                                    | Expected Result                          |
| ----- | ----------------------------------------------------------- | ---------------------------------------- |
| NT-01 | Invocación en entorno no Demo (`SEED_DEMO_ENABLED=false`).  | `404 not found`; control no expuesto.    |
| NT-02 | Reset en curso + segundo disparo.                           | `409 seed_reset_in_progress`.            |
| NT-03 | Falla parcial inyectada.                                    | `500 seed_reset_failed` + `AdminAction` `SEED_RESET_FAILED`. |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                  | Expected Result   |
| ---------- | ----------------------------------------- | ----------------- |
| AUTH-TS-01 | Admin en Demo dispara el reset.           | `202` Success.    |
| AUTH-TS-02 | Rol `organizer` / `vendor` invoca reset.  | `403 Forbidden`.  |
| AUTH-TS-03 | Usuario anónimo invoca reset.             | `401 Unauthorized`. |
| AUTH-TS-04 | Respuesta `404` no revela existencia del endpoint. | Sin headers reveladores. |

### Accessibility Tests
* Navegación por teclado del botón y del modal de confirmación.
* Gestión de foco al abrir/cerrar el modal.
* Labels y ARIA en el control de reset.

---

## 📊 Business Impact

| Field               | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| KPI Affected        | Demo Completion / Demo Readiness / Time-to-reset                      |
| Expected Impact     | Demo reproducible bajo demanda sin redeploy ni intervención manual.   |
| Success Criteria    | Reset desde el panel deja el entorno en estado seed conocido y auditado; smoke E2E verde. |
| Academic Demo Value | Alto — habilita reinicio confiable entre ensayos y evaluación académica (R4). |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* Sección operativa Demo en el panel admin con render condicional al flag.
* Botón de reset + modal de confirmación + panel de `ResetReport`.
* Mutation/query TanStack contra `seed/reset` y `seed/status`; manejo de `202/400/401/403/404/409/500`.

### Potential Backend Tasks
* Ninguno nuevo (reutiliza endpoint y core de US-086). Verificar contrato `ResetReportDto`.

### Potential Database Tasks
* Ninguna (sin cambios de esquema ni migraciones en US-140).

### Potential AI / PromptOps Tasks
* No aplica.

### Potential QA Tasks
* E2E del flujo panel → reset → reporte; tests de autorización (401/403/404); idempotencia; auditoría.

### Potential DevOps / Config Tasks
* Asegurar `SEED_DEMO_ENABLED=true` únicamente en entorno Demo; secretos vía Secrets Manager (PB-P2-024).

---

## ✅ Definition of Ready

* [x] Rol claro (Admin).
* [x] Goal y valor de negocio claros.
* [x] FRD / Use Case / Business Rules enlazados y verificados.
* [x] Permisos y gating de seguridad identificados (admin + `SEED_DEMO_ENABLED`).
* [x] Entidades listadas (`AdminAction`; entidades `is_seed`).
* [x] AC en formato Given/When/Then.
* [x] Edge cases documentados (no Demo, concurrencia, falla parcial).
* [x] Reglas de validación claras.
* [x] Out of Scope explícito (core reset = US-086).
* [x] Dependencias conocidas (PB-P0-014/US-086, PB-P2-022..024).
* [x] Estados de UX identificados.
* [x] API definida (reutiliza contrato US-086).
* [x] Test scenarios definidos.
* [x] PO / BA revisó la historia.

---

## 🏁 Definition of Done

* [ ] Panel admin dispara el reset reutilizando `POST /api/v1/admin/seed/reset` y `ResetReportDto`.
* [ ] Control visible solo en entorno Demo; `404` fuera de Demo.
* [ ] Autorización backend enforced (401/403/404) verificada.
* [ ] Idempotencia confirmada por pruebas (NFR-DEMO-003).
* [ ] `AdminAction` registrado con `correlationId` en éxito y fallo (NFR-OBS-001).
* [ ] Sin secretos en logs ni en la respuesta (NFR-SEC-008).
* [ ] Estados de UX (loading/error/success/empty) manejados y accesibles.
* [ ] Tests funcionales, negativos y de autorización agregados/actualizados.
* [ ] i18n de los textos del control cubierta.
* [ ] Documentación del panel actualizada; sin reabrir decisiones de US-086.
* [ ] PO / reviewer valida la historia.
* [ ] Merge y disponible en el entorno Demo.

---

## 📝 Notes
* US-140 (PB-P3-001) construye sobre **US-086 (PB-P0-014)**: reutiliza el endpoint `POST /api/v1/admin/seed/reset`, el core `ResetDemoUseCase` y el contrato `ResetReportDto`. No reimplementa el motor de reset (evita duplicación / scope creep).
* Alineación documental (no bloqueante): Doc 19 §587/§1205 menciona `403` para admin sin flag, mientras THR-012, PB-P3-001 y la spec de US-086 formalizan `404` (ruta no registrada). Se adopta `404` como comportamiento vigente.
* Alineación documental (no bloqueante): el backlog describe el gate como `APP_ENV=demo`; el gate técnico efectivo es el feature flag `SEED_DEMO_ENABLED=true`, activo solo en entorno Demo/Dev. Conceptualmente equivalentes.
* Corrección de prioridad `Must Have (P0)` → `Must Have (P3)` según backlog priorizado autoritativo (PB-P3-001).
* Corrección de trazabilidad: `NFR-PERF-API-001` (inexistente) → `NFR-PERF-001`; `NFR-TEST-*` → `NFR-DEMO-003` + `NFR-SEC-008`.
