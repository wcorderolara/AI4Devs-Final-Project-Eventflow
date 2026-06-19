# Development Tasks — PB-P0-010 / US-122: Persistir AIRecommendation con metadata completa

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-122 |
| Source User Story | `management/user-stories/US-122-persist-ai-recommendation.md` |
| Source Technical Specification | `management/technical-specs/P0/PB-P0-010/US-122-technical-spec.md` |
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
| Backlog Alignment Status | Found |
| Task Breakdown Status | Ready for Sprint Planning |
| Created Date | 2026-06-17 |
| Last Updated | 2026-06-17 |

---

## 2. Source Validation

| Source | Found | Used | Notes |
|---|---|---|---|
| User Story | Yes | Yes | Aprobada con notas menores y lista para development tasks. |
| Technical Specification | Yes | Yes | Fuente primaria para el desglose. |
| Decision Resolution Artifact | No | No | No existe artifact; la User Story y la spec contienen decisiones aplicadas. |
| Product Backlog Prioritized | Yes | Yes | Encontrado como `management/artifacts/4-Product-Backlog-Prioritized.md`. |
| ADRs | Yes | Yes | Usadas vía spec, especialmente ADR-AI-001, ADR-AI-006, ADR-AI-007 y ADR-TEST-003. |

---

## 3. Backlog Execution Context

### Parent Backlog Item

PB-P0-010 entrega trazabilidad IA completa para EventFlow. US-121 provee prompt registry versionado y metadata `AIPromptVersion`; US-122 completa el backlog item con persistencia de `AIRecommendation` para que cada resultado IA validado quede auditable, reproducible y pendiente de validación humana.

### Execution Order Rationale

US-122 debe ejecutarse después de US-121 porque necesita `promptVersionId` y metadata de prompt válidos. También depende de PB-P0-001 para el schema/migraciones de `AIRecommendation`/`AIPromptVersion` y de PB-P0-009 para metadata de provider. Esta historia desbloquea features IA posteriores porque centraliza la persistencia HITL antes de exponer recomendaciones accionables.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-121 | Implementa `PromptRegistry` y metadata `AIPromptVersion` | 1 |
| US-122 | Implementa persistencia `AIRecommendation` con metadata completa | 2 |

---

## 4. Task Breakdown Summary

| Area | Number of Tasks | Notes |
|---|---:|---|
| Product / Analysis | 1 | Confirmar dependencias US-121/PB-P0-001/PB-P0-009 y límites HITL. |
| Database / Prisma | 2 | Compatibilidad schema y repository Prisma con transaction client. |
| Backend | 6 | Port, DTO, service, validators, sanitizer y errores controlados. |
| AI / PromptOps | 2 | Link obligatorio a prompt version y metadata provider/fallback/output validation. |
| Security / Authorization | 4 | Payload minimization, safe logs, backend-only y contexto para ownership downstream. |
| Observability / Audit | 2 | Logs seguros y correlation/error classification. |
| Seed / Demo Data | 1 | Compatibilidad con registros demo/seed trazables sin seed base obligatorio. |
| QA / Testing | 7 | Unit, integration, FK, transactions, invalid output, security y no side effects. |
| DevOps / Environment | 1 | CI sin providers externos ni secrets. |
| Documentation / Traceability | 2 | Lifecycle `status`/`accepted` y payload minimization/alignment. |
| Frontend | 0 | No aplica. |
| API Contract | 0 | No aplica. |
| **Total** | **28** | Ready for sprint planning. |

---

## 5. Traceability Matrix

| Acceptance Criterion | Technical Spec Section | Task IDs |
|---|---|---|
| AC-01 AIRecommendation repository persists required metadata | 6, 7, 10, 11, 18, 19 | TASK-PB-P0-010-US-122-PO-001, TASK-PB-P0-010-US-122-DB-001, TASK-PB-P0-010-US-122-BE-001, TASK-PB-P0-010-US-122-BE-002, TASK-PB-P0-010-US-122-BE-005, TASK-PB-P0-010-US-122-QA-001, TASK-PB-P0-010-US-122-QA-003 |
| AC-02 New recommendations start as pending HITL records | 6, 7, 10, 11, 12, 16, 18, 19 | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-QA-001, TASK-PB-P0-010-US-122-QA-007, TASK-PB-P0-010-US-122-DOC-001 |
| AC-03 Prompt version linkage is required | 6, 7, 10, 11, 13, 17, 18, 19 | TASK-PB-P0-010-US-122-AI-001, TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-QA-002, TASK-PB-P0-010-US-122-QA-003 |
| AC-04 Provider and fallback metadata are preserved | 6, 7, 11, 13, 17, 18, 19 | TASK-PB-P0-010-US-122-AI-002, TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-QA-004 |
| AC-05 Language and correlation metadata are stored | 6, 7, 10, 11, 14, 18, 19 | TASK-PB-P0-010-US-122-BE-002, TASK-PB-P0-010-US-122-OBS-001, TASK-PB-P0-010-US-122-QA-004 |
| AC-06 Input payload is minimized and sanitized | 6, 7, 11, 12, 13, 17, 18, 19 | TASK-PB-P0-010-US-122-BE-004, TASK-PB-P0-010-US-122-SEC-001, TASK-PB-P0-010-US-122-QA-005, TASK-PB-P0-010-US-122-DOC-002 |
| AC-07 Output payload is validated before successful persistence | 6, 7, 11, 12, 13, 17, 18, 19 | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-AI-002, TASK-PB-P0-010-US-122-QA-006 |
| AC-08 Controlled failure records are safe if supported | 6, 7, 10, 11, 12, 13, 16, 18, 19 | TASK-PB-P0-010-US-122-BE-006, TASK-PB-P0-010-US-122-SEC-002, TASK-PB-P0-010-US-122-QA-006 |
| AC-09 Ownership context is available for downstream authorization | 6, 7, 10, 12, 13, 18, 19 | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-SEC-003, TASK-PB-P0-010-US-122-QA-001 |
| AC-10 Tests verify persistence and no unsafe side effects | 13, 17, 18, 19 | TASK-PB-P0-010-US-122-QA-001, TASK-PB-P0-010-US-122-QA-002, TASK-PB-P0-010-US-122-QA-003, TASK-PB-P0-010-US-122-QA-004, TASK-PB-P0-010-US-122-QA-005, TASK-PB-P0-010-US-122-QA-006, TASK-PB-P0-010-US-122-QA-007 |

