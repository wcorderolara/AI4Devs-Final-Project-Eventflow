'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { CaptchaWidget } from './CaptchaWidget';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { useRegisterOrganizer } from '../hooks/useRegisterOrganizer';
import {
  registerOrganizerSchema,
  type RegisterOrganizerFormValues,
} from '../schemas/registerOrganizerSchema';

/** Códigos con mensaje dedicado en `auth.register.errors` (mapa cerrado; resto → UNEXPECTED). */
const KNOWN_ERROR_CODES = new Set([
  'EMAIL_TAKEN',
  'CAPTCHA_REQUIRED',
  'CAPTCHA_INVALID',
  'VALIDATION_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'ALREADY_AUTHENTICATED',
]);

/** Errores del backend que exigen reiniciar el widget de captcha (EC-01). */
const CAPTCHA_ERROR_CODES = new Set(['CAPTCHA_REQUIRED', 'CAPTCHA_INVALID']);

/**
 * RegisterOrganizerForm (US-001 / FE-002). RHF + zodResolver con el schema espejo del backend;
 * errores accesibles por campo (`aria-describedby`, `aria-invalid`) y banner global
 * (`role="alert"`); focus inicial en `name`; submit bloqueado durante el request y hasta que el
 * captcha esté resuelto (AC-01, EC-01..03).
 */
export function RegisterOrganizerForm(): React.JSX.Element {
  const t = useTranslations('auth.register');
  const mutation = useRegisterOrganizer();
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
  } = useForm<RegisterOrganizerFormValues>({
    resolver: zodResolver(registerOrganizerSchema),
    defaultValues: { name: '', email: '', password: '', captchaToken: '' },
  });

  const captchaToken = watch('captchaToken');
  const password = watch('password');

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    mutation.mutate(
      {
        name: values.name,
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
            // EC-01: reiniciar el widget; el token consumido/expirado ya no sirve.
            setCaptchaReset((n) => n + 1);
            setValue('captchaToken', '');
          }
          if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
            for (const detail of error.details as Array<{ field?: unknown; message?: unknown }>) {
              const field = typeof detail.field === 'string' ? detail.field.replace(/^body\./, '') : '';
              const message = typeof detail.message === 'string' ? detail.message : t('errors.VALIDATION_ERROR');
              if (field === 'name' || field === 'email' || field === 'password') {
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
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>

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
          <label htmlFor="reg-name" className="block text-sm font-medium">
            {t('fields.name.label')}
          </label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- US-001 UX/Accessibility Notes exige focus inicial en `name` (página de un solo formulario; no roba foco de otro contenido)
            autoFocus
            disabled={disabled}
            placeholder={t('fields.name.placeholder')}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'reg-name-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('name')}
          />
          {errors.name ? (
            <p id="reg-name-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {errors.name.type === 'server' ? errors.name.message : t(errors.name.message ?? 'validation.nameLength')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium">
            {t('fields.email.label')}
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            disabled={disabled}
            placeholder={t('fields.email.placeholder')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'reg-email-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('email')}
          />
          {errors.email ? (
            <p id="reg-email-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {errors.email.type === 'server' ? errors.email.message : t(errors.email.message ?? 'validation.emailInvalid')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium">
            {t('fields.password.label')}
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'reg-password-error reg-password-help' : 'reg-password-help'}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('password')}
          />
          <p id="reg-password-help" className="mt-1 text-xs text-neutral-600">
            {t('fields.password.help')}
          </p>
          <PasswordStrengthIndicator password={password ?? ''} />
          {errors.password ? (
            <p id="reg-password-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {errors.password.type === 'server'
                ? errors.password.message
                : t(errors.password.message ?? 'validation.passwordPolicy')}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex items-start gap-2">
            <input
              id="reg-terms"
              type="checkbox"
              disabled={disabled}
              aria-invalid={errors.acceptedTerms ? true : undefined}
              aria-describedby={errors.acceptedTerms ? 'reg-terms-error' : undefined}
              className="mt-0.5 h-5 w-5"
              {...register('acceptedTerms')}
            />
            <label htmlFor="reg-terms" className="text-sm">
              {t('terms.label')}
            </label>
          </div>
          {errors.acceptedTerms ? (
            <p id="reg-terms-error" className="mt-1 text-sm text-red-700" aria-live="polite">
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
          {mutation.isPending ? t('submitting') : t('submit')}
        </button>
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        {t('haveAccount')}{' '}
        <Link href="/login" className="underline">
          {t('loginCta')}
        </Link>
      </p>
    </form>
  );
}
