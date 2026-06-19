# Development Tasks — PB-P0-010 / US-121: Implementar prompt registry versionado

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-121 |
| Source User Story | `management/user-stories/US-121-prompt-registry-versioned.md` |
| Source Technical Specification | `management/technical-specs/P0/PB-P0-010/US-121-technical-spec.md` |
| Decision Resolution Artifact | No aplica - no existe artifact; se usan `PO/BA Decisions Applied` de la User Story aprobada y ADR-AI-006 |
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
| Decision Resolution Artifact | No | No | No existe artifact; las decisiones están aplicadas en la User Story y la spec. |
| Product Backlog Prioritized | Yes | Yes | Encontrado como `management/artifacts/4-Product-Backlog-Prioritized.md`. |
| ADRs | Yes | Yes | Usadas vía spec, especialmente ADR-AI-001, ADR-AI-006, ADR-AI-007 y ADR-TEST-003. |

---

## 3. Backlog Execution Context

### Parent Backlog Item

PB-P0-010 entrega la base de trazabilidad IA: prompt registry estático versionado, metadata `AIPromptVersion` y persistencia posterior de `AIRecommendation`. US-121 cubre la primera mitad del backlog item: resolución y validación de prompts versionados con metadata reproducible.

### Execution Order Rationale

US-121 debe ejecutarse después de PB-P0-001 y PB-P0-009 porque depende del modelo `AIPromptVersion`, tipos compartidos de IA y contratos base como `LanguageCode`/`AIContext`. Debe completarse antes de US-122 para que la persistencia de `AIRecommendation` pueda referenciar un `prompt_version_id` determinístico.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-121 | Implementa `PromptRegistry`, templates versionados y metadata `AIPromptVersion` | 1 |
| US-122 | Persiste `AIRecommendation` usando metadata de prompt/provider/output | 2 |

---

## 4. Task Breakdown Summary

| Area | Number of Tasks | Notes |
|---|---:|---|
| Product / Analysis | 1 | Confirmar contratos previos, estrategia híbrida y límites MVP. |
| Backend | 5 | Tipos, errores, registry, validaciones y hash/version discipline. |
| Database / Prisma | 1 | Mapear `AIPromptVersion` sin rediseñar schema. |
| AI / PromptOps | 3 | Templates MVP, safety constraints y bloqueo de Future/P4 active. |
| Security / Authorization | 3 | No secrets/PII, safe logs y ausencia de endpoints/editabilidad dinámica. |
| Seed / Demo Data | 2 | Export/sync determinístico e idempotencia para demo/US-122. |
| Observability / Audit | 1 | Eventos seguros de fallas de validación/resolución. |
| QA / Testing | 6 | Resolución, errores, metadata, hash drift, sync/export y seguridad. |
| Documentation / Traceability | 2 | Guía de versionado y registro de alignment documental. |
| Frontend | 0 | No aplica. |
| API Contract | 0 | No aplica. |
| DevOps / Environment | 1 | CI checks de PromptOps. |
| **Total** | **25** | Ready for sprint planning. |

---

## 5. Traceability Matrix

| Acceptance Criterion | Technical Spec Section | Task IDs |
|---|---|---|
| AC-01 Static PromptRegistry resolves active prompts | 6, 7, 11, 18, 19 | TASK-PB-P0-010-US-121-PO-001, TASK-PB-P0-010-US-121-BE-001, TASK-PB-P0-010-US-121-BE-002, TASK-PB-P0-010-US-121-BE-003, TASK-PB-P0-010-US-121-QA-001 |
| AC-02 Specific prompt versions are reproducible | 6, 7, 11, 17, 18, 19 | TASK-PB-P0-010-US-121-BE-002, TASK-PB-P0-010-US-121-BE-003, TASK-PB-P0-010-US-121-QA-001 |
| AC-03 Active uniqueness is enforced | 6, 7, 11, 13, 17, 18, 19 | TASK-PB-P0-010-US-121-BE-003, TASK-PB-P0-010-US-121-QA-002, TASK-PB-P0-010-US-121-OPS-001 |
| AC-04 Unsupported feature/language/version fails safely | 6, 7, 11, 12, 13, 18, 19 | TASK-PB-P0-010-US-121-BE-001, TASK-PB-P0-010-US-121-BE-002, TASK-PB-P0-010-US-121-QA-003 |
| AC-05 Prompt templates include required PromptOps metadata | 6, 7, 10, 11, 13, 18, 19 | TASK-PB-P0-010-US-121-BE-001, TASK-PB-P0-010-US-121-AI-001, TASK-PB-P0-010-US-121-QA-004 |
| AC-06 Prompt safety constraints are explicit | 11, 12, 13, 17, 18, 19 | TASK-PB-P0-010-US-121-AI-002, TASK-PB-P0-010-US-121-SEC-001, TASK-PB-P0-010-US-121-QA-006 |
| AC-07 AIPromptVersion metadata is synchronized or exported | 10, 11, 13, 15, 17, 18, 19 | TASK-PB-P0-010-US-121-DB-001, TASK-PB-P0-010-US-121-SEED-001, TASK-PB-P0-010-US-121-SEED-002, TASK-PB-P0-010-US-121-QA-005 |
| AC-08 Prompt changes require version discipline | 7, 11, 13, 17, 18, 19 | TASK-PB-P0-010-US-121-BE-004, TASK-PB-P0-010-US-121-QA-004, TASK-PB-P0-010-US-121-OPS-001, TASK-PB-P0-010-US-121-DOC-001 |
| AC-09 Future/P4 prompts are not active | 4, 7, 11, 13, 17, 18, 19 | TASK-PB-P0-010-US-121-AI-003, TASK-PB-P0-010-US-121-QA-006 |
| AC-10 Tests cover registry behavior and safety | 13, 17, 18, 19 | TASK-PB-P0-010-US-121-QA-001, TASK-PB-P0-010-US-121-QA-002, TASK-PB-P0-010-US-121-QA-003, TASK-PB-P0-010-US-121-QA-004, TASK-PB-P0-010-US-121-QA-005, TASK-PB-P0-010-US-121-QA-006 |

