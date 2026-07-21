'use client';

// US-080 / FE-003 — Filtros del visor admin del audit log AdminAction.
//
// - `target_type` como `<select>` (enum estable del backend).
// - `admin_id`, `target_id` como inputs UUID (VR-03/VR-04 — Zod backend valida forma).
// - `action` como texto libre acotado (paridad con el spec §7).
// - Rango `created_at_from`/`created_at_to` con inputs nativos date.
// - `admin_id` con debounce 300ms (commit on-idle) para no lanzar una request por keypress.
// - Botón "Limpiar filtros" resetea sin recargar.
//
// A11Y: labels asociados, cross-field error con `role="alert"` y `aria-invalid` en ambos
// inputs de fecha; commit explícito via `type="submit"`.
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type {
  AdminActionsListFilters,
  AdminActionTargetType,
} from '../api/adminActionsApi.types';

const ALL_TARGET_TYPES: readonly AdminActionTargetType[] = [
  'review',
  'vendor_profile',
  'service_category',
  'event_type',
  'event',
];

const ADMIN_ID_DEBOUNCE_MS = 300;

interface Props {
  value: AdminActionsListFilters;
  onChange: (next: AdminActionsListFilters) => void;
}

interface DraftState {
  adminId: string;
  targetType: '' | AdminActionTargetType;
  targetId: string;
  action: string;
  createdAtFrom: string;
  createdAtTo: string;
}

function toDraft(v: AdminActionsListFilters): DraftState {
  return {
    adminId: v.adminId ?? '',
    targetType: v.targetType ?? '',
    targetId: v.targetId ?? '',
    action: v.action ?? '',
    createdAtFrom: v.createdAtFrom?.slice(0, 10) ?? '',
    createdAtTo: v.createdAtTo?.slice(0, 10) ?? '',
  };
}

function fromDraft(d: DraftState): AdminActionsListFilters {
  const out: AdminActionsListFilters = {};
  const adminId = d.adminId.trim();
  if (adminId.length > 0) out.adminId = adminId;
  if (d.targetType !== '') out.targetType = d.targetType;
  const targetId = d.targetId.trim();
  if (targetId.length > 0) out.targetId = targetId;
  const action = d.action.trim();
  if (action.length > 0) out.action = action;
  if (d.createdAtFrom) out.createdAtFrom = new Date(d.createdAtFrom).toISOString();
  if (d.createdAtTo) out.createdAtTo = new Date(`${d.createdAtTo}T23:59:59.999Z`).toISOString();
  return out;
}

export function AdminActionsFiltersPanel({ value, onChange }: Props): React.JSX.Element {
  const t = useTranslations('admin.admin-actions.filters');
  const tTarget = useTranslations('admin.admin-actions.targetType');

  const [draft, setDraft] = useState<DraftState>(() => toDraft(value));

  const valueKey = useMemo(
    () =>
      [
        value.adminId ?? '',
        value.targetType ?? '',
        value.targetId ?? '',
        value.action ?? '',
        value.createdAtFrom ?? '',
        value.createdAtTo ?? '',
      ].join('|'),
    [value.adminId, value.targetType, value.targetId, value.action, value.createdAtFrom, value.createdAtTo],
  );

  useEffect(() => {
    setDraft(toDraft(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  const adminIdId = useId();
  const targetTypeId = useId();
  const targetIdId = useId();
  const actionId = useId();
  const fromInputId = useId();
  const toInputId = useId();

  const dateCrossFieldError = useMemo(() => {
    if (!draft.createdAtFrom || !draft.createdAtTo) return null;
    return draft.createdAtFrom > draft.createdAtTo ? t('errorDateRange') : null;
  }, [draft.createdAtFrom, draft.createdAtTo, t]);

  const hasFieldError = dateCrossFieldError !== null;

  useEffect(() => {
    const current = value.adminId ?? '';
    const draftQ = draft.adminId.trim();
    if (current === draftQ) return;
    if (hasFieldError) return;
    const handle = window.setTimeout(() => {
      onChange(fromDraft(draft));
    }, ADMIN_ID_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.adminId]);

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
      <div>
        <label htmlFor={adminIdId} className="block text-sm font-medium text-neutral-800">
          {t('adminIdLabel')}
        </label>
        <input
          id={adminIdId}
          type="text"
          value={draft.adminId}
          onChange={(e) => setDraft((d) => ({ ...d, adminId: e.target.value }))}
          placeholder={t('adminIdPlaceholder')}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-neutral-500">{t('adminIdHint')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor={targetTypeId} className="block text-sm font-medium text-neutral-800">
            {t('targetTypeLabel')}
          </label>
          <select
            id={targetTypeId}
            value={draft.targetType}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                targetType: e.target.value as DraftState['targetType'],
              }))
            }
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">{t('targetTypeAny')}</option>
            {ALL_TARGET_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {tTarget(tt)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={targetIdId} className="block text-sm font-medium text-neutral-800">
            {t('targetIdLabel')}
          </label>
          <input
            id={targetIdId}
            type="text"
            value={draft.targetId}
            onChange={(e) => setDraft((d) => ({ ...d, targetId: e.target.value }))}
            placeholder={t('targetIdPlaceholder')}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor={actionId} className="block text-sm font-medium text-neutral-800">
          {t('actionLabel')}
        </label>
        <input
          id={actionId}
          type="text"
          value={draft.action}
          onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
          placeholder={t('actionPlaceholder')}
          maxLength={64}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor={fromInputId} className="block text-sm font-medium text-neutral-800">
            {t('createdAtFromLabel')}
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
            {t('createdAtToLabel')}
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
