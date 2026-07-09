// Sync idempotente del export `AIPromptVersion` de US-121 → filas DB (US-122 / EMERGENT-122-001, AI-001).
// Bridge US-121 → US-122: US-121 entregó un export estático determinístico; el consumidor (US-122)
// lo persiste para que `AIRecommendation.aiPromptVersionId` referencie una fila real (AC-03/AC-07).
// No implementa PromptRegistry (out of scope US-122); sólo materializa su metadata ya validada.
import type { AIRecommendationRepository, RepositoryWriteOptions } from '../ports/ai-recommendation.repository.js';
import type { AIPromptVersionSyncRow } from '../domain/ai-recommendation.js';
import { promptRegistry } from './prompt-registry/index.js';
import { exportAIPromptVersionMetadata } from './prompt-registry/aipromptversion-export.js';

/** Filas a sincronizar, derivadas determinísticamente del registry por defecto de US-121. */
export function promptVersionSyncRows(): AIPromptVersionSyncRow[] {
  return exportAIPromptVersionMetadata(promptRegistry).map((m) => ({
    id: m.id,
    promptId: m.promptId,
    promptKey: m.promptKey,
    version: m.version,
    status: m.status,
    provider: m.provider,
    templateChecksum: m.templateChecksum,
    description: m.description,
  }));
}

/**
 * Persiste (upsert idempotente) todas las versiones de prompt exportadas por US-121. Devuelve la
 * cantidad sincronizada. Reejecutable sin duplicar (unicidad por `promptKey`+`version`).
 */
export async function syncPromptVersionsFromRegistry(
  repo: AIRecommendationRepository,
  options?: RepositoryWriteOptions,
): Promise<number> {
  const rows = promptVersionSyncRows();
  for (const row of rows) {
    await repo.upsertPromptVersion(row, options);
  }
  return rows.length;
}
