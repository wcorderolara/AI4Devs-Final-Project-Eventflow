'use client';

// US-035 (PB-P1-020 / FE-006) + US-036 (integración mutaciones) — Página del presupuesto.
// Combina: summary + banner overcommit + tabla items + empty state + acciones (add/edit/delete).
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/design-system';
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
  /**
   * `true` cuando la vista se monta dentro del tab «Budget» del dashboard del evento: suprime el
   * cromo propio de la ruta standalone (enlace «volver» y `<h1>`, que ya aporta el dashboard) y
   * el contenedor centrado, para que herede el ancho del panel. La ruta
   * `/organizer/events/:id/budget` sigue montándola sin la prop y conserva su cabecera.
   */
  embedded?: boolean;
}

export function BudgetPage({
  eventId,
  readOnly = false,
  embedded = false,
}: BudgetPageProps): React.JSX.Element {
  const t = useTranslations('budget.page');
  const locale = useLocale();
  const query = useEventBudget(eventId);
  const [showAdd, setShowAdd] = useState(false);
  const [toDelete, setToDelete] = useState<BudgetItemDto | null>(null);
  const createMut = useCreateBudgetItem(eventId);
  const deleteMut = useDeleteBudgetItem(eventId);

  const errorMsg = (err: unknown): string | null => (err instanceof ApiError ? err.message : null);

  return (
    <div className={embedded ? 'w-full space-y-6' : 'mx-auto w-full max-w-4xl space-y-6'}>
      <div className={embedded ? 'flex items-center justify-end' : 'flex items-center justify-between'}>
        {!embedded ? (
          <Link
            href={`/organizer/events/${eventId}`}
            className="text-sm text-neutral-600 underline"
          >
            {t('back')}
          </Link>
        ) : null}
        {!readOnly ? (
          // `bg-blue-600` era azul crudo de Tailwind, ajeno a la paleta violeta de la marca y
          // muy visible junto al resto del detalle del evento. Pasa al `Button` del design system.
          <Button
            leadingIcon={<Plus aria-hidden="true" className="h-icon-sm w-icon-sm" />}
            onClick={() => setShowAdd(true)}
          >
            {t('addItemCta')}
          </Button>
        ) : null}
      </div>

      {!embedded ? (
        <header>
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        </header>
      ) : null}

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
          <BudgetSummary
            summary={query.data.summary}
            locale={locale}
            // US-064 (FE-002 / AC-05): botón manual "Actualizar presupuesto" — safety net
            // independiente de las invalidaciones automáticas por confirm/cancel de BookingIntent.
            onRefresh={() => {
              void query.refetch();
            }}
            isRefreshing={query.isFetching}
          />
          <OvercommitWarning
            visible={query.data.summary.over_committed}
            summary={query.data.summary}
            eventId={eventId}
            locale={locale}
          />
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
