'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { CaptchaWidget } from './CaptchaWidget';
import { authRegisterApi } from '../api/authApi';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '../schemas/passwordResetSchemas';

const CAPTCHA_ERROR_CODES = new Set(['CAPTCHA_REQUIRED', 'CAPTCHA_INVALID']);

/**
 * ForgotPasswordForm (US-004 / FE-001, FE-003). Email + captcha obligatorio (SEC-01). La
 * respuesta es SIEMPRE el mensaje neutro de 202 (AC-01/AC-03) — el resultado no revela si el
 * email existe. 429 y errores de captcha se muestran sin romper la neutralidad.
 */
export function ForgotPasswordForm(): React.JSX.Element {
  const t = useTranslations('auth');
  const [sent, setSent] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const mutation = useMutation<void, Error, ForgotPasswordFormValues>({
    mutationFn: (input) => authRegisterApi.forgotPassword(input),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '', captchaToken: '' },
  });

  const captchaToken = watch('captchaToken');

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    mutation.mutate(values, {
      onSuccess: () => setSent(true),
      onError: (error) => {
        if (error instanceof ApiError && CAPTCHA_ERROR_CODES.has(error.code)) {
          setCaptchaReset((n) => n + 1);
          setValue('captchaToken', '');
          setGlobalError(t(`register.errors.${error.code}`));
          return;
        }
        if (error instanceof ApiError && error.code === 'RATE_LIMIT_EXCEEDED') {
          setGlobalError(t('reset.errors.RATE_LIMIT_EXCEEDED'));
          return;
        }
        setGlobalError(t('reset.errors.UNEXPECTED'));
      },
    });
  });

  if (sent) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{t('forgot.title')}</h1>
        <p role="status" aria-live="polite" className="mt-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {t('forgot.success')}
        </p>
        <p className="mt-4 text-sm">
          <Link href="/login" className="underline">
            {t('forgot.backToLogin')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={mutation.isPending}>
      <h1 className="text-2xl font-bold">{t('forgot.title')}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t('forgot.subtitle')}</p>

      {globalError ? (
        <div role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {globalError}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium">
            {t('forgot.email.label')}
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            disabled={mutation.isPending}
            placeholder={t('forgot.email.placeholder')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'forgot-email-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('email')}
          />
          {errors.email ? (
            <p id="forgot-email-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(`login.${errors.email.message ?? 'validation.emailInvalid'}`)}
            </p>
          ) : null}
        </div>

        <CaptchaWidget
          resetSignal={captchaReset}
          onToken={(token) => setValue('captchaToken', token ?? '', { shouldValidate: token !== null })}
        />

        <button
          type="submit"
          disabled={mutation.isPending || captchaToken.length === 0}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? t('forgot.submitting') : t('forgot.submit')}
        </button>
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        <Link href="/login" className="underline">
          {t('forgot.backToLogin')}
        </Link>
      </p>
    </form>
  );
}
