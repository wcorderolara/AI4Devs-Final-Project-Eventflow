// Helper puro `setEquals` (US-042 / BE-001). Comparación de conjuntos por membresía —
// independiente del orden y de duplicados en la entrada. Aísla la semántica de "noop" (D5)
// del use case para poder testearla de forma exhaustiva.

export function setEquals<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}
