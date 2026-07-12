'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { CaptchaWidget } from './CaptchaWidget';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { useRegisterVendor } from '../hooks/useRegisterVendor';
import {
  registerVendorSchema,
  type RegisterVendorFormValues,
} from '../schemas/registerVendorSchema';

const KNOWN_ERROR_CODES = new Set([
  'EMAIL_TAKEN',
  'CAPTCHA_REQUIRED',
  'CAPTCHA_INVALID',
  'VALIDATION_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'ALREADY_AUTHENTICATED',
]);

const CAPTCHA_ERROR_CODES = new Set(['CAPTCHA_REQUIRED', 'CAPTCHA_INVALID']);

/**
 * RegisterVendorForm (US-002 / FE-002). Espejo del form organizer con `businessName` (focus
 * inicial), reusa `CaptchaWidget`/`PasswordStrengthIndicator` y el mapa de errores neutros
 * (EC-01: mensaje EMAIL_TAKEN idéntico al flujo organizer — SEC-001).
 */
export function RegisterVendorForm(): React.JSX.Element {
  const t = useTranslations('auth.register');
  const mutation = useRegisterVendor();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const successRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<RegisterVendorFormValues>({
    resolver: zodResolver(registerVendorSchema),
    defaultValues: { businessName: '', email: '', password: '', captchaToken: '' },
  });

  const captchaToken = watch('captchaToken');
  const password = watch('password');

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    mutation.mutate(
      {
        businessName: values.businessName,
        email: values.email,
        password: values.password,
        acceptedTerms: values.acceptedTerms,
        captchaToken: values.captchaToken,
      },
      {
        onSuccess: () => {
          successRef.current = true;
        },
        onError: (error) => {
          const code = error instanceof ApiError && KNOWN_ERROR_CODES.has(error.code) ? error.code : 'UNEXPECTED';
          setGlobalError(t(`errors.${code}`));
          if (error instanceof ApiError && CAPTCHA_ERROR_CODES.has(error.code)) {
            setCaptchaReset((n) => n + 1);
            setValue('captchaToken', '');
          }
          if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
            for (const detail of error.details as Array<{ field?: unknown; message?: unknown }>) {
              const field = typeof detail.field === 'string' ? detail.field.replace(/^body\./, '') : '';
              const message = typeof detail.message === 'string' ? detail.message : t('errors.VALIDATION_ERROR');
              if (field === 'businessName' || field === 'email' || field === 'password') {
                setError(field, { type: 'server', message });
              }
            }
          }
        },
      },
    );
  });

  const disabled = mutation.isPending;

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={mutation.isPending}>
      <h1 className="text-2xl font-bold">{t('vendor.title')}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t('vendor.subtitle')}</p>

      {globalError ? (
        <div role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {globalError}
        </div>
      ) : null}
      {successRef.current ? (
        <p role="status" aria-live="polite" className="mt-4 text-sm text-green-700">
          {t('success')}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="regv-business-name" className="block text-sm font-medium">
            {t('vendor.businessName.label')}
          </label>
          <input
            id="regv-business-name"
            type="text"
            autoComplete="organization"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- US-002 UX Notes exige focus inicial en `businessName` (página de un solo formulario)
            autoFocus
            disabled={disabled}
            placeholder={t('vendor.businessName.placeholder')}
            aria-invalid={errors.businessName ? true : undefined}
            aria-describedby={errors.businessName ? 'regv-business-name-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('businessName')}
          />
          {errors.businessName ? (
            <p id="regv-business-name-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {errors.businessName.type === 'server'
                ? errors.businessName.message
                : t(errors.businessName.message ?? 'validation.businessNameLength')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="regv-email" className="block text-sm font-medium">
            {t('fields.email.label')}
          </label>
          <input
            id="regv-email"
            type="email"
            autoComplete="email"
            disabled={disabled}
            placeholder={t('fields.email.placeholder')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'regv-email-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('email')}
          />
          {errors.email ? (
            <p id="regv-email-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {errors.email.type === 'server' ? errors.email.message : t(errors.email.message ?? 'validation.emailInvalid')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="regv-password" className="block text-sm font-medium">
            {t('fields.password.label')}
          </label>
          <input
            id="regv-password"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'regv-password-error regv-password-help' : 'regv-password-help'}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('password')}
          />
          <p id="regv-password-help" className="mt-1 text-xs text-neutral-600">
            {t('fields.password.help')}
          </p>
          <PasswordStrengthIndicator password={password ?? ''} />
          {errors.password ? (
            <p id="regv-password-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {errors.password.type === 'server'
                ? errors.password.message
                : t(errors.password.message ?? 'validation.passwordPolicy')}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-start gap-2">
            <input
              id="regv-terms"
              type="checkbox"
              disabled={disabled}
              aria-invalid={errors.acceptedTerms ? true : undefined}
              aria-describedby={errors.acceptedTerms ? 'regv-terms-error' : undefined}
              className="mt-0.5 h-5 w-5"
              {...register('acceptedTerms')}
            />
            <label htmlFor="regv-terms" className="text-sm">
              {t('terms.label')}
            </label>
          </div>
          {errors.acceptedTerms ? (
            <p id="regv-terms-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(errors.acceptedTerms.message ?? 'validation.termsRequired')}
            </p>
          ) : null}
        </div>

        <div>
          <CaptchaWidget
            resetSignal={captchaReset}
            onToken={(token) => setValue('captchaToken', token ?? '', { shouldValidate: token !== null })}
          />
          {errors.captchaToken ? (
            <p className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(errors.captchaToken.message ?? 'validation.captchaRequired')}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={disabled || captchaToken.length === 0}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? t('vendor.submitting') : t('vendor.submit')}
        </button>
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        <Link href="/register" className="underline">
          {t('vendor.organizerCta')}
        </Link>
        {' · '}
        {t('haveAccount')}{' '}
        <Link href="/login" className="underline">
          {t('loginCta')}
        </Link>
      </p>
    </form>
  );
}
