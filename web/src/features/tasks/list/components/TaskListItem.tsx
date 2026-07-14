'use client';

// US-027 (PB-P1-018 / FE-002) — Fila del checklist con badges accesibles.
// `aria-label` combina título + estado + origen + fecha para lectores de pantalla.
// Reusa el patrón del `AIBadge` (semantic hint) sin depender del componente concreto si aún
// no existe en la feature — se renderiza inline como `<span>` con `aria-label` explícito.
//
// US-030 (PB-P1-018 / FE-006): integra `TaskStatusQuickToggle` a la izquierda de la fila
// cuando el `eventId` y (opcionalmente) `eventStatus` están disponibles. El toggle se
// autolimita: si `task.status` no está en el flujo canónico o no hay transiciones válidas,
// retorna null y la fila renderiza igual que antes (no-regresión).
import { useTranslations } from 'next-intl';
import type { TaskListItemDTO } from '../api/tasksListApi.types';
import { TaskStatusQuickToggle } from '../../quick-action';

interface Props {
  item: TaskListItemDTO;
  eventId?: string;
  eventStatus?: 'draft' | 'active' | 'completed' | 'cancelled';
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function TaskListItem({ item, eventId, eventStatus }: Props): JSX.Element {
  const t = useTranslations('checklist');
  const statusLabel = t(`status.${item.status}`);
  const dateLabel = item.due_date ? formatDate(item.due_date, 'default') : t('noDueDate');
  const ariaLabel = [
    t('itemAriaTaskPrefix'),
    item.title,
    t('itemAriaStatusPrefix'),
    statusLabel,
    item.ai_generated ? t('itemAriaAiSuffix') : null,
    item.due_date ? `${t('itemAriaDueSuffix')} ${dateLabel}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <li aria-label={ariaLabel} className="task-list-item">
      {eventId && (
        <TaskStatusQuickToggle eventId={eventId} task={item} eventStatus={eventStatus} />
      )}
      <div className="task-list-item__title">{item.title}</div>
      <div className="task-list-item__badges">
        {/*
          US-032 (FE-003, AC-08, A11Y-03/04) — Badges temporales derivados del DTO.
          Excluyentes visualmente: si `overdue`, se prioriza sobre `is_t_minus_7`. Cada uno
          expone `aria-label` semántico para lectores de pantalla; el color se resuelve por
          design tokens con contraste ≥ 4.5:1 (rojo vencidas / ámbar próximas).
        */}
        {item.overdue ? (
          <span
            className="badge badge--overdue"
            aria-label={t('badgeOverdueAria')}
            data-testid="task-badge-overdue"
          >
            {t('badgeOverdue')}
          </span>
        ) : item.is_t_minus_7 ? (
          <span
            className="badge badge--t-minus-7"
            aria-label={t('badgeTMinus7Aria')}
            data-testid="task-badge-t-minus-7"
          >
            {t('badgeTMinus7')}
          </span>
        ) : null}
        <span className={`badge badge--status badge--status-${item.status}`} aria-hidden="true">
          {statusLabel}
        </span>
        {item.category_code && (
          <span className="badge badge--category" aria-hidden="true">
            {item.category_code}
          </span>
        )}
        {item.ai_generated && (
          <span className="badge badge--ai" aria-label={t('itemAriaAiSuffix')}>
            {t('badgeAi')}
          </span>
        )}
        {item.due_date && (
          <span className="badge badge--due" aria-hidden="true">
            {dateLabel}
          </span>
        )}
      </div>
    </li>
  );
}