---

## 6. Development Tasks

### TASK-PB-P0-010-US-121-PO-001 — Confirmar contratos previos y límites PromptOps

| Field | Value |
|---|---|
| Area | Product / Analysis |
| Type | Review |
| Priority | Must |
| Estimate | XS |
| Depends On | None |
| Source AC(s) | AC-01, AC-07 |
| Technical Spec Section(s) | 2, 3, 4, 10, 16, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Tech Lead |
| Status | To Do |

#### Objective

Confirmar que US-121 se implementa como PromptOps foundation bajo ADR-AI-006 y que las dependencias PB-P0-001/PB-P0-009 están disponibles.

#### Scope

##### Include

- Verificar disponibilidad del modelo/tabla `AIPromptVersion` o su mapping equivalente.
- Verificar disponibilidad de tipos compartidos de IA como `LanguageCode`, `AIContext` y errores tipados.
- Confirmar que US-121 no invoca providers, no crea endpoints, no persiste `AIRecommendation` y no habilita edición dinámica.

##### Exclude

- Cambiar schema Prisma sin gap formal.
- Reabrir ADR-AI-006.
- Crear tareas de persistencia `AIRecommendation`; pertenecen a US-122.

#### Implementation Notes

Si el schema real difiere de la spec, documentar el mapping y escalar sólo si falta un campo bloqueante para trazabilidad.

#### Acceptance Criteria Covered

AC-01, AC-07.

#### Definition of Done

- [ ] Dependencias PB-P0-001 y PB-P0-009 confirmadas.
- [ ] Estrategia híbrida registry en código + metadata `AIPromptVersion` confirmada.
- [ ] Límites MVP documentados para el equipo.

---

### TASK-PB-P0-010-US-121-BE-001 — Definir tipos y errores de `PromptRegistry`

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-PO-001 |
| Source AC(s) | AC-01, AC-04, AC-05 |
| Technical Spec Section(s) | 7, 11, 12, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Crear los tipos base y errores controlados que soportan resolución, validación y fallas seguras del registry.

#### Scope

##### Include

- Tipos `PromptTemplate`, `PromptTemplateMetadata`, `PromptTemplateStatus`, `PromptVersionPolicy` y `AIPromptVersionMetadata`.
- Errores tipados o diferenciables por code: `PROMPT_NOT_FOUND`, `PROMPT_DUPLICATE_ACTIVE`, `PROMPT_UNSUPPORTED_LANGUAGE`, `PROMPT_INVALID_METADATA`, `PROMPT_HASH_DRIFT`, `PROMPT_FUTURE_FEATURE_ACTIVE`.
- Campos mínimos de metadata: IDs, version, feature, language support, schema refs, hash, status, reviewers, changelog y safety constraints.

##### Exclude

- Implementar provider LLM.
- Crear DTOs HTTP o endpoints.
- Persistir recomendaciones IA.

#### Implementation Notes

Los errores no deben incluir prompt completo, input completo, secretos ni datos personales.

#### Acceptance Criteria Covered

AC-01, AC-04, AC-05.

#### Definition of Done

- [ ] Tipos compilan y son reutilizables por registry y tests.
- [ ] Errores tienen codes estables y testeables.
- [ ] Metadata requerida queda representada en tipos.

---

### TASK-PB-P0-010-US-121-BE-002 — Implementar resolución `active` y `specific`

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-BE-001 |
| Source AC(s) | AC-01, AC-02, AC-04 |
| Technical Spec Section(s) | 6, 7, 11, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Implementar `PromptRegistry.resolve(...)` para obtener prompts activos o versiones específicas sin fallback silencioso.

#### Scope

##### Include

- Resolución por `featureType`, `languageCode` y `versionPolicy="active"`.
- Resolución por stable prompt ID y/o versión específica para auditoría/replay.
- Exclusión de `deprecated`/`archived` en active resolution.
- Error controlado para feature, language o versión inexistente.

##### Exclude

- Fallback automático de idioma o prompt.
- Invocar `LLMProvider`.
- Validar outputs IA runtime.

#### Implementation Notes

El registry debe ser consumible por use cases futuros desde Application sin acoplarse a SDKs externos.

#### Acceptance Criteria Covered

AC-01, AC-02, AC-04.

#### Definition of Done

- [ ] Active resolution retorna exactamente un template activo.
- [ ] Specific resolution recupera versiones históricas permitidas.
- [ ] Unsupported/missing requests fallan con error controlado.

