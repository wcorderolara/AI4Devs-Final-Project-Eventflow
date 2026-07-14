// US-027 (PB-P1-018 / BE-001) — Schemas y parser tolerante para el listado del checklist.
// - `params`: valida `eventId` como UUID (400 VALIDATION si inválido — VR-01, NT-01).
// - `query`: **NO** rechaza filtros inválidos; los descarta silenciosamente con log
//   `filters.dropped` (EC-01, VR-03..07). El parser custom `parseListEventTasksQuery` es la
//   fuente de verdad de la tolerancia; devuelve `{ filters, pagination, filtersDropped }`.
import { z } from 'zod';

/** Estados de tarea válidos como filtro. Alineado con el enum físico tras US-031. */
export const LIST_EVENT_TASKS_STATUSES = [
  'pending',
  'active',
  'in_progress',
  'done',
  'skipped',
] as const;
export type ListEventTasksStatus = (typeof LIST_EVENT_TASKS_STATUSES)[number];

export const CATEGORY_CODE_NULL_LITERAL = 'null';
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// US-032 (PB-P1-019 / BE-001) — Enum de rango temporal server-side.
// Tolerante (EC-01): valores fuera del enum caen a `DEFAULT_RANGE` y se acumulan en
// `filtersDropped` con `reason='not_in_enum'`. Case-sensitive por decisión PO (VR-02, NT-07/08).
export const LIST_EVENT_TASKS_RANGES = ['overdue', '7d', '30d', 'all'] as const;
export type ListEventTasksRange = (typeof LIST_EVENT_TASKS_RANGES)[number];
export const DEFAULT_RANGE: ListEventTasksRange = 'all';

/** Param schema (path). UUID inválido → 400 VALIDATION (VR-01, NT-01). */
export const listEventTasksParamsSchema = z
  .object({ eventId: z.string().uuid() })
  .strict();

export type ListEventTasksParams = z.infer<typeof listEventTasksParamsSchema>;

export interface ListEventTasksFilters {
  status?: ListEventTasksStatus;
  aiGenerated?: boolean;
  categoryCode?: string | typeof CATEGORY_CODE_NULL_LITERAL;
  // US-032 (PB-P1-019 / BE-001) — `range` siempre presente tras el parser (default 'all').
  range: ListEventTasksRange;
  // US-032 — Bandera de descarte tolerante (EC-01, OBS-001). `true` cuando el cliente envió un
  // valor de `range` inválido que fue normalizado al default. Consumida por OBS-001 y QA-004.
  rangeDropped: boolean;
}

export interface ListEventTasksPagination {
  page: number;
  pageSize: number;
}

export interface FilterDrop {
  key: string;
  value: unknown;
  reason: string;
}

export interface ParsedListEventTasksQuery {
  filters: ListEventTasksFilters;
  pagination: ListEventTasksPagination;
  filtersDropped: FilterDrop[];
}

const STATUS_SET = new Set<string>(LIST_EVENT_TASKS_STATUSES);
const RANGE_SET = new Set<string>(LIST_EVENT_TASKS_RANGES);

/** Boolean tolerante: solo acepta los strings `'true'` y `'false'`. */
function parseBoolLoose(raw: unknown): { ok: true; value: boolean } | { ok: false } {
  if (raw === 'true' || raw === true) return { ok: true, value: true };
  if (raw === 'false' || raw === false) return { ok: true, value: false };
  return { ok: false };
}

/** Coerce a int; NaN o fuera-de-rango → null. */
function parseIntLoose(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

/**
 * Parser tolerante — nunca lanza; descarta filtros inválidos y acumula el log estructurado.
 * Aplica clamp: `pageSize > MAX` → `MAX` (drop con reason=clamp); `pageSize < 1` → default.
 */
export function parseListEventTasksQuery(raw: unknown): ParsedListEventTasksQuery {
  const src = (raw ?? {}) as Record<string, unknown>;
  const filters: ListEventTasksFilters = { range: DEFAULT_RANGE, rangeDropped: false };
  const dropped: FilterDrop[] = [];

  // status
  if (src.status !== undefined) {
    if (typeof src.status === 'string' && STATUS_SET.has(src.status)) {
      filters.status = src.status as ListEventTasksStatus;
    } else {
      dropped.push({ key: 'status', value: src.status, reason: 'not_in_enum' });
    }
  }

  // aiGenerated ∈ {'true','false'}
  if (src.aiGenerated !== undefined) {
    const parsed = parseBoolLoose(src.aiGenerated);
    if (parsed.ok) {
      filters.aiGenerated = parsed.value;
    } else {
      dropped.push({ key: 'aiGenerated', value: src.aiGenerated, reason: 'not_bool_string' });
    }
  }

  // categoryCode: string no vacío o literal 'null'
  if (src.categoryCode !== undefined) {
    if (typeof src.categoryCode === 'string' && src.categoryCode.length > 0) {
      filters.categoryCode = src.categoryCode;
    } else {
      dropped.push({ key: 'categoryCode', value: src.categoryCode, reason: 'invalid_type' });
    }
  }

  // US-032 (BE-001): range ∈ enum (case-sensitive). Inválido → DEFAULT_RANGE + drop (EC-01,
  // VR-02, NT-07/08). La ausencia mantiene el default sin registrar drop.
  if (src.range !== undefined) {
    if (typeof src.range === 'string' && RANGE_SET.has(src.range)) {
      filters.range = src.range as ListEventTasksRange;
    } else {
      dropped.push({ key: 'range', value: src.range, reason: 'not_in_enum' });
      filters.rangeDropped = true;
    }
  }

  // page ≥ 1 (default 1 si inválido)
  let page = DEFAULT_PAGE;
  if (src.page !== undefined) {
    const p = parseIntLoose(src.page);
    if (p !== null && p >= 1) {
      page = p;
    } else {
      dropped.push({ key: 'page', value: src.page, reason: 'invalid_or_out_of_range' });
    }
  }

  // pageSize ∈ [1, MAX_PAGE_SIZE] con clamp por encima
  let pageSize = DEFAULT_PAGE_SIZE;
  if (src.pageSize !== undefined) {
    const ps = parseIntLoose(src.pageSize);
    if (ps === null || ps < 1) {
      dropped.push({ key: 'pageSize', value: src.pageSize, reason: 'invalid_or_out_of_range' });
    } else if (ps > MAX_PAGE_SIZE) {
      pageSize = MAX_PAGE_SIZE;
      dropped.push({ key: 'pageSize', value: src.pageSize, reason: 'clamped_to_max' });
    } else {
      pageSize = ps;
    }
  }

  return { filters, pagination: { page, pageSize }, filtersDropped: dropped };
}
