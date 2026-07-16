'use client';

// Filtros del directorio (US-045 / FE-002). A11Y: cada campo con `<label>` semántico y
// `htmlFor`; el submit funciona con Enter dentro del form. Deja al padre gobernar el estado
// (URL state) para deep linking (AC-01/D3).
import { useTranslations } from 'next-intl';
import { useId, type FormEvent } from 'react';
import type { VendorCurrencyCode } from '../api/vendorDirectoryApi.types';
import { VENDOR_CURRENCY_CODES } from '../api/vendorDirectoryApi.types';

export interface VendorFiltersValue {
  categoryCode: string;
  locationCode: string;
  priceMin: string;
  priceMax: string;
  currency: '' | VendorCurrencyCode;
}

export interface VendorFiltersProps {
  value: VendorFiltersValue;
  onChange: (value: VendorFiltersValue) => void;
  onSubmit: () => void;
  onReset: () => void;
  submitLabel?: string;
}

export function VendorFilters(props: VendorFiltersProps): JSX.Element {
  const t = useTranslations('vendor.directory.filters');
  const ids = {
    category: useId(),
    location: useId(),
    priceMin: useId(),
    priceMax: useId(),
    currency: useId(),
  };

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    props.onSubmit();
  }

  function update<K extends keyof VendorFiltersValue>(key: K, next: VendorFiltersValue[K]) {
    props.onChange({ ...props.value, [key]: next });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t('formLabel')}
      className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white p-4"
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col">
          <label htmlFor={ids.category} className="text-sm font-medium text-neutral-700">
            {t('category')}
          </label>
          <input
            id={ids.category}
            name="categoryCode"
            type="text"
            value={props.value.categoryCode}
            onChange={(e) => update('categoryCode', e.target.value)}
            placeholder={t('categoryPlaceholder')}
            autoComplete="off"
            className="mt-1 rounded border border-neutral-300 px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor={ids.location} className="text-sm font-medium text-neutral-700">
            {t('location')}
          </label>
          <input
            id={ids.location}
            name="locationCode"
            type="text"
            value={props.value.locationCode}
            onChange={(e) => update('locationCode', e.target.value)}
            placeholder={t('locationPlaceholder')}
            autoComplete="off"
            className="mt-1 rounded border border-neutral-300 px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor={ids.priceMin} className="text-sm font-medium text-neutral-700">
            {t('priceMin')}
          </label>
          <input
            id={ids.priceMin}
            name="priceMin"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={props.value.priceMin}
            onChange={(e) => update('priceMin', e.target.value)}
            className="mt-1 rounded border border-neutral-300 px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor={ids.priceMax} className="text-sm font-medium text-neutral-700">
            {t('priceMax')}
          </label>
          <input
            id={ids.priceMax}
            name="priceMax"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={props.value.priceMax}
            onChange={(e) => update('priceMax', e.target.value)}
            className="mt-1 rounded border border-neutral-300 px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor={ids.currency} className="text-sm font-medium text-neutral-700">
            {t('currency')}
          </label>
          <select
            id={ids.currency}
            name="currency"
            value={props.value.currency}
            onChange={(e) => update('currency', e.target.value as VendorFiltersValue['currency'])}
            className="mt-1 rounded border border-neutral-300 px-2 py-1"
          >
            <option value="">{t('currencyAny')}</option>
            {VENDOR_CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {props.submitLabel ?? t('submit')}
        </button>
        <button
          type="button"
          onClick={props.onReset}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          {t('reset')}
        </button>
      </div>
    </form>
  );
}
