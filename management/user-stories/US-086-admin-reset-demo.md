# 🧾 User Story: Admin reset surgical del entorno Demo vía endpoint HTTP

## 🆔 Metadata

| Field                       | Value                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| ID                          | US-086                                                           |
| Epic                        | EPIC-SEED-001 — Seed Data & Demo Scenarios                       |
| Backlog Item                | PB-P0-014 — Seed Script Idempotente + Datos Demo                 |
| Feature                     | Reset surgical Demo (endpoint admin)                             |
| Module / Domain             | `seed-demo` (Backend, transversal de escritura controlada)       |
| User Role                   | Admin (Product Owner / operador de demo) + Sistema (flag)        |
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

**As an** admin autenticado del entorno Demo de EventFlow
**I want** invocar el endpoint `POST /api/v1/admin/seed/reset` para limpiar y reaplicar el seed de forma surgical (solo entidades con `is_seed=true`)
**So that** las demos académicas, los entrenamientos y la suite QA E2E inicien siempre desde un estado seed conocido, idempotente y reproducible, sin afectar datos operativos reales y registrando la acción en `AdminAction` para auditoría.

---

## 🧠 Business Context

### Context Summary

El endpoint `POST /api/v1/admin/seed/reset` materializa la operación surgical de reset del entorno Demo descrita en Doc 11 §29 y Doc 14 §10.16. Invoca el `ResetDemoUseCase` (Doc 14 §11 #46) del módulo `seed-demo`, que elimina exclusivamente entidades con `is_seed=true` y vuelve a aplicar la siembra de forma idempotente. El endpoint vive en el `SeedDemoController` (Doc 14 §10.16 / Doc 16 §39.2), está protegido por el flag operativo `SEED_DEMO_ENABLED=true` y por rol `admin`, y registra la acción en `AdminAction` (BR-ADMIN-004/011, NFR-OBS-001).

Esta historia cubre la entrega HTTP del reset surgical. El runner CLI `npm run seed` reside en US-085. El mix de eventos `draft`/`active`/`completed` reside en US-087 y el `BookingIntent.confirmed_intent` en US-088. El panel admin con UI dedicada para disparar el reset desde el frontend está fuera de este alcance y pertenece a PB-P3-001 / US-140.

### Related Domain Concepts

* Entidades del Data Model marcadas con `is_seed=true`: `User`, `OrganizerProfile`, `VendorProfile`, `VendorService`, `EventType`, `ServiceCategory`, `Event`, `EventTask`, `Budget`, `BudgetItem`, `QuoteRequest`, `Quote`, `BookingIntent`, `Review`, `AIRecommendation`, `Notification`, `Language`, `Currency`.
* Use Cases: `ResetDemoUseCase` (Doc 14 §11 #46), `SeedDemoDataUseCase` (Doc 14 §11 #45) invocado tras la limpieza para repoblar.
* Controller: `SeedDemoController` con `POST /api/v1/admin/seed/run`, `POST /api/v1/admin/seed/reset`, `GET /api/v1/admin/seed/status` (Doc 16 §39.2).
* Auditoría: `AdminAction` con `admin_id`, `action='SEED_RESET'`, `target_type='seed-demo'`, `reason` opcional y timestamp (BR-ADMIN-004/011, NFR-OBS-001).
* Job de fondo relacionado: `SeedResetJob` (Doc 14 §10.16) reutilizable internamente.
* Flag operativo: `SEED_DEMO_ENABLED` (Doc 14 §15.2 SEED) y `APP_ENV` (PB-P3-001).

### PO/BA Decisions Applied

* El reset es surgical y opera únicamente sobre filas con `is_seed=true` (Doc 11 §29, Doc 16 §39.4).
* El endpoint queda deshabilitado por defecto y solo se expone cuando `SEED_DEMO_ENABLED=true`. Cuando el flag está apagado el servidor responde `404 Not Found` para evitar fingerprinting del endpoint (alineado con PB-P3-001 "404 si no es Demo" y Doc 19 §THR-012).
* La acción queda registrada de forma obligatoria en `AdminAction` (BR-ADMIN-004/011, NFR-OBS-001).
* El reset se asume síncrono dentro del timeout estándar de la API; ante volúmenes mayores el use case puede operar por lotes transaccionales (Doc 14 §11 #46 — `$transaction` chunked).
* No se introduce UI admin en esta historia; la invocación se realiza vía cliente HTTP o desde la pipeline E2E. La UI pertenece a PB-P3-001 / US-140.

### Assumptions

* US-085 ya provee el `SeedDemoDataUseCase` y el script CLI; el endpoint reusa esa misma capacidad de siembra.
* US-099 / US-100 garantizan el campo `is_seed` y los índices necesarios en todas las entidades del Data Model.
* El backend modular monolith ya está bootstrapped (PB-P0-002) y expone `/api/v1/*` con autenticación JWT.
* La política `SEED_DEMO_ENABLED=false` por defecto en `prod` (Doc 14 §15.2 SEED) está aplicada en la configuración del entorno.
* Los datos seed no contienen PII real (BR-SEED-010, BR-PRIVACY-010, NFR-PRIV-004).

### Dependencies

* **PB-P0-001 / US-099 / US-100**: Schema Prisma con `is_seed` e índices.
* **PB-P0-002 / US-089**: Backend modular monolith bootstrap, middlewares de auth y rol admin.
* **PB-P0-014 / US-085**: Runner CLI y `SeedDemoDataUseCase` (la limpieza repobla reutilizando esta capacidad).
* **PB-P0-014 / US-087**: Mix de eventos seed.
* **PB-P0-014 / US-088**: `BookingIntent.confirmed_intent` en seed.
* **PB-P3-001 / US-140**: Panel admin con UI para disparar el reset — fuera de este alcance.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | FR-SEED-002, FR-SEED-007, FR-DEMO-001                                                                                                    |
| Use Case(s)            | UC-DEMO-001                                                                                                                              |
| Business Rule(s)       | BR-SEED-001, BR-SEED-002, BR-SEED-005, BR-SEED-008, BR-SEED-010, BR-PRIVACY-010, BR-ADMIN-004, BR-ADMIN-011                               |
| Permission Rule(s)     | Rol `admin` (Doc 5 / Doc 19 §10) + flag `SEED_DEMO_ENABLED=true` (Doc 14 §10.16 / §15.2 SEED)                                             |
| Data Entity / Entities | Todas las entidades con `is_seed=true` (ver §Related Domain Concepts); `AdminAction` para auditoría                                       |
| API Endpoint(s)        | `POST /api/v1/admin/seed/reset` (Doc 16 §39.2)                                                                                            |
| NFR Reference(s)       | NFR-PERF-001, NFR-DEMO-001, NFR-DEMO-002, NFR-DEMO-003, NFR-OBS-001, NFR-OBS-006, NFR-PRIV-004, NFR-SEC-008                                |
| Related ADR(s)         | ADR-DEVOPS-003 (App Runner), ADR-DEVOPS-004 (RDS), ADR-DEVOPS-006 (GitHub Actions)                                                       |
| Related Document(s)    | `/docs/3-MVP-Scope-Definition.md` §7.16, §14.4; `/docs/11-Data-Seed-Strategy.md` §29; `/docs/14-Backend-Technical-Design.md` §10.16 / §11 #46; `/docs/16-API-Design-Specification.md` §39; `/docs/19-Security-and-Authorization-Design.md` §THR-012, §9.2; `/management/artifacts/4-Product-Backlog-Prioritized.md` PB-P0-014 |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope

* Implementar `ResetDemoUseCase` (Doc 14 §11 #46) en el módulo `seed-demo`.
* Exponer `POST /api/v1/admin/seed/reset` en `SeedDemoController` (Doc 16 §39.2).
* Gating por env var `SEED_DEMO_ENABLED=true` y por rol `admin`.
* Limpieza surgical filtrada por `is_seed=true` (Doc 11 §29, Doc 16 §39.4).
* Reaplicación idempotente del seed delegando en `SeedDemoDataUseCase`.
* Registro obligatorio en `AdminAction` con `admin_id`, `action='SEED_RESET'`, `target_type='seed-demo'`, `correlationId` y timestamp.
* Respuesta HTTP `202 Accepted` con `ResetReport` sintético (entidades eliminadas, entidades repobladas, `seedVersion`, `correlationId`, `durationMs`).
* `404 Not Found` cuando el flag está apagado, para no exponer la existencia del endpoint fuera del entorno demo.

### Explicitly Out of Scope

* UI admin (botón de reset) y experiencia frontend → pertenece a PB-P3-001 / US-140.
* Limpieza de filas con `is_seed=false` o datos operativos reales (prohibido por Doc 11 §29 y Doc 14 §10.16).
* Resets parciales por entidad o por dominio (no contemplado en MVP).
* Snapshots o backups previos al reset (fuera de alcance MVP).
* Reset en entorno `prod` (excluido por flag por defecto `SEED_DEMO_ENABLED=false`).
* Cualquier escenario fuera de MVP cubierto por BR-OOS-001..017.

### Scope Notes

* La invariante surgical (`solo is_seed=true`) es la mitigación principal de THR-012 y debe verificarse en QA con datos no-seed presentes en BD.
* La idempotencia se valida ejecutando el reset N veces sobre la misma base; los conteos resultantes deben ser estables.
* El endpoint no expone progreso parcial en MVP; basta con respuesta sincrónica o asíncrona con `202`.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Reset surgical exitoso con flag activo y rol admin
**Given** el entorno tiene `SEED_DEMO_ENABLED=true` y existe un usuario autenticado con rol `admin`
**And** la base de datos contiene una mezcla de filas con `is_seed=true` (datos seed) y filas con `is_seed=false` (datos operativos simulados)
**When** el admin invoca `POST /api/v1/admin/seed/reset`
**Then** la respuesta es `202 Accepted` con un `ResetReport` que incluye `entitiesDeleted`, `entitiesReseeded`, `seedVersion`, `correlationId` y `durationMs`
**And** todas las filas con `is_seed=true` fueron eliminadas y vueltas a sembrar
**And** ninguna fila con `is_seed=false` fue alterada
**And** los conteos finales por entidad cumplen las invariantes BR-SEED-002 / NFR-DEMO-001.

### AC-02: Idempotencia ante invocaciones consecutivas
**Given** se acaba de ejecutar `POST /api/v1/admin/seed/reset` con éxito
**When** se invoca nuevamente el mismo endpoint con las mismas credenciales y flags
**Then** la respuesta vuelve a ser `202 Accepted`
**And** los conteos finales por entidad son idénticos a los de la ejecución previa
**And** no se generan duplicados ni claves naturales en conflicto.

### AC-03: Registro obligatorio en `AdminAction`
**Given** un reset surgical exitoso
**When** la operación finaliza
**Then** existe exactamente una fila en `AdminAction` con `admin_id=<actor>`, `action='SEED_RESET'`, `target_type='seed-demo'`, `correlationId=<mismo>` que el `ResetReport`, `created_at` dentro de la ventana de la operación
**And** el log estructurado contiene `correlationId`, `entitiesDeleted`, `entitiesReseeded`, `seedVersion` y `durationMs`.

### AC-04: `GET /api/v1/admin/seed/status` refleja el último reset
**Given** un reset surgical exitoso
**When** el admin invoca `GET /api/v1/admin/seed/status`
**Then** la respuesta `200 OK` reporta `lastRunAt` actualizado, `preset` consistente y `recordCount` por entidad alineado con BR-SEED-002.

---

## ⚠️ Edge Cases

### EC-01: Flag `SEED_DEMO_ENABLED=false`
**Given** el entorno tiene `SEED_DEMO_ENABLED=false`
**When** un cliente invoca `POST /api/v1/admin/seed/reset`
**Then** la respuesta es `404 Not Found`
**And** no se ejecuta el `ResetDemoUseCase`
**And** no se registra fila en `AdminAction`
**And** no se altera ninguna entidad.

#### Handling
* La respuesta `404` es intencional para evitar fingerprinting (Doc 19 §THR-012, PB-P3-001 "404 si no es Demo").

### EC-02: Falla parcial durante el reset
**Given** la fase de limpieza o repoblado falla a mitad del procesamiento
**When** se detecta el error
**Then** la transacción del lote afectado se revierte (`$transaction` chunked)
**And** la respuesta es `500 Internal Server Error` con `correlationId`
**And** se registra el evento como acción admin parcial (`action='SEED_RESET_FAILED'`) en `AdminAction`
**And** el `ResetReport` parcial se loggea estructuradamente con el conteo logrado antes del fallo.

#### Handling
* Rollback por lote transaccional preserva consistencia (Doc 14 §11 #46).
* Las migraciones Prisma no se aplican desde este endpoint; el error debe ser explícito si el schema no está al día.

### EC-03: Concurrencia entre dos resets simultáneos
**Given** dos invocaciones concurrentes a `POST /api/v1/admin/seed/reset` con el mismo admin o admins distintos
**When** la segunda invocación llega mientras la primera está en curso
**Then** la segunda recibe `409 Conflict` con código `seed_reset_in_progress`
**And** el `correlationId` de la primera invocación permanece en logs
**And** ambas acciones (la exitosa y la rechazada por conflicto) quedan registradas en `AdminAction`.

#### Handling
* Lock optimista o semáforo a nivel de aplicación durante el reset.

---

## 🚫 Validation Rules

| ID    | Rule                                                                                                  | Message / Behavior                          |
| ----- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| VR-01 | Request body opcional; cualquier `unknown` field debe rechazarse vía Zod `strict()` cuando se envía.  | `400 Bad Request` con detalle por campo.    |
| VR-02 | `SEED_DEMO_ENABLED` debe estar en `true` en el contexto del request para registrar el route.          | Sin flag → `404 Not Found` (EC-01).         |
| VR-03 | Header `Authorization: Bearer <token>` requerido.                                                     | Sin token o token inválido → `401`.         |
| VR-04 | El claim de rol del token debe ser `admin`.                                                           | Rol distinto → `403`.                       |
| VR-05 | `correlationId` se genera si no viene en el header `X-Correlation-Id`.                                 | Backend rellena y propaga.                  |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Autorización backend enforced: solo rol `admin` puede invocar `POST /api/v1/admin/seed/reset` (Doc 19 §10, Doc 5).          |
| SEC-02 | Gating operativo por env var `SEED_DEMO_ENABLED=true`. Por defecto `false` en `prod` (Doc 14 §15.2 SEED).                    |
| SEC-03 | Sin flag activo el endpoint no debe registrarse en el router; respuesta `404` para no revelar su existencia (THR-012).      |
| SEC-04 | El reset elimina únicamente filas con `is_seed=true`; cualquier fila con `is_seed=false` queda fuera del filtro de deletes. |
| SEC-05 | Cada invocación queda registrada en `AdminAction` (BR-ADMIN-004/011, NFR-OBS-001).                                          |
| SEC-06 | No se devuelven PII reales en el `ResetReport`; solo metadatos agregados (conteos, IDs estables).                            |
| SEC-07 | `AdminAction` y logs no deben incluir secretos, tokens ni credenciales (NFR-SEC-008).                                       |
| SEC-08 | Rate limiting recomendado al endpoint para mitigar DoS controlado en demo (alineado con Doc 19 §10 endpoints admin).         |

### Negative Authorization Scenarios

* Cliente anónimo → `401 Unauthorized`.
* Rol `organizer` o `vendor` → `403 Forbidden`.
* Rol `admin` con `SEED_DEMO_ENABLED=false` → `404 Not Found` (EC-01).
* Token expirado o inválido → `401 Unauthorized`.

---

## 🤖 AI Behavior

This story does not invoke AI directly.

### AI Involvement
* AI Feature: None
* Provider Layer: Not applicable
* Human Validation Required: Not applicable
* Persist AIRecommendation: No (las `AIRecommendation` se siembran durante el repoblado vía `SeedDemoDataUseCase`; este endpoint no genera nuevas)
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

No aplica — esta historia entrega únicamente el endpoint HTTP. La UI admin para disparar el reset pertenece a PB-P3-001 / US-140. Los clientes válidos son: cliente HTTP (curl/Postman), scripts de QA E2E y la pipeline de demo.

| Area                | Notes                                                                |
| ------------------- | -------------------------------------------------------------------- |
| Screen / Route      | No aplica                                                            |
| Main UI Pattern     | No aplica                                                            |
| Primary Action      | No aplica                                                            |
| Secondary Actions   | No aplica                                                            |
| Empty State         | No aplica                                                            |
| Loading State       | No aplica                                                            |
| Error State         | No aplica                                                            |
| Success State       | No aplica                                                            |
| Accessibility Notes | No aplica                                                            |
| Responsive Notes    | No aplica                                                            |
| i18n Notes          | Mensajes de error vía contrato API en `en` (idioma técnico de logs)  |
| Currency Notes      | No aplica                                                            |

---

## 🛠 Technical Notes

### Frontend

No aplica — sin UI en esta historia. El panel admin pertenece a PB-P3-001 / US-140.

### Backend

* Module: `seed-demo` (Doc 14 §10.16).
* Use Case: `ResetDemoUseCase` (Doc 14 §11 #46) que orquesta:
  1. Verificar `SEED_DEMO_ENABLED=true`.
  2. Adquirir lock optimista (`seed_reset_in_progress`).
  3. Eliminar entidades filtradas por `is_seed=true` por lotes transaccionales (`prisma.$transaction` chunked).
  4. Invocar `SeedDemoDataUseCase` para repoblar.
  5. Persistir `AdminAction`.
  6. Liberar lock.
  7. Devolver `ResetReport`.
* Controller: `SeedDemoController` (Doc 14 §10.16, Doc 16 §39.2) registrando dinámicamente la ruta solo cuando `SEED_DEMO_ENABLED=true`.
* DTO Response: `ResetReport { entitiesDeleted: Record<string, number>, entitiesReseeded: Record<string, number>, seedVersion: string, correlationId: string, durationMs: number }`.
* Authorization Policy: `requireAuth() + requireRole('admin') + requireFlag('SEED_DEMO_ENABLED')`.
* Validation: Zod `strict()` para el request body opcional.
* Transaction Required: Sí, por lote (`$transaction` chunked).

### Database

* Tablas afectadas: todas las entidades con columna `is_seed` (US-099 / US-100).
* Constraints: cláusulas `WHERE is_seed = true` obligatorias en todos los deletes del use case.
* Index Considerations: índice parcial o B-tree sobre `is_seed` recomendado para acelerar deletes (US-101). El repoblado reusa los upserts con claves naturales de `SeedDemoDataUseCase` (US-085).
* `AdminAction`: insert obligatorio post-reset (índice por `(admin_id, created_at)` y `(target_type, target_id)` ya definido en Doc 14 §13).

### API

| Method | Endpoint                          | Purpose                                  |
| ------ | --------------------------------- | ---------------------------------------- |
| POST   | `/api/v1/admin/seed/reset`        | Limpia y repuebla datos seed surgical    |

* Success: `202 Accepted` con `ResetReport`.
* Errores: `401`, `403`, `404` (flag off), `409` (concurrencia), `422`, `500`.
* Headers: `Authorization: Bearer <token>` obligatorio; `X-Correlation-Id` opcional (backend rellena).

### Observability / Audit

* Correlation ID Required: Yes (propagado en logs y `AdminAction`).
* Log Event Required: Yes — log estructurado `seed.reset.started` / `seed.reset.completed` / `seed.reset.failed`.
* AdminAction Required: Yes (`SEED_RESET` o `SEED_RESET_FAILED`).
* AIRecommendation Required: No.
* Métrica recomendada: contador `seed_reset_total` y `seed_reset_duration_ms` (opcional, alineado con NFR-OBS-006).

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                                                                 | Type        |
| ----- | -------------------------------------------------------------------------------------------------------- | ----------- |
| TS-01 | Reset exitoso con flag activo y rol admin retorna `202` y `ResetReport` consistente (AC-01).             | Integration |
| TS-02 | Idempotencia: dos resets seguidos dejan los mismos conteos por entidad (AC-02).                          | Integration |
| TS-03 | `AdminAction` queda registrado con `action='SEED_RESET'` y `correlationId` consistente (AC-03).          | Integration |
| TS-04 | `GET /api/v1/admin/seed/status` refleja `lastRunAt` y `recordCount` post-reset (AC-04).                  | Integration |
| TS-05 | Sólo filas `is_seed=true` se eliminan; datos `is_seed=false` permanecen intactos (SEC-04).               | Integration |

### Negative Tests

| ID    | Scenario                                                                  | Expected Result                       |
| ----- | ------------------------------------------------------------------------- | ------------------------------------- |
| NT-01 | Sin token de autorización                                                 | `401 Unauthorized`                    |
| NT-02 | Token válido con rol `organizer` o `vendor`                               | `403 Forbidden`                       |
| NT-03 | `SEED_DEMO_ENABLED=false`                                                 | `404 Not Found`, sin efectos lateral  |
| NT-04 | Request body con campo desconocido                                        | `400 Bad Request` (Zod strict)        |
| NT-05 | Falla parcial durante reset                                               | `500`, rollback de lote, `AdminAction` `SEED_RESET_FAILED` |
| NT-06 | Segunda invocación concurrente                                            | `409 Conflict` (`seed_reset_in_progress`) |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                                  | Expected Result |
| ---------- | --------------------------------------------------------- | --------------- |
| AUTH-TS-01 | Admin autenticado con flag activo                         | `202`           |
| AUTH-TS-02 | Organizer/vendor autenticado con flag activo              | `403`           |
| AUTH-TS-03 | Cliente anónimo con flag activo                           | `401`           |
| AUTH-TS-04 | Admin autenticado con `SEED_DEMO_ENABLED=false`           | `404`           |

### Accessibility Tests

No aplica — endpoint HTTP sin UI.

### Seed / Demo Tests

| ID      | Scenario                                                                                       | Expected Result                          |
| ------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- |
| SD-T-01 | Datos seed presentes antes y después del reset cumplen invariantes BR-SEED-002 / NFR-DEMO-001 | Conteos por entidad dentro de los rangos |
| SD-T-02 | Reset surgical preserva filas `is_seed=false` simuladas durante la demo                        | 0 filas operativas eliminadas            |

---

## 📊 Business Impact

| Field               | Value                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| KPI Affected        | Demo readiness; reproducibilidad QA E2E                                                                     |
| Expected Impact     | Demos académicas y entrenamientos siempre parten de un estado seed conocido sin necesidad de redeploy        |
| Success Criteria    | Reset surgical idempotente, auditado en `AdminAction`, sin afectar datos operativos reales                  |
| Academic Demo Value | Permite reiniciar el demo entre sesiones evaluadoras del bootcamp y de la suite E2E sin pérdida de tiempo    |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* No aplica en esta historia. El panel admin pertenece a PB-P3-001 / US-140.

### Potential Backend Tasks

* Implementar `ResetDemoUseCase` con lotes transaccionales y filtro `is_seed=true`.
* Registrar el endpoint `POST /api/v1/admin/seed/reset` en `SeedDemoController` con gating por flag.
* Implementar lock optimista para concurrencia.
* Integrar registro en `AdminAction` y logs estructurados.
* Exponer `ResetReport` y propagar `correlationId`.

### Potential Database Tasks

* Verificar índice sobre `is_seed` en entidades clave (US-101); ajustar si necesario.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Tests de integración del happy path y casos negativos.
* Test de idempotencia con doble ejecución.
* Test de preservación de filas `is_seed=false`.
* Test de concurrencia y rollback en falla parcial.

### Potential DevOps / Config Tasks

* Asegurar `SEED_DEMO_ENABLED=true` en entornos demo/QA y `false` en `prod` (Doc 14 §15.2 SEED).
* Documentar la operación de reset en el runbook del demo.

---

## ✅ Definition of Ready

* [x] Rol claro (`admin`).
* [x] Goal/valor claros (reset surgical, idempotente, auditado).
* [x] FRD/UC/BR enlazados.
* [x] Permisos identificados (rol admin + flag operativo).
* [x] Entidades listadas (todas con `is_seed=true` + `AdminAction`).
* [x] AC en GWT (AC-01..04).
* [x] Edge cases documentados (EC-01..03).
* [x] Validación clara (VR-01..05).
* [x] Out of Scope explícito (UI, reset no-seed, prod sin flag).
* [x] Dependencias conocidas (US-085, US-087, US-088, US-099, US-100).
* [x] UX states identificados (No aplica — endpoint HTTP).
* [x] API definida (`POST /api/v1/admin/seed/reset`).
* [x] Tests definidos (TS, NT, AUTH-TS, SD-T).
* [ ] PO/BA validó (queda para el Approval Gate).

---

## 🏁 Definition of Done

* [ ] Endpoint `POST /api/v1/admin/seed/reset` registrado únicamente cuando `SEED_DEMO_ENABLED=true`.
* [ ] `ResetDemoUseCase` implementado y cubierto por tests de integración.
* [ ] Reset surgical verificado: filas `is_seed=true` reciclas, filas `is_seed=false` intactas.
* [ ] Idempotencia verificada en suite QA.
* [ ] `AdminAction` registrado con `action='SEED_RESET'` por cada invocación exitosa.
* [ ] Concurrencia controlada con respuesta `409 Conflict`.
* [ ] Logs estructurados con `correlationId` y `durationMs`.
* [ ] `GET /api/v1/admin/seed/status` actualizado tras cada reset.
* [ ] Documentación operativa actualizada (`SEED_DEMO_ENABLED` y endpoint).
* [ ] Tests verdes en CI (unit + integration).
* [ ] PO valida.

---

## 📝 Notes

* Boundary explícito:
  * **US-085** entrega el runner CLI `npm run seed` y el `SeedDemoDataUseCase`.
  * **US-086** (esta historia) entrega el endpoint HTTP `POST /api/v1/admin/seed/reset` y el `ResetDemoUseCase`.
  * **US-087** garantiza el mix de eventos `draft`/`active`/`completed`.
  * **US-088** garantiza al menos un `BookingIntent.confirmed_intent`.
  * **PB-P3-001 / US-140** entrega la UI admin para disparar el reset desde el panel.
* La respuesta `404` ante flag apagado es intencional y debe documentarse en la guía de API para evitar reportes falsos de bug.
* Los tests E2E reusan este endpoint para reiniciar el estado entre escenarios; integrarlo en el harness QA es una tarea derivada de PB-P2-016.
