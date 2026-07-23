// US-115 (PB-P2-012 / BE-002) — Tipos del contrato `GET /api/v1/admin/ai-metrics`
// y lista canónica de features IA MVP.
//
// Deviation D-01 (execution record): Los 7 nombres canónicos usan el enum real
// `AI_FEATURE_TYPES` del módulo `ai-assistance` (event_plan, checklist,
// budget_suggestion, vendor_categories, quote_brief, quote_compare_summary,
// vendor_bio) en vez de los alias declarados por US-115 (`budget_split`,
// `category_suggestion`, `comparator_summary`). Rationale: son los `kind`
// realmente persistidos por UC-AI-001..UC-AI-007 y por el resto del sistema.
//
// AC-01 se preserva: 7 entradas fijas, orden estable, mismos 4 campos numéricos
// por entrada.

export type AIMetricsWindow = '24h' | 'all-time';
export type AIMetricsWindowRequested = AIMetricsWindow | 'both';

/**
 * 7 features IA MVP core, en orden estable. El response garantiza SIEMPRE una
 * entrada por cada una (con `count=0`/nulls cuando no hay data — AC-05).
 */
export const CANONICAL_AI_FEATURES = [
  'event_plan',
  'checklist',
  'budget_suggestion',
  'vendor_categories',
  'quote_brief',
  'quote_compare_summary',
  'vendor_bio',
] as const;

export type AIFeatureType = (typeof CANONICAL_AI_FEATURES)[number];

export interface AIFeatureMetric {
  type: AIFeatureType;
  count: number;
  latencyAvgMs: number | null;
  fallbackRate: number | null;
  acceptanceRate: number | null;
}

export interface AIWindowMetrics {
  window: AIMetricsWindow;
  features: AIFeatureMetric[]; // exactly 7, orden fijo per CANONICAL_AI_FEATURES.
}

export interface AIMetricsResponse {
  windows: AIWindowMetrics[]; // 1 o 2 según ?window
}

/**
 * Row cruda emitida por el repository (previa al fill de features ausentes).
 * `count` puede llegar como `bigint` desde `$queryRaw` con `COUNT(*)::int`; el
 * caller normaliza a `number`.
 */
export interface AIMetricsRawRow {
  type: string;
  count: number | bigint;
  latencyAvgMs: number | null;
  fallbackRate: number | null;
  acceptanceRate: number | null;
}
