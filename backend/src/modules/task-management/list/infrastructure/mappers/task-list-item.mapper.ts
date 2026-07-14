// US-027 (PB-P1-018 / BE-003) — Mapper puro EventTaskRow → TaskListItemDto.
// Expone únicamente los 10 campos canónicos + los 2 flags derivados de US-032. NUNCA incluye
// `prompt_version_id`, `llm_provider`, `language_code` ni payloads del LLM (BR-AI-010, AC-07).
// Fechas normalizadas a ISO-8601.
//
// US-032 (PB-P1-019 / BE-003) — Derivación server-side de `overdue` e `is_t_minus_7`:
//   `overdue      = dueDate < today AND status ∉ {done, skipped} AND dueDate IS NOT NULL`
//   `is_t_minus_7 = today ≤ dueDate ≤ today + 7d AND dueDate IS NOT NULL`
// `today` se recibe del repositorio (BE-004), calculado por PostgreSQL con `CURRENT_DATE`, para
// preservar la invariante "server-side" (VR-08). Comparación por fecha calendario (día
// completo): se normalizan `today` y `dueDate` a medianoche UTC antes de comparar, alineado con
// la semántica `date` de la User Story y con `Timestamptz(6)` almacenado en UTC.
import type { EventTaskRow } from '../../ports/event-task-list.repository.js';
import type { TaskListItemDto } from '../../application/dtos/task-list-item.dto.js';

const MS_PER_DAY = 86_400_000;
const T_MINUS_7_WINDOW_DAYS = 7;

/** Trunca un `Date` a medianoche UTC (mismo día calendario). */
function toUtcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export interface DeriveFlagsResult {
  overdue: boolean;
  is_t_minus_7: boolean;
}

/** Cálculo puro de los flags temporales de US-032 (AC-01..03, AC-08, EC-07). */
export function deriveTemporalFlags(
  dueDate: Date | null,
  status: EventTaskRow['status'],
  today: Date,
): DeriveFlagsResult {
  if (dueDate === null) {
    return { overdue: false, is_t_minus_7: false };
  }
  const dueMid = toUtcMidnight(dueDate);
  const todayMid = toUtcMidnight(today);
  const overdue =
    dueMid < todayMid && status !== 'done' && status !== 'skipped';
  const upperMid = todayMid + T_MINUS_7_WINDOW_DAYS * MS_PER_DAY;
  const is_t_minus_7 = dueMid >= todayMid && dueMid <= upperMid;
  return { overdue, is_t_minus_7 };
}

/**
 * `today` defaultea a `new Date()` para preservar compatibilidad con los use cases de
 * mutación (US-028/029/030) que devuelven un item fresco tras una escritura. En el path de
 * lectura del listado, siempre se pasa el `CURRENT_DATE` server-side vía el repositorio
 * (BE-004) — VR-08.
 */
export function toTaskListItemDto(row: EventTaskRow, today: Date = new Date()): TaskListItemDto {
  const { overdue, is_t_minus_7 } = deriveTemporalFlags(row.dueDate, row.status, today);
  return {
    id: row.id,
    title: row.title,
    due_date: row.dueDate ? row.dueDate.toISOString() : null,
    status: row.status,
    category_code: row.categoryCode,
    ai_generated: row.aiGenerated,
    ai_recommendation_id: row.aiRecommendationId,
    confirmed_at: row.confirmedAt ? row.confirmedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    overdue,
    is_t_minus_7,
  };
}

export function toTaskListItemDtoList(rows: EventTaskRow[], today: Date): TaskListItemDto[] {
  return rows.map((r) => toTaskListItemDto(r, today));
}
