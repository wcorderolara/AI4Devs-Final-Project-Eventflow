'use client';

// PortfolioUploader (US-043 / PB-P1-026 / FE-002).
// Dropzone accesible, input `work_label` y mensajes de error i18n por código estable.
//
// PB-P2-028: migrado al design system compartido (`FormField` + `Input` + `FileUpload` +
// `Button`). El comportamiento de negocio no cambia — mismos límites (5 MB, JPG/PNG/WebP),
// mismos códigos de error y el mismo contrato con `useUploadPortfolioImage`.
//
// Accessibility:
// - El `<input type="file">` nativo es la ruta accesible por teclado (`FileUpload` lo conserva
//   enfocable y asociado a su label); el drop zone es refuerzo para puntero, ya no un
//   `role="button"` con `tabIndex` propio.
// - Los cambios de estado se anuncian con `role="status"`; los errores con `role="alert"`.
// - El contador `N/10` de cada work vive en `WorkGrid` (aria-live allí).
import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Button, FileUpload, FormField, Input } from '@/shared/design-system';
import type { FileRejection } from '@/shared/design-system';
import { useUploadPortfolioImage } from '../hooks/useUploadPortfolioImage';
import type { PortfolioImageView } from '../api/vendorPortfolioApi.types';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

export interface PortfolioUploaderProps {
  /** Se dispara con la vista normalizada tras un upload exitoso. */
  onUploaded?: (view: PortfolioImageView) => void;
  /** Valor inicial opcional para el input `work_label` (por ejemplo, cuando el usuario agrega al mismo work). */
  initialWorkLabel?: string;
}

type ErrorCode =
  | 'INVALID_MIME'
  | 'INVALID_WORK_LABEL'
  | 'FILE_TOO_LARGE'
  | 'IMAGE_LIMIT_REACHED'
  | 'WORK_LABEL_LIMIT_REACHED'
  | 'PROFILE_HIDDEN'
  | 'PROFILE_NOT_FOUND'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'INVALID_IMAGE'
  | 'UNEXPECTED';

interface ApiErrorShape {
  code?: unknown;
}

function resolveErrorCode(err: unknown): ErrorCode {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as ApiErrorShape).code;
    if (typeof code === 'string') {
      const known: readonly ErrorCode[] = [
        'INVALID_MIME',
        'INVALID_WORK_LABEL',
        'FILE_TOO_LARGE',
        'IMAGE_LIMIT_REACHED',
        'WORK_LABEL_LIMIT_REACHED',
        'PROFILE_HIDDEN',
        'PROFILE_NOT_FOUND',
        'AUTHENTICATION_REQUIRED',
        'FORBIDDEN',
        'INVALID_IMAGE',
      ];
      if ((known as readonly string[]).includes(code)) {
        return code as ErrorCode;
      }
    }
  }
  return 'UNEXPECTED';
}

export function PortfolioUploader(props: PortfolioUploaderProps): JSX.Element {
  const t = useTranslations('vendor.portfolio');
  const [workLabel, setWorkLabel] = useState(props.initialWorkLabel ?? '');
  const [error, setError] = useState<ErrorCode | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const mutation = useUploadPortfolioImage();

  const canSubmit = workLabel.trim().length > 0 && selectedFile !== null && !mutation.isPending;

  const onFilesSelected = useCallback((files: File[]): void => {
    setSelectedFile(files[0] ?? null);
    setError(null);
  }, []);

  // La validación previa de `FileUpload` usa los mismos límites de negocio y se traduce a los
  // códigos de error estables que ya conoce el catálogo i18n.
  const onFilesRejected = useCallback((rejections: FileRejection[]): void => {
    const reason = rejections[0]?.reason;
    setSelectedFile(null);
    setError(reason === 'size' ? 'FILE_TOO_LARGE' : 'INVALID_MIME');
  }, []);

  const onSubmit = useCallback(
    async (ev: FormEvent<HTMLFormElement>): Promise<void> => {
      ev.preventDefault();
      setError(null);
      const file = selectedFile;
      if (!file) {
        setError('INVALID_IMAGE');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError('FILE_TOO_LARGE');
        return;
      }
      try {
        const view = await mutation.mutateAsync({ workLabel: workLabel.trim(), file });
        props.onUploaded?.(view);
        setSelectedFile(null);
      } catch (err) {
        setError(resolveErrorCode(err));
      }
    },
    [mutation, selectedFile, workLabel, props],
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormField label={t('workLabel.label')} required>
        {(field) => (
          <Input
            {...field}
            type="text"
            value={workLabel}
            onChange={(ev) => setWorkLabel(ev.target.value)}
            placeholder={t('workLabel.placeholder')}
            maxLength={80}
            required
          />
        )}
      </FormField>

      <FileUpload
        dropzoneLabel={selectedFile?.name ?? t('dropzone.placeholder')}
        hintLabel={t('dropzone.helper')}
        removeLabel={(name) => t('dropzone.remove', { name })}
        accept={ACCEPT}
        maxSizeBytes={MAX_BYTES}
        disabled={mutation.isPending}
        status={mutation.isPending ? 'uploading' : error !== null ? 'error' : 'idle'}
        statusMessage={mutation.isPending ? t('actions.uploading') : undefined}
        errorMessage={error !== null ? t(`errors.${error}`) : undefined}
        selectedFiles={selectedFile ? [{ name: selectedFile.name, size: selectedFile.size }] : []}
        onFilesSelected={onFilesSelected}
        onFilesRejected={onFilesRejected}
        onRemoveFile={() => setSelectedFile(null)}
      />

      <Button
        type="submit"
        className="self-start"
        disabled={!canSubmit}
        isLoading={mutation.isPending}
        loadingLabel={t('actions.uploading')}
      >
        {t('actions.upload')}
      </Button>
    </form>
  );
}
