'use client';

// US-078 / FE-003 — Filtros del panel admin de eventos.
//
// - Multi-status via checkboxes (draft/active/completed/cancelled — enum Prisma real).
// - `event_type_id` como texto (UUID) opcional; MVP no requiere select con catálogo.
// - Rango `event_date_from`/`event_date_to` con inputs nativos date.
// - `organizer_search` con debounce 300ms (commit on-idle) buscando email + fullName.
// - Botón "Limpiar filtros" resetea sin recargar.
//
// A11Y: labels asociados, fieldset+legend para grupo status, cross-field error con role='alert'
// y aria-invalid en ambos inputs de fecha. Se preserva `type='submit'` para commit explícito.
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type {
  AdminEventsListFilters,
  AdminEventStatusValue,
} from '../api/adminEventsApi.types';

const ALL_STATUS: readonly AdminEventStatusValue[] = ['draft', 'active', 'completed', 'cancelled'];

const ORGANIZER_SEARCH_DEBOUNCE_MS = 300;

interface Props {
  value: AdminEventsListFilters;
  onChange: (next: AdminEventsListFilters) => void;
}

interface DraftState {
  statusDraft: boolean;
  statusActive: boolean;
  statusCompleted: boolean;
  statusCancelled: boolean;
  eventTypeId: string;
  eventDateFrom: string;
  eventDateTo: string;
  organizerSearch: string;
}

function toDraft(v: AdminEventsListFilters): DraftState {
  const set = new Set(v.status ?? []);
  return {
    statusDraft: set.has('draft'),
    statusActive: set.has('active'),
    statusCompleted: set.has('completed'),
    statusCancelled: set.has('cancelled'),
    eventTypeId: v.eventTypeId ?? '',
    eventDateFrom: v.eventDateFrom?.slice(0, 10) ?? '',
    eventDateTo: v.eventDateTo?.slice(0, 10) ?? '',
    organizerSearch: v.organizerSearch ?? '',
  };
}

function fromDraft(d: DraftState): AdminEventsListFilters {
  const statuses: AdminEventStatusValue[] = [];
  if (d.statusDraft) statuses.push('draft');
  if (d.statusActive) statuses.push('active');
  if (d.statusCompleted) statuses.push('completed');
  if (d.statusCancelled) statuses.push('cancelled');
  const out: AdminEventsListFilters = {};
  if (statuses.length > 0 && statuses.length < ALL_STATUS.length) out.status = statuses;
  const eventTypeId = d.eventTypeId.trim();
  if (eventTypeId.length > 0) out.eventTypeId = eventTypeId;
  if (d.eventDateFrom) out.eventDateFrom = new Date(d.eventDateFrom).toISOString();
  if (d.eventDateTo) out.eventDateTo = new Date(`${d.eventDateTo}T23:59:59.999Z`).toISOString();
  const oq = d.organizerSearch.trim();
  if (oq.length > 0) out.organizerSearch = oq;
  return out;
}

export function AdminEventFiltersPanel({ value, onChange }: Props): React.JSX.Element {
  const t = useTranslations('admin.events.filters');
  const tStatus = useTranslations('admin.events.status');

  const [draft, setDraft] = useState<DraftState>(() => toDraft(value));

  const valueKey = useMemo(
    () =>
      [
        value.status?.join(',') ?? '',
        value.eventTypeId ?? '',
        value.eventDateFrom ?? '',
        value.eventDateTo ?? '',
        value.organizerSearch ?? '',
      ].join('|'),
    [value.status, value.eventTypeId, value.eventDateFrom, value.eventDateTo, value.organizerSearch],
  );

  useEffect(() => {
    setDraft(toDraft(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  const statusFieldsetId = useId();
  const eventTypeIdId = useId();
  const fromInputId = useId();
  const toInputId = useId();
  const organizerSearchId = useId();

  const dateCrossFieldError = useMemo(() => {
    if (!draft.eventDateFrom || !draft.eventDateTo) return null;
    return draft.eventDateFrom > draft.eventDateTo ? t('errorDateRange') : null;
  }, [draft.eventDateFrom, draft.eventDateTo, t]);

  const hasFieldError = dateCrossFieldError !== null;

  useEffect(() => {
    const current = value.organizerSearch ?? '';
    const draftQ = draft.organizerSearch.trim();
    if (current === draftQ) return;
    if (hasFieldError) return;
    const handle = window.setTimeout(() => {
      onChange(fromDraft(draft));
    }, ORGANIZER_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.organizerSearch]);

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (hasFieldError) return;
    onChange(fromDraft(draft));
  };

  const onReset = (): void => {
    setDraft(toDraft({}));
    onChange({});
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border border-neutral-200 bg-white p-4 space-y-4"
      aria-label={t('formAriaLabel')}
    >
      <fieldset aria-labelledby={statusFieldsetId} className="space-y-2">
        <legend id={statusFieldsetId} className="text-sm font-medium text-neutral-800">
          {t('statusLegend')}
        </legend>
        <div className="flex flex-wrap gap-3">
          {ALL_STATUS.map((s) => {
            const key = `status${s.charAt(0).toUpperCase()}${s.slice(1)}` as keyof DraftState;
            return (
              <label key={s} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(draft[key])}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [key]: e.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                <span>{tStatus(s)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor={organizerSearchId} className="block text-sm font-medium text-neutral-800">
          {t('organizerSearchLabel')}
        </label>
        <input
          id={organizerSearchId}
          type="search"
          value={draft.organizerSearch}
          onChange={(e) => setDraft((d) => ({ ...d, organizerSearch: e.target.value }))}
          placeholder={t('organizerSearchPlaceholder')}
          maxLength={100}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          aria-describedby={`${organizerSearchId}-hint`}
        />
        <p id={`${organizerSearchId}-hint`} className="mt-1 text-xs text-neutral-500">
          {t('organizerSearchHint')}
        </p>
      </div>

      <div>
        <label htmlFor={eventTypeIdId} className="block text-sm font-medium text-neutral-800">
          {t('eventTypeIdLabel')}
        </label>
        <input
          id={eventTypeIdId}
          type="text"
          value={draft.eventTypeId}
          onChange={(e) => setDraft((d) => ({ ...d, eventTypeId: e.target.value }))}
          placeholder={t('eventTypeIdPlaceholder')}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor={fromInputId} className="block text-sm font-medium text-neutral-800">
            {t('eventDateFromLabel')}
          </label>
          <input
            id={fromInputId}
            type="date"
            value={draft.eventDateFrom}
            onChange={(e) => setDraft((d) => ({ ...d, eventDateFrom: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            aria-invalid={dateCrossFieldError !== null || undefined}
          />
        </div>
        <div>
          <label htmlFor={toInputId} className="block text-sm font-medium text-neutral-800">
            {t('eventDateToLabel')}
          </label>
          <input
            id={toInputId}
            type="date"
            value={draft.eventDateTo}
            onChange={(e) => setDraft((d) => ({ ...d, eventDateTo: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            aria-invalid={dateCrossFieldError !== null || undefined}
          />
        </div>
      </div>
      {dateCrossFieldError ? (
        <p role="alert" className="text-sm text-red-700">
          {dateCrossFieldError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
        >
          {t('reset')}
        </button>
        <button
          type="submit"
          disabled={hasFieldError}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-neutral-300"
        >
          {t('apply')}
        </button>
      </div>
    </form>
  );
}
