# 🧾 User Story: Generar snapshot OpenAPI automatizado

## 🆔 Metadata

| Field              | Value                                  |
| ------------------ | -------------------------------------- |
| ID                 | US-098                                 |
| Epic               | EPIC-API-001 — REST API Endpoints      |
| Feature            | OpenAPI Snapshot                       |
| Backlog Item       | PB-P0-005                              |
| Module / Domain    | API / Platform                         |
| User Role          | System                                 |
| Priority           | Should Have (P0)                       |
| Status             | Approved                               |
| Owner              | Product Owner / Business Analyst       |
| Approved By        | PO/BA Review                           |
| Approval Date      | 2026-06-15                             |
| Ready for Development Tasks | Yes                           |
| Sprint / Milestone | MVP                                    |
| Created Date       | 2026-06-09                             |
| Last Updated       | 2026-06-15                             |

---

## 🎯 User Story

**As the** sistema backend  
**I want** generar y versionar un snapshot OpenAPI 3.x desde los schemas Zod del contrato REST `/api/v1/*`  
**So that** el frontend, MSW, los tests de contrato y la documentación técnica consuman una fuente verificable y no divergente del contrato API

---

## 🧠 Business Context

### Context Summary

PB-P0-005 formaliza que EventFlow debe generar una especificación OpenAPI desde los schemas Zod usando `zod-to-openapi` o una herramienta equivalente. El objetivo no es diseñar nuevos endpoints, sino congelar el contrato ya implementado en las historias de API foundation (Auth, Events, Quotes y AI) en un artefacto versionado que pueda validarse en CI.

Sin un snapshot verificable, el frontend, los mocks MSW y los tests de contrato pueden divergir del backend. Esta historia convierte los DTOs Zod y la metadata de rutas en un `openapi.json` canónico del repositorio, con un comando reproducible y un gate de CI que falla cuando el contrato generado difiere del snapshot comprometido.

### Related Domain Concepts

* `openapi.json` — snapshot versionado y canónico del contrato REST del backend para PB-P0-005
* `zod-to-openapi` / `@asteasolutions/zod-to-openapi` — herramienta para derivar OpenAPI 3.x desde schemas Zod anotados
* Zod DTO schemas — fuente técnica de request/response DTOs y validaciones de contrato
* OpenAPI registry — registro central de schemas, paths, tags, security schemes y common responses
* Contract drift — diferencia entre el contrato generado desde código y el snapshot versionado
* `redocly lint` o validador equivalente — verificación sintáctica y estructural del documento OpenAPI

### Assumptions

* US-092 provee la estrategia de schemas Zod para DTOs.
* US-093 provee el error envelope estándar que debe aparecer como componente común de OpenAPI.
* US-094, US-095, US-096 y US-097 definen los endpoints MVP que alimentan el snapshot inicial.
* El snapshot canónico versionado para CI será `backend/openapi.json`; documentación YAML o Swagger UI puede generarse localmente como derivado, pero no reemplaza el snapshot canónico de esta historia.
* El comando de generación debe ser determinista: mismo código de entrada produce el mismo archivo ordenado, sin timestamps dinámicos ni valores sensibles.

### Dependencies

* US-092 — Zod validation y schemas DTO por módulo.
* US-093 — Error envelope unificado y correlation ID.
* US-094 — Auth endpoints implementation.
* US-095 — Event endpoints implementation.
* US-096 — Quote endpoints implementation.
* US-097 — AI endpoints implementation.
* PB-P0-004 — REST API endpoints foundation.

---

## 🔗 Traceability

| Source                 | Reference                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| FRD Requirement(s)     | Transversal — no implementa un FRD funcional directo; habilita contrato API verificable para features MVP  |
| Use Case(s)            | Transversal — no implementa directamente un UC; habilita consumo estable de endpoints `/api/v1/*`          |
| Business Rule(s)       | Transversal — no define reglas de negocio nuevas; refleja las reglas ya expuestas por endpoints MVP        |
| Permission Rule(s)     | No aplica directamente — documenta security schemes y respuestas 401/403 existentes, no decide AuthZ       |
| Data Entity / Entities | N/A — artefacto de contrato, sin persistencia nueva                                                         |
| API Endpoint(s)        | Todos los endpoints MVP implementados bajo `/api/v1/*`                                                      |
| NFR Reference(s)       | NFR-SEC-007, NFR-TEST-001, NFR-OBS-006                                                                      |
| Related ADR(s)         | ADR-ARCH-003, ADR-BE-001, ADR-API-001, ADR-API-002, ADR-API-003, ADR-API-004, ADR-TEST-001, ADR-DEVOPS-006 |
| Related Document(s)    | /docs/14 §14, /docs/16 §43-44, /docs/20, /docs/21 §17, /docs/22                                            |

