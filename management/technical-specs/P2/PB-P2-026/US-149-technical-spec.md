# Technical Specification — US-149: Documentar prompts y outputs ejemplares

## 1. Metadata

| Field | Value |
|---|---|
| User Story ID | US-149 |
| Source User Story | `management/user-stories/US-149-document-prompt-outputs.md` |
| Decision Resolution Artifact | No aplica (no existe `management/user-stories/decision-resolutions/US-149-decision-resolution.md`) |
| Priority | P2 |
| Backlog ID | PB-P2-026 |
| Backlog Title | Catálogo de prompts y outputs ejemplares |
| Backlog Execution Order | P2 — Item 26 (último de la sección P2, tras PB-P2-025) |
| User Story Position in Backlog Item | 1 de 1 |
| Related User Stories in Backlog Item | US-149 (única) |
| Epic | EPIC-ACAD-001 — Academic Traceability |
| Backlog Item Dependencies | PB-P0-010 (Prompt Registry & AIRecommendation Persistence) |
| Feature | Prompts ejemplares |
| Module / Domain | Demo / Académica / AI (PromptOps) |
| User Story Status | Approved with Minor Notes |
| Backlog Alignment Status | Found |
| Technical Spec Status | Ready for Task Breakdown |
| Created Date | 2026-07-07 |
| Last Updated | 2026-07-07 |

---

## 2. Backlog Execution Context

### Product Backlog Item

**PB-P2-026 — Catálogo de prompts y outputs ejemplares** (P2, Should Have, EPIC-ACAD-001). Su objetivo es mantener `management/artifacts/AI-Prompt-Evidence-Catalog.md` con prompts versionados por feature IA, ejemplos de input/output sanitizados y trazabilidad a `AIPromptVersion` y a IDs de `AIRecommendation` reales. Entrega valor académico: evidencia clave para la rúbrica AI4Devs de PromptOps responsable. Depende de PB-P0-010 (Prompt Registry y persistencia de `AIRecommendation`), fuente de versiones e IDs.

### Execution Order Rationale

US-149 se ejecuta en la fase P2 (Should Have), después de que la infraestructura de PromptOps (PB-P0-010) exista y de que las 7 features IA del MVP hayan producido `AIRecommendation` reales. No bloquea funcionalidad de runtime: es un artefacto documental que consume datos ya existentes. Por decisión del Product Owner, el ítem canónico de entrega es **PB-P2-026** (crear/mantener el catálogo con ≥1 ejemplo por feature); **PB-P3-010** (depende de PB-P2-026) lo completa posteriormente con ejemplos representativos como historia separada.

### Related User Stories in Same Backlog Item

| User Story | Role in Backlog Item | Suggested Order |
|---|---|---|
| US-149 | Creación/mantenimiento del catálogo con ≥1 ejemplo por feature IA | 1 |

---

## 3. Executive Technical Summary

Se debe crear y mantener un artefacto Markdown, `management/artifacts/AI-Prompt-Evidence-Catalog.md`, que documente para cada una de las **7 features IA del MVP** (AI-001 plan, AI-002 checklist, AI-003 presupuesto, AI-004 categorías, AI-005 brief, AI-006 resumen comparativo, AI-008 priorización) al menos un ejemplo compuesto por: el prompt versionado, un input de ejemplo sanitizado, un output de ejemplo sanitizado, la referencia a `AIPromptVersion` (`prompt_version_id` / `promptVersion`) y los IDs de `AIRecommendation` de ejecuciones reales.

No hay código de producción, endpoints, ni cambios de esquema. El trabajo técnico es: (1) definir la estructura y plantilla del catálogo; (2) extraer versiones de prompts del Prompt Registry y ejemplos de `input_payload`/`output_payload` desde registros `AIRecommendation` reales (solo lectura); (3) aplicar sanitización obligatoria (sin PII, sin secretos, sin `OPENAI_API_KEY`) con validación humana (human-in-the-loop); (4) documentar el proceso de sanitización/sincronización para mantener el catálogo vivo; y (5) opcionalmente, una verificación de cobertura por feature (por ejemplo, un check de documentación o CI). El catálogo evidencia PromptOps responsable: versionado de prompts (ADR-AI-006), human-in-the-loop (ADR-AI-005) y abstracción de proveedor (ADR-AI-001).

