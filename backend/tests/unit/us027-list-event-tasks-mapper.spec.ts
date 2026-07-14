// US-027 (PB-P1-018) / QA-001 — Unit tests del mapper `EventTaskRow → TaskListItemDto`.
// Verifica AC-07 (trazabilidad IA mínima) y BR-AI-010 (no exponer payloads del LLM ni claves
// sensibles como `prompt_version_id`, `llm_provider`, `language_code`).
import { describe, it, expect } from 'vitest';
import { toTaskListItemDto } from '../../src/modules/task-management/list/infrastructure/mappers/task-list-item.mapper.js';
import type { EventTaskRow } from '../../src/modules/task-management/list/ports/event-task-list.repository.js';

function baseRow(overrides: Partial<EventTaskRow> = {}): EventTaskRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Reservar salón',
    dueDate: new Date('2026-09-01T00:00:00.000Z'),
    status: 'pending',
    categoryCode: 'catering',
    aiGenerated: false,
    aiRecommendationId: null,
    confirmedAt: null,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

describe('US-027 toTaskListItemDto — trazabilidad IA mínima', () => {
  it('mapea tarea manual con category_code y sin trazabilidad IA', () => {
    // US-032: `today` fijo garantiza determinismo de los flags (dueDate 2026-09-01 << today
    // 2026-06-01 → ambos flags false por criterio: no está en T-7 ni es overdue de hoy).
    const today = new Date('2026-06-01T00:00:00.000Z');
    const dto = toTaskListItemDto(baseRow(), today);
    expect(dto).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Reservar salón',
      due_date: '2026-09-01T00:00:00.000Z',
      status: 'pending',
      category_code: 'catering',
      ai_generated: false,
      ai_recommendation_id: null,
      confirmed_at: null,
      created_at: '2026-06-01T10:00:00.000Z',
      updated_at: '2026-06-02T10:00:00.000Z',
      overdue: false,
      is_t_minus_7: false,
    });
  });

  it('mapea tarea IA confirmada con ai_recommendation_id y confirmed_at', () => {
    const dto = toTaskListItemDto(
      baseRow({
        aiGenerated: true,
        aiRecommendationId: '22222222-2222-4222-8222-222222222222',
        confirmedAt: new Date('2026-06-15T12:00:00.000Z'),
        status: 'in_progress',
      }),
    );
    expect(dto.ai_generated).toBe(true);
    expect(dto.ai_recommendation_id).toBe('22222222-2222-4222-8222-222222222222');
    expect(dto.confirmed_at).toBe('2026-06-15T12:00:00.000Z');
    expect(dto.status).toBe('in_progress');
  });

  it('due_date null cuando la fila no tiene due date (EC-07)', () => {
    const dto = toTaskListItemDto(baseRow({ dueDate: null }));
    expect(dto.due_date).toBeNull();
  });

  it('category_code null si la fila no tiene categoría (BR-TASK-008)', () => {
    const dto = toTaskListItemDto(baseRow({ categoryCode: null }));
    expect(dto.category_code).toBeNull();
  });

  it('NUNCA expone claves sensibles del LLM en el DTO (BR-AI-010, AC-07)', () => {
    const dto = toTaskListItemDto(
      baseRow({ aiGenerated: true, aiRecommendationId: 'rec-id' }),
    );
    const forbiddenKeys = ['prompt_version_id', 'llm_provider', 'language_code', 'raw', 'payload', 'description'];
    for (const k of forbiddenKeys) {
      expect(Object.hasOwn(dto, k)).toBe(false);
    }
    // US-027 (10 canónicas) + US-032 (overdue, is_t_minus_7 server-side).
    expect(Object.keys(dto).sort()).toEqual(
      [
        'id',
        'title',
        'due_date',
        'status',
        'category_code',
        'ai_generated',
        'ai_recommendation_id',
        'confirmed_at',
        'created_at',
        'updated_at',
        'overdue',
        'is_t_minus_7',
      ].sort(),
    );
  });
});
