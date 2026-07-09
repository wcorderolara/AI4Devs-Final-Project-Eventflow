// PromptRegistry — templates MVP iniciales (US-121 / AI-001, AC-01/AC-05). Prompts como artefactos
// versionados en código (ADR-AI-006). Cada template `active` incluye metadata completa, schema refs,
// safety constraints (AC-06) y un hash declarado (AC-08). Contenido SIN secrets ni PII real (SEC-001);
// los ejemplos, si los hubiera, son sintéticos.
//
// Cobertura demostrativa:
//   - Todas las features MVP in-scope tienen un prompt `active` en `es-LATAM`.
//   - `event_plan` incluye además `en` (soporte multi-idioma, AC-01) y una V1 `deprecated`
//     conservada para audit/replay (AC-02).
//   - `vendor_bio` es Future/P4: existe como `draft` y NUNCA se sirve `active` (AC-09).
import type { PromptTemplate } from '../prompt-template.js';
import { MVP_ACTIVE_SAFETY, SAFETY_INSTRUCTION_BLOCK } from '../safety-constraints.js';

const CREATED_AT = '2026-06-17T00:00:00Z';
const APPROVED_AT = '2026-06-17T00:00:00Z';

/** Metadata base de un prompt aprobado/activo del MVP. */
function approvedMeta(changeReason: string, relatedRules: string[]) {
  return {
    createdBy: 'promptops-team',
    approvedBy: 'product-owner',
    changeReason,
    relatedRules,
    createdAt: CREATED_AT,
    approvedAt: APPROVED_AT,
  };
}

