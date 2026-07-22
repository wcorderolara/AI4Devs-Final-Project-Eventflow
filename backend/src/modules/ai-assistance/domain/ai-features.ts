// Registro de features AI (US-097 / BE-001, AI-001). Cada feature declara su scope de autorización
// y su schema Zod de output. El motor de generación valida el output antes de responder/persistir.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';

export const AI_FEATURE_TYPES = [
  'event_plan',
  'checklist',
  'budget_suggestion',
  'vendor_categories',
  'quote_brief',
  'quote_comparison',
  // US-022 (PB-P2-001 / AI-006): resumen IA del comparador con HITL informativo, event-scope y
  // filtrado por `category_code`. Distinto de `quote_comparison` (quote_request-scope de US-097).
  'quote_compare_summary',
  'vendor_bio',
  'task_prioritization',
] as const;
export type AiFeatureType = (typeof AI_FEATURE_TYPES)[number];

export type AiFeatureScope = 'event' | 'quote_request' | 'vendor';

const decimal = z.string().regex(/^\d+(\.\d{1,2})?$/);

// Output schemas (self-contained en US-097; PB-P0-010/011 refinan los definitivos).
export const OUTPUT_SCHEMAS = {
  event_plan: z.object({
    summary: z.string().min(1),
    phases: z.array(z.object({ name: z.string().min(1), tasks: z.array(z.string().min(1)) }).strict()).min(1),
  }).strict(),
  // US-018 (PB-P1-012 / AC-04): checklist agrupable por fase T-x con `due_relative_days`.
  checklist: z.object({
    tasks: z
      .array(
        z
          .object({
            title: z.string().min(1),
            description: z.string(),
            category: z.string().min(1),
            due_relative_days: z.number().int().min(0),
            phase: z.enum(['T-180', 'T-90', 'T-30', 'T-7', 'T-1']),
            priority: z.enum(['low', 'medium', 'high']),
          })
          .strict(),
      )
      .min(1),
  }).strict(),
  budget_suggestion: z.object({
    currencyCode: z.enum(SUPPORTED_CURRENCIES),
    items: z.array(z.object({ category: z.string().min(1), estimatedAmount: decimal }).strict()).min(1),
  }).strict(),
  vendor_categories: z.object({
    categories: z.array(z.object({ code: z.string().min(1), reason: z.string().min(1) }).strict()).min(1),
  }).strict(),
  quote_brief: z.object({
    brief: z.string().min(1),
    requirements: z.array(z.string().min(1)).min(1),
    questions: z.array(z.string().min(1)).min(1),
    constraints: z.array(z.string().min(1)),
  }).strict(),
  quote_comparison: z.object({
    summary: z.string().min(1),
    perQuote: z.array(
      z.object({
        quoteId: z.string(),
        strengths: z.array(z.string()),
        risks: z.array(z.string()),
        missingInfo: z.array(z.string()),
      }).strict(),
    ),
    recommendation: z.string().min(1),
  }).strict(),
  // US-022 (AC-02/AC-03): output HITL informativo — pros/cons/missing_info/notes por quote y
  // `overall_observations` opcional. Sin campo de decisión automática (el usuario decide en US-058).
  quote_compare_summary: z.object({
    summaries: z
      .array(
        z
          .object({
            quote_id: z.string().uuid(),
            pros: z.array(z.string().min(1)).max(5),
            cons: z.array(z.string().min(1)).max(5),
            missing_info: z.array(z.string().min(1)).max(3),
            notes: z.string().max(500),
          })
          .strict(),
      )
      .min(1),
    overall_observations: z.string().max(500).optional(),
  }).strict(),
  vendor_bio: z.object({
    bio: z.string().min(1),
    highlights: z.array(z.string().min(1)).min(1),
  }).strict(),
  task_prioritization: z.object({
    prioritized: z.array(z.object({ title: z.string().min(1), rank: z.number().int().positive(), rationale: z.string().min(1) }).strict()).min(1),
  }).strict(),
} as const satisfies Record<AiFeatureType, z.ZodType>;

export const FEATURE_SCOPE = {
  event_plan: 'event',
  checklist: 'event',
  budget_suggestion: 'event',
  vendor_categories: 'event',
  quote_brief: 'event',
  quote_comparison: 'quote_request',
  // US-022 (D6/AC-01): event-scope (organizer owner). El body incluye `category_code` para
  // filtrar quotes; el use case delegado hace preflight (≥2 elegibles + categoría existente).
  quote_compare_summary: 'event',
  vendor_bio: 'vendor',
  task_prioritization: 'event',
} as const satisfies Record<AiFeatureType, AiFeatureScope>;
