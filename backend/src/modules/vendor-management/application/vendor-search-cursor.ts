// Helper de cursor opaco para keyset pagination del directorio (US-045 / BE-001).
// El cursor codifica en base64url los tres campos que definen el orden estable del listado
// (`rating_avg`, `created_at`, `id`). Se extiende un dígito respecto a `{ created_at, id }`
// (D1) porque `rating_avg` participa del `ORDER BY` y el predicado keyset debe empatar la
// misma tupla; sin él, dos vendors con distinto rating pero misma `created_at` empujarían
// duplicados a la página siguiente.
//
// - `ratingAvg` es NULL cuando el vendor aún no tiene reviews (ordena `NULLS LAST`).
// - `id` se preserva verbatim como `string` (UUID v4).
// - `createdAt` se serializa como ISO 8601 con precisión de milisegundos.
//
// Cualquier fallo de decode → `null`, que el controlador traduce a `400 INVALID_CURSOR`
// (nunca se propaga el error interno al cliente para evitar leak de forma).
export interface VendorSearchCursor {
  ratingAvg: number | null;
  createdAt: Date;
  id: string;
}

interface RawCursor {
  r: number | null;
  c: string;
  i: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeVendorSearchCursor(payload: VendorSearchCursor): string {
  const raw: RawCursor = {
    r: payload.ratingAvg,
    c: payload.createdAt.toISOString(),
    i: payload.id,
  };
  return Buffer.from(JSON.stringify(raw), 'utf-8').toString('base64url');
}

export function decodeVendorSearchCursor(token: string): VendorSearchCursor | null {
  if (typeof token !== 'string' || token.length === 0) return null;
  let parsed: unknown;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    parsed = JSON.parse(decoded);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;
  const rating = obj.r;
  const createdRaw = obj.c;
  const idRaw = obj.i;

  if (typeof createdRaw !== 'string' || typeof idRaw !== 'string') return null;
  if (!UUID_RE.test(idRaw)) return null;

  const createdAt = new Date(createdRaw);
  if (Number.isNaN(createdAt.getTime())) return null;

  let ratingAvg: number | null;
  if (rating === null) {
    ratingAvg = null;
  } else if (typeof rating === 'number' && Number.isFinite(rating) && rating >= 0 && rating <= 5) {
    ratingAvg = rating;
  } else {
    return null;
  }

  return { ratingAvg, createdAt, id: idRaw };
}
