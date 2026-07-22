// PromptRegistry — allowlist de features MVP (US-121 / AI-003, AC-09). Un prompt de feature
// Future/P4 (p. ej. vendor bio / package generation) NO puede resolverse como `active` en runtime
// MVP salvo promoción formal (decisión PO + ADR/backlog). Puede existir como `draft`/skeleton.
import type { AiFeatureType } from '../../domain/ai-features.js';

/**
 * Features habilitadas para servir prompts `active` en el MVP (AC-09 / VR-08).
 * `vendor_bio` queda FUERA: la User Story US-121 clasifica vendor bio/package generation como
 * P4/Future; sólo puede existir como prompt `draft` hasta una promoción formal.
 */
export const MVP_ACTIVE_FEATURE_ALLOWLIST: readonly AiFeatureType[] = [
  'event_plan',
  'checklist',
  'budget_suggestion',
  'vendor_categories',
  'quote_brief',
  'quote_comparison',
  // US-022 (PB-P2-001 / AI-006): promovida al MVP con prompt v1 y schema Zod estricto.
  'quote_compare_summary',
  'task_prioritization',
  // US-024 (PB-P2-002 / AI-008): promovida al MVP con prompt v1 en 4 locales y schema Zod estricto.
  'task_priority',
] as const;

/** Features clasificadas como Future/P4: no pueden estar `active` en MVP. */
export const FUTURE_FEATURE_TYPES: readonly AiFeatureType[] = ['vendor_bio'] as const;

/** `true` si la feature puede servir prompts `active` en el MVP. */
export function isMvpActiveFeature(feature: AiFeatureType): boolean {
  return MVP_ACTIVE_FEATURE_ALLOWLIST.includes(feature);
}
