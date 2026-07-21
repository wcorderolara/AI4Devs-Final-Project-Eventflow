// US-078 / QA-001 — Unit tests del DTO Zod `AdminEventsQuerySchema`. Cubre: default pageSize,
// coerción de status a array (single + repeat), rango de pageSize, refine cross-field, trim de
// `organizer_search` y rechazo `.strict()` de claves adicionales.
import { describe, expect, it } from 'vitest';
import { AdminEventsQuerySchema } from '../../src/modules/admin-governance/interface/admin-events-query.dto.js';

describe('US-078 / QA-001 — AdminEventsQuerySchema', () => {
  it('aplica default pageSize=25 cuando el query es vacío', () => {
    const parsed = AdminEventsQuerySchema.parse({});
    expect(parsed.pageSize).toBe(25);
    expect(parsed.status).toBeUndefined();
    expect(parsed.cursor).toBeUndefined();
  });

  it('acepta status como string único y lo transforma a array', () => {
    const parsed = AdminEventsQuerySchema.parse({ status: 'active' });
    expect(parsed.status).toEqual(['active']);
  });

  it('acepta status como array (repeat query)', () => {
    const parsed = AdminEventsQuerySchema.parse({ status: ['draft', 'completed'] });
    expect(parsed.status).toEqual(['draft', 'completed']);
  });

  it('rechaza status con valor inválido (fuera del enum Prisma)', () => {
    // La Tech Spec §7 menciona `planning|in_progress` que NO existen en Prisma — DEV-2.
    const result = AdminEventsQuerySchema.safeParse({ status: 'planning' });
    expect(result.success).toBe(false);
  });

  it('rechaza pageSize fuera del rango [1..50]', () => {
    expect(AdminEventsQuerySchema.safeParse({ pageSize: 0 }).success).toBe(false);
    expect(AdminEventsQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false);
    expect(AdminEventsQuerySchema.safeParse({ pageSize: 25 }).success).toBe(true);
  });

  it('rechaza event_date_from > event_date_to (VR-05)', () => {
    const result = AdminEventsQuerySchema.safeParse({
      event_date_from: '2026-08-01',
      event_date_to: '2026-07-01',
    });
    expect(result.success).toBe(false);
  });

  it('trima organizer_search y lo colapsa a undefined si queda vacío', () => {
    const parsed = AdminEventsQuerySchema.parse({ organizer_search: '   ' });
    expect(parsed.organizer_search).toBeUndefined();
  });

  it('preserva organizer_search cuando tiene contenido tras trim', () => {
    const parsed = AdminEventsQuerySchema.parse({ organizer_search: '  jane  ' });
    expect(parsed.organizer_search).toBe('jane');
  });

  it('.strict() rechaza claves adicionales', () => {
    const result = AdminEventsQuerySchema.safeParse({ unknown: 'nope' });
    expect(result.success).toBe(false);
  });

  it('rechaza event_type_id no-UUID', () => {
    expect(AdminEventsQuerySchema.safeParse({ event_type_id: 'not-a-uuid' }).success).toBe(false);
  });
});
