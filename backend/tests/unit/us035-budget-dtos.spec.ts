// US-035 (PB-P1-020 / QA-001, R1) — Unit tests de los DTOs Zod del endpoint.
// Cobertura: shape canónico R1, `currency_code` en enum, `category_code` nullable,
// rechazo de valores negativos. Sin `paid`/`ai_generated`/`service_category_id`.
import { describe, it, expect } from 'vitest';
import {
  budgetSummaryDto,
  budgetItemDto,
  getBudgetResponseDto,
  CURRENCY_CODES,
} from '../../src/modules/budget-management/dto/index.js';

describe('US-035 QA-001 — budgetSummaryDto (R1)', () => {
  it('UT-05 acepta el shape canónico R1 (sin paid_total)', () => {
    const parsed = budgetSummaryDto.parse({
      total_planned: 12500,
      total_committed: 9800,
      over_committed: false,
      currency_code: 'USD',
    });
    expect(parsed.over_committed).toBe(false);
  });

  it('UT-05 rechaza currency_code fuera del enum CurrencyCode', () => {
    const res = budgetSummaryDto.safeParse({
      total_planned: 0,
      total_committed: 0,
      over_committed: false,
      currency_code: 'ARS',
    });
    expect(res.success).toBe(false);
  });

  it.each(CURRENCY_CODES)('acepta currency_code %s del enum', (code) => {
    const res = budgetSummaryDto.safeParse({
      total_planned: 0,
      total_committed: 0,
      over_committed: false,
      currency_code: code,
    });
    expect(res.success).toBe(true);
  });

  it('UT-04 rechaza total_planned negativo', () => {
    const res = budgetSummaryDto.safeParse({
      total_planned: -1,
      total_committed: 0,
      over_committed: false,
      currency_code: 'USD',
    });
    expect(res.success).toBe(false);
  });

  it('UT-04 rechaza total_committed negativo', () => {
    const res = budgetSummaryDto.safeParse({
      total_planned: 0,
      total_committed: -0.01,
      over_committed: false,
      currency_code: 'USD',
    });
    expect(res.success).toBe(false);
  });
});

describe('US-035 QA-001 — budgetItemDto (R1)', () => {
  it('UT-06 acepta category_code = null (schema BudgetItem.categoryCode nullable)', () => {
    const parsed = budgetItemDto.parse({
      id: '11111111-1111-1111-1111-111111111111',
      label: 'Otros',
      category_code: null,
      amount_planned: 1000,
      amount_committed: 500,
    });
    expect(parsed.category_code).toBeNull();
  });

  it('UT-06 acepta category_code string', () => {
    const parsed = budgetItemDto.parse({
      id: '22222222-2222-2222-2222-222222222222',
      label: 'Catering',
      category_code: 'catering',
      amount_planned: 4500,
      amount_committed: 3800,
    });
    expect(parsed.category_code).toBe('catering');
  });

  it('UT-04 rechaza amount_planned negativo', () => {
    const res = budgetItemDto.safeParse({
      id: '33333333-3333-3333-3333-333333333333',
      label: 'x',
      category_code: null,
      amount_planned: -1,
      amount_committed: 0,
    });
    expect(res.success).toBe(false);
  });

  it('rechaza id no UUID', () => {
    const res = budgetItemDto.safeParse({
      id: 'not-a-uuid',
      label: 'x',
      category_code: null,
      amount_planned: 0,
      amount_committed: 0,
    });
    expect(res.success).toBe(false);
  });

  it('rechaza label vacío', () => {
    const res = budgetItemDto.safeParse({
      id: '44444444-4444-4444-4444-444444444444',
      label: '',
      category_code: null,
      amount_planned: 0,
      amount_committed: 0,
    });
    expect(res.success).toBe(false);
  });
});

describe('US-035 QA-001 — getBudgetResponseDto (R1)', () => {
  it('acepta empty items[]', () => {
    const parsed = getBudgetResponseDto.parse({
      summary: {
        total_planned: 0,
        total_committed: 0,
        over_committed: false,
        currency_code: 'GTQ',
      },
      items: [],
    });
    expect(parsed.items).toHaveLength(0);
  });

  it('acepta múltiples items', () => {
    const parsed = getBudgetResponseDto.parse({
      summary: {
        total_planned: 10000,
        total_committed: 8000,
        over_committed: false,
        currency_code: 'MXN',
      },
      items: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          label: 'Catering',
          category_code: 'catering',
          amount_planned: 6000,
          amount_committed: 5000,
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          label: 'Otros',
          category_code: null,
          amount_planned: 4000,
          amount_committed: 3000,
        },
      ],
    });
    expect(parsed.items).toHaveLength(2);
  });
});