---

## 4. Scope Boundary

### In Scope

- Crear/mantener `management/artifacts/AI-Prompt-Evidence-Catalog.md`.
- ≥1 ejemplo por feature IA del MVP (7 features): prompt + input/output sanitizado.
- Prompt versionado por feature (referencia a `AIPromptVersion` / `promptVersion` / `prompt_version_id`).
- Trazabilidad a IDs de `AIRecommendation` de ejecuciones reales (solo lectura/referencia).
- Sanitización obligatoria (sin PII, sin secretos, sin `OPENAI_API_KEY`).
- Documentar el proceso de sincronización/sanitización (catálogo vivo).
- Evidencia explícita de PromptOps responsable (versionado, human-in-the-loop, abstracción de proveedor).

### Out of Scope

- Completar el catálogo con **todos** los ejemplos representativos por feature (PB-P3-010, historia separada).
- Autoría de nuevos prompts o cambios de la estrategia de PromptOps.
- Invocación de IA en runtime.
- Índice de ADRs (US-147) y matriz de trazabilidad US/FRD/UC (US-148).
- AI-007 (bio/paquetes del proveedor, Could Have) por no formar parte de las 7 features del MVP.

### Explicit Non-Goals

- No crear entidades, endpoints, migraciones ni componentes de UI.
- No persistir nuevos `AIRecommendation` ni modificar `AIPromptVersion`.
- No ejecutar `LLMProvider` ni ningún proveedor de IA.
- No modificar la ordenación del Product Backlog.

---

## 5. Architecture Alignment

### Backend Architecture

No aplica. La historia no introduce ni modifica use cases, controllers, servicios ni repositorios. Las entidades `AIPromptVersion` y `AIRecommendation` (Doc 6, Doc 17) se usan únicamente como **fuente de datos de solo lectura** para extraer versiones e IDs de ejemplo.

### Frontend Architecture

No aplica. El entregable es un documento Markdown; no hay rutas, páginas ni componentes.

### Database Architecture

No aplica (sin cambios de esquema). Se realiza consulta de solo lectura sobre `ai_prompt_versions` y `ai_recommendations` para obtener ejemplos reales; la extracción es manual/curada, no un acceso programático de runtime.

### API Architecture

No aplica.

### AI / PromptOps Architecture

Central para el valor de la historia. El catálogo documenta la evidencia de PromptOps ya definida en Doc 17: `LLMProvider` abstraction (ADR-AI-001), versionado de prompts vía Prompt Registry y `AIPromptVersion` (ADR-AI-006), human-in-the-loop obligatorio (ADR-AI-005), y persistencia de `AIRecommendation` con `type`, `llm_provider`, `prompt_version_id`, `language_code`, `input_payload`, `output_payload`, `accepted`, `edited`, `fallback_used` (BR-AI-007/010). No se ejecuta IA; solo se referencia.

### Security Architecture

Aplica como **sanitización de datos documentales**. Debe cumplir Doc 19: sin secretos (`OPENAI_API_KEY`, etc.) ni PII real en el catálogo ni en logs (SEC-01..03). La sanitización es un gate obligatorio previo a la inclusión, con validación humana.

### Testing Architecture

Verificación de tipo documentación/seguridad: cobertura ≥1 ejemplo por feature (7), presencia de referencias `promptVersion` + `AIRecommendation` por ejemplo, y ausencia de PII/secretos. Sin pruebas unitarias/integración de código; opcionalmente, un check de cobertura/secret-scan en CI.

---

## 6. Functional Interpretation

