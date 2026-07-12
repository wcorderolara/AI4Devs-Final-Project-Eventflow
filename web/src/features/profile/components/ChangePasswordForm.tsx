'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { useChangePassword } from '../hooks/useChangePassword';
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas/changePasswordSchema';

/**
 * ChangePasswordForm (US-006 / AC-04). Verifica `currentPassword`, valida la política de
 * `newPassword` y su confirmación en cliente. Un `401` en este endpoint autenticado significa
 * contraseña actual incorrecta (EC-02); `429` muestra el aviso de rate limit (Retry-After).
 */
export function ChangePasswordForm(): React.JSX.Element {
  const t = useTranslations('profile');
  const mutation = useChangePassword();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    setSuccess(false);
    mutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
          reset();
        },
        onError: (error) => {
          if (!(error instanceof ApiError)) {
            setGlobalError(t('errors.UNEXPECTED'));
            return;
          }
          if (error.status === 401) {
            setGlobalError(t('errors.INVALID_CURRENT_PASSWORD'));
            return;
          }
          if (error.code === 'RATE_LIMIT_EXCEEDED' || error.status === 429) {
            setGlobalError(
              error.retryAfterSeconds !== undefined
                ? t('errors.RATE_LIMIT_EXCEEDED', { seconds: error.retryAfterSeconds })
                : t('errors.RATE_LIMIT_EXCEEDED_NO_TIME'),
            );
            return;
          }
          if (error.code === 'PASSWORD_POLICY_VIOLATION' || error.code === 'VALIDATION_ERROR') {
            setGlobalError(t('errors.PASSWORD_POLICY_VIOLATION'));
            return;
          }
          setGlobalError(t('errors.UNEXPECTED'));
        },
      },
    );
  });

  const disabled = mutation.isPending;

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={mutation.isPending}>
      <h2 className="text-lg font-semibold">{t('security.title')}</h2>
      <p className="mt-1 text-sm text-neutral-600">{t('security.description')}</p>

      {globalError ? (
        <div role="alert" aria-live="polite" className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {globalError}
        </div>
      ) : null}
      {success ? (
        <p role="status" aria-live="polite" className="mt-3 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {t('security.changed')}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="current-password" className="block text-sm font-medium">
            {t('security.currentPassword')}
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            disabled={disabled}
            aria-invalid={errors.currentPassword ? true : undefined}
            aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('currentPassword')}
          />
          {errors.currentPassword ? (
            <p id="current-password-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(errors.currentPassword.message ?? 'validation.currentPasswordRequired')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium">
            {t('security.newPassword')}
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
            aria-invalid={errors.newPassword ? true : undefined}
            aria-describedby="new-password-hint new-password-error"
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('newPassword')}
          />
          <p id="new-password-hint" className="mt-1 text-xs text-neutral-500">
            {t('security.passwordHint')}
          </p>
          {errors.newPassword ? (
            <p id="new-password-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(errors.newPassword.message ?? 'validation.passwordPolicy')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium">
            {t('security.confirmPassword')}
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
            aria-invalid={errors.confirmNewPassword ? true : undefined}
            aria-describedby={errors.confirmNewPassword ? 'confirm-password-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('confirmNewPassword')}
          />
          {errors.confirmNewPassword ? (
            <p id="confirm-password-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(errors.confirmNewPassword.message ?? 'validation.passwordsMismatch')}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="self-start rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? t('actions.saving') : t('security.submit')}
        </button>
      </div>
    </form>
  );
}