---

## 🧩 PO/BA Decisions Applied

| Decisión | Fuente | Aplicado |
| -------- | ------ | -------- |
| Usar generación desde Zod para OpenAPI | Product Backlog PB-P0-005; Doc 16 §43 | El snapshot se genera desde schemas Zod anotados con `zod-to-openapi` o equivalente. |
| Snapshot versionado en repo | Product Backlog PB-P0-005 | `backend/openapi.json` se mantiene comprometido como contrato canónico para CI y revisiones de PR. |
| Artefacto canónico del snapshot | Decision Resolution US-098; Product Backlog PB-P0-005 | `backend/openapi.json` es el artefacto canónico versionado para CI; `openapi.yaml` o Swagger UI pueden existir solo como derivados locales/demo y no como segunda fuente de verdad. |
| CI detecta drift contractual | Product Backlog PB-P0-005; Doc 21 §17 | El pipeline regenera OpenAPI y falla si hay diff no comprometido o spec inválida. |
| Doc 16 es fuente normativa hasta OpenAPI validado | Doc 16 §43 | El snapshot debe reflejar Doc 16 y las decisiones refinadas de US-094 a US-097. |
| OpenAPI no introduce endpoints nuevos | Epic Map EPIC-API-001; PB-P0-005 | La historia documenta endpoints existentes; cualquier endpoint faltante pertenece a su US funcional/API correspondiente. |

---

## 🧭 Scope Guardrails

### MVP Scope

* Scope Classification: In Scope
* MVP Relevance: Should Have (P0)

### Explicitly Out of Scope

* Crear endpoints nuevos o modificar comportamiento funcional de Auth, Events, Quotes o AI.
* Generar SDKs de producción o publicar clientes externos.
* Implementar un portal público de documentación API fuera del entorno local/demo.
* Convertir OpenAPI en una plataforma para clientes externos o marketplace transaccional.
* GraphQL, gRPC, tRPC, BFF, Server Actions o WebSockets.
* Pagos reales, contratos firmados, e-signature, chat real-time, WhatsApp, push, RAG o decisiones autónomas de IA.

### Scope Notes

* Esta historia solo agrega tooling, metadata, snapshot y validación de contrato.
* El backend sigue siendo source of truth para autorización; OpenAPI documenta `securitySchemes` y respuestas, pero no reemplaza políticas runtime.
* El snapshot debe reflejar decisiones ya tomadas en historias API refinadas, incluyendo notas de alineación documental de rutas canónicas.

---

## ✅ Acceptance Criteria

## 🎯 Happy Path

### AC-01: Generación determinista de `openapi.json`

**Given** el backend tiene schemas Zod anotados para los DTOs MVP y metadata de rutas `/api/v1/*`  
**When** se ejecuta el comando de generación OpenAPI  
**Then** se produce `backend/openapi.json` en formato OpenAPI 3.x válido  
**And** el archivo incluye `info`, `servers`, `tags`, `paths`, `components.schemas`, `components.responses` y `components.securitySchemes`  
**And** ejecuciones repetidas sin cambios de código no generan diff

### AC-02: Snapshot versionado como contrato canónico

**Given** `backend/openapi.json` fue generado desde los schemas Zod del backend  
**When** se revisa el repositorio  
**Then** el snapshot está versionado en Git  
**And** no contiene secretos, tokens reales, credenciales, PII ni valores específicos de usuarios seed  
**And** los ejemplos incluidos son seguros, ficticios y compatibles con el MVP

### AC-03: CI detecta drift entre código y snapshot