---

## 6. Development Tasks

### TASK-PB-P0-010-US-122-PO-001 — Confirmar dependencias y límite de persistencia HITL

| Field | Value |
|---|---|
| Area | Product / Analysis |
| Type | Review |
| Priority | Must |
| Estimate | XS |
| Depends On | None |
| Source AC(s) | AC-01, AC-02, AC-03 |
| Technical Spec Section(s) | 2, 3, 4, 10, 16, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Tech Lead |
| Status | To Do |

#### Objective

Confirmar que US-122 implementa sólo persistencia backend de `AIRecommendation`, usando metadata de US-121 y sin materializar dominio ni crear endpoints.

#### Scope

##### Include

- Verificar que US-121 entrega `promptVersionId`/metadata `AIPromptVersion`.
- Verificar disponibilidad de schema `AIRecommendation`/`AIPromptVersion` desde PB-P0-001.
- Confirmar que PB-P0-009 entrega provider metadata compatible.
- Confirmar out-of-scope: providers, fallback orchestration, endpoints, UI, accept/edit/discard y materialización.

##### Exclude

- Rediseñar schema sin gap formal.
- Crear tareas de PromptRegistry.
- Crear flujos feature-specific de IA.

#### Implementation Notes

Si falta una dependencia bloqueante, resolverla en la historia correspondiente antes de inventar contratos locales incompatibles.

#### Acceptance Criteria Covered

AC-01, AC-02, AC-03.

#### Definition of Done

- [ ] Dependencias US-121, PB-P0-001 y PB-P0-009 confirmadas.
- [ ] Límite de persistencia HITL queda explícito.
- [ ] No se agregan endpoints, UI ni materialización de entidades.

---

### TASK-PB-P0-010-US-122-DB-001 — Verificar compatibilidad del schema `AIRecommendation`

| Field | Value |
|---|---|
| Area | Database / Prisma |
| Type | Review |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-PO-001 |
| Source AC(s) | AC-01, AC-02, AC-03, AC-05 |
| Technical Spec Section(s) | 10, 16, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Validar que el schema Prisma existente soporta los campos necesarios para persistir `AIRecommendation` con trazabilidad completa.

#### Scope

##### Include

- Revisar campos de requester, context IDs, type, payloads, prompt version, provider, language, status/accepted, latency, timeout, fallback, correlation y timestamps.
- Verificar FKs a `User`, `AIPromptVersion` y contextos existentes.
- Documentar mapping `status=pending` vs `accepted=false` si aplica.
- Registrar gaps formales si faltan campos obligatorios.

##### Exclude

- Crear migraciones por preferencia.
- Rediseñar lifecycle HITL completo.
- Cambiar relaciones fuera de PB-P0-001 sin aprobación.

#### Implementation Notes

Si el schema sólo tiene `accepted` boolean, mapear pending a `accepted=false` y documentar la deuda para lifecycle enum.

#### Acceptance Criteria Covered

AC-01, AC-02, AC-03, AC-05.

#### Definition of Done

- [ ] Mapping de campos está claro.
- [ ] FKs y constraints relevantes quedan identificados.
- [ ] Gaps reales quedan registrados sin bloquear si hay equivalencia segura.

---

### TASK-PB-P0-010-US-122-DB-002 — Implementar `PrismaAIRecommendationRepository`

| Field | Value |
|---|---|
| Area | Database / Prisma |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-BE-001, TASK-PB-P0-010-US-122-DB-001 |
| Source AC(s) | AC-01, AC-03, AC-05 |
| Technical Spec Section(s) | 7, 10, 13, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Crear la implementación Prisma del repository para insertar `AIRecommendation` con soporte de transaction client.

#### Scope

##### Include

- Mapper DTO/domain -> Prisma.
- Inserción con `Prisma.TransactionClient` opcional.
- Validación o delegación de FK para `promptVersionId` y requester.
- Persistencia de metadata requerida según schema real.

##### Exclude

- Crear queries de dashboard/admin.
- Crear endpoint REST.
- Persistir entidades oficiales fuera de `AIRecommendation`.

#### Implementation Notes

Application debe depender del port, no de Prisma directamente. El repository debe respetar naming real del schema.

#### Acceptance Criteria Covered

AC-01, AC-03, AC-05.

#### Definition of Done

- [ ] Repository persiste record con Prisma.
- [ ] Transaction client opcional funciona.
- [ ] Mapper respeta schema real y FKs.

---

### TASK-PB-P0-010-US-122-BE-001 — Definir port `AIRecommendationRepository`

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-PO-001 |
| Source AC(s) | AC-01, AC-03 |
| Technical Spec Section(s) | 5, 7, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Definir el port de aplicación para crear `AIRecommendation` sin acoplar Application a Prisma.

#### Scope

##### Include

- Interface `AIRecommendationRepository`.
- Método `create(input, options?: { tx?: ... })`.
- Método `existsPromptVersion(promptVersionId)` si no se confía sólo en FK.
- Tipos de retorno alineados con domain/DTO existente.

