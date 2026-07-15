'use client';

// VendorProfileWizard (US-040 / FE-002, AC-01/AC-02/AC-05). Orquestador multi-step con
// navegación y `aria-live` para anunciar el cambio de paso. Al éxito, muestra el banner
// "En revisión" (AC-02) sin depender de una redirección explícita — la página lo puede envolver
// para redirigir a `/vendor/profile` cuando quiera (no requerido por AC).
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { BasicInfoStep } from './BasicInfoStep';
import { LanguagesStep } from './LanguagesStep';
import { LocationCategoriesStep } from './LocationCategoriesStep';
import { ReviewStep } from './ReviewStep';
import { useCreateVendorProfile } from '../hooks/useVendorProfileMutations';
import {
  emptyWizardState,
  type BasicInfoValues,
  type LanguagesValues,
  type LocationCategoriesValues,
  type VendorProfileWizardState,
} from '../schemas/vendorProfileWizardSchema';
import type { VendorProfileDTO } from '../api/vendorProfileApi.types';

const KNOWN_ERROR_CODES = new Set([
  'PROFILE_EXISTS',
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
]);

type StepId = 'basic' | 'locationCategories' | 'languages' | 'review';
const STEP_ORDER: StepId[] = ['basic', 'locationCategories', 'languages', 'review'];

interface VendorProfileWizardProps {
  onCancel?: () => void;
  onSuccess?: (created: VendorProfileDTO) => void;
}

export function VendorProfileWizard({
  onCancel,
  onSuccess,
}: VendorProfileWizardProps = {}): React.JSX.Element {
  const t = useTranslations('vendor.profile');
  const [state, setState] = useState<VendorProfileWizardState>(emptyWizardState);
  const [stepIndex, setStepIndex] = useState(0);
  const [created, setCreated] = useState<VendorProfileDTO | null>(null);
  const mutation = useCreateVendorProfile();

  const currentStep = STEP_ORDER[stepIndex] ?? 'basic';

  const stepTitle = useMemo(() => t(`steps.${currentStep}.title`), [currentStep, t]);

  const handleBasicNext = useCallback((values: BasicInfoValues) => {
    setState((prev) => ({ ...prev, ...values }));
    setStepIndex(1);
  }, []);

  const handleLocationNext = useCallback((values: LocationCategoriesValues) => {
    setState((prev) => ({ ...prev, ...values }));
    setStepIndex(2);
  }, []);

  const handleLanguagesNext = useCallback((values: LanguagesValues) => {
    setState((prev) => ({ ...prev, ...values }));
    setStepIndex(3);
  }, []);

  const submit = useCallback((): void => {
    mutation.mutate(
      {
        business_name: state.businessName,
        bio: state.bio,
        location_id: state.locationId,
        languages_supported: state.languages,
        categories: state.categoryIds,
      },
      {
        onSuccess: (dto) => {
          setCreated(dto);
          onSuccess?.(dto);
        },
      },
    );
  }, [mutation, state, onSuccess]);

  if (created) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded border border-emerald-300 bg-emerald-50 p-6 text-sm text-emerald-900"
      >
        <h2 className="text-lg font-semibold">{t('wizard.success.title')}</h2>
        <p className="mt-1">{t('wizard.success.body')}</p>
        <p className="mt-3 rounded border border-neutral-300 bg-white p-3 text-neutral-800">
          <strong>{t('banner.pendingTitle')}</strong> — {t('banner.pendingBody')}
        </p>
        <Link
          href="/vendor/profile"
          className="mt-3 inline-block rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          {t('banner.editCta')}
        </Link>
      </div>
    );
  }

  const errorMessage = mutation.error
    ? mutation.error instanceof ApiError && KNOWN_ERROR_CODES.has(mutation.error.code)
      ? t(`errors.${mutation.error.code}`)
      : t('errors.UNEXPECTED')
    : null;

  return (
    <section aria-labelledby="wizard-title" className="space-y-4">
      <header>
        <h1 id="wizard-title" className="text-xl font-semibold">
          {t('wizard.title')}
        </h1>
        <p className="text-sm text-neutral-600">{t('wizard.subtitle')}</p>
      </header>

      <div role="status" aria-live="polite" className="text-sm text-neutral-500">
        {t('wizard.progress', {
          current: stepIndex + 1,
          total: STEP_ORDER.length,
          stepTitle,
        })}
      </div>

      {currentStep === 'basic' && (
        <BasicInfoStep
          initialValues={{ businessName: state.businessName, bio: state.bio }}
          onNext={handleBasicNext}
          onCancel={onCancel ?? (() => undefined)}
        />
      )}
      {currentStep === 'locationCategories' && (
        <LocationCategoriesStep
          initialValues={{ locationId: state.locationId, categoryIds: state.categoryIds }}
          onNext={handleLocationNext}
          onBack={() => setStepIndex(0)}
        />
      )}
      {currentStep === 'languages' && (
        <LanguagesStep
          initialValues={{ languages: state.languages }}
          onNext={handleLanguagesNext}
          onBack={() => setStepIndex(1)}
        />
      )}
      {currentStep === 'review' && (
        <ReviewStep
          state={state}
          onSubmit={submit}
          onBack={() => setStepIndex(2)}
          submitting={mutation.isPending}
          errorMessage={errorMessage}
        />
      )}
    </section>
  );
}
