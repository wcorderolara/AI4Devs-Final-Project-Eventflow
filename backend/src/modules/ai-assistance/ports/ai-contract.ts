// Contrato formal del puerto LLMProvider (US-117 / PB-P0-009). Backend-only, sin SDKs.
// Formaliza los tipos compartidos que los adapters (US-118 OpenAI, US-119 Mock, US-120 Anthropic)
// deben respetar. NOTA DE ALINEACIÓN (US-097 vs US-117): el puerto operativo entregado por US-097
// usa `LlmGenerationResult`/`generate()` (ver `./llm-provider.ts`); `AIContext` y `AIResult<TOutput>`
// definidos aquí son la forma auditable canónica hacia la que convergen esos adapters. Ver README.md.

// `LanguageCode` reutiliza la fuente de verdad del contrato API (US-092): `es-LATAM | es-ES | pt | en`.
export type { SupportedLanguage as LanguageCode } from '../../../shared/constants/languages.js';
import type { SupportedLanguage as LanguageCode } from '../../../shared/constants/languages.js';

// Providers aprobados para MVP (VR-02 / AC-06). Alineado con `config.LLM_PROVIDER` (US-097).
// Agregar un provider futuro requiere ADR/decisión PO — no se amplía aquí en silencio.
export type ProviderId = 'openai' | 'mock' | 'anthropic';

// Identificador de versión de prompt (AC-03). US-117 no define PromptRegistry; sólo exige transportarlo.
export type PromptVersionId = string;

/**
 * Contexto de invocación del puerto (AC-03). Transporta idioma, trazabilidad y timeout hacia el
 * provider. No decide selección dinámica ni fallback: `preferMock` es sólo contexto para capas de
 * composición/fallback autorizadas (EC-04). `currency` viaja como metadata y no habilita conversión.
 * No debe recibir ni exponer API keys, cookies, tokens ni secrets (SEC-02).
 */
export interface AIContext {
  language: LanguageCode;
  userId: string;
  promptVersionId: PromptVersionId;
  correlationId: string;
  /** Default operativo 60_000 ms se aplica fuera del puerto (VR-03). Entero positivo. */
  timeoutMs: number;
  eventId?: string;
  vendorProfileId?: string;
  /** Metadata de contexto; NO autoriza conversión automática de moneda. */
  currency?: string;
  /** Sólo contexto; honrado por composition/fallback bajo flags autorizados, no por el puerto. */
  preferMock?: boolean;
}

/**
 * Resultado auditable del provider (AC-04). Toda la metadata de observabilidad es obligatoria para
 * habilitar logs/métricas/auditoría en historias posteriores (US-118/119/120). `rawOutputHash` es
 * opcional para auditar sin almacenar texto crudo del provider (SEC-04).
 */
export interface AIResult<TOutput> {
  output: TOutput;
  provider: ProviderId;
  promptVersionId: PromptVersionId;
  languageCode: LanguageCode;
  latencyMs: number;
  fallbackUsed: boolean;
  rawOutputHash?: string;
}
