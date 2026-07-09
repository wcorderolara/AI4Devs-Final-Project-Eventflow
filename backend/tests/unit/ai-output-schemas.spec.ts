// Tests de AI Output DTOs — US-092 / QA-003 (AI-T-01..AI-T-03).
// Validan que los schemas Zod `.strict()` aceptan outputs válidos y rechazan faltantes/extra.
import { describe, it, expect } from 'vitest';
import { EventPlanAIOutputSchema } from '../../src/modules/event-planning/dto/index.js';
import { ChecklistAIOutputSchema } from '../../src/modules/task-management/dto/index.js';
import { BudgetSuggestionAIOutputSchema } from '../../src/modules/budget-management/dto/index.js';

const validEventPlan = {
  summary: 'Plan de boda',
  recommendedCategories: ['catering', 'salón'],
  suggestedTasks: [{ title: 'Reservar salón', dueOffsetDays: 30 }],
};

describe('AI Output schemas — US-092 QA-003', () => {
  it('AI-T-01: EventPlan válido → success true; output tipado', () => {
    const result = EventPlanAIOutputSchema.safeParse(validEventPlan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.suggestedTasks[0]?.title).toBe('Reservar salón');
    }
  });

  it('AI-T-02: EventPlan con campos faltantes → success false', () => {
    const { recommendedCategories: _omit, ...missing } = validEventPlan;
    const result = EventPlanAIOutputSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it('AI-T-03: EventPlan con campos extra (.strict()) → success false', () => {
    const result = EventPlanAIOutputSchema.safeParse({ ...validEventPlan, hallucinated: true });
    expect(result.success).toBe(false);
  });

  it('Checklist: happy y unhappy path', () => {
    expect(ChecklistAIOutputSchema.safeParse({ items: [{ title: 'Comprar flores' }] }).success).toBe(true);
    expect(ChecklistAIOutputSchema.safeParse({ items: [{ description: 'sin título' }] }).success).toBe(false);
  });

  it('BudgetSuggestion: happy y unhappy path', () => {
    expect(
      BudgetSuggestionAIOutputSchema.safeParse({
        items: [{ category: 'catering', estimatedAmount: 1500, currency: 'GTQ' }],
      }).success,
    ).toBe(true);
    // moneda no soportada → rechazo
    expect(
      BudgetSuggestionAIOutputSchema.safeParse({
        items: [{ category: 'catering', estimatedAmount: 1500, currency: 'JPY' }],
      }).success,
    ).toBe(false);
  });
});
