// Puerto PromptVersionIdResolver (PR-5 / US-122 AC-03). Resuelve el `AIPromptVersion.id` real en BD
// para (feature, idioma) a partir del PromptRegistry de US-121, de modo que cada `AIRecommendation`
// referencie la versión de prompt activa. Application depende de este port, no del registry ni de Prisma.
import type { AiFeatureType } from '../domain/ai-features.js';

export interface PromptVersionIdResolver {
  /**
   * Id en BD de la versión `active` para (feature, languageCode). Si el registry no tiene prompt
   * activo para ese idioma/feature, devuelve el placeholder de US-097 (compat, nunca falla en silencio
   * hacia otro idioma).
   */
  resolve(feature: AiFeatureType, languageCode: string): Promise<string>;
}
