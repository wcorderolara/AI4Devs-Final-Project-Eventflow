'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { CaptchaWidget } from './CaptchaWidget';
import { useLogin } from '../hooks/useLogin';
import { loginSchema, type LoginFormValues } from '../schemas/loginSchema';

/** Errores del backend que activan/reinician el widget de captcha condicional (EC-02). */
const CAPTCHA_ERROR_CODES = new Set(['CAPTCHA_REQUIRED', 'CAPTCHA_INVALID']);

const KNOWN_ERROR_CODES = new Set([
  'AUTHENTICATION_REQUIRED',
  'CAPTCHA_REQUIRED',
  'CAPTCHA_INVALID',
  'VALIDATION_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'ALREADY_AUTHENTICATED',
]);

/**
 * LoginForm (US-003 / FE-002, FE-003). Email + password con mensaje de error GENÉRICO
 * (anti-enumeración, EC-01); el `CaptchaWidget` solo se renderiza cuando el backend lo exige
 * (`400 CAPTCHA_REQUIRED`/`CAPTCHA_INVALID` — captcha condicional N=3, EC-02). El banner 429
 * muestra los segundos de `Retry-After` (AC-05).
 */
export function LoginForm({ from }: { from?: string | null }): React.JSX.Element {
  const t = useTranslations('auth.login');
  const mutation = useLogin({ from });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [captchaReset, setCaptchaReset] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', captchaToken: '' },
  });

  const captchaToken = watch('captchaToken') ?? '';

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    mutation.mutate(
      {
        email: values.email,
        password: values.password,
        ...(captchaVisible && values.captchaToken ? { captchaToken: values.captchaToken } : {}),
      },
      {
        onError: (error) => {
          if (!(error instanceof ApiError)) {
            setGlobalError(t('errors.UNEXPECTED'));
            return;
          }
          if (CAPTCHA_ERROR_CODES.has(error.code)) {
            // EC-02: el backend exige captcha → renderizar/reiniciar el widget.
            setCaptchaVisible(true);
            setCaptchaReset((n) => n + 1);
            setValue('captchaToken', '');
            setGlobalError(t(`errors.${error.code}`));
            return;
          }
          if (error.code === 'RATE_LIMIT_EXCEEDED') {
            setGlobalError(
              error.retryAfterSeconds !== undefined
                ? t('errors.RATE_LIMIT_EXCEEDED', { seconds: error.retryAfterSeconds })
                : t('errors.RATE_LIMIT_EXCEEDED_NO_TIME'),
            );
            return;
          }
          const code = KNOWN_ERROR_CODES.has(error.code) ? error.code : 'UNEXPECTED';
          setGlobalError(t(`errors.${code}`));
        },
      },
    );
  });

  const disabled = mutation.isPending;

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={mutation.isPending}>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>

      {globalError ? (
        <div role="alert" aria-live="polite" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {globalError}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium">
            {t('email.label')}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            disabled={disabled}
            placeholder={t('email.placeholder')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('email')}
          />
          {errors.email ? (
            <p id="login-email-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(errors.email.message ?? 'validation.emailInvalid')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium">
            {t('password.label')}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            disabled={disabled}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('password')}
          />
          {errors.password ? (
            <p id="login-password-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(errors.password.message ?? 'validation.passwordRequired')}
            </p>
          ) : null}
        </div>

        {captchaVisible ? (
          <div>
            <p className="mb-2 text-sm text-neutral-700" aria-live="polite">
              {t('captchaNotice')}
            </p>
            <CaptchaWidget
              resetSignal={captchaReset}
              onToken={(token) => setValue('captchaToken', token ?? '')}
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={disabled || (captchaVisible && captchaToken.length === 0)}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? t('submitting') : t('submit')}
        </button>
      </div>

      <p className="mt-4 flex flex-wrap gap-x-3 text-sm text-neutral-600">
        <Link href="/forgot-password" className="underline">
          {t('forgotPassword')}
        </Link>
        <Link href="/register" className="underline">
          {t('createAccount')}
        </Link>
      </p>
    </form>
  );
}
