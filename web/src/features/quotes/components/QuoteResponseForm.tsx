'use client';

// QuoteResponseForm (US-052 / FE-002).
// RHF + Zod espejo del backend `respondQuoteRequestBodySchema`. Cálculo cliente de la suma del
// desglose con tolerancia ±0.01 e indicador visual de match/mismatch (`aria-live="polite"`).
// La `currency` es read-only y proviene del detalle del QR (heredada del evento — DEV-04).
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRespondVendorQr } from '../hooks/vendorQrQueries';
import { BreakdownEditor } from './BreakdownEditor';
import { ApiError } from '@/shared/api-client';

const DECIMAL_2 = /^\d+(\.\d{1,2})?$/;

const KNOWN_ERROR_CODES = [
  'QR_NOT_FOUND',
  'QR_NOT_RESPONDABLE',
  'QUOTE_ALREADY_EXISTS',
  'INVALID_TOTAL',
  'INVALID_BREAKDOWN',
  'INVALID_BREAKDOWN_ITEM',
  'INVALID_BREAKDOWN_SUM',
  'INVALID_VALID_UNTIL',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string | undefined): code is KnownErrorCode {
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

const formSchema = z
  .object({
    total_price: z.string().regex(DECIMAL_2, 'INVALID_TOTAL'),
    breakdown: z
      .array(
        z.object({
          label: z.string().min(1, 'INVALID_LABEL').max(150, 'INVALID_LABEL'),
          amount: z.string().regex(DECIMAL_2, 'INVALID_AMOUNT'),
        }),
      )
      .min(1, 'INVALID_BREAKDOWN')
      .max(20, 'INVALID_BREAKDOWN'),
    conditions: z.string().max(2000).optional(),
    valid_until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'INVALID_VALID_UNTIL')
      .optional()
      .or(z.literal('')),
  })
  .refine((v) => Number.parseFloat(v.total_price) > 0, {
    message: 'INVALID_TOTAL',
    path: ['total_price'],
  })
  .refine(
    (v) => {
      const sum = v.breakdown.reduce((a, it) => a + Number.parseFloat(it.amount || '0'), 0);
      return Math.abs(sum - Number.parseFloat(v.total_price || '0')) <= 0.01;
    },
    { message: 'INVALID_BREAKDOWN_SUM', path: ['breakdown'] },
  );

export type RespondFormValues = z.infer<typeof formSchema>;

export interface QuoteResponseFormProps {
  qrId: string;
  currencyCode: string;
  successRedirect: string;
}

export function QuoteResponseForm({
  qrId,
  currencyCode,
  successRedirect,
}: QuoteResponseFormProps): JSX.Element {
  const t = useTranslations('vendor.qr.respond');
  const tError = useTranslations('vendor.qr.respond.errors');
  const router = useRouter();
  const mutation = useRespondVendorQr(qrId);

  const totalId = useId();
  const totalErrId = useId();
  const conditionsId = useId();
  const validUntilId = useId();
  const sumIndicatorId = useId();
  const bannerId = useId();

  const [serverErrorCode, setServerErrorCode] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RespondFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      total_price: '',
      breakdown: [{ label: '', amount: '' }],
      conditions: '',
      valid_until: '',
    },
    mode: 'onSubmit',
  });

  const totalValue = watch('total_price');
  const breakdownValues = watch('breakdown');
  const liveSum = useMemo(() => {
    return breakdownValues.reduce((a, it) => {
      const n = Number.parseFloat(it?.amount ?? '');
      return a + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [breakdownValues]);
  const totalNumber = Number.parseFloat(totalValue || '0');
  const sumMatches = Math.abs(liveSum - totalNumber) <= 0.01;

  async function onSubmit(values: RespondFormValues): Promise<void> {
    setServerErrorCode(null);
    try {
      await mutation.mutateAsync({
        total_price: values.total_price,
        breakdown: values.breakdown,
        conditions: values.conditions?.trim() ? values.conditions.trim() : undefined,
        valid_until: values.valid_until?.trim() ? values.valid_until.trim() : undefined,
      });
      router.push(successRedirect);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerErrorCode(err.code);
        return;
      }
      setServerErrorCode('UNEXPECTED');
    }
  }

  const totalErr = errors.total_price?.message;
  const validUntilErr = errors.valid_until?.message;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-describedby={serverErrorCode ? bannerId : undefined}
      className="space-y-6"
    >
      {serverErrorCode && (
        <div
          id={bannerId}
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {isKnownErrorCode(serverErrorCode) ? tError(serverErrorCode) : tError('UNEXPECTED')}
        </div>
      )}

      <div>
        <label htmlFor={totalId} className="block text-sm font-medium text-neutral-900">
          {t('total', { currency: currencyCode })}
        </label>
        <input
          id={totalId}
          type="text"
          inputMode="decimal"
          className="mt-1 w-full max-w-xs rounded border border-neutral-300 px-3 py-2 text-sm"
          aria-invalid={Boolean(totalErr)}
          aria-describedby={totalErr ? totalErrId : sumIndicatorId}
          {...register('total_price')}
        />
        {totalErr && (
          <p id={totalErrId} className="mt-1 text-xs text-red-700">
            {tError(String(totalErr) as KnownErrorCode)}
          </p>
        )}
        <p
          id={sumIndicatorId}
          aria-live="polite"
          className={`mt-1 text-xs ${sumMatches ? 'text-emerald-700' : 'text-amber-700'}`}
        >
          {t('sumIndicator', {
            sum: liveSum.toFixed(2),
            total: (Number.isFinite(totalNumber) ? totalNumber : 0).toFixed(2),
          })}
        </p>
      </div>

      <BreakdownEditor
        control={control}
        register={register}
        errors={errors}
        currencyCode={currencyCode}
      />

      <div>
        <label htmlFor={conditionsId} className="block text-sm font-medium text-neutral-900">
          {t('conditions')}
        </label>
        <textarea
          id={conditionsId}
          rows={3}
          maxLength={2000}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          {...register('conditions')}
        />
      </div>

      <div>
        <label htmlFor={validUntilId} className="block text-sm font-medium text-neutral-900">
          {t('validUntil')}
        </label>
        <input
          id={validUntilId}
          type="date"
          className="mt-1 w-full max-w-xs rounded border border-neutral-300 px-3 py-2 text-sm"
          aria-invalid={Boolean(validUntilErr)}
          {...register('valid_until')}
        />
        {validUntilErr && (
          <p className="mt-1 text-xs text-red-700">
            {tError(String(validUntilErr) as KnownErrorCode)}
          </p>
        )}
        <p className="mt-1 text-xs text-neutral-500">{t('validUntilHelp')}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}
