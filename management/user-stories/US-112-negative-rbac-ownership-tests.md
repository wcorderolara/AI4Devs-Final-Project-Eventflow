# User Story: US-112 - Suite negativa RBAC + ownership

## Metadata

| Field | Value |
| --- | --- |
| ID | US-112 |
| Epic | EPIC-SEC-001 |
| Feature | Negative tests RBAC + ownership |
| Module / Domain | Security / QA |
| User Role | System |
| Priority | Must Have (P0) |
| Status | Approved |
| Owner | Product Owner / Business Analyst |
| Approved By | PO/BA Review |
| Approval Date | 2026-06-16 |
| Ready for Development Tasks | Yes |
| Sprint / Milestone | MVP Foundation |
| Created Date | 2026-06-09 |
| Last Updated | 2026-06-16 |

---

## User Story

**As the** EventFlow delivery team  
**I want** una suite negativa automatizada de RBAC, ownership y assignment-based authorization para los endpoints protegidos de foundation  
**So that** el backend demuestre en CI que usuarios anónimos, roles incorrectos, usuarios sin ownership y vendors sin assignment no pueden acceder ni mutar recursos fuera de su autorización.

---

## Business Context

### Context Summary

EventFlow maneja datos sensibles de organizers, vendors, eventos, quote requests, quotes, booking intents y recomendaciones IA. El frontend sólo puede reflejar UX; la autorización real debe vivir en backend. PB-P0-008 exige una suite negativa obligatoria que falle el merge si endpoints protegidos permiten acceso no autorizado, filtran existencia de recursos o devuelven errores inconsistentes.

Esta historia crea la suite P0 mínima para los endpoints protegidos implementados por PB-P0-004 y los controles de auth/security foundation de PB-P0-006/PB-P0-007. La cobertura extendida por todos los dominios MVP queda para PB-P2-018 / US-130.

### PO/BA Decisions Applied

| Decision | Applied Resolution |
| --- | --- |
| P0 scope | US-112 cubre la suite negativa foundation para endpoints protegidos AUTH / EVENT / QUOTE / AI implementados en PB-P0-004 y controles transversales de seguridad ya disponibles. |
| Extended coverage | La cobertura exhaustiva por todos los flujos MVP y dominios posteriores queda fuera de US-112 y corresponde a PB-P2-018 / US-130. |
| Source of truth | Backend es la única fuente de verdad para RBAC, ownership, assignment y admin scope. |
| Expected failures | La suite debe validar `401`, `403` o `404` según contrato, con error envelope estándar y sin leak de datos. |
| CI gate | Los tests negativos de US-112 deben ejecutarse en CI como quality gate obligatorio. |

### Related Domain Concepts

- RBAC: `anonymous`, `organizer`, `vendor`, `admin`, `system`.
- Ownership: organizer sólo accede a sus eventos y recursos derivados.
- Assignment-based authorization: vendor sólo accede a `QuoteRequest`, `Quote` y `BookingIntent` asignados a su `VendorProfile`.
- Admin-scoped access: admin sólo accede a operaciones autorizadas y auditadas.
- Error envelope estándar con `correlationId`.
- Security regression tests en CI.

### Assumptions

- Los endpoints base de PB-P0-004 existen o se implementan en paralelo antes de activar la suite como gate estricto.
- La cadena de middlewares de US-111 aplica auth, role, ownership/assignment, policy y validation en orden seguro.
- Los fixtures de test pueden crear usuarios organizer/vendor/admin y recursos propios/ajenos sin modificar seed demo persistente.
- La suite usa Vitest/Supertest o herramientas equivalentes definidas en Doc 20.

### Dependencies

- PB-P0-002: Backend modular monolith bootstrap.
- PB-P0-004: Endpoints REST AUTH / EVENT / QUOTE / AI.
- PB-P0-006: Cookies HTTP-only + captcha.
- PB-P0-007: Rate limiting y middleware chain order.
- US-111: orden seguro de middlewares para evitar validation-before-auth y handler-before-authz.

---

## Traceability

