'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { Alert, Button, FormField, Input, PasswordInput, TextLink } from '@/shared/design-system';
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
 * LoginForm (US-003 / FE-002..FE-005). Email + password con mensaje de error GENÉRICO
 * (anti-enumeración, EC-01); el `CaptchaWidget` solo se renderiza cuando el backend lo exige
 * (`400 CAPTCHA_REQUIRED`/`CAPTCHA_INVALID` — captcha condicional N=3, EC-02). El banner 429
 * muestra los segundos de `Retry-After` (AC-05).
 *
 * Alineación visual con la screen Stitch *EventFlow — Iniciar Sesión (Foco)*:
 * - El error global pasa a `Alert` del design system (icono + texto: el estado nunca se comunica
 *   sólo por color) y recibe el foco tras un envío fallido.
 * - La contraseña usa `PasswordInput` (toggle mostrar/ocultar accesible del design system). El
 *   toggle añade una parada de tabulación entre el campo y el submit — el orden verificado en
 *   `tests/a11y/us131-keyboard-aria.test.tsx` se actualizó en consecuencia.
 * - *¿Olvidaste tu contraseña?* se coloca en la fila del label de contraseña (`labelAction` de
 *   `FormField`), como en la referencia.
 *
 * La sesión la establece el backend vía cookie `HttpOnly` (`Set-Cookie` sobre el httpClient con
 * `credentials: 'include'`): este componente no lee, no persiste y no inspecciona token alguno
 * (SEC-06).
 */
export function LoginForm({ from }: { from?: string | null }): React.JSX.Element {
  const t = useTranslations('auth.login');
  const mutation = useLogin({ from });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [captchaReset, setCaptchaReset] = useState(0);
  const errorRef = useRef<HTMLDivElement>(null);

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

  // Tras un fallo de autenticación el foco va al resumen del error: sin esto, quien navega con
  // teclado o lector de pantalla se queda en el submit sin saber qué pasó (WCAG 3.3.1).
  useEffect(() => {
    if (globalError) errorRef.current?.focus();
  }, [globalError]);

  const onSubmit = handleSubmit((values) => {
    // Guarda de doble envío además del `disabled` del botón (AC: no reintentar mientras pende).
    if (mutation.isPending) return;
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
            // Fallo de red o respuesta no interpretable: mensaje recuperable, nunca el crudo.
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
      <h1 className="font-heading text-h2 font-semibold text-primary">{t('title')}</h1>
      <p className="mt-2 font-body text-body-md text-secondary">{t('subtitle')}</p>

      {globalError ? (
        <Alert ref={errorRef} variant="error" live tabIndex={-1} className="mt-6">
          {globalError}
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-col gap-5">
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
              inputSize="lg"
              // `/login` es una página de propósito único: no hay contenido que el foco
              // automático se salte, y el estado inicial de la referencia Stitch («Foco») es
              // precisamente este campo enfocado. El anillo lo pinta `:focus-visible`, no una
              // clase permanente.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
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
          labelAction={
            <TextLink href="/forgot-password" className="text-body-sm">
              {t('forgotPassword')}
            </TextLink>
          }
          error={
            errors.password
              ? t(errors.password.message ?? 'validation.passwordRequired')
              : undefined
          }
        >
          {(field) => (
            <PasswordInput
              {...field}
              inputSize="lg"
              autoComplete="current-password"
              placeholder={t('password.placeholder')}
              showLabel={t('password.show')}
              hideLabel={t('password.hide')}
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
          size="lg"
          fullWidth
          trailingIcon={<LogIn />}
          isLoading={mutation.isPending}
          loadingLabel={t('submitting')}
          disabled={captchaVisible && captchaToken.length === 0}
          className="mt-1"
        >
          {t('submit')}
        </Button>
      </div>

      <p className="mt-8 border-t border-subtle pt-6 text-center font-body text-body-sm text-secondary">
        {t.rich('noAccount', {
          link: (chunks) => (
            <TextLink href="/register" variant="inline" className="text-body-sm font-semibold">
              {chunks}
            </TextLink>
          ),
        })}
      </p>
    </form>
  );
}
