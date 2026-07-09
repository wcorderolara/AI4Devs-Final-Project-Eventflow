// PersistAIRecommendationService (US-122 / BE-003). Punto de entrada de persistencia para use cases
// IA futuros. Valida metadata obligatoria, exige output validado, normaliza estado HITL inicial
// (`pending`), sanitiza el input, valida contexto por tipo y delega al repository. NO invoca
// providers, NO orquesta fallback y NO materializa dominio (HITL). Soporta transaction client.
import type { AIRecommendationRepository, RepositoryWriteOptions } from '../ports/ai-recommendation.repository.js';
import {
  OUTPUT_SCHEMAS,
  FEATURE_SCOPE,
  AI_FEATURE_TYPES,
  type AiFeatureType,
} from '../domain/ai-features.js';
import type {
  AiRecommendationView,
  PersistAiRecommendationInput,
  PersistAiRecommendationFailureInput,
  AIRecommendationProvider,
} from '../domain/ai-recommendation.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import {
  AIPromptVersionNotFoundError,
  AIRecommendationContextError,
  AIRecommendationInvalidOutputError,
  AIRecommendationValidationError,
} from '../domain/errors/ai-recommendation-persistence.errors.js';
import { sanitizeInputPayload } from './ai-recommendation-payload-sanitizer.js';
import {
  logRecommendationPersisted,
  logRecommendationPersistFailed,
} from './ai-recommendation-persist-logger.js';

const APPROVED_PROVIDERS: readonly AIRecommendationProvider[] = ['openai', 'mock', 'anthropic'];
// Providers que pueden producir un record `pending` exitoso. `anthropic` es stub no funcional
// (US/spec §11): sólo se admite en failure records, no como success MVP (Deviation D3).
const SUCCESS_PROVIDERS: readonly AIRecommendationProvider[] = ['openai', 'mock'];

export class PersistAIRecommendationService {
  constructor(private readonly repo: AIRecommendationRepository) {}

  /**
   * Persiste una recomendación IA validada como `pending` (HITL). Lanza errores tipados ANTES de
   * insertar ante metadata/output/contexto inválidos. No crea ni modifica entidades de dominio.
   */
  async persist(input: PersistAiRecommendationInput, options?: RepositoryWriteOptions): Promise<AiRecommendationView> {
    try {
      this.assertCommonMetadata(input);

      // Success provider (Deviation D3): anthropic stub no produce success MVP.
      if (!SUCCESS_PROVIDERS.includes(input.provider)) {
        throw new AIRecommendationValidationError(`Provider ${input.provider} cannot persist a successful recommendation`, this.meta(input));
      }

      // Output validado (AC-07 / VR-06): exige marker + re-valida contra el schema del feature.
      if (input.schemaValid !== true) {
        throw new AIRecommendationInvalidOutputError('Output is not marked schema-valid', this.meta(input));
      }
      const parsed = OUTPUT_SCHEMAS[input.type].safeParse(input.outputPayload);
      if (!parsed.success) {
        throw new AIRecommendationInvalidOutputError('Output failed schema validation', this.meta(input));
      }

      // Contexto por tipo (AC-09 / EC-05).
      this.assertContextByType(input);

      // Prompt version existente (AC-03 / EC-01).
      const exists = await this.repo.existsPromptVersion(input.promptVersionId, options);
      if (!exists) {
        throw new AIPromptVersionNotFoundError('promptVersionId does not exist', this.meta(input));
      }

      // Sanitización/minimización del input (AC-06 / SEC-01).
      const sanitized = sanitizeInputPayload(input.inputPayload);

      const view = await this.repo.create({ ...input, inputPayload: sanitized, outputPayload: parsed.data }, options);

      logRecommendationPersisted({
        recommendationId: view.id,
        type: input.type,
        provider: input.provider,
        fallbackUsed: input.fallbackUsed,
        latencyMs: input.latencyMs,
        timeoutMs: input.timeoutMs,
        correlationId: input.correlationId,
        status: 'pending',
      });
      return view;
    } catch (err) {
      logRecommendationPersistFailed({
        type: input.type,
        provider: input.provider,
        fallbackUsed: input.fallbackUsed,
        latencyMs: input.latencyMs,
        timeoutMs: input.timeoutMs,
        correlationId: input.correlationId,
        status: 'failed',
        errorCode: err instanceof Error && 'code' in err ? String((err as { code: unknown }).code) : 'AI_RECOMMENDATION_PERSISTENCE',
      });
      throw err;
    }
  }

