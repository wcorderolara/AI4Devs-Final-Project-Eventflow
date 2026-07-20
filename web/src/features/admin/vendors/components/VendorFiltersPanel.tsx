'use client';

// VendorFiltersPanel (US-074 / PB-P1-041 / FE-003). Formulario controlado accesible con:
//   - Multi-status via checkboxes (pending/approved/rejected/hidden).
//   - Toggle `is_hidden` (select: any/only-hidden/only-visible).
//   - Rango de fechas (from/to) usando `<input type="date">` nativo.
//   - Búsqueda business_name con debounce 300 ms (commit on-idle, sin re-render agresivo).
//   - Botón "Limpiar filtros" que resetea sin recargar la página.
//
// A11Y:
//   - Cada filtro tiene `<label>` asociado y semántica adecuada.
//   - Los checkboxes van dentro de `<fieldset><legend>` para agrupación semántica.
//   - Sin patrones de sólo-color; el submit es explícito para evitar cambios al perder foco.
//   - Cross-field errors (from > to) exponen `aria-invalid` + `role="alert"`.
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type {
  AdminVendorListFilters,
  AdminVendorStatus,
} from '../api/adminVendorsApi.types';

const ALL_STATUS: readonly AdminVendorStatus[] = ['pending', 'approved', 'rejected', 'hidden'];

const BUSINESS_NAME_DEBOUNCE_MS = 300;

interface Props {
  value: AdminVendorListFilters;
  onChange: (next: AdminVendorListFilters) => void;
}

interface DraftState {
  statusPending: boolean;
  statusApproved: boolean;
  statusRejected: boolean;
  statusHidden: boolean;
  isHidden: 'any' | 'true' | 'false';
  createdAtFrom: string;
  createdAtTo: string;
  businessName: string;
}

function toDraft(v: AdminVendorListFilters): DraftState {
  const set = new Set(v.status ?? []);
  return {
    statusPending: set.has('pending'),
    statusApproved: set.has('approved'),
    statusRejected: set.has('rejected'),
    statusHidden: set.has('hidden'),
    isHidden: v.isHidden === undefined ? 'any' : v.isHidden ? 'true' : 'false',
    createdAtFrom: v.createdAtFrom?.slice(0, 10) ?? '',
    createdAtTo: v.createdAtTo?.slice(0, 10) ?? '',
    businessName: v.businessName ?? '',
  };
}

function fromDraft(d: DraftState): AdminVendorListFilters {
  const statuses: AdminVendorStatus[] = [];
  if (d.statusPending) statuses.push('pending');
  if (d.statusApproved) statuses.push('approved');
  if (d.statusRejected) statuses.push('rejected');
  if (d.statusHidden) statuses.push('hidden');
  const out: AdminVendorListFilters = {};
  if (statuses.length > 0 && statuses.length < ALL_STATUS.length) out.status = statuses;
  if (d.isHidden === 'true') out.isHidden = true;
  if (d.isHidden === 'false') out.isHidden = false;
  if (d.createdAtFrom) out.createdAtFrom = new Date(d.createdAtFrom).toISOString();
  if (d.createdAtTo) out.createdAtTo = new Date(`${d.createdAtTo}T23:59:59.999Z`).toISOString();
  const bn = d.businessName.trim();
  if (bn.length > 0) out.businessName = bn;
  return out;
}

