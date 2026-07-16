// Página `/organizer/events/[eventId]/quotes/new` (US-049 / FE-001).
// Server Component que renderiza el layout con el snapshot del evento (read-only), el resumen
// del vendor target (leído desde `?vendorSlug=`) y el formulario cliente para enviar la QR.
// El fetching real de evento/vendor lo cubrirán USs siguientes; hoy la page recibe placeholders
// derivados de query params para desbloquear el flujo y quedar productiva para US-050.
import { getTranslations } from 'next-intl/server';
import { EventSnapshotCard, VendorCardSummary, QuoteRequestForm } from '@/features/quotes';

interface PageProps {
  params: { eventId: string };
  searchParams: Record<string, string | string[] | undefined>;
}

/** Convierte el primer valor de un query param (Next 14 devuelve `string | string[] | undefined`). */
function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}

export default async function OrganizerCreateQuoteRequestPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const t = await getTranslations('quotes.create');

  const vendorProfileId = firstOf(searchParams.vendorProfileId) ?? '';
  const serviceCategoryId = firstOf(searchParams.serviceCategoryId) ?? '';
  const vendorName = firstOf(searchParams.vendorName) ?? '—';
  const categoryLabel = firstOf(searchParams.categoryLabel) ?? null;
  const eventTitle = firstOf(searchParams.eventTitle) ?? '—';
  const eventType = firstOf(searchParams.eventType) ?? null;
  const eventDate = firstOf(searchParams.eventDate) ?? null;
  const locationLabel = firstOf(searchParams.locationLabel) ?? null;
  const currencyCode = firstOf(searchParams.currency) ?? 'GTQ';
  const guestsRaw = firstOf(searchParams.guests);
  const guestsCount = guestsRaw ? Number.parseInt(guestsRaw, 10) : null;
  const source = firstOf(searchParams.source) === 'ai_generated' ? 'ai_generated' : 'manual';

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <EventSnapshotCard
          eventTitle={eventTitle}
          eventType={eventType}
          eventDate={eventDate}
          locationLabel={locationLabel}
          guestsCount={Number.isFinite(guestsCount) ? guestsCount : null}
          currencyCode={currencyCode}
        />
        <VendorCardSummary businessName={vendorName} categoryLabel={categoryLabel} />
      </div>

      <QuoteRequestForm
        eventId={params.eventId}
        vendorProfileId={vendorProfileId}
        serviceCategoryId={serviceCategoryId}
        source={source}
        successRedirect={`/organizer/events/${params.eventId}/quotes`}
      />
    </main>
  );
}