| Source | Reference |
| --- | --- |
| Product Backlog Item | PB-P0-008 - RBAC + Ownership Negative Tests |
| Epic | EPIC-SEC-001 - Security & RBAC |
| FRD Requirement(s) | Transversal - seguridad y autorización backend para endpoints protegidos |
| Use Case(s) | Transversal - no implementa un UC directo; valida enforcement de seguridad de los UCs protegidos |
| Business Rule(s) | BR-AUTH-011; reglas de ownership/assignment/admin scope según Doc 19 |
| Permission Rule(s) | RBAC + ownership + assignment-based authorization; backend source of truth |
| Data Entity / Entities | User, Event, QuoteRequest, Quote, BookingIntent, AIRecommendation, AdminAction donde aplique |
| API Endpoint(s) | Endpoints protegidos AUTH / EVENT / QUOTE / AI implementados en PB-P0-004; `/api/v1/*` según contrato |
| NFR Reference(s) | NFR-SEC-*; NFR-OBS-*; quality gates de CI |
| Related ADR(s) | ADR-SEC-001; ADR-SEC-003; ADR-API-002; ADR-API-003; ADR-DEVOPS-001 |
| Related Document(s) | `management/artifacts/4-Product-Backlog-Prioritized.md`; `docs/16-API-Design-Specification.md`; `docs/19-Security-and-Authorization-Design.md`; `docs/20-Testing-Strategy.md`; `docs/22-Architecture-Decision-Records.md` |

---

## Scope Guardrails

### MVP Scope

- Scope Classification: In Scope.
- MVP Relevance: Must Have (P0).
- Delivery Value: quality gate obligatorio para demostrar que el backend no depende del frontend para autorización.

### In Scope

- Crear o completar suite negativa automatizada para endpoints protegidos foundation de PB-P0-004.
- Validar `401` cuando no hay sesión válida.
- Validar `403` cuando el rol autenticado no tiene permiso.
- Validar `403` o `404` seguro cuando el recurso no pertenece al usuario o no está asignado al vendor.
- Validar que los errores usan envelope estándar con `correlationId`.
- Validar que respuestas negativas no exponen datos de recursos ajenos.
- Ejecutar la suite en CI como gate obligatorio.
- Reusar factories/fixtures de test para organizer/vendor/admin, recursos propios y recursos ajenos.

### Explicitly Out of Scope

- Cobertura extendida por todos los dominios MVP posteriores a foundation; cubierta por PB-P2-018 / US-130.
- Crear endpoints nuevos.
- Cambiar reglas de negocio o permisos existentes.
- Cambiar middlewares de auth/role/ownership; cubierto por US-111 si corresponde.
- Implementar cookies, captcha o rate limit; cubierto por US-108, US-109 y US-110.
- Crear datos seed demo persistentes.
- Crear UI, pantallas o tests de accesibilidad.
- Pagos, contratos reales, WhatsApp, chat real-time, mobile native, RAG o decisiones IA autónomas.

### Scope Notes

La suite P0 debe ser suficiente para bloquear regresiones críticas de autorización en endpoints foundation. Si durante implementación se detecta que cubrir todos los endpoints protegidos existentes convierte la historia en demasiado grande, la prioridad es cubrir los endpoints sensibles de PB-P0-004 y registrar cobertura restante bajo PB-P2-018 sin bajar el quality gate de los casos ya incluidos.

---

## Acceptance Criteria

### AC-01: Anonymous protected access returns 401

**Given** un endpoint protegido de foundation bajo `/api/v1/*`  
**When** el request se ejecuta sin sesión válida o sin cookie de sesión  
**Then** el backend responde `401 AUTHENTICATION_REQUIRED` o código equivalente definido por el error catalog  
**And** el handler de negocio no se ejecuta  
**And** la respuesta incluye error envelope estándar con `correlationId`.

### AC-02: Wrong role returns 403

**Given** un usuario autenticado con rol distinto al permitido por el endpoint  
**When** intenta ejecutar una operación protegida  
**Then** el backend responde `403 FORBIDDEN`  
**And** no ejecuta side effects  
**And** no delega la decisión al frontend.

### AC-03: Cross-organizer ownership is rejected

**Given** un organizer autenticado y un recurso perteneciente a otro organizer  
**When** intenta leer, actualizar, cancelar o generar IA sobre ese recurso  
**Then** el backend responde `403 FORBIDDEN` o `404 RESOURCE_NOT_FOUND` según la política de masking del endpoint  
**And** no expone datos del recurso ajeno.

### AC-04: Cross-vendor assignment is rejected

**Given** un vendor autenticado y una `QuoteRequest`, `Quote` o `BookingIntent` no asignada a su `VendorProfile`  
**When** intenta leerla o mutarla  
**Then** el backend responde `403 FORBIDDEN` o `404 RESOURCE_NOT_FOUND` según contrato  
**And** no expone datos del organizer ni del vendor asignado.

### AC-05: Admin scope is enforced

**Given** un usuario no admin autenticado  
**When** intenta acceder a endpoints `/admin/*` o ejecutar una acción admin foundation disponible  
**Then** el backend responde `403 FORBIDDEN`  
**And** no persiste `AdminAction` de una acción no ejecutada.

