'use client';

// Modal accesible de creación (US-044 / FE-002).
// A11Y: role="dialog", aria-modal="true", focus trap manual, ESC cierra, foco inicial en el
// primer input. Form con RHF + Zod espejo del backend POST. Errores mapeados desde el catálogo.
import { useEffect, useId, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useCreateVendorService } from '../hooks/vendorServicesQueries';
import {
  VENDOR_SERVICE_CURRENCY_CODES,
  type VendorServiceCurrencyCode,
} from '../api/vendorServicesApi.types';

const createServiceFormSchema = z.object({
  package_name: z
    .string()
    .trim()
    .min(2, 'INVALID_PACKAGE_NAME')
    .max(150, 'INVALID_PACKAGE_NAME'),
  description: z
    .string()
    .trim()
    .min(10, 'INVALID_DESCRIPTION')
    .max(2000, 'INVALID_DESCRIPTION'),
  base_price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'INVALID_PRICE'),
  currency_code: z.enum(['GTQ', 'EUR', 'MXN', 'COP', 'USD'] as const, {
    errorMap: () => ({ message: 'INVALID_CURRENCY' }),
  }),
  service_category_id: z.string().uuid('INVALID_CATEGORY'),
});

export type CreateServiceFormValues = z.infer<typeof createServiceFormSchema>;

export interface ServiceCategoryOption {
  id: string;
  code: string;
  label: string;
}

export interface CreateServiceDialogProps {
  isOpen: boolean;
  categories: ServiceCategoryOption[];
  onClose: () => void;
  onCreated: () => void;
}

interface ApiErrorShape {
  code?: unknown;
}

type ServerErrorCode =
  | 'INVALID_PACKAGE_NAME'
  | 'INVALID_PRICE'
  | 'INVALID_CURRENCY'
  | 'INVALID_DESCRIPTION'
  | 'INVALID_CATEGORY'
  | 'SERVICE_LIMIT_REACHED'
  | 'PROFILE_HIDDEN'
  | 'PROFILE_NOT_FOUND'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'UNEXPECTED';

const KNOWN_CODES: readonly ServerErrorCode[] = [
  'INVALID_PACKAGE_NAME',
  'INVALID_PRICE',
  'INVALID_CURRENCY',
  'INVALID_DESCRIPTION',
  'INVALID_CATEGORY',
  'SERVICE_LIMIT_REACHED',
  'PROFILE_HIDDEN',
  'PROFILE_NOT_FOUND',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
];

function resolveErrorCode(err: unknown): ServerErrorCode {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as ApiErrorShape).code;
    if (typeof code === 'string' && (KNOWN_CODES as readonly string[]).includes(code)) {
      return code as ServerErrorCode;
    }
  }
  return 'UNEXPECTED';
}

export function CreateServiceDialog({
  isOpen,
  categories,
  onClose,
  onCreated,
}: CreateServiceDialogProps): JSX.Element | null {
  const t = useTranslations('vendor.services');
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const create = useCreateVendorService();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateServiceFormValues>({
    resolver: zodResolver(createServiceFormSchema),
    defaultValues: {
      package_name: '',
      description: '',
      base_price: '',
      currency_code: 'GTQ' as VendorServiceCurrencyCode,
      service_category_id: categories[0]?.id ?? '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    firstFieldRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        onClose();
      }
      if (ev.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      reset();
      onCreated();
    } catch {
      // El error se muestra vía `create.error` en el bloque de UI de abajo.
    }
  });

  const serverErrorCode = create.error ? resolveErrorCode(create.error) : null;

  const { ref: firstNameRef, ...firstNameProps } = register('package_name');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
          {t('create.title')}
        </h2>
        <p className="mt-1 text-sm text-neutral-600">{t('create.subtitle')}</p>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-800">
              {t('create.fields.packageName.label')}
            </span>
            <input
              type="text"
              className="rounded border border-neutral-300 px-3 py-2 focus:border-neutral-600 focus:outline-none"
              {...firstNameProps}
              ref={(node) => {
                firstNameRef(node);
                firstFieldRef.current = node;
              }}
              aria-invalid={errors.package_name ? 'true' : undefined}
              aria-describedby={errors.package_name ? `${titleId}-pkg-err` : undefined}
            />
            {errors.package_name ? (
              <span
                id={`${titleId}-pkg-err`}
                role="alert"
                className="text-xs text-red-700"
              >
                {t(`errors.${errors.package_name.message ?? 'VALIDATION_ERROR'}`)}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-800">
              {t('create.fields.description.label')}
            </span>
            <textarea
              rows={4}
              className="rounded border border-neutral-300 px-3 py-2 focus:border-neutral-600 focus:outline-none"
              {...register('description')}
              aria-invalid={errors.description ? 'true' : undefined}
            />
            {errors.description ? (
              <span role="alert" className="text-xs text-red-700">
                {t(`errors.${errors.description.message ?? 'VALIDATION_ERROR'}`)}
              </span>
            ) : null}
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-800">
                {t('create.fields.basePrice.label')}
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="rounded border border-neutral-300 px-3 py-2 focus:border-neutral-600 focus:outline-none"
                {...register('base_price')}
                aria-invalid={errors.base_price ? 'true' : undefined}
              />
              {errors.base_price ? (
                <span role="alert" className="text-xs text-red-700">
                  {t(`errors.${errors.base_price.message ?? 'VALIDATION_ERROR'}`)}
                </span>
              ) : null}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-800">
                {t('create.fields.currency.label')}
              </span>
              <select
                className="rounded border border-neutral-300 px-3 py-2 focus:border-neutral-600 focus:outline-none"
                {...register('currency_code')}
              >
                {VENDOR_SERVICE_CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-800">
              {t('create.fields.category.label')}
            </span>
            <select
              className="rounded border border-neutral-300 px-3 py-2 focus:border-neutral-600 focus:outline-none"
              {...register('service_category_id')}
              aria-invalid={errors.service_category_id ? 'true' : undefined}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {serverErrorCode ? (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
              {t(`errors.${serverErrorCode}`)}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              {t('create.cancel')}
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-neutral-500"
            >
              {create.isPending ? t('create.submitting') : t('create.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
