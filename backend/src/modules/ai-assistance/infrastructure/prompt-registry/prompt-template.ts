// PromptRegistry — tipos base (US-121 / BE-001, PB-P0-010). Backend-only, sin SDKs ni red.
// Estrategia ADR-AI-006: prompts como artefactos versionados en código + metadata `AIPromptVersion`
// para trazabilidad. Estos tipos son consumidos por el registry, sus validaciones y los tests.
//
// Nota de alineación de schema (US-121 / DB-001, Deviation D2): el modelo Prisma real
// `AIPromptVersion` es más delgado que la Tech Spec (no tiene columnas feature/language; sí
// `promptKey`, `version`, `provider`, `templateChecksum`). Además el enum `AIPromptVersionStatus`
// sólo declara `active|deprecated` (Deviation D1). El registry mantiene un ciclo de vida enriquecido
// en código y el export mapea a lo que el schema soporta. Ver README.md del módulo.
import type { AiFeatureType } from '../../domain/ai-features.js';
import type { LanguageCode } from '../../ports/ai-contract.js';

/**
 * Ciclo de vida de un prompt en código (AC-05). Más amplio que el enum Prisma `AIPromptVersionStatus`
 * (`active|deprecated`): los estados intermedios existen sólo en el registry para disciplina de
 * revisión/promoción y NO se persisten como filas `AIPromptVersion`.
 */
export type PromptTemplateStatus =
  | 'draft'
  | 'reviewed'
  | 'approved'
  | 'active'
  | 'deprecated'
  | 'archived';

/** Política de resolución (AC-01/AC-02). `active` sirve la versión vigente; `specific` audita/replay. */
export type PromptVersionPolicy = 'active' | 'specific';

/**
 * Safety constraints PromptOps (AC-06 / AI-002). Estructura VALIDABLE (no sólo texto libre): cada
 * flag se testea explícitamente. Todo prompt `active` debe tenerlas todas en `true`.
 */
export interface PromptSafetyConstraints {
  /** El modelo debe responder únicamente JSON conforme al output schema. */
  jsonOnlyOutput: boolean;
  /** El payload del usuario se trata como datos, nunca como instrucciones (SEC-03). */
  userContentBoundary: boolean;
  /** Minimización de payload: sólo se envía lo necesario para la feature. */
  payloadMinimization: boolean;
  /** Recordatorio human-in-the-loop: la salida es sugerencia editable, requiere validación humana. */
  hitlReminder: boolean;
  /** Prohíbe lenguaje de decisiones autónomas. */
  noAutonomousDecisions: boolean;
  /** Prohíbe claims legales/contractuales/de pago vinculantes. */
  noBindingLegalOrPaymentClaims: boolean;
  /** Prohíbe inventar disponibilidad de proveedores. */
  noFabricatedVendorAvailability: boolean;
  /** Prohíbe conversión de moneda no soportada. */
  noUnsupportedCurrencyConversion: boolean;
}

export const REQUIRED_SAFETY_CONSTRAINTS: readonly (keyof PromptSafetyConstraints)[] = [
  'jsonOnlyOutput',
  'userContentBoundary',
  'payloadMinimization',
  'hitlReminder',
  'noAutonomousDecisions',
  'noBindingLegalOrPaymentClaims',
  'noFabricatedVendorAvailability',
  'noUnsupportedCurrencyConversion',
] as const;

/** Changelog/reviewer metadata (AC-05). No entra al hash (campos no volátiles del contenido). */
export interface PromptTemplateMetadata {
  createdBy: string;
  approvedBy?: string;
  changeReason: string;
  relatedRules: string[];
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. Requerido si `status === 'active'`. */
  approvedAt?: string;
}

/**
 * Plantilla de prompt versionada (AC-01/AC-05). Identidad estable = `promptKey@version`.
 * `templateHash` es el hash DECLARADO (lock de disciplina de versión, AC-08): el registry recalcula
 * el hash del contenido relevante y falla con `PROMPT_HASH_DRIFT` si difiere.
 */
export interface PromptTemplate {
  /** Identidad lógica estable, formato `<featureType>.<languageCode>` (p. ej. `event_plan.es-LATAM`). */
  promptKey: string;
  /** Versión incremental `V1`, `V2`, ... */
  version: string;
  featureType: AiFeatureType;
  status: PromptTemplateStatus;
  /** Idiomas servidos. MVP: exactamente uno por template (mapea 1:1 a fila `AIPromptVersion`). */
  languageSupport: LanguageCode[];
  /** Referencia estable al schema de input (no se valida el input runtime aquí). */
  inputSchemaRef: string;
  /** Referencia estable al schema de output (debe existir en `OUTPUT_SCHEMAS`). */
  outputSchemaRef: string;
  /** Hash declarado `sha256:<hex>` del contenido relevante. */
  templateHash: string;
  /** Instrucciones de sistema (sin secrets ni PII real). */
  systemInstructions: string;
  /** Reglas de developer/PromptOps adicionales. */
  developerRules: string[];
  safetyConstraints: PromptSafetyConstraints;
  metadata: PromptTemplateMetadata;
}

/** Template resuelto: incluye el `stableId` derivado para trazabilidad/auditoría. */
export interface ResolvedPromptTemplate extends PromptTemplate {
  /** `<promptKey>@<version>` — ID estable legible para audit/replay (AC-01/AC-02). */
  readonly stableId: string;
}

/** Deriva el ID estable legible de un template. */
export function promptStableId(template: Pick<PromptTemplate, 'promptKey' | 'version'>): string {
  return `${template.promptKey}@${template.version}`;
}

/**
 * Metadata exportable compatible con el modelo Prisma `AIPromptVersion` (AC-07 / BE-005).
 * Mapea 1:1 a columnas: `id`, `prompt_id`, `prompt_key`, `version`, `status`, `provider`,
 * `template_checksum`, `description`. `promptId`/`id` se derivan de forma determinística (uuidv5).
 */
export interface AIPromptVersionMetadata {
  /** UUID determinístico de esta versión específica (columna `id`). */
  id: string;
  /** UUID determinístico que agrupa versiones del mismo prompt lógico (columna `prompt_id`). */
  promptId: string;
  /** Columna `prompt_key` — `<featureType>.<languageCode>`. */
  promptKey: string;
  /** Columna `version`. */
  version: string;
  /** Columna `status` — enum Prisma `active|deprecated` (Deviation D1). */
  status: 'active' | 'deprecated';
  /** Columna `provider` — enum Prisma `openai|mock|anthropic`. */
  provider: 'openai' | 'mock' | 'anthropic';
  /** Columna `template_checksum` — hash `sha256:<hex>`. */
  templateChecksum: string;
  /** Columna `description` — safe metadata (change reason); nunca contenido completo del prompt. */
  description: string;
}
