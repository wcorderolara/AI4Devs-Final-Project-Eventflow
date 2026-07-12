'use client';

import { useTranslations } from 'next-intl';
import { ProfileForm } from '../components/ProfileForm';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { PreferredLanguageSelector } from '../components/PreferredLanguageSelector';
import { useMyProfile } from '../hooks/useMyProfile';

/**
 * Composición de `/profile` (US-006 / US-007). Client Component: consume `useMyProfile` y compone
 * tres secciones — Datos básicos, Idioma y Seguridad. Estados: loading (skeleton), error (banner
 * con reintento) y contenido. El gating de sesión lo aplica el layout `(app)`.
 */
export function ProfilePage(): React.JSX.Element {
  const t = useTranslations('profile');
  const { data: profile, isLoading, isError, refetch } = useMyProfile();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-neutral-600">{t('subtitle')}</p>

      {isLoading ? (
        <div className="mt-6 space-y-4" aria-hidden>
          <div className="h-8 w-1/3 animate-pulse rounded bg-neutral-200" />
          <div className="h-24 animate-pulse rounded bg-neutral-100" />
          <div className="h-24 animate-pulse rounded bg-neutral-100" />
        </div>
      ) : null}

      {isError ? (
        <div role="alert" className="mt-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{t('errors.LOAD_FAILED')}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 rounded bg-red-700 px-3 py-1.5 text-white"
          >
            {t('actions.retry')}
          </button>
        </div>
      ) : null}

      {profile ? (
        <div className="mt-6 flex flex-col gap-10">
          <section aria-labelledby="section-basics">
            <span id="section-basics" className="sr-only">
              {t('basics.title')}
            </span>
            <ProfileForm profile={profile} />
          </section>

          <section aria-labelledby="section-language" className="border-t border-neutral-200 pt-8">
            <span id="section-language" className="sr-only">
              {t('language.title')}
            </span>
            <PreferredLanguageSelector current={profile.preferredLanguage} />
          </section>

          <section aria-labelledby="section-security" className="border-t border-neutral-200 pt-8">
            <span id="section-security" className="sr-only">
              {t('security.title')}
            </span>
            <ChangePasswordForm />
          </section>
        </div>
      ) : null}
    </div>
  );
}
