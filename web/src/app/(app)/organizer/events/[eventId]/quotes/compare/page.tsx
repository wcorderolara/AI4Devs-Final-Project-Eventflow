// Página `/organizer/events/[eventId]/quotes/compare` (US-057 / FE-001).
// Server Component ligero que resuelve `categoryCode` desde `?categoryCode=` y monta el
// `QuoteComparator` (client). No hace fetching server-side: la query TanStack corre en cliente
// para reflejar cambios post-mount (si el organizer regresa a la página tras marcar preferred).
import { getTranslations } from 'next-intl/server';
import { QuoteComparator } from '@/features/quotes';

interface PageProps {
  params: { eventId: string };
  searchParams: Record<string, string | string[] | undefined>;
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}

export default async function OrganizerCompareQuotesPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const t = await getTranslations('organizer.quote.compare');
  const categoryCode = firstOf(searchParams.categoryCode) ?? '';

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900">{t('page.title')}</h1>
        <p className="mt-1 text-sm text-neutral-600">{t('page.subtitle')}</p>
      </header>

      <div className="mt-6">
        {categoryCode === '' ? (
          <div
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900"
            data-testid="quote-comparator-missing-category"
          >
            {t('errors.INVALID_FILTERS')}
          </div>
        ) : (
          <QuoteComparator eventId={params.eventId} categoryCode={categoryCode} />
        )}
      </div>
    </main>
  );
}
