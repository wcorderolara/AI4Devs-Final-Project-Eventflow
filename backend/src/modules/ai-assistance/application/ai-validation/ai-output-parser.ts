// Parser seguro de output IA (US-124 / BE-002, AC-01/AC-02, EC-01). JSON-ONLY: acepta un objeto ya
// estructurado, o un string que sea JSON puro. NO extrae JSON embebido en prosa ni repara JSON
// (evita ambigüedad e inyección). Falla con `AiOutputParseError` sin exponer el raw output.
import { AiOutputParseError } from '../../../../shared/domain/errors/ai.errors.js';
import type { AIValidationContext } from './ai-validation-types.js';

/** Longitud máxima del summary de error (bounded, sin raw output). */
const SUMMARY_MAX = 200;

function truncate(text: string): string {
  return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX)}…` : text;
}

/**
 * Parsea el output del provider a un objeto plano validable. Objetos → se devuelven tal cual
 * (no arrays ni primitivos). Strings → `JSON.parse` estricto. Cualquier otro caso → parse error.
 */
export function parseAIOutput(raw: unknown, ctx: AIValidationContext = {}): Record<string, unknown> {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AiOutputParseError('AI output is not valid JSON', {
        provider: ctx.provider,
        correlationId: ctx.correlationId,
        schemaErrorSummary: 'malformed JSON string',
      });
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new AiOutputParseError('AI output JSON is not an object', {
        provider: ctx.provider,
        correlationId: ctx.correlationId,
        schemaErrorSummary: truncate(`parsed type: ${Array.isArray(parsed) ? 'array' : typeof parsed}`),
      });
    }
    return parsed as Record<string, unknown>;
  }
  throw new AiOutputParseError('AI output has unsupported type', {
    provider: ctx.provider,
    correlationId: ctx.correlationId,
    schemaErrorSummary: truncate(`unsupported type: ${raw === null ? 'null' : typeof raw}`),
  });
}
