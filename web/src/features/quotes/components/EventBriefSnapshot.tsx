'use client';

// EventBriefSnapshot (US-051 / FE-002).
// Renderiza el `brief` embebido del QuoteRequest. Soporta las dos shapes válidas:
//   - US-049 (canónico): `{ budget, currency_code, message, event_snapshot }`.
//   - US-096 (legado): `{ summary, requirements, questions, constraints }`.
// Elige la shape presente sin acoplar la UI a una versión específica.
import { useTranslations } from 'next-intl';
import type { VendorQuoteRequestBrief } from '../api/vendorQrApi';

export interface EventBriefSnapshotProps {
  brief: VendorQuoteRequestBrief | null;
}

export function EventBriefSnapshot({ brief }: EventBriefSnapshotProps): JSX.Element {
  const t = useTranslations('vendor.qr.detail.brief');
  if (!brief) {
    return <p className="text-sm text-neutral-500">{t('empty')}</p>;
  }

  const isUs049Shape = Boolean(brief.budget !== undefined || brief.event_snapshot);
  const isLegacyShape = Boolean(brief.summary || brief.requirements || brief.questions);

  return (
    <section className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="text-lg font-semibold text-neutral-900">{t('title')}</h2>
      {isUs049Shape && (
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {brief.budget !== undefined && (
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">{t('budget')}</dt>
              <dd className="text-sm text-neutral-900">
                {brief.budget} {brief.currency_code ?? ''}
              </dd>
            </div>
          )}
          {brief.event_snapshot?.event_date && (
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">{t('eventDate')}</dt>
              <dd className="text-sm text-neutral-900">{brief.event_snapshot.event_date}</dd>
            </div>
          )}
          {brief.event_snapshot?.guests_count != null && (
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">{t('guests')}</dt>
              <dd className="text-sm text-neutral-900">{brief.event_snapshot.guests_count}</dd>
            </div>
          )}
          {brief.message && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-neutral-500">{t('message')}</dt>
              <dd className="whitespace-pre-line text-sm text-neutral-900">{brief.message}</dd>
            </div>
          )}
        </dl>
      )}
      {isLegacyShape && (
        <div className="mt-3 space-y-2">
          {brief.summary && <p className="text-sm text-neutral-900">{brief.summary}</p>}
          {brief.requirements && brief.requirements.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase text-neutral-500">{t('requirements')}</p>
              <ul className="list-disc pl-5 text-sm text-neutral-900">
                {brief.requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {brief.questions && brief.questions.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase text-neutral-500">{t('questions')}</p>
              <ul className="list-disc pl-5 text-sm text-neutral-900">
                {brief.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {!isUs049Shape && !isLegacyShape && (
        <p className="mt-2 text-sm text-neutral-500">{t('empty')}</p>
      )}
    </section>
  );
}