### AC-06: Validation does not run before authorization on protected routes

**Given** un request protegido con payload inválido y usuario anónimo, rol incorrecto o recurso ajeno  
**When** se ejecuta el endpoint  
**Then** la respuesta prioriza `401`, `403` o `404` de seguridad antes de `400/422` de validación  
**And** no filtra schema, existencia ni detalles internos del recurso.

### AC-07: Error envelopes are safe and consistent

**Given** cualquier rechazo negativo de RBAC, ownership o assignment  
**When** el backend responde  
**Then** la respuesta usa el envelope estándar  
**And** incluye `correlationId`  
**And** no incluye stack traces, SQL, tokens, cookies, secrets, prompts, PII innecesaria ni datos del recurso ajeno.

### AC-08: CI blocks merge when negative auth tests fail

**Given** el pipeline CI del backend  
**When** se ejecuta la suite de tests  
**Then** los tests negativos de US-112 corren como quality gate obligatorio  
**And** cualquier fallo en la suite bloquea el merge.

---

## Edge Cases

### EC-01: Recurso inexistente vs recurso ajeno

**Given** un ID que no existe y un ID existente de otro owner  
**When** se consulta un endpoint con política de masking  
**Then** ambos casos pueden devolver `404 RESOURCE_NOT_FOUND` sin revelar cuál existe.

#### Handling

Validar el status permitido por contrato del endpoint y verificar que el body no contiene datos del recurso.

### EC-02: Usuario autenticado sin perfil vendor completo

**Given** un usuario con rol `vendor` pero sin `VendorProfile` aprobable/asignable  
**When** intenta acceder a recursos vendor-only o assigned  
**Then** el backend responde `403` o `404` seguro según contrato.

#### Handling

Usar fixture específico para evitar falsos positivos por datos incompletos.

### EC-03: Admin read-only vs admin mutation

**Given** un admin autenticado  
**When** intenta una acción no permitida para admin, como mutar datos comerciales fuera de scope  
**Then** el backend responde `403`  
**And** no simula identidad de organizer/vendor.

#### Handling

Cubrir al menos un caso representativo si el endpoint existe en foundation; cobertura extensa queda en PB-P2-018.

### EC-04: Public endpoints remain public

**Given** endpoints públicos como catálogo o vendor público aprobado  
**When** se ejecuta la suite negativa  
**Then** no deben marcarse como fallos por no retornar `401/403`.

#### Handling

Mantener una registry/lista explícita de endpoints protegidos y excluir endpoints públicos documentados.

---

## Validation Rules

| ID | Rule | Message / Behavior |
| --- | --- | --- |
| VR-01 | La suite debe tener una registry explícita de endpoints protegidos foundation o derivarla del contrato existente | Evita omitir endpoints sensibles por accidente |
| VR-02 | Cada endpoint protegido cubierto debe tener al menos un caso negativo relevante | `401`, `403` o `404` según tipo de restricción |
| VR-03 | Los tests deben validar ausencia de side effects en operaciones mutativas rechazadas | No crear, actualizar, cancelar, enviar, aceptar, rechazar ni generar IA cuando authz falla |
| VR-04 | Los tests deben validar error envelope con `correlationId` | Error consistente y trazable |
| VR-05 | La suite debe ejecutarse en CI | Fallo bloquea merge |
| VR-06 | Endpoints públicos documentados no deben incluirse como protegidos | Evita falsos fallos |

---

## Authorization & Security Rules

| ID | Rule |
| --- | --- |
| SEC-01 | Backend es source of truth para RBAC, ownership, assignment y admin scope. |
| SEC-02 | Anonymous en endpoint protegido debe recibir `401`. |
| SEC-03 | Rol incorrecto debe recibir `403`. |
| SEC-04 | Recurso ajeno o assignment inválido debe recibir `403` o `404` seguro según contrato. |
| SEC-05 | Payload inválido no debe producir `400/422` antes de auth/authz en rutas protegidas. |
| SEC-06 | Respuestas negativas no deben exponer datos de recursos ajenos ni información sensible. |
| SEC-07 | Acciones admin ejecutadas por no-admin no deben persistir `AdminAction`. |

### Negative Authorization Scenarios

