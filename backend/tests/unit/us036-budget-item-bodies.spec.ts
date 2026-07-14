// US-036 (PB-P1-020 / QA-001, R1) — Unit tests de los body schemas Zod.
// Cobertura UT-01/UT-02: `.strict()` rechaza `committed`, `paid`, `ai_generated`,
// `service_category_id` — todos ellos generan `VALIDATION_ERROR` (mapea a 400).
// UT R1: nuevos schemas aceptan `label`/`category_code`/`amount_planned`/`amount_committed`.
import { describe, it, expect } from 'vitest';
import {
  createBudgetItemBodySchema,
  updateBudgetItemBodySchema,
} from '../../src/modules/budget-management/dto/index.js';

describe('US-036 QA-001 — createBudgetItemBodySchema (R1)', () => {
  it('acepta body mínimo (label + amount_planned)', () => {
    const parsed = createBudgetItemBodySchema.parse({
      label: 'Catering',
      amount_planned: 4500,
    });
    expect(parsed.label).toBe('Catering');
    expect(parsed.amount_planned).toBe(4500);
    expect(parsed.category_code).toBeUndefined();
    expect(parsed.amount_committed).toBeUndefined();
  });

  it('acepta body completo (label + category_code + amount_planned + amount_committed)', () => {
    const parsed = createBudgetItemBodySchema.parse({
      label: 'Catering',
      category_code: 'catering',
      amount_planned: 4500,
      amount_committed: 3800,
    });
    expect(parsed.category_code).toBe('catering');
    expect(parsed.amount_committed).toBe(3800);
  });

  it('acepta category_code = null explícito', () => {
    const parsed = createBudgetItemBodySchema.parse({
      label: 'Otros',
      category_code: null,
      amount_planned: 100,
    });
    expect(parsed.category_code).toBeNull();
  });

  it('UT-01 rechaza body con `committed` (Zod .strict)', () => {
    const res = createBudgetItemBodySchema.safeParse({
      label: 'x',
      amount_planned: 100,
      committed: 50,
    });
    expect(res.success).toBe(false);
  });

  it('UT-01 rechaza body con `paid`', () => {
    const res = createBudgetItemBodySchema.safeParse({
      label: 'x',
      amount_planned: 100,
      paid: 50,
    });
    expect(res.success).toBe(false);
  });

  it('UT-01 rechaza body con `ai_generated`', () => {
    const res = createBudgetItemBodySchema.safeParse({
      label: 'x',
      amount_planned: 100,
      ai_generated: true,
    });
    expect(res.success).toBe(false);
  });

  it('UT-01 rechaza body con `service_category_id`', () => {
    const res = createBudgetItemBodySchema.safeParse({
      label: 'x',
      amount_planned: 100,
      service_category_id: '11111111-1111-1111-1111-111111111111',
    });
    expect(res.success).toBe(false);
  });

  it('VR-01 rechaza amount_planned negativo', () => {
    const res = createBudgetItemBodySchema.safeParse({
      label: 'x',
      amount_planned: -1,
    });
    expect(res.success).toBe(false);
  });

  it('rechaza label vacío', () => {
    const res = createBudgetItemBodySchema.safeParse({ label: '', amount_planned: 0 });
    expect(res.success).toBe(false);
  });

  it('rechaza label > 120 chars', () => {
    const res = createBudgetItemBodySchema.safeParse({
      label: 'x'.repeat(121),
      amount_planned: 0,
    });
    expect(res.success).toBe(false);
  });
});

describe('US-036 QA-001 — updateBudgetItemBodySchema (R1)', () => {
  it('acepta body con solo label', () => {
    const parsed = updateBudgetItemBodySchema.parse({ label: 'Nuevo' });
    expect(parsed.label).toBe('Nuevo');
  });

  it('acepta body vacío (todos opcionales)', () => {
    const parsed = updateBudgetItemBodySchema.parse({});
    expect(parsed).toEqual({});
  });

  it('UT-02 rechaza body con `amount_committed`', () => {
    const res = updateBudgetItemBodySchema.safeParse({ amount_committed: 100 });
    expect(res.success).toBe(false);
  });

  it('UT-02 rechaza body con `committed`', () => {
    const res = updateBudgetItemBodySchema.safeParse({ committed: 100 });
    expect(res.success).toBe(false);
  });

  it('UT-02 rechaza body con `paid`', () => {
    const res = updateBudgetItemBodySchema.safeParse({ paid: 100 });
    expect(res.success).toBe(false);
  });

  it('UT-02 rechaza body con `ai_generated`', () => {
    const res = updateBudgetItemBodySchema.safeParse({ ai_generated: false });
    expect(res.success).toBe(false);
  });

  it('UT-02 rechaza body con `service_category_id`', () => {
    const res = updateBudgetItemBodySchema.safeParse({
      service_category_id: '11111111-1111-1111-1111-111111111111',
    });
    expect(res.success).toBe(false);
  });

  it('acepta category_code = null (limpiar categoría)', () => {
    const parsed = updateBudgetItemBodySchema.parse({ category_code: null });
    expect(parsed.category_code).toBeNull();
  });

  it('rechaza amount_planned negativo', () => {
    const res = updateBudgetItemBodySchema.safeParse({ amount_planned: -0.01 });
    expect(res.success).toBe(false);
  });
});
