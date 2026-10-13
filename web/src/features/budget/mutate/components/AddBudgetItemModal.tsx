'use client';

// US-036 (PB-P1-020 / FE-005) — Modal para agregar un BudgetItem sobre el `Modal` del design
// system (focus trap, ESC, nombre y descripción accesibles).
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, Button, Modal } from '@/shared/design-system';

export interface AddBudgetItemFormValues {
  label: string;
  category_code: string;
  amount_planned: string;
}

export interface AddBudgetItemModalProps {
  open: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: {
    label: string;
    category_code: string | null;
    amount_planned: number;
  }) => void;
}

export function AddBudgetItemModal({
  open,
  submitting = false,
  errorMessage = null,
  onCancel,
  onSubmit,
}: AddBudgetItemModalProps): React.JSX.Element {
  const t = useTranslations('budget.addItem');
  const formId = useId();
  // Foco inicial en Cancelar, la opción segura.
  const cancelRef = useRef<HTMLElement | null>(null);
  const [values, setValues] = useState<AddBudgetItemFormValues>({
    label: '',
    category_code: '',
    amount_planned: '0',
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setValues({ label: '', category_code: '', amount_planned: '0' });
      setTouched(false);
    }
  }, [open]);

  const amount = Number.parseFloat(values.amount_planned);
  const labelValid = values.label.trim().length > 0;
  const amountValid = !Number.isNaN(amount) && amount >= 0;
  const canSubmit = labelValid && amountValid && !submitting;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('title')}
      description={t('description')}
      showCloseButton={false}
      // Un clic fuera perdería lo escrito; `Esc` y Cancelar siguen disponibles.
      closeOnOverlayClick={false}
      initialFocus={cancelRef}
      footer={
        <>
          <Button
            ref={cancelRef as React.Ref<HTMLButtonElement>}
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('cta.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={!canSubmit}
            isLoading={submitting}
            loadingLabel={t('cta.saving')}
          >
            {t('cta.save')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        aria-busy={submitting}
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!canSubmit) return;
          onSubmit({
            label: values.label.trim(),
            category_code: values.category_code.trim() || null,
            amount_planned: amount,
          });
        }}
      >
        <div>
          <label htmlFor="add-item-label" className="text-sm font-medium">
            {t('field.label')}
          </label>
          <input
            id="add-item-label"
            type="text"
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            value={values.label}
            onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
            aria-invalid={touched && !labelValid}
            aria-describedby={touched && !labelValid ? 'add-item-label-err' : undefined}
            disabled={submitting}
          />
          {touched && !labelValid ? (
            <p id="add-item-label-err" role="alert" className="mt-1 text-xs text-red-700">
              {t('field.labelRequired')}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="add-item-category" className="text-sm font-medium">
            {t('field.category')}
          </label>
          <input
            id="add-item-category"
            type="text"
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            placeholder={t('field.categoryPlaceholder')}
            value={values.category_code}
            onChange={(e) => setValues((v) => ({ ...v, category_code: e.target.value }))}
            disabled={submitting}
          />
        </div>

        <div>
          <label htmlFor="add-item-amount" className="text-sm font-medium">
            {t('field.amount')}
          </label>
          <input
            id="add-item-amount"
            type="text"
            inputMode="decimal"
            className="mt-1 w-32 rounded border border-neutral-300 px-2 py-1"
            value={values.amount_planned}
            onChange={(e) => setValues((v) => ({ ...v, amount_planned: e.target.value }))}
            aria-invalid={touched && !amountValid}
            aria-describedby={touched && !amountValid ? 'add-item-amount-err' : undefined}
            disabled={submitting}
          />
          {touched && !amountValid ? (
            <p id="add-item-amount-err" role="alert" className="mt-1 text-xs text-red-700">
              {t('field.amountInvalid')}
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <Alert variant="error" live>
            {errorMessage}
          </Alert>
        ) : null}
      </form>
    </Modal>
  );
}
