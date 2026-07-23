// US-071 (PB-P2-004 / FE-004). `NotificationItem` — renderiza una fila del dropdown
// con destacado visual, hora relativa localizada y click sobre el deep link
// server-side. Sin CTA si `link=null` (EC-03, `aria-disabled="true"`).
//
// US-072 (PB-P2-008 / FE-003): agrega el botón inline `MarkAsReadButton` cuando
// la notif está unread. El botón corta el `onClick` del item para no navegar al
// deep link al marcar (`stopPropagation`).
//
// US-073 (PB-P2-009 / FE-002): agrega la prop opcional `variant`, con default
// derivado de `getVariantForType(notification.type)` (D4). El variant combina
// color + icono + texto complementario (NFR-A11Y-005 anti color-only). Backward
// compatible con callers de US-071 — `variant` puede omitirse y se auto-deriva.
'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import type { NotificationDto } from '../api/notificationsApi';
import { MarkAsReadButton } from './MarkAsReadButton';
import { getVariantForType, type ItemVariant } from './variantMapping';

export interface NotificationItemProps {
  notification: NotificationDto;
  /** US-072 (FE-003): callback opcional invocado al fallar el mark-as-read. */
  onMarkError?: (error: Error) => void;
  /**
   * US-073 (FE-002): variant visual opcional. Si se omite, se deriva de
   * `notification.type` vía `getVariantForType`. Fallback `'neutral'` para
   * types desconocidos (EC-05).
   */
  variant?: ItemVariant;
}

/** Formatea la hora relativa usando `Intl.RelativeTimeFormat` respetando el locale. */
function formatRelative(sentAt: string, locale: string): string {
  const diffMs = new Date(sentAt).getTime() - Date.now();
  const seconds = Math.round(diffMs / 1000);
  const abs = Math.abs(seconds);
  const fmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60) return fmt.format(seconds, 'second');
  if (abs < 3600) return fmt.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return fmt.format(Math.round(seconds / 3600), 'hour');
  return fmt.format(Math.round(seconds / 86_400), 'day');
}

// US-073 (FE-002 / D4): design tokens por variant. Cada variant combina
// (a) borde/fondo (COLOR), (b) icono unicode (ICONO — screen reader ignora
// vía aria-hidden), (c) texto complementario visible (TEXTO, en la fila de
// meta). Anti color-only NFR-A11Y-005.
const VARIANT_STYLES: Record<ItemVariant, { classes: string; icon: string }> = {
  destructive: {
    classes: 'border-l-4 border-l-red-500 bg-red-50/40',
    // ✗ / X
    icon: '✗',
  },
  warning: {
    classes: 'border-l-4 border-l-amber-500 bg-amber-50/40',
    // ⏱ / clock
    icon: '⏱',
  },
  info: {
    classes: 'border-l-4 border-l-blue-500 bg-blue-50/40',
    // 📩 / mail
    icon: '\u{1F4E9}',
  },
  success: {
    classes: 'border-l-4 border-l-emerald-500 bg-emerald-50/40',
    // ✓ / check
    icon: '✓',
  },
  neutral: {
    classes: 'border-l-4 border-l-gray-300 bg-gray-50/40',
    // 🔔 / bell
    icon: '\u{1F514}',
  },
};

export function NotificationItem({
  notification,
  onMarkError,
  variant,
}: NotificationItemProps): ReactElement {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('notifications');
  const disabled = notification.link === null;
  const isUnread = notification.status === 'unread';

  // US-073 (FE-002): resolución del variant. Prop explícita > derivación por
  // type. Fallback `'neutral'` para types desconocidos (EC-05).
  const resolvedVariant: ItemVariant = variant ?? getVariantForType(notification.type);
  const variantStyle = VARIANT_STYLES[resolvedVariant];
  const variantAriaLabel = t(`variants.${resolvedVariant}.aria`);

  const handleActivate = (): void => {
    if (disabled || !notification.link) return;
    router.push(notification.link);
  };

  const containerClass = [
    'group flex w-full flex-col items-start gap-1 border-b border-gray-100 px-4 py-3 text-left outline-none focus-visible:bg-gray-50',
    variantStyle.classes,
    isUnread ? 'bg-blue-50/60' : '',
    disabled ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-gray-50',
  ].join(' ');

  // US-073 (FE-002 / NFR-A11Y-005): `aria-label` combinado — el título es el
  // contenido, y el variant se anuncia como prefijo para que el usuario de
  // lector de pantalla obtenga el mismo canal semántico que el usuario visual.
  const combinedAriaLabel = t('itemAria', {
    title: `${variantAriaLabel} — ${notification.title}`,
  });

  return (
    <li
      data-testid={`us071-notification-item-${notification.id}`}
      data-us071-type={notification.type}
      data-us073-variant={resolvedVariant}
    >
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled || undefined}
        aria-label={combinedAriaLabel}
        onClick={handleActivate}
        className={containerClass}
      >
        <span className="flex items-center gap-2">
          {isUnread ? (
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-blue-600"
            />
          ) : null}
          {/* US-073 (FE-002 / D4): icono visible como refuerzo del color. */}
          <span
            aria-hidden="true"
            className="text-base leading-none"
            data-testid={`us073-variant-icon-${notification.id}`}
          >
            {variantStyle.icon}
          </span>
          <span className="text-sm font-semibold text-gray-900">{notification.title}</span>
        </span>
        {notification.body ? (
          <span className="text-sm text-gray-700">{notification.body}</span>
        ) : null}
        <span className="flex w-full items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-2">
            {/* US-073 (FE-002 / NFR-A11Y-005): texto complementario visible que
                acompaña el color + icono. Anti color-only. */}
            <span
              className="font-medium uppercase tracking-wide"
              data-testid={`us073-variant-label-${notification.id}`}
            >
              {variantAriaLabel}
            </span>
            <time dateTime={notification.sent_at}>
              {formatRelative(notification.sent_at, locale)}
            </time>
          </span>
          {disabled ? <span>{t('linkUnavailable')}</span> : null}
        </span>
      </button>
      {isUnread ? (
        <div className="flex justify-end px-4 pb-2">
          <MarkAsReadButton
            notificationId={notification.id}
            notificationTitle={notification.title}
            onMutationError={onMarkError}
          />
        </div>
      ) : null}
    </li>
  );
}
