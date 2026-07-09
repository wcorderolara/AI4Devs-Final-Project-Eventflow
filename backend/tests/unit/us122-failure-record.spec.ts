// US-122 / QA-006, BE-006 (AC-07, AC-08, AC-10) — rechazo de output inválido y failure records
// seguros. Output no validado no se persiste como pending exitoso; los failure records guardan sólo
// metadata segura (sin raw output ni input sensible).
import { describe, it, expect } from 'vitest';
import { PersistAIRecommendationService } from '../../src/modules/ai-assistance/application/persist-ai-recommendation.service.js';
import {
  AIRecommendationInvalidOutputError,
  AIRecommendationValidationError,
} from '../../src/modules/ai-assistance/domain/errors/ai-recommendation-persistence.errors.js';
import { FakeAIRecommendationRepository, validPersistInput } from '../helpers/ai-recommendation-fixtures.js';
import type { PersistAiRecommendationFailureInput } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';

describe('US-122 AC-07 — output inválido no se persiste como pending', () => {
  it('schemaValid=false => AIRecommendationInvalidOutputError, sin crear record', async () => {
    const repo = new FakeAIRecommendationRepository();
    await expect(new PersistAIRecommendationService(repo).persist(validPersistInput({ schemaValid: false }))).rejects.toBeInstanceOf(AIRecommendationInvalidOutputError);
    expect(repo.created).toHaveLength(0);
  });

  it('output que no cumple el schema del feature => rechazado aunque schemaValid=true', async () => {
    const repo = new FakeAIRecommendationRepository();
    const input = validPersistInput({ outputPayload: { summary: 'x' } }); // faltan phases
    await expect(new PersistAIRecommendationService(repo).persist(input)).rejects.toBeInstanceOf(AIRecommendationInvalidOutputError);
    expect(repo.created).toHaveLength(0);
  });
});

describe('US-122 Deviation D3 — anthropic no produce success MVP', () => {
  it('provider=anthropic en persist() => AIRecommendationValidationError', async () => {
    const repo = new FakeAIRecommendationRepository();
    await expect(new PersistAIRecommendationService(repo).persist(validPersistInput({ provider: 'anthropic' }))).rejects.toBeInstanceOf(AIRecommendationValidationError);
    expect(repo.created).toHaveLength(0);
  });
});

describe('US-122 AC-08 — failure records seguros', () => {
  const failureInput = (overrides: Partial<PersistAiRecommendationFailureInput> = {}): PersistAiRecommendationFailureInput => ({
    requestedByUserId: 'user-1',
    type: 'event_plan',
    promptVersionId: 'pv-valid',
    provider: 'openai',
    languageCode: 'es-LATAM',
    fallbackUsed: false,
    timeoutMs: 60000,
    latencyMs: 90,
    correlationId: 'corr-err',
    errorCode: 'AI_RECOMMENDATION_INVALID_OUTPUT',
    eventId: 'event-1',
    ...overrides,
  });

  it('persistFailure crea un record failed con sólo metadata segura', async () => {
    const repo = new FakeAIRecommendationRepository();
    const view = await new PersistAIRecommendationService(repo).persistFailure(failureInput());
    expect(view.status).toBe('failed');
    expect(repo.failed).toHaveLength(1);
    expect(repo.failed[0]!.errorCode).toBe('AI_RECOMMENDATION_INVALID_OUTPUT');
    // El failure input no transporta output ni input crudo.
    expect(Object.keys(repo.failed[0]!)).not.toContain('outputPayload');
    expect(Object.keys(repo.failed[0]!)).not.toContain('inputPayload');
  });

  it('anthropic SÍ se admite en failure records (stub/error metadata)', async () => {
    const repo = new FakeAIRecommendationRepository();
    const view = await new PersistAIRecommendationService(repo).persistFailure(failureInput({ provider: 'anthropic' }));
    expect(view.status).toBe('failed');
  });

  it('failure con prompt version inexistente falla controladamente', async () => {
    const repo = new FakeAIRecommendationRepository();
    await expect(new PersistAIRecommendationService(repo).persistFailure(failureInput({ promptVersionId: 'pv-missing' }))).rejects.toThrow();
    expect(repo.failed).toHaveLength(0);
  });
});
