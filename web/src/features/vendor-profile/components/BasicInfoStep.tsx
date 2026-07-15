'use client';

// BasicInfoStep (US-040 / FE-003, AC-01/AC-05). RHF + Zod espejo del backend.
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { basicInfoSchema, type BasicInfoValues } from '../schemas/vendorProfileWizardSchema';

interface BasicInfoStepProps {
  initialValues: BasicInfoValues;
  onNext: (values: BasicInfoValues) => void;
  onCancel: () => void;
}

export function BasicInfoStep({
  initialValues,
  onNext,
  onCancel,
}: BasicInfoStepProps): React.JSX.Element {
  const t = useTranslations('vendor.profile');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicInfoValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium">
          {t('steps.basic.businessNameLabel')}
        </label>
        <input
          id="businessName"
          type="text"
          aria-required="true"
          aria-invalid={errors.businessName ? 'true' : 'false'}
          aria-describedby={errors.businessName ? 'businessName-error' : undefined}
          placeholder={t('steps.basic.businessNamePlaceholder')}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          {...register('businessName')}
        />
        {errors.businessName && (
          <p id="businessName-error" role="alert" aria-live="polite" className="mt-1 text-sm text-red-700">
            {t(`validation.${errors.businessName.message ?? 'businessNameLength'}`)}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium">
          {t('steps.basic.bioLabel')}
        </label>
        <textarea
          id="bio"
          rows={5}
          aria-required="true"
          aria-invalid={errors.bio ? 'true' : 'false'}
          aria-describedby={errors.bio ? 'bio-error bio-help' : 'bio-help'}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          {...register('bio')}
        />
        <p id="bio-help" className="mt-1 text-xs text-neutral-500">
          {t('steps.basic.bioHelp')}
        </p>
        {errors.bio && (
          <p id="bio-error" role="alert" aria-live="polite" className="mt-1 text-sm text-red-700">
            {t(`validation.${errors.bio.message ?? 'bioLength'}`)}
          </p>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-neutral-300 px-4 py-2 text-sm"
        >
          {t('wizard.cancel')}
        </button>
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          {t('wizard.next')}
        </button>
      </div>
    </form>
  );
}
