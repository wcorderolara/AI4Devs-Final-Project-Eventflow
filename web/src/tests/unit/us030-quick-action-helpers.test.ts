// US-030 (PB-P1-018 / QA-001) — Unit tests de los 3 helpers puros del submódulo quick-action.
// Cubre matriz canónica, no-mutación de rewrite, y mapeo de errores incluyendo la igualdad
// de i18nKey para 403/404 (no-revelación).
import { describe, it, expect } from 'vitest';
import { computeQuickActions } from '@/features/tasks/quick-action/compute-quick-actions';
import { rewriteTaskStatus } from '@/features/tasks/quick-action/rewrite-task-status';
import { quickActionErrorMap } from '@/features/tasks/quick-action/quick-action-error-map';
import type { TaskListItemDTO } from '@/features/tasks/list/api/tasksListApi.types';

describe('US-030 computeQuickActions — matriz canónica (AC-01..04, EC-07)', () => {
  it('pending → [check_done→done, skip→skipped] habilitadas', () => {
    const rows = computeQuickActions('pending', 'active');
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.action).sort()).toEqual(['check_done', 'skip']);
    expect(rows.every((r) => r.enabled)).toBe(true);
  });
  it('in_progress → [check_done→done, skip→skipped]', () => {
    const rows = computeQuickActions('in_progress', 'active');
    expect(rows.map((r) => r.action).sort()).toEqual(['check_done', 'skip']);
  });
  it('done → [uncheck_done→in_progress]', () => {
    const rows = computeQuickActions('done', 'active');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('uncheck_done');
    expect(rows[0]?.targetStatus).toBe('in_progress');
  });
  it('skipped → [resume→in_progress]', () => {
    const rows = computeQuickActions('skipped', 'active');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('resume');
    expect(rows[0]?.targetStatus).toBe('in_progress');
  });
  it('active (no canónico) → sin acciones rápidas', () => {
    expect(computeQuickActions('active', 'active')).toEqual([]);
  });
});

describe('US-030 computeQuickActions — event bloqueado (EC-07)', () => {
  it('event.status=cancelled → todas enabled=false', () => {
    const rows = computeQuickActions('pending', 'cancelled');
    expect(rows.every((r) => !r.enabled)).toBe(true);
  });
  it('event.status=completed → todas enabled=false', () => {
    const rows = computeQuickActions('pending', 'completed');
    expect(rows.every((r) => !r.enabled)).toBe(true);
  });
  it('event.status=draft → habilitadas', () => {
    const rows = computeQuickActions('pending', 'draft');
    expect(rows.every((r) => r.enabled)).toBe(true);
  });
  it('event.status=undefined → habilitadas (fallback conservador)', () => {
    const rows = computeQuickActions('pending', undefined);
    expect(rows.every((r) => r.enabled)).toBe(true);
  });
});

const baseTask = (over: Partial<TaskListItemDTO> = {}): TaskListItemDTO => ({
  id: 't1',
  title: 'x',
  due_date: null,
  status: 'pending',
  category_code: null,
  ai_generated: false,
  ai_recommendation_id: null,
  confirmed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  // US-032: flags derivados server-side; irrelevantes para quick-action, defaultean a false.
  overdue: false,
  is_t_minus_7: false,
  ...over,
});

describe('US-030 rewriteTaskStatus — puro, sin mutación (VR-04)', () => {
  it('reescribe la tarea por id', () => {
    const input = [baseTask({ id: 'a' }), baseTask({ id: 'b', status: 'in_progress' })];
    const next = rewriteTaskStatus(input, 'b', 'done');
    expect(next[1]?.status).toBe('done');
    expect(input[1]?.status).toBe('in_progress'); // no mutó
  });
  it('devuelve la MISMA referencia cuando el id no existe', () => {
    const input = [baseTask({ id: 'a' })];
    const next = rewriteTaskStatus(input, 'zzz', 'done');
    expect(next).toBe(input);
  });
});

describe('US-030 quickActionErrorMap — 5 códigos canónicos + default (EC-01..05)', () => {
  it('INVALID_TRANSITION → invalid_transition + error', () => {
    const r = quickActionErrorMap({ code: 'INVALID_TRANSITION', status: 409 });
    expect(r.i18nKey).toBe('tasks.status.error.invalid_transition');
    expect(r.toastVariant).toBe('error');
    expect(r.includeRetry).toBe(false);
  });
  it('EVENT_NOT_MUTABLE → event_not_mutable + warning', () => {
    const r = quickActionErrorMap({ code: 'EVENT_NOT_MUTABLE', status: 409 });
    expect(r.i18nKey).toBe('tasks.status.error.event_not_mutable');
    expect(r.toastVariant).toBe('warning');
  });
  it('404 y 403 devuelven MISMA i18nKey (no-revelación)', () => {
    const r404 = quickActionErrorMap({ code: 'RESOURCE_NOT_FOUND', status: 404 });
    const r403 = quickActionErrorMap({ code: 'FORBIDDEN', status: 403 });
    expect(r404.i18nKey).toBe(r403.i18nKey);
    expect(r404.i18nKey).toBe('tasks.status.error.not_found_or_forbidden');
  });
  it('5xx → transient + includeRetry', () => {
    const r = quickActionErrorMap({ code: 'INTERNAL_ERROR', status: 500 });
    expect(r.i18nKey).toBe('tasks.status.error.transient');
    expect(r.toastVariant).toBe('transient');
    expect(r.includeRetry).toBe(true);
  });
  it('default (red/timeout/unknown) → transient + retry', () => {
    const r = quickActionErrorMap({ code: 'NETWORK_ERROR' });
    expect(r.i18nKey).toBe('tasks.status.error.transient');
    expect(r.includeRetry).toBe(true);
  });
});