- Anonymous llama `GET /events` o endpoint protegido equivalente → `401`.
- Vendor intenta crear o editar evento de organizer → `403`.
- Organizer A intenta acceder a evento de Organizer B → `403` o masked `404`.
- Organizer A intenta acceder a quote request de evento ajeno → `403` o `404`.
- Vendor A intenta ver o responder quote request asignada a Vendor B → `403` o `404`.
- Usuario no admin intenta `/admin/*` foundation → `403`.
- Payload inválido con usuario anónimo en endpoint protegido → `401`, no `400/422`.
- Payload inválido con usuario sin ownership → `403/404`, no `400/422`.

---

## AI Behavior

No aplica — esta historia no invoca IA directamente.

### AI Involvement

| Field | Value |
| --- | --- |
| AI Feature | None |
| Provider Layer | Not applicable |
| Human Validation Required | Not applicable |
| Persist AIRecommendation | Not applicable |
| Fallback Required | Not applicable |

### AI Boundary Notes

La suite puede incluir tests negativos sobre endpoints IA protegidos de PB-P0-004 para validar que ownership se evalúa antes de `LLMProvider`. US-112 no modifica prompts, providers, `AIRecommendation`, timeout ni fallback.

---

## UX / UI Notes

| Area | Notes |
| --- | --- |
| Screen / Route | N/A - historia técnica de QA/security |
| Main UI Pattern | N/A |
| Primary Action | N/A |
| Secondary Actions | N/A |
| Empty State | N/A |
| Loading State | N/A |
| Error State | N/A - sólo valida respuestas API |
| Accessibility Notes | No aplica; no introduce UI |
| Responsive Notes | No aplica |
| i18n Notes | No aplica |
| Currency Notes | No aplica |

---

## Technical Notes

### Frontend

- No requiere cambios frontend.
- El frontend no es fuente de verdad de autorización.
- No se agregan route guards ni cambios de UX como parte de esta historia.

### Backend

- Test target: Express API bajo `/api/v1/*`.
- Test tooling esperado: Vitest + Supertest o equivalente definido por el repo.
- Los tests deben usar app composition real cuando sea posible.
- Los fixtures/factories deben cubrir:
  - anonymous request,
  - organizer owner,
  - organizer non-owner,
  - vendor assigned,
  - vendor non-assigned,
  - admin,
  - non-admin user.
- La suite debe validar que handlers/use cases no ejecutan side effects cuando authz falla.

### Database

- No requiere cambios de schema.
- No requiere migrations.
- Puede usar base efímera/test transaction/factories para preparar recursos propios y ajenos.
- No debe modificar seed demo persistente.

### API

| Method | Endpoint Group | Purpose |
| --- | --- | --- |
| Various | `/api/v1/auth/*` protected/session endpoints | Validar `401/403` donde aplique y no crear admin por registro |
| Various | `/api/v1/events/*` | Validar organizer role y ownership |
| Various | `/api/v1/quote-requests/*` | Validar organizer ownership y vendor assignment |
| Various | `/api/v1/quotes/*` | Validar vendor ownership/assignment y organizer ownership |
| Various | `/api/v1/booking-intents/*` | Validar access only to involved parties |
| POST | `/api/v1/events/:eventId/ai/*` | Validar ownership before provider call si endpoint existe |
| Various | `/api/v1/admin/*` foundation | Validar admin-only cuando endpoint exista |

### Observability / Audit

- Correlation ID Required: Yes.
- Log Event Required: sólo si el sistema ya loggea auth/security rejections; US-112 valida que no se filtren datos sensibles.
- AdminAction Required: No para rechazos; validar que acciones admin no ejecutadas por no-admin no generan `AdminAction`.
- AIRecommendation Required: No; si un endpoint IA es rechazado por authz, no debe crearse recomendación.

---

## Test Scenarios

### Functional / QA Foundation Tests

| ID | Scenario | Type |
| --- | --- | --- |
| TS-01 | Registry/lista de endpoints protegidos foundation existe y es revisable | Unit/QA |
| TS-02 | Factories crean users/resources propios y ajenos de forma determinística | Unit/Integration |
| TS-03 | Suite corre localmente y en CI sin depender de seed demo persistente | Integration/CI |

### Negative Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| NT-01 | Anonymous llama endpoint protegido | `401 AUTHENTICATION_REQUIRED` |
| NT-02 | Rol incorrecto llama endpoint protegido | `403 FORBIDDEN` |
| NT-03 | Organizer accede recurso de otro organizer | `403` o `404` seguro |
| NT-04 | Vendor accede quote request no asignada | `403` o `404` seguro |
| NT-05 | Non-admin accede endpoint admin | `403 FORBIDDEN` |
| NT-06 | Payload inválido con anonymous en endpoint protegido | `401` antes de validation |
| NT-07 | Payload inválido con cross-owner/cross-assignment | `403/404` antes de validation |
| NT-08 | Mutación rechazada por authz | Sin side effects en DB |
| NT-09 | Endpoint IA protegido con recurso ajeno | No llama `LLMProvider`; no crea `AIRecommendation` |
| NT-10 | Error negativo | Envelope seguro con `correlationId`, sin leaks |