##### Exclude

- Implementación Prisma en esta tarea.
- Métodos de accept/edit/discard.
- Métodos de lectura para frontend/dashboard.

#### Implementation Notes

Mantener Clean/Hexagonal: los use cases futuros deben depender de este port.

#### Acceptance Criteria Covered

AC-01, AC-03.

#### Definition of Done

- [ ] Port compila en Application/Domain.
- [ ] No depende de Prisma directo.
- [ ] Soporta transacción opcional como contrato.

---

### TASK-PB-P0-010-US-122-BE-002 — Definir `PersistAIRecommendationInput`

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-BE-001, TASK-PB-P0-010-US-122-DB-001 |
| Source AC(s) | AC-01, AC-04, AC-05, AC-09 |
| Technical Spec Section(s) | 6, 7, 10, 11, 12, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Crear el DTO/input interno que representa todos los datos necesarios para persistir una recomendación IA trazable.

#### Scope

##### Include

- `requestedByUserId`, `type`, context IDs aplicables y `promptVersionId`.
- `provider`, `languageCode`, `fallbackUsed`, `timeoutMs`, `latencyMs`, `correlationId`.
- `inputPayload`, `outputPayload`, `schemaValid` o marker equivalente.
- `tokenCount?`, `isSeed?`, `errorMetadata?` sólo si el schema soporta failure records.

##### Exclude

- DTO HTTP público.
- Prompt completo o raw provider response no validado.
- Campos de accept/edit/discard.

#### Implementation Notes

El input debe ser explícito para evitar inferencias silenciosas de provider/fallback/language.

#### Acceptance Criteria Covered

AC-01, AC-04, AC-05, AC-09.

#### Definition of Done

- [ ] DTO cubre metadata requerida.
- [ ] Campos opcionales tienen semántica clara.
- [ ] No expone API pública ni UI.

---

### TASK-PB-P0-010-US-122-BE-003 — Implementar `PersistAIRecommendationService`

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | L |
| Depends On | TASK-PB-P0-010-US-122-BE-002, TASK-PB-P0-010-US-122-DB-002, TASK-PB-P0-010-US-122-BE-004 |
| Source AC(s) | AC-01, AC-02, AC-03, AC-04, AC-07, AC-09 |
| Technical Spec Section(s) | 6, 7, 10, 11, 12, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Implementar el servicio de aplicación que valida metadata, normaliza estado HITL inicial, sanitiza payload y delega persistencia al repository.

#### Scope

##### Include

- Validar required fields.
- Validar prompt version existente o dejar FK controlada según patrón elegido.
- Exigir success sólo con `schemaValid=true` o equivalente.
- Normalizar `status=pending` y/o `accepted=false`.
- Validar context IDs requeridos por `AIRecommendationType`.
- Preservar provider/fallback/language/correlation metadata.
- Aceptar transaction client opcional.

##### Exclude

- Invocar providers.
- Orquestar fallback/retry/timeout.
- Materializar domain entities.
- Crear endpoints o UI.

#### Implementation Notes

Este servicio es el punto de entrada para use cases IA futuros; debe fallar antes de insertar ante metadata insegura o incompleta.

#### Acceptance Criteria Covered

AC-01, AC-02, AC-03, AC-04, AC-07, AC-09.

#### Definition of Done

- [ ] Service crea records válidos en estado pending.
- [ ] Invalid metadata/output falla antes de persistir.
- [ ] No hay side effects fuera de `AIRecommendation`.

---

### TASK-PB-P0-010-US-122-BE-004 — Implementar sanitizer de `inputPayload`

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-BE-002 |
| Source AC(s) | AC-06 |
| Technical Spec Section(s) | 6, 7, 11, 12, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Minimizar y sanitizar `inputPayload` antes de persistirlo para evitar secretos, tokens, cookies y PII innecesaria.

#### Scope

##### Include

- Allowlist/redaction común y extensible por feature.
- Remoción de API keys, auth tokens, cookies, raw credentials, private notes no requeridas y contacto innecesario.
- Rechazo o sanitización controlada de payloads inseguros.

##### Exclude

- DLP empresarial.
- Guardar full domain objects.
- Sanitizar output inválido; ese caso debe rechazarse o registrarse sólo como failure metadata segura.

#### Implementation Notes

Preferir allowlist por tipo de recomendación sobre blacklist genérica cuando haya contexto suficiente.

#### Acceptance Criteria Covered

AC-06.

#### Definition of Done

- [ ] Sanitizer remueve campos sensibles conocidos.
- [ ] Payload persistido queda minimizado.
- [ ] El comportamiento queda testeado.

---

### TASK-PB-P0-010-US-122-BE-005 — Implementar errores controlados de persistencia

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-BE-003 |
| Source AC(s) | AC-01, AC-03, AC-06, AC-07, AC-08 |
| Technical Spec Section(s) | 7, 12, 14, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Definir errores tipados para validación, prompt version faltante, payload inseguro, output inválido, contexto inválido y fallo de persistencia.

#### Scope

##### Include

- `AIRecommendationValidationError`.
- `AIPromptVersionNotFoundError`.
- `AIRecommendationUnsafePayloadError`.
- `AIRecommendationInvalidOutputError`.
- `AIRecommendationContextError`.
- `AIRecommendationPersistenceError`.
- Codes seguros para logs/tests.

##### Exclude

- Exponer payload completo en mensajes.
- Mapear errores a HTTP.
- Agregar error types de providers.

#### Implementation Notes

Los errores deben ser diferenciables por tests y seguros para logging.

#### Acceptance Criteria Covered

AC-01, AC-03, AC-06, AC-07, AC-08.

#### Definition of Done

