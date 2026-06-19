# Technical Specification — US-098: Generar snapshot OpenAPI automatizado

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-098 |
| Source User Story | `management/user-stories/US-098-openapi-snapshot.md` |
| Decision Resolution Artifact | `management/user-stories/decision-resolutions/US-098-decision-resolution.md` |
| Priority | P0 |
| Backlog ID | PB-P0-005 |
| Backlog Title | OpenAPI Snapshot desde Zod |
| Backlog Execution Order | 5 |
| User Story Position in Backlog Item | 1 of 1 |
| Related User Stories in Backlog Item | US-098 |
| Epic | EPIC-API-001 |
| Backlog Item Dependencies | PB-P0-004 |
| Feature | OpenAPI Snapshot |
| Module / Domain | API / Platform |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-15 |
| Last Updated | 2026-06-15 |

---

## 2. Backlog Execution Context

### Product Backlog Item

US-098 pertenece a PB-P0-005, cuyo objetivo es generar una especificación OpenAPI 3.x desde los schemas Zod del backend usando `zod-to-openapi` o herramienta equivalente. El backlog define que el snapshot debe estar versionado, validado en CI y ser útil para evitar drift entre contrato, código, frontend, MSW y tests contractuales.

### Execution Order Rationale

PB-P0-005 se ejecuta después de PB-P0-004 porque el snapshot OpenAPI debe reflejar endpoints, DTOs, response envelopes, error envelopes y security metadata ya definidos por las historias de API foundation. En particular, US-098 depende de que US-094, US-095, US-096 y US-097 hayan establecido el contrato MVP bajo `/api/v1/*`.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-098 | Generar, versionar y validar el snapshot OpenAPI canónico desde Zod | 1 |

---

## 3. Executive Technical Summary

Implementar la infraestructura técnica para generar `backend/openapi.json` desde schemas Zod anotados y metadata de rutas del backend Express/TypeScript. El snapshot debe ser determinista, validable con `redocly lint` o equivalente, versionado en Git y verificado en CI mediante un gate que regenere la spec y falle ante drift contractual no comprometido.

La implementación no crea endpoints nuevos ni cambia comportamiento funcional. Su responsabilidad es consolidar el contrato REST MVP existente bajo `/api/v1/*` en un artefacto canónico que pueda ser usado por QA, MSW, frontend y documentación local/demo. Por decisión formal US-098, `backend/openapi.json` es la fuente canónica versionada; cualquier `openapi.yaml`, Swagger UI o Redoc debe ser derivado y nunca definición manual paralela.

---

## 4. Scope Boundary

### In Scope

- Configurar `zod-to-openapi` o `@asteasolutions/zod-to-openapi` como herramienta de generación OpenAPI desde Zod.
- Definir un registry OpenAPI central para schemas, routes, tags, common responses y security schemes.
- Generar `backend/openapi.json` como snapshot OpenAPI 3.x canónico.
- Registrar `cookieAuth`, `ErrorEnvelope`, success envelope, list/pagination response y correlation ID en `components`.
- Incluir paths MVP bajo `/api/v1/*` ya definidos por PB-P0-004.
- Agregar scripts npm equivalentes a `openapi:generate`, `openapi:lint`, `openapi:check` y `openapi:docs`.
- Integrar un CI check que regenere, valide y compare el snapshot versionado.
- Habilitar visualización local/demo con Swagger UI, Redoc o equivalente a partir del snapshot generado.
- Documentar instrucciones para regenerar, validar y visualizar la spec.

### Out of Scope

- Crear, modificar o eliminar endpoints funcionales.
- Cambiar DTOs de dominio salvo para agregar metadata OpenAPI no funcional.
- Generar SDKs de producción o publicar clientes externos.
- Implementar portal público de documentación API.
- Crear contratos manuales paralelos en YAML/JSON.
- Implementar GraphQL, gRPC, tRPC, BFF, Server Actions o WebSockets.
- Incluir pagos reales, contratos firmados, e-signature, WhatsApp, chat real-time, push, RAG o decisiones autónomas de IA.

### Explicit Non-Goals

- No convertir OpenAPI en fuente manual separada del código.
- No introducir endpoints fuera del MVP.
- No exponer secretos, cookies, tokens, PII ni datos seed reales en ejemplos.
- No reemplazar runtime authorization del backend con metadata documental.
- No resolver inconsistencias de rutas de historias previas; debe reflejar las decisiones canónicas ya aprobadas.

---

## 5. Architecture Alignment

### Backend Architecture