  /**
   * Registra un fallo controlado como `AIRecommendation` con `status=failed` y sólo metadata segura
   * (AC-08). No persiste raw provider output ni input sensible.
   */
  async persistFailure(
    input: PersistAiRecommendationFailureInput,
    options?: RepositoryWriteOptions,
  ): Promise<AiRecommendationView> {
    this.assertCommonMetadata(input);
    this.assertContextByType(input);
    const exists = await this.repo.existsPromptVersion(input.promptVersionId, options);
    if (!exists) {
      throw new AIPromptVersionNotFoundError('promptVersionId does not exist', this.meta(input));
    }
    const view = await this.repo.createFailed(input, options);
    logRecommendationPersistFailed({
      recommendationId: view.id,
      type: input.type,
      provider: input.provider,
      fallbackUsed: input.fallbackUsed,
      latencyMs: input.latencyMs,
      timeoutMs: input.timeoutMs,
      correlationId: input.correlationId,
      status: 'failed',
      errorCode: input.errorCode,
    });
    return view;
  }

  // ── Validaciones compartidas ───────────────────────────────────────────────

  private assertCommonMetadata(
    input: PersistAiRecommendationInput | PersistAiRecommendationFailureInput,
  ): void {
    const meta = this.meta(input);
    if (!input.requestedByUserId) {
      throw new AIRecommendationValidationError('requestedByUserId is required', meta);
    }
    if (!input.promptVersionId) {
      throw new AIPromptVersionNotFoundError('promptVersionId is required', meta);
    }
    if (!(AI_FEATURE_TYPES as readonly string[]).includes(input.type)) {
      throw new AIRecommendationValidationError(`Unsupported recommendation type ${input.type}`, meta);
    }
    if (!APPROVED_PROVIDERS.includes(input.provider)) {
      throw new AIRecommendationValidationError(`Unsupported provider ${input.provider}`, meta);
    }
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(input.languageCode)) {
      throw new AIRecommendationValidationError(`Unsupported language ${input.languageCode}`, meta);
    }
    // Consistencia de fallback (EC-04): fallback ⇒ provider mock (el fallback upstream usa Mock).
    if (input.fallbackUsed === true && input.provider !== 'mock') {
      throw new AIRecommendationValidationError('fallbackUsed=true requires provider=mock', meta);
    }
  }

  private assertContextByType(
    input: { type: AiFeatureType; eventId?: string | null; vendorProfileId?: string | null; quoteRequestId?: string | null },
  ): void {
    const scope = FEATURE_SCOPE[input.type];
    const meta = { type: input.type };
    if (scope === 'event' && !input.eventId) {
      throw new AIRecommendationContextError(`Type ${input.type} requires eventId`, meta);
    }
    if (scope === 'quote_request' && !input.quoteRequestId) {
      throw new AIRecommendationContextError(`Type ${input.type} requires quoteRequestId`, meta);
    }
    if (scope === 'vendor' && !input.vendorProfileId) {
      throw new AIRecommendationContextError(`Type ${input.type} requires vendorProfileId`, meta);
    }
  }

  private meta(input: { type: string; provider: string; promptVersionId: string; correlationId?: string }) {
    return {
      type: input.type,
      provider: input.provider,
      promptVersionId: input.promptVersionId,
      correlationId: input.correlationId,
    };
  }
}
