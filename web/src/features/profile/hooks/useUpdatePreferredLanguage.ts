'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/shared/i18n';
import { profileApi } from '../api/profileApi';
import type { PreferredLanguage, UserProfile } from '../api/profileApi.types';
import { PROFILE_QUERY_KEY } from './useMyProfile';

/**
 * `useUpdatePreferredLanguage` (US-007 / AC-01/AC-02/AC-03). Persiste el idioma en el backend
 * (`PATCH /users/me/preferred-language`) y, en éxito, aplica el cambio de inmediato en la UI:
 * `setLocale` escribe la cookie técnica `eventflow_locale` y dispara `router.refresh()` para
 * re-hidratar `next-intl` sin recargar la página. Invalida perfil + sesión.
 */
export function useUpdatePreferredLanguage(): ReturnType<
  typeof useMutation<UserProfile, Error, PreferredLanguage>
> {
  const queryClient = useQueryClient();
  const { setLocale } = useLocale();
  return useMutation<UserProfile, Error, PreferredLanguage>({
    mutationFn: (preferredLanguage) => profileApi.updatePreferredLanguage(preferredLanguage),
    onSuccess: async (profile) => {
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      setLocale(profile.preferredLanguage);
    },
  });
}