La generación vive en el backend Node.js + Express + TypeScript dentro del monolito modular. Debe apoyarse en schemas Zod de la capa Interface/DTO y metadata de rutas, sin mezclar lógica de dominio. El registry OpenAPI puede ubicarse en una zona compartida de plataforma, por ejemplo `backend/src/shared/interface/openapi/` o estructura equivalente del proyecto.

### Frontend Architecture

No implementa UI de producto. El frontend podrá consumir `backend/openapi.json` posteriormente para MSW, tipos o validación contractual. Cualquier UI local de Swagger/Redoc es tooling técnico y no una ruta de producto Next.js.

### Database Architecture

No aplica. No hay modelos, migraciones, tablas, índices ni seed.

### API Architecture

El snapshot documenta el contrato REST JSON bajo `/api/v1/*`, alineado con ADR-ARCH-003, ADR-API-001, ADR-API-002, ADR-API-003 y ADR-API-004. Debe incluir response envelopes, error envelopes, status codes, security schemes, `operationId` y tags.

### AI / PromptOps Architecture

No aplica. La historia no invoca IA. Si documenta endpoints AI de US-097, solo refleja su contrato existente y sus schemas, sin ejecutar providers ni definir prompts.

### Security Architecture

OpenAPI documenta `cookieAuth` y respuestas 401/403, pero el backend sigue siendo source of truth para RBAC, ownership y assignment. El snapshot no debe contener secretos ni datos sensibles.

### Testing Architecture

La prueba principal es contractual/CI: generar spec, lint, comparar diff y validar componentes mínimos. Debe ejecutarse con Vitest o script Node determinista según convención del repo, sin depender de servicios externos.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 | Crear generador determinista que produce `backend/openapi.json` con estructura OpenAPI 3.x completa. | Backend tooling, DTO schemas, CI |
| AC-02 | Versionar el snapshot y aplicar controles para evitar secretos, PII o valores seed reales. | Repo, Security, QA |
| AC-03 | Agregar `openapi:check` en CI: generate + lint + diff contra Git. | DevOps, CI, QA |
| AC-04 | Registrar componentes comunes: `ErrorEnvelope`, success envelope, pagination/list response, correlation ID y errores estándar. | API contract, Shared kernel |
| AC-05 | Verificar que todos los paths documentados usen `/api/v1` y security metadata correcta. | API contract, Security |
| AC-06 | Proveer visualización local/demo desde el snapshot generado y documentar comandos. | Developer tooling, Documentation |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

- `shared/interface/openapi` o carpeta equivalente para registry/generation.
- `shared/interface/dto` o DTOs por módulo existentes como fuente de schemas.
- Módulos de PB-P0-004 como productores de schemas y route metadata: `identity-access`, `event-planning`, `quote-flow`, `ai-assistance` o nombres equivalentes definidos por US-090/Doc 14.

### Use Cases / Application Services

No aplica como caso de uso de negocio runtime. Implementar como script técnico idempotente:

- `generateOpenApiSpec`
- `validateOpenApiSpec`
- `checkOpenApiSnapshot`

Estos scripts no deben depender de servidor en ejecución ni de base de datos.

### Controllers / Routes

No se agregan controllers ni rutas runtime. La documentación local puede servirse por tooling separado o script dev-only, sin convertirse en endpoint de producto.

### DTOs / Schemas

- Anotar schemas Zod existentes con `.openapi(...)` o helper equivalente.
- Registrar schemas request/response por operación.
- Registrar `ErrorEnvelope`, success envelope, list response, pagination, auth/session schemas y `aiMeta` cuando aplique.
- Evitar schemas no deterministas o ejemplos con datos sensibles.

### Repository / Persistence

No aplica.

### Validation Rules

- `backend/openapi.json` debe ser OpenAPI 3.x válido.
- Todo path debe usar `/api/v1`.
- Toda operación debe tener `operationId`, tags, responses y request/response schemas cuando aplique.
- Endpoints protegidos deben declarar `cookieAuth` o security scheme vigente.
- El snapshot generado debe coincidir byte-for-byte o semantic-equivalent con el archivo versionado según el check elegido.

### Error Handling

- El generador debe fallar con exit code no cero si un schema no se puede convertir.
- El error debe indicar schema/ruta/operación afectada.
- No debe sobrescribir un snapshot válido previo con output incompleto.
- CI debe mostrar mensaje claro para regenerar y commitear cambios contractuales.

### Transactions

No aplica.

### Observability

- Logs de script mínimos: inicio, archivo generado, cantidad de paths/schemas, resultado de lint/check.
- No loggear secrets, cookies, tokens ni payloads PII-heavy.

---

## 8. Frontend Technical Design

### Routes / Pages

No aplica a producto final.

### Components