export const MVP_PROMPT_TEMPLATES: PromptTemplate[] = [
  // ── event_plan ────────────────────────────────────────────────────────────
  {
    promptKey: 'event_plan.es-LATAM',
    version: 'V2',
    featureType: 'event_plan',
    status: 'active',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.event_plan.input.v1',
    outputSchemaRef: 'ai.event_plan.output.v1',
    templateHash: 'sha256:4944e5893455c153a79e28c114aaf6ce6f1d3e389f8f0fddb229e1b97e7ece4d',
    systemInstructions:
      'You are an event planning assistant for EventFlow. Produce a concise event plan with a summary and ordered phases, each phase containing concrete tasks, in neutral LATAM Spanish. ' +
      SAFETY_INSTRUCTION_BLOCK,
    developerRules: [
      'Base the plan strictly on the provided event data; do not invent budget figures or vendor commitments.',
      'Keep phases actionable and ordered from earliest to latest.',
    ],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: approvedMeta('V2: reglas de fases ordenadas y summary obligatorio', ['BR-AI-001', 'BR-AI-010']),
  },
  {
    promptKey: 'event_plan.es-LATAM',
    version: 'V1',
    featureType: 'event_plan',
    status: 'deprecated',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.event_plan.input.v1',
    outputSchemaRef: 'ai.event_plan.output.v1',
    templateHash: 'sha256:56f661742a2b1c7096035fd8ea52dd8a4839d58423833fe982f416277a002054',
    systemInstructions:
      'You are an event planning assistant for EventFlow. Produce an event plan with a summary and phases in neutral LATAM Spanish. ' +
      SAFETY_INSTRUCTION_BLOCK,
    developerRules: ['Base the plan strictly on the provided event data.'],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: approvedMeta('V1 inicial (deprecada por V2); conservada para audit/replay', ['BR-AI-001']),
  },
  {
    promptKey: 'event_plan.en',
    version: 'V1',
    featureType: 'event_plan',
    status: 'active',
    languageSupport: ['en'],
    inputSchemaRef: 'ai.event_plan.input.v1',
    outputSchemaRef: 'ai.event_plan.output.v1',
    templateHash: 'sha256:eda22a74f55af48b9b1b9ff486b7a12fd50a366672e22404759314417858d25e',
    systemInstructions:
      'You are an event planning assistant for EventFlow. Produce a concise event plan with a summary and ordered phases, each with concrete tasks, in English. ' +
      SAFETY_INSTRUCTION_BLOCK,
    developerRules: [
      'Base the plan strictly on the provided event data; do not invent budget figures or vendor commitments.',
      'Keep phases actionable and ordered from earliest to latest.',
    ],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: approvedMeta('V1: soporte de idioma en (English)', ['BR-AI-001', 'BR-AI-010']),
  },

  // ── checklist ─────────────────────────────────────────────────────────────
  {
    promptKey: 'checklist.es-LATAM',
    version: 'V1',
    featureType: 'checklist',
    status: 'active',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.checklist.input.v1',
    outputSchemaRef: 'ai.checklist.output.v1',
    templateHash: 'sha256:2652c044ebc10c0afce0bc6cdbcaaa2a6b7bcb9149509a6e30d5ef60fc085cba',
    systemInstructions:
      'You are an event checklist assistant for EventFlow. Produce a prioritized checklist of items in neutral LATAM Spanish. ' +
      SAFETY_INSTRUCTION_BLOCK,
    developerRules: ['Each item must be a concrete, verifiable task.', 'Use priority low|medium|high only.'],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: approvedMeta('V1 inicial checklist', ['BR-AI-001']),
  },

  // ── budget_suggestion ─────────────────────────────────────────────────────
  {
    promptKey: 'budget_suggestion.es-LATAM',
    version: 'V1',
    featureType: 'budget_suggestion',
    status: 'active',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.budget_suggestion.input.v1',
    outputSchemaRef: 'ai.budget_suggestion.output.v1',
    templateHash: 'sha256:82d56a6c6a12b0ac409a64e097798d9ba71197d2aff92e6300a80eff86346c36',
    systemInstructions:
      'You are a budget suggestion assistant for EventFlow. Produce budget line items with categories and estimated amounts in the SAME currency provided in the input. ' +
      SAFETY_INSTRUCTION_BLOCK,
    developerRules: [
      'Never convert between currencies; echo the provided currencyCode.',
      'Amounts are non-binding estimates, not quotes.',
    ],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: approvedMeta('V1 inicial budget suggestion', ['BR-AI-001', 'BR-AI-011']),
  },

  // ── vendor_categories ─────────────────────────────────────────────────────
  {
    promptKey: 'vendor_categories.es-LATAM',
    version: 'V1',
    featureType: 'vendor_categories',
    status: 'active',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.vendor_categories.input.v1',
    outputSchemaRef: 'ai.vendor_categories.output.v1',
    templateHash: 'sha256:2be9748197598d7e3f457c42f3acc067f8915fe8f3f8107fd328825db2abb8a4',
    systemInstructions:
      'You are a vendor category recommender for EventFlow. Suggest relevant vendor category codes with a short reason each, in neutral LATAM Spanish. ' +
      SAFETY_INSTRUCTION_BLOCK,
    developerRules: ['Suggest categories only; do not name or confirm specific real vendors.'],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: approvedMeta('V1 inicial vendor categories', ['BR-AI-001', 'BR-AI-008']),
  },

  // ── quote_brief ───────────────────────────────────────────────────────────
  {
    promptKey: 'quote_brief.es-LATAM',
    version: 'V1',
    featureType: 'quote_brief',
    status: 'active',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.quote_brief.input.v1',
    outputSchemaRef: 'ai.quote_brief.output.v1',
    templateHash: 'sha256:e8801cef0349f79bceb2e9d40462a7513a3f73cb35876d26b0c9ac02963b532c',
    systemInstructions:
      'You are a quote brief assistant for EventFlow. Produce a brief, a list of requirements, clarifying questions and constraints in neutral LATAM Spanish. ' +
      SAFETY_INSTRUCTION_BLOCK,
    developerRules: ['Do not promise prices or availability; frame everything as requirements to be quoted.'],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: approvedMeta('V1 inicial quote brief', ['BR-AI-001', 'BR-AI-007']),
  },

  // ── quote_comparison ──────────────────────────────────────────────────────
  {
    promptKey: 'quote_comparison.es-LATAM',
    version: 'V1',
    featureType: 'quote_comparison',
    status: 'active',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.quote_comparison.input.v1',
    outputSchemaRef: 'ai.quote_comparison.output.v1',
    templateHash: 'sha256:b3a6378535abfa633121f19b3bb6965c03b06221c96c7621d76757f3cf6af276',
    systemInstructions:
      'You are a quote comparison assistant for EventFlow. Summarize and compare received quotes, listing strengths, risks and missing info per quote, plus a non-binding recommendation, in neutral LATAM Spanish. ' +
      SAFETY_INSTRUCTION_BLOCK,
    developerRules: [
      'The recommendation is advisory only; the user decides.',
      'Do not fabricate quote data not present in the input.',
    ],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: approvedMeta('V1 inicial quote comparison', ['BR-AI-001', 'BR-AI-007', 'BR-AI-015']),
  },

  // ── task_prioritization ───────────────────────────────────────────────────
  {
    promptKey: 'task_prioritization.es-LATAM',
    version: 'V1',
    featureType: 'task_prioritization',
    status: 'active',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.task_prioritization.input.v1',
    outputSchemaRef: 'ai.task_prioritization.output.v1',
    templateHash: 'sha256:c94d17dc91307b3806a1789879dedca14dba3c8b45ca1c94ea3d4e09b98dfa94',
    systemInstructions:
      'You are a task prioritization assistant for EventFlow. Return the provided tasks ranked, each with a rationale, in neutral LATAM Spanish. ' +
      SAFETY_INSTRUCTION_BLOCK,
    developerRules: ['Rank is a positive integer; lower rank = higher priority.'],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: approvedMeta('V1 inicial task prioritization', ['BR-AI-001']),
  },

  // ── vendor_bio (Future/P4 — NUNCA active, AC-09) ─────────────────────────
  {
    promptKey: 'vendor_bio.es-LATAM',
    version: 'V1',
    featureType: 'vendor_bio',
    status: 'draft',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.vendor_bio.input.v1',
    outputSchemaRef: 'ai.vendor_bio.output.v1',
    templateHash: 'sha256:d9e85bed9aa5285ff6096060b3dc2ff0210c0205df20fffc679904babdeac655',
    systemInstructions:
      'DRAFT (Future/P4, not served in MVP). Vendor bio generation assistant. ' + SAFETY_INSTRUCTION_BLOCK,
    developerRules: ['Not promoted to MVP; requires PO decision + ADR/backlog update before activation.'],
    safetyConstraints: MVP_ACTIVE_SAFETY,
    metadata: {
      createdBy: 'promptops-team',
      changeReason: 'V1 draft skeleton para feature Future/P4 (no activo)',
      relatedRules: ['BR-AI-001'],
      createdAt: CREATED_AT,
    },
  },
];