- [ ] Errores son tipados o tienen codes estables.
- [ ] Mensajes no incluyen payload sensible.
- [ ] Tests pueden distinguir cada failure mode.

---

### TASK-PB-P0-010-US-122-BE-006 — Definir manejo de failure records seguros

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Should |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-DB-001 |
| Source AC(s) | AC-08 |
| Technical Spec Section(s) | 4, 6, 7, 10, 11, 12, 16, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Implementar o documentar explícitamente el patrón seguro para registrar fallos controlados cuando el schema lo soporte.

#### Scope

##### Include

- Guardar sólo metadata segura: error code, provider, prompt version, correlation id y timing.
- Evitar raw unsafe output y sensitive input.
- Si el schema no soporta failure records, retornar/loggear error sin persistir record de éxito.

##### Exclude

- Persistir output inválido como `pending`.
- Crear tabla nueva de errores sin gap formal.
- Implementar retry/fallback.

#### Implementation Notes

Esta tarea puede terminar en implementación o decisión técnica documentada según compatibilidad real del schema.

#### Acceptance Criteria Covered

AC-08.

#### Definition of Done

- [ ] Failure records no contienen raw unsafe output.
- [ ] Si no se soportan, el comportamiento seguro queda explícito.
- [ ] No se crea recomendación exitosa ante output inválido.

---

### TASK-PB-P0-010-US-122-AI-001 — Integrar validación de `promptVersionId`

| Field | Value |
|---|---|
| Area | AI / PromptOps |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-BE-003 |
| Source AC(s) | AC-03 |
| Technical Spec Section(s) | 6, 7, 10, 11, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | AI |
| Status | To Do |

#### Objective

Asegurar que toda recomendación persistida referencia una versión de prompt válida proveniente de US-121.

#### Scope

##### Include

- Validación de `promptVersionId` requerido.
- Verificación por FK o `existsPromptVersion`.
- Compatibilidad con prompts deprecated/archived para historial si ya existen.

##### Exclude

- Implementar `PromptRegistry`.
- Crear prompt versions.
- Resolver prompts por feature/language.

#### Implementation Notes

La validación debe preservar trazabilidad sin acoplar US-122 a implementación interna de PromptRegistry.

#### Acceptance Criteria Covered

AC-03.

#### Definition of Done

- [ ] Missing prompt version falla.
- [ ] Prompt version inválido falla.
- [ ] Records exitosos incluyen referencia válida.

---

### TASK-PB-P0-010-US-122-AI-002 — Validar metadata provider/fallback/output

| Field | Value |
|---|---|
| Area | AI / PromptOps |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-BE-003 |
| Source AC(s) | AC-04, AC-07 |
| Technical Spec Section(s) | 6, 7, 11, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | AI |
| Status | To Do |

#### Objective

Preservar metadata de ejecución IA y bloquear persistencia exitosa de output no validado.

#### Scope

##### Include

- Validar provider aprobado (`openai`, `mock`, `anthropic` sólo como stub/error metadata si aplica).
- Preservar `fallbackUsed`, `timeoutMs`, `latencyMs`.
- Requerir output validado para success.
- Detectar fallback metadata inconsistente.

##### Exclude

- Invocar provider.
- Implementar fallback orchestration.
- Ejecutar schema validation feature-specific desde cero si upstream ya entrega marker validado.

#### Implementation Notes

No inferir fallback desde contenido de output. La metadata debe venir explícita de la capa upstream.

#### Acceptance Criteria Covered

AC-04, AC-07.

#### Definition of Done

- [ ] Provider/fallback/timing se preservan.
- [ ] Output inválido no se persiste como success.
- [ ] Metadata inconsistente falla de forma controlada.

---

### TASK-PB-P0-010-US-122-SEC-001 — Aplicar payload minimization por allowlist

| Field | Value |
|---|---|
| Area | Security / Authorization |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-BE-004 |
| Source AC(s) | AC-06 |
| Technical Spec Section(s) | 11, 12, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Definir reglas de minimización seguras para evitar persistir información innecesaria o sensible.

#### Scope

##### Include

- Allowlists por `AIRecommendationType` cuando existan reglas claras.
- Redaction para tokens, cookies, secrets, credentials y contacto innecesario.
- Rechazo controlado de payloads que no puedan sanitizarse.

##### Exclude

- Construir prompts completos.
- Persistir full domain snapshots.
- Implementar políticas de autorización de lectura.

#### Implementation Notes

La minimización debe balancear auditabilidad con privacidad; guardar sólo lo necesario para reproducibilidad razonable.

#### Acceptance Criteria Covered

AC-06.

#### Definition of Done

- [ ] Allowlist/redaction se aplica antes de persistir.
- [ ] Secrets/PII innecesaria no queda en DB.
- [ ] Tests cubren campos sensibles comunes.

---

### TASK-PB-P0-010-US-122-SEC-002 — Asegurar logs y errores sin payload leakage

| Field | Value |
|---|---|
| Area | Security / Authorization |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-BE-005, TASK-PB-P0-010-US-122-OBS-001 |
| Source AC(s) | AC-06, AC-08 |
| Technical Spec Section(s) | 7, 12, 14, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Garantizar que logging y errores de persistencia no incluyan prompts completos, raw input/output, secrets ni PII.

#### Scope

##### Include

- Campos permitidos: `recommendationId`, `type`, `provider`, `fallbackUsed`, `latencyMs`, `timeoutMs`, `correlationId`, `status`, `errorCode`.
- Omitir full prompt, full input payload, raw provider output, tokens, cookies y credenciales.
- Tests o revisión de logger/error messages.

##### Exclude

- Crear stack de logging nuevo.
- Persistir `AdminAction`.
- Sanitizar logs de módulos externos.