| Acceptance Criterion | Technical Interpretation | Impacted Layer(s) |
|---|---|---|
| AC-01: Catálogo con un ejemplo por feature IA | El archivo `AI-Prompt-Evidence-Catalog.md` debe contener ≥1 sección por cada una de las 7 features (AI-001..AI-006, AI-008), cada una con prompt + input/output sanitizado. | Documentación / AI-PromptOps |
| AC-02: Trazabilidad a AIPromptVersion y AIRecommendation | Cada ejemplo debe citar el `prompt_version_id`/`promptVersion` y uno o más IDs de `AIRecommendation` reales. | Documentación / AI-PromptOps (lectura DB) |
| AC-03: Datos sanitizados | Los payloads de input/output se enmascaran: sin PII, sin secretos, sin `OPENAI_API_KEY`. | Seguridad / Documentación |
| AC-04: Catálogo vivo | Se documenta un proceso de sincronización ante cambios de prompt/feature; el catálogo no queda desactualizado. | Documentación / Proceso |
| AC-05: Evidencia de PromptOps responsable | El catálogo referencia explícitamente versionado (ADR-AI-006), human-in-the-loop (ADR-AI-005) y abstracción de proveedor (ADR-AI-001). | Documentación / AI-PromptOps |

---

## 7. Backend Technical Design

No aplica. No se crean ni modifican módulos, use cases, controllers, DTOs, repositorios, validaciones de runtime, transacciones ni observabilidad de backend. El único contacto con backend/datos es una **lectura curada** de `ai_prompt_versions` y `ai_recommendations` para poblar ejemplos, realizada fuera del runtime de la aplicación.

---

## 8. Frontend Technical Design

No aplica.

---

## 9. API Contract Design

No aplica.

---

## 10. Database / Prisma Design

### Models Impacted

Solo lectura/referencia (sin cambios de esquema):

- `AIPromptVersion` (`ai_prompt_versions`) — fuente del identificador de versión del prompt por feature.
- `AIRecommendation` (`ai_recommendations`) — fuente de IDs, `type`, `llm_provider`, `prompt_version_id`, `input_payload`, `output_payload`, `fallback_used` de ejecuciones reales.

### Fields / Columns

No se agregan ni modifican columnas.

### Relations

Sin cambios. Se aprovecha la relación existente `AIRecommendation.prompt_version_id → AIPromptVersion`.

### Indexes

No aplica.

### Constraints

No aplica.

### Migrations Impact

Ninguno. No se generan migraciones.

### Seed Impact

No requiere seed nuevo. Los ejemplos deben provenir de `AIRecommendation` reales; si se usan datos de seed/demo, deben estar igualmente sanitizados.

---

## 11. AI / PromptOps Design

### AI Feature

Cobertura documental de las 7 features IA del MVP: AI-001 (plan de evento), AI-002 (checklist), AI-003 (distribución de presupuesto), AI-004 (categorías de proveedor), AI-005 (brief de cotización), AI-006 (resumen comparativo) y AI-008 (priorización de tareas). AI-007 queda fuera por no ser parte del MVP.

### Provider

Referencia a `LLMProvider` (ADR-AI-001): `OpenAIProvider` (principal), `MockAIProvider` (obligatorio), `AnthropicProvider` (stub/futuro). El catálogo evidencia la abstracción; no invoca proveedores.

### Prompt Version

Cada ejemplo cita el `prompt_version_id` de `AIPromptVersion` (Prompt Registry, ADR-AI-006).

### Input Schema

Ejemplo de `input_payload` por feature, en su forma sanitizada (estructura conforme al schema de la feature, valores enmascarados).

### Output Schema

Ejemplo de `output_payload` por feature, sanitizado y conforme al schema esperado de la feature (JSON validado en runtime, aquí solo documentado).

### Human-in-the-loop

Obligatorio (ADR-AI-005, BR-AI-001): la sanitización y curación del catálogo requiere validación humana (AI Engineer / PO) antes de incluir cualquier ejemplo.

### Fallback

No aplica en runtime. Opcionalmente, se puede documentar un ejemplo con `fallback_used=true` como evidencia de BR-AI-009 (timeout/fallback).

### Persistence

No persiste nuevos `AIRecommendation`; solo referencia IDs existentes.

### Safety Rules

Sin PII ni secretos en el catálogo (SEC-02/03). Sanitización previa obligatoria. Sin decisiones autónomas de IA (fuera de alcance del artefacto).

---

## 12. Security & Authorization Design

### Authentication

No aplica (artefacto de repositorio).

### Authorization

Mantenimiento del catálogo bajo rol AI Engineer / PO. No hay autorización de runtime que implementar.

### Ownership Rules

No aplica.

### Role Rules

