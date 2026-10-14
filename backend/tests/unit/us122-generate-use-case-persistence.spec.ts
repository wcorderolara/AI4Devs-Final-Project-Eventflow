// PR-5 / US-122 — `GenerateAiRecommendationUseCase` persiste vía `PersistAIRecommendationService`:
// éxito ⇒ `pending` con el promptVersionId del resolver (HITL); fallo controlado de IA ⇒ failure
// record `failed` best-effort y se relanza el error original (aunque el failure record falle).
import { describe, it, expect, vi } from 'vitest';
import { GenerateAiRecommendationUseCase } from '../../src/modules/ai-assistance/application/generate-ai-recommendation.use-case.js';
import { AiProviderTimeoutError, AiInvalidOutputError } from '../../src/shared/domain/errors/ai.errors.js';
import { FakeAIRecommendationRepository } from '../helpers/ai-recommendation-fixtures.js';
import { makeAiGenerationService } from '../helpers/ai-execution-fixtures.js';
import type { PromptVersionIdResolver } from '../../src/modules/ai-assistance/ports/prompt-version-id.resolver.js';

function makeUseCase(resolver: PromptVersionIdResolver = { resolve: vi.fn(async () => 'pv-valid') }) {
  const repo = new FakeAIRecommendationRepository();
  const logger = { emit: vi.fn() };
  const uc = new GenerateAiRecommendationUseCase(
    repo,
    resolver,
    makeAiGenerationService(),
    { getOwnerId: vi.fn(async () => 'u-1'), getCurrency: vi.fn(), findOwnedEvent: vi.fn(async () => ({ id: 'evt-1', currency: 'GTQ' as const, status: 'active' as const })) },
    { getVendorProfileIdForUser: vi.fn(), existsActive: vi.fn(), findActiveByUserId: vi.fn() },
    { getEventId: vi.fn() },
    logger,
  );
  return { uc, repo, logger, resolver };
}

const CMD = { userId: 'u-1', feature: 'event_plan' as const, contextId: 'evt-1', languageCode: 'es-LATAM', correlationId: 'corr-1' };

describe('PR-5 — GenerateAiRecommendationUseCase + US-122', () => {
  it('éxito ⇒ un único record pending con promptVersionId real y metadata de ejecución', async () => {
    const { uc, repo, resolver } = makeUseCase();
    const view = await uc.execute({ ...CMD, input: { guests: 10 } });
    expect(view.status).toBe('pending');
    expect(repo.failed).toHaveLength(0);
    expect(repo.created).toHaveLength(1);
    expect(repo.created[0]).toMatchObject({ promptVersionId: 'pv-valid', provider: 'mock', schemaValid: true, fallbackUsed: false, eventId: 'evt-1', promptVersionLabel: 'mock:event_plan:v1' });
    expect(resolver.resolve).toHaveBeenCalledWith('event_plan', 'es-LATAM');
  });

  it('timeout del provider ⇒ failure record failed + relanza AiProviderTimeoutError', async () => {
    const { uc, repo } = makeUseCase();
    await expect(uc.execute({ ...CMD, input: { __simulate: 'timeout' } })).rejects.toBeInstanceOf(AiProviderTimeoutError);
    expect(repo.created).toHaveLength(0);
    expect(repo.failed).toHaveLength(1);
    expect(repo.failed[0]).toMatchObject({ errorCode: 'AI_PROVIDER_TIMEOUT', provider: 'mock', fallbackUsed: false, promptVersionId: 'pv-valid', correlationId: 'corr-1' });
  });

  it('output inválido ⇒ failure record AI_INVALID_OUTPUT y nunca un pending', async () => {
    const { uc, repo } = makeUseCase();
    await expect(uc.execute({ ...CMD, input: { __simulate: 'invalid' } })).rejects.toBeInstanceOf(AiInvalidOutputError);
    expect(repo.created).toHaveLength(0);
    expect(repo.failed.map((f) => f.errorCode)).toEqual(['AI_INVALID_OUTPUT']);
  });

  it('si el failure record no se puede guardar, se relanza el error original de IA', async () => {
    const resolver = { resolve: vi.fn(async () => 'pv-inexistente') };
    const { uc, repo, logger } = makeUseCase(resolver);
    await expect(uc.execute({ ...CMD, input: { __simulate: 'timeout' } })).rejects.toBeInstanceOf(AiProviderTimeoutError);
    expect(repo.failed).toHaveLength(0);
    expect(logger.emit).toHaveBeenCalledWith('ai.recommendation.failure_record_skipped', expect.objectContaining({ reason: 'AI_PROMPT_VERSION_NOT_FOUND' }));
  });
});
