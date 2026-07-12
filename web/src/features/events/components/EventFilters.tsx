'use client';

import { useTranslations } from 'next-intl';
import {
  EVENT_STATUSES,
  EVENT_TYPE_CODES,
  type EventStatus,
  type EventTypeCode,
} from '../api/eventsApi.types';

export interface EventFiltersValue {
  status?: EventStatus;
  eventTypeCode?: EventTypeCode;
}

/** Filtros server-side del listado (US-013 / AC-03): estado y tipo de evento. */
export function EventFilters({
  value,
  onChange,
}: {
  value: EventFiltersValue;
  onChange: (next: EventFiltersValue) => void;
}): React.JSX.Element {
  const t = useTranslations('events');

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="filter-status" className="block text-sm font-medium">
          {t('filters.status')}
        </label>
        <select
          id="filter-status"
          value={value.status ?? ''}
          onChange={(e) =>
            onChange({ ...value, status: e.target.value ? (e.target.value as EventStatus) : undefined })
          }
          className="mt-1 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="">{t('filters.allStatuses')}</option>
          {EVENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-type" className="block text-sm font-medium">
          {t('filters.type')}
        </label>
        <select
          id="filter-type"
          value={value.eventTypeCode ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              eventTypeCode: e.target.value ? (e.target.value as EventTypeCode) : undefined,
            })
          }
          className="mt-1 rounded border border-neutral-300 px-3 py-2"
        >
          <option value="">{t('filters.allTypes')}</option>
          {EVENT_TYPE_CODES.map((code) => (
            <option key={code} value={code}>
              {t(`types.${code}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