#### Implementation Notes

Los logs deben ser útiles para debugging sin revelar contenido sensible de IA.

#### Acceptance Criteria Covered

AC-06, AC-08.

#### Definition of Done

- [ ] Logs sólo contienen metadata segura.
- [ ] Errores públicos no filtran payloads.
- [ ] Failure records siguen reglas de seguridad.

---

### TASK-PB-P0-010-US-122-SEC-003 — Validar contexto para authorization downstream

| Field | Value |
|---|---|
| Area | Security / Authorization |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-BE-003 |
| Source AC(s) | AC-09 |
| Technical Spec Section(s) | 6, 7, 10, 12, 13, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Asegurar que cada recommendation guarda contexto suficiente para que acciones futuras apliquen RBAC/ownership.

#### Scope

##### Include

- Reglas genéricas de context IDs requeridos por `AIRecommendationType`.
- Validar existencia/formato de context IDs provistos.
- Guardar `requestedByUserId`.
- Rechazar context inválido o insuficiente.

##### Exclude

- Implementar ownership checks completos de lectura/apply/discard.
- Crear endpoint de acciones HITL.
- Materializar entidades oficiales.

#### Implementation Notes

US-122 no sustituye authorization upstream; sólo preserva contexto confiable para enforcement posterior.

#### Acceptance Criteria Covered

AC-09.

#### Definition of Done

- [ ] Records contienen requester y context IDs aplicables.
- [ ] Context faltante para type requerido falla validation.
- [ ] Downstream puede usar los IDs para autorización.

---

### TASK-PB-P0-010-US-122-SEC-004 — Confirmar superficie backend-only sin API/UI

| Field | Value |
|---|---|
| Area | Security / Authorization |
| Type | Review |
| Priority | Must |
| Estimate | XS |
| Depends On | TASK-PB-P0-010-US-122-BE-003 |
| Source AC(s) | AC-02, AC-09 |
| Technical Spec Section(s) | 4, 8, 9, 12, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Tech Lead |
| Status | To Do |

#### Objective

Verificar que US-122 no expone creación directa de `AIRecommendation` desde frontend o REST API.

#### Scope

##### Include

- Revisar que no se crean routes/controllers.
- Revisar que no se crean componentes o pages frontend.
- Confirmar que sólo use cases backend futuros llaman el service.

##### Exclude

- Diseñar API de read/apply/discard.
- Crear RBAC endpoint-level.
- Crear UI de recomendaciones.

#### Implementation Notes

La ausencia de endpoint reduce riesgo de creación arbitraria; authorization se aplicará en use cases consumidores.

#### Acceptance Criteria Covered

AC-02, AC-09.

#### Definition of Done

- [ ] No hay endpoint nuevo.
- [ ] No hay UI nueva.
- [ ] Service permanece backend-only.

---

### TASK-PB-P0-010-US-122-OBS-001 — Emitir logs seguros de persistencia

| Field | Value |
|---|---|
| Area | Observability / Audit |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-BE-003 |
| Source AC(s) | AC-05, AC-08 |
| Technical Spec Section(s) | 7, 14, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Registrar éxito y fallo de persistencia con metadata segura para auditoría y debugging.

#### Scope

##### Include

- Evento `ai.recommendation.persisted`.
- Evento `ai.recommendation.persist_failed`.
- Metadata permitida: id, type, provider, fallback, latency, timeout, correlation, status, errorCode.

##### Exclude

- Métricas obligatorias nuevas.
- Payload completo.
- `AdminAction`.

#### Implementation Notes

Usar el logger/patrón de observability existente del backend.

#### Acceptance Criteria Covered

AC-05, AC-08.

#### Definition of Done

- [ ] Success/failure logs existen.
- [ ] Correlation ID se incluye cuando está disponible.
- [ ] Logs no exponen payload sensible.

---

### TASK-PB-P0-010-US-122-OBS-002 — Clasificar errores para tracking

| Field | Value |
|---|---|
| Area | Observability / Audit |
| Type | Implementation |
| Priority | Should |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-BE-005, TASK-PB-P0-010-US-122-OBS-001 |
| Source AC(s) | AC-03, AC-06, AC-07, AC-08 |
| Technical Spec Section(s) | 7, 14, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Distinguir errores de validation, missing FK, unsafe payload, invalid output y persistence failure.

#### Scope

##### Include

- Error codes consistentes en logs.
- Separación de fallas de validación vs DB/persistencia.
- Correlation ID en fallas cuando esté disponible.

##### Exclude

- Integrar proveedor externo de APM.
- Agregar alertas productivas.
- Exponer detalles internos a usuarios finales.

#### Implementation Notes

Esta clasificación debe ayudar a diagnosticar sin inspeccionar payloads.

#### Acceptance Criteria Covered

AC-03, AC-06, AC-07, AC-08.

#### Definition of Done

- [ ] Error codes son consistentes.
- [ ] Fallas principales quedan distinguibles.
- [ ] No se requieren payloads para debugging básico.

---

### TASK-PB-P0-010-US-122-SEED-001 — Verificar compatibilidad con demo/seed AIRecommendation

| Field | Value |
|---|---|
| Area | Seed / Demo Data |
| Type | Test |
| Priority | Should |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-DB-002 |
| Source AC(s) | AC-01, AC-03, AC-05 |
| Technical Spec Section(s) | 10, 15, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Confirmar que el service/repository permite crear registros demo trazables cuando historias seed/demo los necesiten.

#### Scope

##### Include

- Soporte a `isSeed` si el schema existe.
- Record demo con `promptVersionId`, provider, language y pending state.
- Compatibilidad con reset/transacciones de tests.

##### Exclude

- Crear seed base obligatorio para US-122.
- Crear evidence catalog.
- Ejecutar provider real.

