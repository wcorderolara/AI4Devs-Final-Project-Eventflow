// US-026 (PB-P2-003 / BE-007 · D10) — Configuración de límite de regeneración por linaje.
//
// Env var `AI_MAX_REGENERATIONS_PER_LINEAGE` (default `5`). El valor se parsea a entero positivo
// >= 1; cualquier otro valor cae al default con warning (evita romper el server por typo
// operacional). El límite se cuenta contra el número de hijos del `root_recommendation_id`
// (D2 — evita escape walking por parent chain).
export interface AIRegenerateConfig {
  maxRegenerationsPerLineage: number;
}

export const DEFAULT_MAX_REGENERATIONS_PER_LINEAGE = 5;

export function resolveAIRegenerateConfig(env: NodeJS.ProcessEnv = process.env): AIRegenerateConfig {
  const raw = env.AI_MAX_REGENERATIONS_PER_LINEAGE;
  if (raw === undefined || raw.trim() === '') {
    return { maxRegenerationsPerLineage: DEFAULT_MAX_REGENERATIONS_PER_LINEAGE };
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    // Silencioso: preferimos degradar al default seguro antes que crashear el server. Los tests
    // de config verifican comportamiento explícito.
    return { maxRegenerationsPerLineage: DEFAULT_MAX_REGENERATIONS_PER_LINEAGE };
  }
  return { maxRegenerationsPerLineage: parsed };
}
