'use client';

// Filtros del directorio (US-045 / FE-002). A11Y: cada campo con `<label>` semántico y
// `htmlFor`; el submit funciona con Enter dentro del form. Deja al padre gobernar el estado
// (URL state) para deep linking (AC-01/D3).
import { useTranslations } from 'next-intl';
import { useId, type FormEvent } from 'react';
import { Button } from '@/shared/design-system';
import { useDirectoryCatalogs } from '../hooks/useDirectoryCatalogs';

const FIELD =
  'focus-ring mt-1.5 h-10 w-full rounded-input border border-default bg-surface px-3 font-ui text-body-sm text-primary placeholder:text-muted';
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
  // Con catálogos, categoría y ciudad son listas con nombres legibles; si no cargan, el filtro
  // sigue funcionando con texto libre (nunca queda inutilizable).
  const catalogs = useDirectoryCatalogs();
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
      className="flex flex-col gap-4 border-y border-subtle py-5 lg:flex-row lg:items-end"
    >
      <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-[1.4fr_1.2fr_1fr_1fr_1fr]">
        <div className="flex flex-col">
          <label htmlFor={ids.category} className="font-ui text-body-sm font-medium text-secondary">
            {t('category')}
          </label>
          {catalogs.categories ? (
            <select
              id={ids.category}
              name="categoryCode"
              value={props.value.categoryCode}
              onChange={(e) => update('categoryCode', e.target.value)}
              className={FIELD}
            >
              <option value="">{t('categoryAny')}</option>
              {catalogs.categories.map((group) =>
                group.children.length === 0 ? (
                  <option key={group.code} value={group.code}>
                    {group.label}
                  </option>
                ) : (
                  // La categoría padre sigue siendo seleccionable dentro de su grupo.
                  <optgroup key={group.code} label={group.label}>
                    <option value={group.code}>{group.label}</option>
                    {group.children.map((child) => (
                      <option key={child.code} value={child.code}>
                        {child.label}
                      </option>
                    ))}
                  </optgroup>
                ),
              )}
            </select>
          ) : (
            <input
              id={ids.category}
              name="categoryCode"
              type="text"
              value={props.value.categoryCode}
              onChange={(e) => update('categoryCode', e.target.value)}
              placeholder={t('categoryPlaceholder')}
              autoComplete="off"
              className={FIELD}
            />
          )}
        </div>
        <div className="flex flex-col">
          <label htmlFor={ids.location} className="font-ui text-body-sm font-medium text-secondary">
            {t('location')}
          </label>
          {catalogs.locations ? (
            <select
              id={ids.location}
              name="locationCode"
              value={props.value.locationCode}
              onChange={(e) => update('locationCode', e.target.value)}
              className={FIELD}
            >
              <option value="">{t('locationAny')}</option>
              {catalogs.locations.map((group) => (
                <optgroup key={group.country} label={group.country}>
                  {group.options.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <input
              id={ids.location}
              name="locationCode"
              type="text"
              value={props.value.locationCode}
              onChange={(e) => update('locationCode', e.target.value)}
              placeholder={t('locationPlaceholder')}
              autoComplete="off"
              className={FIELD}
            />
          )}
        </div>
        <div className="flex flex-col">
          <label htmlFor={ids.priceMin} className="font-ui text-body-sm font-medium text-secondary">
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
            className={FIELD}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor={ids.priceMax} className="font-ui text-body-sm font-medium text-secondary">
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
            className={FIELD}
          />
        </div>
        <div className="col-span-2 flex flex-col lg:col-span-1">
          <label htmlFor={ids.currency} className="font-ui text-body-sm font-medium text-secondary">
            {t('currency')}
          </label>
          <select
            id={ids.currency}
            name="currency"
            value={props.value.currency}
            onChange={(e) => update('currency', e.target.value as VendorFiltersValue['currency'])}
            className={FIELD}
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
        <Button type="submit" variant="primary">
          {props.submitLabel ?? t('submit')}
        </Button>
        <Button type="button" variant="ghost" onClick={props.onReset}>
          {t('reset')}
        </Button>
      </div>
    </form>
  );
}
