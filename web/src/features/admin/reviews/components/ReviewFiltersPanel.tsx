'use client';

// ReviewFiltersPanel (US-077 / PB-P1-040 / FE-003). Formulario controlado accesible con:
//   - Multi-status via checkboxes (published/hidden/removed).
//   - Vendor UUID input opcional.
//   - Rango de fechas (from/to) usando <input type="date"> nativo.
//   - Rango de rating (min/max) 1..5.
//   - Filtro binario `has_admin_action` (all/only-moderated/only-not-moderated).
//   - Botón "Limpiar filtros" que resetea sin recargar la página.
//
// A11Y:
//   - Cada filtro tiene `<label>` asociado y semántica adecuada.
//   - Los checkboxes van dentro de `<fieldset><legend>` para agrupación semántica.
//   - Sin patrones de sólo-color; el submit es explícito para evitar cambios al perder foco.
//
// Debounce (Tech Spec §8): el commit se hace en submit para MVP. Extender a onChange con
// `use-debounce` queda fuera de scope.
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type {
  AdminReviewListFilters,
  AdminReviewStatus,
} from '../api/adminReviewsApi.types';

const ALL_STATUS: readonly AdminReviewStatus[] = ['published', 'hidden', 'removed'];

interface Props {
  value: AdminReviewListFilters;
  onChange: (next: AdminReviewListFilters) => void;
}

interface DraftState {
  statusPublished: boolean;
  statusHidden: boolean;
  statusRemoved: boolean;
  vendorId: string;
  createdAtFrom: string;
  createdAtTo: string;
  ratingMin: string;
  ratingMax: string;
  hasAdminAction: 'any' | 'true' | 'false';
}

function toDraft(v: AdminReviewListFilters): DraftState {
  const set = new Set(v.status ?? []);
  return {
    statusPublished: set.has('published'),
    statusHidden: set.has('hidden'),
    statusRemoved: set.has('removed'),
    vendorId: v.vendorId ?? '',
    createdAtFrom: v.createdAtFrom?.slice(0, 10) ?? '',
    createdAtTo: v.createdAtTo?.slice(0, 10) ?? '',
    ratingMin: v.ratingMin !== undefined ? String(v.ratingMin) : '',
    ratingMax: v.ratingMax !== undefined ? String(v.ratingMax) : '',
    hasAdminAction:
      v.hasAdminAction === undefined ? 'any' : v.hasAdminAction ? 'true' : 'false',
  };
}

function fromDraft(d: DraftState): AdminReviewListFilters {
  const statuses: AdminReviewStatus[] = [];
  if (d.statusPublished) statuses.push('published');
  if (d.statusHidden) statuses.push('hidden');
  if (d.statusRemoved) statuses.push('removed');
  const out: AdminReviewListFilters = {};
  if (statuses.length > 0 && statuses.length < ALL_STATUS.length) out.status = statuses;
  if (d.vendorId.trim().length > 0) out.vendorId = d.vendorId.trim();
  if (d.createdAtFrom) out.createdAtFrom = new Date(d.createdAtFrom).toISOString();
  if (d.createdAtTo) out.createdAtTo = new Date(`${d.createdAtTo}T23:59:59.999Z`).toISOString();
  if (d.ratingMin) out.ratingMin = Number(d.ratingMin);
  if (d.ratingMax) out.ratingMax = Number(d.ratingMax);
  if (d.hasAdminAction === 'true') out.hasAdminAction = true;
  if (d.hasAdminAction === 'false') out.hasAdminAction = false;
  return out;
}