#### Implementation Notes

US-122 no necesita seed inicial, pero no debe bloquear demo records futuros.

#### Acceptance Criteria Covered

AC-01, AC-03, AC-05.

#### Definition of Done

- [ ] Records demo pueden crearse con metadata completa.
- [ ] `isSeed` se preserva si existe.
- [ ] Tests no requieren red ni secrets.

---

### TASK-PB-P0-010-US-122-QA-001 — Probar persistencia exitosa y pending state

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-DB-002 |
| Source AC(s) | AC-01, AC-02, AC-09, AC-10 |
| Technical Spec Section(s) | 13, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Cubrir el happy path de creación de `AIRecommendation` con metadata completa y estado HITL inicial.

#### Scope

##### Include

- Required metadata persisted.
- `status=pending` y/o `accepted=false`.
- Requested user y context IDs aplicables.
- Timestamps creados por DB/service.

##### Exclude

- Endpoints REST.
- Frontend.
- Provider calls.

#### Implementation Notes

Combinar unit test del service con integration test Prisma si el setup lo permite.

#### Acceptance Criteria Covered

AC-01, AC-02, AC-09, AC-10.

#### Definition of Done

- [ ] Record exitoso contiene todos los campos requeridos.
- [ ] Estado inicial HITL es pending/no accepted.
- [ ] Contexto queda disponible para downstream authorization.

---

### TASK-PB-P0-010-US-122-QA-002 — Probar prompt version linkage obligatorio

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-AI-001 |
| Source AC(s) | AC-03, AC-10 |
| Technical Spec Section(s) | 10, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Validar que no se persisten recomendaciones sin `AIPromptVersion` válido.

#### Scope

##### Include

- Missing `promptVersionId` falla.
- Invalid/nonexistent prompt version falla.
- Valid prompt version persiste.
- Error seguro sin payload completo.

##### Exclude

- Crear prompt registry.
- Resolver prompt activo.
- Mutar prompt metadata.

#### Implementation Notes

Usar fixtures DB efímeras o mocks del repository según nivel de test.

#### Acceptance Criteria Covered

AC-03, AC-10.

#### Definition of Done

- [ ] Missing prompt version no crea record.
- [ ] Prompt version inexistente falla controladamente.
- [ ] FK/mapping válido queda probado.

---

### TASK-PB-P0-010-US-122-QA-003 — Probar integración Prisma y transaction client

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-DB-002 |
| Source AC(s) | AC-01, AC-03, AC-10 |
| Technical Spec Section(s) | 7, 10, 13, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Verificar inserción real con Prisma, FKs y soporte transaccional.

#### Scope

##### Include

- Insert success con user y prompt version válidos.
- Missing user o FK inválida falla.
- Uso de `Prisma.TransactionClient`.
- Rollback o aislamiento de test.

##### Exclude

- Tests E2E UI.
- Provider network calls.
- Crear migraciones nuevas.

#### Implementation Notes

Debe usar el patrón de integration tests DB existente del proyecto.

#### Acceptance Criteria Covered

AC-01, AC-03, AC-10.

#### Definition of Done

- [ ] Prisma insert funciona.
- [ ] FKs inválidas fallan.
- [ ] Transaction client queda verificado.

---

### TASK-PB-P0-010-US-122-QA-004 — Probar provider, fallback, language y correlation metadata

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-AI-002, TASK-PB-P0-010-US-122-OBS-001 |
| Source AC(s) | AC-04, AC-05, AC-10 |
| Technical Spec Section(s) | 11, 13, 14, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Comprobar que metadata de ejecución IA se preserva exactamente.

#### Scope

##### Include

- `provider`.
- `fallbackUsed`.
- `timeoutMs`.
- `latencyMs`.
- `languageCode`.
- `correlationId`.
- Caso fallback upstream con provider `mock`.

##### Exclude

- Ejecutar fallback real.
- Invocar OpenAI/Anthropic.
- Inferir metadata desde output.

#### Implementation Notes

La metadata debe venir del input del service y persistirse sin inferencias silenciosas.

#### Acceptance Criteria Covered

AC-04, AC-05, AC-10.

#### Definition of Done

- [ ] Provider/fallback/timing se preservan.
- [ ] Language/correlation se preservan.
- [ ] Metadata inconsistente falla o queda logueada controladamente.

---

### TASK-PB-P0-010-US-122-QA-005 — Probar sanitizer y redaction de payload

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-SEC-001 |
| Source AC(s) | AC-06, AC-10 |
| Technical Spec Section(s) | 12, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Validar que `inputPayload` persistido no contiene secretos, tokens, cookies, raw credentials ni PII innecesaria.

#### Scope

##### Include

- Payload con API key/token/cookie.
- Payload con contacto no requerido.
- Payload con full domain object.
- Verificación de allowlist/redaction.

##### Exclude

- DLP completo.
- Validar contenido semántico del output IA.
- Escanear módulos no relacionados.

#### Implementation Notes

Los tests deben inspeccionar el payload persistido, no sólo el output del sanitizer.

#### Acceptance Criteria Covered

AC-06, AC-10.

#### Definition of Done

- [ ] Datos sensibles se eliminan o redacted.
- [ ] Payload queda minimizado.
- [ ] No se persisten full unrelated domain objects.

---

### TASK-PB-P0-010-US-122-QA-006 — Probar rechazo de output inválido y failure records seguros

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-122-AI-002, TASK-PB-P0-010-US-122-BE-006 |
| Source AC(s) | AC-07, AC-08, AC-10 |
| Technical Spec Section(s) | 11, 12, 13, 16, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Garantizar que output no validado no se persiste como recomendación pending exitosa.

#### Scope

##### Include