Curación/aprobación del catálogo por AI Engineer / PO (proceso, no RBAC de aplicación).

### Negative Authorization Scenarios

- Inclusión de PII/secretos sin sanitizar → bloqueo (no se incluye).
- Configuración insegura o exposición de `OPENAI_API_KEY` → bloqueo.

### Audit Requirements

No requiere `AdminAction`. Sin secretos/PII en logs.

### Sensitive Data Handling

Sanitización obligatoria de `input_payload`/`output_payload`: enmascarar/reemplazar PII (nombres, correos, teléfonos, direcciones) y eliminar cualquier secreto/API key antes de la inclusión. Revisión humana previa (EC-01).

---

## 13. Testing Strategy

### Unit Tests

No aplica (sin código de runtime).

### Integration Tests

No aplica.

### API Tests

No aplica.

### E2E Tests

No aplica.

### Security Tests

- Verificación de ausencia de secretos/PII en `AI-Prompt-Evidence-Catalog.md` (revisión manual y, opcionalmente, secret-scan automatizado). Corresponde a TS-03 / NT-02.

### Accessibility Tests

No aplica (documento Markdown).

### AI Tests

No aplica (no ejecuta IA en runtime).

### Seed / Demo Tests

No aplica directamente; si se citan datos de demo, deben estar sanitizados.

### CI Checks

Opcional (confirmar con Tech Lead): check de cobertura por feature (7 secciones presentes) y secret-scan sobre el archivo del catálogo. Corresponde a TS-01/TS-02 y a la nota de aprobación no bloqueante.

**Trazabilidad de escenarios de la User Story:** TS-01 (cobertura), TS-02 (trazabilidad `promptVersion`+`AIRecommendation`), TS-03 (sanitización), NT-01 (feature sin ejemplo → incompleta), NT-02 (PII/secreto sin sanitizar → bloqueado), AUTH-TS-01 (catálogo generado/actualizado → success).

---

## 14. Observability & Audit

### Logs

Sin secretos/PII en logs (SEC-03).

### Correlation ID

No aplica a nivel de catálogo.

### AdminAction

No requerido.

### Error Tracking

No aplica.

### Metrics

No aplica (opcional: métrica de cobertura de features documentadas si se automatiza en CI).

---

## 15. Seed / Demo Data Impact

### Seed Data Required

Ninguno nuevo.

### Demo Scenario Supported

El catálogo se anexa al reporte académico final como evidencia de PromptOps responsable para la rúbrica AI4Devs.

### Reset / Isolation Notes

No aplica.

---

## 16. Documentation Alignment Required

| Document / Source | Conflict | Current Decision | Recommended Action | Blocks Implementation? |
|---|---|---|---|---|
| Backlog (PB-P2-026 vs PB-P3-010) | US-149 aparece en dos ítems de backlog | Ítem canónico de entrega = PB-P2-026 (decisión PO, registrada en la US y en el backlog) | Ninguna; decisión ya formalizada | No |

`No additional documentation alignment issues detected.`

---

## 17. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Fuga de PII/secretos al copiar payloads reales | Alto (seguridad/privacidad) | Sanitización obligatoria + revisión humana previa (EC-01, SEC-02/03); opcional secret-scan en CI. |
| Catálogo desactualizado ante cambios de prompt/feature | Medio (evidencia académica desactualizada) | Documentar proceso de sincronización (AC-04); opcional check de cobertura en CI. |
| `AIRecommendation` reales no disponibles al documentar | Medio (falta de trazabilidad) | Requiere PB-P0-010 operativo; si faltan ejecuciones reales para una feature, señalar como incompleta (EC-02/NT-01) en lugar de inventar IDs. |
| Confusión de alcance con PB-P3-010 | Bajo | Alcance explícito: US-149 = ≥1 ejemplo por feature; PB-P3-010 = ejemplos representativos completos. |

---

## 18. Implementation Guidance for Coding Agents

**Archivos/carpetas impactados:**
- Crear: `management/artifacts/AI-Prompt-Evidence-Catalog.md` (nuevo).
- (Opcional) check de cobertura/secret-scan en la configuración de CI existente, solo si el Tech Lead lo aprueba.

