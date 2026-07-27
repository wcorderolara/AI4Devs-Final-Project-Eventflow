'use client';

// US-078 / FE-003 — Tabla admin de eventos (paridad `VendorModerationTable`).
// - Semántica: `<table>` con `<caption sr-only>` + `<th scope='col'>`; link "Ver detalle"
//   con `aria-label` que referencia el título del evento.
// - Status badge complementa color con texto i18n (no color-only).
// - Empty/loading/error/next-page states con literales i18n.
//
// PB-P2-033: compone las primitivas `Table` del design system y sustituye los badges de estado
// con paleta cruda por `StatusBadge`, que ya mapea estado → tono semántico y garantiza que el
// color no sea la única señal (UI-DEC-014).

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  STATUS_BADGE_TONE,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextLink,
} from '@/shared/design-system';
import { Money } from '@/shared/i18n';
import type { AdminEventListItemModel, AdminEventsListFilters } from '../api/adminEventsApi.types';
import { useAdminEventsList } from '../hooks/adminEventsQueries';

interface Props {
  filters: AdminEventsListFilters;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(value));
  } catch {
    return value.slice(0, 10);
  }
}

function EstimatedBudgetCell({
  value,
  currency,
}: {
  value: string | null;
  currency: string;
}): React.JSX.Element {
  if (!value) return <>—</>;
  const n = Number(value);
  if (Number.isNaN(n)) return <>{`${currency} ${value}`}</>;
  return <Money amount={n} currency={currency} />;
}

export function AdminEventTable({ filters }: Props): React.JSX.Element {
  const t = useTranslations('admin.events.list');
  const tStatus = useTranslations('admin.events.status');

  const query = useAdminEventsList(filters);

  const items = useMemo<AdminEventListItemModel[]>(
    () => (query.data?.pages ?? []).flatMap((p) => p.items),
    [query.data],
  );

  if (query.isPending) {
    return (
      <p role="status" className="font-body text-body-sm text-secondary">
        {t('loading')}
      </p>
    );
  }

  if (query.isError) {
    return <ErrorState title={t('error')} />;
  }

  if (items.length === 0) {
    return <EmptyState title={t('empty')} />;
  }

  // El locale nativo del navegador es aceptable para render de moneda/fecha en el panel admin
  // (no requiere i18n riguroso; el layout ya provee `<html lang>`).
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'es-419';

  return (
    <div className="space-y-3">
      <Table
        caption={t('caption')}
        density="compact"
        containerClassName="rounded-card border border-subtle bg-surface"
      >
        <TableHead>
          <TableRow>
            <TableHeaderCell density="compact">{t('col.title')}</TableHeaderCell>
            <TableHeaderCell density="compact">{t('col.status')}</TableHeaderCell>
            <TableHeaderCell density="compact">{t('col.eventType')}</TableHeaderCell>
            <TableHeaderCell density="compact">{t('col.owner')}</TableHeaderCell>
            <TableHeaderCell density="compact">{t('col.eventDate')}</TableHeaderCell>
            <TableHeaderCell density="compact" align="numeric">
              {t('col.guests')}
            </TableHeaderCell>
            <TableHeaderCell density="compact" align="numeric">
              {t('col.estimatedBudget')}
            </TableHeaderCell>
            <TableHeaderCell density="compact" align="end">
              {t('col.actions')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((ev) => (
            <TableRow key={ev.id} className={ev.deletedAt ? 'opacity-muted' : undefined}>
              <TableCell density="compact" header>
                <span className="block max-w-xs truncate">{ev.title}</span>
                {ev.deletedAt ? <Badge className="mt-1">{t('deletedBadge')}</Badge> : null}
              </TableCell>
              <TableCell density="compact">
                {/* `STATUS_BADGE_TONE` mapea el estado de dominio al tono aprobado; el texto
                    traducido sigue siendo la señal primaria. */}
                <StatusBadge status={STATUS_BADGE_TONE[ev.status] ?? 'neutral'}>
                  {tStatus(ev.status)}
                </StatusBadge>
              </TableCell>
              <TableCell density="compact">{ev.eventType.label}</TableCell>
              <TableCell
                density="compact"
                description={ev.owner.fullName ? ev.owner.email : undefined}
              >
                {ev.owner.fullName ?? ev.owner.email}
              </TableCell>
              <TableCell density="compact">{formatDate(ev.eventDate, locale)}</TableCell>
              <TableCell density="compact" align="numeric">
                {ev.guestsCount ?? '—'}
              </TableCell>
              <TableCell density="compact" align="numeric">
                <EstimatedBudgetCell value={ev.estimatedBudget} currency={ev.currency} />
              </TableCell>
              <TableCell density="compact" align="end">
                {/* Navegación: es un enlace, no un botón (Component Foundations §23 — la acción
                    de fila vive en una celda de acciones con nombre accesible propio). */}
                <TextLink
                  href={`/admin/events/${ev.id}`}
                  aria-label={t('viewAria', { title: ev.title })}
                  className="text-body-sm"
                >
                  {t('view')}
                </TextLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {query.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? t('loadingMore') : t('loadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
