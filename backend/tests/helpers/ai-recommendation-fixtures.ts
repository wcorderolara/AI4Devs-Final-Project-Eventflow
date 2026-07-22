// Fixtures para tests de persistencia AIRecommendation (US-122 / QA). Fake repo en memoria (sin DB,
// sin red) + builder de input válido. El fake sólo implementa operaciones de `AIRecommendation`, lo
// que evidencia que el service no materializa dominio (AC-02/AC-10).
import type {
  AIRecommendationRepository,
  RepositoryWriteOptions,
} from '../../src/modules/ai-assistance/ports/ai-recommendation.repository.js';
import type {
  AiRecommendationView,
  CreateAiRecommendationData,
  PersistAiRecommendationInput,
  PersistAiRecommendationFailureInput,
  AIPromptVersionSyncRow,
} from '../../src/modules/ai-assistance/domain/ai-recommendation.js';

let counter = 0;

export class FakeAIRecommendationRepository implements AIRecommendationRepository {
  created: PersistAiRecommendationInput[] = [];
  failed: PersistAiRecommendationFailureInput[] = [];
  upserted: AIPromptVersionSyncRow[] = [];
  promptVersions = new Set<string>(['pv-valid']);

  async createPending(_data: CreateAiRecommendationData): Promise<AiRecommendationView> {
    throw new Error('not used in US-122 tests');
  }
  async findById(): Promise<AiRecommendationView | null> {
    return null;
  }
  async markStatus(): Promise<AiRecommendationView> {
    throw new Error('not used in US-122 tests');
  }

  async create(input: PersistAiRecommendationInput, _options?: RepositoryWriteOptions): Promise<AiRecommendationView> {
    this.created.push(input);
    return this.view(input, 'pending');
  }

  async createFailed(
    input: PersistAiRecommendationFailureInput,
    _options?: RepositoryWriteOptions,
  ): Promise<AiRecommendationView> {
    this.failed.push(input);
    return {
      id: `rec-${(counter += 1)}`,
      type: input.type,
      status: 'failed',
      requestedByUserId: input.requestedByUserId,
      eventId: input.eventId ?? null,
      vendorProfileId: input.vendorProfileId ?? null,
      quoteRequestId: input.quoteRequestId ?? null,
      input: {},
      output: { errorCode: input.errorCode },
      aiMeta: null,
      // US-084 (BE-004): las columnas denormalizadas también se preservan en el fake.
      locale: input.languageCode,
      localeFallback: input.fallbackUsed,
      createdAt: '2026-07-09T00:00:00.000Z',
    };
  }

  async existsPromptVersion(promptVersionId: string): Promise<boolean> {
    return this.promptVersions.has(promptVersionId);
  }

  async upsertPromptVersion(row: AIPromptVersionSyncRow): Promise<void> {
    this.upserted.push(row);
    this.promptVersions.add(row.id);
  }

  // US-059 (PB-P2-001 / BE-002): fake trivial — retorna null (los tests que lo requieran usan
  // el fake extendido `FakeAIRecommendationRepositoryWithLatest` definido en su propio spec).
  async findLatestByEventTypeAndCategory(): Promise<AiRecommendationView | null> {
    return null;
  }

  private view(input: PersistAiRecommendationInput, status: 'pending'): AiRecommendationView {
    return {
      id: `rec-${(counter += 1)}`,
      type: input.type,
      status,
      requestedByUserId: input.requestedByUserId,
      eventId: input.eventId ?? null,
      vendorProfileId: input.vendorProfileId ?? null,
      quoteRequestId: input.quoteRequestId ?? null,
      input: input.inputPayload,
      output: input.outputPayload,
      aiMeta: {
        provider: input.provider,
        promptVersion: input.promptVersionLabel ?? input.promptVersionId,
        latencyMs: input.latencyMs,
        fallbackUsed: input.fallbackUsed,
        languageCode: input.languageCode,
      },
      // US-084 (BE-004): columnas denormalizadas replicadas en el fake.
      locale: input.languageCode,
      localeFallback: input.fallbackUsed,
      createdAt: '2026-07-09T00:00:00.000Z',
    };
  }
}

/** Input de persistencia válido (event_plan / es-LATAM / openai). Sobreescribible por test. */
export function validPersistInput(
  overrides: Partial<PersistAiRecommendationInput> = {},
): PersistAiRecommendationInput {
  return {
    requestedByUserId: 'user-1',
    type: 'event_plan',
    promptVersionId: 'pv-valid',
    provider: 'openai',
    languageCode: 'es-LATAM',
    fallbackUsed: false,
    timeoutMs: 60000,
    latencyMs: 120,
    correlationId: 'corr-1',
    inputPayload: { eventType: 'wedding', guestCount: 100 },
    outputPayload: { summary: 'Plan', phases: [{ name: 'Phase 1', tasks: ['Reservar salón'] }] },
    schemaValid: true,
    eventId: 'event-1',
    vendorProfileId: null,
    quoteRequestId: null,
    ...overrides,
  };
}
