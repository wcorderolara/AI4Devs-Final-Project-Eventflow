# 🧾 User Story: Suite RBAC negativa

## 🆔 Metadata

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| ID                 | US-130                               |
| Epic               | EPIC-QA-001                          |
| Feature            | Tests negativos RBAC/ownership       |
| Backlog Item       | PB-P2-018                            |
| Module / Domain    | QA / Security                        |
| User Role          | System                               |
| Priority           | Must Have                            |
| Status             | Approved                             |
| Owner              | Product Owner / Business Analyst     |
| Approved By        | PO/BA Review                         |
| Approval Date      | 2026-07-07                           |
| Ready for Development Tasks | Yes                         |
| Sprint / Milestone | MVP                                  |
| Created Date       | 2026-06-09                           |
| Last Updated       | 2026-07-07                           |

---

## 🎯 User Story

**As the** equipo QA / Security
**I want** una suite extendida de tests negativos de RBAC + ownership + assignment por dominio (organizer/vendor/admin), que valide 401/403/404 con envelope de error estándar y sin fuga de datos
**So that** la seguridad sea verificable en CI y sea real, no aparente (el backend es la única fuente de verdad).

---

## 🧠 Business Context

### Context Summary
Esta suite extiende la base de tests negativos de RBAC + ownership (PB-P0-008) con casos negativos por dominio: `organizer`, `vendor` y `admin` intentando invadir recursos ajenos, escalamiento de privilegios y assignment incorrecto en `QuoteRequest`/`Quote`. Se prueba a nivel de API (Supertest) que cada endpoint sensible devuelve 401/403/404 con el envelope de error estándar (`{ error }`) sin filtrar datos, garantizando que la autorización no depende del frontend ni de la UX (Doc 19, Doc 20 §25.5). Corre como compuerta de CI y bloquea el merge si algún caso falla.

### Related Domain Concepts
* Roles activos del MVP: `organizer`, `vendor`, `admin` (mono-rol, BR-AUTH-005).
* Ownership: el `organizer` solo accede a sus propios eventos (BR-AUTH-006).
* Assignment: el `vendor` solo accede a `QuoteRequest`/`Quote` asignadas (BR-AUTH-007).
* Aislamiento de datos por rol (BR-AUTH-009); panel admin restringido (BR-AUTH-010).

### Assumptions
* La base de tests negativos (PB-P0-008) y las políticas de autorización backend existen.
* El stack de pruebas es Vitest + Supertest (ADR-TEST-001).
* El diseño de autorización está definido en `/docs/19-Security-and-Authorization-Design.md` (ADR-SEC-001).

### Dependencies
* PB-P0-008 — Suite base de tests negativos de RBAC + ownership (esta historia la extiende).
* Endpoints protegidos y middlewares de policy existentes (RBAC + ownership + assignment).

---

## 🔗 Traceability

| Source                 | Reference                                                        |
| ---------------------- | --------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — valida negativamente los requisitos de autorización de múltiples FR. |
| Use Case(s)            | Transversal — cubre autorización negativa de los UC con recursos protegidos. |
| Business Rule(s)       | BR-AUTH-006 (permisos organizer), BR-AUTH-007 (permisos vendor/assignment), BR-AUTH-008/010 (permisos/panel admin), BR-AUTH-009 (aislamiento de datos), BR-AUTH-011 (referencia auth) |
| Permission Rule(s)     | RBAC + ownership + assignment; backend como source of truth (Doc 5, Doc 19). |
| Data Entity / Entities | Transversal — Event, VendorProfile, QuoteRequest, Quote, Review (recursos protegidos). |
| API Endpoint(s)        | Endpoints sensibles protegidos por rol/ownership/assignment.    |
| NFR Reference(s)       | NFR-TEST-*, NFR-OBS-001, NFR-PERF-API-001                       |
| Related ADR(s)         | ADR-SEC-001 (autorización), ADR-TEST-001 (Vitest + Supertest), ADR-DEVOPS-001 |
| Related Document(s)    | /docs/19-Security-and-Authorization-Design.md, /docs/20-Testing-Strategy.md (§6.3, §25.5), /docs/5-User-Roles-Permissions-Matrix.md |
| Backlog Item           | PB-P2-018                                                        |

---

## 🧭 Scope Guardrails

### MVP Scope
* Scope Classification: In Scope
* MVP Relevance: Must Have

### In Scope
* Tests negativos de **RBAC** (rol incorrecto → 403; anónimo → 401) por dominio.
* Tests negativos de **ownership**: `organizer` accediendo a eventos/recursos ajenos → 403/404 (BR-AUTH-006).
* Tests negativos de **assignment**: `vendor` accediendo a `QuoteRequest`/`Quote` no asignadas → 403/404 (BR-AUTH-007).
* Tests de **escalamiento de privilegios**: intentos de un rol de ejecutar operaciones de otro rol.
* Tests de **aislamiento de datos** entre cuentas del mismo rol (BR-AUTH-009).
* Tests de **panel admin restringido**: roles no-admin → 403 (BR-AUTH-010).
* Verificación de **envelope de error estándar** (`{ error }`) **sin fuga de datos** en 403/404.
* Ejecución como **compuerta de CI** que bloquea el merge ante fallos.

