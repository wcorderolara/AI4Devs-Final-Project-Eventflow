// US-080 / QA-001 — Unit tests del cursor keyset `admin-actions-cursor.ts`.
// Cubre encode round-trip + rechazo de payloads corruptos (EC-02 → 400 INVALID_CURSOR).
import { describe, expect, it } from 'vitest';
import {
  encodeAdminActionsCursor,
  decodeAdminActionsCursor,
} from '../../src/modules/admin-governance/application/admin-actions-cursor.js';

const UUID = 'aa000001-0000-0000-0000-000000000001';
const DATE = new Date('2026-07-20T15:30:00.000Z');

describe('US-080 / QA-001 — admin-actions cursor', () => {
  it('encode + decode preserva payload', () => {
    const token = encodeAdminActionsCursor({ createdAt: DATE, id: UUID });
    const decoded = decodeAdminActionsCursor(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(UUID);
    expect(decoded?.createdAt.toISOString()).toBe(DATE.toISOString());
  });

  it('decode devuelve null ante base64 malformado', () => {
    expect(decodeAdminActionsCursor('!!!not-base64!!!')).toBeNull();
  });

  it('decode devuelve null ante JSON malformado', () => {
    const bad = Buffer.from('not json', 'utf-8').toString('base64url');
    expect(decodeAdminActionsCursor(bad)).toBeNull();
  });

  it('decode rechaza id no-UUID', () => {
    const bad = Buffer.from(JSON.stringify({ c: DATE.toISOString(), i: 'bad' }), 'utf-8').toString(
      'base64url',
    );
    expect(decodeAdminActionsCursor(bad)).toBeNull();
  });

  it('decode rechaza fecha faltante o inválida', () => {
    const noDate = Buffer.from(JSON.stringify({ c: null, i: UUID }), 'utf-8').toString('base64url');
    const badDate = Buffer.from(JSON.stringify({ c: 'not-a-date', i: UUID }), 'utf-8').toString(
      'base64url',
    );
    expect(decodeAdminActionsCursor(noDate)).toBeNull();
    expect(decodeAdminActionsCursor(badDate)).toBeNull();
  });
});
