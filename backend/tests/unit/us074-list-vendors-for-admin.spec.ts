// US-074 (PB-P1-041 / QA-001) — Unit tests del panel admin de VendorProfiles.
//
// Cubre:
//   DTO (`AdminVendorsQuerySchema`):
//     - Multi-status como array o string simple → array normalizado.
//     - is_hidden acepta boolean, "true"/"false".
//     - Fechas coerción ISO.
//     - business_name trim + colapso a undefined (EC-05).
//     - Cross-field refine: created_at_from <= created_at_to (VR-03).
//     - business_name length > 100 ⇒ VALIDATION_ERROR (VR-06).
//     - pageSize [1..50] + default 25.
//     - .strict() rechaza claves extras (VR-04).
//
//   Cursor (`encodeAdminVendorsCursor`/`decodeAdminVendorsCursor`):
//     - Roundtrip idempotente.
//     - base64 malformado → null.
//     - JSON válido con shape incorrecto → null.
//     - UUID inválido → null.
//     - ISO date inválido → null.
//
//   Mapper (`toAdminVendorListItem`):
//     - Con `adminAction` presente extrae `reason` desde `metadata.reason`.
//     - Sin `adminAction` ⇒ `lastAdminAction = null`.
//     - `metadata.reason` no-string ⇒ `reason = null` defensivo.
import { describe, expect, it } from 'vitest';
import { AdminVendorsQuerySchema } from '../../src/modules/admin-governance/interface/admin-vendors-query.dto.js';
import {
  encodeAdminVendorsCursor,
  decodeAdminVendorsCursor,
} from '../../src/modules/admin-governance/application/admin-vendors-cursor.js';
import {
  toAdminVendorListItem,
  type AdminVendorMapperInput,
} from '../../src/modules/admin-governance/application/admin-vendor.mapper.js';

const UUID = '11111111-1111-4111-8111-111111111111';
const USER_UUID = '22222222-2222-4222-8222-222222222222';
const ADMIN_UUID = '33333333-3333-4333-8333-333333333333';
const ADMIN_ACTION_UUID = '44444444-4444-4444-8444-444444444444';
const NOW = new Date('2026-07-20T12:00:00Z');