No aplica. Swagger UI/Redoc local/demo puede ejecutarse como tooling técnico desde `backend/openapi.json`.

### Forms

No aplica.

### State Management

No aplica.

### Data Fetching

No aplica para producto final. Futuras historias frontend/MSW pueden leer `backend/openapi.json`.

### Loading / Empty / Error / Success States

No aplica a producto final. Para tooling local, si el snapshot falta, el comando debe instruir ejecutar `openapi:generate`.

### Accessibility

No aplica a producto final. Si se usa Swagger UI/Redoc, usar defaults de la herramienta.

### i18n

No aplica a producto final. Metadata técnica puede permanecer en inglés.

---

## 9. API Contract Design

Esta historia no introduce endpoints. Documenta endpoints existentes.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| — | `/api/v1/*` | Snapshot documental de endpoints MVP existentes | Según endpoint documentado | Según DTO Zod existente | Según response schema existente | 400, 401, 403, 404, 409, 422, 429, 500 cuando aplique |

---

## 10. Database / Prisma Design

### Models Impacted

No aplica.

### Fields / Columns

No aplica.

### Relations

No aplica.

### Indexes

No aplica.

### Constraints

No aplica.

### Migrations Impact

No aplica.

### Seed Impact

No aplica.

---

## 11. AI / PromptOps Design

### AI Feature

No aplica.

### Provider

No aplica.

### Prompt Version

No aplica.

### Input Schema

No aplica.

### Output Schema

No aplica.

### Human-in-the-loop

No aplica. La historia no invoca IA ni materializa recomendaciones.

### Fallback

No aplica.

### Persistence

No aplica.

### Safety Rules

Si el snapshot documenta endpoints AI existentes, debe reflejar human-in-the-loop y `AIRecommendation` según US-097, sin introducir decisiones autónomas nuevas.

---

## 12. Security & Authorization Design

### Authentication

No hay autenticación runtime para el generador. En OpenAPI, endpoints protegidos deben declarar `cookieAuth` conforme a Doc 16 §43.

### Authorization

No hay autorización runtime nueva. El snapshot debe documentar 401/403 donde aplique y preservar que el backend es source of truth.

### Ownership Rules

No aplica al generador. Las ownership rules de endpoints existentes solo se documentan si ya fueron definidas por sus historias.

### Role Rules

No aplica al generador. Roles se reflejan por endpoint cuando aplique.

### Negative Authorization Scenarios

- Endpoint protegido sin `security` o sin respuestas 401/403 debe fallar lint/check o revisión contractual.
- Endpoint público debe estar explícitamente documentado como público cuando corresponda.

### Audit Requirements

No requiere `AdminAction`.

### Sensitive Data Handling

- Prohibido incluir cookies reales, tokens, API keys, session IDs, emails/personas reales o datos seed identificables en ejemplos.
- El script y CI no deben imprimir secretos.
- El artifact `backend/openapi.json` debe ser apto para commit.

---

## 13. Testing Strategy

### Unit Tests

- Validar helpers de registry para common components.
- Validar normalización/ordenamiento determinista del output si existe lógica propia.
- Validar que examples sanitizados no contienen patrones obvios de secrets/PII.

### Integration Tests

- Ejecutar generación completa desde schemas/rutas registradas y verificar que produce OpenAPI 3.x parseable.
- Ejecutar generación dos veces y confirmar que no hay diff.

### API Tests

- No aplica a endpoints runtime nuevos.
- Sí aplica validación contractual del snapshot: paths `/api/v1`, `operationId`, tags, responses y security.

### E2E Tests

No aplica.

### Security Tests

- Check automatizado o script de inspección para tokens/API keys/cookies/PII en `backend/openapi.json`.
- Verificar que endpoints protegidos documentan `cookieAuth` y respuestas 401/403.

### Accessibility Tests

No aplica a producto final.

### AI Tests

No aplica.

### Seed / Demo Tests

No requiere seed. Verificar que examples no dependan de IDs/datos seed reales.

### CI Checks

- `npm run openapi:generate`
- `npm run openapi:lint`
- `npm run openapi:check`
- Diff contra `backend/openapi.json` versionado.
- Integración en GitHub Actions como gate que bloquea merge/deploy si hay drift o spec inválida.

---

## 14. Observability & Audit

### Logs

Logs técnicos de script con resultado, path generado y conteos. Sin secretos ni payloads sensibles.

### Correlation ID

No aplica al generador. La spec debe documentar correlation ID en envelopes API donde aplique.

### AdminAction

No aplica.

### Error Tracking

No aplica a runtime. Fallos de generación/lint se reportan por CLI/CI.

### Metrics