**Given** un PR modifica DTOs, rutas, responses o security metadata del API  
**When** el pipeline de CI ejecuta el gate de OpenAPI  
**Then** regenera el snapshot desde código  
**And** valida la spec con `redocly lint` o herramienta equivalente  
**And** falla si el archivo generado difiere de `backend/openapi.json` comprometido  
**And** muestra una instrucción clara para regenerar y commitear el snapshot

### AC-04: Componentes compartidos reflejan el contrato base

**Given** US-092 y US-093 definen validación Zod y error envelope estándar  
**When** se genera OpenAPI  
**Then** el documento incluye componentes comunes para `ErrorEnvelope`, success envelope, pagination/list response y correlation ID  
**And** los errores 400, 401, 403, 404, 409, 422, 429 y 500 usan el envelope estándar cuando aplican  
**And** los request DTOs rechazan campos inesperados según la estrategia `.strict()` documentada

### AC-05: Security schemes y rutas `/api/v1` documentadas

**Given** el backend usa REST JSON versionado bajo `/api/v1`  
**When** se inspecciona `backend/openapi.json`  
**Then** todos los paths MVP usan el prefijo `/api/v1`  
**And** los endpoints protegidos declaran `cookieAuth` o el security scheme equivalente definido en Doc 16 §43  
**And** endpoints públicos como registro/login se documentan explícitamente como públicos cuando corresponde  
**And** no se documenta ningún endpoint fuera de scope MVP

### AC-06: Documentación local accesible para desarrollo

**Given** el snapshot OpenAPI está generado y validado  
**When** un desarrollador ejecuta el script local de documentación API  
**Then** puede visualizar el contrato mediante Swagger UI, Redoc o equivalente local/demo  
**And** la documentación consume el snapshot generado, no una definición manual paralela  
**And** el README o script npm indica cómo regenerar, validar y visualizar la spec

---

## ⚠️ Edge Cases

### EC-01: Schema Zod no convertible a OpenAPI

**Given** un schema Zod usa un constructo no soportado por la herramienta de OpenAPI  
**When** se ejecuta la generación  
**Then** el comando falla de forma controlada  
**And** reporta el schema/ruta afectada  
**And** no sobrescribe el snapshot válido anterior con un archivo incompleto

#### Handling

* Fail-fast en el generador y salida con exit code distinto de cero.
* Documentar workaround aceptable: ajustar schema, agregar metadata `.openapi(...)` o crear componente explícito.

### EC-02: Diff contractual no comprometido

**Given** el código cambia un DTO o endpoint  
**When** CI regenera OpenAPI y detecta diff contra `backend/openapi.json`  
**Then** el gate falla  
**And** el mensaje indica regenerar el snapshot y revisar si el cambio contractual es intencional

#### Handling

* CI debe ejecutar generación + validación + diff.
* El diff no se auto-commitea en CI; el desarrollador debe revisar y comprometer el cambio.

### EC-03: Metadata OpenAPI incompleta

**Given** una ruta existe pero no tiene `operationId`, tags, response schema o security metadata  
**When** se ejecuta el validador de OpenAPI  
**Then** el gate falla o reporta error accionable  
**And** la ruta no queda documentada como operación ambigua

#### Handling

* Reglas de lint para `operationId`, tags, responses y security.
* Convención `verbResource` para `operationId` conforme a Doc 16 §43.

---

## 🚫 Validation Rules

| ID    | Rule | Message / Behavior |
| ----- | ---- | ------------------ |
| VR-01 | `backend/openapi.json` debe ser OpenAPI 3.x válido | `redocly lint` o validador equivalente falla CI con detalle del problema |
| VR-02 | El snapshot generado debe coincidir con el archivo versionado | CI falla con diff contractual no comprometido |
| VR-03 | Cada operación debe tener `operationId`, tags, responses y schemas cuando aplique | Lint/generador falla con ruta y operación afectada |
| VR-04 | No se permiten secretos, tokens reales, PII ni datos seed reales en ejemplos | Revisión automatizada o checklist de PR bloquea la exposición |
| VR-05 | Todos los endpoints documentados deben usar `/api/v1` | Lint/revisión falla si aparece path fuera del prefijo canónico |

---

## 🔐 Authorization & Security Rules