- `schemaValid=false` o marker ausente falla.
- Raw unsafe provider output no queda persistido.
- Failure metadata segura se persiste sólo si el schema lo soporta.
- Error logs no contienen output completo.

##### Exclude

- Implementar schema validators feature-specific completos.
- Ejecutar providers.
- Crear retry/fallback.

#### Implementation Notes

Si el schema no soporta failure records, el resultado esperado es no crear record y loggear fallo seguro.

#### Acceptance Criteria Covered

AC-07, AC-08, AC-10.

#### Definition of Done

- [ ] Output inválido no crea success pending.
- [ ] Failure metadata, si existe, es segura.
- [ ] Raw provider output no se persiste.

---

### TASK-PB-P0-010-US-122-QA-007 — Probar ausencia de materialización de dominio

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-SEC-004 |
| Source AC(s) | AC-02, AC-10 |
| Technical Spec Section(s) | 4, 11, 12, 13, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Verificar que persistir una recomendación no crea ni modifica entidades oficiales del dominio.

#### Scope

##### Include

- No creación/modificación de `EventTask`, `BudgetItem`, `QuoteRequest`, `VendorProfile` u otros datos oficiales.
- Persistencia limitada a `AIRecommendation`.
- Pending/no accepted state.

##### Exclude

- Probar downstream accept/edit/discard.
- Crear endpoints HITL.
- Validar UI.

#### Implementation Notes

Usar assertions sobre conteos/estado de entidades relacionadas cuando existan fixtures.

#### Acceptance Criteria Covered

AC-02, AC-10.

#### Definition of Done

- [ ] Sólo se crea `AIRecommendation`.
- [ ] No hay side effects en entidades oficiales.
- [ ] HITL queda preservado.

---

### TASK-PB-P0-010-US-122-OPS-001 — Integrar tests de persistencia IA en CI

| Field | Value |
|---|---|
| Area | DevOps / Environment |
| Type | Setup |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-QA-001, TASK-PB-P0-010-US-122-QA-003, TASK-PB-P0-010-US-122-QA-005, TASK-PB-P0-010-US-122-QA-006 |
| Source AC(s) | AC-10 |
| Technical Spec Section(s) | 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | DevOps |
| Status | To Do |

#### Objective

Asegurar que unit/integration/security tests de US-122 corren en CI sin red externa ni secrets de providers.

#### Scope

##### Include

- Integrar tests al comando backend existente.
- DB test setup o transacciones según patrón actual.
- Confirmar que no se requiere `OPENAI_API_KEY` ni provider real.
- Redaction/invalid output tests en CI.

##### Exclude

- Crear pipeline desde cero si ya existe.
- Llamar OpenAI/Anthropic.
- Ejecutar E2E UI.

#### Implementation Notes

Usar Mock/no network. Si integration DB no está disponible en CI, documentar el comando requerido y fallback de tests unitarios.

#### Acceptance Criteria Covered

AC-10.

#### Definition of Done

- [ ] Tests críticos corren en CI.
- [ ] No se requieren provider secrets.
- [ ] CI falla ante unsafe payload/output inválido.

---

### TASK-PB-P0-010-US-122-DOC-001 — Documentar mapping `status` vs `accepted`

| Field | Value |
|---|---|
| Area | Documentation / Traceability |
| Type | Documentation |
| Priority | Should |
| Estimate | XS |
| Depends On | TASK-PB-P0-010-US-122-DB-001, TASK-PB-P0-010-US-122-BE-003 |
| Source AC(s) | AC-02 |
| Technical Spec Section(s) | 10, 16, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Tech Lead |
| Status | To Do |

#### Objective

Registrar la semántica usada para pending HITL cuando el schema real use `status`, `accepted` o ambos.

#### Scope

##### Include

- Mapping `status=pending` como semántica primaria.
- Equivalencia `accepted=false` si aplica.
- Nota de gap si lifecycle completo requiere tarea posterior.

##### Exclude

- Reescribir docs fuente sin workflow documental.
- Crear migración de lifecycle.
- Implementar accept/edit/discard.

#### Implementation Notes

La documentación puede ser nota técnica local o comentario de mapping, según patrón del repo.

#### Acceptance Criteria Covered

AC-02.

#### Definition of Done

- [ ] Semántica pending queda documentada.
- [ ] No contradice HITL.
- [ ] Gap documental no bloqueante queda claro.

---

### TASK-PB-P0-010-US-122-DOC-002 — Documentar minimización de payload y alignment

| Field | Value |
|---|---|
| Area | Documentation / Traceability |
| Type | Documentation |
| Priority | Should |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-122-SEC-001, TASK-PB-P0-010-US-122-BE-006 |
| Source AC(s) | AC-06, AC-08 |
| Technical Spec Section(s) | 12, 16, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-122 |
| Owner Role | Product Owner / Business Analyst |
| Status | To Do |

#### Objective

Dejar claras las reglas de payload minimization y el tratamiento de failure records seguros frente a diferencias documentales.

#### Scope

##### Include

- Reglas de no secrets, no tokens, no cookies, no raw prompts, no raw unsafe output.
- Failure records sólo con metadata segura si schema lo soporta.
- Accept/discard fuera de US-122 y pendiente de historias HITL.

##### Exclude

- Editar docs fuente sin solicitud explícita.
- Crear evidence catalog.
- Implementar workflows HITL.

#### Implementation Notes

Esta tarea preserva trazabilidad para auditoría y para features IA consumidoras.

#### Acceptance Criteria Covered

AC-06, AC-08.

#### Definition of Done

- [ ] Reglas de minimización quedan disponibles para developers.
- [ ] Alignment documental no bloqueante queda registrado.
- [ ] Failure record behavior queda claro.

