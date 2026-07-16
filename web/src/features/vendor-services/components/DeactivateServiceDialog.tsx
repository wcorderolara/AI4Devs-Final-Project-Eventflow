'use client';

// Diálogo de confirmación de desactivación (US-044 / FE-003).
// A11Y: role="dialog", aria-modal, focus trap, ESC cierra. Idempotente en backend
// (D-EC-09 → 204 aunque el servicio ya esté inactivo).
import { useEffect, useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useDeactivateVendorService } from '../hooks/vendorServicesQueries';

export interface DeactivateServiceDialogProps {
  isOpen: boolean;
  serviceId: string;
  packageName: string;
  onClose: () => void;
  onDeactivated: () => void;
}

interface ApiErrorShape {
  code?: unknown;
}

type ErrorCode =
  | 'SERVICE_NOT_FOUND'
  | 'PROFILE_HIDDEN'
  | 'PROFILE_NOT_FOUND'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'UNEXPECTED';

const KNOWN: readonly ErrorCode[] = [
  'SERVICE_NOT_FOUND',
  'PROFILE_HIDDEN',
  'PROFILE_NOT_FOUND',
  'AUTHENTICATION_REQUIRED',
  'FORBIDDEN',
];

function resolveErrorCode(err: unknown): ErrorCode {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as ApiErrorShape).code;
    if (typeof code === 'string' && (KNOWN as readonly string[]).includes(code)) {
      return code as ErrorCode;
    }
  }
  return 'UNEXPECTED';
}

export function DeactivateServiceDialog({
  isOpen,
  serviceId,
  packageName,
  onClose,
  onDeactivated,
}: DeactivateServiceDialogProps): JSX.Element | null {
  const t = useTranslations('vendor.services');
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const deactivate = useDeactivateVendorService();

  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();
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

  const errorCode = deactivate.error ? resolveErrorCode(deactivate.error) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
          {t('deactivate.title', { name: packageName })}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{t('deactivate.body')}</p>

        {errorCode ? (
          <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800">
            {t(`errors.${errorCode}`)}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            ref={cancelRef}
            onClick={onClose}
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
          >
            {t('deactivate.cancel')}
          </button>
          <button
            type="button"
            disabled={deactivate.isPending}
            onClick={async () => {
              try {
                await deactivate.mutateAsync(serviceId);
                onDeactivated();
              } catch {
                // El error se muestra vía deactivate.error
              }
            }}
            className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {deactivate.isPending ? t('deactivate.submitting') : t('deactivate.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
