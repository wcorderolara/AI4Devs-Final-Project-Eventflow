// US-080 / BE-004 — Cursor opaco para keyset pagination del listado admin del audit log
// `AdminAction`. Orden estable `(created_at DESC, id DESC)` — paridad con
// `admin-events-cursor.ts` (US-078) y `admin-vendors-cursor.ts` (US-074).
//
// El cursor codifica `createdAt` (ISO 8601, NOT NULL en el schema) + `id` (UUID v4) en
// base64url. Fallos de decode ⇒ `null` (el UseCase mapea a `400 INVALID_CURSOR`, no propaga
// forma interna al cliente).
//
// Helper intra-módulo (no reusa el de `reviews-moderation` ni el de admin-events) por
// ADR-ARCH-001 (bounded context autónomo).
export interface AdminActionsCursor {
  createdAt: Date;
  id: string;
}

interface RawCursor {
  c: string;
  i: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeAdminActionsCursor(payload: AdminActionsCursor): string {
  const raw: RawCursor = {
    c: payload.createdAt.toISOString(),
    i: payload.id,
  };
  return Buffer.from(JSON.stringify(raw), 'utf-8').toString('base64url');
}

export function decodeAdminActionsCursor(token: string): AdminActionsCursor | null {
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
  const dateRaw = obj.c;
  const idRaw = obj.i;

  if (typeof idRaw !== 'string' || !UUID_RE.test(idRaw)) return null;
  if (typeof dateRaw !== 'string') return null;

  const d = new Date(dateRaw);
  if (Number.isNaN(d.getTime())) return null;

  return { createdAt: d, id: idRaw };
}