**Orden recomendado de implementación:**
1. Definir la plantilla del catálogo: una sección por feature (AI-001..AI-006, AI-008) con campos: Feature, `prompt_version_id`/`promptVersion`, prompt versionado, input sanitizado, output sanitizado, IDs de `AIRecommendation`, notas.
2. Extraer, por feature, la versión de prompt vigente (Prompt Registry / `AIPromptVersion`) y ejemplos reales de `AIRecommendation` (`input_payload`/`output_payload`).
3. Sanitizar input/output (enmascarar PII, eliminar secretos) — gate humano obligatorio.
4. Rellenar la sección de evidencia de PromptOps responsable con referencias a ADR-AI-001, ADR-AI-005, ADR-AI-006.
5. Documentar el proceso de sincronización/sanitización (cómo se actualiza el catálogo ante cambios).
6. (Opcional) añadir verificación de cobertura por feature y secret-scan en CI.

**Decisiones que no deben reabrirse:**
- Ítem canónico = PB-P2-026 (decisión PO).
- Las 7 features del MVP son AI-001..AI-006 y AI-008 (AI-007 excluida).
- Human-in-the-loop y sanitización son obligatorios.

**Qué NO implementar:**
- Nada de runtime de IA, endpoints, entidades, migraciones ni UI.
- No persistir `AIRecommendation` ni modificar `AIPromptVersion`.
- No completar todos los ejemplos representativos (eso es PB-P3-010).

**Supuestos a preservar:**
- PromptOps definido en Doc 17; Prompt Registry y persistencia de `AIRecommendation` existen (PB-P0-010).
- Todo dato incluido está sanitizado.

---

## 19. Task Generation Notes

**Grupos de tareas sugeridos:**
- **Documentación / Estructura:** definir plantilla y crear `AI-Prompt-Evidence-Catalog.md`.
- **AI / PromptOps:** recopilar prompts versionados por feature; seleccionar `AIRecommendation` reales por feature (7); mapear `promptVersion` + IDs.
- **Seguridad:** sanitizar input/output (sin PII/secretos) con revisión humana; verificar ausencia de `OPENAI_API_KEY`.
- **QA:** verificar cobertura ≥1 ejemplo por feature (7) y trazabilidad completa; validar TS-01/TS-02/TS-03 y NT-01/NT-02.
- **DevOps / Config (opcional):** check de cobertura por feature y secret-scan en CI (previa aprobación del Tech Lead).
- **Documentación / Proceso:** documentar el proceso de sanitización/sincronización (catálogo vivo).

**QA obligatorio:** cobertura por feature + sanitización.
**Seguridad obligatorio:** sanitización previa a inclusión (bloqueante ante PII/secretos).
**Seed/Demo:** no aplica (solo referencia).
**Documentación obligatorio:** creación del catálogo + proceso de sincronización.

**Dependencias entre tareas:** recopilación (AI/PromptOps) → sanitización (Seguridad) → redacción del catálogo (Documentación) → verificación de cobertura (QA). El Check de CI (opcional) depende del catálogo existente.

**tasks.md consolidado del backlog item:** PB-P2-026 contiene una sola User Story (US-149); no se requiere consolidación multi-US, pero las tareas de US-149 pueden servir de base directa para el `tasks.md` del ítem.

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
| DB impact clear | Pass (solo lectura/referencia) |
| AI impact clear | Pass |
| Security impact clear | Pass |
| Testing strategy clear | Pass |
| Ready for Development Task Breakdown | Yes |

---

## 21. Final Recommendation

`Ready for Task Breakdown`

La historia es documental, con alcance acotado y bien traceado. El diseño técnico se limita a la creación/mantenimiento de `AI-Prompt-Evidence-Catalog.md` con ≥1 ejemplo por feature IA del MVP, trazabilidad a `AIPromptVersion`/`AIRecommendation`, sanitización obligatoria con human-in-the-loop y un proceso de sincronización documentado. No hay contradicciones bloqueantes ni decisiones abiertas: la ambigüedad de backlog ya fue resuelta a favor de PB-P2-026. La única nota no bloqueante (validación del Tech Lead sobre sanitización y posible check de cobertura en CI) puede resolverse durante la ejecución de tareas. Procede la generación de Development Tasks.
