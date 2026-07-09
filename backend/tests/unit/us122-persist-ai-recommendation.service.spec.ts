// US-122 / QA-001, QA-002, QA-004, QA-007 (AC-01..05, AC-09, AC-10) — PersistAIRecommendationService.
// Happy path + pending state + metadata preservada + prompt version linkage + context por tipo +
// consistencia de fallback + ausencia de materialización de dominio. Fake repo en memoria (sin DB).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PersistAIRecommendationService } from '../../src/modules/ai-assistance/application/persist-ai-recommendation.service.js';
import {
  AIPromptVersionNotFoundError,
  AIRecommendationContextError,
  AIRecommendationValidationError,
} from '../../src/modules/ai-assistance/domain/errors/ai-recommendation-persistence.errors.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import { FakeAIRecommendationRepository, validPersistInput } from '../helpers/ai-recommendation-fixtures.js';

afterEach(() => vi.restoreAllMocks());

describe('US-122 AC-01/AC-02 — persistencia exitosa en estado pending', () => {
  it('crea un AIRecommendation pending con metadata requerida', async () => {
    const repo = new FakeAIRecommendationRepository();
    const view = await new PersistAIRecommendationService(repo).persist(validPersistInput());
    expect(view.status).toBe('pending');
    expect(repo.created).toHaveLength(1);
    const stored = repo.created[0]!;
    expect(stored.requestedByUserId).toBe('user-1');
    expect(stored.type).toBe('event_plan');
    expect(stored.promptVersionId).toBe('pv-valid');
    expect(stored.eventId).toBe('event-1');
  });

  it('AC-07: el outputPayload persistido es el validado por schema', async () => {
    const repo = new FakeAIRecommendationRepository();
    await new PersistAIRecommendationService(repo).persist(validPersistInput());
    expect(repo.created[0]!.outputPayload).toEqual({ summary: 'Plan', phases: [{ name: 'Phase 1', tasks: ['Reservar salón'] }] });
  });
});

describe('US-122 AC-04/AC-05 — provider/fallback/language/correlation preservados', () => {
  it('preserva metadata de ejecución tal cual', async () => {
    const repo = new FakeAIRecommendationRepository();
    const input = validPersistInput({ provider: 'mock', latencyMs: 42, timeoutMs: 30000, correlationId: 'corr-xyz', languageCode: 'en' });
    await new PersistAIRecommendationService(repo).persist(input);
    const stored = repo.created[0]!;
    expect(stored.provider).toBe('mock');
    expect(stored.latencyMs).toBe(42);
    expect(stored.timeoutMs).toBe(30000);
    expect(stored.correlationId).toBe('corr-xyz');
    expect(stored.languageCode).toBe('en');
  });

  it('AC-04: fallbackUsed=true con provider=mock se persiste (fallback upstream)', async () => {
    const repo = new FakeAIRecommendationRepository();
    await new PersistAIRecommendationService(repo).persist(validPersistInput({ provider: 'mock', fallbackUsed: true }));
    expect(repo.created[0]!.fallbackUsed).toBe(true);
  });

  it('EC-04: fallbackUsed=true con provider≠mock falla (metadata inconsistente)', async () => {
    const repo = new FakeAIRecommendationRepository();
    await expect(new PersistAIRecommendationService(repo).persist(validPersistInput({ provider: 'openai', fallbackUsed: true }))).rejects.toBeInstanceOf(AIRecommendationValidationError);
    expect(repo.created).toHaveLength(0);
  });
});

describe('US-122 AC-03 — prompt version linkage obligatorio', () => {
  it('promptVersionId inexistente => AIPromptVersionNotFoundError, sin crear record', async () => {
    const repo = new FakeAIRecommendationRepository();
    await expect(new PersistAIRecommendationService(repo).persist(validPersistInput({ promptVersionId: 'pv-missing' }))).rejects.toBeInstanceOf(AIPromptVersionNotFoundError);
    expect(repo.created).toHaveLength(0);
  });

  it('promptVersionId vacío => AIPromptVersionNotFoundError', async () => {
    const repo = new FakeAIRecommendationRepository();
    await expect(new PersistAIRecommendationService(repo).persist(validPersistInput({ promptVersionId: '' }))).rejects.toBeInstanceOf(AIPromptVersionNotFoundError);
  });
});

describe('US-122 AC-09/EC-05 — contexto requerido por tipo', () => {
  it('event scope sin eventId => AIRecommendationContextError', async () => {
    const repo = new FakeAIRecommendationRepository();
    await expect(new PersistAIRecommendationService(repo).persist(validPersistInput({ eventId: null }))).rejects.toBeInstanceOf(AIRecommendationContextError);
  });

  it('quote_request scope requiere quoteRequestId', async () => {
    const repo = new FakeAIRecommendationRepository();
    const input = validPersistInput({ type: 'quote_comparison', eventId: null, quoteRequestId: null, outputPayload: { summary: 's', perQuote: [], recommendation: 'r' } });
    await expect(new PersistAIRecommendationService(repo).persist(input)).rejects.toBeInstanceOf(AIRecommendationContextError);
  });

  it('vendor scope (task_prioritization es event) — event_plan requiere eventId presente OK', async () => {
    const repo = new FakeAIRecommendationRepository();
    const view = await new PersistAIRecommendationService(repo).persist(validPersistInput());
    expect(view.requestedByUserId).toBe('user-1');
  });
});

describe('US-122 — validación de metadata básica', () => {
  it('requestedByUserId faltante => AIRecommendationValidationError', async () => {
    const repo = new FakeAIRecommendationRepository();
    await expect(new PersistAIRecommendationService(repo).persist(validPersistInput({ requestedByUserId: '' }))).rejects.toBeInstanceOf(AIRecommendationValidationError);
  });

  it('languageCode no soportado => AIRecommendationValidationError', async () => {
    const repo = new FakeAIRecommendationRepository();
    await expect(new PersistAIRecommendationService(repo).persist(validPersistInput({ languageCode: 'fr' }))).rejects.toBeInstanceOf(AIRecommendationValidationError);
  });
});

describe('US-122 AC-02/AC-10 — sin materialización de dominio', () => {
  it('el service sólo crea AIRecommendation (fake repo no expone ops de dominio)', async () => {
    const repo = new FakeAIRecommendationRepository();
    const findSpy = vi.spyOn(repo, 'findById');
    await new PersistAIRecommendationService(repo).persist(validPersistInput());
    expect(repo.created).toHaveLength(1);
    expect(repo.failed).toHaveLength(0);
    expect(findSpy).not.toHaveBeenCalled();
  });
});

describe('US-122 OBS-001 — logs seguros', () => {
  it('emite ai.recommendation.persisted con sólo metadata segura', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const repo = new FakeAIRecommendationRepository();
    await new PersistAIRecommendationService(repo).persist(validPersistInput());
    const call = info.mock.calls.find((c) => c[0] === 'ai.recommendation.persisted');
    expect(call).toBeDefined();
    expect(JSON.stringify(call)).not.toContain('wedding'); // sin input payload
    expect(JSON.stringify(call)).not.toContain('Reservar'); // sin output payload
  });
});
