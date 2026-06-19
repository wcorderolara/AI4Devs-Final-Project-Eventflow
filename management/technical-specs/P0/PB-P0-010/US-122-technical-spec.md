# Technical Specification — US-122: Persistir AIRecommendation con metadata completa

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-122 |
| Source User Story | `management/user-stories/US-122-persist-ai-recommendation.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usan `PO/BA Decisions Applied` de la User Story aprobada |
| Priority | P0 |
| Backlog ID | PB-P0-010 |
| Backlog Title | Prompt registry versionado + persistencia `AIRecommendation` |
| Backlog Execution Order | 10 |
| User Story Position in Backlog Item | 2 of 2 |
| Related User Stories in Backlog Item | US-121, US-122 |
| Epic | EPIC-AI-001 |
| Backlog Item Dependencies | PB-P0-001, PB-P0-009 |
| Feature | AIRecommendation persistence |
| Module / Domain | AI Assistance / Persistence |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-17 |
| Last Updated | 2026-06-17 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-010 entrega trazabilidad IA completa: US-121 resuelve prompt versions y metadata `AIPromptVersion`; US-122 persiste cada recomendación IA con metadata suficiente para HITL, auditoría, QA y demo.

### Execution Order Rationale

US-122 debe ejecutarse después de US-121 porque requiere `promptVersionId` válido y metadata de prompt. También depende de PB-P0-001 para schema/migraciones y PB-P0-009 para provider metadata. Esta historia desbloquea las features IA P1/P2 porque todas necesitan persistir `AIRecommendation` antes de exponer o materializar sugerencias.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-121 | Implementa `PromptRegistry` y metadata `AIPromptVersion` | 1 |
| US-122 | Implementa persistencia `AIRecommendation` con metadata completa | 2 |

---

## 3. Executive Technical Summary

Implementar la capacidad backend para persistir `AIRecommendation` desde resultados IA ya validados y metadata de ejecución. La solución debe incluir un port/repository de aplicación, una implementación Prisma, validación de input de persistencia, sanitización/minimización de payload, soporte a metadata de provider/fallback/latency/timeout/language/correlation, estado inicial HITL y logs seguros.

US-122 no invoca providers, no implementa fallback, no valida schemas de cada feature desde cero y no crea endpoints. Su responsabilidad es recibir datos ya validados por la capa de orquestación IA y persistirlos de forma consistente, segura y auditable.

---

## 4. Scope Boundary

### In Scope

- Crear `AIRecommendationRepository` port si no existe.
- Implementar `PrismaAIRecommendationRepository`.
- Crear `PersistAIRecommendationService` o helper de aplicación.
- Definir DTO/input interno para persistencia.
- Validar metadata requerida antes de insertar.
- Persistir `requestedByUserId`, `type`, context IDs aplicables, `promptVersionId`, `provider`, `languageCode`, `fallbackUsed`, `timeoutMs`, `latencyMs`, `correlationId`, `inputPayload`, `outputPayload` y status inicial.
- Sanitizar/minimizar `inputPayload`.
- Rechazar `outputPayload` no validado como success.
- Soportar failure metadata segura sólo si el schema real lo permite.
- Participar en transacciones cuando un use case futuro lo requiera.
- Agregar pruebas unitarias/integración/seguridad/CI.

### Out of Scope

- Implementar `PromptRegistry`; cubierto por US-121.
- Invocar `LLMProvider` o providers concretos.
- Implementar timeout, retry, fallback orchestration o provider selection.
- Implementar feature use cases como plan/checklist/budget/brief.
- Crear endpoints REST o frontend.
- Implementar accept/edit/discard/reject o materialización de entidades.
- Crear admin dashboard, evidence catalog o analytics.
- Crear schema Prisma nuevo salvo gap formal contra PB-P0-010/ADR.

### Explicit Non-Goals

- No materializar `EventTask`, `BudgetItem`, `QuoteRequest`, `VendorProfile` ni otros datos oficiales.
- No persistir secrets, API keys, tokens, full prompts, raw unsafe provider output ni PII innecesaria.
- No implementar chatbot, RAG, agents, tool calling ni decisiones autónomas.
- No reabrir ADR-AI-006 ni ADR-AI-007.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. Debe seguir Clean/Hexagonal: Application define el port y el service; Infrastructure implementa Prisma; Domain define invariantes/status si ya existe entidad. Controllers futuros consumirán use cases, no el repository directo.

### Frontend Architecture

No aplica. No hay UI.

### Database Architecture

Aplica. Usa `AIRecommendation` y `AIPromptVersion` existentes. No rediseña schema salvo gap formal. Debe respetar FK, índices, constraints e intención append/status-controlled.

### API Architecture

No aplica. No se crean endpoints.

### AI / PromptOps Architecture

Aplica. Consume metadata de US-121 y de ejecución IA. Persistencia requiere output validado, prompt version válido, provider metadata y HITL pending state.

### Security Architecture

Aplica. Persistencia backend-only, payload minimization, no secrets/PII, ownership context para downstream y logs seguros.

### Testing Architecture

Aplica. Pruebas unitarias, integración con Prisma/DB, seguridad y CI con Mock/no network.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 AIRecommendation repository persists required metadata | Repository/service inserta todos los campos requeridos y timestamps. | Application, Infrastructure, DB |
| AC-02 New recommendations start as pending HITL records | Default `status=pending` y/o `accepted=false`; sin mutar dominio. | Domain, DB |
| AC-03 Prompt version linkage is required | Validar `promptVersionId`/FK o metadata existente antes de persistir. | Application, DB |
| AC-04 Provider and fallback metadata are preserved | Mapear metadata de `AIResult`/context sin inferencias silenciosas. | Application |
| AC-05 Language and correlation metadata are stored | Persistir `languageCode` y `correlationId` si está disponible. | Application, DB, Observability |
| AC-06 Input payload is minimized and sanitized | Usar allowlist/redaction antes de persistir. | Application, Security |
| AC-07 Output payload is validated before successful persistence | Exigir bandera/resultado de validation previa o schema validator inyectado. | Application, QA |
| AC-08 Controlled failure records are safe if supported | Persistir sólo metadata segura de error si schema lo soporta. | Application, DB, Security |
| AC-09 Ownership context is available for downstream authorization | Guardar context IDs requeridos por tipo. | Application, DB, Security |
| AC-10 Tests verify persistence and no unsafe side effects | Suite cubre éxito, validación, seguridad y no materialización. | QA, CI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo principal:

- `ai-assistance`

Folders probables:

- `src/modules/ai-assistance/ports/ai-recommendation-repository.ts`
- `src/modules/ai-assistance/application/services/persist-ai-recommendation.service.ts`
- `src/modules/ai-assistance/domain/entities/ai-recommendation.entity.ts`
- `src/modules/ai-assistance/domain/enums/ai-recommendation-type.enum.ts`
- `src/modules/ai-assistance/domain/enums/ai-recommendation-status.enum.ts`
- `src/modules/ai-assistance/infrastructure/persistence/prisma-ai-recommendation.repository.ts`
- `src/modules/ai-assistance/application/__tests__/persist-ai-recommendation.service.spec.ts`
- `src/modules/ai-assistance/infrastructure/persistence/__tests__/prisma-ai-recommendation.repository.spec.ts`

### Use Cases / Application Services

Servicio interno sugerido:

- `PersistAIRecommendationService.persist(input, tx?)`.

Responsabilidades:

- Validar metadata.
- Sanitizar input payload.
- Verificar output validation marker.
- Normalizar status inicial.
- Delegar al repository.
- Emitir logs seguros.

### Controllers / Routes

No aplica.

### DTOs / Schemas

Input interno sugerido:

- `PersistAIRecommendationInput`.

Campos mínimos:

- `requestedByUserId`.
- `type`.
- `promptVersionId`.
- `provider`.
- `languageCode`.
- `inputPayload`.
- `outputPayload`.
- `schemaValid: true` o equivalente.
- `fallbackUsed`.
- `timeoutMs`.
- `latencyMs`.
- `correlationId?`.
- `eventId?`.
- `vendorProfileId?`.
- `quoteRequestId?`.
- `quoteId?`.
- `tokenCount?`.
- `isSeed?`.
- `errorMetadata?` sólo si se soporta failure record.

Validation con Zod o validators internos:

- Required fields.
- Enum values.
- Payload redaction.
- Context required by `type`.
- No success persist if `schemaValid !== true`.

### Repository / Persistence

Port sugerido:

- `create(input, options?: { tx?: Prisma.TransactionClient }): Promise<AIRecommendation>`.
- `existsPromptVersion(promptVersionId): Promise<boolean>` si no se valida por FK.

Implementación:

- `PrismaAIRecommendationRepository`.
- Mapper Prisma ↔ Domain/DTO.
- Soporte a `Prisma.TransactionClient` para composición futura.

### Validation Rules

- `requestedByUserId` requerido.
- `promptVersionId` requerido y existente.
- `type` soportado.
- `provider` soportado (`openai`, `mock`, `anthropic` enum si existe; Anthropic no funcional no debería producir success).
- `languageCode` soportado.
- `outputPayload` success requiere validation previa.
- `inputPayload` sanitizado/minimizado.
- Context IDs por tipo cuando aplique.
- `fallbackUsed=true` requiere provider/metadata coherente.
- New record usa `status=pending` y/o `accepted=false`.

### Error Handling

Errores tipados/controlados:

- `AIRecommendationValidationError`.
- `AIPromptVersionNotFoundError`.
- `AIRecommendationUnsafePayloadError`.
- `AIRecommendationInvalidOutputError`.
- `AIRecommendationContextError`.
- `AIRecommendationPersistenceError`.

No incluir payload completo en error público/log.

### Transactions

El repository debe aceptar transaction client. US-122 no materializa dominio, pero feature use cases futuros podrán persistir recommendation y otros efectos dentro de una transacción cuando corresponda.

### Observability

Logs seguros:

- `ai.recommendation.persisted`.
- `ai.recommendation.persist_failed`.

Campos permitidos:

- `recommendationId`, `type`, `provider`, `fallbackUsed`, `latencyMs`, `timeoutMs`, `correlationId`, `status`, `errorCode`.

Campos prohibidos:

- full prompt, full input payload, raw provider output, secrets, tokens, cookies, PII innecesaria.

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

No hay UI. Se persiste `languageCode` para trazabilidad.

---

## 9. API Contract Design

No aplica.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| N/A | N/A | US-122 no crea endpoint REST | N/A | N/A | N/A | N/A |

---

## 10. Database / Prisma Design

### Models Impacted

- `AIRecommendation`.
- `AIPromptVersion`.
- `User`.
- Optional context relations: `Event`, `VendorProfile`, `QuoteRequest`, `Quote`.

### Fields / Columns

Campos esperados:

- `id`.
- `requested_by_user_id`.
- `event_id?`.
- `vendor_profile_id?`.
- `quote_request_id?` si existe.
- `quote_id?` si existe.
- `type`.
- `input_payload`.
- `output_payload`.
- `prompt_version_id`.
- `llm_provider` / `provider`.
- `language_code`.
- `status` y/o `accepted`.
- `accepted_at?`.
- `edited?`.
- `latency_ms`.
- `token_count?`.
- `fallback_used`.
- `timeout_ms`.
- `correlation_id`.
- `is_seed?`.
- `created_at`.
- `updated_at`.

Si el schema real sólo tiene `accepted` boolean, mapear `status=pending` a `accepted=false` y documentar gap para lifecycle completo.

### Relations

- `AIRecommendation.requestedBy -> User`.
- `AIRecommendation.promptVersion -> AIPromptVersion`.
- `AIRecommendation.event? -> Event`.
- `AIRecommendation.vendorProfile? -> VendorProfile`.
- Context relations adicionales si ya existen.

### Indexes

Usar índices ya definidos:

- `(requested_by_user_id, created_at DESC)`.
- `(event_id, type, created_at DESC)`.
- `(prompt_version_id)`.
- `correlation_id` si existe y se consulta en observabilidad.

### Constraints

- `prompt_version_id` requerido.
- `language_code` válido.
- `accepted=false` default y/o `status='pending'`.
- Context requirement por tipo en service layer si DB no lo puede expresar.
- No FK falsa; context IDs deben existir si se proveen.

### Migrations Impact

No se espera migración nueva. Si falta `timeout_ms`, `correlation_id`, `status` o context relation requerida, technical tasks deben registrar un schema gap para Tech Lead antes de cambiar Prisma.

### Seed Impact

No requiere seed nuevo por sí mismo, pero debe soportar `is_seed` y demo AIRecommendation records futuros. Tests pueden crear fixtures DB efímeros.

---

## 11. AI / PromptOps Design

### AI Feature

Persistencia transversal de recomendaciones IA.

### Provider

No invoca provider. Consume provider metadata proveniente de upstream:

- `openai`.
- `mock`.
- `anthropic` sólo como stub/error metadata; no success funcional MVP.

### Prompt Version

`promptVersionId` es obligatorio y debe venir de US-121. Recomendaciones históricas deben conservar referencia aun si prompt queda deprecated/archived.

### Input Schema

US-122 no define schemas por feature. Recibe payload minimizado ya construido por use case; valida estructura común y sanitización.

### Output Schema

US-122 exige output validado. Puede recibir `schemaValid=true`, output typed o validator result desde la capa de orquestación. No debe persistir success con output inválido.

### Human-in-the-loop

Nuevo record queda pending/no accepted. La persistencia no materializa dominio.

### Fallback

No implementa fallback. Si upstream fallback produjo mock, persistir `provider='mock'` y `fallbackUsed=true`.

### Persistence

Responsabilidad central de esta historia.

### Safety Rules

- Sanitizar input.
- Validar output.
- No raw unsafe provider output.
- No secrets.
- No autonomous materialization.
- Preserve audit metadata.

---

## 12. Security & Authorization Design

### Authentication

No hay endpoint. Upstream use cases deben autenticar usuario antes de llamar el service.

### Authorization

Upstream debe aplicar RBAC/ownership/rate-limit. US-122 debe persistir context IDs suficientes para enforcement posterior.

### Ownership Rules

El service valida context consistency básica por tipo, pero no sustituye ownership policy. Downstream read/apply/discard debe verificar owner/admin sobre context IDs.

### Role Rules

No aplica directamente. Organizer/vendor/admin dependen de feature use cases.

### Negative Authorization Scenarios

- Frontend crea AIRecommendation arbitrario: no hay endpoint.
- Usuario no dueño intenta generar/persistir: upstream rechaza.
- Persistencia recibe context inválido: validation error.
- Output IA intenta materializar dominio: fuera de scope, no side effect.

### Audit Requirements

Persistir:

- requester.
- prompt version.
- provider.
- language.
- correlation id.
- latency/timeout/fallback.
- sanitized input.
- validated output.
- status/accepted.

No crear `AdminAction` en esta historia.

### Sensitive Data Handling

Sanitización allowlist por feature. Prohibido persistir:

- API keys.
- auth tokens.
- cookies.
- contact data no necesario.
- private notes no requeridas.
- full raw prompts.
- full raw provider output no validado.

---

## 13. Testing Strategy

### Unit Tests

- Validation de required metadata.
- Mapping `status=pending`/`accepted=false`.
- Payload sanitizer.
- Context validation por type.
- Provider/fallback metadata consistency.
- No domain materialization side effects.

### Integration Tests

- Prisma insert success con FK `AIPromptVersion`.
- Missing prompt version falla.
- Missing user falla.
- Index/query smoke si hay repository read helpers.
- Transaction client support.

### API Tests

No aplica.

### E2E Tests

No aplica en US-122. E2E HITL pertenece a features/endpoints.

### Security Tests

- Input con secrets/tokens/contact data se redacted.
- Logs no incluyen payload completo.
- Unsafe raw output no se persiste como success.

### Accessibility Tests

No aplica.

### AI Tests

- Validated output persistido.
- Invalid output rejected.
- Mock fallback metadata persistida cuando llega de upstream.
- Language/correlation metadata preservada.

### Seed / Demo Tests

- Puede persistir AIRecommendation con `is_seed=true` si schema soporta.
- Demo records trazables a `AIPromptVersion`.

### CI Checks

- Unit + integration DB.
- No provider secrets/network.
- Prisma schema compatibility.
- Security redaction tests.

---

## 14. Observability & Audit

### Logs

Log success/failure con metadata segura:

- `recommendationId`.
- `type`.
- `provider`.
- `fallbackUsed`.
- `latencyMs`.
- `correlationId`.
- `status`.
- `errorCode`.

### Correlation ID

Persistir si está disponible. Si no está, upstream correlation middleware debe generarlo.

### AdminAction

No aplica.

### Error Tracking

Clasificar validation vs persistence vs unsafe payload vs missing FK.

### Metrics

Opcional MVP:

- `ai_recommendation_persist_total{type,provider,status}`.
- `ai_recommendation_persist_failed_total{error_code}`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

No crea seed base obligatorio. Debe permitir que historias seed/demo creen AIRecommendations trazables.

### Demo Scenario Supported

Soporta evidencia demo de AI outputs con prompt version, provider, language, fallback y HITL status.

### Reset / Isolation Notes

Si `is_seed` existe, preservar compatibilidad con reset. Tests deben usar DB efímera o transacciones.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `docs/6-Domain-Data-Model.md`, `docs/4-Business-Rules-Document.md` | Describen `accepted` boolean default false; docs de seguridad/arquitectura y US-122 usan `status=pending/accepted/edited/rejected/discarded`. | US-122 usa `status=pending` como semántica principal y acepta `accepted=false` como equivalencia si el schema real conserva ambos. | En implementación, mapear según schema real y documentar si lifecycle completo requiere schema task separada. | No |
| `docs/19-Security-and-Authorization-Design.md` | Indica output inválido se descarta/loguea; docs/17 permite status `failed` para fallos controlados. | US-122 permite failure records sólo si schema soporta safe failure metadata sin raw unsafe output. | Preferir no persistir raw invalid output; si se registra fallo, guardar metadata segura. | No |
| `docs/17-AI-Architecture-and-PromptOps-Design.md` | Incluye accept/discard use cases en módulo AI. | US-122 no implementa accept/discard; sólo deja contexto para downstream. | Mantener accept/discard en historias HITL posteriores. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Schema real no tiene `status` | Confusión lifecycle HITL | Mapear a `accepted=false`; registrar gap si se requiere enum status |
| Persistir PII/secrets en `inputPayload` | Riesgo privacidad | Sanitizer allowlist + tests de redaction |
| Persistir output inválido como pending | Riesgo funcional/seguridad | Requerir validation marker/validator result |
| Metadata fallback inconsistente | Auditoría incorrecta | Validar provider/fallback consistency |
| Repository materializa dominio por accidente | Rompe HITL | Tests de no side effects y out-of-scope claro |
| Falta `promptVersionId` válido | Trazabilidad rota | FK/exists validation antes de insert |
| Logs filtran payload | Riesgo seguridad | Structured logs con fields permitidos |

---

## 18. Implementation Guidance for Coding Agents

- Revisar US-122, US-121 spec, ADR-AI-006, ADR-AI-007 y docs/19 §25.
- Implementar port y service antes de Prisma adapter.
- Usar Prisma mapping existente; no rediseñar schema sin gap formal.
- Introducir sanitizer/allowlist por feature o payload común.
- Exigir `schemaValid=true` o result equivalente para success.
- Aceptar `tx` opcional en repository.
- Mantener service sin llamadas LLM.
- No crear endpoints ni UI.
- No implementar accept/edit/discard.
- No persistir raw invalid output ni full prompts.

---

## 19. Task Generation Notes

Suggested task groups:

- Backend:
  - Definir `AIRecommendationRepository`.
  - Definir `PersistAIRecommendationInput`.
  - Implementar validation service.
  - Implementar sanitizer.
  - Implementar Prisma repository.
  - Soportar transaction client.

- Database:
  - Verificar schema compatibility.
  - Registrar gap si faltan campos obligatorios.

- Security:
  - Redaction/minimization tests.
  - Safe logs.
  - No direct frontend/API surface.

- QA:
  - Unit tests validation.
  - Integration tests Prisma/FK.
  - Invalid output rejection.
  - Fallback metadata preservation.
  - No domain side effects.

- Observability:
  - Structured logs success/failure.
  - Correlation ID persistence.

- Documentation:
  - Document lifecycle mapping `status` vs `accepted`.
  - Document payload minimization expectations.

Required seed/demo tasks:

- Verify compatibility with `is_seed` and demo AIRecommendation records; no seed required in US-122 itself.

Dependencies between tasks:

- Schema compatibility before repository.
- Repository before service tests.
- Sanitizer before integration success path.
- US-121 metadata before prompt FK tests.

Parent backlog consolidated tasks:

- Sí. PB-P0-010 debe consolidar US-121 + US-122 para validar prompt version → AIRecommendation end-to-end.

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

US-122 está técnicamente lista. La implementación debe concentrarse en repository/service de persistencia, metadata obligatoria, HITL pending state, payload sanitizado, output validado, logs seguros y pruebas de integración, sin implementar providers, PromptRegistry, fallback orchestration, endpoints, UI ni materialización de entidades.
