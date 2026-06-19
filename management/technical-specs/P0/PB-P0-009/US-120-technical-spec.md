# Technical Specification — US-120: Crear AnthropicProvider stub no funcional

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-120 |
| Source User Story | `management/user-stories/US-120-anthropic-provider-stub.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usa `PO/BA Decisions Applied` de la User Story aprobada |
| Priority | P0 |
| Backlog ID | PB-P0-009 |
| Backlog Title | LLMProvider Port + Adapters (OpenAI + Mock + Anthropic Stub) |
| Backlog Execution Order | 9 |
| User Story Position in Backlog Item | 4 of 4 |
| Related User Stories in Backlog Item | US-117, US-118, US-119, US-120 |
| Epic | EPIC-AI-001 |
| Backlog Item Dependencies | PB-P0-002 |
| Feature | AnthropicProvider stub |
| Module / Domain | AI Assistance / Platform |
| User Story Status | Approved |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-16 |
| Last Updated | 2026-06-16 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-009 implementa el puerto `LLMProvider` y los adapters base. US-120 entrega el último adapter del backlog item: `AnthropicProvider` como stub no funcional, requerido para validar sustituibilidad sin introducir Anthropic funcional en el MVP.

### Execution Order Rationale

US-120 debe ejecutarse después de US-117 porque depende del contrato `LLMProvider` y sus errores tipados. Puede implementarse después de US-118/US-119 para reutilizar patrones de provider tests, pero no depende de OpenAI ni Mock para ser funcional como stub.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-117 | Define el puerto `LLMProvider` y tipos/errores compartidos | 1 |
| US-118 | Implementa `OpenAIProvider` funcional principal | 2 |
| US-119 | Implementa `MockAIProvider` determinista para CI/demo/testing | 3 |
| US-120 | Implementa `AnthropicProvider` stub no funcional | 4 |

---

## 3. Executive Technical Summary

Implementar `AnthropicProvider` como adapter Infrastructure que satisface `LLMProvider`, pero falla explícitamente en todos los métodos con un error tipado aprobado. El objetivo técnico es demostrar que el puerto soporta múltiples providers y que una selección accidental de `anthropic` produce un fallo controlado, sin SDK, sin secrets, sin red externa y sin comportamiento funcional.

Esta spec no implementa Anthropic API, no instala SDK, no agrega failover OpenAI -> Anthropic, no crea selector UI, no crea endpoints y no persiste `AIRecommendation`.

---

## 4. Scope Boundary

### In Scope

- Crear `AnthropicProvider` en Infrastructure.
- Implementar la interfaz `LLMProvider` definida por US-117.
- Hacer que cada método del provider falle explícitamente con `AIProviderNotConfiguredError`, `AINotImplementedError` o el error tipado equivalente aprobado.
- Incluir metadata segura de provider (`provider='anthropic'`) cuando el contrato/error lo permita.
- Garantizar que no se importa ni instala SDK Anthropic.
- Garantizar que no se requiere `ANTHROPIC_API_KEY`.
- Garantizar que no hay llamadas HTTP externas.
- Agregar tests de contrato, failure explícito, no SDK, no secrets y no network.
- Validar comportamiento seguro si `LLM_PROVIDER=anthropic` se resuelve en contexto de prueba/configuración.

### Out of Scope

- Integración funcional con Anthropic API.
- Instalar `@anthropic-ai/sdk` u otro SDK Anthropic.
- Leer o validar API keys Anthropic para operación funcional.
- Implementar failover OpenAI -> Anthropic.
- Implementar provider comparison, A/B testing o multi-provider routing.
- Crear selector dinámico de provider en UI.
- Crear prompts específicos para Anthropic.
- Persistir `AIRecommendation`.
- Crear endpoints IA.
- Crear UI o API client frontend.
- RAG, agents, tool calling o decisiones IA autónomas.

### Explicit Non-Goals

- No generar output IA real.
- No enviar payloads/prompts a servicios externos.
- No usar Anthropic en demo ni producción MVP.
- No usar Anthropic como fallback.
- No reabrir ADR-AI-004.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. `AnthropicProvider` vive en Infrastructure como adapter de `LLMProvider`. Application/use cases siguen dependiendo del puerto y nunca importan el stub directamente salvo wiring/composition root.

### Frontend Architecture

No aplica. No hay UI ni selector de provider.

### Database Architecture

No aplica. No hay migrations, models ni writes.

### API Architecture

No aplica. No se crean endpoints.

### AI / PromptOps Architecture

Aplica de forma limitada. El stub implementa el puerto y falla explícitamente. No define prompts, no construye request a Anthropic y no produce outputs IA.

### Security Architecture

Aplica. El stub debe ser seguro por defecto: sin SDK, sin secrets, sin red, sin raw prompt logs y sin payload leakage.

### Testing Architecture

Aplica. Tests deben probar contract compliance y failure explícito. También deben proteger contra scope creep funcional.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Stub implements `LLMProvider` | Clase/module compila contra todos los métodos del puerto. | Backend, AI |
| AC-02 Stub fails explicitly on invocation | Cada método lanza/retorna error tipado not-configured/not-implemented con mensaje seguro. | Backend, AI, Error Handling |
| AC-03 No external Anthropic dependency | No dependency/import SDK, no API key, no client init, no outbound request. | Backend, Security, CI |
| AC-04 Selector/config guard explicit | Si composition root permite `anthropic`, sólo resuelve al stub que falla claramente. | Backend, Config |
| AC-05 No fallback ownership | Tests aseguran que Anthropic no es fallback target. | Backend, AI |
| AC-06 Safe observability | Logs/error metadata seguros con provider/error/correlationId, sin prompts/secrets. | Observability, Security |
| AC-07 Contract tests cover stub | Unit/type tests de contract compliance y failure behavior. | QA, CI |
| AC-08 Functional Anthropic remains Future | Guardrails/test/review bloquean API real, SDK, failover o UI selector. | Architecture, Scope |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo principal:

- `ai-assistance`

Folders probables:

- `src/modules/ai-assistance/infrastructure/providers/anthropic/anthropic-provider.ts`
- `src/modules/ai-assistance/infrastructure/providers/anthropic/__tests__/anthropic-provider.spec.ts`

Si el repo usa otra convención, mantener la regla: stub en Infrastructure, contrato en Application/Ports.

### Use Cases / Application Services

No se crean use cases. Futuros use cases no deben depender de `AnthropicProvider` concreto.

### Controllers / Routes

No aplica.

### DTOs / Schemas

Consumir los tipos de US-117:

- `LLMProvider`
- `AIContext`
- `AIResult<TOutput>`
- `ProviderId`
- errores tipados

No crear input/output DTO específicos de Anthropic.

### Repository / Persistence

No aplica.

### Validation Rules

- `AnthropicProvider` debe implementar todos los métodos requeridos por `LLMProvider`.
- Cada método debe fallar explícitamente.
- El error debe identificar que Anthropic no está configurado/implementado en MVP.
- No debe requerirse `ANTHROPIC_API_KEY`.
- No debe existir SDK Anthropic importado.
- No debe existir network call.

### Error Handling

Error recomendado:

- `AIProviderNotConfiguredError` con `provider='anthropic'`

Alternativa aceptable si US-117 define el tipo:

- `AINotImplementedError` con `provider='anthropic'`

El error no debe incluir:

- raw prompt.
- payload completo.
- stack trace público.
- secrets.
- instrucciones para configurar Anthropic funcional en MVP.

### Transactions

No aplica.

### Observability

Cuando se invoque accidentalmente:

- Log `warn` seguro con `provider=anthropic`, `error_code`, `correlation_id?`.
- No loggear prompts, payloads completos, secrets ni PII.

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

No aplica. No hay UI ni output IA.

---

## 9. API Contract Design

No aplica.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| N/A | N/A | US-120 no crea endpoint REST | N/A | N/A | N/A | N/A |

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

No aplica.

---

## 11. AI / PromptOps Design

### AI Feature

Provider infrastructure only.

### Provider

`AnthropicProvider` stub, `provider='anthropic'`.

### Prompt Version

No aplica. El stub puede recibir `AIContext.promptVersionId`, pero no lo usa para generar output.

### Input Schema

Puede recibir los mismos inputs del contrato `LLMProvider`, pero no debe transformarlos ni enviarlos a terceros.

### Output Schema

No produce output IA. Siempre falla explícitamente.

### Human-in-the-loop

No aplica. No crea sugerencias.

### Fallback

No participa en fallback. Anthropic no puede ser fallback target en MVP.

### Persistence

No aplica. No crea `AIRecommendation`.

### Safety Rules

- Sin SDK Anthropic.
- Sin Anthropic secrets.
- Sin red externa.
- Sin raw prompt logs.
- Sin Anthropic funcional.
- Sin failover OpenAI -> Anthropic.

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente.

### Authorization

No aplica directamente. Upstream use cases ejecutan auth/ownership/rate limit antes de llamar IA.

### Ownership Rules

No aplica.

### Role Rules

No aplica.

### Negative Authorization Scenarios

- Frontend intenta seleccionar Anthropic -> no existe UI/surface.
- Use case invoca Anthropic antes de auth -> bug del use case/controller, no del provider.

### Audit Requirements

El stub debe aportar metadata segura cuando falle:

- `provider='anthropic'`
- `error_code`
- `correlationId?`

No crea `AdminAction`.

### Sensitive Data Handling

- No secrets.
- No prompt/payload leakage.
- No logs de tokens/cookies.
- No dependencia de `ANTHROPIC_API_KEY`.

---

## 13. Testing Strategy

### Unit Tests

- `AnthropicProvider` implementa `LLMProvider`.
- Cada método del puerto falla con error tipado aprobado.
- Error incluye provider `anthropic` o metadata equivalente segura.
- No requiere `ANTHROPIC_API_KEY`.

### Integration Tests

- Opcional: composition root/config test para `LLM_PROVIDER=anthropic` si el selector existe en este momento.
- Debe resolver al stub o fallar fast de forma clara, nunca a provider funcional.

### API Tests

No aplica.

### E2E Tests

No aplica.

### Security Tests

- No import/dependency de Anthropic SDK.
- No network calls.
- Logs de stub no incluyen raw prompt, payload sensible ni secrets.
- No Anthropic API key requerida en CI.

### Accessibility Tests

No aplica.

### AI Tests

- Stub recibe input válido y falla explícitamente.
- Stub no produce `AIResult` exitoso.
- Anthropic no es fallback target.

### Seed / Demo Tests

No aplica. Anthropic no se usa en demo MVP.

### CI Checks

- Type check.
- Unit tests.
- Import/dependency guard si el tooling lo permite.
- Network guard si el test harness lo permite.

---

## 14. Observability & Audit

### Logs

Log seguro sólo si se invoca/resuelve accidentalmente. Nivel sugerido: `warn`.

### Correlation ID

Usar `AIContext.correlationId` si la invocación lo provee.

### AdminAction

No aplica.

### Error Tracking

Clasificar como provider not configured/not implemented para análisis operativo.

### Metrics

No obligatorio. Si existe métrica de provider errors, puede registrar:

- `ai_provider_error_total{provider=anthropic,error_code=AI_PROVIDER_NOT_CONFIGURED}`

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No aplica.

### Demo Scenario Supported

No aplica. Anthropic no se usa en demo MVP. La demo usa OpenAI y/o Mock.

### Reset / Isolation Notes

No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `docs/9-Functional-Requirements-Document.md` FR-AI-016 | Lista selector runtime con `openai | mock`, mientras ADR-AI-001/PB-P0-009 incluyen `anthropic` como stub. | US-120 permite `anthropic` sólo como stub que falla explícitamente, sin operación funcional. | Mantener documentado que Anthropic funcional es Future y que no hay UI selector. | No |
| `docs/7-AI-Features-Specification.md` | Describe Anthropic como future/opcional stub. | US-120 implementa stub no funcional para completar PB-P0-009. | Sin acción adicional; la historia está alineada. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Stub se convierte accidentalmente en provider funcional | Scope creep y violación de ADR-AI-004 | Tests/no SDK/no network/no secrets; review explícito |
| `LLM_PROVIDER=anthropic` rompe bootstrap sin mensaje claro | Mala DX y debugging lento | Error tipado claro o fail-fast controlado |
| Anthropic usado como fallback | Viola MVP y confunde trazabilidad | Test que Anthropic no es fallback target |
| SDK Anthropic agregado por error | Aumenta superficie de seguridad y dependencia innecesaria | Import/dependency guard |
| Logs exponen prompts recibidos por el stub | Riesgo privacidad | Safe logging y tests de logs |
| Error no implementado se mapea como crash genérico | Mala observabilidad | Error tipado aprobado del contrato |

---

## 18. Implementation Guidance for Coding Agents

- Revisar primero el contrato de US-117.
- Implementar `AnthropicProvider` en Infrastructure, no en Application.
- Hacer que todos los métodos requeridos por `LLMProvider` llamen una función interna común que lance el error tipado aprobado.
- Usar `provider='anthropic'` en metadata segura cuando aplique.
- No instalar ni importar SDK Anthropic.
- No leer `ANTHROPIC_API_KEY`.
- No hacer HTTP requests.
- No crear prompts, endpoints, UI, persistence ni fallback logic.
- Si el composition root ya existe, permitir `LLM_PROVIDER=anthropic` sólo para resolver al stub que falla explícitamente, no para funcionalidad.
- Preservar ADR-AI-004.

---

## 19. Task Generation Notes

Suggested task groups:

- Backend stub:
  - Crear `AnthropicProvider`.
  - Implementar todos los métodos requeridos por `LLMProvider`.
  - Crear helper interno de typed error.
  - Agregar metadata segura del provider.

- QA:
  - Contract tests.
  - Explicit failure tests.
  - No SDK/no network/no secrets tests.
  - Optional config test para `LLM_PROVIDER=anthropic`.

- Security:
  - Import/dependency guard.
  - Safe logging assertions.

- Documentation:
  - Documentar que Anthropic funcional es Future.
  - Documentar que no hay failover a Anthropic.

Required seed/demo tasks:

- No aplica.

Dependencies between tasks:

- US-117 contract antes del stub.
- Error type aprobado antes de implementar provider.
- Tests de contract compliance antes de config guard.

Parent backlog consolidated tasks:

- Sí. PB-P0-009 debe consolidar US-117..US-120 y luego validar provider selection/config con los tres adapters.

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

US-120 está aprobada, mapeada a PB-P0-009 y lista para desglose. La implementación debe limitarse a un `AnthropicProvider` stub que implementa `LLMProvider`, falla explícitamente con error tipado, no usa SDK/secrets/red y no participa en fallback ni en funcionalidad Anthropic real.