---

### TASK-PB-P0-010-US-121-BE-003 — Implementar builder y validación de registry

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-BE-002 |
| Source AC(s) | AC-01, AC-02, AC-03, AC-05 |
| Technical Spec Section(s) | 7, 11, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Centralizar la carga y validación de prompts para fallar fast ante configuración inválida.

#### Scope

##### Include

- `prompt-version-loader`, builder o constructor validado.
- Validación de unicidad de `id` y `(promptId, version)`.
- Validación de una sola versión `active` por `(featureType, languageCode)`.
- Validación de metadata obligatoria y lifecycle status.

##### Exclude

- Editor dinámico de prompts desde DB.
- Repositorio mutable de prompts.
- Fallback de datos faltantes en runtime.

#### Implementation Notes

La validación puede ejecutarse en bootstrap, test setup o script/check de CI según el patrón existente.

#### Acceptance Criteria Covered

AC-01, AC-02, AC-03, AC-05.

#### Definition of Done

- [ ] Duplicados active fallan fast.
- [ ] Metadata incompleta falla con error claro.
- [ ] Registry inválido no puede usarse para resolución runtime.

---

### TASK-PB-P0-010-US-121-BE-004 — Implementar hash/checksum y version discipline

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-BE-003 |
| Source AC(s) | AC-05, AC-08 |
| Technical Spec Section(s) | 7, 11, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Detectar mutación silenciosa de prompts mediante hash/checksum sobre contenido relevante y metadata versionada.

#### Scope

##### Include

- Cálculo o validación de `templateHash`.
- Comparación de hash declarado contra contenido relevante.
- Error `PROMPT_HASH_DRIFT` o equivalente.
- Reglas para exigir nueva versión ante cambios de comportamiento, schemas, safety, language support o business rules.

##### Exclude

- Automatizar release management.
- Generar migraciones por cada cambio de prompt.
- Permitir mutación silenciosa de versiones activas existentes.

#### Implementation Notes

El hash debe evitar campos volátiles que generen ruido, pero cubrir instrucciones, reglas, schemas y constraints relevantes.

#### Acceptance Criteria Covered

AC-05, AC-08.

#### Definition of Done

- [ ] Cambios relevantes producen drift detectable.
- [ ] Hash inválido bloquea validación/CI.
- [ ] La regla de nueva versión queda testeada.

---

### TASK-PB-P0-010-US-121-BE-005 — Exponer export de metadata `AIPromptVersion`

| Field | Value |
|---|---|
| Area | Backend |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-BE-004, TASK-PB-P0-010-US-121-DB-001 |
| Source AC(s) | AC-07 |
| Technical Spec Section(s) | 7, 10, 11, 15, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Exponer metadata determinística de versiones de prompt para seed/sync y consumo posterior de US-122.

#### Scope

##### Include

- Función/export `exportAIPromptVersionMetadata()` o equivalente.
- Mapping de prompts activos MVP a IDs/version/hash/schema refs.
- Inclusión de status, feature type, supported languages, change reason y reviewers.
- Falla controlada ante metadata incompleta o duplicada.

##### Exclude

- Persistir cada generación IA.
- Crear repositorio dinámico de prompts.
- Crear endpoints para consultar prompts.

#### Implementation Notes

La salida debe ser estable para CI/demo y compatible con el modelo real disponible.

#### Acceptance Criteria Covered

AC-07.

#### Definition of Done

- [ ] Metadata exportada es determinística.
- [ ] US-122 puede usar IDs/version/hash para `prompt_version_id`.
- [ ] No se expone contenido completo del prompt donde no sea necesario.

---

### TASK-PB-P0-010-US-121-DB-001 — Mapear `AIPromptVersion` sin rediseñar schema

| Field | Value |
|---|---|
| Area | Database / Prisma |
| Type | Review |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-PO-001 |
| Source AC(s) | AC-07 |
| Technical Spec Section(s) | 10, 15, 16, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Confirmar cómo se mapea la metadata del registry al modelo `AIPromptVersion` existente o equivalente.

#### Scope

##### Include

- Revisar campos disponibles: prompt ID, version, feature type, status, language support, schema refs, template hash, reviewers y timestamps.
- Documentar equivalencias si el schema usa nombres distintos.
- Identificar gaps bloqueantes antes de implementar sync/seed.

##### Exclude

- Crear migraciones nuevas por preferencia.
- Rediseñar `AIRecommendation`.
- Cambiar constraints ya definidas por PB-P0-001 sin decisión formal.

#### Implementation Notes

Si la tabla no existe en la rama actual, mantener export metadata como patrón MVP y registrar el gap.

#### Acceptance Criteria Covered

AC-07.

#### Definition of Done

- [ ] Mapping `PromptTemplate` -> `AIPromptVersion` queda claro.
- [ ] No se rediseña el schema fuera de alcance.
- [ ] Gaps reales quedan identificados para Tech Lead.

---

### TASK-PB-P0-010-US-121-AI-001 — Crear templates MVP iniciales con metadata completa

| Field | Value |
|---|---|
| Area | AI / PromptOps |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-BE-003 |
| Source AC(s) | AC-01, AC-05 |
| Technical Spec Section(s) | 4, 7, 11, 13, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | AI |
| Status | To Do |

