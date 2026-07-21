// US-080 / QA-001 — Unit tests del DTO Zod `AdminActionsQuerySchema`. Cubre: default
// pageSize, rango pageSize, refine cross-field fechas, enum `target_type`, rechazo `.strict()`
// de claves adicionales y validaciones UUID.
import { describe, expect, it } from 'vitest';
import { AdminActionsQuerySchema } from '../../src/modules/admin-governance/interface/admin-actions-query.dto.js';

describe('US-080 / QA-001 — AdminActionsQuerySchema', () => {
  it('aplica default pageSize=25 cuando el query es vacío', () => {
    const parsed = AdminActionsQuerySchema.parse({});
    expect(parsed.pageSize).toBe(25);
    expect(parsed.admin_id).toBeUndefined();
    expect(parsed.cursor).toBeUndefined();
  });

  it('acepta target_type con valores del enum', () => {
    const parsed = AdminActionsQuerySchema.parse({ target_type: 'review' });
    expect(parsed.target_type).toBe('review');
  });

  it('rechaza target_type fuera del enum', () => {
    expect(AdminActionsQuerySchema.safeParse({ target_type: 'wat' }).success).toBe(false);
  });

  it('rechaza pageSize fuera del rango [1..50] (VR-01)', () => {
    expect(AdminActionsQuerySchema.safeParse({ pageSize: 0 }).success).toBe(false);
    expect(AdminActionsQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false);
    expect(AdminActionsQuerySchema.safeParse({ pageSize: 25 }).success).toBe(true);
    expect(AdminActionsQuerySchema.safeParse({ pageSize: 50 }).success).toBe(true);
  });

  it('rechaza created_at_from > created_at_to (VR-05)', () => {
    const result = AdminActionsQuerySchema.safeParse({
      created_at_from: '2026-08-01',
      created_at_to: '2026-07-01',
    });
    expect(result.success).toBe(false);
  });

  it('acepta created_at_from == created_at_to', () => {
    const result = AdminActionsQuerySchema.safeParse({
      created_at_from: '2026-07-01T00:00:00.000Z',
      created_at_to: '2026-07-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('.strict() rechaza claves adicionales', () => {
    expect(AdminActionsQuerySchema.safeParse({ unknown: 'nope' }).success).toBe(false);
  });

  it('rechaza admin_id / target_id no-UUID (VR-03/VR-04)', () => {
    expect(AdminActionsQuerySchema.safeParse({ admin_id: 'not-a-uuid' }).success).toBe(false);
    expect(AdminActionsQuerySchema.safeParse({ target_id: 'not-a-uuid' }).success).toBe(false);
  });

  it('acepta action con longitud [1..64]', () => {
    expect(AdminActionsQuerySchema.safeParse({ action: '' }).success).toBe(false);
    expect(AdminActionsQuerySchema.safeParse({ action: 'a'.repeat(65) }).success).toBe(false);
    expect(AdminActionsQuerySchema.safeParse({ action: 'hide' }).success).toBe(true);
  });
});
