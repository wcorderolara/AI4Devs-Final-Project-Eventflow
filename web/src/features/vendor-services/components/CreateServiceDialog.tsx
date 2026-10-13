'use client';

// Modal de creación (US-044 / FE-002) sobre el `Modal` del design system: focus trap, ESC
// cierra y foco inicial en el primer input. Form con RHF + Zod espejo del backend POST. Errores
// mapeados desde el catálogo.
import { useId, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Alert, Button, Modal } from '@/shared/design-system';
import { resolveErrorCode } from '@/shared/error-handling/errorCodeMessages';
import { useCreateVendorService } from '../hooks/vendorServicesQueries';
import {
  VENDOR_SERVICE_CURRENCY_CODES,
  type VendorServiceCurrencyCode,
} from '../api/vendorServicesApi.types';

const createServiceFormSchema = z.object({
  package_name: z.string().trim().min(2, 'INVALID_PACKAGE_NAME').max(150, 'INVALID_PACKAGE_NAME'),
  description: z.string().trim().min(10, 'INVALID_DESCRIPTION').max(2000, 'INVALID_DESCRIPTION'),
  base_price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'INVALID_PRICE'),
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

export function CreateServiceDialog({
  isOpen,
  categories,
  onClose,
  onCreated,
}: CreateServiceDialogProps): JSX.Element {
  const t = useTranslations('vendor.services');
  const titleId = useId();
  const formId = `${titleId}-form`;
  const firstFieldRef = useRef<HTMLElement | null>(null);
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      reset();
      onCreated();
    } catch {
      // El error se muestra vía `create.error` en el bloque de UI de abajo.
    }
  });

  const serverErrorCode = create.error ? resolveErrorCode(create.error, KNOWN_CODES) : null;

  const { ref: firstNameRef, ...firstNameProps } = register('package_name');

  const cancel = (): void => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t('create.title')}
      description={t('create.subtitle')}
      showCloseButton={false}
      // Un clic fuera perdería lo escrito; `Esc` y Cancelar siguen disponibles.
      closeOnOverlayClick={false}
      initialFocus={firstFieldRef}
      footer={
        <>
          <Button variant="secondary" onClick={cancel}>
            {t('create.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            isLoading={create.isPending}
            loadingLabel={t('create.submitting')}
          >
            {t('create.submit')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4">
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
            <span id={`${titleId}-pkg-err`} role="alert" className="text-xs text-red-700">
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
          <span className="font-medium text-neutral-800">{t('create.fields.category.label')}</span>
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
          <Alert variant="error" live>
            {t(`errors.${serverErrorCode}`)}
          </Alert>
        ) : null}
      </form>
    </Modal>
  );
}
