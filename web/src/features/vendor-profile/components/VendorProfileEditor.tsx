'use client';

// VendorProfileEditor (US-041 / FE-002, AC-01..03 / AC-06 / AC-09).
// Form RHF+Zod parcial (todos los campos opcionales); tracking de `isDirtyMajor` para mostrar
// warning previo al submit cuando `status='approved'` (D2). Renderiza banner "En revisión"
// cuando `repending=true` en el response (AC-02).
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api-client';
import { useLocations } from '@/features/events/hooks/useEventsQueries';
import {
  editVendorProfileSchema,
  MAJOR_EDITOR_FIELDS,
  type EditVendorProfileValues,
} from '../schemas/editVendorProfileSchema';
import { useUpdateVendorProfile } from '../hooks/useVendorProfileMutations';
import { DeleteProfileDialog } from './DeleteProfileDialog';
import { useSoftDeleteVendorProfile } from '../hooks/useVendorProfileMutations';
import type {
  UpdateVendorProfileRequestDTO,
  UpdateVendorProfileResultDTO,
  VendorProfileDTO,
  VendorProfileStatus,
} from '../api/vendorProfileApi.types';

const KNOWN_ERROR_CODES = new Set([
  'PROFILE_REJECTED',
  'PROFILE_HIDDEN',
  'PROFILE_DELETED',
  'PROFILE_NOT_FOUND',
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
]);

interface VendorProfileEditorProps {
  profile: VendorProfileDTO;
  onSaved?: (result: UpdateVendorProfileResultDTO) => void;
  onDeleted?: () => void;
}

