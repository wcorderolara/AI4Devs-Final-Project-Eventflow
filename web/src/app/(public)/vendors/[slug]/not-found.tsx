// Not-found page — perfil público del vendor (US-046 / FE-005, AC-02).
// Se dispara desde `page.tsx` vía `notFound()` cuando el backend responde 404
// `VENDOR_NOT_FOUND` (D6 — uniforme, sin distinguir "no existe" vs "no aprobado").
// A11Y: encabezado semántico `<h1>` + landmark `<main>` + CTA con destino explícito.
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function VendorNotFound() {
  const t = useTranslations('publicVendor.notFound');
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold text-neutral-900">{t('title')}</h1>
      <p className="text-neutral-700">{t('body')}</p>
      <Link
        href="/vendors"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        {t('cta')}
      </Link>
    </main>
  );
}
