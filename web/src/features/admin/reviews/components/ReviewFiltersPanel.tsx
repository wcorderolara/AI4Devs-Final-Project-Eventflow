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
//
// PB-P2-029: la composición (layout responsive, acciones y resumen de filtros aplicados) pasa a
// `FilterBar` del design system. Los filtros siguen siendo específicos del panel de reseñas —
// `FilterBar` no conoce ninguno— y el contrato `AdminReviewListFilters`, la serialización ISO y
// la validación cross-field no cambian. Novedad de UX: los filtros ya aplicados se muestran como
// `AppliedFilterChip` removibles, que era la pieza que faltaba respecto de Component Foundations
// §24 (applied filters summary).
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  type AppliedFilter,
  Checkbox,
  DateInput,
  FilterBar,
  FormField,
  InlineMessage,
  Input,
  Select,
} from '@/shared/design-system';
import type { AdminReviewListFilters, AdminReviewStatus } from '../api/adminReviewsApi.types';

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
    hasAdminAction: v.hasAdminAction === undefined ? 'any' : v.hasAdminAction ? 'true' : 'false',
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
  // Los errores de rango son cross-field: se anuncian una sola vez (`role="alert"`) y se asocian
  // a los dos campos implicados por `aria-describedby`, en lugar de duplicar el mensaje.
  const dateErrorId = useId();
  const ratingErrorId = useId();

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

  // Chips de los filtros **ya aplicados** (`value`), no del borrador: quitar un chip modifica el
  // filtro efectivo de inmediato, igual que `Limpiar filtros`.
  const appliedFilters = useMemo<AppliedFilter[]>(() => {
    const chips: AppliedFilter[] = [];
    const push = (key: string, label: string, next: AdminReviewListFilters): void => {
      chips.push({
        key,
        label,
        removeLabel: t('removeFilter', { filter: label }),
        onRemove: () => onChange(next),
      });
    };

    for (const s of value.status ?? []) {
      push(`status-${s}`, `${t('statusLegend')}: ${tStatus(s)}`, {
        ...value,
        status: (value.status ?? []).filter((other) => other !== s),
      });
    }
    if (value.vendorId) {
      const { vendorId: _vendorId, ...rest } = value;
      push('vendorId', `${t('vendorIdLabel')}: ${value.vendorId}`, rest);
    }
    if (value.createdAtFrom) {
      const { createdAtFrom: _from, ...rest } = value;
      push('createdAtFrom', `${t('createdFromLabel')}: ${value.createdAtFrom.slice(0, 10)}`, rest);
    }
    if (value.createdAtTo) {
      const { createdAtTo: _to, ...rest } = value;
      push('createdAtTo', `${t('createdToLabel')}: ${value.createdAtTo.slice(0, 10)}`, rest);
    }
    if (value.ratingMin !== undefined) {
      const { ratingMin: _min, ...rest } = value;
      push('ratingMin', `${t('ratingMinLabel')}: ${value.ratingMin}`, rest);
    }
    if (value.ratingMax !== undefined) {
      const { ratingMax: _max, ...rest } = value;
      push('ratingMax', `${t('ratingMaxLabel')}: ${value.ratingMax}`, rest);
    }
    if (value.hasAdminAction !== undefined) {
      const { hasAdminAction: _flag, ...rest } = value;
      const label = value.hasAdminAction ? t('hasAdminActionYes') : t('hasAdminActionNo');
      push('hasAdminAction', `${t('hasAdminActionLabel')}: ${label}`, rest);
    }
    return chips;
  }, [onChange, t, tStatus, value]);

  return (
    <FilterBar
      ariaLabel={t('formAriaLabel')}
      onSubmit={onSubmit}
      applyLabel={t('apply')}
      applyDisabled={hasFieldError}
      onClear={onReset}
      clearLabel={t('reset')}
      appliedFilters={appliedFilters}
      appliedLabel={t('appliedFilters')}
      footer={
        <>
          {dateCrossFieldError ? (
            <InlineMessage id={dateErrorId} tone="error" live>
              {dateCrossFieldError}
            </InlineMessage>
          ) : null}
          {ratingCrossFieldError ? (
            <InlineMessage id={ratingErrorId} tone="error" live>
              {ratingCrossFieldError}
            </InlineMessage>
          ) : null}
        </>
      }
    >
      <fieldset
        aria-labelledby={statusFieldsetId}
        className="space-y-2 border-0 p-0 md:col-span-2 lg:col-span-3"
      >
        <legend id={statusFieldsetId} className="font-ui text-label font-medium text-primary">
          {t('statusLegend')}
        </legend>
        <div className="flex flex-wrap gap-4">
          {ALL_STATUS.map((s) => (
            <Checkbox
              key={s}
              label={tStatus(s)}
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
            />
          ))}
        </div>
      </fieldset>

      <FormField id={vendorInputId} label={t('vendorIdLabel')}>
        {(field) => (
          <Input
            {...field}
            type="text"
            value={draft.vendorId}
            onChange={(e) => setDraft((d) => ({ ...d, vendorId: e.target.value }))}
            placeholder={t('vendorIdPlaceholder')}
          />
        )}
      </FormField>

      <FormField id={fromInputId} label={t('createdFromLabel')}>
        {(field) => (
          <DateInput
            {...field}
            value={draft.createdAtFrom}
            onChange={(e) => setDraft((d) => ({ ...d, createdAtFrom: e.target.value }))}
            invalid={dateCrossFieldError !== null}
            aria-invalid={dateCrossFieldError !== null || undefined}
            aria-describedby={dateCrossFieldError !== null ? dateErrorId : undefined}
          />
        )}
      </FormField>
      <FormField id={toInputId} label={t('createdToLabel')}>
        {(field) => (
          <DateInput
            {...field}
            value={draft.createdAtTo}
            onChange={(e) => setDraft((d) => ({ ...d, createdAtTo: e.target.value }))}
            invalid={dateCrossFieldError !== null}
            aria-invalid={dateCrossFieldError !== null || undefined}
            aria-describedby={dateCrossFieldError !== null ? dateErrorId : undefined}
          />
        )}
      </FormField>

      <FormField id={ratingMinId} label={t('ratingMinLabel')}>
        {(field) => (
          <Input
            {...field}
            type="number"
            min={1}
            max={5}
            step={1}
            value={draft.ratingMin}
            onChange={(e) => setDraft((d) => ({ ...d, ratingMin: e.target.value }))}
            invalid={ratingCrossFieldError !== null}
            aria-invalid={ratingCrossFieldError !== null || undefined}
            aria-describedby={ratingCrossFieldError !== null ? ratingErrorId : undefined}
          />
        )}
      </FormField>
      <FormField id={ratingMaxId} label={t('ratingMaxLabel')}>
        {(field) => (
          <Input
            {...field}
            type="number"
            min={1}
            max={5}
            step={1}
            value={draft.ratingMax}
            onChange={(e) => setDraft((d) => ({ ...d, ratingMax: e.target.value }))}
            invalid={ratingCrossFieldError !== null}
            aria-invalid={ratingCrossFieldError !== null || undefined}
            aria-describedby={ratingCrossFieldError !== null ? ratingErrorId : undefined}
          />
        )}
      </FormField>

      <FormField id={hasActionId} label={t('hasAdminActionLabel')}>
        {(field) => (
          <Select
            {...field}
            value={draft.hasAdminAction}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                hasAdminAction: e.target.value as DraftState['hasAdminAction'],
              }))
            }
            options={[
              { value: 'any', label: t('hasAdminActionAny') },
              { value: 'true', label: t('hasAdminActionYes') },
              { value: 'false', label: t('hasAdminActionNo') },
            ]}
          />
        )}
      </FormField>
    </FilterBar>
  );
}
