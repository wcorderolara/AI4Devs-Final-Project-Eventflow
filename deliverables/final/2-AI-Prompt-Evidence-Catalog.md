<!-- Curado a mano (human-in-the-loop, ADR-AI-005). Datos SINTÉTICOS del MockAIProvider y del seed
     demo — sin PII real ni secretos (SEC-02/03). Validación: node scripts/check-ai-prompt-catalog.mjs -->

# 🤖 Catálogo de prompts y outputs ejemplares — EventFlow (PromptOps)

> Evidencia académica (EPIC-ACAD-001, US-149 / PB-P2-026) de **PromptOps responsable**: para cada
> una de las **7 features de IA del MVP** se documenta el **prompt versionado**, un **input** y un
> **output** de ejemplo **sanitizados**, y la **trazabilidad** a `AIPromptVersion` y a
> `AIRecommendation`. Fuentes reales del repositorio:
>
> - Prompt Registry (código, ADR-AI-006): [`backend/src/modules/ai-assistance/infrastructure/prompt-registry/prompts/mvp-prompts.prompt.ts`](../../backend/src/modules/ai-assistance/infrastructure/prompt-registry/prompts/mvp-prompts.prompt.ts).
> - Outputs deterministas del `MockAIProvider` (ADR-AI-003): [`backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-fixtures.ts`](../../backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-fixtures.ts).
> - `AIRecommendation` reales del seed demo (US-137 cargó el seed en `eventflow_demo`): [`backend/src/modules/seed-demo/application/seed-demo-data.use-case.ts`](../../backend/src/modules/seed-demo/application/seed-demo-data.use-case.ts) (`seedAIRecommendations`).
>
> **Alcance (US-149):** ≥1 ejemplo por feature. La colección **completa** de ejemplos representativos
> es PB-P3-010 (historia separada). Todo dato aquí es **sintético/sanitizado**; ningún secreto,
> `OPENAI_API_KEY` ni PII real (AC-03, SEC-02/03).

## Cobertura de features de IA del MVP (7)