export function VendorFiltersPanel({ value, onChange }: Props): React.JSX.Element {
  const t = useTranslations('admin.vendor.panel.filters');
  const tStatus = useTranslations('admin.vendor.moderate.status');

  const [draft, setDraft] = useState<DraftState>(() => toDraft(value));

  // Firma serializada — evita re-sync cuando el padre reasigna un objeto estructuralmente igual.
  const valueKey = useMemo(
    () =>
      [
        value.status?.join(',') ?? '',
        value.isHidden ?? 'any',
        value.createdAtFrom ?? '',
        value.createdAtTo ?? '',
        value.businessName ?? '',
      ].join('|'),
    [value.status, value.isHidden, value.createdAtFrom, value.createdAtTo, value.businessName],
  );

  useEffect(() => {
    setDraft(toDraft(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  const statusFieldsetId = useId();
  const isHiddenId = useId();
  const fromInputId = useId();
  const toInputId = useId();
  const businessNameId = useId();

  const dateCrossFieldError = useMemo(() => {
    if (!draft.createdAtFrom || !draft.createdAtTo) return null;
    return draft.createdAtFrom > draft.createdAtTo ? t('errorDateRange') : null;
  }, [draft.createdAtFrom, draft.createdAtTo, t]);

  const hasFieldError = dateCrossFieldError !== null;

  // Debounce del business_name: aplica onChange automático cuando el usuario deja de tipear
  // (Tech Spec §8 debounce 300ms). Los otros filtros se commitean en submit para preservar
  // la UX explícita de "Aplicar filtros" y no invalidar la cache TanStack por cada keypress.
  useEffect(() => {
    const currentBn = value.businessName ?? '';
    const draftBn = draft.businessName.trim();
    if (currentBn === draftBn) return;
    if (hasFieldError) return;
    const handle = window.setTimeout(() => {
      onChange(fromDraft(draft));
    }, BUSINESS_NAME_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.businessName]);

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (hasFieldError) return;
    onChange(fromDraft(draft));
  };

  const onReset = (): void => {
    setDraft(toDraft({}));
    onChange({});
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border border-neutral-200 bg-white p-4 space-y-4"
      aria-label={t('formAriaLabel')}
    >
      <fieldset aria-labelledby={statusFieldsetId} className="space-y-2">
        <legend id={statusFieldsetId} className="text-sm font-medium text-neutral-800">
          {t('statusLegend')}
        </legend>
        <div className="flex flex-wrap gap-3">
          {ALL_STATUS.map((s) => (
            <label key={s} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={
                  s === 'pending'
                    ? draft.statusPending
                    : s === 'approved'
                      ? draft.statusApproved
                      : s === 'rejected'
                        ? draft.statusRejected
                        : draft.statusHidden
                }
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [`status${s.charAt(0).toUpperCase()}${s.slice(1)}`]: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              <span>{tStatus(s)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={isHiddenId} className="block text-sm font-medium text-neutral-800">
          {t('isHiddenLabel')}
        </label>
        <select
          id={isHiddenId}
          value={draft.isHidden}
          onChange={(e) =>
            setDraft((d) => ({ ...d, isHidden: e.target.value as DraftState['isHidden'] }))
          }
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="any">{t('isHiddenAny')}</option>
          <option value="true">{t('isHiddenOnlyHidden')}</option>
          <option value="false">{t('isHiddenOnlyVisible')}</option>
        </select>
      </div>

      <div>
        <label htmlFor={businessNameId} className="block text-sm font-medium text-neutral-800">
          {t('businessNameLabel')}
        </label>
        <input
          id={businessNameId}
          type="search"
          value={draft.businessName}
          onChange={(e) => setDraft((d) => ({ ...d, businessName: e.target.value }))}
          placeholder={t('businessNamePlaceholder')}
          maxLength={100}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          aria-describedby={`${businessNameId}-hint`}
        />
        <p id={`${businessNameId}-hint`} className="mt-1 text-xs text-neutral-500">
          {t('businessNameHint')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor={fromInputId} className="block text-sm font-medium text-neutral-800">
            {t('createdFromLabel')}
          </label>
          <input
            id={fromInputId}
            type="date"
            value={draft.createdAtFrom}
            onChange={(e) => setDraft((d) => ({ ...d, createdAtFrom: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            aria-invalid={dateCrossFieldError !== null || undefined}
          />
        </div>
        <div>
          <label htmlFor={toInputId} className="block text-sm font-medium text-neutral-800">
            {t('createdToLabel')}
          </label>
          <input
            id={toInputId}
            type="date"
            value={draft.createdAtTo}
            onChange={(e) => setDraft((d) => ({ ...d, createdAtTo: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            aria-invalid={dateCrossFieldError !== null || undefined}
          />
        </div>
      </div>
      {dateCrossFieldError ? (
        <p role="alert" className="text-sm text-red-700">
          {dateCrossFieldError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
        >
          {t('reset')}
        </button>
        <button
          type="submit"
          disabled={hasFieldError}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-neutral-300"
        >
          {t('apply')}
        </button>
      </div>
    </form>
  );
}
