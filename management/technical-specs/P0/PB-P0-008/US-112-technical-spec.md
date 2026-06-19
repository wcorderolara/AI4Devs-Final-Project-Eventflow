# Technical Specification — US-112: Suite negativa RBAC + ownership

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-112 |
| Source User Story | `management/user-stories/US-112-negative-rbac-ownership-tests.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usa `PO/BA Decisions Applied` de la User Story aprobada |
| Priority | P0 |
| Backlog ID | PB-P0-008 |
| Backlog Title | RBAC + Ownership Negative Tests |
| Backlog Execution Order | 8 |
| User Story Position in Backlog Item | 1 of 1 |
| Related User Stories in Backlog Item | US-112 |
| Epic | EPIC-SEC-001 |
| Backlog Item Dependencies | PB-P0-004, PB-P0-006 |
| Feature | Negative tests RBAC + ownership |
| Module / Domain | Security / QA |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-16 |
| Last Updated | 2026-06-16 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-008 exige una suite negativa obligatoria de RBAC, ownership y assignment-based authorization. Su objetivo es demostrar que cada endpoint protegido foundation responde `401`, `403` o `404` ante sesión ausente, rol incorrecto, recurso ajeno o assignment inválido, usando backend como única fuente de verdad.

### Execution Order Rationale

PB-P0-008 se ejecuta después de:

- PB-P0-004, porque necesita endpoints REST foundation disponibles.
- PB-P0-006, porque depende de sesión/cookies/captcha foundation.
- PB-P0-007, porque el orden seguro de middlewares evita que validation o handler corran antes de auth/authz.

Esta historia es el quality gate P0 que impide merge si se rompe la autorización backend en endpoints foundation.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-112 | Construir suite negativa P0 de RBAC, ownership y assignment | 1 |

---

## 3. Executive Technical Summary

Implementar una suite automatizada de pruebas negativas para endpoints protegidos foundation bajo `/api/v1/*`. La suite debe ejecutarse en CI y fallar el pipeline cuando:

- Un request anónimo a un endpoint protegido no retorna `401`.
- Un rol incorrecto no retorna `403`.
- Un organizer accede a recurso de otro organizer.
- Un vendor accede a `QuoteRequest`, `Quote` o `BookingIntent` no asignado.
- Un no-admin accede a endpoint admin foundation.
- Un payload inválido produce validation error antes de auth/authz.
- Un rechazo de autorización ejecuta side effects, llama `LLMProvider`, crea `AIRecommendation`, persiste mutaciones o filtra datos sensibles.

La implementación técnica se concentra en test infrastructure, endpoint registry, factories/fixtures, helpers de sesión, assertions de error envelope, spies de side effects y configuración CI. No introduce endpoints, UI, migrations, seed demo persistente ni cambios funcionales de autorización.

---

## 4. Scope Boundary

### In Scope

- Registry o matriz testeable de endpoints protegidos foundation cubiertos por US-112.
- Test harness con app Express real o app factory real.
- Factories/fixtures efímeros para users, sessions, events, quote requests, quotes, booking intents y AIRecommendation cuando aplique.
- Tests API con Supertest o equivalente para `401`, `403`, masked `404`, no side effects, envelope seguro y `correlationId`.
- Tests de ordering negativo: auth/authz debe ocurrir antes de validation en rutas protegidas.
- Tests de no-call a `LLMProvider` y no creación de `AIRecommendation` cuando authz falla en endpoints IA protegidos.
- Integración de la suite en CI como quality gate obligatorio.

### Out of Scope

- Cobertura extendida por todos los dominios MVP posteriores a foundation; pertenece a PB-P2-018 / US-130.
- Implementar o cambiar endpoints.
- Cambiar reglas de negocio, permisos, roles o policies.
- Cambiar middlewares de auth, role, ownership, assignment o policy; si hay defectos, se reportan o se corrigen en historias técnicas correspondientes.
- Implementar cookies, captcha o rate limiting.
- Crear migrations, modelos Prisma o seed demo persistente.
- Crear UI o tests de accesibilidad.
- Cambiar prompts, providers, fallback IA o schema de `AIRecommendation`.

### Explicit Non-Goals

- No implementar security framework nuevo.
- No crear coverage exhaustivo P2 dentro de esta historia.
- No agregar OAuth, MFA, SSO, WAF, API Gateway, enterprise multi-tenancy, pagos, contratos, WhatsApp, chat real-time, mobile native, RAG o decisiones IA autónomas.
- No usar frontend como fuente de verdad de autorización.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. La suite debe usar la app Express real o el app factory existente, respetando arquitectura Node.js + Express + TypeScript + modular monolith. Los tests deben validar comportamiento observable del backend, no duplicar lógica de autorización en test code.

### Frontend Architecture

No aplica. No hay rutas, componentes, formularios, estado cliente ni UX nuevos. El frontend sigue siendo sólo reflejo de UX, no enforcement.

### Database Architecture

Aplica sólo como infraestructura de test. No hay cambios de schema ni migrations. Los tests pueden usar Prisma/factories/transactions/base efímera para crear datos propios y ajenos.

### API Architecture

Aplica. La suite valida contratos REST JSON bajo `/api/v1/*`, status `401/403/404`, error envelope estándar, `meta.correlationId` y ausencia de leaks.

### AI / PromptOps Architecture

Aplica de forma limitada. US-112 no invoca IA como feature, pero debe validar que endpoints IA protegidos no llaman `LLMProvider` ni crean `AIRecommendation` cuando ownership/authz falla.

### Security Architecture

Aplica de forma central. La suite valida ADR-SEC-003: backend evalúa AuthN, RBAC, ownership/assignment y reglas de negocio antes de ejecutar use cases. También valida error handling seguro y ausencia de leaks.

### Testing Architecture

Aplica. Debe alinearse con Doc 20: Vitest + Supertest para API/integration, unit policy tests donde aplique, log capture para observabilidad, `MockAIProvider`/spies para IA y CI como quality gate.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Anonymous protected access returns 401 | Crear tests contra endpoints protegidos sin sesión/cookie válida; assert `AUTHENTICATION_REQUIRED`, no handler y `correlationId`. | API, Backend, Security, QA |
| AC-02 Wrong role returns 403 | Crear fixtures con roles incorrectos y validar `FORBIDDEN` sin side effects. | API, Backend, Security, QA |
| AC-03 Cross-organizer ownership is rejected | Crear organizer owner y non-owner; validar `403` o masked `404` y sin datos ajenos. | API, DB Test Fixtures, Security, QA |
| AC-04 Cross-vendor assignment is rejected | Crear vendors asignado/no asignado; validar rechazo sobre QuoteRequest/Quote/BookingIntent. | API, DB Test Fixtures, Security, QA |
| AC-05 Admin scope is enforced | Validar `/admin/*` foundation con non-admin y ausencia de `AdminAction` si la acción no se ejecuta. | API, Backend, DB Test Fixtures, Security, QA |
| AC-06 Validation does not run before authorization | Enviar payload inválido con anonymous/wrong role/non-owner y esperar `401/403/404`, no `400/422`. | API, Middleware Order, Security, QA |
| AC-07 Error envelopes are safe and consistent | Validar error envelope estándar, `correlationId`, no stack/SQL/secrets/tokens/cookies/prompts/PII/datos ajenos. | API, Observability, Security, QA |
| AC-08 CI blocks merge when negative auth tests fail | Integrar suite en CI y asegurar fallo bloqueante. | CI, DevOps, QA |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

La implementación debe ubicarse en infraestructura de test del backend. Paths exactos dependen del repo, pero los folders probables son:

- `apps/backend/src/**/__tests__/*`
- `apps/backend/test/**`
- `apps/backend/src/test-utils/**`
- `apps/backend/src/shared/test-utils/**`
- `apps/backend/src/modules/*/interface/*.spec.ts`
- `apps/backend/src/modules/*/interface/*.int.spec.ts`

Módulos de dominio cubiertos en foundation:

- Identity/Auth protected/session endpoints.
- Event endpoints.
- QuoteRequest endpoints.
- Quote endpoints.
- BookingIntent endpoints.
- AI endpoints por evento/quote implementados en foundation.
- Admin foundation endpoints si existen en el slice P0.

### Use Cases / Application Services

No se crean use cases nuevos. La suite debe verificar que use cases existentes no se ejecutan cuando auth/authz falla. Para operaciones mutativas, se debe comprobar ausencia de side effects con:

- DB state before/after.
- Repository/use case spy cuando sea viable.
- Response status y ausencia de eventos/persistencia.

### Controllers / Routes

No se modifican controllers ni routes como parte principal de esta historia. Si un test revela un endpoint sin enforcement correcto, el arreglo debe ser mínimo y alineado a US-111/ADR-SEC-003, o registrarse como defecto si excede el alcance.

La suite debe cubrir endpoint groups foundation:

- `/api/v1/auth/*` protected/session endpoints donde aplique.
- `/api/v1/events/*`.
- `/api/v1/quote-requests/*`.
- `/api/v1/quotes/*`.
- `/api/v1/booking-intents/*`.
- `/api/v1/events/:eventId/ai/*` implementados.
- `/api/v1/quote-requests/:quoteRequestId/ai/*` implementados.
- `/api/v1/admin/*` foundation si existe.

### DTOs / Schemas

No hay DTOs funcionales nuevos. Los tests deben crear payloads:

- Válidos para probar role/ownership/assignment sin ruido de validation.
- Inválidos para validar que auth/authz ocurre antes de `VALIDATION_ERROR` en protected routes.

### Repository / Persistence

No hay repository nuevo. Los tests pueden usar repositories existentes o Prisma para:

- Crear users y sessions.
- Crear Event propio y Event ajeno.
- Crear VendorProfile asignado y no asignado.
- Crear QuoteRequest, Quote y BookingIntent asociados.
- Verificar que no hubo creación/mutación tras `401/403/404`.
- Verificar que no se creó `AIRecommendation` cuando endpoint IA falla por authz.
- Verificar que no se creó `AdminAction` cuando non-admin intenta acción admin.

### Validation Rules

- Registry de endpoints protegidos debe distinguir endpoints públicos y protegidos.
- Cada endpoint cubierto debe tener al menos un caso negativo relevante.
- Tests mutativos deben validar ausencia de side effects.
- Error envelope debe incluir `meta.correlationId`.
- Public endpoints documentados no deben fallar por no retornar `401/403`.

### Error Handling

Validar códigos y error catalog:

- `AUTHENTICATION_REQUIRED` para `401`.
- `FORBIDDEN` para `403`.
- `RESOURCE_NOT_FOUND` para `404` masked o recurso inexistente.
- No `VALIDATION_ERROR` antes de auth/authz en rutas protegidas.

Las respuestas negativas deben usar el error envelope estándar y no exponer detalles internos.

### Transactions

Los tests deben aislar datos mediante una estrategia compatible con el repo:

- Transaction rollback por test.
- Test database reset por suite.
- Factories con cleanup explícito.

No abrir transacciones productivas nuevas. La transaccionalidad relevante es sólo para aislar pruebas y verificar no side effects.

### Observability

Los tests deben validar:

- `correlationId` en response.
- `correlationId` en logs si hay log capture disponible.
- Logs de rejections sin tokens, cookies, secrets, stack traces, prompts completos, PII innecesaria o datos de recursos ajenos.

---

## 8. Frontend Technical Design

No aplica.

### Routes / Pages

No aplica.

### Components

No aplica.

### Forms

No aplica.

### State Management

No aplica.

### Data Fetching

No aplica.

### Loading / Empty / Error / Success States

No aplica.

### Accessibility

No aplica.

### i18n

No aplica.

---

## 9. API Contract Design

US-112 no cambia contratos API; valida los contratos existentes de seguridad.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| Various | `/api/v1/auth/*` protected/session endpoints | Validar auth/session negative cases donde aplique | Según endpoint | Valid/invalid test payload | No contract change | 401, 403, envelope seguro |
| Various | `/api/v1/events/*` | Validar organizer role y ownership | Sí | Valid/invalid event payloads | No contract change | 401, 403, 404, no 400 antes de authz |
| Various | `/api/v1/quote-requests/*` | Validar organizer ownership y vendor assignment | Sí | Valid/invalid quote request payloads | No contract change | 401, 403, 404 |
| Various | `/api/v1/quotes/*` | Validar vendor ownership/assignment y organizer ownership | Sí | Valid/invalid quote payloads | No contract change | 401, 403, 404 |
| Various | `/api/v1/booking-intents/*` | Validar acceso sólo a partes involucradas | Sí | Valid/invalid booking intent payloads | No contract change | 401, 403, 404 |
| POST | `/api/v1/events/:eventId/ai/*` | Validar ownership antes de provider | Sí | Valid/invalid AI payloads | No contract change | 401, 403, 404, no provider call |
| POST | `/api/v1/quote-requests/:quoteRequestId/ai/*` | Validar ownership/assignment antes de provider | Sí | Valid/invalid AI payloads | No contract change | 401, 403, 404, no provider call |
| Various | `/api/v1/admin/*` foundation | Validar admin-only cuando exista | Sí, admin | Valid admin payloads | No contract change | 401, 403, no unauthorized AdminAction |

Error envelope esperado:

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Safe user-facing message"
  },
  "meta": {
    "correlationId": "request-correlation-id",
    "timestamp": "2026-06-16T00:00:00.000Z"
  }
}
```

---

## 10. Database / Prisma Design

### Models Impacted

No hay modelos productivos nuevos. Los tests pueden crear registros en:

- `User`
- `Session` o entidad equivalente si existe
- `Event`
- `VendorProfile`
- `QuoteRequest`
- `Quote`
- `BookingIntent`
- `AIRecommendation`
- `AdminAction`

### Fields / Columns

No aplica - sin cambios de columnas.

### Relations

Los fixtures deben modelar relaciones reales:

- `Event.owner_id` para ownership organizer.
- `VendorProfile.user_id` para vendor owner.
- `QuoteRequest.event_id` y `QuoteRequest.vendor_profile_id` para organizer/vendor assignment.
- `Quote.quote_request_id` y `Quote.vendor_profile_id`.
- `BookingIntent` asociado a quote/quote request/event/vendor según schema actual.
- `AIRecommendation.user_id` o owner equivalente.

### Indexes

No aplica - sin cambios de índices.

### Constraints

No aplica - sin cambios de constraints.

### Migrations Impact

No migrations.

### Seed Impact

No requiere seed demo persistente. Usar factories, test DB, transactions o fixtures efímeros.

---

## 11. AI / PromptOps Design

### AI Feature

No aplica como feature IA. La historia no genera contenido IA.

### Provider

Usar `MockAIProvider` o spy/test double para validar que `LLMProvider` no se llama si authz falla.

### Prompt Version

No aplica.

### Input Schema

No cambia input schema IA. Puede usar payload válido o inválido para probar ordering de auth/authz antes de provider/validation según endpoint.

### Output Schema

No aplica.

### Human-in-the-loop

No cambia HITL. La suite sólo verifica que usuarios sin ownership no pueden invocar generación ni mutar/aplicar recomendaciones ajenas.

### Fallback

No aplica. Un rechazo `401/403/404` no debe ejecutar timeout ni fallback IA.

### Persistence

Validar que `AIRecommendation` no se crea cuando authz falla.

### Safety Rules

- No loggear prompt completo.
- No exponer provider secrets.
- No crear recomendaciones ante rechazo authz.

---

## 12. Security & Authorization Design

### Authentication

Tests requeridos:

- Request sin cookie/sesión a endpoint protegido retorna `401`.
- Cookie inválida/expirada retorna `401` si helpers lo soportan.
- No se ejecuta handler/use case tras `401`.

### Authorization

Validar ADR-SEC-003:

1. AuthN.
2. RBAC.
3. Ownership/Assignment.
4. Business policy.
5. Handler/use case.

Los tests deben probar que validation no se adelanta a auth/authz en endpoints protegidos.

### Ownership Rules

Cubrir al menos:

- Organizer A no accede a Event de Organizer B.
- Organizer A no accede a recursos derivados de Event de Organizer B.
- User no accede a `AIRecommendation` ajena si endpoint existe.

### Role Rules

Cubrir al menos:

- Vendor no ejecuta endpoints organizer-only.
- Organizer no ejecuta endpoints vendor-only.
- Non-admin no ejecuta `/admin/*` foundation.
- Anonymous no ejecuta endpoints autenticados.

### Negative Authorization Scenarios

- Anonymous protected access → `401`.
- Wrong role → `403`.
- Cross-organizer resource → `403` o masked `404`.
- Cross-vendor assignment → `403` o masked `404`.
- Non-admin admin endpoint → `403`.
- Invalid payload + anonymous → `401`, no `400/422`.
- Invalid payload + non-owner/non-assigned → `403/404`, no `400/422`.
- Unauthorized AI endpoint → no `LLMProvider`, no `AIRecommendation`.
- Unauthorized admin action → no `AdminAction`.

### Audit Requirements

- No crear `AdminAction` para intentos no autorizados que no ejecutan acción admin.
- Si admin read-only foundation existe y está autorizado, puede validarse en tests positivos existentes, pero US-112 se centra en negativos.

### Sensitive Data Handling

Responses y logs negativos no deben contener:

- Stack traces.
- SQL o nombres internos innecesarios.
- Tokens, cookies, secrets.
- Prompts completos.
- PII innecesaria.
- Datos del recurso ajeno.

---

## 13. Testing Strategy

### Unit Tests

- Registry/lista de endpoints protegidos foundation.
- Helpers de sesión por rol.
- Factories/fakers para owner/non-owner/assigned/non-assigned.
- Assertion helpers para error envelope y `correlationId`.

### Integration Tests

- Supertest con app factory real.
- Test DB aislada.
- Session/cookie helpers reales o equivalentes.
- Verificación de no side effects con DB state before/after.

### API Tests

- `401` sin sesión.
- `403` rol incorrecto.
- `403/404` owner incorrecto.
- `403/404` assignment incorrecto.
- `403` non-admin admin endpoint.
- Error envelope y status codes.
- Public endpoints excluidos de registry protegida.

### E2E Tests

No obligatorio para US-112. Puede quedar fuera porque la historia valida backend/API como source of truth.

### Security Tests

- Validation-before-authz regressions.
- No leak en masked `404`.
- No stack/secrets/tokens/cookies/prompts/PII.
- No side effects en mutaciones rechazadas.
- Backend enforcement independiente del frontend.

### Accessibility Tests

No aplica.

### AI Tests

- Endpoint IA con recurso ajeno no llama `LLMProvider`.
- Endpoint IA con authz failure no crea `AIRecommendation`.
- No fallback IA ante `401/403/404`.

### Seed / Demo Tests

- No cambios de seed.
- Tests usan fixtures/factories efímeros.
- Smoke opcional para confirmar suite local/CI.

### CI Checks

- Agregar comando de suite negativa al workflow CI.
- Fallo de tests bloquea merge.
- Suite debe ser determinística y no depender de orden global de datos.
- Tests no deben depender de seed demo persistente.

---

## 14. Observability & Audit

### Logs

Si el sistema captura logs de auth/security rejections, validar:

- `correlationId`.
- Route pattern o endpoint sin datos sensibles.
- Status/code.
- Sin tokens/cookies/secrets/PII/prompts/datos ajenos.

### Correlation ID

Cada respuesta negativa debe incluir `meta.correlationId` o el formato estándar vigente del error envelope.

### AdminAction

- No crear `AdminAction` cuando non-admin intenta acción admin y recibe `403`.
- No modificar `AdminAction` existente.

### Error Tracking

`401/403/404` esperados no deben registrarse como errores inesperados de sistema.

### Metrics

No aplica para MVP salvo que ya exista infraestructura. No se crean métricas nuevas.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No requiere seed demo persistente.

### Demo Scenario Supported

Soporta evidencia académica y demo técnica: CI demuestra que backend authorization no depende del frontend.

### Reset / Isolation Notes

Usar una de estas estrategias:

- Factories con cleanup.
- Transaction rollback por test.
- Test database reset por suite.
- Fixtures efímeros por worker.

Los tests deben poder ejecutarse repetidamente en CI sin contaminar datos.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| PB-P0-008 acceptance summary vs US-112 refined scope | PB-P0-008 dice "100% endpoints sensibles"; US-112 acota P0 a endpoints foundation y deja cobertura extendida en PB-P2-018 / US-130. | Mantener US-112 como suite negativa foundation P0 y PB-P2-018 como cobertura extendida por dominios. | Documentar esta separación en technical spec/tasks para evitar scope creep. | No |
| Doc 19 SEC-POL-AI-007 | Doc 19 menciona rate limit IA 20/user/h, mientras US-110 formalizó 10/user/h. | US-112 no implementa rate limit; sólo valida authz/no-call. | No usar Doc 19 SEC-POL-AI-007 como fuente de thresholds. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Suite demasiado grande si intenta cubrir todos los endpoints MVP | Retraso o necesidad de split | Mantener P0 en endpoints foundation y registrar extensión en PB-P2-018. |
| Tests duplican lógica de autorización | Falsos positivos o tests frágiles | Probar comportamiento observable con app real y fixtures, no reimplementar policies en tests. |
| Test data inconsistente | Falsos negativos o flakes | Crear factories explícitas para owner/non-owner/assigned/non-assigned. |
| Validation corre antes de authz | Filtración de schema/endpoint | Incluir tests con payload inválido y usuario no autorizado esperando `401/403/404`. |
| Masking 403/404 varía por endpoint | Tests incorrectos por contrato ambiguo | Usar contrato del endpoint; permitir `403` o `404` sólo donde la historia lo admite. |
| Tests IA llaman provider real | Costos o flakiness | Usar `MockAIProvider`/spy y assert no-call. |
| CI lento | Merge friction | Agrupar casos representativos y usar factories eficientes; cobertura extendida queda P2. |
| Logs filtran datos sensibles | Riesgo de privacidad | Log capture/redaction assertions en casos negativos representativos. |

---

## 18. Implementation Guidance for Coding Agents

- Inspeccionar estructura de tests existente antes de crear folders nuevos.
- Reusar app factory real y helpers de sesión/cookie existentes.
- Crear un registry explícito de endpoints protegidos foundation cubiertos por US-112.
- Construir factories de test para:
  - organizer owner,
  - organizer non-owner,
  - vendor assigned,
  - vendor non-assigned,
  - admin,
  - non-admin.
- Priorizar tests de comportamiento observable con Supertest.
- Para side effects, comparar DB state before/after o usar spies sobre use cases/providers cuando sea más estable.
- Para endpoints IA, usar `MockAIProvider` o spy; nunca llamar provider real.
- Integrar la suite al workflow CI existente.
- No modificar user story, technical spec, ADRs ni documentación fuente desde tareas de implementación salvo tarea documental explícita.
- No implementar endpoints, migrations, seed demo persistente, UI ni nuevas policies.

Orden recomendado:

1. Auditar endpoints foundation disponibles.
2. Definir registry de endpoints protegidos y exclusiones públicas.
3. Crear/ajustar factories y helpers de sesión.
4. Implementar assertion helpers para error envelope/correlation/no leaks.
5. Agregar tests `401`, `403`, `403/404`, validation-before-authz, no side effects.
6. Agregar no-call IA y no `AdminAction` no autorizado.
7. Integrar comando en CI.
8. Documentar scope foundation vs PB-P2-018.

---

## 19. Task Generation Notes

Suggested task groups:

- QA/Product scope confirmation and endpoint registry.
- Backend test utilities/factories.
- API negative tests for `401`.
- API negative tests for wrong role `403`.
- Ownership negative tests for organizer resources.
- Assignment negative tests for quote/booking vendor resources.
- Admin scope negative tests.
- Validation-before-authz regression tests.
- Error envelope/correlation/no leak tests.
- AI no-call/no-persistence tests.
- CI quality gate integration.
- Documentation of P0/P2 coverage split.

Required QA tasks:

- Supertest suite with app real.
- Factory/test DB isolation.
- No side effects assertions.
- Error envelope assertions.

Required security tasks:

- RBAC, ownership, assignment, admin-only negative scenarios.
- Sensitive data leak checks.
- Frontend-not-source-of-truth confirmation.

Required seed/demo tasks:

- Confirm no seed demo changes.
- Use ephemeral factories/fixtures.

Required documentation tasks:

- Document endpoint coverage registry.
- Document PB-P0-008 vs PB-P2-018 split.
- Document CI command/gate.

Dependencies between tasks:

- Endpoint registry before endpoint-specific tests.
- Factories/helpers before API tests.
- Error assertion helpers before broad regression coverage.
- AI test doubles before AI negative tests.
- CI integration after suite command exists.

Parent backlog consolidated tasks:

- No consolidated `tasks.md` required by default because PB-P0-008 contains only US-112.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | N/A |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | Pass |
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

Ready for Task Breakdown.

US-112 está técnicamente lista para generar Development Tasks. La especificación mantiene el alcance P0 como suite negativa foundation, respeta backend as source of truth, no introduce cambios funcionales ni schema, y define una estrategia clara de QA/security/CI para validar `401/403/404`, no leaks, no side effects y no-call IA.
