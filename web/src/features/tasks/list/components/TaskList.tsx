'use client';

// US-027 (PB-P1-018 / FE-002) — Lista semántica del checklist con `<ul role="list">`.
// Se anuncia el conteo con `aria-live="polite"` para que los lectores de pantalla oigan el
// resultado al filtrar/paginar. El skeleton se muestra durante `isPending`.
import { useTranslations } from 'next-intl';
import type { TaskListItemDTO } from '../api/tasksListApi.types';
import { TaskListItem } from './TaskListItem';

interface Props {
  items: TaskListItemDTO[];
  isPending?: boolean;
  total: number;
  // US-030 (FE-006): props opcionales para que `TaskListItem` cablee el `TaskStatusQuickToggle`.
  // Cuando no vienen, la fila se renderiza igual que antes (sin toggle).
  eventId?: string;
  eventStatus?: 'draft' | 'active' | 'completed' | 'cancelled';
}

export function TaskList({ items, isPending, total, eventId, eventStatus }: Props): JSX.Element {
  const t = useTranslations('checklist');
  if (isPending) {
    return (
      <ul className="task-list task-list--skeleton" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={`sk-${i}`} className="task-list-item task-list-item--skeleton" aria-hidden="true">
            &nbsp;
          </li>
        ))}
      </ul>
    );
  }
  return (
    <>
      <div role="status" aria-live="polite" className="task-list__announcement">
        {t('foundCount', { count: total })}
      </div>
      <ul className="task-list">
        {items.map((it) => (
          <TaskListItem
            key={it.id}
            item={it}
            eventId={eventId}
            eventStatus={eventStatus}
          />
        ))}
      </ul>
    </>
  );
}