describe('US-074 · AdminVendorsQuerySchema', () => {
  it('acepta query vacío ⇒ default pageSize=25', () => {
    const parsed = AdminVendorsQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pageSize).toBe(25);
      expect(parsed.data.status).toBeUndefined();
    }
  });

  it('normaliza status string simple a array', () => {
    const parsed = AdminVendorsQuerySchema.safeParse({ status: 'pending' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.status).toEqual(['pending']);
  });

  it('acepta status array (multi-select) — pattern GET repeat', () => {
    const parsed = AdminVendorsQuerySchema.safeParse({ status: ['pending', 'approved'] });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.status).toEqual(['pending', 'approved']);
  });

  it('VR-04 rechaza status inválido', () => {
    expect(AdminVendorsQuerySchema.safeParse({ status: 'bogus' }).success).toBe(false);
  });

  it('is_hidden acepta boolean literal y "true"/"false" (query string)', () => {
    expect(AdminVendorsQuerySchema.safeParse({ is_hidden: true }).success).toBe(true);
    const s = AdminVendorsQuerySchema.safeParse({ is_hidden: 'true' });
    expect(s.success).toBe(true);
    if (s.success) expect(s.data.is_hidden).toBe(true);
    const f = AdminVendorsQuerySchema.safeParse({ is_hidden: 'false' });
    expect(f.success).toBe(true);
    if (f.success) expect(f.data.is_hidden).toBe(false);
  });

  it('EC-05 business_name trim + colapso a undefined si queda vacío', () => {
    const parsed = AdminVendorsQuerySchema.safeParse({ business_name: '   ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.business_name).toBeUndefined();
  });

  it('business_name conserva el término post-trim', () => {
    const parsed = AdminVendorsQuerySchema.safeParse({ business_name: '  catering  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.business_name).toBe('catering');
  });

  it('VR-06 rechaza business_name > 100 chars post-trim', () => {
    const parsed = AdminVendorsQuerySchema.safeParse({ business_name: 'x'.repeat(101) });
    expect(parsed.success).toBe(false);
  });

  it('VR-03 rechaza created_at_from > created_at_to', () => {
    const parsed = AdminVendorsQuerySchema.safeParse({
      created_at_from: '2026-08-01T00:00:00Z',
      created_at_to: '2026-07-01T00:00:00Z',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['created_at_from']);
    }
  });

  it('VR-01 rechaza pageSize fuera [1..50]', () => {
    expect(AdminVendorsQuerySchema.safeParse({ pageSize: 0 }).success).toBe(false);
    expect(AdminVendorsQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false);
    expect(AdminVendorsQuerySchema.safeParse({ pageSize: 25 }).success).toBe(true);
  });

  it('VR-04 rechaza claves extras (.strict())', () => {
    expect(AdminVendorsQuerySchema.safeParse({ foo: 'bar' }).success).toBe(false);
  });
});

describe('US-074 · admin-vendors-cursor', () => {
  it('roundtrip idempotente', () => {
    const token = encodeAdminVendorsCursor({ createdAt: NOW, id: UUID });
    const decoded = decodeAdminVendorsCursor(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(UUID);
    expect(decoded?.createdAt.getTime()).toBe(NOW.getTime());
  });

  it('base64 malformado ⇒ null', () => {
    expect(decodeAdminVendorsCursor('!!!not-base64!!!')).toBeNull();
  });

  it('JSON con shape incorrecto ⇒ null', () => {
    const badShape = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf-8').toString('base64url');
    expect(decodeAdminVendorsCursor(badShape)).toBeNull();
  });

  it('UUID inválido ⇒ null', () => {
    const bad = Buffer.from(JSON.stringify({ c: NOW.toISOString(), i: 'not-uuid' }), 'utf-8').toString('base64url');
    expect(decodeAdminVendorsCursor(bad)).toBeNull();
  });

  it('ISO date inválida ⇒ null', () => {
    const bad = Buffer.from(JSON.stringify({ c: 'not-a-date', i: UUID }), 'utf-8').toString('base64url');
    expect(decodeAdminVendorsCursor(bad)).toBeNull();
  });

  it('cadena vacía ⇒ null', () => {
    expect(decodeAdminVendorsCursor('')).toBeNull();
  });
});

describe('US-074 · toAdminVendorListItem', () => {
  const base: AdminVendorMapperInput = {
    id: UUID,
    businessName: 'Banquetes Demo',
    slug: 'banquetes-demo',
    status: 'approved',
    isHidden: false,
    createdAt: NOW,
    user: { id: USER_UUID, email: 'owner@example.com' },
    adminAction: null,
  } as unknown as AdminVendorMapperInput;

  it('mapea shape básico sin adminAction ⇒ lastAdminAction=null', () => {
    const item = toAdminVendorListItem(base);
    expect(item.id).toBe(UUID);
    expect(item.owner.email).toBe('owner@example.com');
    expect(item.lastAdminAction).toBeNull();
    expect(item.createdAt).toBe(NOW.toISOString());
  });

  it('extrae reason desde adminAction.metadata.reason', () => {
    const input: AdminVendorMapperInput = {
      ...base,
      adminAction: {
        action: 'hide',
        adminUserId: ADMIN_UUID,
        createdAt: NOW,
        metadata: { reason: 'Contenido oculto por revisión.' },
      },
    } as unknown as AdminVendorMapperInput;
    const item = toAdminVendorListItem(input);
    expect(item.lastAdminAction).toEqual({
      action: 'hide',
      reason: 'Contenido oculto por revisión.',
      adminId: ADMIN_UUID,
      createdAt: NOW.toISOString(),
    });
    // adminActionId no aparece en el mapper (no en la Tech Spec) — se preserva el shape acotado.
    expect(ADMIN_ACTION_UUID).toBeTruthy(); // silencia el linter — la constante queda para futuros asserts.
  });

  it('metadata.reason no-string ⇒ reason=null defensivo', () => {
    const input: AdminVendorMapperInput = {
      ...base,
      adminAction: {
        action: 'approve',
        adminUserId: ADMIN_UUID,
        createdAt: NOW,
        metadata: { reason: 123 as unknown },
      },
    } as unknown as AdminVendorMapperInput;
    const item = toAdminVendorListItem(input);
    expect(item.lastAdminAction?.reason).toBeNull();
  });
});
