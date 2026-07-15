'use client';

// US-035 (PB-P1-020 / FE-006) + US-036 (integración mutaciones) — Página del presupuesto.
// Combina: summary + banner overcommit + tabla items + empty state + acciones (add/edit/delete).
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ApiError } from '@/shared/api-client';
import { useEventBudget } from '../hooks/useEventBudget';
import { BudgetSummary } from '../components/BudgetSummary';
import { OvercommitWarning } from '../components/OvercommitWarning';
import { BudgetItemsTable } from '../components/BudgetItemsTable';
import { EmptyBudgetState } from '../components/EmptyBudgetState';
import { AddBudgetItemModal } from '@/features/budget/mutate/components/AddBudgetItemModal';
import { DeleteBudgetItemDialog } from '@/features/budget/mutate/components/DeleteBudgetItemDialog';
import {
  useCreateBudgetItem,
  useDeleteBudgetItem,
} from '@/features/budget/mutate/hooks/useBudgetItemMutations';
import type { BudgetItemDto } from '../api/budgetApi';

interface BudgetPageProps {
  eventId: string;
  readOnly?: boolean;
}

export function BudgetPage({ eventId, readOnly = false }: BudgetPageProps): React.JSX.Element {
  const t = useTranslations('budget.page');
  const locale = useLocale();
  const query = useEventBudget(eventId);
  const [showAdd, setShowAdd] = useState(false);
  const [toDelete, setToDelete] = useState<BudgetItemDto | null>(null);
  const createMut = useCreateBudgetItem(eventId);
  const deleteMut = useDeleteBudgetItem(eventId);

  const errorMsg = (err: unknown): string | null => (err instanceof ApiError ? err.message : null);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/organizer/events/${eventId}`}
          className="text-sm text-neutral-600 underline"
        >
          {t('back')}
        </Link>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            {t('addItemCta')}
          </button>
        ) : null}
      </div>

      <header>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
      </header>

      {query.isLoading ? (
        <div role="status" aria-live="polite" className="space-y-3" data-testid="budget-loading">
          <div className="h-6 w-1/3 animate-pulse rounded bg-neutral-200" />
          <div className="h-32 animate-pulse rounded bg-neutral-100" />
        </div>
      ) : null}

      {query.isError ? (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800" data-testid="budget-error">
          <p>{t('loadError')}</p>
        </div>
      ) : null}

      {query.data ? (
        <>
          <BudgetSummary summary={query.data.summary} locale={locale} />
          <OvercommitWarning visible={query.data.summary.over_committed} />
          {query.data.items.length === 0 ? (
            <EmptyBudgetState eventId={eventId} />
          ) : (
            <BudgetItemsTable
              items={query.data.items}
              currencyCode={query.data.summary.currency_code}
              locale={locale}
              onDelete={readOnly ? undefined : (item) => setToDelete(item)}
              readOnly={readOnly}
            />
          )}
        </>
      ) : null}

      <AddBudgetItemModal
        open={showAdd}
        submitting={createMut.isPending}
        errorMessage={errorMsg(createMut.error)}
        onCancel={() => {
          setShowAdd(false);
          createMut.reset();
        }}
        onSubmit={(values) => {
          createMut.mutate(values, {
            onSuccess: () => {
              setShowAdd(false);
              createMut.reset();
            },
          });
        }}
      />

      <DeleteBudgetItemDialog
        open={toDelete !== null}
        item={toDelete}
        submitting={deleteMut.isPending}
        errorMessage={errorMsg(deleteMut.error)}
        onCancel={() => {
          setToDelete(null);
          deleteMut.reset();
        }}
        onConfirm={() => {
          if (!toDelete) return;
          deleteMut.mutate(
            { itemId: toDelete.id },
            {
              onSuccess: () => {
                setToDelete(null);
                deleteMut.reset();
              },
            },
          );
        }}
      />
    </div>
  );
}
