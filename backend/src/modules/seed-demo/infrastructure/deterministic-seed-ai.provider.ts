// US-086 (PB-P0-014) — Proveedor AI determinista LOCAL al módulo `seed-demo`.
// El endpoint HTTP de reset (código de módulo) NO puede importar `MockAIProvider` de `ai-assistance`
// (violaría el boundary ADR-ARCH-001). Este adapter implementa el puerto estructural `SeedAiProvider`
// con outputs 100% deterministas (sin red, sin reloj, sin aleatoriedad) para repoblar las 8
// `AIRecommendation` del seed durante el reset. La determinismo garantiza la idempotencia del reset
// (US-086 AC-02): re-ejecutar produce exactamente el mismo `outputPayload`.
//
// Nota de diseño: el runner CLI (US-085) inyecta `MockAIProvider` desde el script (exento de
// boundary). El reset HTTP usa este proveedor local. Ambos son deterministas dentro de sí mismos;
// los payloads pueden diferir entre CLI y reset, lo cual es aceptable (la idempotencia se evalúa
// por-fuente). Ver desviación D2 del execution record US-086.
import type { SeedAiFeature, SeedAiProvider } from '../application/seed-demo-data.use-case.js';

export class DeterministicSeedAiProvider implements SeedAiProvider {
  async generate(request: {
    feature: SeedAiFeature;
    input: Record<string, unknown>;
    languageCode: string;
  }): Promise<{ output: unknown; promptVersion: unknown; latencyMs: number; fallbackUsed: boolean }> {
    return {
      output: {
        feature: request.feature,
        languageCode: request.languageCode,
        summary: `Contenido demo determinista para ${request.feature}.`,
        items: [
          `${request.feature}: sugerencia demo 1`,
          `${request.feature}: sugerencia demo 2`,
          `${request.feature}: sugerencia demo 3`,
        ],
      },
      promptVersion: 'seed.demo/1',
      latencyMs: 0,
      fallbackUsed: false,
    };
  }
}
