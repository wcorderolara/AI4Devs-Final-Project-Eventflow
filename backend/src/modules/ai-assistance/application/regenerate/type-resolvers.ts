// US-026 (PB-P2-003 / BE-003 + BE-004) — Resolvers polimórficos por `AiFeatureType`.
//
// Deviations D-01 / D-02 del execution record: los "resolvers" no son componentes nuevos —
// son adapters delgados que consumen las fuentes autoritativas ya existentes en el módulo AI:
//
//   - `PromptTemplateResolver` delega en `promptRegistry.resolveActive(featureType, locale)`
//     (US-121). Un resolver paralelo introduciría drift con el hash verificado del registry.
//   - `OutputSchemaResolver` delega en `OUTPUT_SCHEMAS[featureType]` (US-097). El schema Zod
//     por feature es la única fuente de verdad; duplicarlo rompería `us097-ai.spec` cuando se
//     agregue una feature nueva.
//
// Ambos resolvers exponen la firma que el tech spec §7 pide (`getByType(type)`) para que el use
// case de regeneración las use sin importar el pipeline genérico completo. Reutilizarlos por
// cualquier futuro caller (moderación admin, auditoría) queda como side effect gratis.
import type { z } from 'zod';
import { OUTPUT_SCHEMAS, type AiFeatureType } from '../../domain/ai-features.js';
import { promptRegistry } from '../../infrastructure/prompt-registry/index.js';
import type { ResolvedPromptTemplate } from '../../infrastructure/prompt-registry/prompt-template.js';
import type { LanguageCode } from '../../ports/ai-contract.js';

export class PromptTemplateResolver {
  /**
   * Resuelve el prompt `active` para (feature, locale). El registry lanza
   * `PromptNotFoundError` si no existe una versión active en ese locale — se propaga tal cual
   * (no se degrada a fallback silencioso, alineado con AC-01 explicit).
   */
  resolve(featureType: AiFeatureType, locale: LanguageCode): ResolvedPromptTemplate {
    return promptRegistry.resolveActive(featureType, locale);
  }
}

export class OutputSchemaResolver {
  /**
   * Retorna el schema Zod canónico del feature. Nunca `undefined`: `OUTPUT_SCHEMAS` está
   * declarado con `Record<AiFeatureType, z.ZodType>` (US-097), así que TypeScript garantiza
   * cobertura completa al momento de compilar.
   */
  resolve(featureType: AiFeatureType): z.ZodType {
    return OUTPUT_SCHEMAS[featureType];
  }
}
