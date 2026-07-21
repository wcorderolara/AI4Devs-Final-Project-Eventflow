// US-082 / QA-004 (TS-05) — Verifica el contrato AI binding: el `languageCode` efectivo pasado
// al provider IA se **deriva de `event.languageCode`** cuando la feature es event-scoped o
// quote-request-scoped, sobrescribiendo el `languageCode` provisto por el cliente (D5, AC-05).
// Se usa `event_plan` (US-017) como feature representativa. Sin BD ni HTTP — se aíslan las
// dependencias del use case con fakes en memoria.
import { describe, expect, it, vi } from 'vitest';
import { GenerateAiRecommendationUseCase } from '../../src/modules/ai-assistance/application/generate-ai-recommendation.use-case.js';
import type { AiGenerationService } from '../../src/modules/ai-assistance/application/ai-generation.service.js';
import type { AIRecommendationRepository } from '../../src/modules/ai-assistance/ports/ai-recommendation.repository.js';
import type {
  EventAccessReader,
  EventLanguageReader,
  QuoteRequestEventReader,
  VendorProfileReader,
} from '../../src/shared/access/readers.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { SupportedLanguage } from '../../src/shared/constants/languages.js';

const stubGenerationOutcome = {
  output: {
    theme: 'Boda tropical',
    stages: [
      { name: 'ceremonia', description: 'Descripción X' },
      { name: 'recepción', description: 'Descripción Y' },
    ],
  },
  aiMeta: {
    provider: 'mock' as const,
    promptVersion: 'v1',
    latencyMs: 42,
    fallbackUsed: false,
    languageCode: 'pt' as SupportedLanguage,
  },
  sanitizedInput: { guests: 100 },
};

function makeUseCase(overrides: {
  eventLanguage?: EventLanguageReader | null;
  generateMock?: ReturnType<typeof vi.fn>;
} = {}) {
  const repo: AIRecommendationRepository = {
    createPending: vi.fn().mockResolvedValue({ id: 'rec-1' }),
  } as unknown as AIRecommendationRepository;

  const events: EventAccessReader = {
    getOwnerId: vi.fn().mockResolvedValue('u-1'),
    getCurrency: vi.fn(),
    findOwnedEvent: vi.fn().mockResolvedValue({ id: 'evt-1', currency: 'GTQ', status: 'active' }),
  };
  const vendors: VendorProfileReader = {
    getVendorProfileIdForUser: vi.fn(),
    existsActive: vi.fn(),
    findActiveByUserId: vi.fn(),
  };
  const qrEvents: QuoteRequestEventReader = { getEventId: vi.fn() };
  const logger: DomainEventLogger = { emit: vi.fn() };

  const generation: AiGenerationService = {
    generate: overrides.generateMock ?? vi.fn().mockResolvedValue(stubGenerationOutcome),
  } as unknown as AiGenerationService;

  const eventLanguage: EventLanguageReader | undefined =
    overrides.eventLanguage === null ? undefined : overrides.eventLanguage ?? undefined;

  const uc = new GenerateAiRecommendationUseCase(
    repo,
    generation,
    events,
    vendors,
    qrEvents,
    logger,
    eventLanguage,
  );
  return { uc, generation, repo };
}

describe('US-082 QA-004 — AI binding (event.languageCode → provider locale)', () => {
  it('AC-05: event.language=pt override el languageCode del body (feature event-scope)', async () => {
    const eventLanguage: EventLanguageReader = {
      getLanguage: vi.fn().mockResolvedValue('pt' as SupportedLanguage),
    };
    const generateMock = vi.fn().mockResolvedValue(stubGenerationOutcome);
    const { uc, generation } = makeUseCase({ eventLanguage, generateMock });

    await uc.execute({
      userId: 'u-1',
      feature: 'event_plan',
      contextId: 'evt-1',
      input: { guests: 100 },
      languageCode: 'es-LATAM', // cliente pide es-LATAM, pero el event.language='pt' debe ganar
    });

    expect(eventLanguage.getLanguage).toHaveBeenCalledWith('evt-1');
    // el argumento 3 de generate() es el languageCode.
    expect(generation.generate).toHaveBeenCalledWith('event_plan', { guests: 100 }, 'pt', undefined);
  });

  it('compatibilidad legacy: sin reader inyectado, se preserva el languageCode del comando', async () => {
    const generateMock = vi.fn().mockResolvedValue(stubGenerationOutcome);
    const { uc, generation } = makeUseCase({ eventLanguage: null, generateMock });

    await uc.execute({
      userId: 'u-1',
      feature: 'event_plan',
      contextId: 'evt-1',
      input: { guests: 100 },
      languageCode: 'es-LATAM',
    });

    expect(generation.generate).toHaveBeenCalledWith('event_plan', { guests: 100 }, 'es-LATAM', undefined);
  });

  it('reader devuelve null (evento no encontrado): fallback al languageCode del comando', async () => {
    const eventLanguage: EventLanguageReader = {
      getLanguage: vi.fn().mockResolvedValue(null),
    };
    const generateMock = vi.fn().mockResolvedValue(stubGenerationOutcome);
    const { uc, generation } = makeUseCase({ eventLanguage, generateMock });

    await uc.execute({
      userId: 'u-1',
      feature: 'event_plan',
      contextId: 'evt-1',
      input: { guests: 100 },
      languageCode: 'en',
    });

    expect(generation.generate).toHaveBeenCalledWith('event_plan', { guests: 100 }, 'en', undefined);
  });
});
