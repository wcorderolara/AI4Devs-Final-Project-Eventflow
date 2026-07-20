'use client';

// EventTypeFormDialog (US-076 / FE-002). Modal create/edit para `EventType` con
// input multi-locale para `name_i18n` (4 locales, `es-LATAM` REQUIRED — VR-03).
// Sin `parent_id` (diferencia clave vs US-075): el catálogo es plano.
//
// Modo `create`:
//   - `code` editable (slug, permite `_` para cubrir `baby_shower`).
//   - Envía `POST /admin/event-types`.
// Modo `edit`:
//   - `code` disabled (identidad estable);
//   - toggle `is_active`;
//   - reactivate implícito al pasar `false → true` (backend detecta y emite `reactivate`).
//   - Envía `PATCH /admin/event-types/:id`.
//
// A11Y: `<dialog>` nativo (focus trap + Esc), `aria-labelledby`, `role="alert"` para
// errores. `data-testid` estables para tests.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import { useCreateEventType, useUpdateEventType } from '../hooks/adminEventTypesQueries';
import type {
  AdminEventTypeNode,
  EventTypeLocale,
} from '../api/adminEventTypesApi.types';
import type { ApiError } from '@/shared/api-client';

const LOCALES: readonly EventTypeLocale[] = ['es-LATAM', 'es-ES', 'en', 'pt'];

export type EventTypeFormMode =
  | { kind: 'create' }
  | { kind: 'edit'; node: AdminEventTypeNode };

interface Props {
  mode: EventTypeFormMode | null;
  onClose: () => void;
  onSuccess?: (node: AdminEventTypeNode) => void;
}

