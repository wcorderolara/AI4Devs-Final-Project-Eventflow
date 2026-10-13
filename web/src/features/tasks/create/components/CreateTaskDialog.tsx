'use client';

// US-028 (PB-P1-018 / FE-001, FE-002, FE-003) — Modal accesible para crear una EventTask manual.
// Implementa:
//   * `Modal` del design system: `role="dialog"`, `aria-modal`, nombre accesible, focus trap y
//     cierre por `Esc` / clic fuera (a11y AC-05).
//   * Devuelve foco al disparador al cerrar (`returnFocusRef`).
//   * Campos con `<label>` asociado y `aria-describedby` sobre el error inline.
//   * Errores mapeados por `details.field` a `aria-live="assertive"`.
//   * Banner global para 404 / 403 / 409.
//   * Botón "Crear tarea" deshabilitado durante `isPending` (mitigación doble submit TS-09).
// El formulario usa React Hook Form + Zod mirror (`createEventTaskFormSchema`).
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import { Button, Modal } from '@/shared/design-system';
import {
  createEventTaskFormSchema,
  toCreatePayload,
  type CreateEventTaskFormValues,
} from '../forms/createEventTaskFormSchema';
import { useCreateEventTask } from '../hooks/useCreateEventTask';

export interface CreateTaskDialogProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Categorías activas para el combobox. Vacío = combobox oculto. */
  categoryOptions?: Array<{ code: string; label: string }>;
  /** Categoría sugerida por IA (US-020) para prefill del combobox. */
  suggestedCategoryCode?: string;
  /** Ref al elemento que disparó la apertura del modal, para devolver el foco al cerrar. */
  returnFocusRef?: React.RefObject<HTMLElement>;
}

function fieldErrorFromApi(err: ApiError, field: string): string | null {
  if (!Array.isArray(err.details)) return null;
  const found = (err.details as Array<{ field?: string; message?: string }>).find(
    (d) => d?.field === field,
  );
  return typeof found?.message === 'string' ? found.message : null;
}

// Los controles nativos se estilan aquí en vez de sustituirse por `Input`/`Select` porque van
// cableados con `register()` de react-hook-form, que necesita la ref del elemento.
const LABEL = 'font-ui text-label text-primary';
const CONTROL =
  'focus-ring w-full rounded-input border border-default bg-surface px-3 py-2 ' +
  'font-body text-body-sm text-primary placeholder:text-muted ' +
  'aria-[invalid=true]:border-feedback-error disabled:bg-surface-disabled';

