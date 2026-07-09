// US-122 / AI-001, SEED-001, EMERGENT-122-001 (AC-03, AC-07) — sync del export AIPromptVersion de
// US-121 hacia el repository. Bridge determinístico e idempotente para que el linkage de prompt
// version funcione (AC-03). Sin DB: fake repo captura los upserts.
import { describe, it, expect } from 'vitest';
import {
  syncPromptVersionsFromRegistry,
  promptVersionSyncRows,
} from '../../src/modules/ai-assistance/infrastructure/ai-prompt-version-sync.js';
import { exportAIPromptVersionMetadata } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/aipromptversion-export.js';
import { promptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/index.js';
import { FakeAIRecommendationRepository } from '../helpers/ai-recommendation-fixtures.js';

describe('US-122 AC-07 — sync de metadata AIPromptVersion desde US-121', () => {
  it('sincroniza todas las filas exportadas por el registry', async () => {
    const repo = new FakeAIRecommendationRepository();
    const expected = exportAIPromptVersionMetadata(promptRegistry).length;
    const count = await syncPromptVersionsFromRegistry(repo);
    expect(count).toBe(expected);
    expect(repo.upserted).toHaveLength(expected);
  });

  it('las filas de sync coinciden con el export de US-121 (determinístico)', () => {
    const rows = promptVersionSyncRows();
    const exported = exportAIPromptVersionMetadata(promptRegistry);
    expect(rows.map((r) => r.id)).toEqual(exported.map((m) => m.id));
    expect(rows.every((r) => /^[0-9a-f-]{36}$/.test(r.id))).toBe(true);
  });

  it('AC-03: tras sync, existsPromptVersion es true para un id sincronizado', async () => {
    const repo = new FakeAIRecommendationRepository();
    await syncPromptVersionsFromRegistry(repo);
    const id = promptVersionSyncRows()[0]!.id;
    expect(await repo.existsPromptVersion(id)).toBe(true);
  });

  it('es idempotente: reejecutar no cambia el conteo de filas', async () => {
    const repo = new FakeAIRecommendationRepository();
    const a = await syncPromptVersionsFromRegistry(repo);
    const b = await syncPromptVersionsFromRegistry(repo);
    expect(a).toBe(b);
  });
});