#### Objective

Registrar los prompts MVP iniciales en código con IDs estables, versión, lifecycle y metadata completa.

#### Scope

##### Include

- Templates bajo estructura de `ai-assistance`/PromptOps.
- `featureType`, `languageSupport`, `inputSchemaRef`, `outputSchemaRef`, status y hash.
- Changelog, change reason, created/reviewer metadata y related rules.
- Skeletons seguros si el contenido final de una feature aún no existe.

##### Exclude

- Prompts P4/Future activos.
- Contenido con datos reales o secretos.
- Ejecutar generación IA real.

#### Implementation Notes

Si un schema de input/output todavía no existe, usar referencia estable aprobada y hacer que validation refleje el estado según el alcance de la feature.

#### Acceptance Criteria Covered

AC-01, AC-05.

#### Definition of Done

- [ ] Prompts MVP iniciales están registrados en código.
- [ ] Cada prompt tiene metadata completa.
- [ ] No hay prompts Future/P4 activos.

---

### TASK-PB-P0-010-US-121-AI-002 — Definir safety constraints obligatorias

| Field | Value |
|---|---|
| Area | AI / PromptOps |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-AI-001 |
| Source AC(s) | AC-06 |
| Technical Spec Section(s) | 11, 12, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | AI |
| Status | To Do |

#### Objective

Asegurar que todos los prompts activos incluyan reglas de seguridad y human-in-the-loop.

#### Scope

##### Include

- JSON-only output instruction.
- User content boundary.
- Payload minimization.
- HITL reminder.
- Prohibiciones de decisiones autónomas, claims legales/contractuales/pagos, disponibilidad inventada y currency conversion no soportada.

##### Exclude

- Output validation runtime.
- Moderación autónoma.
- RAG, tools o agents.

#### Implementation Notes

Las constraints deben ser metadata/estructura validable, no sólo texto informal difícil de testear.

#### Acceptance Criteria Covered

AC-06.

#### Definition of Done

- [ ] Cada prompt active tiene safety constraints explícitas.
- [ ] HITL queda presente en prompts activos.
- [ ] Las constraints pueden verificarse por test.

---

### TASK-PB-P0-010-US-121-AI-003 — Bloquear prompts Future/P4 en estado active

| Field | Value |
|---|---|
| Area | AI / PromptOps |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-AI-001 |
| Source AC(s) | AC-09 |
| Technical Spec Section(s) | 4, 7, 11, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | AI |
| Status | To Do |

#### Objective

Prevenir que features fuera del MVP se sirvan como prompts activos.

#### Scope

##### Include

- Allowlist o clasificación MVP para `featureType`.
- Error `PROMPT_FUTURE_FEATURE_ACTIVE` o equivalente.
- Validación para vendor bio/package generation y otros P4/Future mencionados en docs.

##### Exclude

- Promover features Future al MVP.
- Implementar contenido de vendor bio/package generation.
- Crear mecanismo de feature flags para IA futura.

#### Implementation Notes

Un prompt Future puede existir como draft/skeleton si es útil, pero no debe resolverse por `active`.

#### Acceptance Criteria Covered

AC-09.

#### Definition of Done

- [ ] Future/P4 active falla validation.
- [ ] La regla está cubierta por test.
- [ ] No se introduce scope creep IA.

---

### TASK-PB-P0-010-US-121-SEC-001 — Escanear prompts contra secrets y PII real

| Field | Value |
|---|---|
| Area | Security / Authorization |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-AI-001 |
| Source AC(s) | AC-06, AC-10 |
| Technical Spec Section(s) | 11, 12, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Evitar que templates, fixtures o metadata incluyan secretos, tokens, cookies o ejemplos con PII real.

#### Scope

##### Include

- Checks de patrones secret-like en prompts.
- Revisión de examples para que sean sintéticos.
- Validación de no API keys/tokens/cookies.

##### Exclude

- Implementar DLP empresarial.
- Bloquear todo texto parecido a nombre propio si es claramente sintético.
- Escanear repositorio completo fuera del área PromptOps salvo patrón existente.

#### Implementation Notes

El check puede vivir como test de seguridad o helper de validation ejecutado en CI.

#### Acceptance Criteria Covered

AC-06, AC-10.

#### Definition of Done

- [ ] Prompts no contienen secrets ni PII real.
- [ ] Existe cobertura automática o checklist verificable.
- [ ] Los fixtures usan datos sintéticos.

---

### TASK-PB-P0-010-US-121-SEC-002 — Asegurar logs y errores sin prompt leakage

| Field | Value |
|---|---|
| Area | Security / Authorization |
| Type | Implementation |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-BE-001, TASK-PB-P0-010-US-121-OBS-001 |
| Source AC(s) | AC-04, AC-06 |
| Technical Spec Section(s) | 7, 12, 14, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Garantizar que fallas de resolución/validación no expongan prompt completo, payload completo, secrets ni PII.

#### Scope

##### Include

- Metadata permitida: `featureType`, `languageCode`, `promptId`, `version`, `errorCode`.
- Mensajes de error claros pero seguros.
- Sanitización u omisión de contenido sensible en logs.

##### Exclude

