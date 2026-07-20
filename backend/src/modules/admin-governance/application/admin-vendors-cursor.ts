// Helper de cursor opaco para keyset pagination del listado admin de VendorProfiles
// (US-074 / BE-004). El orden estable es `(created_at DESC, id DESC)` — paridad exacta con
// `vendor-reviews-cursor.ts` (US-066) y `admin-reviews-cursor` (US-077); el cursor codifica
// `createdAt` (ISO 8601 con precisión ms) + `id` (UUID v4) en base64url.
//
// Cualquier fallo de decode ⇒ `null`, que el UseCase traduce a `400 INVALID_CURSOR`
// (nunca se propaga el error interno al cliente para evitar leak de forma).
//
// El helper vive en `admin-governance` (no reusa el de `reviews-moderation`) porque un módulo
// no puede importar de otro salvo excepciones whitelisted (ADR-ARCH-001). El shape es idéntico
// pero el naming permanece scoped al módulo — patrón consistente con otros helpers de cursor
// intra-módulo.
export interface AdminVendorsCursor {
  createdAt: Date;
  id: string;
}

interface RawCursor {
  c: string;
  i: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeAdminVendorsCursor(payload: AdminVendorsCursor): string {
  const raw: RawCursor = {
    c: payload.createdAt.toISOString(),
    i: payload.id,
  };
  return Buffer.from(JSON.stringify(raw), 'utf-8').toString('base64url');
}

export function decodeAdminVendorsCursor(token: string): AdminVendorsCursor | null {
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
