// Slug helper (US-040 / BE-001, AC-03 / D5). Normaliza `business_name` para producir un slug
// URL-safe estable + resuelve conflictos con sufijo numérico incremental (`base`, `base-2`, ...).
// Independiente de infraestructura: recibe la lista de slugs colisionantes como parámetro plano.

const MAX_SLUG_LENGTH = 80;

export function slugify(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (normalized.length === 0) {
    // Nombre compuesto exclusivamente por caracteres no alfanuméricos (ej. "***"): degradamos a
    // 'vendor' como base determinista; el sufijo numérico garantizará unicidad.
    return 'vendor'.slice(0, MAX_SLUG_LENGTH);
  }
  return normalized.slice(0, MAX_SLUG_LENGTH);
}

/**
 * Dado un `base` y un conjunto de slugs existentes que comparten prefijo (`base`, `base-2`, ...),
 * retorna el siguiente slug libre. La colisión estricta bajo concurrencia queda cubierta por la
 * UNIQUE constraint + retry en la capa de repositorio.
 */
export function pickNextSlug(base: string, existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
