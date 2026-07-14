// US-033 (PB-P1-019 / QA-001) — Unit tests del DTO Zod `EventTaskProgressDto`.
// Cobertura: rango `percentage ∈ [0,100]`, enteros ≥ 0, campo `progress` siempre presente.
import { describe, it, expect } from 'vitest';
import { eventTaskProgressDto } from '../../src/modules/task-management/list/application/dtos/event-task-progress.dto.js';

describe('US-033 EventTaskProgressDto (BE-003)', () => {
  it('acepta el shape canónico con los 4 campos enteros', () => {
    const parsed = eventTaskProgressDto.parse({
      percentage: 75,
      done: 6,
      total_countable: 8,
      skipped: 2,
    });
    expect(parsed).toEqual({ percentage: 75, done: 6, total_countable: 8, skipped: 2 });
  });

  it('acepta {0,0,0,0} (EC-01: sin tareas)', () => {
    const parsed = eventTaskProgressDto.parse({
      percentage: 0,
      done: 0,
      total_countable: 0,
      skipped: 0,
    });
    expect(parsed.percentage).toBe(0);
  });

  it('rechaza percentage = 101 (fuera de [0,100])', () => {
    const res = eventTaskProgressDto.safeParse({
      percentage: 101,
      done: 0,
      total_countable: 0,
      skipped: 0,
    });
    expect(res.success).toBe(false);
  });

  it('rechaza percentage = -1', () => {
    const res = eventTaskProgressDto.safeParse({
      percentage: -1,
      done: 0,
      total_countable: 0,
      skipped: 0,
    });
    expect(res.success).toBe(false);
  });

  it('rechaza percentage no entero (75.5)', () => {
    const res = eventTaskProgressDto.safeParse({
      percentage: 75.5,
      done: 6,
      total_countable: 8,
      skipped: 2,
    });
    expect(res.success).toBe(false);
  });

  it('rechaza done negativo', () => {
    const res = eventTaskProgressDto.safeParse({
      percentage: 0,
      done: -1,
      total_countable: 10,
      skipped: 0,
    });
    expect(res.success).toBe(false);
  });

  it('rechaza campos adicionales (strict)', () => {
    const res = eventTaskProgressDto.safeParse({
      percentage: 75,
      done: 6,
      total_countable: 8,
      skipped: 2,
      extra: 'nope',
    });
    expect(res.success).toBe(false);
  });
});