Opcional en CI: cantidad de paths, schemas y warnings. No requerido para MVP.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No aplica.

### Demo Scenario Supported

Soporta demo técnica al permitir visualizar el contrato API local/demo desde `backend/openapi.json`.

### Reset / Isolation Notes

No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Product Backlog PB-P0-005 vs Doc 16 §43 | PB-P0-005 indica `openapi.json`; Doc 16 §43 menciona `/api/openapi.yaml`. | `backend/openapi.json` es el snapshot canónico versionado para US-098; YAML puede existir solo como derivado local/demo. | Actualizar Doc 16 §43 en una futura alineación documental para indicar `backend/openapi.json` como snapshot canónico y YAML como derivado opcional. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Schemas Zod no convertibles a OpenAPI | Bloquea generación del snapshot | Fallar con mensaje accionable y agregar metadata `.openapi(...)` o componente explícito |
| Snapshot no determinista | CI falla con diffs falsos | Ordenar keys/paths/schemas, evitar timestamps y normalizar salida |
| Doble fuente de verdad JSON/YAML | Drift contractual y confusión en QA/frontend | Mantener `backend/openapi.json` canónico; YAML/UI solo derivados |
| Endpoints protegidos sin security metadata | Documentación insegura o incompleta | Lint/check para `security`, 401 y 403 según tipo de endpoint |
| Secretos o PII en examples | Riesgo de exposición en repo | Sanitizar examples y agregar revisión automatizada/checklist |
| OpenAPI incluye endpoint fuera de scope | Scope creep y contrato falso | Registrar solo endpoints aprobados por historias API; revisar contra PB-P0-004 y MVP guardrails |
| Drift entre Doc 16 y endpoints refinados | Confusión de implementación | Aplicar decisiones de historias aprobadas y registrar alignment notes, sin reabrir decisiones cerradas |

---

## 18. Implementation Guidance for Coding Agents

- Crear/usar carpeta de tooling OpenAPI en backend, preferentemente bajo `backend/src/shared/interface/openapi/` o equivalente existente.
- Mantener schemas Zod como fuente; no escribir `openapi.json` manualmente salvo como output generado.
- Registrar common components antes de rutas: envelopes, pagination, error codes, security schemes.
- Incorporar rutas de US-094 a US-097 de forma incremental para aislar fallos de schema.
- Agregar scripts en package correspondiente:
  - `openapi:generate`
  - `openapi:lint`
  - `openapi:check`
  - `openapi:docs`
- `openapi:check` debe fallar si `backend/openapi.json` difiere del output generado.
- No reabrir la decisión de artifact: `backend/openapi.json` es canónico.
- No crear endpoints, SDKs, portal público ni definiciones manuales paralelas.
- No introducir dependencias runtime innecesarias en el servidor si la generación puede vivir como dev/build tooling.
- Preservar compatibilidad con CI sin servicios externos.

---

## 19. Task Generation Notes

- Suggested task groups:
  - OpenAPI generator setup.
  - Schema annotations and registry.
  - Common components and security schemes.
  - Snapshot generation and deterministic output.
  - CI lint/diff gate.
  - Local docs viewer.
  - Documentation updates.
  - QA/security checks.
- Required QA tasks:
  - Generation success test.
  - Determinism test.
  - Lint/spec validation test.
  - Drift detection test.
- Required security tasks:
  - Secret/PII example scan.
  - Protected endpoint security metadata check.
- Required seed/demo tasks:
  - No seed required.
  - Optional demo docs command validation.
- Required documentation tasks:
  - README instructions for generate/lint/check/docs.
  - Note that `openapi.yaml` is derived if used.
- Dependencies between tasks:
  - Install/configure tooling before annotations.
  - Common components before route registration.
  - Generator before snapshot.
  - Snapshot before CI diff gate.
  - CI gate before final DoD.
- Parent backlog consolidated `tasks.md`:
  - PB-P0-005 has a single story, so a consolidated backlog-level tasks file is optional; story-level tasks are sufficient.

---

## 20. Technical Spec Readiness

| Check | Status |
|---|---|
| User Story approved or explicitly allowed for draft spec | Pass |
| Product Backlog mapping found | Pass |
| Decision Resolution reviewed if present | Pass |
| Scope clear | Pass |
| Architecture alignment clear | Pass |
| API impact clear | Pass |
| DB impact clear | N/A |
| AI impact clear | N/A |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`.

US-098 está aprobada, mapeada a PB-P0-005, no tiene decisiones bloqueantes pendientes y cuenta con una decisión formal sobre el artefacto canónico `backend/openapi.json`. La especificación técnica es suficiente para generar Development Tasks sin reabrir decisiones de producto o arquitectura.
