'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { Button, FormField, PasswordInput } from '@/shared/design-system';
import { useChangePassword } from '../hooks/useChangePassword';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../schemas/changePasswordSchema';

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
      <h2 className="font-heading text-h3 font-semibold text-primary">{t('security.title')}</h2>
      <p className="mt-1 font-body text-body-sm text-secondary">{t('security.description')}</p>

      {globalError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mt-3 rounded-card border border-feedback-error bg-feedback-error p-3 font-body text-body-sm text-feedback-error"
        >
          {globalError}
        </div>
      ) : null}
      {success ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 rounded-card border border-feedback-success bg-feedback-success p-3 font-body text-body-sm text-feedback-success"
        >
          {t('security.changed')}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <FormField
          id="current-password"
          label={t('security.currentPassword')}
          disabled={disabled}
          error={
            errors.currentPassword
              ? t(errors.currentPassword.message ?? 'validation.currentPasswordRequired')
              : undefined
          }
        >
          {(field) => (
            <PasswordInput
              {...field}
              autoComplete="current-password"
              showLabel={t('security.showPassword')}
              hideLabel={t('security.hidePassword')}
              {...register('currentPassword')}
            />
          )}
        </FormField>

        <FormField
          id="new-password"
          label={t('security.newPassword')}
          helperText={t('security.passwordHint')}
          disabled={disabled}
          error={
            errors.newPassword
              ? t(errors.newPassword.message ?? 'validation.passwordPolicy')
              : undefined
          }
        >
          {(field) => (
            <PasswordInput
              {...field}
              autoComplete="new-password"
              showLabel={t('security.showPassword')}
              hideLabel={t('security.hidePassword')}
              {...register('newPassword')}
            />
          )}
        </FormField>

        <FormField
          id="confirm-password"
          label={t('security.confirmPassword')}
          disabled={disabled}
          error={
            errors.confirmNewPassword
              ? t(errors.confirmNewPassword.message ?? 'validation.passwordsMismatch')
              : undefined
          }
        >
          {(field) => (
            <PasswordInput
              {...field}
              autoComplete="new-password"
              showLabel={t('security.showPassword')}
              hideLabel={t('security.hidePassword')}
              {...register('confirmNewPassword')}
            />
          )}
        </FormField>

        <Button
          type="submit"
          className="self-start"
          isLoading={mutation.isPending}
          loadingLabel={t('actions.saving')}
        >
          {t('security.submit')}
        </Button>
      </div>
    </form>
  );
}