export function CreateTaskDialog({
  eventId,
  isOpen,
  onClose,
  categoryOptions = [],
  suggestedCategoryCode,
  returnFocusRef,
}: CreateTaskDialogProps): JSX.Element {
  const t = useTranslations('checklist.create');
  const titleId = useId();
  const formId = `${titleId}-form`;
  const titleInputRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const mutation = useCreateEventTask(eventId);

  const form = useForm<CreateEventTaskFormValues>({
    resolver: zodResolver(createEventTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDateLocal: '',
      categoryCode: suggestedCategoryCode ?? '',
    },
  });

  // Formulario limpio en cada apertura. El foco inicial lo pone `Modal` (`initialFocus`).
  useEffect(() => {
    if (!isOpen) return;
    setGlobalError(null);
    form.reset({
      title: '',
      description: '',
      dueDateLocal: '',
      categoryCode: suggestedCategoryCode ?? '',
    });
  }, [isOpen, form, suggestedCategoryCode]);

  // Al cerrar, el foco vuelve a `returnFocusRef`: el disparador del empty state desaparece al
  // crear la primera tarea, así que no basta con la restauración por defecto del `Modal`.
  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    const raf = window.requestAnimationFrame(() => returnFocusRef?.current?.focus());
    return (): void => window.cancelAnimationFrame(raf);
  }, [isOpen, returnFocusRef]);

  const onSubmit = form.handleSubmit(async (values) => {
    setGlobalError(null);
    try {
      await mutation.mutateAsync(toCreatePayload(values));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        // 400 VALIDATION_ERROR con details.field → error inline
        if (err.status === 400 && err.code === 'VALIDATION_ERROR') {
          const titleErr = fieldErrorFromApi(err, 'title');
          if (titleErr) form.setError('title', { type: 'server', message: titleErr });
          const descErr = fieldErrorFromApi(err, 'description');
          if (descErr) form.setError('description', { type: 'server', message: descErr });
          const dueErr = fieldErrorFromApi(err, 'due_date');
          if (dueErr) form.setError('dueDateLocal', { type: 'server', message: dueErr });
          const catErr = fieldErrorFromApi(err, 'category_code');
          if (catErr) form.setError('categoryCode', { type: 'server', message: catErr });
        } else if (err.code === 'CATEGORY_NOT_AVAILABLE') {
          form.setError('categoryCode', { type: 'server', message: 'category_not_available' });
        } else if (err.code === 'DUE_DATE_IN_PAST') {
          form.setError('dueDateLocal', { type: 'server', message: 'due_date_in_past' });
        } else if (err.code === 'EVENT_NOT_MUTABLE') {
          setGlobalError(t('errors.eventNotMutable'));
        } else if (err.status === 404) {
          setGlobalError(t('errors.notFound'));
        } else if (err.status === 403) {
          setGlobalError(t('errors.forbidden'));
        } else if (err.status === 401) {
          setGlobalError(t('errors.unauthorized'));
        } else {
          setGlobalError(t('errors.generic'));
        }
      } else {
        setGlobalError(t('errors.generic'));
      }
    }
  });

  const titleErr = form.formState.errors.title?.message;
  const descErr = form.formState.errors.description?.message;
  const dueErr = form.formState.errors.dueDateLocal?.message;
  const catErr = form.formState.errors.categoryCode?.message;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t('title')}
      showCloseButton={false}
      initialFocus={titleInputRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            isLoading={mutation.isPending}
            loadingLabel={t('submitting')}
          >
            {t('submit')}
          </Button>
        </>
      }
    >
      {globalError && (
        <div
          className="mb-4 rounded-card border border-feedback-error bg-feedback-error p-3 text-body-sm text-feedback-error"
          role="alert"
          aria-live="assertive"
        >
          {globalError}
        </div>
      )}

      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={LABEL} htmlFor={`${titleId}-title`}>
            {t('fields.title.label')}
          </label>
          <input
            id={`${titleId}-title`}
            type="text"
            className={CONTROL}
            maxLength={200}
            aria-describedby={titleErr ? `${titleId}-title-err` : undefined}
            aria-invalid={titleErr ? 'true' : undefined}
            {...form.register('title')}
            ref={(el): void => {
              form.register('title').ref(el);
              titleInputRef.current = el;
            }}
          />
          {titleErr && (
            <p
              id={`${titleId}-title-err`}
              className="text-caption text-feedback-error"
              aria-live="assertive"
            >
              {t(`fields.title.errors.${String(titleErr)}` as never)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className={LABEL} htmlFor={`${titleId}-desc`}>
            {t('fields.description.label')}
          </label>
          <textarea
            id={`${titleId}-desc`}
            className={CONTROL}
            maxLength={2000}
            aria-describedby={descErr ? `${titleId}-desc-err` : undefined}
            aria-invalid={descErr ? 'true' : undefined}
            {...form.register('description')}
          />
          {descErr && (
            <p
              id={`${titleId}-desc-err`}
              className="text-caption text-feedback-error"
              aria-live="assertive"
            >
              {t(`fields.description.errors.${String(descErr)}` as never)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className={LABEL} htmlFor={`${titleId}-due`}>
            {t('fields.dueDate.label')}
          </label>
          <input
            id={`${titleId}-due`}
            type="datetime-local"
            className={CONTROL}
            aria-describedby={dueErr ? `${titleId}-due-err` : undefined}
            aria-invalid={dueErr ? 'true' : undefined}
            {...form.register('dueDateLocal')}
          />
          {dueErr && (
            <p
              id={`${titleId}-due-err`}
              className="text-caption text-feedback-error"
              aria-live="assertive"
            >
              {t(`fields.dueDate.errors.${String(dueErr)}` as never)}
            </p>
          )}
        </div>

        {categoryOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className={LABEL} htmlFor={`${titleId}-cat`}>
              {t('fields.category.label')}
            </label>
            <select
              id={`${titleId}-cat`}
              className={CONTROL}
              aria-describedby={catErr ? `${titleId}-cat-err` : undefined}
              aria-invalid={catErr ? 'true' : undefined}
              {...form.register('categoryCode')}
            >
              <option value="">{t('fields.category.none')}</option>
              {categoryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                  {suggestedCategoryCode === c.code ? ` — ${t('fields.category.aiHint')}` : ''}
                </option>
              ))}
            </select>
            {catErr && (
              <p
                id={`${titleId}-cat-err`}
                className="text-caption text-feedback-error"
                aria-live="assertive"
              >
                {t(`fields.category.errors.${String(catErr)}` as never)}
              </p>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
