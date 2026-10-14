'use client';

// US-037 (PB-P1-021 / FE-005) — Modal de error D6. Se abre cuando el response es
// 409 CATEGORY_INACTIVE. Lista `inactive_categories` + CTAs deeplink a "Regenerar sugerencia"
// (US-019) y "Aplicar manualmente" (US-036 CRUD).
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ActionLink, Button, Modal } from '@/shared/design-system';
import type { InactiveCategoryDetail } from '../../hooks/useApplyBudgetSuggestion';

export interface CategoryInactiveErrorDialogProps {
  open: boolean;
  eventId: string;
  inactiveCategories: InactiveCategoryDetail[];
  onClose: () => void;
}

export function CategoryInactiveErrorDialog({
  open,
  eventId,
  inactiveCategories,
  onClose,
}: CategoryInactiveErrorDialogProps): JSX.Element {
  const t = useTranslations('ai.budgetApply.categoryInactive');
  const closeBtnRef = useRef<HTMLElement | null>(null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      role="alertdialog"
      title={t('title')}
      description={t('body')}
      showCloseButton={false}
      initialFocus={closeBtnRef}
      footer={
        <>
          <Button
            ref={closeBtnRef as React.Ref<HTMLButtonElement>}
            variant="secondary"
            onClick={onClose}
          >
            {t('cta.close')}
          </Button>
          <ActionLink
            href={`/organizer/events/${eventId}/ai/budget`}
            variant="secondary"
            onClick={onClose}
          >
            {t('cta.regenerate')}
          </ActionLink>
          <ActionLink href={`/organizer/events/${eventId}/budget`} onClick={onClose}>
            {t('cta.manual')}
          </ActionLink>
        </>
      }
    >
      <ul aria-label={t('listAria')} className="list-disc space-y-1 pl-5 font-body text-body-sm">
        {inactiveCategories.map((c) => (
          <li key={c.code}>
            <span className="font-medium">{c.name}</span>
            <span className="ml-2 font-body text-caption text-muted">{`(${c.code})`}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