| ID     | Rule |
| ------ | ---- |
| SEC-01 | No aplica runtime authorization — esta historia no introduce endpoints ni ejecuta políticas de acceso. |
| SEC-02 | El documento OpenAPI debe representar `cookieAuth`/security schemes sin exponer secretos ni valores reales. |
| SEC-03 | Los endpoints protegidos deben documentar respuestas 401/403 con el error envelope estándar. |
| SEC-04 | El snapshot y ejemplos no deben contener PII, tokens, cookies, API keys, session IDs ni datos seed identificables. |
| SEC-05 | El backend sigue siendo la fuente de verdad de RBAC/ownership; OpenAPI solo documenta el contrato observable. |

### Negative Authorization Scenarios

* No aplica — esta historia no introduce endpoints ni runtime authorization.
* Caso documental esperado: endpoint protegido sin security scheme o sin 401/403 documentado debe fallar lint/revisión.

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
| Screen / Route      | No aplica a usuario final; documentación local/demo puede exponerse como tooling técnico. |
| Main UI Pattern     | Swagger UI, Redoc o equivalente solo para desarrollo/demo técnico. |
| Primary Action      | Regenerar, validar y visualizar contrato API. |
| Secondary Actions   | Descargar/ver `openapi.json` local. |
| Empty State         | Si no existe snapshot, el script debe indicar ejecutar generación. |
| Loading State       | N/A. |
| Error State         | Error de generación/lint con ruta, schema u operación afectada. |
| Success State       | Spec generada y validada sin diff. |
| Accessibility Notes | No aplica a producto final; si se usa UI local, usar defaults accesibles de la herramienta elegida. |
| Responsive Notes    | No aplica a producto final. |
| i18n Notes          | La metadata técnica puede permanecer en inglés; descripciones funcionales deben ser comprensibles para el equipo. |
| Currency Notes      | No aplica. |

---

## 🛠 Technical Notes

### Frontend

* Route / Page: N/A para producto final.
* Components: N/A.
* State Management: N/A.
* Forms: N/A.
* API Client: Consumirá `backend/openapi.json` como referencia para MSW/clientes cuando las historias frontend/QA lo requieran.

### Backend

* Use Case / Service: script/generador OpenAPI ejecutable por npm.
* Controller / Route: N/A — no se introducen endpoints runtime.
* Authorization Policy: N/A runtime; security schemes documentales.
* Validation: Zod schemas anotados con `.openapi(...)` o metadata equivalente.
* Transaction Required: No.
* Suggested artifact: `backend/openapi.json`.
* Suggested commands: `npm run openapi:generate`, `npm run openapi:lint`, `npm run openapi:check`, `npm run openapi:docs` o equivalentes definidos en package scripts.
* Generation must be deterministic and must not include timestamps, host-specific paths or environment-specific secrets.

### Database

* Main Tables: N/A.
* Constraints: N/A.
* Index Considerations: N/A.

### API

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| — | — | No introduce endpoints; documenta el contrato REST MVP existente bajo `/api/v1/*`. |

### Observability / Audit

* Correlation ID Required: No para el generador; sí debe estar documentado como parte de envelopes API.
* Log Event Required: Sí para ejecución local/CI del generador (éxito/fallo sin secretos).
* AdminAction Required: No.
* AIRecommendation Required: No.

---

## 🧪 Test Scenarios

### Functional Tests

| ID    | Scenario | Type |
| ----- | -------- | ---- |
| TS-01 | Generar `backend/openapi.json` desde schemas Zod produce OpenAPI 3.x válido | Unit/Integration |
| TS-02 | Ejecutar generación dos veces sin cambios no produce diff | Integration |
| TS-03 | El snapshot incluye `ErrorEnvelope`, pagination/list response, correlation ID y `cookieAuth` | Contract |
| TS-04 | Swagger UI/Redoc local carga el snapshot sin definición manual paralela | Smoke |

### Negative Tests

| ID    | Scenario | Expected Result |
| ----- | -------- | --------------- |
| NT-01 | Schema Zod sin metadata requerida para OpenAPI | Generador/lint falla con mensaje accionable |
| NT-02 | `backend/openapi.json` está desactualizado respecto al código | CI falla por diff contractual |
| NT-03 | Operación sin `operationId`, tag, response schema o security metadata aplicable | Lint falla |
| NT-04 | Ejemplo contiene token, cookie, API key o PII evidente | Gate/checklist bloquea el PR |

