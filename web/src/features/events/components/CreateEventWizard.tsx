'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { useSession } from '@/shared/auth-session';
import {
  EVENT_CURRENCIES,
  EVENT_LANGUAGES,
  EVENT_TYPE_CODES,
  type CreateEventRequestDTO,
  type LanguageCode,
} from '../api/eventsApi.types';
import { useCreateEvent } from '../hooks/useEventsMutations';
import { useEventTypes, useLocations } from '../hooks/useEventsQueries';
import { createEventSchema, type CreateEventFormValues } from '../schemas/eventSchemas';

const STEP_FIELDS: Array<Array<keyof CreateEventFormValues>> = [
  ['eventTypeCode', 'eventDate', 'locationId'],
  ['guestsCount', 'estimatedBudget', 'currencyCode', 'languageCode'],
  ['name', 'notes'],
];

function isSupportedLanguage(value: string | undefined): value is LanguageCode {
  return value != null && (EVENT_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Asistente de creación de evento (US-009 / AC-01). Wizard de 3 pasos sobre un único formulario
 * RHF+Zod: (1) tipo/fecha/ubicación, (2) invitados/presupuesto/moneda/idioma, (3) nombre/notas +
 * confirmación. La moneda queda fijada al crear (AC-05). El idioma toma por defecto el del perfil
 * (AC-03). En éxito el evento se crea en `draft` y navega al detalle (hook).
 */
export function CreateEventWizard(): React.JSX.Element {
  const t = useTranslations('events');
  const { user } = useSession();
  const eventTypesQuery = useEventTypes();
  const locationsQuery = useLocations();
  const mutation = useCreateEvent();
  const [step, setStep] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const defaultLanguage = isSupportedLanguage((user as { preferredLanguage?: string } | null)?.preferredLanguage)
    ? ((user as { preferredLanguage?: string }).preferredLanguage as LanguageCode)
    : 'es-LATAM';

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      eventTypeCode: undefined,
      eventDate: '',
      locationId: '',
      guestsCount: undefined,
      estimatedBudget: '',
      currencyCode: 'GTQ',
      languageCode: defaultLanguage,
      name: '',
      notes: '',
    },
  });

  const next = async (): Promise<void> => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(STEP_FIELDS.length - 1, s + 1));
  };
  const back = (): void => setStep((s) => Math.max(0, s - 1));

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    const payload: CreateEventRequestDTO = {
      eventTypeCode: values.eventTypeCode,
      eventDate: values.eventDate,
      guestsCount: values.guestsCount,
      locationId: values.locationId,
      estimatedBudget: values.estimatedBudget,
      currencyCode: values.currencyCode,
      languageCode: values.languageCode,
      ...(values.name && values.name.trim() ? { name: values.name.trim() } : {}),
      ...(values.notes && values.notes.trim() ? { notes: values.notes.trim() } : {}),
    };
    mutation.mutate(payload, {
      onError: (error) => {
        const code = error instanceof ApiError && error.status === 422 ? 'VALIDATION_ERROR' : 'UNEXPECTED';
        setGlobalError(t(`errors.${code}`));
      },
    });
  });

  const fieldError = (field: keyof CreateEventFormValues, fallback: string): React.JSX.Element | null =>
    errors[field] ? (
      <p className="mt-1 text-sm text-red-700" aria-live="polite">
        {t(errors[field]?.message ?? fallback)}
      </p>
    ) : null;

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate aria-busy={mutation.isPending}>
      <h1 className="text-2xl font-bold">{t('create.title')}</h1>
      <ol className="mt-4 flex gap-2" aria-label={t('create.steps')}>
        {STEP_FIELDS.map((_, i) => (
          <li
            key={i}
            aria-current={i === step ? 'step' : undefined}
            className={`flex-1 rounded px-3 py-1.5 text-center text-xs ${
              i === step ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {t(`create.step${i + 1}`)}
          </li>
        ))}
      </ol>

      {globalError ? (
        <div role="alert" aria-live="polite" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {globalError}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        {step === 0 ? (
          <>
            <div>
              <label htmlFor="event-type" className="block text-sm font-medium">
                {t('fields.type')}
              </label>
              <select id="event-type" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('eventTypeCode')}>
                <option value="">{t('create.selectType')}</option>
                {(eventTypesQuery.data ?? EVENT_TYPE_CODES.map((code) => ({ code, label: '' }))).map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {t(`types.${opt.code}`)}
                  </option>
                ))}
              </select>
              {fieldError('eventTypeCode', 'validation.typeRequired')}
            </div>

            <div>
              <label htmlFor="event-date" className="block text-sm font-medium">
                {t('fields.eventDate')}
              </label>
              <input id="event-date" type="date" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('eventDate')} />
              {fieldError('eventDate', 'validation.dateInvalid')}
            </div>

            <div>
              <label htmlFor="event-location" className="block text-sm font-medium">
                {t('fields.location')}
              </label>
              <select id="event-location" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('locationId')}>
                <option value="">{t('create.selectLocation')}</option>
                {(locationsQuery.data ?? []).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {[loc.city, loc.region, loc.country].filter(Boolean).join(', ')}
                  </option>
                ))}
              </select>
              {fieldError('locationId', 'validation.locationRequired')}
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div>
              <label htmlFor="event-guests" className="block text-sm font-medium">
                {t('fields.guests')}
              </label>
              <input id="event-guests" type="number" min={1} className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('guestsCount')} />
              {fieldError('guestsCount', 'validation.guestsMin')}
            </div>

            <div>
              <label htmlFor="event-budget" className="block text-sm font-medium">
                {t('fields.budget')}
              </label>
              <input id="event-budget" type="text" inputMode="decimal" placeholder="0.00" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('estimatedBudget')} />
              {fieldError('estimatedBudget', 'validation.budgetInvalid')}
            </div>

            <div>
              <label htmlFor="event-currency" className="block text-sm font-medium">
                {t('fields.currency')}
              </label>
              <select id="event-currency" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('currencyCode')}>
                {EVENT_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">{t('create.currencyLock')}</p>
            </div>

            <div>
              <label htmlFor="event-language" className="block text-sm font-medium">
                {t('fields.language')}
              </label>
              <select id="event-language" className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('languageCode')}>
                {EVENT_LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div>
              <label htmlFor="event-name" className="block text-sm font-medium">
                {t('fields.name')}
              </label>
              <input id="event-name" type="text" placeholder={t('create.namePlaceholder')} className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('name')} />
            </div>

            <div>
              <label htmlFor="event-notes" className="block text-sm font-medium">
                {t('fields.notes')}
              </label>
              <textarea id="event-notes" rows={4} className="mt-1 w-full rounded border border-neutral-300 px-3 py-2" {...register('notes')} />
            </div>
            <p className="text-sm text-neutral-600">{t('create.confirmHint')}</p>
          </>
        ) : null}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || mutation.isPending}
          className="rounded border border-neutral-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          {t('create.back')}
        </button>

        {step < STEP_FIELDS.length - 1 ? (
          <button type="button" onClick={() => void next()} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
            {t('create.next')}
          </button>
        ) : (
          <button type="submit" disabled={mutation.isPending} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {mutation.isPending ? t('create.submitting') : t('create.submit')}
          </button>
        )}
      </div>
    </form>
  );
}
