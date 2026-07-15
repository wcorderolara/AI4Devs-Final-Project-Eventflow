'use client';

// CategoryChangeForm (US-042 / FE-002, AC-01..04 / EC-01..05 / A11Y).
// Multi-select de categorías, contador "Cambios restantes: N/5" con `aria-live="polite"`,
// CTA con `aria-describedby` cuando el límite está alcanzado, modal de confirmación previo al
// submit cuando el vendor está `approved` y hay diff (D2 → re-pending automático), y banner
// `RependingNotice` reutilizado del editor de US-041 cuando `repending=true`.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { useServiceCategories } from '../hooks/useVendorProfileQueries';
import { useChangeVendorCategories } from '../hooks/useVendorProfileMutations';
import type {
  ChangeVendorCategoriesResultDTO,
  VendorProfileDTO,
} from '../api/vendorProfileApi.types';
import { CATEGORY_CHANGE_MAX } from '../schemas/changeVendorCategoriesSchema';

const KNOWN_ERROR_CODES = new Set([
  'CATEGORY_CHANGE_LIMIT',
  'INVALID_CATEGORIES',
  'INVALID_CATEGORY',
  'PROFILE_HIDDEN',
  'PROFILE_NOT_FOUND',
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
]);

interface CategoryChangeFormProps {
  profile: VendorProfileDTO;
  categoryChangeCount: number;
  onChanged?: (result: ChangeVendorCategoriesResultDTO) => void;
}

export function CategoryChangeForm({
  profile,
  categoryChangeCount,
  onChanged,
}: CategoryChangeFormProps): React.JSX.Element {
  const t = useTranslations('vendor.categories.change');
  const tValidation = useTranslations('vendor.profile.validation');
  const tErrors = useTranslations('vendor.categories.change.errors');

  const categoriesQuery = useServiceCategories();
  const mutation = useChangeVendorCategories();

  const initialIds = useMemo(
    () => profile.categories.map((c) => c.id).sort(),
    [profile.categories],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<ChangeVendorCategoriesResultDTO | null>(null);

  const currentCount = lastResult?.category_change_count ?? categoryChangeCount;
  const remaining = Math.max(0, CATEGORY_CHANGE_MAX - currentCount);
  const limitReached = remaining === 0;
  const status = lastResult?.status ?? profile.status;
  const isApproved = status === 'approved';

  const hasDiff = useMemo(() => {
    const desired = new Set(selectedIds);
    if (desired.size !== initialIds.length) return true;
    for (const id of initialIds) if (!desired.has(id)) return true;
    return false;
  }, [initialIds, selectedIds]);

  const cardinalityOk = selectedIds.length >= 1 && selectedIds.length <= CATEGORY_CHANGE_MAX;
  const submitDisabled =
    !hasDiff || !cardinalityOk || limitReached || mutation.isPending;

  const toggleCategory = useCallback(
    (id: string, checked: boolean) => {
      setSelectedIds((prev) => {
        if (checked) {
          if (prev.includes(id)) return prev;
          if (prev.length >= CATEGORY_CHANGE_MAX) return prev;
          return [...prev, id].sort();
        }
        return prev.filter((x) => x !== id);
      });
    },
    [],
  );

  const runSubmit = useCallback(() => {
    mutation.mutate(
      { service_category_ids: selectedIds },
      {
        onSuccess: (result) => {
          setLastResult(result);
          onChanged?.(result);
        },
      },
    );
  }, [mutation, onChanged, selectedIds]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitDisabled) return;
      if (isApproved && hasDiff) {
        setConfirmOpen(true);
        return;
      }
      runSubmit();
    },
    [hasDiff, isApproved, runSubmit, submitDisabled],
  );

  const errorMessage = mutation.error
    ? mutation.error instanceof ApiError && KNOWN_ERROR_CODES.has(mutation.error.code)
      ? tErrors(mutation.error.code)
      : tErrors('UNEXPECTED')
    : null;

  return (
    <section aria-labelledby="categories-title" className="space-y-4">
      <header>
        <h1 id="categories-title" className="text-xl font-semibold">
          {t('title')}
        </h1>
        <p className="text-sm text-neutral-600">{t('subtitle')}</p>
      </header>

      <div
        role="status"
        aria-live="polite"
        className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800"
        data-testid="category-change-counter"
      >
        {limitReached
          ? t('counter.reached')
          : t('counter.remaining', { remaining, max: CATEGORY_CHANGE_MAX })}
      </div>

      {lastResult?.repending && (
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <strong>{t('banners.repending.title')}</strong> — {t('banners.repending.body')}
        </div>
      )}

      {lastResult && !lastResult.repending && !lastResult.noop && (
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {t('banners.saved')}
        </div>
      )}

      {lastResult?.noop && (
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-800"
        >
          {t('banners.noop')}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('fields.categories.label')}</legend>
          <p className="text-xs text-neutral-600">{t('fields.categories.help')}</p>
          {categoriesQuery.isPending && (
            <p role="status" aria-live="polite" aria-busy="true">
              {t('loading')}
            </p>
          )}
          {categoriesQuery.error && (
            <p role="alert" aria-live="polite" className="text-sm text-red-800">
              {tErrors('UNEXPECTED')}
            </p>
          )}
          {categoriesQuery.data && (
            <ul className="space-y-1">
              {categoriesQuery.data.map((cat) => {
                const checked = selectedIds.includes(cat.id);
                const disableAdd = !checked && selectedIds.length >= CATEGORY_CHANGE_MAX;
                return (
                  <li key={cat.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disableAdd || mutation.isPending || limitReached}
                        onChange={(e) => toggleCategory(cat.id, e.target.checked)}
                        aria-describedby={disableAdd ? 'max-selection-help' : undefined}
                      />
                      <span>{cat.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {!cardinalityOk && (
            <p role="alert" aria-live="polite" className="text-sm text-red-800">
              {tValidation('categoriesRange')}
            </p>
          )}
          <p id="max-selection-help" className="sr-only">
            {t('fields.categories.maxHelp', { max: CATEGORY_CHANGE_MAX })}
          </p>
        </fieldset>

        {errorMessage && (
          <p
            role="alert"
            aria-live="polite"
            className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            {errorMessage}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={submitDisabled}
            aria-describedby={limitReached ? 'limit-reached-help' : undefined}
            aria-busy={mutation.isPending}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? t('buttons.submitting') : t('buttons.submit')}
          </button>
        </div>
        <p id="limit-reached-help" className="sr-only">
          {t('counter.reached')}
        </p>
      </form>

      <ConfirmMajorDialog
        isOpen={confirmOpen}
        submitting={mutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          runSubmit();
        }}
      />
    </section>
  );
}

interface ConfirmMajorDialogProps {
  isOpen: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmMajorDialog({
  isOpen,
  submitting,
  onCancel,
  onConfirm,
}: ConfirmMajorDialogProps): React.JSX.Element | null {
  const t = useTranslations('vendor.categories.change.confirm');
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && !submitting) {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    },
    [onCancel, submitting],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button
        type="button"
        aria-label="close overlay"
        onClick={submitting ? undefined : onCancel}
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
        tabIndex={-1}
      />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- role="dialog" es interactivo por naturaleza (WAI-ARIA); necesita capturar Tab/ESC. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-category-title"
        aria-describedby="confirm-category-desc"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 id="confirm-category-title" className="text-lg font-semibold">
          {t('title')}
        </h2>
        <p id="confirm-category-desc" className="mt-2 text-sm text-neutral-700">
          {t('description')}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            aria-busy={submitting}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
