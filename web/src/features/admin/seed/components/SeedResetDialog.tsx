'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useSeedReset } from '../hooks/useAdminSeed';
import type { SeedResetReportDTO } from '../api/adminSeedApi.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReset: (report: SeedResetReportDTO) => void;
}

const CONFIRM_TOKEN = 'RESET';

export function SeedResetDialog({ isOpen, onClose, onReset }: Props): React.JSX.Element {
  const t = useTranslations('admin.seed.reset');
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const mutation = useSeedReset();

  function close(): void {
    if (mutation.isPending) return;
    setConfirmText('');
    setReason('');
    mutation.reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (confirmText !== CONFIRM_TOKEN) return;
    try {
      const report = await mutation.mutateAsync({ reason });
      onReset(report);
      setConfirmText('');
      setReason('');
      onClose();
    } catch {
      // el error se muestra dentro del dialog via mutation.error
    }
  }

  const canSubmit = confirmText === CONFIRM_TOKEN && !mutation.isPending;

  return (
    <Dialog open={isOpen} onClose={close} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <DialogTitle className="text-lg font-bold text-red-700">{t('title')}</DialogTitle>
          <p className="mt-2 text-sm text-neutral-700">{t('warning')}</p>
          <ul className="mt-2 list-inside list-disc text-xs text-neutral-600">
            <li>{t('bullets.deletes')}</li>
            <li>{t('bullets.reseeds')}</li>
            <li>{t('bullets.audited')}</li>
          </ul>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="flex flex-col text-xs font-medium text-neutral-700">
              {t('reasonLabel')}
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder={t('reasonPlaceholder')}
                className="mt-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                disabled={mutation.isPending}
              />
            </label>

            <label className="flex flex-col text-xs font-medium text-neutral-700">
              {t('confirmLabel', { token: CONFIRM_TOKEN })}
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="mt-1 rounded-md border border-neutral-300 px-2 py-1 font-mono text-sm"
                disabled={mutation.isPending}
              />
            </label>

            {mutation.isError ? (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                {mutation.error?.message ?? t('error')}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={mutation.isPending}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-md border border-red-600 bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {mutation.isPending ? t('resetting') : t('confirm')}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
