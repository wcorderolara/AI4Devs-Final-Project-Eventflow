'use client';

// US-031 (PB-P1-017 / FE-001) — Sección "Sugeridas por IA — pendientes".
// Renderiza la lista filtrada (`aiGenerated=true`, `status='pending'`) con multi-select controlado
// por `Set<string>`. Checkbox accesible por tarea (`aria-label` con el título). Delega submit al
// componente hermano `BulkConfirmBar` mediante callbacks — separación de responsabilidades.
import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BulkConfirmBar } from './BulkConfirmBar';
import { BulkResultBanner } from './BulkResultBanner';
import type { ConfirmAITasksBulkResponse } from '../api/tasksBulkApi';

export interface AITaskPendingRow {
  id: string;
  title: string;
}

interface Props {
  eventId: string;
  tasks: AITaskPendingRow[];
  /** Callback opcional para trackear submit desde el consumidor (analítica UI). */
  onSubmit?: (taskIds: string[]) => void;
}

export function AITasksPendingSection({ eventId, tasks, onSubmit }: Props): JSX.Element {
  const t = useTranslations('tasks.bulkConfirm');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<ConfirmAITasksBulkResponse | null>(null);

  const visibleIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  const toggle = useCallback((taskId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected(new Set(visibleIds));
  }, [visibleIds]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleSuccess = useCallback((response: ConfirmAITasksBulkResponse) => {
    setLastResult(response);
    setSelected(new Set());
  }, []);

  if (tasks.length === 0) {
    return (
      <section aria-labelledby="ai-tasks-pending-heading">
        <h2 id="ai-tasks-pending-heading">{t('sectionTitle')}</h2>
        <p role="status">{t('emptyState')}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="ai-tasks-pending-heading">
      <h2 id="ai-tasks-pending-heading">{t('sectionTitle')}</h2>
      {lastResult ? <BulkResultBanner response={lastResult} /> : null}
      <ul>
        {tasks.map((task) => {
          const checked = selected.has(task.id);
          const inputId = `ai-task-${task.id}`;
          return (
            <li key={task.id}>
              <input
                id={inputId}
                type="checkbox"
                checked={checked}
                onChange={(): void => toggle(task.id)}
                aria-label={t('checkboxLabel', { title: task.title })}
              />
              <label htmlFor={inputId}>{task.title}</label>
            </li>
          );
        })}
      </ul>
      <BulkConfirmBar
        eventId={eventId}
        selectedIds={selected}
        visibleIds={visibleIds}
        onSelectAllVisible={selectAllVisible}
        onClearSelection={clearSelection}
        onSuccess={handleSuccess}
        onSubmit={onSubmit}
      />
    </section>
  );
}