export function ReviewFiltersPanel({ value, onChange }: Props): React.JSX.Element {
  const t = useTranslations('admin.review.panel.filters');
  const tStatus = useTranslations('admin.review.moderate.status');

  const [draft, setDraft] = useState<DraftState>(() => toDraft(value));

  // Firma serializada de `value` — evita re-sync cuando el padre reasigna un objeto
  // estructuralmente igual (identidad distinta pero mismo contenido).
  const valueKey = useMemo(
    () =>
      [
        value.status?.join(',') ?? '',
        value.vendorId ?? '',
        value.createdAtFrom ?? '',
        value.createdAtTo ?? '',
        value.ratingMin ?? -1,
        value.ratingMax ?? -1,
        value.hasAdminAction ?? 'any',
      ].join('|'),
    [
      value.status,
      value.vendorId,
      value.createdAtFrom,
      value.createdAtTo,
      value.ratingMin,
      value.ratingMax,
      value.hasAdminAction,
    ],
  );

  // Si el padre resetea `value` externamente (p. ej. tras invalidación), reflejar en el draft.
  useEffect(() => {
    setDraft(toDraft(value));
    // `value` es la fuente de verdad; sólo re-sync cuando su firma cambie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  const statusFieldsetId = useId();
  const vendorInputId = useId();
  const fromInputId = useId();
  const toInputId = useId();
  const ratingMinId = useId();
  const ratingMaxId = useId();
  const hasActionId = useId();

  const ratingCrossFieldError = useMemo(() => {
    if (!draft.ratingMin || !draft.ratingMax) return null;
    return Number(draft.ratingMin) > Number(draft.ratingMax) ? t('errorRatingRange') : null;
  }, [draft.ratingMin, draft.ratingMax, t]);

  const dateCrossFieldError = useMemo(() => {
    if (!draft.createdAtFrom || !draft.createdAtTo) return null;
    return draft.createdAtFrom > draft.createdAtTo ? t('errorDateRange') : null;
  }, [draft.createdAtFrom, draft.createdAtTo, t]);

  const hasFieldError = ratingCrossFieldError !== null || dateCrossFieldError !== null;

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
                  s === 'published'
                    ? draft.statusPublished
                    : s === 'hidden'
                      ? draft.statusHidden
                      : draft.statusRemoved
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
        <label htmlFor={vendorInputId} className="block text-sm font-medium text-neutral-800">
          {t('vendorIdLabel')}
        </label>
        <input
          id={vendorInputId}
          type="text"
          value={draft.vendorId}
          onChange={(e) => setDraft((d) => ({ ...d, vendorId: e.target.value }))}
          placeholder={t('vendorIdPlaceholder')}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor={ratingMinId} className="block text-sm font-medium text-neutral-800">
            {t('ratingMinLabel')}
          </label>
          <input
            id={ratingMinId}
            type="number"
            min={1}
            max={5}
            step={1}
            value={draft.ratingMin}
            onChange={(e) => setDraft((d) => ({ ...d, ratingMin: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            aria-invalid={ratingCrossFieldError !== null || undefined}
          />
        </div>
        <div>
          <label htmlFor={ratingMaxId} className="block text-sm font-medium text-neutral-800">
            {t('ratingMaxLabel')}
          </label>
          <input
            id={ratingMaxId}
            type="number"
            min={1}
            max={5}
            step={1}
            value={draft.ratingMax}
            onChange={(e) => setDraft((d) => ({ ...d, ratingMax: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            aria-invalid={ratingCrossFieldError !== null || undefined}
          />
        </div>
      </div>
      {ratingCrossFieldError ? (
        <p role="alert" className="text-sm text-red-700">
          {ratingCrossFieldError}
        </p>
      ) : null}

      <div>
        <label htmlFor={hasActionId} className="block text-sm font-medium text-neutral-800">
          {t('hasAdminActionLabel')}
        </label>
        <select
          id={hasActionId}
          value={draft.hasAdminAction}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              hasAdminAction: e.target.value as DraftState['hasAdminAction'],
            }))
          }
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="any">{t('hasAdminActionAny')}</option>
          <option value="true">{t('hasAdminActionYes')}</option>
          <option value="false">{t('hasAdminActionNo')}</option>
        </select>
      </div>

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
