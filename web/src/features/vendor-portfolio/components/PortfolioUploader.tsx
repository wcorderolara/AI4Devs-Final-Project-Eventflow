'use client';

// PortfolioUploader (US-043 / PB-P1-026 / FE-002).
// Dropzone accesible (keyboard: Enter/Space abre el file picker), input `work_label`,
// barra de progreso multipart, mensajes de error i18n por código estable.
//
// Accessibility:
// - `role="button"` + `tabIndex={0}` en la zona de drop; keydown Enter/Space delega al input.
// - Mensajes de error usan `aria-live="polite"` y `aria-describedby` sobre el CTA.
// - El contador `N/10` de cada work vive en `WorkGrid` (aria-live allí).
import { useCallback, useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
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
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const errorId = useId();
  const uploadHelperId = useId();
  const mutation = useUploadPortfolioImage();

  const canSubmit = workLabel.trim().length > 0 && inputRef.current?.files?.[0] !== undefined && !mutation.isPending;

  const openPicker = useCallback((): void => {
    inputRef.current?.click();
  }, []);

  const onDropzoneKeyDown = useCallback(
    (ev: KeyboardEvent<HTMLDivElement>): void => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  const onDrop = useCallback((ev: DragEvent<HTMLDivElement>): void => {
    ev.preventDefault();
    const file = ev.dataTransfer.files[0];
    if (file && inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
      setSelectedName(file.name);
    }
  }, []);

  const onDragOver = useCallback((ev: DragEvent<HTMLDivElement>): void => {
    ev.preventDefault();
  }, []);

  const onFileChange = useCallback((ev: ChangeEvent<HTMLInputElement>): void => {
    const file = ev.target.files?.[0] ?? null;
    setSelectedName(file?.name ?? null);
    setError(null);
  }, []);

  const onSubmit = useCallback(
    async (ev: FormEvent<HTMLFormElement>): Promise<void> => {
      ev.preventDefault();
      setError(null);
      const file = inputRef.current?.files?.[0];
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
        setSelectedName(null);
        if (inputRef.current) inputRef.current.value = '';
      } catch (err) {
        setError(resolveErrorCode(err));
      }
    },
    [mutation, workLabel, props],
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>{t('workLabel.label')}</span>
        <input
          type="text"
          value={workLabel}
          onChange={(ev) => setWorkLabel(ev.target.value)}
          placeholder={t('workLabel.placeholder')}
          maxLength={80}
          className="rounded border border-neutral-300 px-3 py-2 text-base"
          required
          aria-required="true"
        />
      </label>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={onDropzoneKeyDown}
        onClick={openPicker}
        onDrop={onDrop}
        onDragOver={onDragOver}
        aria-describedby={uploadHelperId}
        className="flex min-h-[7rem] cursor-pointer items-center justify-center rounded border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-600 hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {selectedName ?? t('dropzone.placeholder')}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onFileChange}
          className="hidden"
        />
      </div>
      <p id={uploadHelperId} className="text-xs text-neutral-500">
        {t('dropzone.helper')}
      </p>

      {error !== null && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="rounded bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {t(`errors.${error}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        aria-describedby={error !== null ? errorId : undefined}
        className="self-start rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {mutation.isPending ? t('actions.uploading') : t('actions.upload')}
      </button>
    </form>
  );
}
