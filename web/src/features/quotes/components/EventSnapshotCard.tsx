// EventSnapshotCard — read-only snapshot del evento (US-049 / FE-001).
// Muestra el título del evento, tipo, fecha, ubicación y guests estimados. NO permite editar
// (los datos vienen del evento en el momento de crear la QR y quedan snapshotted en el brief).
import { useTranslations } from 'next-intl';

export interface EventSnapshotCardProps {
  eventTitle: string;
  eventType?: string | null;
  eventDate?: string | null;
  locationLabel?: string | null;
  guestsCount?: number | null;
  currencyCode: string;
}

function formatDate(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d);
}

export function EventSnapshotCard(props: EventSnapshotCardProps): JSX.Element {
  const t = useTranslations('quotes.create.eventSnapshot');
  return (
    <section
      aria-labelledby="event-snapshot-title"
      className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <h2 id="event-snapshot-title" className="text-sm font-semibold text-neutral-700">
        {t('heading')}
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('titleLabel')}</dt>
          <dd className="mt-1 font-medium text-neutral-900">{props.eventTitle}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('currencyLabel')}</dt>
          <dd className="mt-1 font-medium text-neutral-900">{props.currencyCode}</dd>
        </div>
        {props.eventType != null && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('typeLabel')}</dt>
            <dd className="mt-1 text-neutral-800">{props.eventType}</dd>
          </div>
        )}
        {props.eventDate != null && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('dateLabel')}</dt>
            <dd className="mt-1 text-neutral-800">{formatDate(props.eventDate, 'es-ES') ?? '—'}</dd>
          </div>
        )}
        {props.locationLabel != null && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('locationLabel')}</dt>
            <dd className="mt-1 text-neutral-800">{props.locationLabel}</dd>
          </div>
        )}
        {props.guestsCount != null && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">{t('guestsLabel')}</dt>
            <dd className="mt-1 text-neutral-800">{props.guestsCount}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