- Persistir `AdminAction`.
- Crear observability stack nuevo.
- Registrar user payloads de llamadas IA futuras.

#### Implementation Notes

Aunque US-121 no procesa requests de usuario, los errores deben estar listos para uso seguro en runtime futuro.

#### Acceptance Criteria Covered

AC-04, AC-06.

#### Definition of Done

- [ ] Errores no exponen prompt completo.
- [ ] Logs usan sólo metadata segura.
- [ ] Fallas siguen siendo diagnosticables por code.

---

### TASK-PB-P0-010-US-121-SEC-003 — Verificar ausencia de endpoints y edición dinámica

| Field | Value |
|---|---|
| Area | Security / Authorization |
| Type | Review |
| Priority | Must |
| Estimate | XS |
| Depends On | TASK-PB-P0-010-US-121-BE-005 |
| Source AC(s) | AC-01, AC-06 |
| Technical Spec Section(s) | 4, 8, 9, 12, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Tech Lead |
| Status | To Do |

#### Objective

Confirmar que US-121 permanece como infraestructura backend-only sin superficie HTTP/UI ni edición dinámica de prompts.

#### Scope

##### Include

- Verificar que no se crean rutas REST.
- Verificar que no se crean pantallas/admin UI.
- Verificar que prompts no se editan desde DB ni panel.

##### Exclude

- Diseñar admin PromptOps UI.
- Crear permisos RBAC para prompt editing.
- Exponer prompt content al frontend.

#### Implementation Notes

La edición de prompts en MVP se realiza por cambio de código y nueva versión, conforme ADR-AI-006.

#### Acceptance Criteria Covered

AC-01, AC-06.

#### Definition of Done

- [ ] No hay endpoints nuevos.
- [ ] No hay UI de administración de prompts.
- [ ] No hay edición dinámica de prompts en runtime.

---

### TASK-PB-P0-010-US-121-SEED-001 — Implementar seed/sync o export determinístico

| Field | Value |
|---|---|
| Area | Seed / Demo Data |
| Type | Implementation |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-BE-005 |
| Source AC(s) | AC-07 |
| Technical Spec Section(s) | 10, 15, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Crear el mecanismo aprobado para que metadata `AIPromptVersion` esté disponible para demo, CI y US-122.

#### Scope

##### Include

- Seed idempotente si `AIPromptVersion` existe y el proyecto usa persistencia.
- Export estático determinístico si el patrón vigente es registry-only.
- Validación de IDs, version, hash, status y schema refs.

##### Exclude

- Borrar versiones históricas referenciadas.
- Persistir `AIRecommendation`.
- Crear datos de prompt con PII real.

#### Implementation Notes

Preferir el patrón ya usado por el proyecto. Si se usa DB, el proceso no debe mutar versiones históricas silenciosamente.

#### Acceptance Criteria Covered

AC-07.

#### Definition of Done

- [ ] Metadata de prompts activos queda disponible para US-122.
- [ ] Seed/export es determinístico.
- [ ] No se borran ni mutan versiones históricas silenciosamente.

---

### TASK-PB-P0-010-US-121-SEED-002 — Validar idempotencia e integridad demo

| Field | Value |
|---|---|
| Area | Seed / Demo Data |
| Type | Test |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-SEED-001 |
| Source AC(s) | AC-07 |
| Technical Spec Section(s) | 15, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Comprobar que la metadata de prompts se puede regenerar o sincronizar sin duplicados ni drift.

#### Scope

##### Include

- Ejecutar seed/sync/export más de una vez.
- Verificar IDs determinísticos.
- Verificar que no se activan prompts Future/P4.
- Confirmar que US-122 puede referenciar metadata resultante.

##### Exclude

- Ejecutar flujos E2E de generación IA.
- Crear recomendaciones IA.
- Requerir provider secrets o red externa.

#### Implementation Notes

Esta tarea puede implementarse como test automatizado o checklist técnico reproducible en CI.

#### Acceptance Criteria Covered

AC-07.

#### Definition of Done

- [ ] Seed/sync/export es idempotente.
- [ ] No hay duplicados active.
- [ ] IDs/hash/version quedan estables entre ejecuciones.

---

### TASK-PB-P0-010-US-121-OBS-001 — Registrar eventos seguros de validación fallida

| Field | Value |
|---|---|
| Area | Observability / Audit |
| Type | Implementation |
| Priority | Should |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-BE-003 |
| Source AC(s) | AC-03, AC-04, AC-06 |
| Technical Spec Section(s) | 7, 12, 14, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Backend |
| Status | To Do |

#### Objective

Emitir logs/eventos seguros para fallas de validación o resolución de PromptRegistry.

#### Scope

##### Include

- Evento sugerido `ai.prompt_registry.validation_failed`.
- Campos seguros: `featureType`, `languageCode`, `promptId`, `version`, `errorCode`.
- Clasificación de errores para debugging.

##### Exclude

- Métricas obligatorias nuevas.
- `AdminAction`.
- Loggear prompt completo o user payload.

#### Implementation Notes

Si el proyecto no tiene logger estructurado, implementar el mínimo compatible con el patrón existente.

#### Acceptance Criteria Covered

AC-03, AC-04, AC-06.

#### Definition of Done

