// Helper de cursor opaco para keyset pagination del listado público de reseñas por vendor
// (US-066 / BE-004). El orden estable es `(created_at DESC, id DESC)` (Tech Spec §7); el cursor
// codifica esos dos campos en base64url, sin `rating_avg` (a diferencia de US-045 — DEV-03) porque
// aquí el `rating` no participa del `ORDER BY`.
//
// - `createdAt` se serializa como ISO 8601 con precisión de milisegundos.
// - `id` se preserva verbatim como `string` (UUID v4).
//
// Cualquier fallo de decode → `null`, que el controlador traduce a `400 INVALID_CURSOR`
// (nunca se propaga el error interno al cliente para evitar leak de forma).
export interface VendorReviewsCursor {
  createdAt: Date;
  id: string;
}

interface RawCursor {
  c: string;
  i: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeVendorReviewsCursor(payload: VendorReviewsCursor): string {
  const raw: RawCursor = {
    c: payload.createdAt.toISOString(),
    i: payload.id,
  };
  return Buffer.from(JSON.stringify(raw), 'utf-8').toString('base64url');
}

export function decodeVendorReviewsCursor(token: string): VendorReviewsCursor | null {
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
  const createdRaw = obj.c;
  const idRaw = obj.i;

  if (typeof createdRaw !== 'string' || typeof idRaw !== 'string') return null;
  if (!UUID_RE.test(idRaw)) return null;

  const createdAt = new Date(createdRaw);
  if (Number.isNaN(createdAt.getTime())) return null;

  return { createdAt, id: idRaw };
}