| # | Feature | `kind` / `featureType` | Prompt activo (Registry) | Ejemplo |
| --- | --- | --- | --- | --- |
| AI-001 | Plan de evento | `event_plan` | `event_plan.es-LATAM` **V2** (+ `event_plan.en` V1; V1 es-LATAM `deprecated`) | [↓](#ai-001--plan-de-evento-event_plan) |
| AI-002 | Checklist | `checklist` | `checklist.es-LATAM` **V1** | [↓](#ai-002--checklist-checklist) |
| AI-003 | Distribución de presupuesto | `budget_suggestion` | `budget_suggestion.es-LATAM` **V1** | [↓](#ai-003--distribución-de-presupuesto-budget_suggestion) |
| AI-004 | Categorías de proveedor | `vendor_categories` | `vendor_categories.es-LATAM` **V1** | [↓](#ai-004--categorías-de-proveedor-vendor_categories) |
| AI-005 | Brief de cotización | `quote_brief` | `quote_brief.es-LATAM` **V1** | [↓](#ai-005--brief-de-cotización-quote_brief) |
| AI-006 | Resumen comparativo de cotizaciones | `quote_compare_summary` | `quote_compare_summary` **V1** (es-LATAM, es-ES, pt, en) | [↓](#ai-006--resumen-comparativo-de-cotizaciones-quote_compare_summary) |
| AI-008 | Priorización de tareas | `task_priority` | `task_priority` **V1** (es-LATAM, es-ES, pt, en) | [↓](#ai-008--priorización-de-tareas-task_priority) |

> AI-007 (bio/paquetes del proveedor) queda **fuera** del MVP (existe como prompt `draft`
> `vendor_bio`, nunca servido `active`, AC-09 de US-121). No se incluye.

## Cómo leer la trazabilidad (AC-02)

Cada ejemplo cita:

- **`AIPromptVersion`** por su **clave natural estable** `promptKey` + `version` + `templateHash`
  (sincronizada a la tabla `ai_prompt_versions` por `ai-prompt-version-sync`, unicidad
  `promptKey`+`version`). El hash `sha256:…` es el identificador de contenido del template (ADR-AI-006).
- **`AIRecommendation`**: registro real creado por el seed demo (`kind=<feature>`, `is_seed=true`),
  con `input_payload`/`output_payload` y `ai_meta` (`provider`, `promptVersion`, `latencyMs`,
  `fallbackUsed`, `languageCode`). El **UUID** de `AIRecommendation` es aleatorio por corrida del
  seed, por lo que **no se fija aquí** (no se inventan IDs — VR-03, EC-02/NT-01). Se obtiene de la
  base demo con la consulta reproducible:

  ```sql
  SELECT id, kind, ai_meta->>'promptVersion' AS prompt_version, status
  FROM ai_recommendations
  WHERE kind = '<feature>' AND is_seed = true
  LIMIT 1;
  ```

---

## AI-001 — Plan de evento (`event_plan`)

- **Prompt (`AIPromptVersion`)**: `promptKey=event_plan.es-LATAM`, `version=V2`, `status=active`,
  `templateHash=sha256:4944e5893455c153a79e28c114aaf6ce6f1d3e389f8f0fddb229e1b97e7ece4d`,
  `inputSchemaRef=ai.event_plan.input.v1`, `outputSchemaRef=ai.event_plan.output.v1`.
  - Multi-idioma: `event_plan.en` V1 `active`. Historial: `event_plan.es-LATAM` V1 `deprecated`
    (conservada para audit/replay — ADR-AI-006).
  - System instructions (extracto): *"You are an event planning assistant for EventFlow. Produce a
    concise event plan with a summary and ordered phases, each phase containing concrete tasks, in
    neutral LATAM Spanish."* + bloque de seguridad.
  - Developer rules: no inventar cifras de presupuesto ni compromisos de proveedores; fases
    accionables y ordenadas.
- **Input de ejemplo (sanitizado)**:
  ```json
  { "feature": "event_plan", "scenario": "seed-demo", "locale": "es-LATAM" }
  ```
- **Output de ejemplo (sanitizado, `MockAIProvider`)**:
  ```json
  { "summary": "Plan sugerido para el evento",
    "phases": [ { "name": "Preparación", "tasks": ["Definir fecha", "Reservar lugar"] } ] }
  ```
- **Trazabilidad**: `promptVersion=event_plan.es-LATAM V2`; `AIRecommendation` `kind=event_plan`,
  `is_seed=true`, `ai_meta.provider=mock`.

## AI-002 — Checklist (`checklist`)

- **Prompt (`AIPromptVersion`)**: `promptKey=checklist.es-LATAM`, `version=V1`, `status=active`,
  `templateHash=sha256:2652c044ebc10c0afce0bc6cdbcaaa2a6b7bcb9149509a6e30d5ef60fc085cba`,
  `inputSchemaRef=ai.checklist.input.v1`, `outputSchemaRef=ai.checklist.output.v1`.
  - System instructions (extracto): *"You are an event checklist assistant… Produce a prioritized
    checklist of items in neutral LATAM Spanish."* + bloque de seguridad.
  - Developer rules: cada ítem es una tarea concreta y verificable; prioridad `low|medium|high`.
- **Input de ejemplo (sanitizado)**:
  ```json
  { "feature": "checklist", "scenario": "seed-demo", "locale": "es-LATAM" }
  ```
- **Output de ejemplo (sanitizado, `MockAIProvider`)**:
  ```json
  { "tasks": [
    { "title": "Reservar el lugar", "description": "Confirmar fecha y firmar contrato.", "category": "venue", "due_relative_days": 180, "phase": "T-180", "priority": "high" },
    { "title": "Contratar catering", "description": "Cerrar menú y monto con el proveedor.", "category": "catering", "due_relative_days": 90, "phase": "T-90", "priority": "high" },
    { "title": "Enviar invitaciones", "description": "Enviar invitaciones digitales o físicas.", "category": "invitations", "due_relative_days": 30, "phase": "T-30", "priority": "medium" },
    { "title": "Confirmar itinerario", "description": "Revisar horarios y logística con proveedores.", "category": "logistics", "due_relative_days": 7, "phase": "T-7", "priority": "high" },
    { "title": "Preparar kit del día", "description": "Armar el kit de emergencia y checklist final.", "category": "logistics", "due_relative_days": 1, "phase": "T-1", "priority": "high" }
  ] }
  ```
- **Trazabilidad**: `promptVersion=checklist.es-LATAM V1`; `AIRecommendation` `kind=checklist`, `is_seed=true`.

## AI-003 — Distribución de presupuesto (`budget_suggestion`)

- **Prompt (`AIPromptVersion`)**: `promptKey=budget_suggestion.es-LATAM`, `version=V1`, `status=active`,
  `templateHash=sha256:82d56a6c6a12b0ac409a64e097798d9ba71197d2aff92e6300a80eff86346c36`,
  `inputSchemaRef=ai.budget_suggestion.input.v1`, `outputSchemaRef=ai.budget_suggestion.output.v1`.
  - System instructions (extracto): *"…Produce budget line items with categories and estimated
    amounts in the SAME currency provided in the input."* + bloque de seguridad.
  - Developer rules: **nunca convertir divisas** (eco de `currencyCode`); montos no vinculantes.
- **Input de ejemplo (sanitizado)**:
  ```json
  { "feature": "budget_suggestion", "scenario": "seed-demo", "locale": "es-LATAM" }
  ```
- **Output de ejemplo (sanitizado, `MockAIProvider`)**:
  ```json
  { "currencyCode": "GTQ",
    "items": [ { "category": "catering", "estimatedAmount": "1000.00" },
               { "category": "decoration", "estimatedAmount": "500.00" } ] }
  ```
- **Trazabilidad**: `promptVersion=budget_suggestion.es-LATAM V1`; `AIRecommendation`
  `kind=budget_suggestion`, `is_seed=true`. El seed garantiza además un caso `status=pending` sobre
  un evento editable (flujo HITL de US-037) y un `BudgetItem` enlazado por `ai_recommendation_id`.

## AI-004 — Categorías de proveedor (`vendor_categories`)

- **Prompt (`AIPromptVersion`)**: `promptKey=vendor_categories.es-LATAM`, `version=V1`, `status=active`,
  `templateHash=sha256:2be9748197598d7e3f457c42f3acc067f8915fe8f3f8107fd328825db2abb8a4`,
  `inputSchemaRef=ai.vendor_categories.input.v1`, `outputSchemaRef=ai.vendor_categories.output.v1`.
  - System instructions (extracto): *"…Suggest relevant vendor category codes with a short reason
    each, in neutral LATAM Spanish."* + bloque de seguridad.
  - Developer rules: sugerir **categorías**, no nombrar ni confirmar proveedores reales.
- **Input de ejemplo (sanitizado)**:
  ```json
  { "feature": "vendor_categories", "scenario": "seed-demo", "locale": "es-LATAM" }
  ```
- **Output de ejemplo (sanitizado, `MockAIProvider`)**:
  ```json
  { "categories": [ { "code": "catering", "reason": "Servicio esencial" },
                    { "code": "photography", "reason": "Registro del evento" } ] }
  ```
- **Trazabilidad**: `promptVersion=vendor_categories.es-LATAM V1`; `AIRecommendation` `kind=vendor_categories`, `is_seed=true`.

## AI-005 — Brief de cotización (`quote_brief`)

- **Prompt (`AIPromptVersion`)**: `promptKey=quote_brief.es-LATAM`, `version=V1`, `status=active`,
  `templateHash=sha256:e8801cef0349f79bceb2e9d40462a7513a3f73cb35876d26b0c9ac02963b532c`,
  `inputSchemaRef=ai.quote_brief.input.v1`, `outputSchemaRef=ai.quote_brief.output.v1`.
  - System instructions (extracto): *"…Produce a brief, a list of requirements, clarifying questions
    and constraints in neutral LATAM Spanish."* + bloque de seguridad.
  - Developer rules: no prometer precios ni disponibilidad; todo se enmarca como requisitos a cotizar.
- **Input de ejemplo (sanitizado)**:
  ```json
  { "feature": "quote_brief", "scenario": "seed-demo", "locale": "es-LATAM" }
  ```
- **Output de ejemplo (sanitizado, `MockAIProvider`)**:
  ```json
  { "brief": "Brief de cotización",
    "requirements": ["Servicio para 100 personas"],
    "questions": ["¿Incluye montaje?"],
    "constraints": [] }
  ```
- **Trazabilidad**: `promptVersion=quote_brief.es-LATAM V1`; `AIRecommendation` `kind=quote_brief`, `is_seed=true`.

## AI-006 — Resumen comparativo de cotizaciones (`quote_compare_summary`)

- **Prompt (`AIPromptVersion`)**: `promptKey=quote_compare_summary.es-LATAM`, `version=V1`,
  `status=active`,
  `templateHash=sha256:035f08a9d231d91ff0f2662f53dda40fac99df49ad2cd098fe83561d0328e35c`,
  `inputSchemaRef=ai.quote_compare_summary.input.v1`, `outputSchemaRef=ai.quote_compare_summary.output.v1`.
  - Multi-idioma `active`: `es-LATAM`, `es-ES`, `pt`, `en` (4 locales).
  - System instructions (extracto): *"…produce pros/cons/missing_info/notes and OPTIONAL
    overall_observations… Your output INFORMS the organizer but does NOT decide which quote wins —
    the human user marks the preferred quote."* (**human-in-the-loop explícito**, ADR-AI-005).
  - Developer rules: rol **informativo**, nunca elige ganador (el humano decide vía US-058); no
    inventar totales/descuentos/disponibilidad; no convertir divisas.
- **Input de ejemplo (sanitizado)**:
  ```json
  { "feature": "quote_compare_summary", "scenario": "seed-demo", "locale": "es-LATAM",
    "__quote_ids": ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"] }
  ```
- **Output de ejemplo (sanitizado, `MockAIProvider`)**:
  ```json
  { "summaries": [
      { "quote_id": "00000000-0000-4000-8000-000000000001",
        "pros": ["Precio competitivo dentro del presupuesto."],
        "cons": ["Menús con menos opciones vegetarianas."],
        "missing_info": ["Política de cancelación por escrito."],
        "notes": "Confirmar con el proveedor la disponibilidad para la fecha." },
      { "quote_id": "00000000-0000-4000-8000-000000000002",
        "pros": ["Servicio con más opciones incluidas."],
        "cons": ["Total ligeramente por encima del promedio."],
        "missing_info": ["Detalle del cronograma de montaje."],
        "notes": "Solicitar breakdown por bloque de servicio." }
    ],
    "overall_observations": "Ambas cotizaciones cubren los requisitos básicos; el organizador decide según prioridad de menú vs. logística." }
  ```
- **Trazabilidad**: `promptVersion=quote_compare_summary.es-LATAM V1`; `AIRecommendation`
  `kind=quote_compare_summary`. Feature relacionada (variante previa US-097): `quote_comparison` V1
  (`sha256:b3a6378535abfa633121f19b3bb6965c03b06221c96c7621d76757f3cf6af276`), con campo de
  recomendación no vinculante.

## AI-008 — Priorización de tareas (`task_priority`)

- **Prompt (`AIPromptVersion`)**: `promptKey=task_priority.es-LATAM`, `version=V1`, `status=active`,
  `inputSchemaRef=ai.task_priority.input.v1`, `outputSchemaRef=ai.task_priority.output.v1`.
  - Multi-idioma `active`: `es-LATAM`, `es-ES`, `pt`, `en` (4 locales).
  - System instructions (extracto): devuelve hasta 3 `task_id` con `reason` y `urgency_score` (1..10);
    **no reordena el checklist oficial ni marca tareas hechas — el organizador decide** (HITL, ADR-AI-005).
- **Input de ejemplo (sanitizado)**:
  ```json
  { "feature": "task_priority", "scenario": "seed-demo", "locale": "es-LATAM",
    "__task_ids": ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"] }
  ```
- **Output de ejemplo (sanitizado, `MockAIProvider`)**:
  ```json
  { "top": [
      { "task_id": "00000000-0000-4000-8000-000000000001", "reason": "Vence en menos de 7 días y bloquea otras tareas del checklist.", "urgency_score": 10 },
      { "task_id": "00000000-0000-4000-8000-000000000002", "reason": "Prioridad alta pendiente de arranque; conviene iniciarla esta semana.", "urgency_score": 8 },
      { "task_id": "00000000-0000-4000-8000-000000000003", "reason": "Tarea en progreso próxima al vencimiento; conviene cerrarla pronto.", "urgency_score": 6 }
    ],
    "rationale_summary": "Priorización enfocada en fechas próximas y prioridad alta; el organizador decide acciones concretas." }
  ```
- **Trazabilidad**: `promptVersion=task_priority.es-LATAM V1`; `AIRecommendation` `kind=task_priority`.
  Variante previa (US-097): `task_prioritization` V1
  (`sha256:c94d17dc91307b3806a1789879dedca14dba3c8b45ca1c94ea3d4e09b98dfa94`).

---

## Evidencia de PromptOps responsable (AC-05)

| Práctica | Evidencia en EventFlow | ADR |
| --- | --- | --- |
| **Versionado de prompts** | Prompts como artefactos versionados en código con `version`, `status` (`active`/`deprecated`/`draft`) y `templateHash sha256`; sincronizados a `AIPromptVersion` (unicidad `promptKey`+`version`, append-only). V1 `deprecated` de `event_plan` conservada para audit/replay. | [ADR-AI-006](../../docs/22-Architecture-Decision-Records.md#adr-ai-006--version-prompts-through-prompt-registry-and-aipromptversion) |
| **Human-in-the-loop** | Toda salida IA se persiste como `AIRecommendation` con `status` (`pending`→`accepted`/`rejected`); las features informativas (AI-006, AI-008) **nunca deciden** — el organizador confirma. Curación/sanitización de este catálogo con validación humana. | [ADR-AI-005](../../docs/22-Architecture-Decision-Records.md#adr-ai-005--enforce-human-in-the-loop-for-all-ai-outputs) |
| **Abstracción de proveedor** | `LLMProvider`: `OpenAIProvider` (principal), `MockAIProvider` (determinista, obligatorio para demo/test), `AnthropicProvider` (stub). Selección por `LLM_PROVIDER`; en QA/Demo se usa `mock` (`ai_meta.provider`). | [ADR-AI-001](../../docs/22-Architecture-Decision-Records.md#adr-ai-001--use-llmprovider-abstraction) |
| **Trazabilidad de ejecución** | `AIRecommendation` persiste `kind`, `ai_prompt_version_id`, `input_payload`, `output_payload`, `ai_meta` (`provider`, `promptVersion`, `latencyMs`, `fallbackUsed`, `languageCode`), `status`, `locale`, `locale_fallback`. | BR-AI-007/010 |
| **Fallback controlado** | `ai_meta.fallbackUsed` / `locale_fallback` registran la degradación a template estático por timeout/idioma (BR-AI-009); documentable como evidencia sin ejecutar IA. | BR-AI-009 |

## Mantenimiento y sincronización (catálogo vivo — AC-04)

Proceso para mantener el catálogo **sincronizado** (evita EC-02, VR-04):

1. **Ante un cambio de prompt** (nueva `version`, cambio de `status`, nuevo `templateHash`) en el
   Prompt Registry ([`mvp-prompts.prompt.ts`](../../backend/src/modules/ai-assistance/infrastructure/prompt-registry/prompts/mvp-prompts.prompt.ts)),
   actualizar la sección de la feature afectada (promptKey/version/hash/instrucciones).
2. **Ante un cambio de output** del `MockAIProvider` ([`mock-fixtures.ts`](../../backend/src/modules/ai-assistance/infrastructure/providers/mock/mock-fixtures.ts)),
   refrescar el bloque de output de ejemplo.
3. **Gate de sanitización obligatorio (AC-03, EC-01)**: todo input/output incluido debe estar
   sanitizado — sin PII real, sin secretos, sin `OPENAI_API_KEY`. Los ejemplos aquí provienen de
   datos **sintéticos** (Mock/seed), por lo que están sanitizados por construcción. Cualquier ejemplo
   tomado de una ejecución real requiere **enmascarado + revisión humana** (AI Engineer / PO) antes
   de incluirse.
4. **Validación de cobertura y secret-scan** (no bloqueante, AC-05):
   ```bash
   node scripts/check-ai-prompt-catalog.mjs
   ```
   Verifica que existan las 7 secciones por feature y que no haya patrones de secretos
   (`sk-…`, `OPENAI_API_KEY=<valor>`, claves privadas). Falla (exit 1) si falta cobertura o detecta
   un secreto. Se sugiere `continue-on-error: true` si se cablea en un workflow.
5. **Responsables**: AI Engineer / PO (curación y aprobación).

> **Nota de trazabilidad honesta (VR-03, EC-02/NT-01):** los UUID concretos de `AIRecommendation` no
> se fijan en este documento porque son aleatorios por corrida del seed; se obtienen de la base demo
> con la consulta reproducible de la sección "Cómo leer la trazabilidad". **No se inventan IDs.**

> **Alcance:** este catálogo cubre ≥1 ejemplo por feature (US-149 / PB-P2-026). La colección
> **completa** de ejemplos representativos por feature es **PB-P3-010** (historia separada).
