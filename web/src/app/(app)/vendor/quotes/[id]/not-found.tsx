// Not-found accesible del detalle vendor QR (US-051 / FE-003).
// `role="alert"` para lectores de pantalla + heading semántico h1.
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function VendorQuoteRequestNotFound(): JSX.Element {
  const t = useTranslations('vendor.qr.detail.notFound');
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div role="alert" className="space-y-4 rounded-md border border-neutral-200 bg-white p-6 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900">{t('title')}</h1>
        <p className="text-sm text-neutral-600">{t('description')}</p>
        <Link
          href="/vendor/quotes"
          className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          {t('backLink')}
        </Link>
      </div>
    </main>
  );
}