### Explicitly Out of Scope
* Casos positivos de autorización (cubiertos por las suites funcionales de cada dominio y por US-126).
* Re-implementación de la base PB-P0-008 (esta historia la **extiende**, no la duplica).
* Escenarios de anti-bot/captcha (BR-AUTH-011), rate limit (429) y validación de uploads (415/413) — cubiertos por sus historias de auth/upload correspondientes.
* Guardas de ruta del frontend (el backend es source of truth).
* Suite E2E (US-128), contract (US-127), IA (US-129), A11Y (PB-P2-019).
* Funciones futuras (multi-rol, etc.).

### Scope Notes
* Respetar la convención de Doc 19 para 403 vs 404 (usar 404 cuando revelar la existencia del recurso filtraría información).
* La suite negativa **no es opcional** y bloquea el merge (Nota PB-P0-008).

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

## 🎯 Escenarios negativos (núcleo de la historia)

### AC-01: Cobertura negativa por endpoint sensible
**Given** los endpoints sensibles protegidos por rol/ownership/assignment
**When** se ejecuta la suite
**Then** cada endpoint sensible tiene al menos un caso negativo que valida 401 (anónimo), 403 (rol/privilegio incorrecto) o 404 (recurso ajeno según convención).

### AC-02: Cobertura por dominio (organizer/vendor/admin)
**Given** los tres roles del MVP
**When** se ejecutan los casos negativos
**Then** se cubren: `organizer` accediendo a recursos ajenos, `vendor` con assignment inválido en `QuoteRequest`/`Quote`, `vendor` accediendo al evento más allá del brief, escalamiento de privilegios entre roles y acceso no-admin al panel admin.

### AC-03: Envelope de error estándar sin fuga de datos
**Given** una respuesta 403/404
**When** el cliente la recibe
**Then** el cuerpo usa el envelope de error estándar (`{ error }`) y no filtra datos del recurso protegido ni detalles internos.

### AC-04: Backend como fuente de verdad
**Given** los tests a nivel de API (Supertest)
**When** se ejecutan sin pasar por el frontend
**Then** la autorización se valida en el backend directamente (no depende de guardas de UI).

### AC-05: Compuerta de CI bloqueante
**Given** un Pull Request
**When** se ejecuta la compuerta de calidad
**Then** la suite negativa corre en CI y cualquier fallo de autorización bloquea el merge.

---

## ⚠️ Edge Cases

### EC-01: Endpoint sensible sin caso negativo
**Given** un endpoint protegido sin cobertura negativa
**When** se ejecuta el gate de cobertura de seguridad
**Then** la compuerta falla, señalando el endpoint sin cubrir.

#### Handling
* Gate de cobertura de endpoints sensibles; fail-fast ante omisión.

### EC-02: Ambigüedad 403 vs 404
**Given** un recurso ajeno cuya sola existencia sería información sensible
**When** se prueba el acceso no autorizado
**Then** se espera 404 (o 403 según la convención de Doc 19), evitando filtrar la existencia del recurso.

#### Handling
* Seguir la convención documentada en Doc 19 por tipo de recurso.

---

## 🚫 Validation Rules

| ID    | Rule                                                        | Message / Behavior                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------- |
| VR-01 | Todo endpoint sensible tiene ≥1 caso negativo              | Gate de cobertura de seguridad falla si falta |
| VR-02 | 403/404 usan envelope de error estándar sin fuga           | Test falla si filtra datos                  |
| VR-03 | Anónimo a endpoint privado → 401                           | Test falla si no es 401                     |
| VR-04 | Rol/ownership/assignment inválido → 403/404                | Test falla si concede acceso                |

---

## 🔐 Authorization & Security Rules

| ID     | Rule                                                                |
| ------ | ------------------------------------------------------------------- |
| SEC-01 | Aplicar el diseño de autorización del Doc 19 (RBAC + ownership + assignment). |
| SEC-02 | Backend como única fuente de verdad de autorización.                |
| SEC-03 | 403/404 con envelope estándar; sin fuga de datos ni secretos en logs. |
| SEC-04 | Cobertura por dominio: organizer/vendor/admin, escalamiento de privilegios, assignment inválido. |

### Negative Authorization Scenarios
* `organizer` → evento/recurso ajeno → 403/404 (BR-AUTH-006).
* `vendor` → `QuoteRequest`/`Quote` no asignada → 403/404 (BR-AUTH-007).
* `vendor` → datos del evento más allá del brief → 403/404.
* rol no-admin → panel admin → 403 (BR-AUTH-010).
* escalamiento de privilegios entre roles → 403.
* aislamiento entre cuentas del mismo rol → 403/404 (BR-AUTH-009).

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
* Not applicable for this story.

---

## 🎨 UX / UI Notes

