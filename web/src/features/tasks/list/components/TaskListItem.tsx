'use client';

// US-027 (PB-P1-018 / FE-002) — Tarjeta de tarea dentro de la columna del tablero.
// `aria-label` combina título + estado + origen + fecha para lectores de pantalla.
//
// US-030 (PB-P1-018 / FE-006): integra `TaskStatusQuickToggle` al pie de la tarjeta cuando el
// `eventId` y (opcionalmente) `eventStatus` están disponibles. El toggle se autolimita: si
// `task.status` no está en el flujo canónico o no hay transiciones válidas, retorna null y la
// tarjeta se renderiza igual (no-regresión).
//
// Los badges dejan de usar clases BEM sin hoja de estilo (`badge badge--overdue`, …) y pasan a
// las utilidades semánticas del design system. El badge de estado desaparece: en un tablero
// agrupado por estado la columna ya lo dice, y repetirlo en cada tarjeta es ruido.
import { useTranslations } from 'next-intl';
import { cx } from '@/shared/design-system/internal/cx';
import type { TaskListItemDTO } from '../api/tasksListApi.types';
import { TaskStatusQuickToggle } from '../../quick-action';

interface Props {
  item: TaskListItemDTO;
  eventId?: string;
  eventStatus?: 'draft' | 'active' | 'completed' | 'cancelled';
  /**
   * Clase literal de acento superior (`border-t-*`) que aporta la columna, para que la tarjeta se
   * lea como parte de su cubo aunque se mire aislada. Debe llegar ya resuelta: componerla aquí
   * con `replace()` dejaría fuera del CSS la clase (el JIT de Tailwind sólo ve literales).
   */
  accentClassName?: string;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' });
}

const BADGE_BASE =
  'inline-flex items-center rounded-badge border px-1.5 py-0.5 text-caption font-medium';

export function TaskListItem({
  item,
  eventId,
  eventStatus,
  accentClassName,
}: Props): JSX.Element {
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
    <li
      aria-label={ariaLabel}
      className={cx(
        'rounded-card border border-subtle bg-surface p-4 shadow-surface-subtle',
        // El acento va arriba (la columna lo lleva abajo, bajo su título): juntos encuadran
        // visualmente el cubo.
        accentClassName ? cx('border-t-4', accentClassName) : null,
        'transition-shadow duration-fast ease-standard hover:shadow-surface-raised',
        'motion-reduce:transition-none',
      )}
      data-testid={`task-card-${item.id}`}
    >
      <p
        className={cx(
          'font-ui text-body-md font-medium leading-snug text-primary',
          // Una tarea cerrada se lee de un vistazo sin mirar en qué columna cayó.
          item.status === 'done' || item.status === 'skipped'
            ? 'text-secondary line-through'
            : null,
        )}
      >
        {item.title}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/*
          US-032 (FE-003, AC-08, A11Y-03/04) — Badges temporales derivados del DTO.
          Excluyentes visualmente: si `overdue`, se prioriza sobre `is_t_minus_7`. Cada uno
          expone `aria-label` semántico; el color cumple contraste ≥ 4.5:1 vía design tokens
          (rojo vencidas / ámbar próximas).
        */}
        {item.overdue ? (
          <span
            className={cx(BADGE_BASE, 'border-feedback-error bg-feedback-error text-feedback-error')}
            aria-label={t('badgeOverdueAria')}
            data-testid="task-badge-overdue"
          >
            {t('badgeOverdue')}
          </span>
        ) : item.is_t_minus_7 ? (
          <span
            className={cx(
              BADGE_BASE,
              'border-feedback-warning bg-feedback-warning text-feedback-warning',
            )}
            aria-label={t('badgeTMinus7Aria')}
            data-testid="task-badge-t-minus-7"
          >
            {t('badgeTMinus7')}
          </span>
        ) : null}

        {item.category_code && (
          <span
            className={cx(BADGE_BASE, 'border-subtle bg-surface-subtle text-secondary')}
            aria-hidden="true"
          >
            {item.category_code}
          </span>
        )}

        {item.ai_generated && (
          <span
            className={cx(BADGE_BASE, 'border-ai bg-ai-surface text-ai-label')}
            aria-label={t('itemAriaAiSuffix')}
          >
            {t('badgeAi')}
          </span>
        )}

        {item.due_date && (
          <span
            className={cx(BADGE_BASE, 'border-subtle bg-surface text-secondary')}
            aria-hidden="true"
          >
            {dateLabel}
          </span>
        )}
      </div>

      {eventId && (
        <div className="mt-4">
          <TaskStatusQuickToggle eventId={eventId} task={item} eventStatus={eventStatus} />
        </div>
      )}
    </li>
  );
}
