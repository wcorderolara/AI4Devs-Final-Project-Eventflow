// Página `/organizer/events/[eventId]/quotes/new` (US-049 / FE-001).
// La URL sólo lleva identificadores cortos y públicos (`?vendor=<slug>&category=<code>`); el evento,
// el proveedor y la categoría se cargan de la API en `NewQuoteRequestPage`.
import { NewQuoteRequestPage } from '@/features/quotes';

interface PageProps {
  params: { eventId: string };
  searchParams: Record<string, string | string[] | undefined>;
}

/** Primer valor de un query param (Next 14 devuelve `string | string[] | undefined`). */
function firstOf(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default function OrganizerCreateQuoteRequestPage({ params, searchParams }: PageProps): JSX.Element {
  return (
    <NewQuoteRequestPage
      eventId={params.eventId}
      vendorSlug={firstOf(searchParams.vendor)}
      categoryCode={firstOf(searchParams.category)}
    />
  );
}
