'use client';

// US-028 (PB-P1-018 / FE-001, FE-002, FE-003) — Modal accesible para crear una EventTask manual.
// Implementa:
//   * `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (a11y AC-05).
//   * Focus trap básico (Tab/Shift+Tab dentro del modal) + cierre por `Esc`.
//   * Devuelve foco al disparador al cerrar (`initialFocusRef`).
//   * Campos con `<label>` asociado y `aria-describedby` sobre el error inline.
//   * Errores mapeados por `details.field` a `aria-live="assertive"`.
//   * Banner global para 404 / 403 / 409.
//   * Botón "Crear tarea" deshabilitado durante `isPending` (mitigación doble submit TS-09).
// El formulario usa React Hook Form + Zod mirror (`createEventTaskFormSchema`).
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
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

// `modal-overlay`, `modal-card`, `form-field`, `btn`… eran clases BEM sin hoja de estilo: el
// diálogo se renderizaba como texto plano sobre la página. Se reconstruye con las utilidades del
// design system. Los controles nativos se estilan aquí en vez de sustituirse por `Input`/`Select`
// porque van cableados con `register()` de react-hook-form, que necesita la ref del elemento.
const LABEL = 'font-ui text-label text-primary';
const CONTROL =
  'focus-ring w-full rounded-input border border-default bg-surface px-3 py-2 ' +
  'font-body text-body-sm text-primary placeholder:text-muted ' +
  'aria-[invalid=true]:border-feedback-error disabled:bg-surface-disabled';
const CTA_BASE =
  'focus-ring inline-flex min-h-touch items-center justify-center rounded-button px-4 py-2 ' +
  'font-ui text-body-sm font-medium transition-colors duration-fast ease-standard ' +
  'motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-disabled';

export function CreateTaskDialog({
  eventId,
  isOpen,
  onClose,
  categoryOptions = [],
  suggestedCategoryCode,
  returnFocusRef,
}: CreateTaskDialogProps): JSX.Element | null {
  const t = useTranslations('checklist.create');
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
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

  // Focus inicial y devolución al disparador al cerrar.
  useEffect(() => {
    if (!isOpen) return;
    setGlobalError(null);
    form.reset({
      title: '',
      description: '',
      dueDateLocal: '',
      categoryCode: suggestedCategoryCode ?? '',
    });
    const prev = document.activeElement as HTMLElement | null;
    // Snapshot del ref al momento del `useEffect` — evita el warning de exhaustive-deps
    // (`returnFocusRef.current` puede cambiar entre montaje y cleanup).
    const returnTarget = returnFocusRef?.current;
    const raf = window.requestAnimationFrame(() => titleInputRef.current?.focus());
    return (): void => {
      window.cancelAnimationFrame(raf);
      const target = returnTarget ?? prev;
      target?.focus?.();
    };
  }, [isOpen, form, suggestedCategoryCode, returnFocusRef]);

  // Cierre por Esc + focus trap.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [isOpen, onClose],
  );

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-modal flex items-center justify-center overflow-y-auto bg-scrim p-4"
      role="presentation"
      onKeyDown={onKeyDown}
      // Overlay simple: click en overlay cierra (siempre que no sea sobre el card).
      // El overlay es decorativo; el cierre accesible se ofrece por Esc (focus trap) y por el
      // botón "Cancelar" — no depende del click.
      onClick={(e): void => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-form rounded-modal bg-surface p-6 shadow-overlay-modal"
      >
        <h2 id={titleId} className="font-heading text-h3 text-primary">
          {t('title')}
        </h2>

        {globalError && (
          <div
            className="mt-3 rounded-card border border-feedback-error bg-feedback-error p-3 text-body-sm text-feedback-error"
            role="alert"
            aria-live="assertive"
          >
            {globalError}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL} htmlFor={`${titleId}-title`}>{t('fields.title.label')}</label>
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
              <p id={`${titleId}-title-err`} className="text-caption text-feedback-error" aria-live="assertive">
                {t(`fields.title.errors.${String(titleErr)}` as never)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={LABEL} htmlFor={`${titleId}-desc`}>{t('fields.description.label')}</label>
            <textarea
              id={`${titleId}-desc`}
              className={CONTROL}
              maxLength={2000}
              aria-describedby={descErr ? `${titleId}-desc-err` : undefined}
              aria-invalid={descErr ? 'true' : undefined}
              {...form.register('description')}
            />
            {descErr && (
              <p id={`${titleId}-desc-err`} className="text-caption text-feedback-error" aria-live="assertive">
                {t(`fields.description.errors.${String(descErr)}` as never)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={LABEL} htmlFor={`${titleId}-due`}>{t('fields.dueDate.label')}</label>
            <input
              id={`${titleId}-due`}
              type="datetime-local"
              className={CONTROL}
              aria-describedby={dueErr ? `${titleId}-due-err` : undefined}
              aria-invalid={dueErr ? 'true' : undefined}
              {...form.register('dueDateLocal')}
            />
            {dueErr && (
              <p id={`${titleId}-due-err`} className="text-caption text-feedback-error" aria-live="assertive">
                {t(`fields.dueDate.errors.${String(dueErr)}` as never)}
              </p>
            )}
          </div>

          {categoryOptions.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className={LABEL} htmlFor={`${titleId}-cat`}>{t('fields.category.label')}</label>
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
                <p id={`${titleId}-cat-err`} className="text-caption text-feedback-error" aria-live="assertive">
                  {t(`fields.category.errors.${String(catErr)}` as never)}
                </p>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`${CTA_BASE} border border-action-secondary bg-action-secondary text-primary hover:bg-action-secondary-hover`}
              disabled={mutation.isPending}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className={`${CTA_BASE} bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover`}
              disabled={mutation.isPending}
              aria-busy={mutation.isPending ? 'true' : undefined}
            >
              {mutation.isPending ? t('submitting') : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
