# PromptRegistry — PromptOps versionado (US-121 / PB-P0-010)

Registry **estático, versionado y validado en código** para los prompts de IA del MVP.
Estrategia **ADR-AI-006**: los prompts viven como artefactos versionados en código +
metadata `AIPromptVersion` para trazabilidad. Es infraestructura **backend-only**: sin
endpoints, sin UI, sin edición dinámica desde DB o panel (SEC-01/SEC-06).

> Alcance US-121: NO invoca `LLMProvider`, NO persiste `AIRecommendation` (US-122), NO crea
> endpoints/UI y NO activa prompts Future/P4.

## Componentes

| Archivo | Responsabilidad |
|---|---|
| `prompt-template.ts` | Tipos `PromptTemplate`, status, metadata, safety, `AIPromptVersionMetadata`. |
| `prompt-registry.ts` | `PromptRegistry.build()` (valida fail-fast) + `resolve()` active/specific. |
| `prompt-registry-errors.ts` | Errores tipados con `code` estable (sin fuga de contenido). |
| `prompt-hash.ts` | Hash determinístico del contenido relevante (disciplina de versión). |
| `safety-constraints.ts` | Safety constraints canónicas + bloque de instrucciones HITL/JSON-only. |
| `mvp-feature-allowlist.ts` | Allowlist MVP; bloquea Future/P4 (`vendor_bio`) en `active`. |
| `secret-pii-scan.ts` | Escáner de secrets/PII real sobre templates. |
| `aipromptversion-export.ts` | Export determinístico de metadata `AIPromptVersion` (para US-122). |
| `prompt-registry-logger.ts` | Log seguro `ai.prompt_registry.validation_failed` (sólo metadata). |
| `prompts/*.prompt.ts` | Templates MVP versionados. |

## Ciclo de vida de una versión de prompt

Estados (en código): `draft → reviewed → approved → active → deprecated → archived`.
Sólo una versión `active` por `(featureType, languageCode)` (AC-03).

### Cuándo crear una NUEVA versión (AC-08)

Crea una versión nueva (`V2`, `V3`, …) — **nunca** mutes una versión `active` existente — cuando
cambie cualquiera de:

- `systemInstructions` o `developerRules` (comportamiento),
- `inputSchemaRef` / `outputSchemaRef` (schema),
- `safetyConstraints` (seguridad),
- `languageSupport` (idioma),
- reglas de negocio relevantes.

El `templateHash` declarado es un **lock**: el registry recalcula el hash del contenido relevante
y falla con `PROMPT_HASH_DRIFT` si difiere. Cambiar contenido sin nueva versión + hash rompe la build.

### Flujo para autor de prompts

1. Agrega/edita el template en `prompts/*.prompt.ts` con una **nueva** `version`.
2. Completa metadata: `createdBy`, `changeReason`, `relatedRules`, `createdAt`; para `active`
   además `approvedBy` + `approvedAt` y todas las `safetyConstraints` en `true`.
3. Recalcula el hash: `npm run promptops:hash` y pega el valor en `templateHash`.
4. Deprecá la versión anterior (`status: 'deprecated'`) para conservarla en audit/replay.
5. Valida: `npm run promptops:check` (o `npm test`).

### Reviewers / approval

- PromptOps Lead / Backend crean y versionan.
- Product Owner aprueba cambios relevantes (`approvedBy`/`approvedAt`).
- Security Reviewer revisa cambios de safety o datos sensibles.
- QA valida la promoción a `active`.

## Resolución

```ts
import { promptRegistry } from './index.js';

promptRegistry.resolveActive('event_plan', 'es-LATAM');          // versión active (AC-01)
promptRegistry.resolveSpecific('event_plan', 'es-LATAM', 'V1');  // versión histórica (AC-02)
```

No hay fallback silencioso de idioma o prompt: feature/idioma/versión inexistentes lanzan errores
tipados (`PROMPT_NOT_FOUND`, `PROMPT_UNSUPPORTED_LANGUAGE`).

## Relación con `AIPromptVersion` y US-122

`exportAIPromptVersionMetadata(promptRegistry)` produce un dataset **determinístico** compatible con
el modelo Prisma `AIPromptVersion`. US-122 lo usará para persistir `AIRecommendation.prompt_version_id`.

### Alignment documental (US-121 / DOC-002)

La estrategia aplicada es **híbrida** (registry estático en código + metadata `AIPromptVersion`),
formalizada por **ADR-AI-006** y las PO/BA Decisions de US-121. Algunos documentos previos
(`docs/6`, `docs/14`, `docs/17`) describen `AIPromptVersion` como opcional/recommended o registry-only;
esa divergencia es **no bloqueante** y se resuelve a favor de ADR-AI-006. Trazabilidad principal:
**FR-AI-018 / BR-AI-010**.

### Divergencias de schema documentadas (no rediseñar sin gap formal)

- **D1 — status:** el enum Prisma `AIPromptVersionStatus` sólo tiene `active | deprecated`. El
  registry mantiene el ciclo de vida completo en código; el export mapea sólo `active`/`deprecated`
  a filas persistibles.
- **D2 — columnas:** el modelo real no tiene columnas `feature_type`/`language`; la identidad se
  codifica en `prompt_key = <featureType>.<languageCode>`. `id`/`prompt_id` se derivan de forma
  determinística (uuidv5). La columna requerida `provider` se registra como `mock` (default MVP
  determinista); el provider real por generación es responsabilidad de US-122.
