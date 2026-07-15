// Ruta `/vendor/profile/edit` (US-041 / FE-002). Página cliente que carga el perfil propio y
// renderiza el editor. Sin perfil (404) o error → mensaje neutro con CTA a `/vendor/profile/new`.
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { VendorProfileEditor } from '@/features/vendor-profile';
import { useMyVendorProfile } from '@/features/vendor-profile/hooks/useVendorProfileQueries';

export default function EditVendorProfilePage(): React.JSX.Element {
  const t = useTranslations('vendor.profile.edit');
  const tErrors = useTranslations('vendor.profile.edit.errors');
  const router = useRouter();
  const query = useMyVendorProfile();

  if (query.isPending) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p role="status" aria-live="polite" aria-busy="true">
          {t('loading')}
        </p>
      </main>
    );
  }

  if (query.error) {
    const code =
      query.error instanceof ApiError && query.error.code === 'PROFILE_NOT_FOUND'
        ? 'PROFILE_NOT_FOUND'
        : 'UNEXPECTED';
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-3">
        <p role="alert" aria-live="polite" className="text-sm text-red-800">
          {tErrors(code)}
        </p>
        <Link
          href="/vendor/profile/new"
          className="inline-block rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          {t('links.createNew')}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <VendorProfileEditor
        profile={query.data}
        onDeleted={() => router.push('/vendor/profile')}
      />
    </main>
  );
}
