// US-078 / BE-001 — Cursor opaco para keyset pagination del listado admin de Events.
// Orden estable `(event_date DESC NULLS LAST, id DESC)` — paridad con el pattern de
// `admin-vendors-cursor.ts` (US-074) y `vendor-reviews-cursor.ts` (US-066). El cursor
// codifica `eventDate` (ISO 8601 o cadena vacía si null) + `id` (UUID v4) en base64url.
//
// Fallos de decode ⇒ `null` (el UseCase mapea a `400 INVALID_CURSOR`, no propaga
// forma interna al cliente).
//
// Helper intra-módulo (no reusa el de `reviews-moderation`) por ADR-ARCH-001.
export interface AdminEventsCursor {
  /** null cuando el evento no tiene `event_date` (draft sin fecha). */
  eventDate: Date | null;
  id: string;
}

interface RawCursor {
  d: string | null;
  i: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeAdminEventsCursor(payload: AdminEventsCursor): string {
  const raw: RawCursor = {
    d: payload.eventDate ? payload.eventDate.toISOString() : null,
    i: payload.id,
  };
  return Buffer.from(JSON.stringify(raw), 'utf-8').toString('base64url');
}

export function decodeAdminEventsCursor(token: string): AdminEventsCursor | null {
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
  const dateRaw = obj.d;
  const idRaw = obj.i;

  if (typeof idRaw !== 'string' || !UUID_RE.test(idRaw)) return null;
  if (dateRaw !== null && typeof dateRaw !== 'string') return null;

  let eventDate: Date | null = null;
  if (typeof dateRaw === 'string') {
    const d = new Date(dateRaw);
    if (Number.isNaN(d.getTime())) return null;
    eventDate = d;
  }

  return { eventDate, id: idRaw };
}
