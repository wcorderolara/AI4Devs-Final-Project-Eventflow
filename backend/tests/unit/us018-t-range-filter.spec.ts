// US-018 / AI-003 — filtro T-x (`ChecklistTRangeFilter`).
// EC-01: para eventos próximos, sólo se persisten tareas con `due_relative_days <= daysToEvent`.
import { describe, it, expect } from 'vitest';
import {
  filterChecklistTasksByDaysToEvent,
} from '../../src/modules/ai-assistance/application/ai-generation.service.js';

type ChecklistTask = {
  title: string;
  description: string;
  category: string;
  due_relative_days: number;
  phase: 'T-180' | 'T-90' | 'T-30' | 'T-7' | 'T-1';
  priority: 'low' | 'medium' | 'high';
};

function task(days: number, phase: ChecklistTask['phase']): ChecklistTask {
  return {
    title: `t-${days}`,
    description: `d-${days}`,
    category: 'general',
    due_relative_days: days,
    phase,
    priority: 'medium',
  };
}

describe('US-018 EC-01 — filterChecklistTasksByDaysToEvent', () => {
  it('evento próximo (3 días) mantiene solo tareas con due_relative_days <= 3', () => {
    const tasks: ChecklistTask[] = [
      task(180, 'T-180'),
      task(90, 'T-90'),
      task(30, 'T-30'),
      task(7, 'T-7'),
      task(1, 'T-1'),
    ];
    const filtered = filterChecklistTasksByDaysToEvent(tasks, 3);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.due_relative_days).toBe(1);
    expect(filtered[0]?.phase).toBe('T-1');
  });

  it('evento lejano (365 días) mantiene todas las tareas válidas', () => {
    const tasks: ChecklistTask[] = [task(180, 'T-180'), task(90, 'T-90'), task(1, 'T-1')];
    const filtered = filterChecklistTasksByDaysToEvent(tasks, 365);
    expect(filtered).toHaveLength(3);
  });

  it('descarta tareas con due_relative_days negativos', () => {
    const tasks: ChecklistTask[] = [
      { ...task(30, 'T-30'), due_relative_days: -5 },
      task(30, 'T-30'),
    ];
    const filtered = filterChecklistTasksByDaysToEvent(tasks, 100);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.due_relative_days).toBe(30);
  });

  it('daysToEvent=0 con tareas T-1 preserva al menos la más cercana (fallback ceremonial para schema .min(1))', () => {
    const tasks: ChecklistTask[] = [task(180, 'T-180'), task(90, 'T-90')];
    const filtered = filterChecklistTasksByDaysToEvent(tasks, 0);
    // Ninguna tarea satisface `due_relative_days <= 0`, así que se retorna la más próxima (T-90).
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.due_relative_days).toBe(90);
  });
});
