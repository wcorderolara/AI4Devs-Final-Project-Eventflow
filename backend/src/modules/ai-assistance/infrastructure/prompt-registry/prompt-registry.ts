// PromptRegistry — resolución + validación inmutable (US-121 / BE-002, BE-003). Backend-only infra.
// Construir el registry VALIDA todo el conjunto y falla fast (AC-03/AC-05/AC-08/AC-09). La resolución
// nunca hace fallback silencioso de idioma o prompt (AC-04). Consumible por use cases de Application
// (US-122+) sin acoplarse a SDKs externos ni a HTTP.
import type { AiFeatureType } from '../../domain/ai-features.js';
import { OUTPUT_SCHEMAS } from '../../domain/ai-features.js';
import type { LanguageCode } from '../../ports/ai-contract.js';
import { SUPPORTED_LANGUAGES } from '../../../../shared/constants/languages.js';
import type { PromptTemplate, ResolvedPromptTemplate } from './prompt-template.js';
import { REQUIRED_SAFETY_CONSTRAINTS, promptStableId } from './prompt-template.js';
import { computeTemplateHash } from './prompt-hash.js';
import { isMvpActiveFeature } from './mvp-feature-allowlist.js';
import { scanTemplateForSecretsAndPii } from './secret-pii-scan.js';
import {
  PromptDuplicateActiveError,
  PromptFutureFeatureActiveError,
  PromptHashDriftError,
  PromptInvalidMetadataError,
  PromptNotFoundError,
  PromptUnsupportedLanguageError,
  type PromptRegistryError,
  type PromptRegistryErrorMeta,
} from './prompt-registry-errors.js';
import { logPromptRegistryValidationFailed } from './prompt-registry-logger.js';

const VALID_STATUSES = new Set(['draft', 'reviewed', 'approved', 'active', 'deprecated', 'archived']);

/** Query de resolución (AC-01/AC-02). `active` por feature/idioma; `specific` por identidad. */
export type PromptResolveQuery =
  | { versionPolicy: 'active'; featureType: AiFeatureType; languageCode: LanguageCode }
  | { versionPolicy: 'specific'; stableId: string }
  | { versionPolicy: 'specific'; featureType: AiFeatureType; languageCode: LanguageCode; version: string };

/** Emite el log seguro (OBS-001) y devuelve el error para lanzarlo (`throw registry…`). */
function fail<E extends PromptRegistryError>(error: E): E {
  logPromptRegistryValidationFailed(error);
  return error;
}

export class PromptRegistry {
  private readonly templates: readonly PromptTemplate[];
  /** Índice por stableId (`promptKey@version`). */
  private readonly byStableId: Map<string, PromptTemplate>;

  private constructor(templates: readonly PromptTemplate[]) {
    this.templates = templates;
    this.byStableId = new Map(templates.map((t) => [promptStableId(t), t]));
  }

  /** Construye y VALIDA el registry. Lanza el primer error tipado encontrado (fail fast). */
  static build(templates: readonly PromptTemplate[]): PromptRegistry {
    const registry = new PromptRegistry(templates);
    registry.validateAll();
    return registry;
  }

  /** Snapshot inmutable de los templates cargados. */
  all(): readonly PromptTemplate[] {
    return this.templates;
  }

  /**
   * Valida el conjunto completo (AC-03/AC-05/AC-08/AC-09). Idempotente y sin efectos: se llama en
   * `build()` y puede reejecutarse en tests/CI. Lanza el primer error tipado detectado.
   */
  validateAll(): void {
    const seenStableIds = new Set<string>();
    const activeByFeatureLang = new Map<string, string>();

    for (const t of this.templates) {
      const meta = { featureType: t.featureType, languageCode: t.languageSupport[0], promptKey: t.promptKey, version: t.version };
      const stableId = promptStableId(t);

      // Identidad + unicidad (VR-01).
      if (seenStableIds.has(stableId)) {
        throw fail(new PromptInvalidMetadataError(`Duplicate prompt identity ${stableId}`, meta));
      }
      seenStableIds.add(stableId);

      // Status válido.
      if (!VALID_STATUSES.has(t.status)) {
        throw fail(new PromptInvalidMetadataError(`Invalid status "${t.status}" for ${stableId}`, meta));
      }

      // Metadata obligatoria (VR-03).
      this.assertRequiredMetadata(t, stableId, meta);

      // Schema refs (VR-04): ambos presentes y el output schema debe existir realmente.
      if (!t.inputSchemaRef || !t.outputSchemaRef) {
        throw fail(new PromptInvalidMetadataError(`Missing schema reference for ${stableId}`, meta));
      }
      if (!(t.featureType in OUTPUT_SCHEMAS)) {
        throw fail(new PromptInvalidMetadataError(`Unknown output schema for feature ${t.featureType}`, meta));
      }

      // Idioma soportado + consistencia promptKey↔languageSupport.
      this.assertLanguageIdentity(t, stableId, meta);

      // Hash/version discipline (VR-06 / AC-08).
      if (computeTemplateHash(t) !== t.templateHash) {
        throw fail(new PromptHashDriftError(`Template hash drift for ${stableId}`, meta));
      }

      // Seguridad: sin secrets ni PII real (VR-09 / SEC-001).
      const secrets = scanTemplateForSecretsAndPii(t);
      if (secrets.length > 0) {
        throw fail(new PromptInvalidMetadataError(`Secret/PII pattern in ${stableId}: ${secrets.map((s) => s.pattern).join(',')}`, meta));
      }

      // Reglas específicas de estado `active`.
      if (t.status === 'active') {
        this.assertActiveTemplate(t, stableId, meta, activeByFeatureLang);
      }
    }
  }

