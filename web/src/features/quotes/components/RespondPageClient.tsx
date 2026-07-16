'use client';

// RespondPageClient (US-052 / FE-001).
// Client Component que consume el detalle del QR (`useVendorQrDetail`) para obtener la moneda
// del evento y mostrar un summary mínimo (`EventBriefSnapshot`), y monta el `QuoteResponseForm`.
// Colapsa a `notFound()` cuando el backend devuelve `404 QR_NOT_FOUND`.
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useVendorQrDetail } from '../hooks/vendorQrQueries';
import { EventBriefSnapshot } from './EventBriefSnapshot';
import { QuoteResponseForm } from './QuoteResponseForm';

export interface RespondPageClientProps {
  id: string;
}

// Fallback razonable si el evento no reporta currency por race con el fetch.
const DEFAULT_CURRENCY = 'GTQ';

export function RespondPageClient({ id }: RespondPageClientProps): JSX.Element {
  const t = useTranslations('vendor.qr.respond');
  const detail = useVendorQrDetail(id);

  if (detail.isLoading) {
    return (
      <div aria-busy="true" className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-32 w-full animate-pulse rounded bg-neutral-200" />
      </div>
    );
  }

  if (detail.isError) {
    if (detail.error.status === 404) notFound();
    return (
      <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {t('errors.UNEXPECTED')}
      </div>
    );
  }

  const data = detail.data;
  if (!data) return <div />;

  // Currency = del evento (via brief snapshot US-049) o del propio Quote — para US-052 basta
  // con reflejar la moneda declarada por el brief; el backend re-valida al persistir.
  const currency = data.brief?.currency_code ?? DEFAULT_CURRENCY;

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
      </header>
      <EventBriefSnapshot brief={data.brief} />
      <QuoteResponseForm
        qrId={id}
        currencyCode={currency}
        successRedirect={`/vendor/quotes/${id}`}
      />
    </article>
  );
}
