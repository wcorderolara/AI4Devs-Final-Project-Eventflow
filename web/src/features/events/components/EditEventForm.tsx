'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import {
  EVENT_LANGUAGES,
  EVENT_TYPE_CODES,
  type EventModel,
  type UpdateEventRequestDTO,
} from '../api/eventsApi.types';
import { useUpdateEvent } from '../hooks/useEventsMutations';
import { useLocations } from '../hooks/useEventsQueries';
import { updateEventSchema, type UpdateEventFormValues } from '../schemas/eventSchemas';

/**
 * Formulario de edición de evento (US-010 / AC-04). Campos editables; la MONEDA no es editable
 * (AC-05) y se muestra sólo-lectura. En estados terminales la edición no se ofrece (el backend
 * devuelve 409/422; la UI ya oculta el acceso). En éxito navega al detalle.
 */
export function EditEventForm({ event }: { event: EventModel }): React.JSX.Element {
  const t = useTranslations('events');
  const router = useRouter();
  const mutation = useUpdateEvent(event.id);
  const locationsQuery = useLocations();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateEventFormValues>({
    resolver: zodResolver(updateEventSchema),
    defaultValues: {
      eventTypeCode: event.eventTypeCode,
      eventDate: event.eventDate,
      guestsCount: event.guestsCount,
      locationId: event.locationId,
      estimatedBudget: event.estimatedBudget,
      languageCode: event.languageCode,
      name: event.name ?? '',
      notes: event.notes ?? '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    const payload: UpdateEventRequestDTO = {
      eventTypeCode: values.eventTypeCode,
      eventDate: values.eventDate,
      guestsCount: values.guestsCount,
      locationId: values.locationId,
      estimatedBudget: values.estimatedBudget,
      languageCode: values.languageCode,
      name: values.name && values.name.trim() ? values.name.trim() : undefined,
      notes: values.notes && values.notes.trim() ? values.notes.trim() : null,
    };
    mutation.mutate(payload, {
      onSuccess: (updated) => router.push(`/organizer/events/${updated.id}`),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setGlobalError(t('errors.CURRENCY_IMMUTABLE'));
          return;
        }
        const code = error instanceof ApiError && error.status === 422 ? 'VALIDATION_ERROR' : 'UNEXPECTED';
        setGlobalError(t(`errors.${code}`));
      },
    });
  });

  const fieldError = (field: keyof UpdateEventFormValues, fallback: string): React.JSX.Element | null =>
    errors[field] ? (
      <p className="mt-1 text-sm text-red-700" aria-live="polite">
        {t(errors[field]?.message ?? fallback)}
      </p>
    ) : null;

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={mutation.isPending}>
      <h1 className="text-2xl font-bold">{t('edit.title')}</h1>

      {globalError ? (
        <div role="alert" aria-live="polite" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {globalError}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="edit-type" className="block text-sm font-medium">
            {t('fields.type')}
          </label>
          <select id="edit-type" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('eventTypeCode')}>
            {EVENT_TYPE_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`types.${code}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit-date" className="block text-sm font-medium">
            {t('fields.eventDate')}
          </label>
          <input id="edit-date" type="date" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('eventDate')} />
          {fieldError('eventDate', 'validation.dateInvalid')}
        </div>

        <div>
          <label htmlFor="edit-location" className="block text-sm font-medium">
            {t('fields.location')}
          </label>
          <select id="edit-location" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('locationId')}>
            <option value={event.locationId}>{t('edit.currentLocation')}</option>
            {(locationsQuery.data ?? [])
              .filter((loc) => loc.id !== event.locationId)
              .map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {[loc.city, loc.region, loc.country].filter(Boolean).join(', ')}
                </option>
              ))}
          </select>
          {fieldError('locationId', 'validation.locationRequired')}
        </div>

        <div>
          <label htmlFor="edit-guests" className="block text-sm font-medium">
            {t('fields.guests')}
          </label>
          <input id="edit-guests" type="number" min={1} className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('guestsCount')} />
          {fieldError('guestsCount', 'validation.guestsMin')}
        </div>

        <div>
          <label htmlFor="edit-budget" className="block text-sm font-medium">
            {t('fields.budget')}
          </label>
          <input id="edit-budget" type="text" inputMode="decimal" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('estimatedBudget')} />
          {fieldError('estimatedBudget', 'validation.budgetInvalid')}
        </div>

        <div>
          <label htmlFor="edit-currency" className="block text-sm font-medium">
            {t('fields.currency')}
          </label>
          <input id="edit-currency" type="text" value={event.currencyCode} readOnly aria-describedby="edit-currency-hint" className="mt-1 w-full rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-600" />
          <p id="edit-currency-hint" className="mt-1 text-xs text-neutral-500">
            {t('edit.currencyImmutable')}
          </p>
        </div>

        <div>
          <label htmlFor="edit-language" className="block text-sm font-medium">
            {t('fields.language')}
          </label>
          <select id="edit-language" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('languageCode')}>
            {EVENT_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="edit-name" className="block text-sm font-medium">
            {t('fields.name')}
          </label>
          <input id="edit-name" type="text" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('name')} />
        </div>

        <div>
          <label htmlFor="edit-notes" className="block text-sm font-medium">
            {t('fields.notes')}
          </label>
          <textarea id="edit-notes" rows={4} className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('notes')} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={mutation.isPending} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {mutation.isPending ? t('edit.saving') : t('edit.save')}
          </button>
          <button type="button" onClick={() => router.push(`/organizer/events/${event.id}`)} className="rounded border border-neutral-300 px-4 py-2 text-sm">
            {t('edit.cancelEdit')}
          </button>
        </div>
      </div>
    </form>
  );
}
