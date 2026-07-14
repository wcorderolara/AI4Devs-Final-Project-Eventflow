// US-029 (PB-P1-018 / QA-001) — Tests unit de los schemas Zod + helper `extractIgnoredFields`.
// Cubre AC-01/04/05, EC-06/07/11, VR-01/06/07/10/12.
import { describe, it, expect } from 'vitest';
import {
  ALLOWED_CONTENT_KEYS,
  extractIgnoredFields,
  taskMutationParamsSchema,
  updateEventTaskContentBodySchema,
  updateEventTaskStatusBodySchema,
} from '../../src/modules/task-management/mutate/interface/http/mutate-event-task.schema.js';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

describe('US-029 taskMutationParamsSchema (VR-01, VR-02)', () => {
  it('acepta UUIDs válidos en eventId + taskId', () => {
    const r = taskMutationParamsSchema.safeParse({ eventId: UUID_A, taskId: UUID_B });
    expect(r.success).toBe(true);
  });
  it('rechaza UUID inválido', () => {
    expect(taskMutationParamsSchema.safeParse({ eventId: 'x', taskId: UUID_B }).success).toBe(false);
    expect(taskMutationParamsSchema.safeParse({ eventId: UUID_A, taskId: 'y' }).success).toBe(false);
  });
});

describe('US-029 updateEventTaskContentBodySchema — happy paths (AC-01, AC-05, EC-11, VR-06/07)', () => {
  it('acepta title solo', () => {
    const r = updateEventTaskContentBodySchema.safeParse({ title: 'Nuevo' });
    expect(r.success).toBe(true);
  });
  it('acepta description null (EC-11)', () => {
    const r = updateEventTaskContentBodySchema.safeParse({ description: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.description).toBeNull();
  });
  it('acepta category_code null (AC-05)', () => {
    const r = updateEventTaskContentBodySchema.safeParse({ category_code: null });
    expect(r.success).toBe(true);
  });
  it('acepta due_date null', () => {
    const r = updateEventTaskContentBodySchema.safeParse({ due_date: null });
    expect(r.success).toBe(true);
  });
});

describe('US-029 updateEventTaskContentBodySchema — EMPTY_PATCH (EC-06)', () => {
  it('rechaza body vacío con message=EMPTY_PATCH', () => {
    const r = updateEventTaskContentBodySchema.safeParse({});
    expect(r.success).toBe(false);
    if (!r.success) {
      const empty = r.error.issues.find((i) => i.message === 'EMPTY_PATCH');
      expect(empty).toBeDefined();
    }
  });
  it('rechaza body solo con server-controlled keys tras strip', () => {
    // Las keys extras se caen por .strip() → luego superRefine ve vacío.
    const r = updateEventTaskContentBodySchema.safeParse({ ai_generated: true, id: 'x' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message === 'EMPTY_PATCH')).toBe(true);
    }
  });
});

describe('US-029 updateEventTaskContentBodySchema — límites (VR-06/07)', () => {
  it('title 1 char rechazado', () => {
    const r = updateEventTaskContentBodySchema.safeParse({ title: 'A' });
    expect(r.success).toBe(false);
  });
  it('title 201 chars rechazado', () => {
    const r = updateEventTaskContentBodySchema.safeParse({ title: 'A'.repeat(201) });
    expect(r.success).toBe(false);
  });
  it('description 2001 chars rechazado', () => {
    const r = updateEventTaskContentBodySchema.safeParse({ description: 'A'.repeat(2001) });
    expect(r.success).toBe(false);
  });
});

describe('US-029 updateEventTaskContentBodySchema — .strip() descarta server-controlled (EC-07, VR-12)', () => {
  it('descarta ai_generated, id, status, confirmed_at, etc.', () => {
    const r = updateEventTaskContentBodySchema.safeParse({
      title: 'OK',
      ai_generated: true,
      id: 'x',
      status: 'done',
      confirmed_at: '2026-01-01T00:00:00Z',
      language_code: 'en',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({ title: 'OK' });
      expect('ai_generated' in r.data).toBe(false);
      expect('status' in r.data).toBe(false);
    }
  });
});

describe('US-029 updateEventTaskStatusBodySchema (VR-10)', () => {
  it.each(['pending', 'in_progress', 'done', 'skipped'] as const)(
    'acepta status válido: %s',
    (s) => {
      expect(updateEventTaskStatusBodySchema.safeParse({ status: s }).success).toBe(true);
    },
  );
  it('rechaza status inválido "foo"', () => {
    expect(updateEventTaskStatusBodySchema.safeParse({ status: 'foo' }).success).toBe(false);
  });
  it('rechaza status="active" (no está en el flujo canónico de US-029, N4)', () => {
    expect(updateEventTaskStatusBodySchema.safeParse({ status: 'active' }).success).toBe(false);
  });
});

describe('US-029 extractIgnoredFields (EC-07, VR-12)', () => {
  it('devuelve las keys que no están en ALLOWED_CONTENT_KEYS', () => {
    const result = extractIgnoredFields(
      { title: 'x', ai_generated: true, status: 'done' },
      ALLOWED_CONTENT_KEYS,
    );
    expect(result.sort()).toEqual(['ai_generated', 'status']);
  });
  it('devuelve [] si todas las keys son permitidas', () => {
    const result = extractIgnoredFields({ title: 'x', due_date: null }, ALLOWED_CONTENT_KEYS);
    expect(result).toEqual([]);
  });
  it('maneja rawBody no-object', () => {
    expect(extractIgnoredFields(null, ALLOWED_CONTENT_KEYS)).toEqual([]);
    expect(extractIgnoredFields('str', ALLOWED_CONTENT_KEYS)).toEqual([]);
    expect(extractIgnoredFields([], ALLOWED_CONTENT_KEYS)).toEqual([]);
  });
});
