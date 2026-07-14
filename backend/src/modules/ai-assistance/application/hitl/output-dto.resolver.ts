// US-025 (PB-P1-016 / BE-003) — `OutputDtoResolver`. Devuelve el `*OutputDto` Zod registrado por
// cada feature IA para validar el `editedPayload` recibido en `POST /apply`. Reusa `OUTPUT_SCHEMAS`
// del registro central (US-097 / US-021) — los schemas viven en `domain/ai-features.ts` y son la
// autoridad canónica del contrato de output.
import type { ZodType } from 'zod';
import { OUTPUT_SCHEMAS, AI_FEATURE_TYPES, type AiFeatureType } from '../../domain/ai-features.js';

export class OutputDtoResolver {
  schemaFor(type: string): ZodType | null {
    if (!(AI_FEATURE_TYPES as readonly string[]).includes(type)) return null;
    return OUTPUT_SCHEMAS[type as AiFeatureType] as ZodType;
  }
}
