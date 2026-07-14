// US-028 (PB-P1-018) / QA-001 — Unit tests de los schemas Zod y del helper
// `extractIgnoredFields`. Cubre VR-01/04..09, EC-01..05/11 y AC-01..04.
import { describe, it, expect } from 'vitest';
import {
  ALLOWED_BODY_KEYS,
  createEventTaskBodySchema,
  createEventTaskParamsSchema,
  extractIgnoredFields,
  SERVER_CONTROLLED_TASK_KEYS,
  DUE_DATE_PAST_TOLERANCE_MS,
} from '../../src/modules/task-management/create/interface/http/create-event-task.schema.js';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('US-028 createEventTaskParamsSchema', () => {
  it('acepta UUID válido (VR-01)', () => {
    const r = createEventTaskParamsSchema.safeParse({ eventId: VALID_UUID });
    expect(r.success).toBe(true);
  });

  it('rechaza UUID inválido (NT-01)', () => {
    const r = createEventTaskParamsSchema.safeParse({ eventId: 'not-a-uuid' });
    expect(r.success).toBe(false);
  });
});

describe('US-028 createEventTaskBodySchema — title (VR-04, EC-01..02)', () => {
  it('acepta title 2..200 (AC-01)', () => {
    const r = createEventTaskBodySchema.safeParse({ title: 'Hi' });
    expect(r.success).toBe(true);
  });

  it('rechaza title vacío o 1 char (NT-02, NT-04)', () => {
    expect(createEventTaskBodySchema.safeParse({}).success).toBe(false);
    expect(createEventTaskBodySchema.safeParse({ title: '' }).success).toBe(false);
    expect(createEventTaskBodySchema.safeParse({ title: 'X' }).success).toBe(false);
  });

  it('rechaza title solo whitespace tras trim (NT-03)', () => {
    const r = createEventTaskBodySchema.safeParse({ title: '   ' });
    expect(r.success).toBe(false);
  });

  it('rechaza title 201 chars (NT-05)', () => {
    const r = createEventTaskBodySchema.safeParse({ title: 'a'.repeat(201) });
    expect(r.success).toBe(false);
  });
});

describe('US-028 createEventTaskBodySchema — description (VR-05, EC-03)', () => {
  it('acepta description ausente → null', () => {
    const r = createEventTaskBodySchema.safeParse({ title: 'ok' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.description).toBe(null);
  });

  it('acepta description explícita null', () => {
    const r = createEventTaskBodySchema.safeParse({ title: 'ok', description: null });
    expect(r.success && r.data.description).toBe(null);
  });

  it('acepta description 2000 chars', () => {
    const r = createEventTaskBodySchema.safeParse({ title: 'ok', description: 'x'.repeat(2000) });
    expect(r.success).toBe(true);
  });

  it('rechaza description 2001 chars (NT-06)', () => {
    const r = createEventTaskBodySchema.safeParse({ title: 'ok', description: 'x'.repeat(2001) });
    expect(r.success).toBe(false);
  });
});

describe('US-028 createEventTaskBodySchema — due_date (VR-06/07, EC-04/05)', () => {
  it('acepta due_date null y ausente', () => {
    expect(createEventTaskBodySchema.safeParse({ title: 'ok' }).success).toBe(true);
    expect(createEventTaskBodySchema.safeParse({ title: 'ok', due_date: null }).success).toBe(true);
  });

  it('acepta due_date futura ISO-8601 con offset', () => {
    const iso = new Date(Date.now() + 3600_000).toISOString();
    const r = createEventTaskBodySchema.safeParse({ title: 'ok', due_date: iso });
    expect(r.success).toBe(true);
  });

  it('rechaza due_date formato inválido (NT-08)', () => {
    expect(createEventTaskBodySchema.safeParse({ title: 'ok', due_date: 'mañana' }).success).toBe(false);
    expect(createEventTaskBodySchema.safeParse({ title: 'ok', due_date: '2026/08/15' }).success).toBe(false);
  });

  it('rechaza due_date pasada (NT-07) pero acepta borde con skew ±60s', () => {
    const past = new Date(Date.now() - 5 * 60_000).toISOString();
    const near = new Date(Date.now() - DUE_DATE_PAST_TOLERANCE_MS / 2).toISOString();
    expect(createEventTaskBodySchema.safeParse({ title: 'ok', due_date: past }).success).toBe(false);
    expect(createEventTaskBodySchema.safeParse({ title: 'ok', due_date: near }).success).toBe(true);
  });
});

describe('US-028 createEventTaskBodySchema — category_code (VR-08)', () => {
  it('acepta null y ausente (AC-04)', () => {
    expect(createEventTaskBodySchema.safeParse({ title: 'ok' }).success).toBe(true);
    expect(createEventTaskBodySchema.safeParse({ title: 'ok', category_code: null }).success).toBe(true);
  });

  it('acepta slug arbitrario (la validación real es en use case)', () => {
    const r = createEventTaskBodySchema.safeParse({ title: 'ok', category_code: 'catering' });
    expect(r.success).toBe(true);
  });
});

describe('US-028 body .strip() + extractIgnoredFields (AC-03, EC-11, VR-09)', () => {
  it('descarta keys server-controlled + extras', () => {
    const raw = {
      title: 'ok',
      ai_generated: true,
      status: 'done',
      priority: 'high',
      tags: ['a', 'b'],
    };
    const r = createEventTaskBodySchema.safeParse(raw);
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as Record<string, unknown>).ai_generated).toBeUndefined();
      expect((r.data as Record<string, unknown>).status).toBeUndefined();
    }
    const dropped = extractIgnoredFields(raw);
    expect(dropped).toEqual(expect.arrayContaining(['ai_generated', 'status', 'priority', 'tags']));
  });

  it('body vacío → sin ignoredFields', () => {
    expect(extractIgnoredFields({})).toEqual([]);
    expect(extractIgnoredFields(null)).toEqual([]);
    expect(extractIgnoredFields(['a'])).toEqual([]);
  });

  it('ALLOWED_BODY_KEYS y SERVER_CONTROLLED_TASK_KEYS son mutuamente disjuntos', () => {
    for (const k of SERVER_CONTROLLED_TASK_KEYS) {
      expect(ALLOWED_BODY_KEYS).not.toContain(k);
    }
  });
});
