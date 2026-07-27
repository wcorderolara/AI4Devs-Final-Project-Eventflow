'use client';

// EventQuotesPanel — panel de cotizaciones del dashboard del evento (tab «Quotes»).
//
// Consume `GET /events/:eventId/quote-requests` (US-096) y lista las solicitudes enviadas con su
// categoría, estado y fecha. Antes de este panel el endpoint existía en backend pero no tenía
// cliente en el front: el dashboard sólo mostraba un placeholder «próximamente».
//
// La categoría llega como UUID (`serviceCategoryId`); el label legible se resuelve contra
// `GET /service-categories` (`useServiceCategories`, cacheado 5 min y compartido con el wizard de
// vendor). Si la categoría no está en el catálogo —desactivada tras enviar la solicitud— se cae a
// un guion en lugar de mostrar el UUID.
//
// El comparador (US-057) requiere `categoryCode`, no el id, así que el enlace «comparar» sólo se
// ofrece para categorías presentes en el catálogo y con ≥ 2 solicitudes en esa categoría —que es
// la precondición del propio comparador.
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import { TextLink } from '@/shared/design-system/actions';
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '@/shared/design-system/feedback';
import type { StatusBadgeStatus } from '@/shared/design-system/feedback';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/design-system/data-display';
import { useServiceCategories } from '@/features/vendor-profile/hooks/useVendorProfileQueries';
import { useEventQuoteRequests } from '../hooks/quotesQueries';
import type { QuoteRequestStatus } from '../api/quotesApi.types';

/** Estado de dominio del QR → tono del `StatusBadge` (el texto sigue siendo la señal primaria). */
const STATUS_TONE: Record<QuoteRequestStatus, StatusBadgeStatus> = {
  sent: 'info',
  viewed: 'info',
  responded: 'success',
  expired: 'warning',
  cancelled: 'cancelled',
};

export interface EventQuotesPanelProps {
  eventId: string;
  /** `completed` / `cancelled` ocultan el CTA de nueva solicitud (el backend devolvería 409). */
  readOnly?: boolean;
}

export function EventQuotesPanel({
  eventId,
  readOnly = false,
}: EventQuotesPanelProps): React.JSX.Element {
  const t = useTranslations('quotes.eventPanel');
  const locale = useLocale();
  const query = useEventQuoteRequests({ eventId });
  const categories = useServiceCategories();

  const categoryById = useMemo(() => {
    const map = new Map<string, { code: string; label: string }>();
    for (const c of categories.data ?? []) map.set(c.id, { code: c.code, label: c.label });
    return map;
  }, [categories.data]);

  // Memoizado (y no un `?? []` inline) para que la identidad de la lista no cambie en cada render
  // y no invalide el `useMemo` del conteo por categoría.
  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  // Categorías con al menos una solicitud ya respondida: son las únicas en las que el comparador
  // tiene algo que enseñar. El comparador resuelve por su cuenta los casos de 1 y de ≥ 2 quotes,
  // así que no hace falta exigir un mínimo — sólo que exista alguna.
  const categoriesWithQuotes = useMemo(() => {
    const withQuotes = new Set<string>();
    for (const qr of items) {
      if (qr.status === 'responded') withQuotes.add(qr.serviceCategoryId);
    }
    return withQuotes;
  }, [items]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  );

  if (query.isLoading) {
    return (
      <div role="status" aria-live="polite" data-testid="event-quotes-loading">
        <span className="sr-only">{t('loading')}</span>
        <Skeleton variant="tableRow" count={3} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t('error.title')}
        description={t('error.description')}
        onRetry={() => {
          void query.refetch();
        }}
        retryLabel={t('error.retry')}
        data-testid="event-quotes-error"
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileText aria-hidden="true" className="h-icon-lg w-icon-lg" />}
        title={t('empty.title')}
        description={t('empty.description')}
        headingLevel={3}
        live
        primaryAction={
          readOnly ? undefined : (
            <TextLink href={`/organizer/events/${encodeURIComponent(eventId)}/quotes/new`}>
              {t('empty.cta')}
            </TextLink>
          )
        }
        data-testid="event-quotes-empty"
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="event-quotes-panel">
      {!readOnly ? (
        <div className="flex justify-end">
          <TextLink href={`/organizer/events/${encodeURIComponent(eventId)}/quotes/new`}>
            {t('actions.new')}
          </TextLink>
        </div>
      ) : null}

      <Table caption={t('tableCaption')} density="comfortable">
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col">{t('columns.category')}</TableHeaderCell>
            <TableHeaderCell scope="col">{t('columns.status')}</TableHeaderCell>
            <TableHeaderCell scope="col">{t('columns.sentAt')}</TableHeaderCell>
            <TableHeaderCell scope="col" align="end">
              {t('columns.actions')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((qr) => {
            const category = categoryById.get(qr.serviceCategoryId);
            // El comparador se direcciona por `categoryCode`, no por id: sin categoría resuelta
            // no hay enlace posible.
            const comparable =
              category !== undefined && categoriesWithQuotes.has(qr.serviceCategoryId);
            return (
              <TableRow key={qr.id}>
                <TableCell header>{category?.label ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={STATUS_TONE[qr.status]}>
                    {t(`status.${qr.status}`)}
                  </StatusBadge>
                </TableCell>
                <TableCell>{dateFormatter.format(new Date(qr.createdAt))}</TableCell>
                <TableCell align="end">
                  {comparable ? (
                    <TextLink
                      href={`/organizer/events/${encodeURIComponent(eventId)}/quotes/compare?categoryCode=${encodeURIComponent(category.code)}`}
                    >
                      {t('actions.compare')}
                    </TextLink>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
