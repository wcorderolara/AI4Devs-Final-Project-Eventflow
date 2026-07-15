// US-038 (PB-P1-022 / QA-001 UT-05) — Tests unitarios de la extensión de DTOs Zod
// (`budgetSummaryDto` + `budgetItemDto`). Verifican que los campos nuevos son:
//   - Requeridos (siempre presentes → forward-compat sin campos opcionales).
//   - Nonnegative (VR-03) para `overcommitted_amount`.
import { describe, it, expect } from 'vitest';
import {
  budgetSummaryDto,
  budgetItemDto,
} from '../../src/modules/budget-management/dto/index.js';

describe('US-038 QA-001 UT-05 — budgetSummaryDto extendido', () => {
  it('acepta shape extendido con overcommitted_amount', () => {
    const parsed = budgetSummaryDto.parse({
      total_planned: 1000,
      total_committed: 1250,
      over_committed: true,
      currency_code: 'USD',
      overcommitted_amount: 250,
    });
    expect(parsed.overcommitted_amount).toBe(250);
  });

  it('rechaza overcommitted_amount ausente (forward-compat: campos siempre presentes)', () => {
    const res = budgetSummaryDto.safeParse({
      total_planned: 100,
      total_committed: 50,
      over_committed: false,
      currency_code: 'USD',
    });
    expect(res.success).toBe(false);
  });

  it('rechaza overcommitted_amount negativo (VR-03)', () => {
    const res = budgetSummaryDto.safeParse({
      total_planned: 100,
      total_committed: 50,
      over_committed: false,
      currency_code: 'USD',
      overcommitted_amount: -0.01,
    });
    expect(res.success).toBe(false);
  });
});

describe('US-038 QA-001 UT-05 — budgetItemDto extendido', () => {
  it('acepta shape extendido con over_committed + overcommitted_amount', () => {
    const parsed = budgetItemDto.parse({
      id: '11111111-1111-1111-1111-111111111111',
      label: 'Venue',
      category_code: 'venue',
      amount_planned: 500,
      amount_committed: 800,
      over_committed: true,
      overcommitted_amount: 300,
    });
    expect(parsed.over_committed).toBe(true);
    expect(parsed.overcommitted_amount).toBe(300);
  });

  it('rechaza over_committed ausente', () => {
    const res = budgetItemDto.safeParse({
      id: '11111111-1111-1111-1111-111111111111',
      label: 'x',
      category_code: null,
      amount_planned: 0,
      amount_committed: 0,
      overcommitted_amount: 0,
    });
    expect(res.success).toBe(false);
  });

  it('rechaza overcommitted_amount negativo (VR-03)', () => {
    const res = budgetItemDto.safeParse({
      id: '11111111-1111-1111-1111-111111111111',
      label: 'x',
      category_code: null,
      amount_planned: 0,
      amount_committed: 0,
      over_committed: false,
      overcommitted_amount: -1,
    });
    expect(res.success).toBe(false);
  });
});
