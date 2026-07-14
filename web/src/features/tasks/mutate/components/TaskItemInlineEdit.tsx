'use client';

// US-029 (PB-P1-018 / FE-001) — Edición inline por campo de una `TaskListItemDTO`.
//   * Cada campo se abre con click sobre el valor mostrado; el input recibe foco automáticamente.
//   * Atajos teclado: `Enter` guarda, `Esc` cancela, `Tab` avanza.
//   * `aria-describedby` para errores; `aria-live='polite'` para anuncios de éxito.
//   * Reuso del schema mirror `updateEventTaskContentSchema` — un mini-form por campo.
//   * Envía SOLO el campo editado (no arrastra otros); PATCH content acepta cuerpo parcial.
// A11y: WCAG AA — labels asociados, focus visible, mensajes de error con `role=alert`.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/shared/api-client';
import type { TaskListItemDTO } from '../../list/api/tasksListApi.types';
import { useUpdateEventTaskContent } from '../hooks/useMutateEventTask';
import {
  categoryFieldSchema,
  descriptionFieldSchema,
  dueDateFieldSchema,
  titleFieldSchema,
  toContentPayload,
} from '../forms/updateEventTaskContentSchema';

type Field = 'title' | 'description' | 'dueDate' | 'category';

export interface TaskItemInlineEditProps {
  eventId: string;
  task: TaskListItemDTO;
  categoryOptions?: Array<{ code: string; label: string }>;
  readOnly?: boolean;
}

function fieldErrorFromApi(err: ApiError, field: string): string | null {
  if (!Array.isArray(err.details)) return null;
  const found = (err.details as Array<{ field?: string; message?: string }>).find(
    (d) => d?.field === field,
  );
  return typeof found?.message === 'string' ? found.message : null;
}

