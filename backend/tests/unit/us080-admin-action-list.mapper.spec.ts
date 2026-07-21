// US-080 / QA-001 — Unit tests del mapper `toAdminActionListItem`.
// Cubre DEV-1 (mapping `businessName ← fullName`) y DEV-2 (split de `metadata` en
// `reason` + `payload`).
import { describe, expect, it } from 'vitest';
import {
  toAdminActionListItem,
  type AdminActionListRow,
} from '../../src/modules/admin-governance/application/admin-action-list.mapper.js';

function baseRow(over: Partial<AdminActionListRow> = {}): AdminActionListRow {
  return {
    id: 'aa000001-0000-0000-0000-000000000001',
    adminUserId: 'ad000001-0000-0000-0000-000000000001',
    targetEntity: 'review',
    targetId: '22222222-2222-2222-2222-222222222222',
    action: 'hide',
    metadata: null,
    createdAt: new Date('2026-07-20T15:30:00.000Z'),
    adminUser: {
      id: 'ad000001-0000-0000-0000-000000000001',
      email: 'admin@eventflow.test',
      fullName: 'Admin Demo',
    },
    ...over,
  } as AdminActionListRow;
}

describe('US-080 / QA-001 — toAdminActionListItem', () => {
  it('AC-02: mapea admin info y campos base', () => {
    const item = toAdminActionListItem(baseRow());
    expect(item.id).toBe('aa000001-0000-0000-0000-000000000001');
    expect(item.admin.id).toBe('ad000001-0000-0000-0000-000000000001');
    expect(item.admin.email).toBe('admin@eventflow.test');
    expect(item.admin.businessName).toBe('Admin Demo');
    expect(item.target_type).toBe('review');
    expect(item.action).toBe('hide');
    expect(item.created_at).toBe('2026-07-20T15:30:00.000Z');
  });

  it('DEV-2: split metadata en reason y payload', () => {
    const item = toAdminActionListItem(
      baseRow({
        metadata: {
          reason: 'Contenido inapropiado',
          from_status: 'published',
          to_status: 'hidden',
        },
      }),
    );
    expect(item.reason).toBe('Contenido inapropiado');
    expect(item.payload).toEqual({ from_status: 'published', to_status: 'hidden' });
  });

  it('reason y payload = null cuando metadata es null', () => {
    const item = toAdminActionListItem(baseRow({ metadata: null }));
    expect(item.reason).toBeNull();
    expect(item.payload).toBeNull();
  });

  it('payload = null cuando metadata solo contiene reason', () => {
    const item = toAdminActionListItem(baseRow({ metadata: { reason: 'x' } }));
    expect(item.reason).toBe('x');
    expect(item.payload).toBeNull();
  });

  it('reason = null cuando el valor no es string; la clave se remueve del payload', () => {
    const item = toAdminActionListItem(baseRow({ metadata: { reason: 42, other: true } }));
    expect(item.reason).toBeNull();
    expect(item.payload).toEqual({ other: true });
  });

  it('adminUser null ⇒ fallback a adminUserId', () => {
    const row = baseRow({
      adminUser: null as unknown as AdminActionListRow['adminUser'],
    });
    const item = toAdminActionListItem(row);
    expect(item.admin.id).toBe('ad000001-0000-0000-0000-000000000001');
    expect(item.admin.email).toBeNull();
    expect(item.admin.businessName).toBeNull();
  });
});
