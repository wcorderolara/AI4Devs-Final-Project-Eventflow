'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import type { UserProfile } from '../api/profileApi.types';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { profileSchema, type ProfileFormValues } from '../schemas/profileSchema';

const KNOWN_ERROR_CODES = new Set([
  'VALIDATION_ERROR',
  'UNSUPPORTED_LANGUAGE',
  'AUTHENTICATION_REQUIRED',
]);

/**
 * ProfileForm (US-006 / AC-02). Edita `name` y `phone`. `email` y `role` se muestran como
 * solo-lectura (email inmutable en MVP). En éxito muestra un aviso accesible `role="status"`.
 */
export function ProfileForm({ profile }: { profile: UserProfile }): React.JSX.Element {
  const t = useTranslations('profile');
  const mutation = useUpdateProfile();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name,
      phone: profile.phone ?? '',
      preferredLanguage: profile.preferredLanguage,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    setSuccess(false);
    mutation.mutate(
      {
        name: values.name.trim(),
        phone: values.phone && values.phone.trim().length > 0 ? values.phone.trim() : null,
      },
      {
        onSuccess: () => setSuccess(true),
        onError: (error) => {
          const code = error instanceof ApiError && KNOWN_ERROR_CODES.has(error.code) ? error.code : 'UNEXPECTED';
          setGlobalError(t(`errors.${code}`));
        },
      },
    );
  });

  const disabled = mutation.isPending;

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={mutation.isPending}>
      <h2 className="text-lg font-semibold">{t('basics.title')}</h2>

      {globalError ? (
        <div role="alert" aria-live="polite" className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {globalError}
        </div>
      ) : null}
      {success ? (
        <p role="status" aria-live="polite" className="mt-3 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {t('basics.saved')}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium">
            {t('fields.name')}
          </label>
          <input
            id="profile-name"
            type="text"
            autoComplete="name"
            disabled={disabled}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'profile-name-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('name')}
          />
          {errors.name ? (
            <p id="profile-name-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(errors.name.message ?? 'validation.nameMin')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="profile-phone" className="block text-sm font-medium">
            {t('fields.phone')}
          </label>
          <input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            disabled={disabled}
            placeholder={t('fields.phonePlaceholder')}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('phone')}
          />
          {errors.phone ? (
            <p id="profile-phone-error" className="mt-1 text-sm text-red-700" aria-live="polite">
              {t(errors.phone.message ?? 'validation.phoneMax')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="profile-email" className="block text-sm font-medium">
            {t('fields.email')}
          </label>
          <input
            id="profile-email"
            type="email"
            value={profile.email}
            readOnly
            aria-describedby="profile-email-hint"
            className="mt-1 w-full rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-600"
          />
          <p id="profile-email-hint" className="mt-1 text-xs text-neutral-500">
            {t('fields.emailReadOnly')}
          </p>
        </div>

        <div>
          <label htmlFor="profile-role" className="block text-sm font-medium">
            {t('fields.role')}
          </label>
          <input
            id="profile-role"
            type="text"
            value={t(`roles.${profile.role}`)}
            readOnly
            className="mt-1 w-full rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-600"
          />
        </div>

        <button
          type="submit"
          disabled={disabled || !isDirty}
          className="self-start rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? t('actions.saving') : t('actions.save')}
        </button>
      </div>
    </form>
  );
}
