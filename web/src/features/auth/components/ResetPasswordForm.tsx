'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { authRegisterApi } from '../api/authApi';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '../schemas/passwordResetSchemas';

/** Banner de token expirado (US-004 / FE-004): CTA "Solicitar nuevo enlace" (EC-01). */
export function TokenExpiredBanner(): React.JSX.Element {
  const t = useTranslations('auth.reset.expired');
  return (
    <div role="alert" className="rounded border border-amber-300 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-900">{t('title')}</h2>
      <p className="mt-1 text-sm text-amber-800">{t('body')}</p>
      <Link href="/forgot-password" className="mt-3 inline-block rounded bg-neutral-900 px-3 py-1.5 text-sm text-white">
        {t('cta')}
      </Link>
    </div>
  );
}

/**
 * ResetPasswordForm (US-004 / FE-002, FE-003). Recibe el token del enlace (`?token=`), valida la
 * política de contraseña (Doc 19 §11.2), y en 204 redirige a `/login?reset=success` (AC-02).
 * EC-01: 410 GONE_TOKEN_EXPIRED → `TokenExpiredBanner`; EC-02/EC-03: TOKEN_USED/TOKEN_INVALID →
 * mensaje con CTA a /forgot-password.
 */
export function ResetPasswordForm({ token }: { token?: string }): React.JSX.Element {
  const t = useTranslations('auth.reset');
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const mutation = useMutation<void, Error, ResetPasswordFormValues>({
    mutationFn: (values) => authRegisterApi.resetPassword({ token: token ?? '', newPassword: values.newPassword }),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '' },
  });

  const password = watch('newPassword');

  if (!token) {
    // Enlace sin token (alterado/incompleto) — equivalente UX a TOKEN_INVALID (EC-03).
    return (
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {t('missingToken')}
        </p>
        <Link href="/forgot-password" className="mt-4 inline-block underline">
          {t('expired.cta')}
        </Link>
      </div>
    );
  }

  if (expired) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="mt-4">
          <TokenExpiredBanner />
        </div>
      </div>
    );
  }

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    mutation.mutate(values, {
      onSuccess: () => {
        router.push('/login?reset=success');
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'GONE_TOKEN_EXPIRED') {
          setExpired(true);
          return;
        }
        if (
          error instanceof ApiError &&
          ['TOKEN_INVALID', 'TOKEN_USED', 'VALIDATION_ERROR', 'RATE_LIMIT_EXCEEDED'].includes(error.code)
        ) {
          setGlobalError(t(`errors.${error.code}`));
          return;
        }
        setGlobalError(t('errors.UNEXPECTED'));
      },
    });
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={mutation.isPending}>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>

      {globalError ? (
        <div role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {globalError}{' '}
          <Link href="/forgot-password" className="underline">
            {t('expired.cta')}
          </Link>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium">
            {t('password.label')}
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            disabled={mutation.isPending}
            aria-invalid={errors.newPassword ? true : undefined}
            aria-describedby={errors.newPassword ? 'reset-password-error reset-password-help' : 'reset-password-help'}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('newPassword')}
          />
          <p id="reset-password-help" className="mt-1 text-xs text-neutral-600">
            {t('password.help')}
          </p>
          <PasswordStrengthIndicator password={password ?? ''} />
          {errors.newPassword ? (
            <p id="reset-password-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t('validation.passwordPolicy')}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}
