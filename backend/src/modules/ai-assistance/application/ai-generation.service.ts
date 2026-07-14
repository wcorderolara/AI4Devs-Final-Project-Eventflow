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

/**
 * US-021 (PB-P1-015 / AI-004, SEC-07) — Detector de PII organizacional para outputs de LLM.
 *
 * Estrategia doble:
 *   1. **Regex** sobre TODOS los strings alcanzables del payload — detecta email, teléfono
 *      internacional (≥ 9 dígitos), y direcciones postales por keywords multilingua
 *      (`calle`, `avenida`, `boulevard`, `rua`, `street`, `road`, `av.`, etc.) seguidas de
 *      número.
 *   2. **Matching literal** contra un catálogo opcional de PII conocida del organizador
 *      (`street`, `email`, `phone`, etc.). Cualquier ocurrencia literal → `organizer_literal`.
 *
 * Retorna categorías detectadas (nunca contenido) para `pii_categories` en logs (SEC-05).
 * `ok = matches.length === 0`.
 */
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s\-().]{8,})/;
const ADDRESS_RE =
  /\b(?:calle|avenida|av\.|boulevard|blvd\.?|carrera|colonia|rua|street|st\.|road|rd\.|avenue|ave\.)\s+[\w\p{L}]+.*?\d+/iu;

export function detectOrganizerPii(
  payload: unknown,
  knownPii?: Record<string, string | undefined | null> | null,
): { ok: boolean; matches: string[] } {
  const found = new Set<string>();
  const collectStrings = (node: unknown, acc: string[]): void => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      acc.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) collectStrings(item, acc);
      return;
    }
    if (typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) collectStrings(v, acc);
    }
  };
  const strings: string[] = [];
  collectStrings(payload, strings);

  for (const s of strings) {
    if (EMAIL_RE.test(s)) found.add('email');
    if (PHONE_RE.test(s)) found.add('phone');
    if (ADDRESS_RE.test(s)) found.add('address');
  }

  if (knownPii) {
    for (const value of Object.values(knownPii)) {
      if (typeof value !== 'string' || value.length === 0) continue;
      const needle = value.toLowerCase();
      if (strings.some((s) => s.toLowerCase().includes(needle))) {
        found.add('organizer_literal');
        break;
      }
    }
  }

  const matches = Array.from(found).sort();
  return { ok: matches.length === 0, matches };
}

/**
 * US-021 (PB-P1-015 / BE-002) — Whitelist runtime para componer `vendor_summary` a partir
 * del `vendor_profile` sin filtrar campos sensibles (email, phone, owner_name, etc.).
 * Retorna solo campos públicos y `null` cuando ningún campo útil queda tras el filtro.
 */
const VENDOR_SUMMARY_PUBLIC_FIELDS = [
  'categories_served',
  'city',
  'languages',
  'public_packages',
] as const;

export function composeVendorSummary(input: unknown): Record<string, unknown> | null {
  if (input === null || input === undefined || typeof input !== 'object') return null;
  const source = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of VENDOR_SUMMARY_PUBLIC_FIELDS) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * US-020 (PB-P1-014 / AI-003) — Filtra vendor_categories contra whitelist de códigos activos.
 * `null` o `[]` en `activeCodes` preserva todas las categorías (compat US-097).
 * Retorna `{ kept, unknown }` con los códigos descartados para logging (EC-01).
 */
export interface VendorCategoryItem {
  service_category_code: string;
  name?: string;
  priority_score?: number;
  reason?: string;
  [key: string]: unknown;
}

export function filterVendorCategories<T extends VendorCategoryItem>(
  raw: readonly T[],
  activeCodes: readonly string[] | null,
): { kept: T[]; unknown: string[] } {
  if (activeCodes === null || activeCodes.length === 0) {
    return { kept: [...raw], unknown: [] };
  }
  const allowed = new Set(activeCodes);
  const kept: T[] = [];
  const unknown: string[] = [];
  for (const item of raw) {
    if (allowed.has(item.service_category_code)) kept.push(item);
    else unknown.push(item.service_category_code);
  }
  return { kept, unknown };
}

/**
 * US-020 (PB-P1-014 / BE-003) — Ordena vendor_categories por `priority_score` descendente
 * sin mutar el arreglo original.
 */
export function sortVendorCategoriesByPriorityDesc<T extends VendorCategoryItem>(
  arr: readonly T[],
): T[] {
  return [...arr].sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
}

/**
 * US-019 (PB-P1-013 / BE-003, AI-003) — Compone el output canónico de `budget_suggestion`.
 * Calcula `amount = round(percentage/100 * budget_estimated)` por categoría y acumula el
 * drift de redondeo en la última categoría para preservar `Σ amount = budget_estimated`.
 * Default `currency_code = 'GTQ'` cuando el input no lo provee.
 */
export interface BudgetSuggestionCategoryIn {
  name: string;
  service_category_code: string;
  percentage: number;
  notes?: string;
}
export interface BudgetSuggestionCategoryOut extends BudgetSuggestionCategoryIn {
  amount: number;
}
export interface BudgetSuggestionOutput {
  currency_code: string;
  budget_estimated: number;
  categories: BudgetSuggestionCategoryOut[];
}

export function assembleBudgetSuggestionOutput(
  parsed: { categories: BudgetSuggestionCategoryIn[] },
  input: { budget_estimated: number; currency_code?: string },
): BudgetSuggestionOutput {
  const currency = input.currency_code ?? 'GTQ';
  const total = input.budget_estimated;
  const categories: BudgetSuggestionCategoryOut[] = parsed.categories.map((c) => ({
    ...c,
    amount: Math.round((c.percentage / 100) * total),
  }));
  if (categories.length > 0) {
    const sum = categories.reduce((acc, c) => acc + c.amount, 0);
    const drift = total - sum;
    if (drift !== 0) {
      const last = categories[categories.length - 1];
      if (last !== undefined) last.amount += drift;
    }
  }
  return { currency_code: currency, budget_estimated: total, categories };
}

/**
 * US-018 (PB-P1-012 / AI-003, EC-01) — Filtro T-x del checklist IA.
 * Preserva tareas con `due_relative_days ∈ [0, daysToEvent]`. Descarta las negativas.
 * Fallback ceremonial: si `daysToEvent === 0` y todas las tareas quedan filtradas (por ser
 * futuras), retorna al menos la más cercana (menor `due_relative_days` positivo) para
 * cumplir el schema `.min(1)`.
 */
export interface ChecklistTaskLike {
  due_relative_days: number;
  [key: string]: unknown;
}

export function filterChecklistTasksByDaysToEvent<T extends ChecklistTaskLike>(
  tasks: readonly T[],
  daysToEvent: number,
): T[] {
  const nonNegative = tasks.filter((t) => t.due_relative_days >= 0);
  const withinRange = nonNegative.filter((t) => t.due_relative_days <= daysToEvent);
  if (withinRange.length > 0) return withinRange;
  if (nonNegative.length === 0) return [];
  // Fallback ceremonial: retorna la más cercana (mínimo positivo).
  const nearest = nonNegative.reduce((min, t) =>
    t.due_relative_days < min.due_relative_days ? t : min,
  );
  return [nearest];
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
