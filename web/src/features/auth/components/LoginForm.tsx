'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { Button, FormField, Input, TextLink } from '@/shared/design-system';
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
      <h1 className="font-heading text-h3 font-semibold text-primary">{t('title')}</h1>
      <p className="mt-1 font-body text-body-sm text-secondary">{t('subtitle')}</p>

      {globalError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mt-4 rounded-card border border-feedback-error bg-feedback-error p-3 font-body text-body-sm text-feedback-error"
        >
          {globalError}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <FormField
          id="login-email"
          label={t('email.label')}
          disabled={disabled}
          error={errors.email ? t(errors.email.message ?? 'validation.emailInvalid') : undefined}
        >
          {(field) => (
            <Input
              {...field}
              type="email"
              autoComplete="email"
              placeholder={t('email.placeholder')}
              {...register('email')}
            />
          )}
        </FormField>

        <FormField
          id="login-password"
          label={t('password.label')}
          disabled={disabled}
          error={
            errors.password
              ? t(errors.password.message ?? 'validation.passwordRequired')
              : undefined
          }
        >
          {(field) => (
            // Se mantiene el `Input type="password"` y NO se adopta aquí `PasswordInput`:
            // el toggle mostrar/ocultar añade una parada de tabulación y cambiaría el orden de
            // foco verificado por `tests/a11y/us131-keyboard-aria.test.tsx`. La adopción del
            // toggle queda diferida a una US con decisión de UX (ver implementation record).
            <Input
              {...field}
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
          )}
        </FormField>

        {captchaVisible ? (
          <div>
            <p className="mb-2 font-body text-body-sm text-secondary" aria-live="polite">
              {t('captchaNotice')}
            </p>
            <CaptchaWidget
              resetSignal={captchaReset}
              onToken={(token) => setValue('captchaToken', token ?? '')}
            />
          </div>
        ) : null}

        <Button
          type="submit"
          fullWidth
          isLoading={mutation.isPending}
          loadingLabel={t('submitting')}
          disabled={captchaVisible && captchaToken.length === 0}
        >
          {t('submit')}
        </Button>
      </div>

      <p className="mt-4 flex flex-wrap gap-x-3">
        <TextLink href="/forgot-password" variant="inline" className="text-body-sm">
          {t('forgotPassword')}
        </TextLink>
        <TextLink href="/register" variant="inline" className="text-body-sm">
          {t('createAccount')}
        </TextLink>
      </p>
    </form>
  );
}
