// Cursor opaco para keyset pagination: JSON en base64url validado con un schema Zod.
// Cualquier fallo de decode ⇒ `null` / `InvalidCursorError` (400 INVALID_CURSOR); nunca se
// propaga la forma interna al cliente. Los formatos de payload de cada listado se conservan
// (un cursor emitido antes sigue decodificando).
import { z, type ZodType, type ZodTypeDef } from 'zod';
import { AppError } from '../domain/errors/app.error.js';
import { ErrorCodes } from '../domain/errors/error-codes.js';

export class InvalidCursorError extends AppError {
  readonly code = ErrorCodes.INVALID_CURSOR;
  override readonly httpStatus = 400;
  constructor(message = 'Invalid cursor') {
    super(message);
  }
}

export type CursorSchema<T> = ZodType<T, ZodTypeDef, unknown>;

export function encodeCursor<T>(payload: T): string {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

export function tryDecodeCursor<T>(raw: string | undefined, schema: CursorSchema<T>): T | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function decodeCursor<T>(raw: string, schema: CursorSchema<T>): T {
  const cursor = tryDecodeCursor(raw, schema);
  if (cursor === null) throw new InvalidCursorError();
  return cursor;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const cursorUuid = z.string().regex(UUID_RE);
export const cursorDate = z
  .string()
  .refine((s) => !Number.isNaN(new Date(s).getTime()))
  .transform((s) => new Date(s));

// Keyset `(created_at DESC, id DESC)` — payload `{ c: ISO 8601, i: UUID }`.
export interface CreatedAtIdCursor {
  createdAt: Date;
  id: string;
}

export const CreatedAtIdCursorSchema: CursorSchema<CreatedAtIdCursor> = z
  .object({ c: cursorDate, i: cursorUuid })
  .transform(({ c, i }) => ({ createdAt: c, id: i }));

export function encodeCreatedAtIdCursor({ createdAt, id }: CreatedAtIdCursor): string {
  return encodeCursor({ c: createdAt.toISOString(), i: id });
}
