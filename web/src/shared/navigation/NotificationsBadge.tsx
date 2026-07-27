'use client';

import { useTranslations } from 'next-intl';
import { NotificationButton } from '@/shared/design-system';

/**
 * Acceso a notificaciones del `Topbar` (US-107).
 *
 * PB-P2-029: pasa a `NotificationButton` del design system. El comportamiento se conserva —
 * sigue sin abrir destino y sin contador real— y se **retira el punto rojo decorativo**: era una
 * marca fija que sugería notificaciones sin leer sin ningún dato detrás (Component Foundations
 * §20: «Do not invent real-time notifications»). En cuanto exista el contador real, basta con
 * pasar `count` para que reaparezca el badge, ya con el número anunciado en el nombre accesible.
 *
 * US-073 (PB-P2-009 / FE-005 · Deviation D-07): la mount del `NotificationsBell` real de US-071
 * en este slot se difirió — el componente (con su `<div class="relative">` y `useEffect` de
 * outside-click) genera un timing race con el `Menu` de HeadlessUI del `UserMenu` que rompe el
 * E2E de logout (`auth-logout.spec.ts` en los 3 roles) por motivos aún no completamente
 * triagados. La mount se difiere a un Future US que revisará la interacción entre ambos popovers.
 */
export function NotificationsBadge(): React.JSX.Element {
  const t = useTranslations('navigation');
  return <NotificationButton label={t('notifications.label')} />;
}