---

## 7. Dependency Graph

| Task | Depends On |
|---|---|
| TASK-PB-P0-010-US-122-PO-001 | None |
| TASK-PB-P0-010-US-122-DB-001 | TASK-PB-P0-010-US-122-PO-001 |
| TASK-PB-P0-010-US-122-BE-001 | TASK-PB-P0-010-US-122-PO-001 |
| TASK-PB-P0-010-US-122-BE-002 | TASK-PB-P0-010-US-122-BE-001, TASK-PB-P0-010-US-122-DB-001 |
| TASK-PB-P0-010-US-122-BE-004 | TASK-PB-P0-010-US-122-BE-002 |
| TASK-PB-P0-010-US-122-DB-002 | TASK-PB-P0-010-US-122-BE-001, TASK-PB-P0-010-US-122-DB-001 |
| TASK-PB-P0-010-US-122-BE-003 | TASK-PB-P0-010-US-122-BE-002, TASK-PB-P0-010-US-122-DB-002, TASK-PB-P0-010-US-122-BE-004 |
| TASK-PB-P0-010-US-122-BE-005 | TASK-PB-P0-010-US-122-BE-003 |
| TASK-PB-P0-010-US-122-BE-006 | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-DB-001 |
| TASK-PB-P0-010-US-122-AI-001 | TASK-PB-P0-010-US-122-BE-003 |
| TASK-PB-P0-010-US-122-AI-002 | TASK-PB-P0-010-US-122-BE-003 |
| TASK-PB-P0-010-US-122-SEC-001 | TASK-PB-P0-010-US-122-BE-004 |
| TASK-PB-P0-010-US-122-OBS-001 | TASK-PB-P0-010-US-122-BE-003 |
| TASK-PB-P0-010-US-122-SEC-002 | TASK-PB-P0-010-US-122-BE-005, TASK-PB-P0-010-US-122-OBS-001 |
| TASK-PB-P0-010-US-122-SEC-003 | TASK-PB-P0-010-US-122-BE-003 |
| TASK-PB-P0-010-US-122-SEC-004 | TASK-PB-P0-010-US-122-BE-003 |
| TASK-PB-P0-010-US-122-OBS-002 | TASK-PB-P0-010-US-122-BE-005, TASK-PB-P0-010-US-122-OBS-001 |
| TASK-PB-P0-010-US-122-SEED-001 | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-DB-002 |
| TASK-PB-P0-010-US-122-QA-001 | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-DB-002 |
| TASK-PB-P0-010-US-122-QA-002 | TASK-PB-P0-010-US-122-AI-001 |
| TASK-PB-P0-010-US-122-QA-003 | TASK-PB-P0-010-US-122-DB-002 |
| TASK-PB-P0-010-US-122-QA-004 | TASK-PB-P0-010-US-122-AI-002, TASK-PB-P0-010-US-122-OBS-001 |
| TASK-PB-P0-010-US-122-QA-005 | TASK-PB-P0-010-US-122-SEC-001 |
| TASK-PB-P0-010-US-122-QA-006 | TASK-PB-P0-010-US-122-AI-002, TASK-PB-P0-010-US-122-BE-006 |
| TASK-PB-P0-010-US-122-QA-007 | TASK-PB-P0-010-US-122-BE-003, TASK-PB-P0-010-US-122-SEC-004 |
| TASK-PB-P0-010-US-122-OPS-001 | TASK-PB-P0-010-US-122-QA-001, TASK-PB-P0-010-US-122-QA-003, TASK-PB-P0-010-US-122-QA-005, TASK-PB-P0-010-US-122-QA-006 |
| TASK-PB-P0-010-US-122-DOC-001 | TASK-PB-P0-010-US-122-DB-001, TASK-PB-P0-010-US-122-BE-003 |
| TASK-PB-P0-010-US-122-DOC-002 | TASK-PB-P0-010-US-122-SEC-001, TASK-PB-P0-010-US-122-BE-006 |

---

## 8. Sprint Planning Notes

- Ejecutar después de US-121 para contar con metadata `AIPromptVersion`.
- Iniciar por schema compatibility, port y DTO antes de implementar service/repository.
- Tratar sanitizer y output validation marker como parte central, no como hardening posterior.
- Mantener sin endpoints, UI, providers ni materialización de entidades.
- No crear `tasks.md` consolidado para PB-P0-010 salvo solicitud explícita.

---

## 9. Out of Scope Reminder

- No implementar `PromptRegistry`.
- No invocar `LLMProvider`, OpenAI, MockAIProvider o Anthropic.
- No implementar timeout, retry, fallback orchestration ni provider selection.
- No implementar feature use cases IA.
- No crear API REST ni frontend.
- No implementar accept/edit/discard/reject ni materialización.
- No crear admin dashboard, evidence catalog, analytics, RAG, chatbot, agents, tool calling ni decisiones autónomas.

---

## 10. Final Readiness

| Check | Status |
|---|---|
| Technical Specification used | Yes |
| Product Backlog mapping found | Yes |
| User Story approved | Yes |
| Decision artifact required | No |
| All Acceptance Criteria mapped | Yes |
| QA tasks included | Yes |
| Security tasks included | Yes |
| Seed/demo tasks included | Yes |
| Documentation alignment noted | Yes |
| Ready for Sprint Planning | Yes |

## 11. Final Recommendation

`Ready for Sprint Planning`

US-122 puede pasar a planificación de sprint. La implementación debe concentrarse en port/repository/service de persistencia, metadata obligatoria, estado HITL pending, sanitización de payload, output validado, logs seguros, soporte transaccional y pruebas de integración, sin implementar providers, PromptRegistry, fallback orchestration, endpoints, UI ni materialización de entidades.
