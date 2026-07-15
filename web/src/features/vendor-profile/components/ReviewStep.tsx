'use client';

// ReviewStep (US-040 / FE-006, AC-01/AC-06). Confirmación + submit. Delegan a los catálogos
// del wizard para renderizar nombres humanos de location y categorías.
import { useTranslations } from 'next-intl';
import { useLocations } from '@/features/events/hooks/useEventsQueries';
import { useServiceCategories } from '../hooks/useVendorProfileQueries';
import type { VendorProfileWizardState } from '../schemas/vendorProfileWizardSchema';

interface ReviewStepProps {
  state: VendorProfileWizardState;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  errorMessage: string | null;
}

export function ReviewStep({
  state,
  onSubmit,
  onBack,
  submitting,
  errorMessage,
}: ReviewStepProps): React.JSX.Element {
  const t = useTranslations('vendor.profile');
  const tLang = useTranslations('vendor.languages');
  const locationsQuery = useLocations();
  const categoriesQuery = useServiceCategories();

  const location = (locationsQuery.data ?? []).find((l) => l.id === state.locationId);
  const categoryLabels = (categoriesQuery.data ?? [])
    .filter((c) => state.categoryIds.includes(c.id))
    .map((c) => c.label);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">{t('steps.review.intro')}</p>

      <dl className="grid grid-cols-1 gap-3 rounded border border-neutral-200 p-4 text-sm">
        <div>
          <dt className="font-medium">{t('steps.review.businessName')}</dt>
          <dd className="text-neutral-700">{state.businessName}</dd>
        </div>
        <div>
          <dt className="font-medium">{t('steps.review.bio')}</dt>
          <dd className="whitespace-pre-line text-neutral-700">{state.bio}</dd>
        </div>
        <div>
          <dt className="font-medium">{t('steps.review.location')}</dt>
          <dd className="text-neutral-700">
            {location
              ? [location.city, location.region, location.country].filter(Boolean).join(', ')
              : state.locationId}
          </dd>
        </div>
        <div>
          <dt className="font-medium">{t('steps.review.categories')}</dt>
          <dd className="text-neutral-700">{categoryLabels.join(', ') || '—'}</dd>
        </div>
        <div>
          <dt className="font-medium">{t('steps.review.languages')}</dt>
          <dd className="text-neutral-700">
            {state.languages.map((l) => tLang(l)).join(', ')}
          </dd>
        </div>
      </dl>

      {errorMessage && (
        <div role="alert" aria-live="polite" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          {t('wizard.back')}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          aria-busy={submitting}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? t('wizard.submitting') : t('wizard.submit')}
        </button>
      </div>
    </div>
  );
}
