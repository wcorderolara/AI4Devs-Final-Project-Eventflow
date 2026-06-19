# Technical Specification — US-123: Aplicar timeout 60s y fallback Mock controlado

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-123 |
| Source User Story | `management/user-stories/US-123-ai-timeout-and-fallback.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usan `PO/BA Decisions Applied`, ADR-AI-003 y decisión PO 8.1 #9 |
| Priority | P0 |
| Backlog ID | PB-P0-011 |
| Backlog Title | Timeout 60s, fallback Mock en modo demo y validación JSON con 1 reintento |
| Backlog Execution Order | 11 |
| User Story Position in Backlog Item | 1 of 2 |
| Related User Stories in Backlog Item | US-123, US-124 |
| Epic | EPIC-AI-001 |
| Backlog Item Dependencies | PB-P0-009, PB-P0-010 |
| Feature | AI timeout + controlled Mock fallback |
| Module / Domain | AI Assistance / Platform |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-18 |
| Last Updated | 2026-06-18 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-011 entrega resiliencia base para la ejecución IA del MVP: timeout fijo de 60,000 ms, fallback controlado a `MockAIProvider` para demo/test y validación JSON estricta con un reintento. US-123 cubre la primera parte del backlog item: timeout y fallback controlado. US-124 cubrirá validación JSON y retry.

### Execution Order Rationale

US-123 debe ejecutarse después de PB-P0-009 porque necesita `LLMProvider`, `OpenAIProvider`, `MockAIProvider`, `AnthropicProvider` stub y provider selection. También debe ejecutarse después de PB-P0-010 porque debe producir metadata compatible con `AIRecommendation` persistence (`fallback_used`, `timeout_ms`, provider, latency, correlation). Debe ejecutarse antes de US-124 o en paralelo coordinado, porque US-124 delega timeout/provider failures a este comportamiento.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-123 | Implementa timeout 60s y fallback controlado a `MockAIProvider` | 1 |
| US-124 | Implementa validación JSON estricta y un reintento controlado | 2 |

---

## 3. Executive Technical Summary

Implementar una capa de ejecución IA que envuelva invocaciones a `LLMProvider` con timeout configurable por `AI_TIMEOUT_MS`, default `60000`, y que aplique fallback a `MockAIProvider` únicamente cuando `AI_DEMO_MODE=true` o `AI_USE_MOCK_FALLBACK=true`. Fuera de esos modos, timeout o fallas del proveedor primario deben producir errores controlados, no fallback silencioso.

La solución debe validar configuración en bootstrap, distinguir `LLM_PROVIDER=mock` como modo primario determinista, prohibir `AnthropicProvider` como fallback, emitir metadata segura de ejecución y logs observables, y soportar pruebas determinísticas con fake timers o clock injectable. US-123 no implementa provider adapters, no valida JSON, no reintenta outputs inválidos, no persiste `AIRecommendation`, no crea endpoints ni UI.

---

## 4. Scope Boundary

### In Scope

- Crear o integrar `AIExecutionService`, `AITimeoutService`, `FallbackService` o equivalentes según patrón existente.
- Envolver invocaciones `LLMProvider.generate(...)` o equivalente con timeout de `AI_TIMEOUT_MS`.
- Usar `60000` ms como default de runtime.
- Permitir override de timeout sólo para tests/config válida.
- Aplicar fallback a `MockAIProvider` cuando `AI_DEMO_MODE=true` o `AI_USE_MOCK_FALLBACK=true`.
- Tratar `LLM_PROVIDER=mock` como provider primario, no como fallback.
- Rechazar fallback a `AnthropicProvider`.
- Retornar error controlado cuando fallback está deshabilitado.
- Emitir metadata de ejecución: provider final, provider original, fallback flag, timeout, latency, error code, correlation ID.
- Validar config AI en bootstrap, incluyendo `AI_LOG_PAYLOADS=false` en demo/production.
- Emitir logs seguros para timeout, fallback y failure.
- Agregar tests unitarios, integración, seguridad, AI/demo y CI.

### Out of Scope

- Implementar `LLMProvider`, `OpenAIProvider`, `MockAIProvider` o `AnthropicProvider`; cubierto por PB-P0-009.
- Implementar JSON schema validation, parsing, retry por invalid output o `AI_INVALID_OUTPUT`; cubierto por US-124.
- Implementar `PromptRegistry`; cubierto por US-121.
- Persistir `AIRecommendation`; cubierto por US-122.
- Crear feature-specific AI use cases o endpoints.
- Crear frontend, loading states, badges, copy de error o MSW fixtures.
- Implementar apply/edit/discard/reject.
- Implementar fallback a Anthropic o cualquier provider diferente de `MockAIProvider`.
- Implementar streaming, RAG, agents, chatbot, tool calling o decisiones autónomas.

### Explicit Non-Goals

- No hacer fallback silencioso en `production-academic`.
- No invocar provider real desde CI.
- No guardar ni loggear prompts completos, input payloads, raw outputs o secrets.
- No materializar entidades de dominio.
- No reabrir ADR-AI-003, ADR-AI-004 ni decisión PO 8.1 #9.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. La lógica vive en `ai-assistance` en Application/Infrastructure según responsabilidades:

- Application orquesta `AIExecutionService` y decide fallback eligibility.
- Infrastructure contiene adapters concretos.
- Composition root/factory resuelve providers por `LLM_PROVIDER`.
- Application no debe importar SDKs externos ni depender de `OpenAIProvider` concreto salvo por interfaces/factories aprobados.

### Frontend Architecture

No aplica. No hay rutas, componentes ni estados UI nuevos.

### Database Architecture

No aplica directamente. US-123 no crea migraciones ni escribe DB. Debe producir metadata consumible por US-122 para campos como `fallback_used`, `timeout_ms`, `provider`, `latency_ms`, `correlation_id` y `error_code`.

### API Architecture

No aplica. No se crean endpoints REST. Los endpoints AI futuros mapearán errores controlados generados por esta capa.

### AI / PromptOps Architecture

Aplica. Usa `LLMProvider` como port, `MockAIProvider` para demo/test/fallback, `OpenAIProvider` como provider funcional principal y `AnthropicProvider` sólo como stub. Preserva HITL, PromptOps metadata y no decide ni materializa datos.

### Security Architecture

Aplica. La capa no debe exponer endpoint directo ni filtrar payloads en logs. Debe validar configuración insegura, especialmente `AI_LOG_PAYLOADS=true` en demo/production y fallback silencioso en producción.

### Testing Architecture

Aplica. Tests con Vitest/fake timers o clock injectable; integration tests con fake delayed provider; CI sin OpenAI, sin red y sin secrets. Security tests deben verificar safe logs.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 AI calls enforce a 60,000 ms timeout | Envolver cada call al provider con timeout configurable default `60000`; cancelar o ignorar resultado tardío. | Application, AI Platform |
| AC-02 Fallback to MockAIProvider only in demo/test fallback modes | Evaluar flags `AI_DEMO_MODE`/`AI_USE_MOCK_FALLBACK`; invocar mock como fallback sólo si procede. | Application, Config, AI |
| AC-03 Fallback is not silent in production-academic | Si fallback está deshabilitado, retornar error controlado y no llamar a mock. | Application, Config, Security |
| AC-04 LLM_PROVIDER=mock remains deterministic primary mode | Resolver `MockAIProvider` como provider primario y marcar `fallbackUsed=false`. | Config, Provider Selection |
| AC-05 AnthropicProvider is never used as fallback in MVP | Bloquear `anthropic` como fallback target; mantener stub behavior si se selecciona por config. | Application, AI |
| AC-06 Timeout/fallback metadata available for persistence | Normalizar metadata de ejecución para US-122/downstream use cases. | Application, Observability |
| AC-07 Bootstrap/config validation prevents unsafe settings | Validar env vars y environment profile antes de aceptar runtime. | Config, DevOps, Security |
| AC-08 Timeout/fallback events observable without sensitive payloads | Logs estructurados con metadata segura y sin raw payloads. | Observability, Security |
| AC-09 Tests verify behavior deterministically | Suites con fake timers/provider fake/mock, sin llamadas reales. | QA, CI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo principal:

- `ai-assistance`

Folders probables:

- `src/modules/ai-assistance/application/services/ai-execution.service.ts`
- `src/modules/ai-assistance/application/services/ai-timeout.service.ts`
- `src/modules/ai-assistance/application/services/fallback.service.ts`
- `src/modules/ai-assistance/application/config/ai-execution-config.ts`
- `src/modules/ai-assistance/application/errors/ai-execution-errors.ts`
- `src/modules/ai-assistance/application/types/ai-execution-result.ts`
- `src/modules/ai-assistance/infrastructure/providers/provider-factory.ts`
- `src/modules/ai-assistance/application/__tests__/ai-execution.service.spec.ts`

Usar nombres reales del código si ya existen por PB-P0-009.

### Use Cases / Application Services

Servicio recomendado:

- `AIExecutionService.execute(input, options?)`.

Responsabilidades:

- Recibir provider primario o resolverlo vía factory aprobada.
- Propagar `AIContext` y `correlationId`.
- Medir `latencyMs`.
- Aplicar timeout.
- Clasificar errores timeout/provider.
- Consultar `FallbackService` para determinar eligibility.
- Ejecutar `MockAIProvider` como fallback sólo si permitido.
- Retornar `AIExecutionResult<TOutput>` con metadata normalizada.

Servicios auxiliares:

- `AITimeoutService.withTimeout(...)`.
- `FallbackService.shouldFallback(error, config, context)`.
- `AIExecutionConfigValidator.validate(...)`.

### Controllers / Routes

No aplica. Ningún controller o route nuevo debe crearse en US-123.

### DTOs / Schemas

No hay DTO HTTP. Tipos internos sugeridos:

- `AIExecutionInput<TInput>`.
- `AIExecutionResult<TOutput>`.
- `AIExecutionMetadata`.
- `AIExecutionConfig`.
- `AIProviderId = "openai" | "mock" | "anthropic"` si ya no existe.
- `AIExecutionErrorCode`.

Metadata mínima:

- `provider`.
- `originalProvider?`.
- `fallbackUsed`.
- `fallbackReason?`.
- `timeoutMs`.
- `latencyMs`.
- `originalErrorCode?`.
- `correlationId?`.
- `status` o error classification.

Config esperada:

- `LLM_PROVIDER`.
- `AI_TIMEOUT_MS`.
- `AI_DEMO_MODE`.
- `AI_USE_MOCK_FALLBACK`.
- `AI_LOG_PAYLOADS`.
- Environment name/profile si existe.

### Repository / Persistence

No aplica. US-123 no escribe DB. Debe retornar metadata para que US-122 o use cases posteriores persistan `AIRecommendation`.

### Validation Rules

- `AI_TIMEOUT_MS` requerido o default `60000`; debe ser entero positivo.
- `LLM_PROVIDER` debe ser valor soportado por provider factory.
- `LLM_PROVIDER=mock` significa provider primario mock y `fallbackUsed=false`.
- `AI_USE_MOCK_FALLBACK=true` sólo habilita fallback a `MockAIProvider`.
- `AnthropicProvider` no puede ser fallback target.
- `AI_LOG_PAYLOADS=true` debe fallar en `demo-academic` y `production-academic`.
- `production-academic` debe operar con fallback deshabilitado.
- No inferir fallback desde output; debe venir de path explícito de ejecución.

### Error Handling

Errores tipados o diferenciables por code:

- `AIProviderTimeoutError` / `AI_PROVIDER_TIMEOUT`.
- `AIProviderUnavailableError` / `AI_PROVIDER_UNAVAILABLE`.
- `AIProviderNotConfiguredError` / `AI_PROVIDER_NOT_CONFIGURED`.
- `AIFallbackNotAllowedError` / `AI_FALLBACK_NOT_ALLOWED`.
- `AIFallbackFailedError` / `AI_FALLBACK_FAILED`.
- `AIInvalidConfigError` / `AI_CONFIG_INVALID`.

No incluir:

- prompt completo.
- input payload completo.
- raw provider output.
- stack trace público.
- secrets o tokens.

### Transactions

No aplica. No hay escritura transaccional. La metadata resultante debe ser compatible con transacciones futuras donde un use case persista `AIRecommendation` vía US-122.

### Observability

Eventos sugeridos:

- `ai.provider.timeout`.
- `ai.provider.failure`.
- `ai.fallback_used`.
- `ai.fallback_failed`.
- `ai.config.invalid`.

Campos permitidos:

- `featureType`.
- `provider`.
- `originalProvider`.
- `fallbackUsed`.
- `fallbackReason`.
- `timeoutMs`.
- `latencyMs`.
- `errorCode`.
- `correlationId`.

Campos prohibidos:

- full prompt.
- full input payload.
- raw provider output.
- secrets.
- tokens.
- cookies.
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

No aplica. Los endpoints/features posteriores mapearán errores controlados a UI.

### Accessibility

No aplica.

### i18n

No aplica. Debe preservar `languageCode` dentro de metadata/context si viene del upstream, pero no introduce copy.

---

## 9. API Contract Design

No aplica.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| N/A | N/A | US-123 no crea endpoint REST | N/A | N/A | N/A | N/A |

---

## 10. Database / Prisma Design

No aplica directamente.

### Models Impacted

- Ningún modelo se modifica en US-123.
- Downstream: `AIRecommendation` consumirá metadata `provider`, `fallback_used`, `timeout_ms`, `latency_ms`, `correlation_id`, `error_code`.

### Fields / Columns

No se agregan campos.

### Relations

No aplica.

### Indexes

No aplica.

### Constraints

No aplica.

### Migrations Impact

No se esperan migraciones.

### Seed Impact

No crea seed DB. Debe soportar demo determinística con `MockAIProvider` y datos existentes.

---

## 11. AI / PromptOps Design

### AI Feature

Infraestructura transversal para ejecución IA confiable. No genera contenido por sí misma; envuelve llamadas realizadas por use cases AI futuros.

### Provider

Providers involucrados:

- `OpenAIProvider`: provider funcional principal.
- `MockAIProvider`: provider principal cuando `LLM_PROVIDER=mock`; fallback controlado cuando flags lo permiten.
- `AnthropicProvider`: stub no funcional; nunca fallback target.

### Prompt Version

US-123 no resuelve prompts. Debe preservar metadata/context recibido para que el resultado pueda asociarse al prompt version de US-121 y persistirse por US-122.

### Input Schema

No valida input feature-specific. Upstream use cases y US-124/feature schemas se encargan de validación. US-123 no debe ampliar payload ni loggear input.

### Output Schema

No valida output JSON. US-124 es responsable de parsing/strict Zod validation/retry. Si fallback produce output, ese output debe pasar por US-124 antes de ser exitoso.

### Human-in-the-loop

Toda salida, primaria o fallback, sigue siendo sugerencia IA. No se materializa dominio. Downstream debe persistir `AIRecommendation` en estado pending y requerir acción humana.

### Fallback

Reglas:

- Fallback permitido si `AI_DEMO_MODE=true` o `AI_USE_MOCK_FALLBACK=true`.
- Fallback target único: `MockAIProvider`.
- `LLM_PROVIDER=mock` no cuenta como fallback.
- Fallback deshabilitado produce error controlado.
- Si `MockAIProvider` falla, retornar `AI_FALLBACK_FAILED`; no intentar otro fallback.
- No loops.

### Persistence

No persiste. Debe retornar metadata para US-122:

- `fallbackUsed`.
- `timeoutMs`.
- `latencyMs`.
- `provider`.
- `originalProvider`.
- `originalErrorCode`.
- `correlationId`.

### Safety Rules

- No loggear prompts, payloads o raw outputs.
- No fallback silencioso en producción.
- No Anthropic fallback.
- No autónomo ni materialización.
- No provider real en CI.

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente. No hay endpoint. Upstream use cases autentican antes de invocar IA.

### Authorization

No aplica directamente. Upstream aplica RBAC, ownership y rate limiting. US-123 no debe introducir bypass.

### Ownership Rules

No aplica directamente. Debe preservar `correlationId` y metadata contextual sin decidir ownership.

### Role Rules

No aplica directamente.

### Negative Authorization Scenarios

- Frontend intenta activar fallback directamente: no hay endpoint.
- Usuario no autorizado solicita IA sobre recurso ajeno: upstream rechaza antes de US-123.
- Producción intenta fallback silencioso: config/behavior devuelve error controlado y no llama mock.

### Audit Requirements

No crea `AdminAction`. Observabilidad y `AIRecommendation` downstream sirven como audit trail IA. La metadata debe permitir auditar si hubo fallback y por qué.

### Sensitive Data Handling

- `AI_LOG_PAYLOADS=true` prohibido en demo/production.
- Logs y errores no incluyen prompts, payloads, raw outputs, secrets, tokens, cookies o PII.
- Config validation no debe imprimir valores secretos.

---

## 13. Testing Strategy

### Unit Tests

- `AITimeoutService` resuelve antes del timeout.
- `AITimeoutService` produce timeout controlado al exceder `AI_TIMEOUT_MS`.
- `FallbackService` permite fallback sólo con flags correctos.
- `FallbackService` rechaza fallback en production/no flags.
- `LLM_PROVIDER=mock` se trata como provider primario con `fallbackUsed=false`.
- `AnthropicProvider` no se selecciona como fallback.
- Config validator rechaza timeout inválido, provider inválido y `AI_LOG_PAYLOADS=true` en demo/production.

### Integration Tests

- Fake provider delayed > timeout devuelve `AI_PROVIDER_TIMEOUT` cuando fallback disabled.
- Fake provider delayed > timeout invoca `MockAIProvider` cuando fallback enabled.
- Provider failure antes del timeout sigue reglas de fallback.
- Mock fallback failure devuelve error controlado sin loop.
- Metadata final contiene provider/fallback/latency/timeout/correlation.

### API Tests

No aplica para US-123. API tests de endpoints AI consumidores vendrán en historias feature-specific.

### E2E Tests

No aplica directamente. Demo E2E posterior debe validar que fallback no rompe demo y que UI muestra metadata si corresponde.

### Security Tests

- Logs de timeout/fallback no incluyen prompt/input/raw output.
- Error público no incluye secret/config values.
- `AI_LOG_PAYLOADS=true` en demo/production falla bootstrap.
- No hay endpoint nuevo para activar fallback.

### Accessibility Tests

No aplica.

### AI Tests

- `MockAIProvider` fallback es determinístico.
- CI usa `LLM_PROVIDER=mock` sin OpenAI secrets.
- `provider='mock'` y `fallbackUsed=true` sólo en fallback real.
- `provider='mock'` y `fallbackUsed=false` cuando mock es provider primario.

### Seed / Demo Tests

- `demo-academic`: `LLM_PROVIDER=openai`, `AI_DEMO_MODE=true`, `AI_USE_MOCK_FALLBACK=true`, `AI_LOG_PAYLOADS=false`.
- `test`: `LLM_PROVIDER=mock`, `AI_DEMO_MODE=true`, `AI_USE_MOCK_FALLBACK=false`, sin red.
- Demo fallback usa fixtures determinísticas compatibles con seed.

### CI Checks

- No llamadas reales a OpenAI.
- No requirement de `OPENAI_API_KEY` cuando `LLM_PROVIDER=mock`.
- Fake timers evitan esperar 60s reales.
- Security log assertions.

---

## 14. Observability & Audit

### Logs

Logs estructurados con eventos:

- `ai.provider.timeout`.
- `ai.provider.failure`.
- `ai.fallback_used`.
- `ai.fallback_failed`.
- `ai.config.invalid`.

### Correlation ID

Debe propagarse desde `AIContext` si está disponible. Si falta, upstream middleware/use case debe generarlo en historias consumidoras. US-123 debe preservarlo.

### AdminAction

No aplica.

### Error Tracking

Clasificar errores por:

- timeout.
- provider unavailable.
- provider not configured.
- fallback not allowed.
- fallback failed.
- invalid config.

### Metrics

Opcionales MVP, recomendadas si existe infraestructura:

- `ai_timeout_total{feature_type,provider}`.
- `ai_fallback_total{feature_type,reason}`.
- `ai_provider_failure_total{provider,error_code}`.
- `ai_execution_latency_ms{provider,fallback_used}`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No requiere seed nuevo.

### Demo Scenario Supported

Sí. US-123 soporta:

- Demo preferida con `OpenAIProvider` primario y fallback a `MockAIProvider`.
- Demo offline-only con `LLM_PROVIDER=mock`.
- CI/test determinístico sin red.

### Reset / Isolation Notes

No impacta reset DB. Tests deben aislar config/env por suite para evitar contaminación entre modes.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `docs/7-AI-Features-Specification.md` y algunas secciones de `docs/10-Non-Functional-Requirements.md` | Algunas referencias mencionan fallback a plantilla estática después de timeout o JSON inválido. | US-123 sigue PB-P0-011, ADR-AI-003 y docs/17: fallback controlado a `MockAIProvider` bajo flags; JSON invalid/retry pertenece a US-124. | Mantener `MockAIProvider` como fallback técnico de US-123; si se desea plantilla estática, tratarla como decisión documental futura, no parte de esta historia. | No |
| `docs/9-Functional-Requirements-Document.md` | Algunas secciones antiguas usan `AI_FALLBACK_ENABLED` como nombre genérico. | US-123 usa `AI_DEMO_MODE` y `AI_USE_MOCK_FALLBACK`, alineado con docs/17/21 y la historia aprobada. | Mapear aliases antiguos sólo si existen en config legacy; preferir nombres formalizados. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Timeout test espera 60s reales | CI lento/inestable | Fake timers, injectable clock o timeout override en tests |
| Fallback silencioso en producción | Riesgo de calidad/auditoría | Config validation + tests production-academic |
| Fallback a Anthropic por error | Scope creep y contradicción ADR-AI-004 | Allowlist de fallback target sólo `mock` |
| Metadata incompleta para US-122 | Trazabilidad incompleta | Definir `AIExecutionMetadata` y tests de mapping |
| Logs filtran prompt/output | Riesgo seguridad/privacidad | Safe logger + security tests |
| Provider tardío resuelve después de timeout | Side effects o doble respuesta | Cancel/AbortController si provider soporta; si no, ignorar resultado tardío |
| Mock diverge del output real | Demo/test engañoso | Contract tests de Mock contra schemas en US-124 |
| Config env difiere entre docs y runtime | Error operacional | Config schema y `.env.example` alineados |

---

## 18. Implementation Guidance for Coding Agents

- Revisar US-117 a US-120 antes de implementar; no redefinir `LLMProvider`.
- Usar servicios internos en `ai-assistance`; no crear endpoints.
- Implementar primero config validation y tipos de metadata.
- Implementar después timeout wrapper con fake timers testeables.
- Implementar `FallbackService` con allowlist explícita de `MockAIProvider`.
- Asegurar que `LLM_PROVIDER=mock` no marque `fallbackUsed=true`.
- Propagar `correlationId`.
- Usar `AbortController` si el provider adapter lo soporta; si no, ignorar resultados tardíos.
- Mantener errores tipados y seguros.
- No validar JSON ni reintentar invalid output en esta historia.
- No persistir `AIRecommendation`.
- No llamar OpenAI en CI.
- No reabrir ADR-AI-003/004 ni decisión PO 8.1 #9.

---

## 19. Task Generation Notes

Suggested task groups:

- Product / Analysis:
  - Confirmar environment matrix y nombres definitivos de flags.
- Backend:
  - Definir `AIExecutionMetadata`.
  - Implementar config validator.
  - Implementar timeout wrapper.
  - Implementar fallback eligibility.
  - Integrar provider factory.
  - Implementar errores tipados.
- AI / PromptOps:
  - Validar uso correcto de `MockAIProvider`.
  - Confirmar no fallback a Anthropic.
- Security:
  - Safe logs.
  - Validar `AI_LOG_PAYLOADS=false` en demo/production.
- QA:
  - Fake timers.
  - Fallback enabled/disabled.
  - Mock primary vs fallback.
  - Config invalid.
  - No network in CI.
- DevOps:
  - `.env.example` y config schema.
  - Mode matrix.
- Observability:
  - Logs y métricas opcionales.
- Documentation:
  - Notas de alignment sobre plantilla estática y env var legacy.

Required dependencies:

- Tipos/provider contract de PB-P0-009 antes de wiring.
- Metadata persistence contract de US-122 para shape final.
- US-124 después para validar outputs, incluyendo fallback output.

Parent backlog consolidated tasks:

- Sí. PB-P0-011 debería consolidar US-123 y US-124 después de ambas specs para cubrir timeout/fallback + validation/retry end-to-end.

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
| DB impact clear | N/A |
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

US-123 está técnicamente lista. La implementación debe enfocarse en timeout controlado, fallback elegible sólo a `MockAIProvider`, validación segura de configuración, metadata de ejecución, logs seguros y pruebas determinísticas, sin crear endpoints, UI, persistencia, JSON retry ni nuevos providers.
