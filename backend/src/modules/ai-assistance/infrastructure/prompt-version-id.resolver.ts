// Adapter PromptVersionIdResolver (PR-5 / US-122 AC-03, US-121). Al primer uso sincroniza (memoizado)
// el export de US-121 a `AIPromptVersion` y el placeholder de US-097; luego resuelve (feature, idioma)
// → id real en BD. Si la fila cacheada ya no existe (p. ej. BD truncada en tests), re-sincroniza.
import { v5 as uuidv5 } from 'uuid';
import type { AiFeatureType } from '../domain/ai-features.js';
import type { AIPromptVersionSyncRow } from '../domain/ai-recommendation.js';
import type { AIRecommendationRepository } from '../ports/ai-recommendation.repository.js';
import type { PromptVersionIdResolver } from '../ports/prompt-version-id.resolver.js';
import { promptRegistry, promptStableId, AI_PROMPT_VERSION_NAMESPACE } from './prompt-registry/index.js';
import { syncPromptVersionIdsFromRegistry } from './ai-prompt-version-sync.js';

/** Placeholder histórico de US-097 (misma identidad `promptKey`+`version` que las filas existentes). */
export const US097_PLACEHOLDER_PROMPT_VERSION: AIPromptVersionSyncRow = {
  id: uuidv5('us097-endpoint-foundation@v1', AI_PROMPT_VERSION_NAMESPACE),
  promptId: '00000000-0000-4000-8000-000000000097',
  promptKey: 'us097-endpoint-foundation',
  version: 'v1',
  status: 'active',
  provider: 'mock',
  templateChecksum: 'us097-static-placeholder',
  description: 'Placeholder prompt version (US-097; real registry en PB-P0-010)',
};

interface ResolvedIds {
  /** `promptKey` (`<feature>.<idioma>`) del template activo → id en BD. */
  activeByPromptKey: Map<string, string>;
  placeholderId: string;
}

export class RegistryPromptVersionIdResolver implements PromptVersionIdResolver {
  private loading: Promise<ResolvedIds> | null = null;

  constructor(private readonly repo: AIRecommendationRepository) {}

  async resolve(feature: AiFeatureType, languageCode: string): Promise<string> {
    const id = this.pick(await this.load(), feature, languageCode);
    if (await this.repo.existsPromptVersion(id)) return id;
    this.loading = null; // cache obsoleta → re-sync una vez
    return this.pick(await this.load(), feature, languageCode);
  }

  private pick(ids: ResolvedIds, feature: AiFeatureType, languageCode: string): string {
    return ids.activeByPromptKey.get(`${feature}.${languageCode}`) ?? ids.placeholderId;
  }

  private load(): Promise<ResolvedIds> {
    if (!this.loading) {
      this.loading = this.sync().catch((err: unknown) => {
        this.loading = null; // no memoizar fallos: el siguiente request reintenta
        throw err;
      });
    }
    return this.loading;
  }

  private async sync(): Promise<ResolvedIds> {
    const byStableId = await syncPromptVersionIdsFromRegistry(this.repo);
    const placeholderId = await this.repo.upsertPromptVersion(US097_PLACEHOLDER_PROMPT_VERSION);
    const activeByPromptKey = new Map<string, string>();
    for (const t of promptRegistry.all()) {
      const id = byStableId.get(promptStableId(t));
      if (t.status === 'active' && id) activeByPromptKey.set(t.promptKey, id);
    }
    return { activeByPromptKey, placeholderId };
  }
}