export function VendorProfileEditor({
  profile,
  onSaved,
  onDeleted,
}: VendorProfileEditorProps): React.JSX.Element {
  const t = useTranslations('vendor.profile.edit');
  const tValidation = useTranslations('vendor.profile.validation');
  const tErrors = useTranslations('vendor.profile.edit.errors');
  const locationsQuery = useLocations();
  const [showConfirmMajor, setShowConfirmMajor] = useState<null | EditVendorProfileValues>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lastResult, setLastResult] = useState<UpdateVendorProfileResultDTO | null>(null);

  const mutation = useUpdateVendorProfile();
  const deleteMutation = useSoftDeleteVendorProfile();

  const defaults = useMemo<EditVendorProfileValues>(
    () => ({
      businessName: profile.business_name,
      bio: profile.bio,
      locationId: profile.location_id,
      languages: profile.languages_supported,
    }),
    [profile],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    reset,
  } = useForm<EditVendorProfileValues>({
    resolver: zodResolver(editVendorProfileSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  const status: VendorProfileStatus = lastResult?.profile.status ?? profile.status;
  const isApproved = status === 'approved';

  const currentDirtyMajor = MAJOR_EDITOR_FIELDS.some((k) => Boolean(dirtyFields[k]));

  const runSubmit = (values: EditVendorProfileValues): void => {
    const payload = toUpdatePayload(values, dirtyFields);
    mutation.mutate(payload, {
      onSuccess: (result) => {
        setLastResult(result);
        reset({
          businessName: result.profile.business_name,
          bio: result.profile.bio,
          locationId: result.profile.location_id,
          languages: result.profile.languages_supported,
        });
        onSaved?.(result);
      },
    });
  };

  const onSubmit = handleSubmit((values) => {
    if (isApproved && currentDirtyMajor) {
      setShowConfirmMajor(values);
      return;
    }
    runSubmit(values);
  });

  const errorMessage = mutation.error
    ? mutation.error instanceof ApiError && KNOWN_ERROR_CODES.has(mutation.error.code)
      ? tErrors(mutation.error.code)
      : tErrors('UNEXPECTED')
    : null;

  const deleteError = deleteMutation.error
    ? deleteMutation.error instanceof ApiError && KNOWN_ERROR_CODES.has(deleteMutation.error.code)
      ? tErrors(deleteMutation.error.code)
      : tErrors('UNEXPECTED')
    : null;

  return (
    <section aria-labelledby="editor-title" className="space-y-4">
      <header>
        <h1 id="editor-title" className="text-xl font-semibold">
          {t('title')}
        </h1>
        <p className="text-sm text-neutral-600">{t('subtitle')}</p>
      </header>

      {lastResult?.repending && (
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <strong>{t('banners.repending.title')}</strong> — {t('banners.repending.body')}
        </div>
      )}

      {lastResult && !lastResult.repending && (
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {t('banners.saved')}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="edit-businessName" className="block text-sm font-medium">
            {t('fields.businessName.label')}
          </label>
          <input
            id="edit-businessName"
            type="text"
            aria-required="false"
            aria-invalid={errors.businessName ? 'true' : 'false'}
            aria-describedby={errors.businessName ? 'edit-businessName-error' : undefined}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('businessName')}
          />
          {errors.businessName && (
            <p id="edit-businessName-error" role="alert" aria-live="polite" className="mt-1 text-sm text-red-700">
              {tValidation(errors.businessName.message ?? 'businessNameLength')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="edit-bio" className="block text-sm font-medium">
            {t('fields.bio.label')}
          </label>
          <textarea
            id="edit-bio"
            rows={5}
            aria-invalid={errors.bio ? 'true' : 'false'}
            aria-describedby={errors.bio ? 'edit-bio-error edit-bio-help' : 'edit-bio-help'}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('bio')}
          />
          <p id="edit-bio-help" className="mt-1 text-xs text-neutral-500">
            {t('fields.bio.help')}
          </p>
          {errors.bio && (
            <p id="edit-bio-error" role="alert" aria-live="polite" className="mt-1 text-sm text-red-700">
              {tValidation(errors.bio.message ?? 'bioLength')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="edit-locationId" className="block text-sm font-medium">
            {t('fields.location.label')}
          </label>
          <select
            id="edit-locationId"
            aria-invalid={errors.locationId ? 'true' : 'false'}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
            {...register('locationId')}
          >
            {(locationsQuery.data ?? []).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {[loc.city, loc.region, loc.country].filter(Boolean).join(', ')}
              </option>
            ))}
          </select>
          {errors.locationId && (
            <p role="alert" aria-live="polite" className="mt-1 text-sm text-red-700">
              {tValidation(errors.locationId.message ?? 'locationRequired')}
            </p>
          )}
        </div>

        {errorMessage && (
          <div role="alert" aria-live="polite" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-700"
          >
            {t('buttons.delete')}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? t('buttons.saving') : t('buttons.save')}
          </button>
        </div>
      </form>

      {/* Confirmación previa al submit cuando hay dirty mayor sobre un perfil aprobado (D2). */}
      {showConfirmMajor && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="major-title"
          aria-describedby="major-desc"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 id="major-title" className="text-lg font-semibold">
              {t('confirmMajor.title')}
            </h2>
            <p id="major-desc" className="mt-2 text-sm text-neutral-700">
              {t('confirmMajor.description')}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmMajor(null)}
                className="rounded border border-neutral-300 px-4 py-2 text-sm"
              >
                {t('confirmMajor.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const v = showConfirmMajor;
                  setShowConfirmMajor(null);
                  runSubmit(v);
                }}
                className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white"
              >
                {t('confirmMajor.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteProfileDialog
        isOpen={deleteOpen}
        submitting={deleteMutation.isPending}
        errorMessage={deleteError}
        onCancel={() => {
          if (!deleteMutation.isPending) setDeleteOpen(false);
        }}
        onConfirm={() =>
          deleteMutation.mutate(undefined, {
            onSuccess: () => {
              setDeleteOpen(false);
              onDeleted?.();
            },
          })
        }
      />
    </section>
  );
}

function toUpdatePayload(
  values: EditVendorProfileValues,
  dirty: Partial<Readonly<Record<string, unknown>>>,
): UpdateVendorProfileRequestDTO {
  const out: UpdateVendorProfileRequestDTO = {};
  if (Boolean(dirty.businessName) && values.businessName !== undefined)
    out.business_name = values.businessName;
  if (Boolean(dirty.bio) && values.bio !== undefined) out.bio = values.bio;
  if (Boolean(dirty.locationId) && values.locationId !== undefined) out.location_id = values.locationId;
  if (Boolean(dirty.languages) && values.languages !== undefined)
    out.languages_supported = values.languages;
  return out;
}
