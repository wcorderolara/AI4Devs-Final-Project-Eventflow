# Technical Specification — US-119: Implementar MockAIProvider determinista

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-119 |
| Source User Story | `management/user-stories/US-119-mock-ai-provider.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usa `PO/BA Decisions Applied` de la User Story aprobada |
| Priority | P0 |
| Backlog ID | PB-P0-009 |
| Backlog Title | LLMProvider Port + Adapters (OpenAI + Mock + Anthropic Stub) |
| Backlog Execution Order | 9 |
| User Story Position in Backlog Item | 3 of 4 |
| Related User Stories in Backlog Item | US-117, US-118, US-119, US-120 |
| Epic | EPIC-AI-001 |
| Backlog Item Dependencies | PB-P0-002 |
| Feature | MockAIProvider determinista |
| Module / Domain | AI Assistance / Platform / QA |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-16 |
| Last Updated | 2026-06-16 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-009 implementa el puerto `LLMProvider` y sus adapters base. US-119 entrega `MockAIProvider`, el adapter determinista requerido para CI, desarrollo local, demo offline y soporte técnico a fallback controlado.

### Execution Order Rationale

US-119 debe ejecutarse después de US-117 porque depende del contrato `LLMProvider`, `AIContext`, `AIResult<TOutput>`, `ProviderId`, `LanguageCode` y errores tipados. Puede implementarse después o en paralelo controlado con US-118 si el contrato ya está estable, pero debe mantener schema compatibility con el adapter OpenAI.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-117 | Define el puerto `LLMProvider` y tipos/errores compartidos | 1 |
| US-118 | Implementa `OpenAIProvider` funcional principal | 2 |
| US-119 | Implementa `MockAIProvider` determinista para CI/demo/testing | 3 |
| US-120 | Implementa `AnthropicProvider` stub no funcional | 4 |

---

## 3. Executive Technical Summary

Implementar `MockAIProvider` como adapter Infrastructure que cumple `LLMProvider` y retorna outputs deterministas, schema-compatible y seguros sin usar red externa ni secrets. El provider debe resolver fixtures por dimensiones estables: feature, language, prompt version, scenario seed y, cuando aplique, event type o vendor profile.

El adapter debe soportar ejecución directa cuando `LLM_PROVIDER=mock`, pruebas automatizadas sin OpenAI, demo offline y uso posterior por un fallback service. Sin embargo, US-119 no implementa fallback orchestration ni persistencia; sólo entrega el provider que puede ser invocado por esas capas.

---

## 4. Scope Boundary

### In Scope

- Crear `MockAIProvider` en Infrastructure.
- Implementar el contrato `LLMProvider` definido por US-117.
- Crear fixture registry y lookup determinístico.
- Usar claves de fixture con `feature`, `language_code`, `prompt_version_id`, `scenario_seed` y matchers opcionales como `event_type_code` o `vendor_profile_id`.
- Retornar `AIResult<TOutput>` con `provider='mock'`.
- Retornar `fallbackUsed=false` en llamadas directas de mock.
- Devolver generic deterministic output cuando no haya fixture exacta.
- Validar fixtures y generic outputs contra schemas/DTOs esperados.
- Emitir warnings seguros ante missing fixture.
- Agregar tests de determinismo, schema compatibility, no network y no secrets.

### Out of Scope

- Implementar `LLMProvider`; cubierto por US-117.
- Implementar `OpenAIProvider`; cubierto por US-118.
- Implementar `AnthropicProvider`; cubierto por US-120.
- Implementar selector runtime completo por `LLM_PROVIDER`.
- Implementar fallback service, retry, timeout orchestration o fallback attribution; cubierto por PB-P0-011.
- Persistir `AIRecommendation`, `AIPromptVersion` o seed DB; cubierto por PB-P0-010/seed workflow.
- Crear endpoints REST IA.
- Crear UI o API client frontend.
- Implementar RAG, agents, tool calling o decisiones IA autónomas.

### Explicit Non-Goals

- No hacer llamadas reales a OpenAI, Anthropic ni otros providers.
- No requerir `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` ni secrets.
- No convertir mock en default productivo fuera de configs test/demo aprobadas.
- No loggear raw prompts, secrets ni PII real.
- No materializar entidades de dominio ni aplicar recomendaciones.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. `MockAIProvider` vive en Infrastructure como adapter de `LLMProvider`. Application/use cases dependen del puerto, no del mock concreto.

### Frontend Architecture

No aplica. No hay rutas, componentes ni UI. El frontend no llama providers.

### Database Architecture

No aplica para US-119. El provider usa fixtures estáticas o módulos de test, no DB. Seed persistente y `AIRecommendation` pertenecen a otros backlogs.

### API Architecture

No aplica. No se crean endpoints.

### AI / PromptOps Architecture

Aplica. `MockAIProvider` debe usar la misma forma de output y schemas que `OpenAIProvider`, con outputs deterministas por feature/locale/seed/prompt version. El fixture registry debe ser revisable y apto para PromptOps/testing.

### Security Architecture

Aplica. El provider no usa secrets, red externa ni datos reales. Los logs deben ser estructurados y seguros.

### Testing Architecture

Aplica. `MockAIProvider` es requisito para CI y pruebas determinísticas. Sus propios tests deben confirmar determinismo, schema compatibility y ausencia de red/secrets.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Implements `LLMProvider` | `MockAIProvider` compila contra el contrato de US-117 y cubre métodos MVP. | Backend, AI |
| AC-02 Deterministic fixture selection | Misma entrada/contexto retorna deep-equal output sin randomness ni tiempo real. | Backend, AI, QA |
| AC-03 Fixture key dimensions explicit | Crear fixture key builder con feature/language/promptVersion/scenarioSeed y matchers de dominio. | Backend, AI, PromptOps |
| AC-04 Supported language behavior stable | Resolver fixture por idioma aprobado o generic fallback estable con estrategia segura. | Backend, AI, i18n |
| AC-05 Missing fixture does not break demo/CI | Generic deterministic output + warn seguro cuando no hay match exacto. | Backend, QA, Observability |
| AC-06 No external provider dependency | No SDK, no network, no secrets; CI pasa sin OpenAI/Anthropic. | Backend, Security, CI |
| AC-07 Schema compatibility verified | Fixtures y generic outputs validan contra schemas/DTOs compartidos. | Backend, AI, QA |
| AC-08 Fallback ownership separate | Direct mock returns `provider='mock'`; fallback attribution la decide PB-P0-011. | Backend, AI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo principal:

- `ai-assistance`

Folders probables:

- `src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.ts`
- `src/modules/ai-assistance/infrastructure/providers/mock/mock-fixture-registry.ts`
- `src/modules/ai-assistance/infrastructure/providers/mock/mock-fixture-key.ts`
- `src/modules/ai-assistance/infrastructure/providers/mock/fixtures/<feature>/`
- `src/modules/ai-assistance/infrastructure/providers/mock/__tests__/mock-ai-provider.spec.ts`

### Use Cases / Application Services

No se crean use cases. Futuros use cases invocan `LLMProvider`; composition root puede inyectar `MockAIProvider` cuando la configuración lo indique.

### Controllers / Routes

No aplica.

### DTOs / Schemas

Consumir los tipos de US-117:

- `LLMProvider`
- `AIContext`
- `AIResult<TOutput>`
- `LanguageCode`
- `ProviderId`
- errores tipados

Diseñar tipos internos:

- `MockFixtureKey`
- `MockFixture<TInput, TOutput>`
- `MockFixtureMatcher`
- `MockFixtureRegistry`

Fixture key mínima:

- `feature`
- `languageCode`
- `promptVersionId`
- `scenarioSeed`
- `eventTypeCode?`
- `vendorProfileId?`

### Repository / Persistence

No aplica. No usar Prisma ni DB.

### Validation Rules

- Input debe contener feature/contexto suficiente según el método del puerto.
- `languageCode` debe estar dentro de idiomas aprobados.
- Fixture output debe pasar schema/DTO validation.
- Generic output también debe pasar schema/DTO validation.
- Missing fixture no debe lanzar error si el input es válido.
- Unsupported feature/language debe producir error tipado o validation error según contrato.

### Error Handling

- Unsupported feature -> error tipado del provider/validation contract.
- Unsupported language -> error tipado del provider/validation contract.
- Invalid fixture schema -> debe fallar tests; en runtime puede lanzar `AIInvalidOutputError`.
- Missing exact fixture -> generic deterministic output + safe warn.

### Transactions

No aplica.

### Observability

Logs seguros:

- `ai.mock.fixture_missing` como warn.
- `ai.request.success` o equivalente con `provider=mock`.
- Campos permitidos: feature, language, promptVersionId, scenarioSeed hash/id, correlationId.
- Campos prohibidos: raw prompt, secrets, provider keys, real PII, full payload sensible.

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

No aplica para UI. El provider debe respetar `languageCode` en fixture selection y outputs.

---

## 9. API Contract Design

No aplica.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| N/A | N/A | US-119 no crea endpoint REST | N/A | N/A | N/A | N/A |

---

## 10. Database / Prisma Design

No aplica.

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

No aplica directamente. Los outputs deben alinearse con seed/demo data, pero US-119 no crea seed DB ni `AIRecommendation`.

---

## 11. AI / PromptOps Design

### AI Feature

Provider infrastructure. El mock sirve a las features IA MVP a través del contrato `LLMProvider`.

### Provider

`MockAIProvider`, `provider='mock'`.

### Prompt Version

Fixture lookup debe considerar `promptVersionId`. Cambios de prompt version deben poder tener fixtures distintas.

### Input Schema

El input proviene de métodos de `LLMProvider` y `AIContext`. La clave de selección debe derivarse de input/contexto aprobado, no de prompts raw.

### Output Schema

Cada fixture y generic output debe ser compatible con el output DTO/schema de la feature. Cuando exista schema compartido, validarlo en tests y, si el diseño lo requiere, en runtime.

### Human-in-the-loop

No aplica dentro del provider. Downstream use cases preservan HITL.

### Fallback

No se implementa fallback orchestration. Si `MockAIProvider` es llamado directamente por `LLM_PROVIDER=mock`, retorna `fallbackUsed=false`. Si un fallback service lo invoca en PB-P0-011, esa capa podrá atribuir `fallbackUsed=true`.

### Persistence

No aplica. No persiste `AIRecommendation`.

### Safety Rules

- Fixture data ficticia, seed/demo only.
- No PII real.
- No secrets.
- No raw prompts en logs.
- No red externa.
- No decisiones autónomas.

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente.

### Authorization

No aplica directamente. Auth/ownership/rate limit ocurren antes de invocar `LLMProvider`.

### Ownership Rules

No aplica. `eventTypeCode`, `eventId` o `vendorProfileId` se usan sólo como dimensiones de selección, no para autorizar.

### Role Rules

No aplica.

### Negative Authorization Scenarios

- Frontend intenta llamar provider directamente -> no existe superficie.
- Use case invoca mock antes de auth/ownership -> bug del use case/controller, no del provider.

### Audit Requirements

El provider debe retornar metadata del contrato:

- `provider='mock'`
- `promptVersionId`
- `languageCode`
- `latencyMs`
- `fallbackUsed`

### Sensitive Data Handling

- No secrets ni provider API keys.
- Fixtures sin datos reales.
- Logs sin raw prompt/full payload sensible.
- CI sin `OPENAI_API_KEY`.

---

## 13. Testing Strategy

### Unit Tests

- `MockAIProvider` implementa `LLMProvider`.
- Mismo input/context retorna deep-equal output.
- Fixture exacta se resuelve correctamente.
- Missing fixture retorna generic deterministic output.
- Idioma aprobado selecciona fixture correcta.
- Unsupported language/feature produce error tipado o validation error.
- Invalid fixture schema falla test.

### Integration Tests

- Opcional: wiring local con composition root/fake selector si ya existe.
- No DB ni endpoints requeridos.

### API Tests

No aplica.

### E2E Tests

No aplica en US-119. E2E con IA mock pertenece a historias de use cases/endpoints.

### Security Tests

- No network call.
- No secrets requeridos.
- Logs de missing fixture no contienen prompts, secrets ni PII.
- No imports OpenAI/Anthropic SDK en mock provider.

### Accessibility Tests

No aplica.

### AI Tests

- Schema compatibility por feature.
- Fixture determinism por `feature/language/promptVersion/scenarioSeed`.
- `provider='mock'`.
- Direct call `fallbackUsed=false`.

### Seed / Demo Tests

- Verificar que fixture keys se alinean con scenario seed de docs/seed cuando esos fixtures existan.
- No crear seed DB en esta historia.

### CI Checks

- Type check.
- Unit tests de determinismo.
- Contract/schema tests.
- Network guard/no external provider calls.
- CI sin OpenAI/Anthropic secrets.

---

## 14. Observability & Audit

### Logs

Emitir logs seguros para:

- fixture missing.
- mock provider success/failure.

### Correlation ID

Usar `AIContext.correlationId` cuando esté disponible.

### AdminAction

No aplica.

### Error Tracking

Errores tipados deben permitir distinguir unsupported feature/language e invalid fixture/output.

### Metrics

No obligatorio en US-119, pero el diseño debe permitir métricas futuras:

- `ai_request_total{provider=mock}`
- `ai_provider_error_total{provider=mock,error_code}`
- `ai_mock_fixture_missing_total{feature,language}`

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No se crea seed DB. Sí se deben crear fixtures deterministas compatibles con los escenarios base de demo/testing.

### Demo Scenario Supported

Soporta demo offline-only con:

```env
LLM_PROVIDER=mock
AI_DEMO_MODE=true
AI_USE_MOCK_FALLBACK=false
```

También soporta uso posterior como fallback target bajo PB-P0-011.

### Reset / Isolation Notes

Fixtures deben ser estáticas, versionables y no mutar durante tests. Tests deben evitar dependencia de orden de ejecución.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `docs/11-Data-Seed-Strategy.md` | Describe `AIRecommendation` seed y persistencia asociada a MockAIProvider. | US-119 sólo implementa provider/fixtures; seed DB y persistencia quedan fuera. | Mantener fixtures alineadas con seed, sin crear DB seed en esta historia. | No |
| `docs/17-AI-Architecture-and-PromptOps-Design.md` | Describe fallback service y `fallbackUsed=true` cuando mock es invocado por fallback. | US-119 direct call usa `fallbackUsed=false`; PB-P0-011 atribuye fallback. | Documentar separación de responsabilidades y testear direct mock behavior. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Fixtures divergen de schemas reales | Tests pasan con outputs que OpenAI no podría producir | Validación compartida contra schemas/DTOs |
| Missing fixture rompe demo | Demo/CI inestable | Generic deterministic output + safe warn |
| Mock usa randomness o tiempo real | Flakiness | Prohibir `Math.random`, timestamps reales y dependencias de orden; deep-equal tests |
| Fixture contiene PII real | Riesgo privacidad | Revisión + fixtures ficticias + tests/lint si viable |
| Mock asume fallback ownership | Trazabilidad incorrecta | Direct calls `fallbackUsed=false`; fallback service decide en PB-P0-011 |
| Uso accidental de red | CI flaky y secretos requeridos | Network guard/no SDK imports/no provider secrets |
| Scope creep hacia PromptRegistry | Duplica PB-P0-010 | Mantener sólo fixture registry del mock |

---

## 18. Implementation Guidance for Coding Agents

- Revisar primero el contrato de US-117 y la spec US-117.
- Implementar `MockAIProvider` sólo en Infrastructure.
- Crear un fixture key builder testeado.
- Mantener fixtures en estructura clara por feature.
- Usar datos ficticios y alineados a seed/demo.
- Validar outputs contra schemas/DTOs disponibles.
- Usar generic deterministic output para missing fixture válido.
- No usar `Date.now`, `Math.random`, red externa ni SDKs.
- No implementar fallback orchestration.
- No crear `AIRecommendation`, migrations, endpoints o UI.
- No reabrir decisiones ADR-AI-003.

---

## 19. Task Generation Notes

Suggested task groups:

- Backend provider:
  - Crear `MockAIProvider`.
  - Crear fixture key builder.
  - Crear fixture registry/loader.
  - Crear generic deterministic output strategy.
  - Mapear outputs a `AIResult<TOutput>`.

- Fixtures / PromptOps:
  - Crear fixtures base por feature/language/seed.
  - Documentar dimensiones de lookup.
  - Validar fixtures contra schemas.

- QA:
  - Tests de determinismo.
  - Tests de exact match/missing fixture.
  - Tests de schema compatibility.
  - Tests de no network/no secrets.
  - Tests de safe logging.

- DevOps/config:
  - Asegurar `LLM_PROVIDER=mock` usable en test/CI.
  - Verificar CI sin OpenAI/Anthropic secrets.

Required seed/demo tasks:

- No DB seed; sólo fixture files versionables.

Dependencies between tasks:

- US-117 contract antes de provider.
- Fixture key builder antes de registry.
- Registry antes de provider tests.
- Schemas/DTOs antes de fixture validation si están disponibles.

Parent backlog consolidated tasks:

- Sí. PB-P0-009 debe consolidar US-117..US-120 y luego validar selection/config.

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

US-119 está aprobada, mapeada a PB-P0-009 y técnicamente lista para desglose. La implementación debe concentrarse en `MockAIProvider`, fixture lookup determinístico, outputs schema-compatible, no network/no secrets, safe logging y tests de determinismo, sin asumir fallback orchestration ni persistencia.
