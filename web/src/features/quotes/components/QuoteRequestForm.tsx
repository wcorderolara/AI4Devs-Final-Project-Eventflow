'use client';

// QuoteRequestForm (US-049 / FE-002).
// RHF + Zod espejo del backend `createQuoteRequestUs049BodySchema`. A11Y: labels semánticos,
// `aria-invalid` + `aria-describedby` para errores, banner accesible por código i18n cuando el
// backend rechaza. i18n vía `next-intl` (`quotes.create.*`).
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCreateQuoteRequest } from '../hooks/quotesQueries';
import type { QuoteRequestSource } from '../api/quotesApi.types';
import { ApiError } from '@/shared/api-client';

/** Códigos de error del backend que renderizan un mensaje i18n dedicado. */
const KNOWN_ERROR_CODES = [
  'EVENT_NOT_FOUND',
  'EVENT_NOT_ACTIVE',
  'VENDOR_NOT_AVAILABLE',
  'INVALID_BRIEF',
  'INVALID_CATEGORY',
  'QR_ALREADY_ACTIVE',
  'QR_CATEGORY_LIMIT_REACHED',
  'RATE_LIMIT_EXCEEDED',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

const formSchema = z.object({
  budget: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'INVALID_BRIEF'),
  message: z.string().trim().max(5000, 'INVALID_BRIEF'),
});
type FormValues = z.infer<typeof formSchema>;

export interface QuoteRequestFormProps {
  eventId: string;
  vendorProfileId: string;
  serviceCategoryId: string;
  source?: QuoteRequestSource;
  successRedirect: string;
}

export function QuoteRequestForm(props: QuoteRequestFormProps): JSX.Element {
  const t = useTranslations('quotes.create');
  const tError = useTranslations('quotes.create.errors');
  const router = useRouter();
  const mutation = useCreateQuoteRequest();
  const budgetId = useId();
  const messageId = useId();
  const budgetErrorId = useId();
  const messageErrorId = useId();
  const bannerId = useId();
  const [serverErrorCode, setServerErrorCode] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { budget: '', message: '' },
    mode: 'onSubmit',
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerErrorCode(null);
    try {
      const view = await mutation.mutateAsync({
        event_id: props.eventId,
        vendor_profile_id: props.vendorProfileId,
        service_category_id: props.serviceCategoryId,
        brief: { budget: values.budget, message: values.message },
        source: props.source ?? 'manual',
      });
      router.push(`${props.successRedirect}?qrId=${view.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerErrorCode(err.code);
      } else {
        setServerErrorCode('UNEXPECTED');
      }
    }
  });

  const bannerMessage = serverErrorCode
    ? isKnownErrorCode(serverErrorCode)
      ? tError(serverErrorCode)
      : tError('UNEXPECTED')
    : null;

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4" aria-describedby={bannerMessage ? bannerId : undefined}>
      {bannerMessage != null && (
        <div
          id={bannerId}
          role="alert"
          aria-live="polite"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {bannerMessage}
        </div>
      )}

      <div>
        <label htmlFor={budgetId} className="block text-sm font-medium text-neutral-800">
          {t('fields.budget.label')}
        </label>
        <input
          id={budgetId}
          type="text"
          inputMode="decimal"
          {...register('budget')}
          aria-invalid={errors.budget != null}
          aria-describedby={errors.budget ? budgetErrorId : undefined}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder={t('fields.budget.placeholder')}
        />
        {errors.budget && (
          <p id={budgetErrorId} className="mt-1 text-xs text-red-700">
            {tError('INVALID_BRIEF_BUDGET')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={messageId} className="block text-sm font-medium text-neutral-800">
          {t('fields.message.label')}
        </label>
        <textarea
          id={messageId}
          rows={5}
          {...register('message')}
          aria-invalid={errors.message != null}
          aria-describedby={errors.message ? messageErrorId : undefined}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder={t('fields.message.placeholder')}
        />
        {errors.message && (
          <p id={messageErrorId} className="mt-1 text-xs text-red-700">
            {tError('INVALID_BRIEF_MESSAGE')}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t('actions.submitting') : t('actions.submit')}
        </button>
      </div>
    </form>
  );
}
