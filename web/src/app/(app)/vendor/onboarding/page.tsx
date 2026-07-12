import { useTranslations } from 'next-intl';

/**
 * Onboarding del proveedor (US-002 / FE-004 — placeholder acordado en el Tasks File): CTA
 * "Completar mi perfil" que abrirá el formulario de `VendorProfile` de US-040 (status inicial
 * `pending` hasta aprobación admin, US-074). El enlace se sincronizará vía DOC-001 cuando
 * US-040 fije su ruta definitiva.
 */
export default function VendorOnboardingPage() {
  const t = useTranslations('auth.vendorOnboarding');
  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-sm text-neutral-700">{t('body')}</p>
      <p className="mt-1 text-xs text-neutral-500">{t('pendingNote')}</p>
      <a
        href="/vendor/profile"
        className="mt-4 inline-block rounded bg-neutral-900 px-4 py-2 text-white"
      >
        {t('cta')}
      </a>
    </section>
  );
}