| Area                | Notes |
| ------------------- | ----- |
| Screen / Route      | N/A   |
| Main UI Pattern     | N/A   |
| Primary Action      | N/A   |
| Secondary Actions   | N/A   |
| Empty State         | N/A   |
| Loading State       | N/A   |
| Error State         | N/A   |
| Success State       | N/A   |
| Accessibility Notes | N/A — historia sin UI. |
| Responsive Notes    | N/A   |
| i18n Notes          | N/A   |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend
* Route / Page: N/A
* Components: N/A
* State Management: N/A
* Forms: N/A
* API Client: N/A (los tests golpean la API directamente).

### Backend
* Use Case / Service: Ejercita middlewares de policy (RBAC + ownership + assignment) y controllers protegidos.
* Controller / Route: Endpoints sensibles del MVP.
* Authorization Policy: Núcleo de la historia — validación negativa por rol/ownership/assignment.
* Validation: Envelope de error estándar; sin fuga de datos.
* Transaction Required: N/A
* Herramientas: Vitest + Supertest (Doc 20 §6.3).

### Database
* Main Tables: Transversal — recursos protegidos (Event, VendorProfile, QuoteRequest, Quote, Review).
* Constraints: N/A
* Index Considerations: N/A

### API

| Method | Endpoint | Purpose                                        |
| ------ | -------- | ---------------------------------------------- |
| (varios) | Endpoints sensibles | Validación negativa de autorización (401/403/404). |

### Observability / Audit
* Correlation ID Required: N/A a nivel de test.
* Log Event Required: Sin secretos en logs; verificar que 403/404 no filtren datos.
* AdminAction Required: No
* AIRecommendation Required: No

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario                                                    | Type |
| ----- | ---------------------------------------------------------- | ---- |
| TS-01 | Matriz de cobertura negativa por endpoint sensible          | API/Security |

### Negative Tests

| ID    | Scenario                                                    | Expected Result       |
| ----- | ---------------------------------------------------------- | --------------------- |
| NT-01 | Anónimo → endpoint privado                                  | 401                   |
| NT-02 | organizer → evento ajeno                                    | 403/404               |
| NT-03 | vendor → QuoteRequest/Quote no asignada                     | 403/404               |
| NT-04 | vendor → datos del evento más allá del brief               | 403/404               |
| NT-05 | rol no-admin → panel admin                                  | 403                   |
| NT-06 | escalamiento de privilegios entre roles                    | 403                   |
| NT-07 | aislamiento entre cuentas del mismo rol                     | 403/404               |
| NT-08 | 403/404 filtra datos del recurso                           | Test falla (no fuga)  |

### AI Tests
Not applicable for this story.

### Authorization Tests

| ID         | Scenario                                     | Expected Result |
| ---------- | -------------------------------------------- | --------------- |
| AUTH-TS-01 | Cobertura por dominio (organizer/vendor/admin) | Todos los casos negativos verdes |

### Accessibility Tests
* No aplica — sin UI.

---

## 📊 Business Impact

| Field               | Value                                                |
| ------------------- | ---------------------------------------------------- |
| KPI Affected        | Seguridad verificable, calidad, confianza            |
| Expected Impact     | Seguridad real (no aparente) verificada en CI         |
| Success Criteria    | 100% endpoints sensibles con ≥1 caso negativo; gate verde |
| Academic Demo Value | Alto — evidencia de autorización robusta y trazable   |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks
* No aplica.

### Potential Backend Tasks
* No aplica (no se modifica la autorización; se prueba).

### Potential Database Tasks
* No aplica (fixtures de recursos protegidos para las pruebas).

### Potential AI / PromptOps Tasks
* No aplica.

### Potential QA Tasks
* Matriz de cobertura negativa por endpoint/rol/dominio.
* Casos de ownership/assignment/escalamiento.
* Verificación de envelope sin fuga.

### Potential DevOps / Config Tasks
* Gate de cobertura de endpoints sensibles en CI.

---

## ✅ Definition of Ready

* [x] Rol claro (System / equipo QA-Security).
* [x] Goal técnico claro.
* [x] Referencias a Docs (Doc 19, Doc 20 §25.5, Doc 5, BR-AUTH-*).
* [x] Permisos / Seguridad (núcleo de la historia).
* [x] Entidades listadas (recursos protegidos).
* [x] AC en GWT.
* [x] Edge cases documentados.
* [x] Validación clara.
* [x] Out of Scope explícito.
* [x] Dependencias conocidas (PB-P0-008).
* [x] UX states identificados (N/A — sin UI).
* [x] API definida (endpoints sensibles).
* [x] Tests definidos.
* [ ] Tech Lead validó.

---

## 🏁 Definition of Done

* [ ] 100% de endpoints sensibles con ≥1 caso negativo (RBAC/ownership/assignment).
* [ ] Cobertura por dominio: organizer/vendor/admin + escalamiento + assignment.
* [ ] 403/404 con envelope estándar sin fuga de datos.
* [ ] Backend validado como source of truth (tests API directos).
* [ ] Compuerta de CI bloqueante ante fallos.
* [ ] Tech Lead valida.

---

## 📝 Notes
* Esta suite extiende PB-P0-008; no la duplica.
* Confirmar con Tech Lead el inventario final de "endpoints sensibles" a cubrir y la convención 403 vs 404 por tipo de recurso (Doc 19).
