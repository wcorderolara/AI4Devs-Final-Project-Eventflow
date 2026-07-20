'use client';

// VendorModerationDialog (US-074 / PB-P1-041 / FE-004). Modal accesible con focus trap nativo
// del `<dialog>` HTML. Action selector (radio: approve/reject/hide/unhide) + textarea reason
// condicional (10..500) — required cuando la acción es `reject`/`hide` (Decisión PO US-047 D4),
// opcional para `approve`/`unhide` (D3).
//
// Whitelist client-side (paridad exacta con el server-side de US-047 D5):
//   - `pending`  → { approve, reject }
//   - `approved + is_hidden=false` → { hide }
//   - `approved + is_hidden=true`  → { unhide }
//   - `rejected` → {}   (re-approve OUT of MVP)
//
// Accesibilidad (Tech Spec §8, AC A11Y):
//   - `<dialog>` nativo + `showModal()` provee focus trap y Esc trap "for free".
//   - `aria-labelledby` apunta al título; textarea `aria-describedby` al contador.
//   - Cierre por Escape + botón "Cancelar"; sin backdrop-click destructivo.
//   - Cuando no hay acciones válidas (`rejected`) el submit se deshabilita y se muestra banner
//     con `role="alert"`.
//
// El submit ejecuta la mutation TanStack `useModerateVendor` (US-074 FE-004).
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useModerateVendor } from '../hooks/adminVendorsQueries';
import type {
  AdminVendorStatus,
  ModerateVendorAction,
} from '../api/adminVendorsApi.types';
import type { ApiError } from '@/shared/api-client';

const REASON_MIN = 10;
const REASON_MAX = 500;

const REASON_REQUIRED_ACTIONS: ReadonlySet<ModerateVendorAction> = new Set<ModerateVendorAction>([
  'reject',
  'hide',
]);

export interface VendorModerationDialogVendor {
  id: string;
  businessName: string;
  slug?: string | null;
  currentStatus: AdminVendorStatus;
  isHidden: boolean;
}

interface Props {
  vendor: VendorModerationDialogVendor | null;
  onClose: () => void;
  onSuccess?: (status: AdminVendorStatus, isHidden: boolean) => void;
}

/** Whitelist client-side — paridad EXACTA con el server-side de US-047 §7. */
function allowedActions(status: AdminVendorStatus, isHidden: boolean): ModerateVendorAction[] {
  if (status === 'pending') return ['approve', 'reject'];
  if (status === 'approved') return isHidden ? ['unhide'] : ['hide'];
  return []; // rejected + hidden legacy → sin acciones (SEC-05 no re-approve MVP)
}

export function VendorModerationDialog({
  vendor,
  onClose,
  onSuccess,
}: Props): React.JSX.Element | null {
  const t = useTranslations('admin.vendor.moderate.dialog');
  const tActions = useTranslations('admin.vendor.moderate.actions');
  const tErrors = useTranslations('admin.vendor.moderate.errors');

  const titleId = useId();
  const reasonId = useId();
  const counterId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const allowed = useMemo(
    () => (vendor ? allowedActions(vendor.currentStatus, vendor.isHidden) : []),
    [vendor],
  );
  const disabled = allowed.length === 0;

  const [action, setAction] = useState<ModerateVendorAction>('approve');
  const [reason, setReason] = useState('');

  const mutation = useModerateVendor({ vendorSlug: vendor?.slug ?? undefined });

  // Sincroniza `action` con las opciones válidas cuando cambia el vendor target (evita quedar
  // con un valor no permitido — p. ej. `approve` cuando el status actual sólo permite `hide`).
  useEffect(() => {
    if (allowed.length === 0) return;
    if (!allowed.includes(action)) setAction(allowed[0]!);
  }, [allowed, action]);

  // Reset del reason al abrir con un vendor nuevo.
  useEffect(() => {
    if (vendor) {
      setReason('');
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.id]);

  // Abre/cierra el <dialog> nativo cuando la prop `vendor` cambia.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (vendor && !dlg.open) dlg.showModal();
    if (!vendor && dlg.open) dlg.close();
  }, [vendor]);

  const close = useCallback(() => {
    dialogRef.current?.close();
    onClose();
  }, [onClose]);

  const reasonRequired = REASON_REQUIRED_ACTIONS.has(action);
  const reasonTooShort = reasonRequired && reason.length > 0 && reason.length < REASON_MIN;
  const reasonTooLong = reason.length > REASON_MAX;
  const canSubmit =
    !disabled &&
    !mutation.isPending &&
    (!reasonRequired || (reason.length >= REASON_MIN && reason.length <= REASON_MAX));

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!vendor || disabled) return;
      if (reasonRequired && (reason.length < REASON_MIN || reason.length > REASON_MAX)) return;
      const body =
        reason.length > 0 ? { action, reason } : { action };
      mutation.mutate(
        { vendorId: vendor.id, ...body },
        {
          onSuccess: (data) => {
            onSuccess?.(data.status, data.isHidden);
            close();
          },
        },
      );
    },
    [vendor, disabled, reasonRequired, reason, mutation, action, onSuccess, close],
  );

  if (!vendor) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-testid="vendor-moderation-dialog"
      className="rounded-lg p-0 shadow-xl backdrop:bg-black/40"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <form
        method="dialog"
        onSubmit={onSubmit}
        className="flex w-[min(560px,90vw)] flex-col gap-4 p-6"
      >
        <header>
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
            {t('title', { businessName: vendor.businessName })}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            {t('currentStatusLabel', {
              status: t(`currentStatus.${vendor.currentStatus}`),
              visibility: vendor.isHidden ? t('visibility.hidden') : t('visibility.visible'),
            })}
          </p>
        </header>

        {disabled ? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {t('finalNotice')}
          </div>
        ) : (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-neutral-800">{t('actionLegend')}</legend>
            {allowed.map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="vendor-moderation-action"
                  value={a}
                  checked={action === a}
                  onChange={() => setAction(a)}
                  className="h-4 w-4"
                />
                <span>{tActions(a)}</span>
              </label>
            ))}
          </fieldset>
        )}

        <div>
          <label htmlFor={reasonId} className="block text-sm font-medium text-neutral-800">
            {reasonRequired ? t('reasonLabelRequired') : t('reasonLabelOptional')}
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required={reasonRequired}
            disabled={disabled}
            minLength={reasonRequired ? REASON_MIN : undefined}
            maxLength={REASON_MAX}
            rows={4}
            aria-describedby={counterId}
            aria-invalid={reasonTooShort || reasonTooLong || undefined}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-neutral-100"
          />
          <p id={counterId} className="mt-1 text-xs text-neutral-500">
            {t('counter', { current: reason.length, min: REASON_MIN, max: REASON_MAX })}
          </p>
        </div>

        {mutation.isError ? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {mapErrorCode(mutation.error, tErrors)}
          </div>
        ) : null}

        <footer className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            data-testid="vendor-moderation-submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {mutation.isPending ? t('submitting') : t('submit')}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function mapErrorCode(err: ApiError, tErrors: (k: string) => string): string {
  const code = (err as { code?: string })?.code ?? 'UNEXPECTED';
  switch (code) {
    case 'AUTHENTICATION_REQUIRED':
      return tErrors('unauthenticated');
    case 'FORBIDDEN':
      return tErrors('forbidden');
    case 'VENDOR_NOT_FOUND':
      return tErrors('notFound');
    case 'INVALID_TRANSITION':
      return tErrors('invalidTransition');
    case 'VALIDATION_ERROR':
      return tErrors('validation');
    default:
      return tErrors('unexpected');
  }
}
