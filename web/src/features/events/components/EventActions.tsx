'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { ApiError } from '@/shared/api-client';
import type { EventModel } from '../api/eventsApi.types';
import { useCancelEvent, useDeleteEvent } from '../hooks/useEventsMutations';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Acciones de ciclo de vida de un evento (US-010 editar, US-011 cancelar, US-012 soft delete).
 * Edit disponible en estados no terminales; Cancel en `draft`/`active`; Delete SOLO en `draft`
 * (el backend valida el estado real y devuelve 409/422 si no aplica — la UI sólo oculta).
 */
export function EventActions({
  event,
  onDeleted,
}: {
  event: EventModel;
  onDeleted?: () => void;
}): React.JSX.Element {
  const t = useTranslations('events');
  const cancelMutation = useCancelEvent(event.id);
  const deleteMutation = useDeleteEvent();
  const [dialog, setDialog] = useState<'none' | 'cancel' | 'delete'>('none');
  const [error, setError] = useState<string | null>(null);

  const isTerminal = event.status === 'completed' || event.status === 'cancelled';
  const canDelete = event.status === 'draft';
  const canCancel = !isTerminal;

  const closeDialog = (): void => {
    setDialog('none');
    setError(null);
  };

  const confirmCancel = (): void => {
    setError(null);
    cancelMutation.mutate(undefined, {
      onSuccess: closeDialog,
      onError: (err) => setError(mapError(err, t)),
    });
  };

  const confirmDelete = (): void => {
    setError(null);
    deleteMutation.mutate(event.id, {
      onSuccess: () => {
        closeDialog();
        onDeleted?.();
      },
      onError: (err) => setError(mapError(err, t)),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isTerminal ? (
        <Link
          href={`/organizer/events/${event.id}/edit`}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          {t('actions.edit')}
        </Link>
      ) : null}

      {canCancel ? (
        <button
          type="button"
          onClick={() => setDialog('cancel')}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          {t('actions.cancel')}
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onClick={() => setDialog('delete')}
          className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        >
          {t('actions.delete')}
        </button>
      ) : null}

      <ConfirmDialog
        open={dialog === 'cancel'}
        title={t('cancelDialog.title')}
        description={t('cancelDialog.description')}
        confirmLabel={cancelMutation.isPending ? t('cancelDialog.pending') : t('cancelDialog.confirm')}
        cancelLabel={t('cancelDialog.dismiss')}
        destructive
        pending={cancelMutation.isPending}
        error={error}
        onConfirm={confirmCancel}
        onClose={closeDialog}
      />

      <ConfirmDialog
        open={dialog === 'delete'}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.description')}
        confirmLabel={deleteMutation.isPending ? t('deleteDialog.pending') : t('deleteDialog.confirm')}
        cancelLabel={t('deleteDialog.dismiss')}
        destructive
        pending={deleteMutation.isPending}
        error={error}
        onConfirm={confirmDelete}
        onClose={closeDialog}
      />
    </div>
  );
}

function mapError(err: unknown, t: ReturnType<typeof useTranslations>): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return t('errors.NOT_FOUND');
    if (err.code === 'INVALID_STATE' || err.status === 409) return t('errors.INVALID_STATE');
    if (err.code === 'BUSINESS_RULE_VIOLATION' || err.status === 422) return t('errors.INVALID_STATE');
  }
  return t('errors.UNEXPECTED');
}