- [ ] Fallas importantes dejan metadata diagnóstica segura.
- [ ] Logs no contienen prompt completo ni payloads.
- [ ] Error codes son visibles para debugging.

---

### TASK-PB-P0-010-US-121-QA-001 — Probar resolución active y specific

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-BE-002, TASK-PB-P0-010-US-121-AI-001 |
| Source AC(s) | AC-01, AC-02, AC-10 |
| Technical Spec Section(s) | 13, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Cubrir con tests unitarios la resolución correcta de prompts activos e históricos.

#### Scope

##### Include

- Active prompt por `featureType` y `languageCode`.
- Specific version por prompt ID/version.
- Deprecated/archived resuelven sólo por specific.
- Metadata básica presente en resultado.

##### Exclude

- Invocar providers LLM.
- Probar endpoints REST.
- Probar frontend.

#### Implementation Notes

Usar Vitest o framework de tests backend vigente.

#### Acceptance Criteria Covered

AC-01, AC-02, AC-10.

#### Definition of Done

- [ ] Active resolution retorna exactamente una versión activa.
- [ ] Specific resolution reproduce versión histórica.
- [ ] Deprecated/archived no aparecen en active resolution.

---

### TASK-PB-P0-010-US-121-QA-002 — Probar duplicate active rejection

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-BE-003 |
| Source AC(s) | AC-03, AC-10 |
| Technical Spec Section(s) | 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Verificar que el registry falla fast cuando existen dos prompts activos para el mismo `(featureType, languageCode)`.

#### Scope

##### Include

- Fixture con duplicado active.
- Assertion de error `PROMPT_DUPLICATE_ACTIVE` o equivalente.
- Verificación de metadata segura en error/log.

##### Exclude

- Resolver duplicados automáticamente.
- Fallback a versión más reciente.
- Mutar fixtures durante test.

#### Implementation Notes

El test debe construir registry aislado con fixtures controladas.

#### Acceptance Criteria Covered

AC-03, AC-10.

#### Definition of Done

- [ ] Duplicado active falla initialization/validation.
- [ ] Error es claro y testeable.
- [ ] No hay fallback silencioso.

---

### TASK-PB-P0-010-US-121-QA-003 — Probar errores de feature, idioma y versión no soportados

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-BE-002 |
| Source AC(s) | AC-04, AC-10 |
| Technical Spec Section(s) | 7, 13, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Validar que solicitudes inválidas fallan de forma segura y diferenciable.

#### Scope

##### Include

- Feature inexistente.
- `languageCode` no soportado.
- Stable prompt ID/version desconocida.
- Confirmar que no hay fallback de idioma o prompt.

##### Exclude

- Mapear errores a HTTP.
- Implementar fallback de producto.
- Traducir mensajes para UI.

#### Implementation Notes

Estos errores serán consumidos por use cases futuros; deben ser consistentes.

#### Acceptance Criteria Covered

AC-04, AC-10.

#### Definition of Done

- [ ] Cada caso inválido produce error aprobado.
- [ ] No hay fallback silencioso.
- [ ] Error no filtra contenido sensible.

---

### TASK-PB-P0-010-US-121-QA-004 — Probar metadata requerida y hash drift

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-BE-004, TASK-PB-P0-010-US-121-AI-001 |
| Source AC(s) | AC-05, AC-08, AC-10 |
| Technical Spec Section(s) | 7, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Cubrir validación de metadata obligatoria y detección de cambios sin nueva versión.

#### Scope

##### Include

- Missing schema refs.
- Missing reviewer/approval metadata para active.
- Missing safety constraints o HITL.
- Hash/checksum drift.
- Cambio de contenido relevante sin update de versión/hash.

##### Exclude

- Validación semántica completa de prompt quality.
- Ejecutar prompts contra modelos IA.
- Aprobar contenido de negocio final.

#### Implementation Notes

Usar fixtures pequeñas para aislar cada error.

#### Acceptance Criteria Covered

AC-05, AC-08, AC-10.

#### Definition of Done

- [ ] Metadata incompleta falla validation.
- [ ] Hash drift falla validation/CI.
- [ ] Version discipline queda cubierta por tests.

---

### TASK-PB-P0-010-US-121-QA-005 — Probar sync/export `AIPromptVersion`

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-BE-005, TASK-PB-P0-010-US-121-SEED-001 |
| Source AC(s) | AC-07, AC-10 |
| Technical Spec Section(s) | 10, 13, 15, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Validar que metadata `AIPromptVersion` se sincroniza o exporta correctamente.

#### Scope

##### Include

- Matching entre prompt code y metadata exportada/persistida.
- Missing row/metadata falla check.
- Mismatched ID/hash/version falla check.
- Duplicate active metadata falla check.

##### Exclude

- Crear `AIRecommendation`.
- Testear acceptance/rejection HITL.
- Usar provider externo.

#### Implementation Notes

Si se usa Prisma, preferir test integration aislado. Si se usa export estático, validar el artifact generado.

#### Acceptance Criteria Covered

AC-07, AC-10.

#### Definition of Done

- [ ] Metadata coincide con prompts activos.
- [ ] Missing/mismatch/duplicate falla.
- [ ] Test no requiere red ni secrets.

---

