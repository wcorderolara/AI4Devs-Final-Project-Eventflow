// US-032 (PB-P1-019 / QA-001) — Unit tests de la derivación de flags temporales
// (`overdue`, `is_t_minus_7`) en `TaskListItemMapper`. Cubre los 6+ casos canónicos definidos
// en la Tech Spec §13 + BR-AI-010 (el DTO no expone payload LLM).
import { describe, it, expect } from 'vitest';
import {
  deriveTemporalFlags,
  toTaskListItemDto,
} from '../../src/modules/task-management/list/infrastructure/mappers/task-list-item.mapper.js';
import type { EventTaskRow } from '../../src/modules/task-management/list/ports/event-task-list.repository.js';

const TODAY = new Date('2026-08-15T00:00:00.000Z');

function makeRow(overrides: Partial<EventTaskRow> = {}): EventTaskRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Contratar catering',
    dueDate: null,
    status: 'pending',
    categoryCode: 'catering',
    aiGenerated: false,
    aiRecommendationId: null,
    confirmedAt: null,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    ...overrides,
  };
}

function daysFromToday(days: number): Date {
  return new Date(TODAY.getTime() + days * 86_400_000);
}

describe('US-032 — deriveTemporalFlags (canónicos)', () => {
  it('1) due_date < today && status=pending → overdue=true, is_t_minus_7=false', () => {
    const flags = deriveTemporalFlags(daysFromToday(-3), 'pending', TODAY);
    expect(flags).toEqual({ overdue: true, is_t_minus_7: false });
  });

  it('2) due_date < today && status=done → overdue=false (BR-TASK-008 operativo)', () => {
    const flags = deriveTemporalFlags(daysFromToday(-3), 'done', TODAY);
    expect(flags).toEqual({ overdue: false, is_t_minus_7: false });
  });

  it('2.b) due_date < today && status=skipped → overdue=false', () => {
    const flags = deriveTemporalFlags(daysFromToday(-3), 'skipped', TODAY);
    expect(flags).toEqual({ overdue: false, is_t_minus_7: false });
  });

  it('3) due_date = today → overdue=false, is_t_minus_7=true (EC-03)', () => {
    const flags = deriveTemporalFlags(daysFromToday(0), 'pending', TODAY);
    expect(flags).toEqual({ overdue: false, is_t_minus_7: true });
  });

  it('4) due_date = today + 7d → overdue=false, is_t_minus_7=true (borde inclusivo)', () => {
    const flags = deriveTemporalFlags(daysFromToday(7), 'in_progress', TODAY);
    expect(flags).toEqual({ overdue: false, is_t_minus_7: true });
  });

  it('5) due_date = today + 8d → ambos false (fuera del T-7)', () => {
    const flags = deriveTemporalFlags(daysFromToday(8), 'pending', TODAY);
    expect(flags).toEqual({ overdue: false, is_t_minus_7: false });
  });

  it('6) due_date IS NULL → ambos false (EC-07)', () => {
    const flags = deriveTemporalFlags(null, 'pending', TODAY);
    expect(flags).toEqual({ overdue: false, is_t_minus_7: false });
  });

  it('7) status=active (enum físico US-031) con due_date pasada → overdue=true', () => {
    const flags = deriveTemporalFlags(daysFromToday(-1), 'active', TODAY);
    expect(flags).toEqual({ overdue: true, is_t_minus_7: false });
  });

  it('8) tarea in_progress con due_date en T-30 fuera de T-7 → ambos false', () => {
    const flags = deriveTemporalFlags(daysFromToday(20), 'in_progress', TODAY);
    expect(flags).toEqual({ overdue: false, is_t_minus_7: false });
  });
});

describe('US-032 — toTaskListItemDto', () => {
  it('proyecta overdue e is_t_minus_7 en el DTO canónico', () => {
    const row = makeRow({ dueDate: daysFromToday(3), status: 'pending' });
    const dto = toTaskListItemDto(row, TODAY);
    expect(dto.overdue).toBe(false);
    expect(dto.is_t_minus_7).toBe(true);
    expect(dto.id).toBe(row.id);
    expect(dto.due_date).toBe(row.dueDate!.toISOString());
  });

  it('BR-AI-010: el DTO NO expone payload LLM (prompt/output/language_code)', () => {
    const row = makeRow({ aiGenerated: true, aiRecommendationId: 'rec-xyz' });
    const dto = toTaskListItemDto(row, TODAY);
    const keys = Object.keys(dto).sort();
    expect(keys).toEqual(
      [
        'ai_generated',
        'ai_recommendation_id',
        'category_code',
        'confirmed_at',
        'created_at',
        'due_date',
        'id',
        'is_t_minus_7',
        'overdue',
        'status',
        'title',
        'updated_at',
      ].sort(),
    );
  });

  it('due_date NULL → overdue e is_t_minus_7 false; due_date preservado como null', () => {
    const row = makeRow({ dueDate: null, status: 'pending' });
    const dto = toTaskListItemDto(row, TODAY);
    expect(dto.due_date).toBeNull();
    expect(dto.overdue).toBe(false);
    expect(dto.is_t_minus_7).toBe(false);
  });
});
