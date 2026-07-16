'use client';

// BreakdownEditor (US-052 / FE-002).
// Editor dinámico de items del desglose. Cada fila expone `label` + `amount` con `aria-invalid`
// y errores etiquetados por `aria-describedby`. Los botones Add/Remove son navegables por
// teclado; el primer input recibe focus al agregar una nueva fila.
import { useEffect, useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type {
  Control,
  FieldErrors,
  UseFormRegister,
} from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import type { RespondFormValues } from './QuoteResponseForm';

/** Códigos de error i18n conocidos del breakdown; el resto cae a `UNKNOWN`. */
const BREAKDOWN_ITEM_ERRORS = ['INVALID_LABEL', 'INVALID_AMOUNT'] as const;
type BreakdownItemErrorCode = (typeof BREAKDOWN_ITEM_ERRORS)[number];

function knownItemError(code: unknown): BreakdownItemErrorCode | 'UNKNOWN' {
  return (BREAKDOWN_ITEM_ERRORS as readonly string[]).includes(String(code))
    ? (code as BreakdownItemErrorCode)
    : 'UNKNOWN';
}

export interface BreakdownEditorProps {
  control: Control<RespondFormValues>;
  register: UseFormRegister<RespondFormValues>;
  errors: FieldErrors<RespondFormValues>;
  currencyCode: string;
}

const MAX_ITEMS = 20;

export function BreakdownEditor({
  control,
  register,
  errors,
  currencyCode,
}: BreakdownEditorProps): JSX.Element {
  const t = useTranslations('vendor.qr.respond.breakdown');
  const listId = useId();
  const { fields, append, remove } = useFieldArray<RespondFormValues>({
    control,
    name: 'breakdown',
  });
  const lastAddedIndex = useRef<number | null>(null);
  const firstInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (lastAddedIndex.current === null) return;
    const el = firstInputRefs.current[lastAddedIndex.current];
    el?.focus();
    lastAddedIndex.current = null;
  }, [fields.length]);

  const atMax = fields.length >= MAX_ITEMS;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-neutral-900">{t('legend')}</legend>
      <p className="text-xs text-neutral-500">{t('help', { max: MAX_ITEMS })}</p>
      <ul aria-describedby={listId} className="space-y-2">
        {fields.map((field, index) => {
          const labelErr = errors.breakdown?.[index]?.label?.message;
          const amountErr = errors.breakdown?.[index]?.amount?.message;
          const labelReg = register(`breakdown.${index}.label` as const);
          return (
            <li key={field.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]">
              <div>
                <label className="block text-xs text-neutral-600" htmlFor={`bd-label-${index}`}>
                  {t('itemLabel')}
                </label>
                <input
                  id={`bd-label-${index}`}
                  type="text"
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                  aria-invalid={Boolean(labelErr)}
                  aria-describedby={labelErr ? `bd-label-err-${index}` : undefined}
                  name={labelReg.name}
                  onBlur={labelReg.onBlur}
                  onChange={labelReg.onChange}
                  ref={(el) => {
                    labelReg.ref(el);
                    firstInputRefs.current[index] = el;
                  }}
                />
                {labelErr && (
                  <p id={`bd-label-err-${index}`} className="mt-1 text-xs text-red-700">
                    {t(`errors.${knownItemError(labelErr)}`)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-neutral-600" htmlFor={`bd-amount-${index}`}>
                  {t('itemAmount', { currency: currencyCode })}
                </label>
                <input
                  id={`bd-amount-${index}`}
                  type="text"
                  inputMode="decimal"
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                  aria-invalid={Boolean(amountErr)}
                  aria-describedby={amountErr ? `bd-amount-err-${index}` : undefined}
                  {...register(`breakdown.${index}.amount` as const)}
                />
                {amountErr && (
                  <p id={`bd-amount-err-${index}`} className="mt-1 text-xs text-red-700">
                    {t(`errors.${knownItemError(amountErr)}`)}
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('removeAria', { index: index + 1 })}
                >
                  {t('remove')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => {
          lastAddedIndex.current = fields.length;
          append({ label: '', amount: '' });
        }}
        disabled={atMax}
        className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        aria-describedby={atMax ? listId : undefined}
      >
        {t('add')}
      </button>
      {atMax && (
        <p id={listId} className="text-xs text-red-700">
          {t('errors.MAX_ITEMS', { max: MAX_ITEMS })}
        </p>
      )}
    </fieldset>
  );
}
