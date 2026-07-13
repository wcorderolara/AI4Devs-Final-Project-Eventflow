'use client';

// US-016 / FE-002 — Viewer read-only del evento en modo admin.
// - Renderiza campos como `<input readOnly aria-readonly>` (FE-004).
// - Muestra `ReadOnlyBadge` (AC-03) y `DeletedEventBanner` cuando `deleted=true` (EC-01).
// - No expone controles primarios de edición ni de cancelación (AC-03).
import { useTranslations } from 'next-intl';
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge';
import type { AdminEventModel } from '../api/adminEventsApi.types';
import { ReadOnlyBadge } from './ReadOnlyBadge';
import { DeletedEventBanner } from './DeletedEventBanner';

interface Props {
  event: AdminEventModel;
}

export function AdminEventViewer({ event }: Props): React.JSX.Element {
  const t = useTranslations('admin.events.detail');
  const tFields = useTranslations('events.fields');

  return (
    <section
      aria-labelledby="admin-event-detail-title"
      data-testid="admin-event-viewer"
      className="space-y-6"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 id="admin-event-detail-title" className="text-2xl font-bold">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">{event.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <ReadOnlyBadge />
          <EventStatusBadge status={event.status} />
        </div>
      </header>

      {event.deleted ? <DeletedEventBanner /> : null}

      <div
        role="group"
        aria-label={t('fieldsGroupAria')}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <ReadOnlyField label={tFields('type')} value={event.eventTypeCode} />
        <ReadOnlyField label={tFields('name')} value={event.name} />
        <ReadOnlyField label={tFields('eventDate')} value={event.eventDate || '—'} />
        <ReadOnlyField label={tFields('guests')} value={String(event.guestsCount)} />
        <ReadOnlyField label={tFields('location')} value={event.locationId} />
        <ReadOnlyField
          label={tFields('budget')}
          value={`${event.estimatedBudget} ${event.currencyCode}`}
        />
        <ReadOnlyField label={tFields('language')} value={event.languageCode} />
        <ReadOnlyField label={t('owner')} value={event.owner.displayName} />
        <ReadOnlyField
          label={t('createdAt')}
          value={new Date(event.createdAt).toLocaleString()}
        />
        <ReadOnlyField
          label={t('updatedAt')}
          value={new Date(event.updatedAt).toLocaleString()}
        />
        {event.notes ? (
          <div className="md:col-span-2">
            <ReadOnlyField label={tFields('notes')} value={event.notes} multiline />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ReadOnlyField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}): React.JSX.Element {
  const id = `admin-event-field-${label.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          readOnly
          aria-readonly="true"
          rows={3}
          className="mt-1 block w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800"
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          readOnly
          aria-readonly="true"
          className="mt-1 block w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800"
        />
      )}
    </div>
  );
}
