// AiGenerationService (US-097 / AI-002, SEC-003). Sanitiza input (excluye PII antes del provider,
// VR-08), llama al LLMProvider y VALIDA el output contra el schema del feature (VR-05) → si falla,
// AiInvalidOutputError. Idioma no soportado → UnsupportedLanguageError; input vacío → MissingInputError.
import type { LLMProvider } from '../ports/llm-provider.js';
import { OUTPUT_SCHEMAS, type AiFeatureType } from '../domain/ai-features.js';
import type { AiMeta } from '../domain/ai-recommendation.js';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../../shared/constants/languages.js';
import {
  MissingInputError,
  UnsupportedLanguageError,
  AiInvalidOutputError,
} from '../../../shared/domain/errors/ai.errors.js';

const PII_KEYS = new Set(['email', 'phone', 'password', 'fiscalId', 'taxId', 'creditCard', 'ssn', 'secret', 'apiKey']);

function sanitize(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!PII_KEYS.has(k)) out[k] = v;
  }
  return out;
}

export interface GenerationOutcome {
  output: unknown;
  aiMeta: AiMeta;
  sanitizedInput: Record<string, unknown>;
}

export class AiGenerationService {
  constructor(private readonly provider: LLMProvider) {}

  async generate(
    feature: AiFeatureType,
    rawInput: Record<string, unknown> | undefined,
    languageCode: string | undefined,
    preferMock: boolean | undefined,
  ): Promise<GenerationOutcome> {
    if (!rawInput || Object.keys(rawInput).length === 0) throw new MissingInputError();
    const lang = languageCode ?? 'es-LATAM';
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) throw new UnsupportedLanguageError();

    const sanitizedInput = sanitize(rawInput);
    const result = await this.provider.generate({ feature, input: sanitizedInput, languageCode: lang, preferMock });

    const parsed = OUTPUT_SCHEMAS[feature].safeParse(result.output);
    if (!parsed.success) throw new AiInvalidOutputError();

    return {
      output: parsed.data,
      aiMeta: {
        provider: result.provider,
        promptVersion: result.promptVersion,
        latencyMs: result.latencyMs,
        fallbackUsed: result.fallbackUsed,
        languageCode: lang as SupportedLanguage,
      },
      sanitizedInput,
    };
  }
}
