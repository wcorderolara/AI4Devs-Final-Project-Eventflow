// US-027 (PB-P1-018) / QA-001 — Unit tests del parser tolerante `parseListEventTasksQuery`.
// Cubre AC-02..05, EC-01, VR-03..07: cada filtro inválido se descarta silenciosamente y se
// acumula en `filtersDropped` con la razón concreta; NUNCA lanza. Paginación aplica defaults y
// clamp por encima del máximo.
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parseListEventTasksQuery,
} from '../../src/modules/task-management/list/interface/http/list-event-tasks.schema.js';

describe('US-027 parseListEventTasksQuery — defaults + tolerancia', () => {
  it('sin query → filtros con defaults (range=all), paginación default, sin drops', () => {
    const r = parseListEventTasksQuery({});
    // US-032: `range` y `rangeDropped` siempre presentes tras el parser; defaults `all`/`false`.
    expect(r.filters).toEqual({ range: 'all', rangeDropped: false });
    expect(r.pagination).toEqual({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE });
    expect(r.filtersDropped).toEqual([]);
  });

  it('status válido conservado', () => {
    const r = parseListEventTasksQuery({ status: 'pending' });
    expect(r.filters.status).toBe('pending');
    expect(r.filtersDropped).toEqual([]);
  });

  it('status inválido → drop con reason=not_in_enum (nunca lanza)', () => {
    const r = parseListEventTasksQuery({ status: 'foo' });
    expect(r.filters.status).toBeUndefined();
    expect(r.filtersDropped).toEqual([{ key: 'status', value: 'foo', reason: 'not_in_enum' }]);
  });

  it("aiGenerated string 'true'/'false' → boolean", () => {
    const t = parseListEventTasksQuery({ aiGenerated: 'true' });
    expect(t.filters.aiGenerated).toBe(true);
    const f = parseListEventTasksQuery({ aiGenerated: 'false' });
    expect(f.filters.aiGenerated).toBe(false);
    expect(t.filtersDropped).toEqual([]);
    expect(f.filtersDropped).toEqual([]);
  });

  it("aiGenerated inválido → drop con reason=not_bool_string ('yes' descartado)", () => {
    const r = parseListEventTasksQuery({ aiGenerated: 'yes' });
    expect(r.filters.aiGenerated).toBeUndefined();
    expect(r.filtersDropped[0]).toEqual({
      key: 'aiGenerated',
      value: 'yes',
      reason: 'not_bool_string',
    });
  });

  it('categoryCode string → se conserva; literal "null" pasa como literal', () => {
    const cat = parseListEventTasksQuery({ categoryCode: 'catering' });
    expect(cat.filters.categoryCode).toBe('catering');
    const nul = parseListEventTasksQuery({ categoryCode: 'null' });
    expect(nul.filters.categoryCode).toBe('null');
  });

  it('page fuera de rango o no numérico → default 1 con drop', () => {
    const zero = parseListEventTasksQuery({ page: '0' });
    expect(zero.pagination.page).toBe(DEFAULT_PAGE);
    expect(zero.filtersDropped[0]?.key).toBe('page');
    const nan = parseListEventTasksQuery({ page: 'abc' });
    expect(nan.pagination.page).toBe(DEFAULT_PAGE);
    expect(nan.filtersDropped[0]?.key).toBe('page');
  });

  it('pageSize > MAX → clamp a MAX_PAGE_SIZE con reason=clamped_to_max', () => {
    const r = parseListEventTasksQuery({ pageSize: '500' });
    expect(r.pagination.pageSize).toBe(MAX_PAGE_SIZE);
    expect(r.filtersDropped).toContainEqual({
      key: 'pageSize',
      value: '500',
      reason: 'clamped_to_max',
    });
  });

  it('pageSize = 0 o negativo → default 20 con drop', () => {
    const r = parseListEventTasksQuery({ pageSize: '0' });
    expect(r.pagination.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(r.filtersDropped[0]?.key).toBe('pageSize');
  });

  it('combinación EC-08: filtros válidos aplicados + paginación custom sin drops', () => {
    const r = parseListEventTasksQuery({
      status: 'pending',
      aiGenerated: 'true',
      categoryCode: 'catering',
      page: '2',
      pageSize: '50',
    });
    expect(r.filters).toEqual({
      status: 'pending',
      aiGenerated: true,
      categoryCode: 'catering',
      range: 'all',
      rangeDropped: false,
    });
    expect(r.pagination).toEqual({ page: 2, pageSize: 50 });
    expect(r.filtersDropped).toEqual([]);
  });
});
