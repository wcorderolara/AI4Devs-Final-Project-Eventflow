'use client';

import { useLocale as useNextIntlLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cookieName, locales, type Locale } from './config';

const ONE_YEAR_SECONDS = 31_536_000;

export interface UseLocaleResult {
  locale: Locale;
  supportedLocales: readonly Locale[];
  setLocale: (next: Locale) => void;
}

/**
 * Hook cliente de locale. `setLocale` persiste la cookie técnica `eventflow_locale`
 * (SameSite=Lax, Secure solo en prod, Max-Age 1 año, path=/, sin HttpOnly — SEC-02) y dispara
 * `router.refresh()` para re-renderizar el segmento con el nuevo locale (server-side).
 */
export function useLocale(): UseLocaleResult {
  const locale = useNextIntlLocale() as Locale;
  const router = useRouter();

  const setLocale = (next: Locale): void => {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    document.cookie = `${cookieName}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
    router.refresh();
  };

  return { locale, supportedLocales: locales, setLocale };
}