interface FormState {
  code: string;
  names: Record<EventTypeLocale, string>;
  descriptions: Record<EventTypeLocale, string>;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY_NAMES: Record<EventTypeLocale, string> = { 'es-LATAM': '', 'es-ES': '', en: '', pt: '' };

function initialState(mode: EventTypeFormMode | null): FormState {
  if (!mode || mode.kind === 'create') {
    return {
      code: '',
      names: { ...EMPTY_NAMES },
      descriptions: { ...EMPTY_NAMES },
      sortOrder: '0',
      isActive: true,
    };
  }
  const n = mode.node;
  return {
    code: n.code,
    names: mergeI18n(n.name_i18n),
    descriptions: mergeI18n(n.description_i18n),
    sortOrder: String(n.sort_order),
    isActive: n.is_active,
  };
}

function mergeI18n(v: Record<string, string> | null | undefined): Record<EventTypeLocale, string> {
  return LOCALES.reduce<Record<EventTypeLocale, string>>(
    (acc, locale) => {
      acc[locale] = (v ?? {})[locale] ?? '';
      return acc;
    },
    { 'es-LATAM': '', 'es-ES': '', en: '', pt: '' },
  );
}

export function EventTypeFormDialog({
  mode,
  onClose,
  onSuccess,
}: Props): React.JSX.Element | null {
  const t = useTranslations('admin.event-type.form');
  const tErrors = useTranslations('admin.event-type.errors');
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [state, setState] = useState<FormState>(() => initialState(mode));

  const createMutation = useCreateEventType();
  const updateMutation = useUpdateEventType();
  const mutation = mode?.kind === 'edit' ? updateMutation : createMutation;

  useEffect(() => {
    if (mode) {
      setState(initialState(mode));
      createMutation.reset();
      updateMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode?.kind, mode?.kind === 'edit' ? mode.node.id : null]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (mode && !dlg.open) dlg.showModal();
    if (!mode && dlg.open) dlg.close();
  }, [mode]);

  const close = useCallback(() => {
    dialogRef.current?.close();
    onClose();
  }, [onClose]);

  const esLatamMissing = state.names['es-LATAM'].trim().length === 0;
  const codeInvalid =
    mode?.kind !== 'edit' && (state.code.length === 0 || !/^[a-z0-9_-]+$/.test(state.code));
  const sortOrderNum = Number(state.sortOrder);
  const sortOrderInvalid = !Number.isInteger(sortOrderNum) || sortOrderNum < 0;
  const canSubmit = !mutation.isPending && !esLatamMissing && !codeInvalid && !sortOrderInvalid;

  const onFieldChange = useCallback(
    (locale: EventTypeLocale, kind: 'name' | 'description') =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setState((prev) => ({
          ...prev,
          ...(kind === 'name'
            ? { names: { ...prev.names, [locale]: e.target.value } }
            : { descriptions: { ...prev.descriptions, [locale]: e.target.value } }),
        }));
      },
    [],
  );

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!mode || !canSubmit) return;

      const nameI18n: Record<string, string> = {};
      const descriptionI18n: Record<string, string> = {};
      for (const locale of LOCALES) {
        const nv = state.names[locale].trim();
        if (nv.length > 0) nameI18n[locale] = nv;
        const dv = state.descriptions[locale].trim();
        if (dv.length > 0) descriptionI18n[locale] = dv;
      }
      const hasDescriptions = Object.keys(descriptionI18n).length > 0;

      if (mode.kind === 'edit') {
        updateMutation.mutate(
          {
            id: mode.node.id,
            name_i18n: nameI18n,
            ...(hasDescriptions ? { description_i18n: descriptionI18n } : {}),
            sort_order: sortOrderNum,
            is_active: state.isActive,
          },
          {
            onSuccess: (data) => {
              onSuccess?.(data);
              close();
            },
          },
        );
      } else {
        createMutation.mutate(
          {
            code: state.code,
            name_i18n: nameI18n,
            ...(hasDescriptions ? { description_i18n: descriptionI18n } : {}),
            sort_order: sortOrderNum,
          },
          {
            onSuccess: (data) => {
              onSuccess?.(data);
              close();
            },
          },
        );
      }
    },
    [mode, canSubmit, state, updateMutation, createMutation, sortOrderNum, onSuccess, close],
  );

  if (!mode) return null;

  const isEdit = mode.kind === 'edit';
  const title =
    mode.kind === 'edit'
      ? t('editTitle', { name: mode.node.name_i18n['es-LATAM'] ?? mode.node.label })
      : t('createTitle');

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-testid="event-type-form-dialog"
      className="rounded-lg p-0 shadow-xl backdrop:bg-black/40"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <form method="dialog" onSubmit={onSubmit} className="flex w-[min(640px,92vw)] flex-col gap-4 p-6">
        <header>
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
            {title}
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-neutral-800">{t('codeLabel')}</span>
            <input
              type="text"
              value={state.code}
              onChange={(e) => setState((s) => ({ ...s, code: e.target.value }))}
              disabled={isEdit}
              required={!isEdit}
              maxLength={64}
              placeholder="ej. wedding"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm disabled:bg-neutral-100"
              data-testid="event-type-form-code"
            />
            {codeInvalid ? (
              <span className="mt-1 text-xs text-red-600">{t('codeInvalid')}</span>
            ) : null}
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium text-neutral-800">{t('sortOrderLabel')}</span>
            <input
              type="number"
              min={0}
              step={1}
              value={state.sortOrder}
              onChange={(e) => setState((s) => ({ ...s, sortOrder: e.target.value }))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
              data-testid="event-type-form-sort-order"
            />
          </label>
        </div>

        <fieldset className="rounded-md border border-neutral-200 p-3">
          <legend className="px-1 text-sm font-medium text-neutral-800">{t('nameLegend')}</legend>
          <div className="space-y-2">
            {LOCALES.map((locale) => (
              <label key={locale} className="flex flex-col text-sm">
                <span className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {locale}
                  {locale === 'es-LATAM' ? (
                    <span className="ml-1 text-red-600" aria-hidden>
                      {'*'}
                    </span>
                  ) : null}
                </span>
                <input
                  type="text"
                  value={state.names[locale]}
                  onChange={onFieldChange(locale, 'name')}
                  required={locale === 'es-LATAM'}
                  maxLength={200}
                  data-testid={`event-type-form-name-${locale}`}
                  aria-invalid={locale === 'es-LATAM' && esLatamMissing ? true : undefined}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
                />
              </label>
            ))}
            {esLatamMissing ? (
              <p role="alert" className="text-xs text-red-600" data-testid="event-type-form-name-es-latam-error">
                {t('esLatamRequired')}
              </p>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="rounded-md border border-neutral-200 p-3">
          <legend className="px-1 text-sm font-medium text-neutral-800">{t('descriptionLegend')}</legend>
          <div className="space-y-2">
            {LOCALES.map((locale) => (
              <label key={locale} className="flex flex-col text-sm">
                <span className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {locale}
                </span>
                <textarea
                  value={state.descriptions[locale]}
                  onChange={onFieldChange(locale, 'description')}
                  maxLength={2000}
                  rows={2}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
                />
              </label>
            ))}
          </div>
        </fieldset>

        {isEdit ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.isActive}
              onChange={(e) => setState((s) => ({ ...s, isActive: e.target.checked }))}
              className="h-4 w-4"
              data-testid="event-type-form-is-active"
            />
            <span>{t('isActive')}</span>
          </label>
        ) : null}

        {mutation.isError ? (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {mapErrorCode(mutation.error, tErrors)}
          </div>
        ) : null}

        <footer className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            data-testid="event-type-form-submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {mutation.isPending ? t('submitting') : isEdit ? t('save') : t('create')}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function mapErrorCode(err: ApiError, tErrors: (k: string) => string): string {
  const code = (err as { code?: string })?.code ?? 'UNEXPECTED';
  const key = ERROR_KEYS[code] ?? 'unexpected';
  return tErrors(key);
}

const ERROR_KEYS: Record<string, string> = {
  AUTHENTICATION_REQUIRED: 'unauthenticated',
  FORBIDDEN: 'forbidden',
  EVENT_TYPE_NOT_FOUND: 'notFound',
  DUPLICATE_CODE: 'duplicateCode',
  INVALID_NAME_I18N: 'esLatamRequired',
  REASON_REQUIRED: 'reasonRequired',
  INVALID_REASON_LENGTH: 'reasonLength',
  VALIDATION_ERROR: 'validation',
};