### TASK-PB-P0-010-US-121-QA-006 — Probar safety constraints y bloqueo Future/P4

| Field | Value |
|---|---|
| Area | QA / Testing |
| Type | Test |
| Priority | Must |
| Estimate | M |
| Depends On | TASK-PB-P0-010-US-121-AI-002, TASK-PB-P0-010-US-121-AI-003, TASK-PB-P0-010-US-121-SEC-001 |
| Source AC(s) | AC-06, AC-09, AC-10 |
| Technical Spec Section(s) | 11, 12, 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | QA |
| Status | To Do |

#### Objective

Automatizar verificación de safety PromptOps y scope MVP.

#### Scope

##### Include

- JSON-only instruction.
- HITL reminder.
- User content boundary.
- No autonomous decision language.
- No legal/contract/payment claims vinculantes.
- No Future/P4 prompts en active.
- No secret-like strings ni PII real.

##### Exclude

- Evaluación LLM de calidad.
- Moderación automática de prompts.
- Promover P4/Future.

#### Implementation Notes

Combinar assertions estructurales con checks de texto mínimos donde sea necesario.

#### Acceptance Criteria Covered

AC-06, AC-09, AC-10.

#### Definition of Done

- [ ] Safety constraints obligatorias quedan cubiertas.
- [ ] Future/P4 active falla.
- [ ] Prompts no contienen secrets ni PII real.

---

### TASK-PB-P0-010-US-121-OPS-001 — Integrar checks PromptOps en CI

| Field | Value |
|---|---|
| Area | DevOps / Environment |
| Type | Setup |
| Priority | Must |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-QA-001, TASK-PB-P0-010-US-121-QA-004, TASK-PB-P0-010-US-121-QA-005, TASK-PB-P0-010-US-121-QA-006 |
| Source AC(s) | AC-03, AC-07, AC-08, AC-10 |
| Technical Spec Section(s) | 13, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | DevOps |
| Status | To Do |

#### Objective

Asegurar que validaciones críticas de PromptOps se ejecutan automáticamente en CI.

#### Scope

##### Include

- Test command existente o nuevo script de validation registry.
- Checks de duplicate active, hash drift, metadata sync/export, no secrets/PII y no Future/P4 active.
- Ejecución sin provider secrets ni red externa.

##### Exclude

- Crear pipeline nuevo desde cero si ya existe uno.
- Agregar dependencias externas innecesarias.
- Ejecutar llamadas a OpenAI/Anthropic.

#### Implementation Notes

Preferir integrarse al flujo Vitest/CI existente del backend.

#### Acceptance Criteria Covered

AC-03, AC-07, AC-08, AC-10.

#### Definition of Done

- [ ] CI falla ante registry inválido.
- [ ] CI no requiere secrets ni red.
- [ ] Checks críticos quedan documentados en comando/script.

---

### TASK-PB-P0-010-US-121-DOC-001 — Documentar disciplina de versionado de prompts

| Field | Value |
|---|---|
| Area | Documentation / Traceability |
| Type | Documentation |
| Priority | Should |
| Estimate | S |
| Depends On | TASK-PB-P0-010-US-121-BE-004, TASK-PB-P0-010-US-121-AI-001 |
| Source AC(s) | AC-05, AC-08 |
| Technical Spec Section(s) | 16, 17, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Tech Lead |
| Status | To Do |

#### Objective

Dejar una guía breve para crear, aprobar, activar, deprecar y archivar versiones de prompt.

#### Scope

##### Include

- Cuándo crear nueva versión.
- Metadata requerida.
- Reglas de reviewers/approval.
- Cómo correr validation/hash checks.
- Relación con `AIPromptVersion` y US-122.

##### Exclude

- Reescribir documentación fuente extensa.
- Crear manual de PromptOps enterprise.
- Cambiar ADR-AI-006.

#### Implementation Notes

Puede vivir como README local del módulo PromptOps o nota técnica alineada con el patrón del repo.

#### Acceptance Criteria Covered

AC-05, AC-08.

#### Definition of Done

- [ ] Guía de versionado está disponible para developers.
- [ ] Reglas de hash/nueva versión son claras.
- [ ] No contradice ADR-AI-006.

---

### TASK-PB-P0-010-US-121-DOC-002 — Registrar alignment documental pendiente

| Field | Value |
|---|---|
| Area | Documentation / Traceability |
| Type | Documentation |
| Priority | Should |
| Estimate | XS |
| Depends On | TASK-PB-P0-010-US-121-DOC-001 |
| Source AC(s) | AC-07, AC-08 |
| Technical Spec Section(s) | 16, 18, 19 |
| Backlog ID | PB-P0-010 |
| User Story ID | US-121 |
| Owner Role | Product Owner / Business Analyst |
| Status | To Do |

#### Objective

Registrar que US-121 aplica la estrategia híbrida formalizada aunque algunos documentos antiguos describan `AIPromptVersion` como opcional/recommended.

#### Scope

##### Include

- Señalar alignment requerido entre docs/6, docs/14, docs/17 y ADR-AI-006.
- Confirmar que la implementación usa registry estático + metadata `AIPromptVersion`.
- Mantener FR-AI-018/BR-AI-010 como trazabilidad principal.

##### Exclude

