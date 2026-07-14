// US-032 (PB-P1-019 / QA-004) — Tolerancia del parser `range` (EC-01, VR-01..08) + telemetría
// extendida (`range_filter`, `range_dropped`). Los tests son DB-free y validan que:
//   * `range` ∈ enum → se aplica tal cual (`rangeDropped=false`).
//   * `range` inválido (fuera de enum o casing distinto) → default `'all'` + drop
//     `{ key:'range', value:<raw>, reason:'not_in_enum' }` + `rangeDropped=true`.
//   * Ausencia de `range` → default `'all'` sin drop.
//   * `tasks.list.requested` incluye `range_filter` y `range_dropped` sin PII.
import { describe, it, expect, vi } from 'vitest';
import {
  parseListEventTasksQuery,
  DEFAULT_RANGE,
  LIST_EVENT_TASKS_RANGES,
  type ListEventTasksRange,
} from '../../src/modules/task-management/list/interface/http/list-event-tasks.schema.js';
import { ListEventTasksTelemetry } from '../../src/modules/task-management/list/application/list-event-tasks-telemetry.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';

describe('US-032 — parseListEventTasksQuery.range (tolerante)', () => {
  it.each(LIST_EVENT_TASKS_RANGES)('acepta valor válido "%s" sin drop', (value) => {
    const parsed = parseListEventTasksQuery({ range: value });
    expect(parsed.filters.range).toBe(value);
    expect(parsed.filters.rangeDropped).toBe(false);
    expect(parsed.filtersDropped).toEqual([]);
  });

  it('sin range → default "all" sin drop (AC-04)', () => {
    const parsed = parseListEventTasksQuery({});
    expect(parsed.filters.range).toBe(DEFAULT_RANGE);
    expect(parsed.filters.rangeDropped).toBe(false);
    expect(parsed.filtersDropped).toEqual([]);
  });

  it('NT-01: range=foo → "all" + drop', () => {
    const parsed = parseListEventTasksQuery({ range: 'foo' });
    expect(parsed.filters.range).toBe('all');
    expect(parsed.filters.rangeDropped).toBe(true);
    expect(parsed.filtersDropped).toEqual([
      { key: 'range', value: 'foo', reason: 'not_in_enum' },
    ]);
  });

  it.each(['Overdue', 'OVERDUE', '7D', 'All'])(
    'NT-07/NT-08: case-sensitive — "%s" cae a "all" con drop',
    (raw) => {
      const parsed = parseListEventTasksQuery({ range: raw });
      expect(parsed.filters.range).toBe('all');
      expect(parsed.filters.rangeDropped).toBe(true);
      expect(parsed.filtersDropped).toHaveLength(1);
      expect(parsed.filtersDropped[0]).toMatchObject({ key: 'range', value: raw });
    },
  );

  it('range no-string (número, objeto) → drop + default', () => {
    const parsed = parseListEventTasksQuery({ range: 7 });
    expect(parsed.filters.range).toBe('all');
    expect(parsed.filters.rangeDropped).toBe(true);
  });

  it('coexiste con otros filtros tolerantes preservando el orden de drops', () => {
    const parsed = parseListEventTasksQuery({
      status: 'foo',
      aiGenerated: 'notabool',
      range: 'bar',
      page: -1,
    });
    expect(parsed.filters.status).toBeUndefined();
    expect(parsed.filters.aiGenerated).toBeUndefined();
    expect(parsed.filters.range).toBe('all');
    expect(parsed.filters.rangeDropped).toBe(true);
    const keys = parsed.filtersDropped.map((d) => d.key);
    expect(keys).toContain('status');
    expect(keys).toContain('aiGenerated');
    expect(keys).toContain('range');
    expect(keys).toContain('page');
  });
});

describe('US-032 — ListEventTasksTelemetry.emitRequested (OBS-001)', () => {
  const baseFilters = (range: ListEventTasksRange, rangeDropped = false) => ({
    range,
    rangeDropped,
  });

  it('emite range_filter y range_dropped=false cuando el valor es válido', () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => undefined as never);
    const telemetry = new ListEventTasksTelemetry();
    telemetry.emitRequested({
      correlationId: 'corr-1',
      actorId: 'actor',
      eventId: 'event',
      filtersApplied: baseFilters('7d'),
      filtersDropped: [],
      page: 1,
      pageSize: 20,
      itemsCount: 3,
      totalItems: 3,
      latencyMs: 5,
      statusCode: 200,
      progress: { percentage: 0, done: 0, total_countable: 0, skipped: 0 },
    });
    expect(spy).toHaveBeenCalledOnce();
    const payload = spy.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.event).toBe('tasks.list.requested');
    expect(payload.range_filter).toBe('7d');
    expect(payload.range_dropped).toBe(false);
    spy.mockRestore();
  });

  it('emite range_dropped=true cuando el cliente envió un valor inválido', () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => undefined as never);
    const telemetry = new ListEventTasksTelemetry();
    telemetry.emitRequested({
      correlationId: 'corr-2',
      actorId: 'actor',
      eventId: 'event',
      filtersApplied: baseFilters('all', true),
      filtersDropped: [{ key: 'range', value: 'FOO', reason: 'not_in_enum' }],
      page: 1,
      pageSize: 20,
      itemsCount: 0,
      totalItems: 0,
      latencyMs: 2,
      statusCode: 200,
      progress: { percentage: 0, done: 0, total_countable: 0, skipped: 0 },
    });
    const payload = spy.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.range_filter).toBe('all');
    expect(payload.range_dropped).toBe(true);
    // El detalle del descarte vive en filtersDropped (sin PII: solo key/value/reason).
    const filtersDropped = payload.filtersDropped as Array<Record<string, unknown>>;
    expect(filtersDropped).toEqual([
      { key: 'range', value: 'FOO', reason: 'not_in_enum' },
    ]);
    spy.mockRestore();
  });
});
