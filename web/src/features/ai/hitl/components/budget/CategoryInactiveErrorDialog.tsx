'use client';

// US-037 (PB-P1-021 / FE-005) — Modal de error D6. Se abre cuando el response es
// 409 CATEGORY_INACTIVE. Lista `inactive_categories` + CTAs deeplink a "Regenerar sugerencia"
// (US-019) y "Aplicar manualmente" (US-036 CRUD). A11Y completa.
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { InactiveCategoryDetail } from '../../hooks/useApplyBudgetSuggestion';

export interface CategoryInactiveErrorDialogProps {
  open: boolean;
  eventId: string;
  inactiveCategories: InactiveCategoryDetail[];
  onClose: () => void;
}

export function CategoryInactiveErrorDialog({
  open,
  eventId,
  inactiveCategories,
  onClose,
}: CategoryInactiveErrorDialogProps): JSX.Element | null {
  const t = useTranslations('ai.budgetApply.categoryInactive');
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="category-inactive-title"
        aria-describedby="category-inactive-desc"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl focus:outline-none"
        tabIndex={-1}
      >
        <h2 id="category-inactive-title" className="text-lg font-semibold">
          {t('title')}
        </h2>
        <p id="category-inactive-desc" className="mt-2 text-sm text-neutral-700">
          {t('body')}
        </p>

        <ul aria-label={t('listAria')} className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {inactiveCategories.map((c) => (
            <li key={c.code}>
              <span className="font-medium">{c.name}</span>
              <span className="ml-2 text-xs text-neutral-500">{`(${c.code})`}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-300 px-4 py-2 text-sm"
          >
            {t('cta.close')}
          </button>
          <Link
            href={`/organizer/events/${eventId}/ai/budget`}
            onClick={onClose}
            className="rounded border border-blue-600 px-4 py-2 text-center text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            {t('cta.regenerate')}
          </Link>
          <Link
            href={`/organizer/events/${eventId}/budget`}
            onClick={onClose}
            className="rounded bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('cta.manual')}
          </Link>
        </div>
      </div>
    </div>
  );
}