### API / Contract Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| API-TS-01 | Error envelope en `401` | Incluye `error.code`, `message` seguro y `correlationId` |
| API-TS-02 | Error envelope en `403` | Incluye `error.code`, `message` seguro y `correlationId` |
| API-TS-03 | Error envelope en masked `404` | No revela existencia del recurso ajeno |

### Authorization Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AUTH-TS-01 | RBAC negativo por rol | `403`; handler no ejecutado |
| AUTH-TS-02 | Ownership negativo por owner distinto | `403/404`; sin datos ajenos |
| AUTH-TS-03 | Assignment negativo por vendor no asignado | `403/404`; sin datos del vendor asignado |
| AUTH-TS-04 | Admin-only negativo | `403`; sin `AdminAction` de acción no ejecutada |

### AI Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| AI-TS-01 | Endpoint IA protegido rechaza usuario sin ownership | No se llama `LLMProvider`; no se crea `AIRecommendation` |

### Observability / Security Tests

| ID | Scenario | Expected Result |
| --- | --- | --- |
| OBS-TS-01 | Rechazo authz incluye correlation | Response/log contienen `correlationId` |
| SEC-TS-01 | Rechazo authz no filtra datos sensibles | Sin stack, SQL, tokens, cookies, secrets, prompt completo, PII innecesaria o datos ajenos |

### Accessibility Tests

No aplica — esta historia no introduce UI.

### Seed / Demo Tests

No requiere cambios de seed/demo. La suite debe usar fixtures/factories de test o datos efímeros.

---

## Business Impact

| Field | Value |
| --- | --- |
| KPI Affected | Seguridad, calidad de CI, confianza en backend authorization |
| Expected Impact | Reduce riesgo de data leakage, privilege escalation y bypass por frontend |
| Success Criteria | Suite negativa P0 verde en CI y bloqueando merge ante fallos |
| Academic Demo Value | Evidencia objetiva de backend as source of truth y quality gates de seguridad |

---

## Task Breakdown Readiness

### Potential Frontend Tasks

- No aplica.

### Potential Backend Tasks

- Crear test registry de endpoints protegidos foundation.
- Crear factories/fixtures para usuarios y recursos propios/ajenos.
- Agregar test harness con app real y sesión/cookie válidas/invalidas.
- Agregar assertions de no side effects y no provider call en endpoints IA protegidos.

### Potential Database Tasks

- No requiere schema ni migrations.
- Preparar datos efímeros de test mediante factories o transactions.

### Potential AI / PromptOps Tasks

- No aplica a prompts/providers.
- Sólo se puede requerir mock/spy para comprobar que `LLMProvider` no se llama si authz falla.

### Potential QA Tasks

- Tests API negativos `401/403/404`.
- Tests de error envelope y correlation.
- Tests de no side effects.
- Integración de suite en CI quality gate.

### Potential DevOps / Config Tasks

- Agregar comando de suite negativa al pipeline CI si no existe.
- Asegurar que fallos bloquean merge.

---

## Definition of Ready

- [x] Backlog item identificado: PB-P0-008.
- [x] Epic identificado: EPIC-SEC-001.
- [x] Alcance P0 separado de PB-P2-018 / US-130.
- [x] Acceptance Criteria claros y testeables.
- [x] Dependencias identificadas.
- [x] Seguridad y backend source of truth explícitos.
- [x] AI marcado como no aplicable salvo no-call en endpoints IA protegidos.
- [x] Seed/demo impact aclarado.
- [x] Out of scope explícito.

## Definition of Done

- [ ] Suite negativa P0 cubre endpoints protegidos foundation definidos para US-112.
- [ ] Casos `401`, `403` y `404` seguros cubiertos según contrato.
- [ ] Tests validan que validation no se ejecuta antes de auth/authz en rutas protegidas.
- [ ] Tests validan no side effects en mutaciones rechazadas.
- [ ] Tests validan no-call a `LLMProvider` y no creación de `AIRecommendation` cuando authz falla en endpoint IA protegido.
- [ ] Error envelope incluye `correlationId` y no filtra datos sensibles.
- [ ] Suite corre en CI como quality gate obligatorio.
- [ ] No se agregan endpoints, migrations, seed demo persistente ni cambios frontend.