export function TaskItemInlineEdit({
  eventId,
  task,
  categoryOptions = [],
  readOnly = false,
}: TaskItemInlineEditProps): JSX.Element {
  const t = useTranslations('checklist.mutate');
  const [openField, setOpenField] = useState<Field | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const mutation = useUpdateEventTaskContent(eventId);
  const uid = useId();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (openField) inputRef.current?.focus();
  }, [openField]);

  const close = useCallback((): void => {
    setOpenField(null);
    setErrorMsg(null);
  }, []);

  const handleError = useCallback(
    (err: unknown, backendField: string): void => {
      setSuccessMsg(null);
      if (err instanceof ApiError) {
        if (err.code === 'EMPTY_PATCH') {
          setErrorMsg(t('errors.emptyPatch'));
        } else if (err.code === 'CATEGORY_NOT_AVAILABLE') {
          setErrorMsg(t('errors.categoryNotAvailable'));
        } else if (err.code === 'DUE_DATE_IN_PAST') {
          setErrorMsg(t('errors.dueDateInPast'));
        } else if (err.code === 'EVENT_NOT_MUTABLE') {
          setGlobalError(t('errors.eventNotMutable'));
        } else if (err.status === 404) {
          setGlobalError(t('errors.notFound'));
        } else if (err.status === 403) {
          setGlobalError(t('errors.forbidden'));
        } else if (err.status === 401) {
          setGlobalError(t('errors.unauthorized'));
        } else if (err.status === 400) {
          const detail = fieldErrorFromApi(err, backendField);
          setErrorMsg(detail ?? t('errors.validation'));
        } else {
          setErrorMsg(t('errors.generic'));
        }
      } else {
        setErrorMsg(t('errors.generic'));
      }
    },
    [t],
  );

  async function submitTitle(value: string): Promise<void> {
    const parsed = titleFieldSchema.safeParse(value);
    if (!parsed.success) {
      setErrorMsg(t(`fields.title.errors.${parsed.error.issues[0]?.message ?? 'generic'}` as never));
      return;
    }
    try {
      await mutation.mutateAsync({
        taskId: task.id,
        body: toContentPayload({ title: parsed.data }),
      });
      setSuccessMsg(t('saved'));
      close();
    } catch (err) {
      handleError(err, 'title');
    }
  }

  async function submitDescription(value: string): Promise<void> {
    const parsed = descriptionFieldSchema.safeParse(value);
    if (!parsed.success) {
      setErrorMsg(
        t(
          `fields.description.errors.${parsed.error.issues[0]?.message ?? 'generic'}` as never,
        ),
      );
      return;
    }
    try {
      await mutation.mutateAsync({
        taskId: task.id,
        body: toContentPayload({ description: parsed.data }),
      });
      setSuccessMsg(t('saved'));
      close();
    } catch (err) {
      handleError(err, 'description');
    }
  }

  async function submitDueDate(value: string): Promise<void> {
    const parsed = dueDateFieldSchema.safeParse(value);
    if (!parsed.success) {
      setErrorMsg(
        t(`fields.dueDate.errors.${parsed.error.issues[0]?.message ?? 'generic'}` as never),
      );
      return;
    }
    try {
      await mutation.mutateAsync({
        taskId: task.id,
        body: toContentPayload({ dueDateLocal: parsed.data === '' ? null : parsed.data }),
      });
      setSuccessMsg(t('saved'));
      close();
    } catch (err) {
      handleError(err, 'due_date');
    }
  }

  async function submitCategory(value: string): Promise<void> {
    const parsed = categoryFieldSchema.safeParse(value);
    if (!parsed.success) {
      setErrorMsg(t('errors.validation'));
      return;
    }
    try {
      await mutation.mutateAsync({
        taskId: task.id,
        body: toContentPayload({ categoryCode: parsed.data === '' ? null : parsed.data }),
      });
      setSuccessMsg(t('saved'));
      close();
    } catch (err) {
      handleError(err, 'category_code');
    }
  }

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>, submit: (value: string) => Promise<void>): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement && !e.metaKey && !e.ctrlKey)) {
        // Enter en input/select guarda. En textarea solo Cmd/Ctrl+Enter guarda para permitir saltos de línea.
        e.preventDefault();
        const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        void submit(target.value);
      }
    },
    [close],
  );

  const dueDateLocal = task.due_date ? task.due_date.slice(0, 16) : '';
  const disabled = readOnly || mutation.isPending;

  return (
    <div className="task-inline-edit" aria-busy={mutation.isPending ? 'true' : undefined}>
      {globalError && (
        <div className="banner banner--error" role="alert" aria-live="assertive">
          {globalError}
        </div>
      )}
      {successMsg && !openField && (
        <span className="sr-only" role="status" aria-live="polite">
          {successMsg}
        </span>
      )}

      {/* Title */}
      <div className="task-inline-edit__row">
        <span className="task-inline-edit__label">{t('fields.title.label')}</span>
        {openField === 'title' ? (
          <>
            <input
              type="text"
              id={`${uid}-title`}
              defaultValue={task.title}
              maxLength={200}
              ref={(el): void => {
                inputRef.current = el;
              }}
              onKeyDown={(e): void => onKeyDown(e, submitTitle)}
              aria-describedby={errorMsg ? `${uid}-err` : undefined}
              aria-invalid={errorMsg ? 'true' : undefined}
              disabled={disabled}
            />
            <button type="button" onClick={close} className="btn btn--secondary">
              {t('cancel')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(): void => setOpenField('title')}
            className="task-inline-edit__value"
            disabled={disabled}
          >
            {task.title}
          </button>
        )}
      </div>

      {/* Description */}
      <div className="task-inline-edit__row">
        <span className="task-inline-edit__label">{t('fields.description.label')}</span>
        {openField === 'description' ? (
          <>
            <textarea
              id={`${uid}-desc`}
              defaultValue={task.title /* description no expuesta por TaskListItemDto — se cargará on-demand en versión futura */}
              maxLength={2000}
              ref={(el): void => {
                inputRef.current = el;
              }}
              onKeyDown={(e): void => onKeyDown(e, submitDescription)}
              aria-describedby={errorMsg ? `${uid}-err` : undefined}
              disabled={disabled}
            />
            <button type="button" onClick={close} className="btn btn--secondary">
              {t('cancel')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(): void => setOpenField('description')}
            className="task-inline-edit__value"
            disabled={disabled}
          >
            {t('fields.description.edit')}
          </button>
        )}
      </div>

      {/* Due date */}
      <div className="task-inline-edit__row">
        <span className="task-inline-edit__label">{t('fields.dueDate.label')}</span>
        {openField === 'dueDate' ? (
          <>
            <input
              type="datetime-local"
              id={`${uid}-due`}
              defaultValue={dueDateLocal}
              ref={(el): void => {
                inputRef.current = el;
              }}
              onKeyDown={(e): void => onKeyDown(e, submitDueDate)}
              aria-describedby={errorMsg ? `${uid}-err` : undefined}
              disabled={disabled}
            />
            <button type="button" onClick={close} className="btn btn--secondary">
              {t('cancel')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(): void => setOpenField('dueDate')}
            className="task-inline-edit__value"
            disabled={disabled}
          >
            {task.due_date ?? t('fields.dueDate.empty')}
          </button>
        )}
      </div>

      {/* Category */}
      {categoryOptions.length > 0 && (
        <div className="task-inline-edit__row">
          <span className="task-inline-edit__label">{t('fields.category.label')}</span>
          {openField === 'category' ? (
            <>
              <select
                id={`${uid}-cat`}
                defaultValue={task.category_code ?? ''}
                ref={(el): void => {
                  inputRef.current = el;
                }}
                onKeyDown={(e): void => onKeyDown(e, submitCategory)}
                aria-describedby={errorMsg ? `${uid}-err` : undefined}
                disabled={disabled}
              >
                <option value="">{t('fields.category.none')}</option>
                {categoryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={close} className="btn btn--secondary">
                {t('cancel')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={(): void => setOpenField('category')}
              className="task-inline-edit__value"
              disabled={disabled}
            >
              {task.category_code ?? t('fields.category.none')}
            </button>
          )}
        </div>
      )}

      {errorMsg && openField && (
        <p id={`${uid}-err`} className="field-error" role="alert" aria-live="assertive">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
