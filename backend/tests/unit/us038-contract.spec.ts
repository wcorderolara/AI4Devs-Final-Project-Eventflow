// US-038 (PB-P1-022 / QA-005 CONTRACT-01) — Contract test forward-compat.
// Verifica:
//   1. El shape extendido conforma al DTO Zod extendido de US-038.
//   2. Un cliente que sólo consume los campos de US-035 (subset) sigue funcional al ignorar
//      los campos nuevos — validado con un schema-legacy laxo que hace `parse` sobre el shape
//      real.
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  budgetSummaryDto,
  budgetItemDto,
} from '../../src/modules/budget-management/dto/index.js';

// Schema laxo de la versión US-035 (sin campos US-038). `.passthrough()` simula el
// comportamiento típico de un cliente legado (Zod, tRPC o TS interface con campos opcionales)
// que no explota si llegan campos adicionales.
const legacySummaryDto = z
  .object({
    total_planned: z.number(),
    total_committed: z.number(),
    over_committed: z.boolean(),
    currency_code: z.string(),
  })
  .passthrough();

const legacyItemDto = z
  .object({
    id: z.string(),
    label: z.string(),
    category_code: z.string().nullable(),
    amount_planned: z.number(),
    amount_committed: z.number(),
  })
  .passthrough();

const extendedResponse = {
  summary: {
    total_planned: 1000,
    total_committed: 1250,
    over_committed: true,
    currency_code: 'USD',
    overcommitted_amount: 250,
  },
  items: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      label: 'Venue',
      category_code: 'venue',
      amount_planned: 500,
      amount_committed: 800,
      over_committed: true,
      overcommitted_amount: 300,
    },
  ],
};

describe('US-038 QA-005 CONTRACT-01 — shape extendido', () => {
  it('el summary extendido parsea con el DTO Zod extendido', () => {
    const parsed = budgetSummaryDto.parse(extendedResponse.summary);
    expect(parsed.overcommitted_amount).toBe(250);
  });

  it('cada item extendido parsea con el DTO Zod extendido', () => {
    for (const item of extendedResponse.items) {
      const parsed = budgetItemDto.parse(item);
      expect(parsed.over_committed).toBe(true);
    }
  });
});

describe('US-038 QA-005 CONTRACT-01 — forward-compat (cliente US-035 legacy)', () => {
  it('summary extendido es aceptado por schema legacy (campos nuevos ignorados)', () => {
    const parsed = legacySummaryDto.parse(extendedResponse.summary);
    expect(parsed.over_committed).toBe(true);
    // El campo nuevo pasa por `.passthrough()` — no rompe.
    expect((parsed as unknown as { overcommitted_amount?: number }).overcommitted_amount).toBe(250);
  });

  it('items extendidos son aceptados por schema legacy sin romper', () => {
    for (const item of extendedResponse.items) {
      const parsed = legacyItemDto.parse(item);
      expect(parsed.id).toBe(item.id);
    }
  });
});
