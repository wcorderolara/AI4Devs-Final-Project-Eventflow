// SeedKey (value object) — clave natural estable y determinista por dominio (US-085, BR-SEED-001).
// Formato `${domain}:${stableId}`. Se usa para derivar identificadores idempotentes (emails,
// codes, businessName slugs) sin aleatoriedad, garantizando que N ejecuciones no dupliquen.

export function seedKey(domain: string, stableId: string): string {
  if (!domain || !stableId) {
    throw new Error('seedKey requiere domain y stableId no vacíos');
  }
  return `${domain}:${stableId}`;
}

/** Email determinista para una identidad seed (sin PII real; dominio de ejemplo). */
export function seedEmail(role: string, index: number): string {
  return `${role}${index}@seed.eventflow.test`;
}
