'use client';

// LocationCategoriesStep (US-040 / FE-004, AC-01/AC-05). Selector de ciudad + multi-select
// de categorías (cap 1-3, D2). Los catálogos vienen de `/locations` (reuso events) y
// `/service-categories` (EMERGENT US-040).
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { useLocations } from '@/features/events/hooks/useEventsQueries';
import {
  locationCategoriesSchema,
  type LocationCategoriesValues,
} from '../schemas/vendorProfileWizardSchema';
import { useServiceCategories } from '../hooks/useVendorProfileQueries';

interface LocationCategoriesStepProps {
  initialValues: LocationCategoriesValues;
  onNext: (values: LocationCategoriesValues) => void;
  onBack: () => void;
}

function locationLabel(loc: { city: string | null; region: string | null; country: string }): string {
  return [loc.city, loc.region, loc.country].filter(Boolean).join(', ');
}

export function LocationCategoriesStep({
  initialValues,
  onNext,
  onBack,
}: LocationCategoriesStepProps): React.JSX.Element {
  const t = useTranslations('vendor.profile');
  const locationsQuery = useLocations();
  const categoriesQuery = useServiceCategories();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LocationCategoriesValues>({
    resolver: zodResolver(locationCategoriesSchema),
    defaultValues: initialValues,
    mode: 'onSubmit',
  });

  const selected = watch('categoryIds');

  const toggleCategory = (id: string): void => {
    const set = new Set(selected);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setValue('categoryIds', Array.from(set), { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
      <div>
        <label htmlFor="locationId" className="block text-sm font-medium">
          {t('steps.locationCategories.locationLabel')}
        </label>
        <select
          id="locationId"
          aria-required="true"
          aria-invalid={errors.locationId ? 'true' : 'false'}
          aria-describedby={errors.locationId ? 'locationId-error' : undefined}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          {...register('locationId')}
        >
          <option value="">{t('steps.locationCategories.locationPlaceholder')}</option>
          {(locationsQuery.data ?? []).map((loc) => (
            <option key={loc.id} value={loc.id}>
              {locationLabel(loc)}
            </option>
          ))}
        </select>
        {errors.locationId && (
          <p id="locationId-error" role="alert" aria-live="polite" className="mt-1 text-sm text-red-700">
            {t(`validation.${errors.locationId.message ?? 'locationRequired'}`)}
          </p>
        )}
      </div>

      <fieldset aria-describedby="categories-help">
        <legend className="text-sm font-medium">{t('steps.locationCategories.categoriesLabel')}</legend>
        <p id="categories-help" className="mt-1 text-xs text-neutral-500">
          {t('steps.locationCategories.categoriesHelp')}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(categoriesQuery.data ?? []).map((cat) => {
            const checked = selected.includes(cat.id);
            const disabled = !checked && selected.length >= 3;
            return (
              <label
                key={cat.id}
                className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                  disabled ? 'border-neutral-200 text-neutral-400' : 'border-neutral-300'
                }`}
              >
                <input
                  type="checkbox"
                  value={cat.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleCategory(cat.id)}
                />
                <span>{cat.label}</span>
              </label>
            );
          })}
        </div>
        {errors.categoryIds && (
          <p role="alert" aria-live="polite" className="mt-1 text-sm text-red-700">
            {t(`validation.${errors.categoryIds.message ?? 'categoriesRange'}`)}
          </p>
        )}
      </fieldset>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="rounded border border-neutral-300 px-4 py-2 text-sm">
          {t('wizard.back')}
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
