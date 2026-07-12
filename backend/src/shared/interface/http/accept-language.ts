// Inferencia de idioma preferido desde `Accept-Language` (US-001 / BE-001, AC-02). Doc 16 §Headers.
// Normaliza al enum `language_code` del contrato (es-LATAM | es-ES | pt | en) con fallback
// es-LATAM. Parser mínimo de la cabecera (tags + q-values), sin dependencias.
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../constants/languages.js';

const FALLBACK: SupportedLanguage = 'es-LATAM';

/** Mapea un language tag BCP-47 al `language_code` soportado, o undefined si no aplica. */
function mapTag(tag: string): SupportedLanguage | undefined {
  const lower = tag.trim().toLowerCase();
  if (lower.length === 0 || lower === '*') return undefined;
  const exact = SUPPORTED_LANGUAGES.find((l) => l.toLowerCase() === lower);
  if (exact) return exact;
  if (lower === 'es-es') return 'es-ES';
  if (lower.startsWith('es')) return 'es-LATAM'; // es, es-419, es-MX, es-GT…
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('en')) return 'en';
  return undefined;
}

/**
 * Resuelve el idioma preferido desde el header `Accept-Language` (ordenado por q-value).
 * Header ausente, malformado o sin match → `es-LATAM` (AC-02, Doc 16).
 */
export function resolvePreferredLanguage(header: string | undefined): SupportedLanguage {
  if (!header) return FALLBACK;
  const candidates = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag.length > 0 && c.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const mapped = mapTag(tag);
    if (mapped) return mapped;
  }
  return FALLBACK;
}
