# Technical Specification — US-121: Implementar prompt registry versionado

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-121 |
| Source User Story | `management/user-stories/US-121-prompt-registry-versioned.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usan `PO/BA Decisions Applied` y ADR-AI-006 |
| Priority | P0 |
| Backlog ID | PB-P0-010 |
| Backlog Title | Prompt registry versionado + persistencia `AIRecommendation` |
| Backlog Execution Order | 10 |
| User Story Position in Backlog Item | 1 of 2 |
| Related User Stories in Backlog Item | US-121, US-122 |
| Epic | EPIC-AI-001 |
| Backlog Item Dependencies | PB-P0-001, PB-P0-009 |
| Feature | Prompt registry + AIPromptVersion |
| Module / Domain | AI Assistance / PromptOps |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-06-17 |
| Last Updated | 2026-06-17 |

---

## 2. Backlog Execution Context

### Product Backlog Item

PB-P0-010 entrega la base de PromptOps y trazabilidad IA: registry versionado, metadata `AIPromptVersion` y persistencia posterior de `AIRecommendation`. US-121 implementa la primera mitad del backlog item: resolución versionada de prompts y metadata sincronizable. US-122 consumirá esta metadata para persistir cada generación IA.

### Execution Order Rationale

US-121 debe ejecutarse después de PB-P0-001 y PB-P0-009 porque necesita el modelo `AIPromptVersion`, tipos compartidos de IA y el contrato `LLMProvider`/`AIContext`. Debe ejecutarse antes de US-122 y antes de las historias de features IA para que cada generación pueda referenciar un prompt versionado.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-121 | Implementa `PromptRegistry`, templates versionados y metadata `AIPromptVersion` | 1 |
| US-122 | Persiste `AIRecommendation` usando metadata de prompt/provider/output | 2 |

---

## 3. Executive Technical Summary

Implementar un `PromptRegistry` estático, versionado y validado en código dentro del módulo `ai-assistance`. El registry debe resolver prompts por `featureType`, `languageCode` y política de versión (`active` o `specific`), validar que exista una sola versión activa por `(featureType, languageCode)`, rechazar metadata incompleta, bloquear prompts Future/P4 activos y exponer/exportar metadata compatible con `AIPromptVersion`.

La implementación no invoca proveedores LLM, no crea endpoints, no persiste `AIRecommendation` y no habilita edición dinámica de prompts. Debe preservar ADR-AI-006: prompts en código con ID estable + tabla/metadata `AIPromptVersion` para trazabilidad.

---

## 4. Scope Boundary

### In Scope

- Crear `PromptTemplate` y tipos relacionados.
- Crear `PromptRegistry` con resolución `active` y `specific`.
- Crear `prompt-version-loader` o registry builder validado.
- Crear templates iniciales MVP con metadata completa o skeletons seguros según schemas disponibles.
- Validar metadata obligatoria, `languageSupport`, schema refs, lifecycle status, hash/checksum y reviewers.
- Enforce de una sola versión activa por `(featureType, languageCode)`.
- Rechazar prompts Future/P4 activos.
- Exportar o sincronizar metadata `AIPromptVersion` para US-122.
- Validar seguridad de prompts: no secrets, no PII real, HITL, JSON-only, user content boundary.
- Agregar tests unitarios, seguridad, AI/PromptOps, seed/sync y CI.

### Out of Scope

- Persistir cada generación IA como `AIRecommendation`; cubierto por US-122.
- Invocar `LLMProvider` o adapters.
- Implementar `OpenAIProvider`, `MockAIProvider` o `AnthropicProvider`.
- Implementar timeout, retry, fallback o output validation runtime.
- Crear endpoints REST, frontend o admin UI.
- Implementar edición dinámica de prompts en DB o panel admin.
- Implementar A/B testing, RAG, chatbot, agents, tool calling o decisiones autónomas.
- Activar prompts P4/Future como vendor bio/package generation.

### Explicit Non-Goals

- No generar contenido IA real.
- No almacenar secretos ni ejemplos con PII real en prompts.
- No materializar entidades de dominio.
- No cambiar el schema Prisma declarado por PB-P0-001 salvo gap formal detectado.
- No reabrir ADR-AI-006.

---

## 5. Architecture Alignment

### Backend Architecture

Aplica. `PromptRegistry` vive en `ai-assistance`, preferiblemente Infrastructure/PromptOps, consumible por Application use cases futuros mediante una interfaz estable. Debe seguir Modular Monolith y Clean/Hexagonal: Application no debe depender de SDKs externos y el registry no debe conocer controladores HTTP.

### Frontend Architecture

No aplica. No hay UI ni rutas.

### Database Architecture

Aplica de forma limitada. US-121 no rediseña schema. Usa `AIPromptVersion` si existe para seed/sync metadata o exporta un dataset estático para US-122. `AIRecommendation` queda fuera.

### API Architecture

No aplica. No se crean endpoints.

### AI / PromptOps Architecture

Aplica. Implementa PromptOps foundation: templates versionados, lifecycle, metadata, schema refs, hash drift checks, safety constraints y reproducibilidad.

### Security Architecture

Aplica. Prompts y logs no deben incluir secrets, raw PII, tokens, cookies, payloads completos ni instrucciones que permitan decisiones autónomas.

### Testing Architecture

Aplica. Vitest/CI debe validar resolución, metadata, active uniqueness, unsupported language, hash drift, sync/export y safety constraints.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01 Static PromptRegistry resolves active prompts | Implementar `resolve(featureType, languageCode, "active")` y retornar exactamente un template activo con metadata completa. | Backend, AI/PromptOps |
| AC-02 Specific prompt versions are reproducible | Permitir resolución por ID/version histórica y excluir deprecated/archived de active resolution. | Backend, AI/PromptOps |
| AC-03 Active uniqueness is enforced | Validación de bootstrap/test rechaza duplicados por `(featureType, languageCode)`. | Backend, CI |
| AC-04 Unsupported feature/language/version fails safely | Errores tipados/controlados sin fallback silencioso de prompt o idioma. | Backend, AI/PromptOps |
| AC-05 Prompt templates include required metadata | Validar ID, version, status, languages, schema refs, safety, HITL, changelog, reviewers y hash. | Backend, AI/PromptOps, QA |
| AC-06 Prompt safety constraints are explicit | Templates incluyen JSON-only, content boundary, HITL, no decisiones autónomas ni claims fuera de scope. | AI/PromptOps, Security |
| AC-07 AIPromptVersion metadata is synchronized or exported | Export/sync de metadata para active prompts con checks de IDs/hash/rows. | Backend, DB, Seed/CI |
| AC-08 Prompt changes require version discipline | Hash/version drift check bloquea mutación silenciosa. | CI, QA |
| AC-09 Future/P4 prompts are not active | Registry validation bloquea features Future/P4 en status active. | AI/PromptOps, QA |
| AC-10 Tests cover registry behavior and safety | Suite cubre resolución, errores, metadata, hash drift, sync/export y seguridad. | QA, CI |

---

## 7. Backend Technical Design

### Modules / Bounded Contexts

Módulo principal:

- `ai-assistance`

Folders probables:

- `src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry.ts`
- `src/modules/ai-assistance/infrastructure/prompt-registry/prompt-template.ts`
- `src/modules/ai-assistance/infrastructure/prompt-registry/prompt-version-loader.ts`
- `src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry-errors.ts`
- `src/modules/ai-assistance/infrastructure/prompt-registry/aipromptversion-export.ts`
- `src/modules/ai-assistance/infrastructure/prompt-registry/prompts/*.prompt.ts`
- `src/modules/ai-assistance/infrastructure/prompt-registry/__tests__/prompt-registry.spec.ts`

### Use Cases / Application Services

No se crean use cases de producto. Se puede exponer un servicio interno:

- `PromptRegistry.resolve(...)`.
- `PromptRegistry.validateAll()` o validación en constructor/builder.
- `exportAIPromptVersionMetadata()` para seed/sync.

### Controllers / Routes

No aplica.

### DTOs / Schemas

Tipos sugeridos:

- `PromptTemplate`.
- `PromptTemplateStatus = "draft" | "reviewed" | "approved" | "active" | "deprecated" | "archived"`.
- `PromptVersionPolicy = "active" | "specific"`.
- `PromptTemplateMetadata`.
- `AIPromptVersionMetadata`.
- `PromptRegistryError` variants:
  - `PromptNotFoundError`.
  - `PromptDuplicateActiveError`.
  - `PromptUnsupportedLanguageError`.
  - `PromptInvalidMetadataError`.
  - `PromptHashDriftError`.
  - `PromptFutureFeatureActiveError`.

`PromptTemplate` debe contener como mínimo:

- `id`.
- `promptId`.
- `version`.
- `featureType`.
- `status`.
- `languageSupport`.
- `inputSchemaRef`.
- `outputSchemaRef`.
- `templateHash`.
- `systemInstructions`.
- `developerRules`.
- `safetyConstraints`.
- `buildUserPrompt` o `userContentBoundary` según patrón elegido.
- `metadata.createdBy`.
- `metadata.approvedBy?`.
- `metadata.changeReason`.
- `metadata.relatedRules`.
- `metadata.createdAt`.
- `metadata.approvedAt?`.

### Repository / Persistence

No se requiere repository dinámico. Si `ai_prompt_versions` existe, implementar una estrategia de seed/sync o export de metadata:

- Opción MVP recomendada: exportar metadata estática y validarla en CI.
- Opción persistida: seed idempotente de `AIPromptVersion` con IDs estables y `templateHash`.

No implementar edición desde DB ni `AIPromptVersionRepository` mutable.

### Validation Rules

- `id` y `(promptId, version)` únicos.
- Sólo una versión `active` por `(featureType, languageCode)`.
- `active` requiere `approvedBy`, `approvedAt`, schema refs y safety constraints.
- `draft`/`reviewed` no se sirve por `versionPolicy="active"`.
- `deprecated`/`archived` sólo se resuelven por `specific`.
- `languageCode` debe pertenecer a valores soportados.
- Prompt Future/P4 no puede tener status `active`.
- Hash/checksum declarado debe coincidir con contenido relevante.
- No secrets ni PII real en template/static examples.
- No fallback silencioso a otro prompt o idioma.

### Error Handling

Errores deben ser tipados o al menos diferenciables por code:

- `PROMPT_NOT_FOUND`.
- `PROMPT_DUPLICATE_ACTIVE`.
- `PROMPT_UNSUPPORTED_LANGUAGE`.
- `PROMPT_INVALID_METADATA`.
- `PROMPT_HASH_DRIFT`.
- `PROMPT_FUTURE_FEATURE_ACTIVE`.

Los errores no deben incluir prompt completo, input completo ni payload sensible.

### Transactions

No aplica para registry puro. Si se implementa sync/seed a `AIPromptVersion`, usar transacción idempotente o upsert controlado sin mutar versiones históricas de forma silenciosa.

### Observability

Logs seguros para fallas de validación:

- event: `ai.prompt_registry.validation_failed`.
- fields: `featureType`, `languageCode`, `promptId`, `version`, `errorCode`.
- prohibido: prompt completo, user payload, secrets, PII.

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

No hay UI, pero el registry debe soportar `LanguageCode` aprobado para selección de prompt.

---

## 9. API Contract Design

No aplica.

| Method | Endpoint | Purpose | Auth Required | Request | Response | Error Cases |
|---|---|---|---|---|---|---|
| N/A | N/A | US-121 no crea endpoint REST | N/A | N/A | N/A | N/A |

---

## 10. Database / Prisma Design

### Models Impacted

- `AIPromptVersion` / `ai_prompt_versions`, si ya existe por PB-P0-001.

### Fields / Columns

US-121 debe mapear metadata a los campos disponibles. Campos esperados por docs/ADR:

- `id`.
- `prompt_id` o equivalente.
- `version`.
- `feature_type`.
- `status`.
- `language_support` / `supported_languages`.
- `input_schema_version` o `input_schema_ref`.
- `output_schema_version` o `output_schema_ref`.
- `template_hash`.
- `change_reason`.
- `created_by`.
- `approved_by`.
- timestamps.

Si el schema real difiere, documentar mapping en implementación sin rediseñar schema salvo gap formal.

### Relations

- `AIRecommendation.prompt_version_id` usará `AIPromptVersion` en US-122.

### Indexes

No crear índices nuevos salvo ya previstos por PB-P0-001/PB-P0-008. Deseable:

- unique `(prompt_id, version)`.
- unique lógico para active por feature/language si el schema lo soporta.

### Constraints

- Append-only/versioned intent.
- No mutación silenciosa de template/version histórica.
- Una versión active por `(featureType, languageCode)` enforced en registry, y en DB si el schema lo permite.

### Migrations Impact

No se esperan migraciones nuevas en US-121. Si falta campo requerido por ADR-AI-006 y PB-P0-010, registrar gap para Tech Lead antes de cambiar schema.

### Seed Impact

Aplica. Crear o exportar metadata seed/sync de active prompts MVP para que US-122 pueda referenciar `prompt_version_id`.

---

## 11. AI / PromptOps Design

### AI Feature

PromptOps infrastructure para todas las features IA MVP. No es una feature de generación directa.

### Provider

No invoca provider. `OpenAIProvider`/`MockAIProvider` consumirán prompts a través de use cases futuros.

### Prompt Version

Implementar versionado incremental simple `V1`, `V2`, etc. La versión debe cambiar cuando cambien reglas, schema, safety, language support o behavior. Deprecated/archived deben conservarse para auditoría.

### Input Schema

Cada prompt debe referenciar schema de input por nombre/ID estable. Si el schema aún no existe, usar referencia estable y hacer fallar validation según alcance de la feature.

### Output Schema

Cada prompt debe referenciar schema de output por nombre/ID estable. No se valida output real en US-121, pero sí existencia/referencia del schema.

### Human-in-the-loop

Todos los prompts activos deben incluir reminder HITL: la salida es sugerencia editable y no materializa datos oficiales sin aceptación humana.

### Fallback

No aplica. El registry no realiza fallback de prompt, idioma ni provider.

### Persistence

Sólo metadata `AIPromptVersion` export/sync. `AIRecommendation` pertenece a US-122.

### Safety Rules

- JSON-only output instruction.
- User content boundary.
- Payload minimization.
- No prompt injection amplification.
- No decisiones autónomas.
- No contratos, pagos, disponibilidad vendor o claims legales vinculantes.
- No currency conversion no soportada.
- No secrets ni PII real.
- No prompts P4/Future activos.

---

## 12. Security & Authorization Design

### Authentication

No aplica directamente. No hay endpoint ni acción de usuario.

### Authorization

No aplica directamente. Backend-only infrastructure.

### Ownership Rules

No aplica. Ownership se aplica en use cases que consumen el registry y en US-122.

### Role Rules

No aplica para runtime. Prompt ownership/review interno:

- PromptOps Lead / Backend Engineer crean.
- Product Owner aprueba cambios relevantes.
- Security Reviewer revisa cambios de safety/datos sensibles.
- QA valida promoción a active.

### Negative Authorization Scenarios

- Frontend intenta consultar/modificar prompts: no existe endpoint.
- Admin intenta editar prompts dinámicamente: fuera de scope MVP.
- Runtime intenta servir prompt Future/P4 active: validation falla.

### Audit Requirements

Metadata debe permitir auditoría posterior:

- prompt ID/version.
- hash.
- reviewers.
- change reason.
- related rules.
- schema refs.

No crear `AdminAction`.

### Sensitive Data Handling

- No secrets, API keys, tokens, cookies o PII real en prompts.
- Logs sin prompt completo ni payload completo.
- Examples deben ser sintéticos.

---

## 13. Testing Strategy

### Unit Tests

- Resolve active prompt por feature/language.
- Resolve specific version histórica.
- Duplicate active prompt falla.
- Unsupported language/feature/version falla.
- Metadata requerida se valida.
- Status lifecycle se respeta.
- Future/P4 active falla.
- Hash/checksum drift falla.

### Integration Tests

- Export/sync de `AIPromptVersion` metadata si se implementa contra DB/Prisma.
- Seed idempotente de prompt versions si aplica.

### API Tests

No aplica.

### E2E Tests

No aplica en US-121. E2E de features IA vendrá en historias consumidoras.

### Security Tests

- Detectar secret-like strings en prompts.
- Verificar que logs de validation no incluyen prompt completo.
- Validar user content boundary y HITL constraints.
- Validar no active prompts para Future/P4.

### Accessibility Tests

No aplica.

### AI Tests

- Prompts activos incluyen JSON-only.
- Prompts activos incluyen HITL reminder.
- Prompts activos incluyen safety constraints.
- Prompts activos referencian input/output schemas.

### Seed / Demo Tests

- Active MVP prompt metadata puede exportarse/sincronizarse.
- Demo prompt version IDs son determinísticos.
- No se requieren provider secrets ni red.

### CI Checks

- Registry validation completa.
- Hash/version drift.
- No duplicate active.
- No secrets/PII real.
- No Future/P4 active.

---

## 14. Observability & Audit

### Logs

Logs sólo para validación/resolución fallida con metadata segura.

### Correlation ID

No requerido para registry definition. Si se usa dentro de un request futuro, puede propagarse desde `AIContext`.

### AdminAction

No aplica.

### Error Tracking

Errores de bootstrap/CI deben clasificarse por `errorCode` para debugging.

### Metrics

No obligatorio. Futuro opcional:

- `ai_prompt_registry_validation_failed_total`.
- `ai_prompt_resolve_total{feature,language,status}`.

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Sí, si el proyecto usa modo persistido `AIPromptVersion`. Debe existir metadata para prompts activos MVP. Si se mantiene registry-only, exportar metadata determinística para US-122.

### Demo Scenario Supported

Soporta demo reproducible porque los IDs de prompt version son determinísticos y auditables.

### Reset / Isolation Notes

Seed/sync debe ser idempotente. No debe borrar versiones históricas referenciadas. No debe activar prompts Future/P4.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| `docs/6-Domain-Data-Model.md` y `docs/17-AI-Architecture-and-PromptOps-Design.md` | Algunas secciones describen `AIPromptVersion` como Recommended/opcional o registry-only default. | US-121 + ADR-AI-006 aplican estrategia híbrida: registry estático en código + metadata/tabla `AIPromptVersion` para trazabilidad. | Mantener implementación híbrida y registrar mapping exacto en US-121/US-122 specs; actualizar docs fuente en pasada documental si aplica. | No |
| `docs/9-Functional-Requirements-Document.md` FR-AI-016 | FR-AI-016 trata provider selection, no prompt registry. | Para US-121, FR-AI-018 y BR-AI-010 son trazabilidad principal; FR-AI-016 queda como contexto AI foundation. | En task breakdown priorizar FR-AI-018/BR-AI-010 para trazabilidad; no bloquear. | No |
| `docs/14-Backend-Technical-Design.md` | Sugiere `AIPromptVersionRepository` no necesario y registry-only. | US-121 no implementa repository mutable; permite export/sync metadata si tabla existe. | No crear repositorio dinámico; usar static registry + seed/export. | No |

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Mutación silenciosa de prompt activo | Rompe reproducibilidad y auditoría | Hash/version drift check en CI |
| Duplicado active por feature/language | Selección ambigua | Validación de registry en bootstrap/test |
| Prompts con secrets/PII real | Riesgo de seguridad y privacidad | Security tests/review con allowlist/denylist |
| Future/P4 prompt queda activo | Scope creep MVP | Validation contra feature allowlist MVP |
| Metadata `AIPromptVersion` diverge del código | `AIRecommendation` no puede reproducirse | Export/sync check con IDs/hash |
| Schema refs inexistentes | Runtime falla en feature IA posterior | Registry validation requiere refs estables |
| Registry intenta resolver fallback de idioma/prompt | Output no trazable o inconsistente | Error tipado sin fallback silencioso |

---

## 18. Implementation Guidance for Coding Agents

- Revisar US-121, ADR-AI-006, docs/17 §10-11 y US-099 antes de implementar.
- Crear primero tipos `PromptTemplate` y errores.
- Implementar después `PromptRegistry` con validación inmutable.
- Agregar templates MVP iniciales con metadata completa.
- Implementar hash/checksum sobre contenido relevante.
- Implementar export/sync `AIPromptVersion` sin crear editor dinámico.
- Mantener prompts en código y no en DB editable.
- No invocar `LLMProvider`.
- No persistir `AIRecommendation`.
- No crear endpoints ni UI.
- No activar prompts Future/P4.
- No reabrir ADR-AI-006.

---

## 19. Task Generation Notes

Suggested task groups:

- Backend:
  - Definir tipos `PromptTemplate`, statuses, metadata y errores.
  - Implementar `PromptRegistry.resolve`.
  - Implementar validation builder/bootstrap.
  - Implementar hash/checksum.
  - Implementar export/sync `AIPromptVersion`.

- AI / PromptOps:
  - Crear templates MVP iniciales.
  - Definir safety constraints.
  - Definir changelog metadata.
  - Validar Future/P4 no active.

- QA:
  - Tests de resolución active/specific.
  - Tests de duplicate active.
  - Tests unsupported language/feature/version.
  - Tests metadata/schema refs.
  - Tests hash drift.
  - Tests sync/export.

- Security:
  - Secret/PII scanning en prompts.
  - Safe logs.
  - User content boundary/HITL constraints.

- Seed/Demo:
  - Metadata `AIPromptVersion` determinística.
  - Idempotencia de sync/seed si aplica.

- Documentation:
  - Documentar cómo crear nueva prompt version.
  - Documentar alignment `AIPromptVersion` hybrid strategy.

Dependencies between tasks:

- Tipos y errores antes del registry.
- Registry antes de templates finales.
- Templates antes de hash/sync tests.
- Sync/export antes de US-122.

Parent backlog consolidated tasks:

- Sí. PB-P0-010 debe consolidar US-121 y US-122 para validar trazabilidad prompt → `AIRecommendation`.

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

US-121 está técnicamente lista. La implementación debe enfocarse en `PromptRegistry` estático, prompt metadata, version discipline, safe PromptOps constraints, `AIPromptVersion` export/sync y tests de CI, sin introducir ejecución LLM, endpoints, UI, `AIRecommendation` persistence ni edición dinámica de prompts.
