'use client';

// Diálogo de confirmación de desactivación (US-044 / FE-003) sobre `ConfirmationDialog`.
// Idempotente en backend (D-EC-09 → 204 aunque el servicio ya esté inactivo).
import { useTranslations } from 'next-intl';
import { Alert, ConfirmationDialog } from '@/shared/design-system';
import { resolveErrorCode } from '@/shared/error-handling/errorCodeMessages';
import { useDeactivateVendorService } from '../hooks/vendorServicesQueries';

export interface DeactivateServiceDialogProps {
  isOpen: boolean;
  serviceId: string;
  packageName: string;
  onClose: () => void;
  onDeactivated: () => void;
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

export function DeactivateServiceDialog({
  isOpen,
  serviceId,
  packageName,
  onClose,
  onDeactivated,
}: DeactivateServiceDialogProps): JSX.Element {
  const t = useTranslations('vendor.services');
  const deactivate = useDeactivateVendorService();

  const errorCode = deactivate.error ? resolveErrorCode(deactivate.error, KNOWN) : null;

  return (
    <ConfirmationDialog
      open={isOpen}
      onClose={onClose}
      title={t('deactivate.title', { name: packageName })}
      description={t('deactivate.body')}
      confirmLabel={t('deactivate.confirm')}
      cancelLabel={t('deactivate.cancel')}
      loadingLabel={t('deactivate.submitting')}
      variant="destructive"
      isLoading={deactivate.isPending}
      onConfirm={async () => {
        try {
          await deactivate.mutateAsync(serviceId);
          onDeactivated();
        } catch {
          // El error se muestra vía deactivate.error
        }
      }}
    >
      {errorCode ? (
        <Alert variant="error" live>
          {t(`errors.${errorCode}`)}
        </Alert>
      ) : null}
    </ConfirmationDialog>
  );
}
