'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale as useNextIntlLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { profileApi } from '@/features/profile/api/profileApi';
import { PROFILE_QUERY_KEY } from '@/features/profile/hooks/useMyProfile';
import { useSession } from '@/shared/auth-session/useSession';
import { cookieName, defaultLocale, isSupportedLocale, type Locale } from './config';

const ONE_YEAR_SECONDS = 31_536_000;

function writeLocaleCookie(next: Locale): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  document.cookie = `${cookieName}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

export type LocaleSwitchError = 'SAVE_FAILED';

export interface UseLocaleSwitcherResult {
  /** Locale actualmente activo según `next-intl`. */
  currentLocale: Locale;
  /** Cambia el locale de forma optimista (cookie + refresh; PATCH async si hay sesión). */
  switchLocale: (next: Locale) => void;
  /** true mientras la mutación PATCH está en vuelo (solo autenticados). */
  isPending: boolean;
  /** Código i18n del último error que provocó rollback (`SAVE_FAILED`) o `null`. */
  error: LocaleSwitchError | null;
  /** Descarta el estado de error (por ejemplo, tras mostrar el mensaje). */
  clearError: () => void;
}

/**
 * `useLocaleSwitcher` (US-081 / AC-01..AC-03). Aplica el cambio de idioma optimistamente:
 * 1) escribe la cookie técnica `eventflow_locale` y llama `router.refresh()` — la UI cambia
 *    de inmediato sin recarga completa (D3);
 * 2) si hay sesión autenticada, dispara `PATCH /users/me/preferred-language` async (D1/D5);
 * 3) si el PATCH falla (5xx / red), revierte la cookie al locale anterior + refresh y expone
 *    `error='SAVE_FAILED'` para que el componente renderice el aviso (D5).
 *
 * Para visitantes anónimos NO dispara PATCH (D2) — la cookie es la única persistencia.
 */
export function useLocaleSwitcher(): UseLocaleSwitcherResult {
  const rawLocale = useNextIntlLocale();
  const currentLocale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useSession();
  const [error, setError] = useState<LocaleSwitchError | null>(null);

  const mutation = useMutation<unknown, Error, { next: Locale; previous: Locale }>({
    mutationFn: ({ next }) => profileApi.updatePreferredLanguage(next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (_err, variables) => {
      writeLocaleCookie(variables.previous);
      setError('SAVE_FAILED');
      router.refresh();
    },
  });

  const switchLocale = (next: Locale): void => {
    if (next === currentLocale) return;
    setError(null);
    const previous = currentLocale;
    writeLocaleCookie(next);
    router.refresh();
    if (isAuthenticated) {
      mutation.mutate({ next, previous });
    }
  };

  const clearError = (): void => setError(null);

  return {
    currentLocale,
    switchLocale,
    isPending: mutation.isPending,
    error,
    clearError,
  };
}