  private assertRequiredMetadata(t: PromptTemplate, stableId: string, meta: PromptRegistryErrorMeta): void {
    const missing =
      !t.promptKey || !t.version || !t.featureType || t.languageSupport.length === 0 ||
      !t.systemInstructions || !t.metadata?.createdBy || !t.metadata?.changeReason || !t.metadata?.createdAt;
    if (missing) {
      throw fail(new PromptInvalidMetadataError(`Incomplete required metadata for ${stableId}`, meta));
    }
    // Safety constraints deben estar todas presentes como boolean (AC-05: metadata safety declarada).
    for (const key of REQUIRED_SAFETY_CONSTRAINTS) {
      if (typeof t.safetyConstraints?.[key] !== 'boolean') {
        throw fail(new PromptInvalidMetadataError(`Missing safety constraint "${key}" for ${stableId}`, meta));
      }
    }
  }

  private assertLanguageIdentity(t: PromptTemplate, stableId: string, meta: PromptRegistryErrorMeta): void {
    for (const lang of t.languageSupport) {
      if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
        throw fail(new PromptInvalidMetadataError(`Unsupported language "${lang}" in ${stableId}`, meta));
      }
    }
    // Consistencia: promptKey = `<featureType>.<languageCode>` y exactamente un idioma por template
    // (mapea 1:1 a fila `AIPromptVersion`, ver Deviation D2).
    if (t.languageSupport.length !== 1 || t.promptKey !== `${t.featureType}.${t.languageSupport[0]}`) {
      throw fail(new PromptInvalidMetadataError(`promptKey/languageSupport inconsistent for ${stableId}`, meta));
    }
  }

  private assertActiveTemplate(
    t: PromptTemplate,
    stableId: string,
    meta: PromptRegistryErrorMeta,
    activeByFeatureLang: Map<string, string>,
  ): void {
    // Future/P4 no puede estar active (AC-09 / VR-08).
    if (!isMvpActiveFeature(t.featureType)) {
      throw fail(new PromptFutureFeatureActiveError(`Future/P4 feature ${t.featureType} cannot be active (${stableId})`, meta));
    }
    // active requiere approval metadata + todas las safety constraints en true (AC-05/AC-06).
    if (!t.metadata.approvedBy || !t.metadata.approvedAt) {
      throw fail(new PromptInvalidMetadataError(`Active prompt ${stableId} requires approvedBy/approvedAt`, meta));
    }
    for (const key of REQUIRED_SAFETY_CONSTRAINTS) {
      if (t.safetyConstraints[key] !== true) {
        throw fail(new PromptInvalidMetadataError(`Active prompt ${stableId} must satisfy safety constraint "${key}"`, meta));
      }
    }
    // Una sola versión active por (featureType, languageCode) (AC-03 / VR-02 / EC-01).
    const fl = `${t.featureType}::${t.languageSupport[0]}`;
    const existing = activeByFeatureLang.get(fl);
    if (existing) {
      throw fail(new PromptDuplicateActiveError(`Duplicate active prompt for ${fl}: ${existing} and ${stableId}`, meta));
    }
    activeByFeatureLang.set(fl, stableId);
  }

  // ── Resolución ───────────────────────────────────────────────────────────

  resolve(query: PromptResolveQuery): ResolvedPromptTemplate {
    if (query.versionPolicy === 'active') {
      return this.resolveActive(query.featureType, query.languageCode);
    }
    if ('stableId' in query) {
      return this.resolveSpecificById(query.stableId);
    }
    return this.resolveSpecific(query.featureType, query.languageCode, query.version);
  }

  /** AC-01: retorna exactamente el template `active` para (featureType, languageCode). Sin fallback. */
  resolveActive(featureType: AiFeatureType, languageCode: LanguageCode): ResolvedPromptTemplate {
    const meta = { featureType, languageCode };
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(languageCode)) {
      throw fail(new PromptUnsupportedLanguageError(`Unsupported language ${languageCode}`, meta));
    }
    const matches = this.templates.filter(
      (t) => t.featureType === featureType && t.status === 'active' && t.languageSupport.includes(languageCode),
    );
    const [match] = matches;
    if (!match) {
      throw fail(new PromptNotFoundError(`No active prompt for ${featureType}/${languageCode}`, meta));
    }
    // La unicidad active ya se garantiza en build(); defensa en profundidad.
    if (matches.length > 1) {
      throw fail(new PromptDuplicateActiveError(`Multiple active prompts for ${featureType}/${languageCode}`, meta));
    }
    return this.withStableId(match);
  }

  /** AC-02: resuelve una versión específica por (featureType, languageCode, version) para replay. */
  resolveSpecific(featureType: AiFeatureType, languageCode: LanguageCode, version: string): ResolvedPromptTemplate {
    return this.resolveSpecificById(`${featureType}.${languageCode}@${version}`);
  }

  /** AC-02: resuelve por ID estable `promptKey@version`. Admite deprecated/archived (audit/replay). */
  resolveSpecificById(stableId: string): ResolvedPromptTemplate {
    const template = this.byStableId.get(stableId);
    if (!template) {
      throw fail(new PromptNotFoundError(`No prompt version ${stableId}`, { promptKey: stableId.split('@')[0], version: stableId.split('@')[1] }));
    }
    return this.withStableId(template);
  }

  private withStableId(template: PromptTemplate): ResolvedPromptTemplate {
    return { ...template, stableId: promptStableId(template) };
  }
}
