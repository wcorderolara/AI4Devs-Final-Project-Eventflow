'use client';

// Tabla semántica de VendorService (US-044 / FE-001).
// A11Y: `<th scope="col">`, contador "N/50" con `aria-live="polite"`, botones con `aria-label`.
// Mobile-first: la tabla mantiene layout tabular en desktop y colapsa a cards apiladas en
// mobile mediante utilidades Tailwind. El toggle de reactivación consume `useUpdateVendorService`.
//
// PB-P2-033: compone las primitivas `Table` del design system. La CTA de creación pasa a
// `Button` primario (violeta de marca) en lugar del negro de marketing, y el estado del paquete
// a `StatusBadge`.
import { useTranslations } from 'next-intl';
import {
  Button,
  EmptyState,
  ErrorState,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/design-system';
import type { VendorServiceView } from '../api/vendorServicesApi.types';
import { useUpdateVendorService } from '../hooks/vendorServicesQueries';

const ACTIVE_LIMIT = 50;

export interface VendorServiceTableProps {
  items: VendorServiceView[];
  onRequestDeactivate: (service: VendorServiceView) => void;
  onRequestCreate: () => void;
  isLoading: boolean;
  error?: Error | null;
}

export function VendorServiceTable({
  items,
  onRequestDeactivate,
  onRequestCreate,
  isLoading,
  error,
}: VendorServiceTableProps): JSX.Element {
  const t = useTranslations('vendor.services');
  const activeCount = items.filter((it) => it.isActive).length;
  const reactivate = useUpdateVendorService();

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="p-6 font-body text-body-sm text-muted">
        {t('table.loading')}
      </div>
    );
  }

  if (error) {
    return <ErrorState title={t('table.error')} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className="font-body text-body-sm text-secondary"
          data-testid="vendor-services-counter"
        >
          {t('counter.value', { active: activeCount, max: ACTIVE_LIMIT })}
        </p>
        <Button onClick={onRequestCreate}>{t('actions.create')}</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <Table
          caption={t('table.caption')}
          containerClassName="rounded-card border border-subtle bg-surface"
        >
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t('table.headers.packageName')}</TableHeaderCell>
              <TableHeaderCell align="numeric">{t('table.headers.basePrice')}</TableHeaderCell>
              <TableHeaderCell>{t('table.headers.currency')}</TableHeaderCell>
              <TableHeaderCell>{t('table.headers.status')}</TableHeaderCell>
              <TableHeaderCell align="end">{t('table.headers.actions')}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((service) => (
              <TableRow key={service.id}>
                <TableCell
                  header
                  description={<span className="line-clamp-2">{service.description}</span>}
                >
                  {service.packageName}
                </TableCell>
                <TableCell align="numeric">{service.basePrice}</TableCell>
                <TableCell>{service.currencyCode}</TableCell>
                <TableCell>
                  <StatusBadge status={service.isActive ? 'success' : 'neutral'}>
                    {service.isActive ? t('status.active') : t('status.inactive')}
                  </StatusBadge>
                </TableCell>
                <TableCell align="end">
                  {service.isActive ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onRequestDeactivate(service)}
                      aria-label={t('actions.deactivateAria', { name: service.packageName })}
                    >
                      {t('actions.deactivate')}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        reactivate.mutate({ id: service.id, input: { is_active: true } });
                      }}
                      disabled={reactivate.isPending}
                      isLoading={reactivate.isPending}
                      loadingLabel={t('actions.reactivating')}
                      aria-label={t('actions.reactivateAria', { name: service.packageName })}
                    >
                      {t('actions.reactivate')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
