'use client';

// Página «Nueva solicitud de cotización» (US-049 / FE-001).
// La URL sólo lleva identificadores cortos y públicos: `?vendor=<slug>&category=<code>`. El evento
// (ya en la ruta), el proveedor y la categoría se leen de la API; nada de lo que se muestra o se
// envía sale de texto editable en la URL. Sin proveedor, la página invita a elegirlo en el
// directorio.
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useEvent, useEventTypes, useLocations } from '@/features/events';
import type { PublicVendorDTO } from '@/features/vendor-public/api/vendorPublicApi.types';
import { httpGetData } from '@/shared/api-client';
import {
  ActionLink,
  EmptyState,
  ErrorState,
  FormField,
  Select,
  Skeleton,
} from '@/shared/design-system';
import { EventSnapshotCard } from './EventSnapshotCard';
import { QuoteRequestForm } from './QuoteRequestForm';
import { VendorCardSummary } from './VendorCardSummary';

interface ServiceCategoryFlatDTO {
  id: string;
  code: string;
}

export interface NewQuoteRequestPageProps {
  eventId: string;
  /** Slug público del proveedor (`?vendor=`). */
  vendorSlug: string | null;
  /** Código de la categoría (`?category=`). Opcional: por defecto, la única del proveedor. */
  categoryCode: string | null;
}

export function NewQuoteRequestPage({
  eventId,
  vendorSlug,
  categoryCode,
}: NewQuoteRequestPageProps): JSX.Element {
  const t = useTranslations('quotes.create');

  const event = useEvent(eventId);
  const eventTypes = useEventTypes();
  const locations = useLocations();
  const vendor = useQuery({
    queryKey: ['public-vendor', vendorSlug],
    queryFn: () => httpGetData<PublicVendorDTO>(`/public/vendors/${encodeURIComponent(vendorSlug ?? '')}`),
    enabled: Boolean(vendorSlug),
    retry: false,
  });
  const categories = useQuery({
    // Misma raíz que invalida la administración de categorías (`['service-categories']`).
    queryKey: ['service-categories', 'flat'],
    queryFn: () => httpGetData<{ flat: ServiceCategoryFlatDTO[] }>('/service-categories'),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const vendorCategories = vendor.data?.categories ?? [];
  const initialCategory =
    vendorCategories.find((c) => c.code === categoryCode)?.code ??
    (vendorCategories.length === 1 ? vendorCategories[0]!.code : '');
  const [chosenCategory, setChosenCategory] = useState<string | null>(null);
  const selectedCategory = chosenCategory ?? initialCategory;
  const serviceCategoryId =
    categories.data?.flat.find((c) => c.code === selectedCategory)?.id ?? '';

  const header = (
    <header>
      <h1 className="text-xl font-semibold text-neutral-900">{t('title')}</h1>
      <p className="mt-1 text-sm text-neutral-600">{t('subtitle')}</p>
    </header>
  );

  if (!vendorSlug) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        {header}
        <div className="mt-6">
          <EmptyState
            title={t('pickVendor.title')}
            description={t('pickVendor.body')}
            primaryAction={
              <ActionLink href="/organizer/vendors" variant="primary">
                {t('pickVendor.cta')}
              </ActionLink>
            }
          />
        </div>
      </main>
    );
  }

  const isLoading = event.isLoading || vendor.isLoading || categories.isLoading;
  const loadError = event.isError || vendor.isError || categories.isError;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      {header}

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : loadError || !event.data || !vendor.data ? (
        <div className="mt-6">
          <ErrorState
            title={t('loadError.title')}
            description={t('loadError.body')}
            secondaryAction={
              <ActionLink href="/organizer/vendors" variant="secondary">
                {t('pickVendor.cta')}
              </ActionLink>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EventSnapshotCard
              eventTitle={event.data.name}
              eventType={
                eventTypes.data?.find((type) => type.code === event.data.eventTypeCode)?.label ?? null
              }
              eventDate={event.data.eventDate}
              locationLabel={locationLabel(locations.data, event.data.locationId)}
              guestsCount={event.data.guestsCount}
              currencyCode={event.data.currencyCode}
            />
            <VendorCardSummary
              businessName={vendor.data.businessName}
              categoryLabel={vendorCategories.find((c) => c.code === selectedCategory)?.name ?? null}
              ratingAvg={vendor.data.ratingAvg}
              reviewsCount={vendor.data.reviewsCount}
            />
          </div>

          {vendorCategories.length > 1 ? (
            <div className="mt-6 max-w-sm">
              <FormField label={t('category.label')} required>
                {(control) => (
                  <Select
                    {...control}
                    value={selectedCategory}
                    onChange={(e) => setChosenCategory(e.target.value)}
                    placeholder={t('category.placeholder')}
                    options={vendorCategories.map((c) => ({ value: c.code, label: c.name }))}
                  />
                )}
              </FormField>
            </div>
          ) : null}

          {/* El formulario aparece cuando la categoría está resuelta: sin ella el backend
              rechazaría la solicitud (y el contador de solicitudes activas no aplica). */}
          {serviceCategoryId ? (
            <QuoteRequestForm
              eventId={eventId}
              vendorProfileId={vendor.data.id}
              serviceCategoryId={serviceCategoryId}
              successRedirect={`/organizer/events/${eventId}/quotes`}
            />
          ) : null}
        </>
      )}
    </main>
  );
}

function locationLabel(
  locations: Array<{ id: string; country: string; region: string | null; city: string | null }> | undefined,
  locationId: string,
): string | null {
  const location = locations?.find((l) => l.id === locationId);
  if (!location) return null;
  return [location.city, location.region, location.country].filter(Boolean).join(', ');
}