### AI Tests

Not applicable for this story.

### Authorization Tests

| ID         | Scenario | Expected Result |
| ---------- | -------- | --------------- |
| AUTH-TS-01 | Endpoint protegido documentado sin 401/403 o sin security scheme | Lint/revisión falla como contrato incompleto |

### Accessibility Tests

* No aplica a producto final. Si se habilita Swagger UI/Redoc local, usar la accesibilidad provista por la herramienta; no requiere suite A11Y producto.

### Contract / CI Tests

| ID       | Scenario | Expected Result |
| -------- | -------- | --------------- |
| CT-01 | CI ejecuta generación OpenAPI, lint y diff | Pipeline falla ante drift o spec inválida |
| CT-02 | PR cambia DTO response de un endpoint MVP | Diff de `backend/openapi.json` evidencia el cambio contractual |
| CT-03 | MSW/contract tests referencian el snapshot versionado cuando aplique | No hay contrato paralelo manual divergente |

---

## 📊 Business Impact

| Field               | Value |
| ------------------- | ----- |
| KPI Affected        | Estabilidad del contrato API, reducción de drift frontend/backend, readiness de QA |
| Expected Impact     | Habilita clientes, mocks MSW y tests de contrato alineados al backend |
| Success Criteria    | `openapi.json` versionado, validado en CI y sin drift en PRs |
| Academic Demo Value | Evidencia técnica auditable de contrato API y quality gate automatizado |

---

## 🧩 Task Breakdown Readiness

### Potential Frontend Tasks

* Consumir `backend/openapi.json` como fuente para MSW o generación de tipos cuando corresponda.
* Verificar que no exista contrato manual paralelo para endpoints MVP.

### Potential Backend Tasks

* Instalar/configurar `zod-to-openapi` o herramienta equivalente.
* Crear registry/generador OpenAPI para schemas, paths, tags, common responses y security schemes.
* Anotar schemas Zod y operaciones con metadata OpenAPI mínima.
* Generar `backend/openapi.json` de forma determinista.
* Agregar scripts npm de generación, lint, check y docs locales.

### Potential Database Tasks

* Not applicable for this story.

### Potential AI / PromptOps Tasks

* Not applicable for this story.

### Potential QA Tasks

* Agregar test/gate que regenere y compare snapshot.
* Validar que responses comunes y errores esperados estén documentados.
* Coordinar con US-127 para MSW/contract tests posteriores.

### Potential DevOps / Config Tasks

* Integrar `openapi:check` en GitHub Actions.
* Asegurar que el pipeline falle ante diff o lint inválido.
* Documentar comandos en README técnico.

---

## ✅ Definition of Ready

* [ ] US-092, US-093 y las historias de endpoints MVP relevantes tienen contrato suficientemente definido.
* [ ] La herramienta de generación OpenAPI desde Zod está elegida o aceptada como equivalente a `zod-to-openapi`.
* [ ] El path canónico del snapshot está definido como `backend/openapi.json`.
* [ ] El equipo acepta que OpenAPI documenta endpoints existentes y no crea nuevos endpoints.
* [ ] El approval gate valida el alignment note `openapi.json` vs `/api/openapi.yaml` de Doc 16.

---

## ✅ Definition of Done

* [ ] `backend/openapi.json` existe, es OpenAPI 3.x válido y está versionado.
* [ ] El comando de generación es reproducible localmente y en CI.
* [ ] CI falla cuando el snapshot generado difiere del versionado.
* [ ] La spec incluye schemas, paths, responses comunes, correlation ID y security schemes relevantes.
* [ ] No hay secretos, tokens, PII ni datos seed reales en el snapshot.
* [ ] La documentación local/demo carga desde el snapshot generado.
* [ ] README o documentación técnica explica cómo generar, validar y visualizar OpenAPI.

---

## 📝 Notes

* Documentation Alignment Required: Doc 16 §43 menciona `/api/openapi.yaml`, mientras PB-P0-005 indica `openapi.json`. Para esta historia, el snapshot canónico versionado es `backend/openapi.json`; YAML puede ser un derivado local si el equipo lo necesita.
* Esta historia no aprueba ni implementa cambios funcionales en endpoints; solo hace visible y verificable el contrato API existente.
