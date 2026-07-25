'use client';

import { AlertCircle, CheckCircle2, Trash2, UploadCloud } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { describedBy } from '../internal/a11y';
import { cx } from '../internal/cx';
import { Spinner } from '../internal/Spinner';

/**
 * FileUpload — adjuntar archivos (Component Foundations §19).
 *
 * Es **presentacional y dirigido por callbacks**: valida tipo y tamaño en cliente y avisa; no
 * sube nada por su cuenta. La subida, el progreso real y el mapeo de errores del backend
 * pertenecen al feature (patrón ya usado por el portafolio de vendor).
 *
 * Accesibilidad (§19):
 * - El `<input type="file">` nativo **sigue existiendo y siendo enfocable** (`sr-only`, no
 *   `display:none`): se activa con teclado sin depender del drop zone, que es sólo un refuerzo
 *   para puntero. Por eso el drop zone no añade un segundo `tabIndex`.
 * - El `<label>` es la superficie visible y abre el selector nativo al hacer clic.
 * - Los cambios de estado se anuncian en una región `role="status"`.
 *
 * Los límites (`accept`, `maxSizeBytes`) llegan por props: el componente no fija ningún valor
 * de negocio (ni "10 MB" ni una allowlist MIME).
 */
export type FileUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export type FileRejectionReason = 'type' | 'size';

export interface FileRejection {
  file: File;
  reason: FileRejectionReason;
}

export interface FileUploadSelectedFile {
  name: string;
  /** Tamaño en bytes; el consumidor decide cómo formatearlo según locale. */
  size?: number;
}

export interface FileUploadProps {
  /** Id del input; lo inyecta `FormField` para asociar el label visible del campo. */
  id?: string;
  /** Texto de la superficie de arrastre / botón (por ejemplo `Haz clic o arrastra un archivo`). */
  dropzoneLabel: ReactNode;
  /** Ayuda con los límites reales del feature (`JPG/PNG/WebP · máx. 5 MB`). */
  hintLabel?: ReactNode;
  /** Nombre accesible del botón que quita un archivo seleccionado. */
  removeLabel: (fileName: string) => string;
  /** Lista MIME para el atributo `accept` y para la validación previa. */
  accept?: string;
  /** Tamaño máximo por archivo, en bytes. */
  maxSizeBytes?: number;
  multiple?: boolean;
  disabled?: boolean;
  status?: FileUploadStatus;
  /** Progreso 0–100 cuando `status === 'uploading'`. */
  progress?: number;
  /** Mensaje traducido del estado actual; se anuncia en la región `role="status"`. */
  statusMessage?: ReactNode;
  /** Mensaje de error traducido (tipo no soportado, tamaño excedido, fallo de subida). */
  errorMessage?: ReactNode;
  /** Archivos ya seleccionados; el estado lo posee el consumidor. */
  selectedFiles?: readonly FileUploadSelectedFile[];
  onFilesSelected: (files: File[]) => void;
  /** Archivos descartados por tipo o tamaño; el consumidor traduce el motivo. */
  onFilesRejected?: (rejections: FileRejection[]) => void;
  onRemoveFile?: (index: number) => void;
  className?: string;
}

function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const patterns = accept
    .split(',')
    .map((pattern) => pattern.trim().toLowerCase())
    .filter((pattern) => pattern.length > 0);
  if (patterns.length === 0) return true;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) return name.endsWith(pattern);
    if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

export function FileUpload({
  id,
  dropzoneLabel,
  hintLabel,
  removeLabel,
  accept,
  maxSizeBytes,
  multiple = false,
  disabled = false,
  status = 'idle',
  progress,
  statusMessage,
  errorMessage,
  selectedFiles = [],
  onFilesSelected,
  onFilesRejected,
  onRemoveFile,
  className,
}: FileUploadProps): React.JSX.Element {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-file`;
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const partition = (files: readonly File[]): void => {
    const accepted: File[] = [];
    const rejected: FileRejection[] = [];
    for (const file of files) {
      if (!matchesAccept(file, accept)) {
        rejected.push({ file, reason: 'type' });
      } else if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
        rejected.push({ file, reason: 'size' });
      } else {
        accepted.push(file);
      }
    }
    if (accepted.length > 0) onFilesSelected(accepted);
    if (rejected.length > 0) onFilesRejected?.(rejected);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    partition(Array.from(event.target.files ?? []));
    // Permite volver a elegir el mismo archivo después de quitarlo.
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    partition(Array.from(event.dataTransfer.files ?? []));
  };

  const hasError = status === 'error' || Boolean(errorMessage);

  return (
    <div className={cx('flex flex-col gap-3', className)}>
      {/* Sólo refuerzo para puntero: el input nativo de abajo es la ruta accesible. */}
      <div
        data-testid="fileUpload.dropzone"
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          'flex flex-col items-center gap-2 rounded-card border-2 border-dashed px-6 py-8 text-center',
          'transition-colors duration-fast ease-standard',
          hasError
            ? 'border-feedback-error'
            : dragging
              ? 'border-interactive bg-surface-selected'
              : 'border-default',
          disabled ? 'bg-surface-disabled' : 'bg-surface-subtle',
        )}
      >
        <UploadCloud
          aria-hidden="true"
          className={cx('h-icon-lg w-icon-lg', disabled ? 'text-disabled' : 'text-link')}
        />
        <label
          htmlFor={inputId}
          className={cx(
            'font-ui text-body-md font-medium',
            disabled ? 'cursor-not-allowed text-disabled' : 'cursor-pointer text-link underline',
          )}
        >
          {dropzoneLabel}
        </label>
        {hintLabel ? (
          <p id={hintId} className="font-body text-body-sm text-secondary">
            {hintLabel}
          </p>
        ) : null}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={onInputChange}
          aria-describedby={describedBy(
            hintLabel ? hintId : undefined,
            hasError ? errorId : undefined,
          )}
          aria-invalid={hasError ? true : undefined}
          className="sr-only"
        />
      </div>

      {selectedFiles.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {selectedFiles.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-card border border-subtle bg-surface px-3 py-2"
            >
              <span className="min-w-0 truncate font-body text-body-sm text-primary">
                {file.name}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {status === 'uploading' ? (
                  <Spinner className="h-icon-sm w-icon-sm text-secondary" />
                ) : null}
                {status === 'success' ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-icon-sm w-icon-sm text-feedback-success-icon"
                  />
                ) : null}
                {onRemoveFile ? (
                  <button
                    type="button"
                    disabled={disabled || status === 'uploading'}
                    aria-label={removeLabel(file.name)}
                    onClick={() => onRemoveFile(index)}
                    className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-button text-secondary hover:bg-action-ghost-hover hover:text-feedback-error disabled:cursor-not-allowed disabled:text-disabled"
                  >
                    <Trash2 aria-hidden="true" className="h-icon-sm w-icon-sm" />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {status === 'uploading' && typeof progress === 'number' ? (
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1 w-full overflow-hidden rounded-badge bg-surface-disabled"
        >
          <span
            className="block h-full bg-action-primary transition-all duration-standard ease-standard"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      ) : null}

      {/* Un único anuncio para todos los cambios de estado (§19: `aria-live="polite"`). */}
      <p
        role="status"
        className={cx('font-body text-body-sm', statusMessage ? 'text-secondary' : 'sr-only')}
      >
        {statusMessage}
      </p>

      {hasError && errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1 font-ui text-body-sm font-medium text-feedback-error"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-icon-sm w-icon-sm shrink-0" />
          <span>{errorMessage}</span>
        </p>
      ) : null}
    </div>
  );
}
