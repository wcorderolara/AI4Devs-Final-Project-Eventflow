# Technical Specification — US-124: Aplicar validación JSON estricta con un reintento controlado

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-124 |
| Source User Story | `management/user-stories/US-124-ai-json-validation-with-retry.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usan `PO/BA Decisions Applied`, ADR-AI-007 y docs/17 |
| Priority | P0 |
| Backlog ID | PB-P0-011 |
| Backlog Title | Timeout 60s, fallback Mock en modo demo y validación JSON con 1 reintento |
| Backlog Execution Order | 11 |
| User Story Position in Backlog Item | 2 of 2 |
| Related User Stories in Backlog Item | US-123, US-124 |
| Epic | EPIC-AI-001 |
| Backlog Item Dependencies | PB-P0-009, PB-P0-010 |
| Feature | AI JSON validation + controlled retry |
| Module / Domain | AI Assistance / Output Validation |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-18 |
| Last Updated | 2026-06-18 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-011 entrega resiliencia base para ejecución IA: timeout/fallback controlado y validación estricta de outputs IA. US-123 cubre timeout y fallback a `MockAIProvider`; US-124 completa el backlog item con parsing, validación Zod estricta, retry máximo 1 y metadata segura de validación.

### Execution Order Rationale

US-124 debe ejecutarse después de PB-P0-009 porque depende de `LLMProvider`, `AIResult<TOutput>`, errores compartidos y `MockAIProvider`. También depende de PB-P0-010/US-122 para contratos de persistencia de `AIRecommendation` y de US-123 para no reintentar timeouts/provider errors y delegar fallback demo/test. Debe completarse antes de features AI P1/P2 para garantizar que ningún output IA malformado se persista o exponga como recomendación exitosa.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-123 | Implementa timeout 60s y fallback controlado a `MockAIProvider` | 1 |
| US-124 | Implementa validación JSON estricta y un reintento controlado | 2 |

---

## 3. Executive Technical Summary

Implementar una capa reutilizable de validación de outputs IA que parsea la respuesta del provider, valida con schemas Zod estrictos por feature y permite exactamente un reintento cuando la falla es `AIInvalidOutputError` o equivalente. La capa debe rechazar outputs malformados, campos extra, tipos inválidos, enums inválidos, invariantes de negocio expresadas en schema y contenido fuera de contrato antes de persistir o exponer una recomendación exitosa.

US-124 no implementa timeout/fallback orchestration, provider adapters, endpoints, UI ni persistencia desde cero. Debe integrarse con US-123 para fallback posterior si está habilitado, con US-121 para referencias de output schema en prompt metadata, y con US-122 para persistir success/failure metadata segura (`schemaValid`, `retryCount`, `errorCode`, `status`) cuando aplique.

---

## 4. Scope Boundary

### In Scope

- Crear o integrar `AIOutputValidationService` o equivalente.
- Crear o integrar `AIRetryPolicy` para retry máximo 1.
- Definir `AIInvalidOutputError` / `AI_INVALID_OUTPUT_SCHEMA` si no existe.
- Parsear output del provider de forma segura antes de validación.
- Validar output con schemas Zod estrictos (`.strict()` o equivalente).
- Retornar typed/canonical output usando `z.infer`.
- Rechazar output inválido antes de successful persistence/exposure.
- Registrar `schemaValid=true/false` y `retryCount`.
- Reintentar una sola vez sobre parse/schema validation failure.
- No reintentar timeout, provider unavailable, provider not configured, auth, rate-limit o 5xx.
- Delegar fallback a US-123 cuando ambos intentos fallan y fallback demo/test está habilitado.
- Validar también el output fallback antes de success.
- Emitir logs seguros de validation failure/retry/success.
- Agregar tests unitarios, integración, contract, seguridad, AI y CI.

### Out of Scope

- Implementar timeout/fallback orchestration; cubierto por US-123.
- Implementar `LLMProvider`, `OpenAIProvider`, `MockAIProvider` o `AnthropicProvider`; cubierto por PB-P0-009.
- Implementar prompt registry; cubierto por US-121.
- Implementar `AIRecommendation` repository/service desde cero; cubierto por US-122.
- Crear todos los schemas feature-specific si pertenecen a historias AI consumidoras; US-124 provee infraestructura/patrón/hook y valida los disponibles.
- Crear endpoints REST o frontend.
- Implementar accept/edit/discard/reject.
- Persistir raw invalid provider output como `pending`.
- Retriar más de una vez.
- Usar Anthropic como fallback.
- Implementar RAG, agents, chatbot, tool calling o decisiones autónomas.

### Explicit Non-Goals

- No “corregir” automáticamente outputs inválidos fuera de schema.
- No silenciar schema errors.
- No loggear raw output.
- No aceptar campos extra sin decisión explícita en el schema.
- No reemplazar HITL ni materializar dominio.
- No reabrir ADR-AI-007.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. La validación debe vivir en `ai-assistance` en Application/Infrastructure de acuerdo con Clean/Hexagonal:

- Application orquesta provider call, retry y validation service.
- Schemas/validators pueden vivir en Infrastructure o shared module si el repo ya lo define.
- Use cases dependen de interfaces/servicios, no de SDKs LLM.
- DTOs/types deben derivar de Zod schemas donde sea viable.

### Frontend Architecture

No aplica. No hay UI ni MSW nuevo en US-124. Contract tests futuros pueden reutilizar schemas o fixtures, pero no se implementa frontend.

### Database Architecture

Aplica de forma indirecta. US-124 no modifica schema, pero sus resultados deben mapearse a `AIRecommendation` fields si existen: `schema_valid`, `retry_count`, `status`, `error_code`, `output_payload`, `validated_output_payload`.

### API Architecture

No aplica directamente. No se crean endpoints. Los endpoints AI futuros mapearán `AI_INVALID_OUTPUT` a `422` o error envelope equivalente.

### AI / PromptOps Architecture

Aplica. Implementa ADR-AI-007: JSON-only + strict Zod validation antes de persistir/usar outputs. Debe respetar prompt versioning y output schema references de US-121.

### Security Architecture

Aplica. Output validation mitiga prompt injection y salida fuera de contrato. Logs y failure metadata no deben incluir raw output, prompts, secrets ni PII.

### Testing Architecture

Aplica. Tests con Vitest y `MockAIProvider`; contract tests validan fixtures mock contra schemas; CI sin OpenAI ni red. Security tests cubren leakage y outputs maliciosos/out-of-contract.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Provider output parsed and validated | Implementar parser + `safeParse`/strict schema por feature; retornar typed output. | Application, AI/PromptOps |
| AC-02 Invalid output not persisted/exposed as success | Bloquear success path y marcar validation failure antes de US-122. | Application, Security |
| AC-03 Exactly one retry | Policy con `retryCount <= 1` sólo para invalid output. | Application |
| AC-04 No retry for timeout/provider failures | Classifier distingue `AIInvalidOutputError` de errores US-123/provider. | Application, AI |
| AC-05 Retry success produces metadata | Segundo intento válido retorna `schemaValid=true`, `retryCount=1`. | Application, Persistence metadata |
| AC-06 Retry failure returns controlled behavior | Dos fallas devuelven `AI_INVALID_OUTPUT` o failure metadata segura. | Application, Observability |
| AC-07 Demo/test fallback delegated safely | Tras retry failure, llamar path US-123 si está habilitado y validar output fallback. | Application, AI |
| AC-08 Reject unsafe/out-of-contract outputs | Schemas strict/refinements rechazan campos extra, inyección, invariants inválidos. | AI, Security |
| AC-09 Safe observable validation logs | Logs con metadata acotada y sin raw output. | Observability, Security |
| AC-10 Tests cover validation/retry/no unsafe persistence | Suite cubre parse, schema, retry, no retry, fallback, logs, mock contract. | QA, CI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo principal:

- `ai-assistance`

Folders probables:

- `src/modules/ai-assistance/application/services/ai-output-validation.service.ts`
- `src/modules/ai-assistance/application/services/ai-retry-policy.ts`
- `src/modules/ai-assistance/application/errors/ai-output-validation-errors.ts`
- `src/modules/ai-assistance/application/types/validated-ai-output.ts`
- `src/modules/ai-assistance/infrastructure/output-validators/*.schema.ts`
- `src/modules/ai-assistance/infrastructure/output-validators/output-schema-registry.ts`
- `src/modules/ai-assistance/infrastructure/output-validators/__tests__/*.spec.ts`

Usar rutas reales del repo si PB-P0-009/010 ya creó estructura distinta.

### Use Cases / Application Services

Servicio sugerido:

- `AIOutputValidationService.validate(featureType, rawOutput, schemaRef, context?)`.

Servicio/orquestador sugerido:

- `ValidatedAIExecutionService.executeWithValidation(input, options?)` si existe un wrapper común.

Responsabilidades:

- Recibir raw/provider output.
- Parsear JSON si viene string.
- Seleccionar schema por `featureType` o `outputSchemaRef`.
- Validar con Zod strict.
- Retornar typed output y metadata.
- Clasificar errores.
- Aplicar retry máximo 1 sólo sobre invalid output.
- Delegar fallback a US-123 cuando corresponde.

### Controllers / Routes

No aplica. No crear routes/controllers.

### DTOs / Schemas

Tipos internos sugeridos:

- `AIOutputSchemaRegistry`.
- `AIOutputValidationInput`.
- `AIOutputValidationResult<TOutput>`.
- `AIValidationMetadata`.
- `AIRetryDecision`.
- `AIInvalidOutputError`.

Campos metadata:

- `schemaName`.
- `schemaVersion?`.
- `schemaValid`.
- `retryCount`.
- `errorCode`.
- `schemaErrorSummary?` truncado.
- `correlationId?`.
- `featureType`.

Schemas:

- Zod `.strict()` por output feature-specific disponible.
- Refinements para invariants como currency/language/category enum cuando el schema de feature lo define.
- `z.infer<typeof schema>` para DTOs.

### Repository / Persistence

No se crea repository. US-124 debe entregar metadata consumible por US-122:

- success: `schemaValid=true`, `retryCount`, typed `outputPayload`.
- failure: `schemaValid=false`, `retryCount=1`, `errorCode`, safe summary.

No persistir raw invalid output como success.

### Validation Rules

- Todo output IA pasa por parser.
- Todo output exitoso pasa por strict Zod schema.
- Campos extra fallan salvo schema explícito.
- Retry máximo 1.
- Retry sólo para parse/schema validation failure.
- No retry para `AITimeoutError`, `AIProviderUnavailableError`, `AIProviderNotConfiguredError`, auth/rate-limit/5xx.
- Fallback output también debe validarse.
- `schemaErrorSummary` debe ser bounded/truncated.
- No raw output en logs/errors.

### Error Handling

Errores tipados o codes:

- `AIInvalidOutputError`.
- `AIInvalidOutputSchemaError`.
- `AIOutputParseError`.
- `AIRetryLimitExceededError`.
- `AIOutputValidationConfigError`.

Codes:

- `AI_INVALID_OUTPUT`.
- `AI_INVALID_OUTPUT_SCHEMA`.
- `AI_OUTPUT_PARSE_ERROR`.
- `AI_RETRY_LIMIT_EXCEEDED`.

Mapeo recomendado:

- Fallo tras retry sin fallback: error app `422 AI_INVALID_OUTPUT`.
- Fallback habilitado: delegar a US-123 y validar resultado fallback antes de success.

### Transactions

No aplica directamente. Validación ocurre antes de persistencia. Si un use case future opera en transacción, sólo debe persistir después de validation success o failure metadata segura.

### Observability

Eventos sugeridos:

- `ai.output_validation_failed`.
- `ai.output_retry_attempted`.
- `ai.output_validation_success`.
- `ai.output_retry_exhausted`.

Campos permitidos:

- `featureType`.
- `provider`.
- `schemaName`.
- `retryCount`.
- `errorCode`.
- `schemaErrorSummary` truncado.
- `correlationId`.

Campos prohibidos:

- raw provider output.
- prompt completo.
- input payload completo.
- secrets/tokens/cookies.
- PII innecesaria.

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

No aplica. Feature stories posteriores mapearán `AI_INVALID_OUTPUT` a UI.

### Accessibility

No aplica.

### i18n

No introduce copy. Los schemas pueden validar language-related invariants si la feature lo requiere.

---

## 9. API Contract Design

No aplica.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| N/A | N/A | US-124 no crea endpoint REST | N/A | N/A | N/A | N/A |

---

## 10. Database / Prisma Design

### Models Impacted

No modifica modelos. Impacto indirecto sobre `AIRecommendation`.

### Fields / Columns

Campos downstream esperados si existen:

- `schema_valid`.
- `retry_count`.
- `error_code`.
- `status`.
- `output_payload`.
- `validated_output_payload`.

### Relations

No aplica.

### Indexes

No aplica.

### Constraints

Si ya existe constraint `retry_count BETWEEN 0 AND 1`, US-124 debe respetarla. Si no existe, enforcement queda en Application y se registra gap sólo si bloquea US-122.

### Migrations Impact

No se esperan migraciones. Si el schema real no soporta `schema_valid`, `retry_count` o `status=failed`, mapear metadata en los campos disponibles y registrar alignment/gap sin bloquear.

### Seed Impact

No crea seed DB. Debe validar fixtures de `MockAIProvider` existentes.

---

## 11. AI / PromptOps Design

### AI Feature

Infraestructura transversal para validar outputs IA antes de successful persistence/exposure.

### Provider

No implementa provider. Consume output de `LLMProvider`. `MockAIProvider` se usa para tests y fallback delegado por US-123.

### Prompt Version

El retry usa la misma prompt version, feature, language y sanitized input. La metadata de US-121 debe referenciar output schema aplicable.

### Input Schema

No valida input en US-124 salvo que el servicio común ya lo incluya. Input validation ocurre antes de provider call en use cases/feature stories. No ampliar payload.

### Output Schema

Responsabilidad principal:

- schema por feature.
- strict Zod.
- canonical typed output.
- reject unknown fields.
- refinements para invariants feature-specific.

### Human-in-the-loop

Output validado sigue siendo sugerencia. Debe persistirse como `AIRecommendation` pending antes de ser accionable, y materialización ocurre sólo por historias HITL posteriores.

### Fallback

No implementa fallback orchestration. Si ambos intentos fallan y US-123 indica fallback habilitado, delega al path de fallback. El output fallback debe pasar por la misma validación antes de success.

### Persistence

No persiste. Entrega metadata para US-122:

- `schemaValid`.
- `retryCount`.
- `errorCode`.
- `validatedOutputPayload`.
- safe failure summary.

### Safety Rules

- No raw invalid output como success.
- No raw output en logs.
- Strict schemas reducen prompt injection.
- No tool execution.
- No autonomous decisions.
- No materialización.

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente. No hay endpoint.

### Authorization

No aplica directamente. Upstream use cases autorizan antes de invocar IA. US-124 no debe crear bypass.

### Ownership Rules

No aplica directamente.

### Role Rules

No aplica directamente.

### Negative Authorization Scenarios

- Frontend intenta enviar output IA directo: no hay endpoint.
- Usuario no autorizado invoca feature AI: upstream rechaza antes de US-124.
- Output intenta instruir creación de datos oficiales: schema/HITL bloquean materialización.

### Audit Requirements

No crea `AdminAction`. La auditoría AI downstream usa `AIRecommendation` y logs seguros con correlation ID.

### Sensitive Data Handling

- No loggear raw output, prompts, input payload completo, tokens, cookies, secrets o PII.
- Truncar detalles Zod.
- Evitar persistir raw invalid output; si se registra failure, sólo metadata segura.

---

## 13. Testing Strategy

### Unit Tests

- Output válido pasa schema strict.
- Malformed JSON falla parse.
- JSON con campos extra falla `.strict()`.
- Missing required fields falla.
- Wrong enum/type falla.
- Feature invariant failure falla refinement.
- Retry policy permite exactamente 1 retry.
- Retry no aplica a timeout/provider errors.
- Error summaries están truncados.

### Integration Tests

- Provider fake/Mock devuelve invalid output, retry success.
- Provider fake/Mock devuelve invalid output dos veces, error `AI_INVALID_OUTPUT`.
- Fallback delegado a US-123 tras retry failure con flags habilitados.
- Fallback output se valida antes de success.
- Metadata `schemaValid`/`retryCount` disponible para US-122.

### API Tests

No aplica en US-124. Endpoint-level tests vendrán con feature stories.

### E2E Tests

No aplica directamente. E2E AI posteriores deben cubrir invalid output path.

### Security Tests

- Raw invalid output no aparece en logs.
- Prompt-injection-like content fuera de schema se rechaza.
- Unexpected fields se rechazan.
- No persistencia success con invalid output.

### Accessibility Tests

No aplica.

### AI Tests

- `MockAIProvider` fixtures válidas pasan schemas.
- Fixture invalid JSON fuerza retry/error determinístico.
- Tests no validan texto literal, sólo schema/forma e invariants.
- No OpenAI real en CI.

### Seed / Demo Tests

- Fixtures demo/mock son schema-valid.
- Escenario de forced invalid JSON es reproducible.
- Fallback demo posterior a retry failure produce output schema-valid antes de success.

### CI Checks

- Unit + integration sin provider secrets.
- Contract tests de fixtures mock.
- No network.
- Security log assertions.

---

## 14. Observability & Audit

### Logs

Eventos:

- `ai.output_validation_failed`.
- `ai.output_retry_attempted`.
- `ai.output_validation_success`.
- `ai.output_retry_exhausted`.

### Correlation ID

Preservar `correlationId` de `AIContext`/US-123 si está disponible.

### AdminAction

No aplica.

### Error Tracking

Clasificar:

- parse error.
- schema error.
- retry exhausted.
- fallback delegated.
- fallback validation failed.

### Metrics

Opcionales MVP:

- `ai_schema_validation_failed_total{feature_type,retry_count}`.
- `ai_output_retry_total{feature_type}`.
- `ai_invalid_output_total{feature_type,error_code}`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No requiere seed DB nuevo.

### Demo Scenario Supported

Sí. Asegura que fixtures de `MockAIProvider` usados en demo/test sean schema-valid y que escenarios de invalid JSON sean reproducibles.

### Reset / Isolation Notes

Tests deben aislar fixtures y flags de forced invalid output por suite.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `docs/7-AI-Features-Specification.md` | Algunas secciones mencionan fallback a plantilla estática tras JSON inválido. | US-124 aplica ADR-AI-007 y docs/17: retry máximo 1; si falla, error controlado o fallback delegado a US-123 cuando esté habilitado. | Mantener fallback a `MockAIProvider`/US-123 como camino técnico de PB-P0-011; documentar plantilla estática como opción histórica/futura si se formaliza. | No |
| `docs/19-Security-and-Authorization-Design.md` | Indica que output inválido se descarta/loguea; docs/17 permite `AIRecommendation status='failed'`. | US-124 no persiste; permite safe failure metadata sólo si US-122/schema lo soporta, nunca raw invalid output. | Mantener safe failure metadata como opcional y no bloqueante. | No |
| `docs/18-Database-Physical-Design.md` | Documenta campos `schema_valid`, `retry_count`, `status=failed`; schema real puede diferir según implementación previa. | US-124 debe mapear metadata disponible y no crear migración salvo gap formal. | Verificar schema durante tareas; registrar gap si falta enforcement `retry_count <= 1`. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Schemas por feature no existen aún | No se puede validar una feature específica | Crear registry/hook y fixtures mínimas; feature stories completan schemas faltantes |
| Retry accidental infinito | Costos/latencia y riesgo demo | Retry policy central con guard `retryCount <= 1` y tests |
| Retry sobre timeout/provider errors | Contradice US-123 | Error classifier explícito y tests negativos |
| Raw invalid output en logs | Riesgo seguridad/privacidad | Safe logger + truncation + security tests |
| Mock fixtures divergen de schemas | CI/demo engañosos | Contract tests Mock/Zod en CI |
| Campos extra aceptados por schema laxo | Prompt injection/out-of-contract | `.strict()` por default y review de schemas |
| Failure metadata no mapea al schema DB real | Persistencia incompleta | Delegar a US-122; mapear safe metadata o loggear sin persistir |
| Fallback output no validado | Output unsafe tras fallback | Validar fallback output con mismo schema antes de success |

---

## 18. Implementation Guidance for Coding Agents

- Revisar US-123 spec antes de implementar para respetar delegación de timeout/fallback.
- Implementar primero error classifier y retry policy.
- Implementar parser/validation service.
- Crear output schema registry o integrar con schema refs de US-121.
- Usar Zod `.strict()` por default.
- Mantener `z.infer` como fuente de DTOs cuando aplique.
- Añadir test fixtures válidas e inválidas.
- Validar `MockAIProvider` con los mismos schemas.
- No crear endpoints ni UI.
- No persistir raw invalid output.
- No implementar retry para timeouts/provider errors.
- No reabrir ADR-AI-007.

---

## 19. Task Generation Notes

Suggested task groups:

- Backend:
  - Definir errores `AIInvalidOutputError`.
  - Implementar `AIOutputValidationService`.
  - Implementar `AIRetryPolicy`.
  - Implementar output schema registry.
  - Integrar metadata para US-122.
- AI / PromptOps:
  - Alinear schema refs con US-121.
  - Validar `MockAIProvider` fixtures.
  - Validar fallback output después de US-123.
- Security:
  - Safe logs y truncation.
  - No raw output persistence/logging.
  - Prompt injection/out-of-contract rejection.
- QA:
  - Unit tests schemas/retry.
  - Integration retry success/failure.
  - Contract tests Mock.
  - Negative tests no retry for timeout/provider errors.
- Observability:
  - Eventos validation failed/retry/success.
- Documentation:
  - Alignment plantilla estática vs `MockAIProvider`.
  - Mapping metadata `schema_valid`/`retry_count`.

Required dependencies:

- US-123 para error classes/fallback delegation.
- US-121 para schema refs/prompt metadata.
- US-122 para persistence metadata contract.

Parent backlog consolidated tasks:

- Sí. PB-P0-011 debería consolidar US-123 + US-124 para probar timeout/fallback + validation/retry end-to-end.

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
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-124 está técnicamente lista. La implementación debe enfocarse en strict Zod output validation, retry máximo 1 sólo para invalid output, safe failure metadata, safe logs, contract tests con `MockAIProvider` y coordinación con US-123/US-122, sin crear endpoints, UI, providers, persistence desde cero ni retry para timeout/provider errors.
