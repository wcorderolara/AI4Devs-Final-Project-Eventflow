// Vendor QR respond page (US-052 / FE-001).
// Validación UUID en runtime + wrapper del Client Component `RespondPageClient` que carga el
// detalle del QR (para currency + summary) y monta el `QuoteResponseForm`.
import { notFound } from 'next/navigation';
import { RespondPageClient } from '@/features/quotes/components/RespondPageClient';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function VendorQuoteRequestRespondPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  if (!UUID_RE.test(params.id)) notFound();
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <RespondPageClient id={params.id} />
    </main>
  );
}
