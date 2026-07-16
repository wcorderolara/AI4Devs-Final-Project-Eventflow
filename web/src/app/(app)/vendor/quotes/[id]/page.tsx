// Vendor QR detail page (US-051 / FE-001).
// Wrapper Server Component que valida el `id` como UUID en runtime y delega la orquestación
// GET + POST mark-viewed al Client Component `QuoteRequestDetail`. La página no fuerza fetch
// server-side: el POST es un side-effect que debe ejecutarse en el cliente.
import { notFound } from 'next/navigation';
import { QuoteRequestDetail } from '@/features/quotes/components/QuoteRequestDetail';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function VendorQuoteRequestDetailPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  if (!UUID_RE.test(params.id)) notFound();
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <QuoteRequestDetail id={params.id} />
    </main>
  );
}
