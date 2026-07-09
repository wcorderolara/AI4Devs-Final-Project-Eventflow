// PromptRegistry — export determinístico de metadata `AIPromptVersion` (US-121 / BE-005, SEED-001,
// AC-07). Patrón MVP recomendado (Tech Spec §7): export estático validado en CI (registry-only),
// sin editor dinámico ni mutación de versiones históricas. US-122 consumirá este dataset para
// persistir `AIRecommendation.prompt_version_id`.
//
// Mapping al modelo Prisma real `AIPromptVersion` (Deviation D2): el schema no tiene columnas
// feature/language, así que la identidad se codifica en `prompt_key = <featureType>.<languageCode>`.
// `id`/`prompt_id` se derivan de forma determinística (uuidv5) — estables entre ejecuciones (idempotencia).
// El enum `status` sólo admite `active|deprecated` (Deviation D1): sólo esas versiones se exportan.
import { v5 as uuidv5 } from 'uuid';
import type { PromptRegistry } from './prompt-registry.js';
import type { AIPromptVersionMetadata, PromptTemplate } from './prompt-template.js';
import { promptStableId } from './prompt-template.js';
import { PromptInvalidMetadataError } from './prompt-registry-errors.js';

/** Namespace UUID fijo para derivación determinística (constante del proyecto — no secreto). */
export const AI_PROMPT_VERSION_NAMESPACE = 'b6f2a4c0-2f1e-5d3a-9c7b-1e0a3d5c7f90';

/** Provider por defecto para la columna requerida `provider` (MVP determinista). Ver Deviation D2. */
const DEFAULT_PROVIDER: AIPromptVersionMetadata['provider'] = 'mock';

/** Estados de código que se persisten como filas `AIPromptVersion` (enum real). */
const EXPORTABLE_STATUSES = new Set(['active', 'deprecated']);

export interface ExportOptions {
  /** Provider a registrar en las filas exportadas (default `mock`). */
  provider?: AIPromptVersionMetadata['provider'];
}

/** Descripción SEGURA (sin contenido de prompt): sólo identidad + change reason. */
function safeDescription(t: PromptTemplate): string {
  return `${t.featureType} ${t.languageSupport[0]} ${t.version} — ${t.metadata.changeReason}`;
}

function toMetadata(t: PromptTemplate, provider: AIPromptVersionMetadata['provider']): AIPromptVersionMetadata {
  return {
    id: uuidv5(promptStableId(t), AI_PROMPT_VERSION_NAMESPACE),
    promptId: uuidv5(t.promptKey, AI_PROMPT_VERSION_NAMESPACE),
    promptKey: t.promptKey,
    version: t.version,
    status: t.status as 'active' | 'deprecated',
    provider,
    templateChecksum: t.templateHash,
    description: safeDescription(t),
  };
}

/**
 * Exporta la metadata `AIPromptVersion` determinística para versiones `active`/`deprecated`.
 * Ordenada por `promptKey`+`version` para salida estable. Falla ante duplicados (defensa; el registry
 * ya garantiza unicidad en build()).
 */
export function exportAIPromptVersionMetadata(
  registry: PromptRegistry,
  options: ExportOptions = {},
): AIPromptVersionMetadata[] {
  const provider = options.provider ?? DEFAULT_PROVIDER;
  const rows = registry
    .all()
    .filter((t) => EXPORTABLE_STATUSES.has(t.status))
    .map((t) => toMetadata(t, provider))
    .sort((a, b) => (a.promptKey === b.promptKey ? a.version.localeCompare(b.version) : a.promptKey.localeCompare(b.promptKey)));

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  for (const row of rows) {
    if (seenIds.has(row.id)) {
      throw new PromptInvalidMetadataError(`Duplicate AIPromptVersion id for ${row.promptKey}@${row.version}`, {
        promptKey: row.promptKey,
        version: row.version,
      });
    }
    const key = `${row.promptKey}@${row.version}`;
    if (seenKeys.has(key)) {
      throw new PromptInvalidMetadataError(`Duplicate AIPromptVersion (promptKey, version) ${key}`, {
        promptKey: row.promptKey,
        version: row.version,
      });
    }
    seenIds.add(row.id);
    seenKeys.add(key);
  }
  return rows;
}