- Bloquear implementación por divergencia no bloqueante.
- Editar documentos fuente sin workflow documental explícito.
- Cambiar Product Backlog.

#### Implementation Notes

Esta tarea es de trazabilidad; no debe generar cambios de scope técnico.

#### Acceptance Criteria Covered

AC-07, AC-08.

#### Definition of Done

- [ ] Alignment documental pendiente queda registrado.
- [ ] No bloquea implementación.
- [ ] Trazabilidad principal queda clara para US-121/US-122.

---

## 7. Dependency Graph

| Task | Depends On |
|---|---|
| TASK-PB-P0-010-US-121-PO-001 | None |
| TASK-PB-P0-010-US-121-BE-001 | TASK-PB-P0-010-US-121-PO-001 |
| TASK-PB-P0-010-US-121-DB-001 | TASK-PB-P0-010-US-121-PO-001 |
| TASK-PB-P0-010-US-121-BE-002 | TASK-PB-P0-010-US-121-BE-001 |
| TASK-PB-P0-010-US-121-BE-003 | TASK-PB-P0-010-US-121-BE-002 |
| TASK-PB-P0-010-US-121-BE-004 | TASK-PB-P0-010-US-121-BE-003 |
| TASK-PB-P0-010-US-121-AI-001 | TASK-PB-P0-010-US-121-BE-003 |
| TASK-PB-P0-010-US-121-AI-002 | TASK-PB-P0-010-US-121-AI-001 |
| TASK-PB-P0-010-US-121-AI-003 | TASK-PB-P0-010-US-121-AI-001 |
| TASK-PB-P0-010-US-121-BE-005 | TASK-PB-P0-010-US-121-BE-004, TASK-PB-P0-010-US-121-DB-001 |
| TASK-PB-P0-010-US-121-SEED-001 | TASK-PB-P0-010-US-121-BE-005 |
| TASK-PB-P0-010-US-121-SEED-002 | TASK-PB-P0-010-US-121-SEED-001 |
| TASK-PB-P0-010-US-121-OBS-001 | TASK-PB-P0-010-US-121-BE-003 |
| TASK-PB-P0-010-US-121-SEC-001 | TASK-PB-P0-010-US-121-AI-001 |
| TASK-PB-P0-010-US-121-SEC-002 | TASK-PB-P0-010-US-121-BE-001, TASK-PB-P0-010-US-121-OBS-001 |
| TASK-PB-P0-010-US-121-SEC-003 | TASK-PB-P0-010-US-121-BE-005 |
| TASK-PB-P0-010-US-121-QA-001 | TASK-PB-P0-010-US-121-BE-002, TASK-PB-P0-010-US-121-AI-001 |
| TASK-PB-P0-010-US-121-QA-002 | TASK-PB-P0-010-US-121-BE-003 |
| TASK-PB-P0-010-US-121-QA-003 | TASK-PB-P0-010-US-121-BE-002 |
| TASK-PB-P0-010-US-121-QA-004 | TASK-PB-P0-010-US-121-BE-004, TASK-PB-P0-010-US-121-AI-001 |
| TASK-PB-P0-010-US-121-QA-005 | TASK-PB-P0-010-US-121-BE-005, TASK-PB-P0-010-US-121-SEED-001 |
| TASK-PB-P0-010-US-121-QA-006 | TASK-PB-P0-010-US-121-AI-002, TASK-PB-P0-010-US-121-AI-003, TASK-PB-P0-010-US-121-SEC-001 |
| TASK-PB-P0-010-US-121-OPS-001 | TASK-PB-P0-010-US-121-QA-001, TASK-PB-P0-010-US-121-QA-004, TASK-PB-P0-010-US-121-QA-005, TASK-PB-P0-010-US-121-QA-006 |
| TASK-PB-P0-010-US-121-DOC-001 | TASK-PB-P0-010-US-121-BE-004, TASK-PB-P0-010-US-121-AI-001 |
| TASK-PB-P0-010-US-121-DOC-002 | TASK-PB-P0-010-US-121-DOC-001 |

---

## 8. Sprint Planning Notes

- Ejecutar primero PO/DB/Backend foundation para evitar retrabajo en prompts.
- Mantener `PromptRegistry` backend-only, sin endpoint ni UI.
- No bloquear por divergencias documentales no bloqueantes; seguir la spec y ADR-AI-006.
- Coordinar con US-122 para validar que `prompt_version_id` y metadata exportada son consumibles.
- No crear `tasks.md` consolidado para PB-P0-010 salvo solicitud explícita.

---

## 9. Out of Scope Reminder

- No persistir `AIRecommendation`.
- No invocar `LLMProvider`, OpenAI, MockAIProvider o Anthropic.
- No crear timeout/retry/fallback runtime.
- No crear REST API ni frontend.
- No crear admin UI ni edición dinámica de prompts.
- No activar prompts P4/Future.
- No implementar RAG, agents, tool calling ni decisiones autónomas.

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

US-121 puede pasar a planificación de sprint. La implementación debe enfocarse en un `PromptRegistry` estático, versionado y validado, metadata `AIPromptVersion` reproducible, safety constraints, seed/export determinístico y CI checks, sin introducir ejecución LLM, endpoints, UI, persistencia `AIRecommendation` ni edición dinámica de prompts.
