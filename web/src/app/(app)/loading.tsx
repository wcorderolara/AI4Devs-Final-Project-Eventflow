'use client';

import { useTranslations } from 'next-intl';
import { Skeleton } from '@/shared/design-system';

/**
 * PB-P2-030 — La UI de carga de ruta de `(app)` adopta `Skeleton` del design system.
 *
 * Cambios respecto de la caja gris anterior:
 * - La forma representa el contenido real de las vistas del group (título + tarjetas + filas) en
 *   lugar de un rectángulo genérico (Component Foundations §28).
 * - El shimmer se apaga con `prefers-reduced-motion` (lo aporta el propio `Skeleton`).
 * - **La región contenedora es la que comunica la carga** (`role="status"` + `aria-busy` + nombre
 *   accesible); los placeholders siguen siendo `aria-hidden`, como exige §28.
 *
 * Se conserva el `aria-busy="true"` previo y el alcance: sólo cubre el área de contenido — el
 * `AppShell` (topbar y sidebar) permanece montado durante la carga, sin spinner de página
 * completa.
 */
export default function Loading() {
  const t = useTranslations('common');

  return (
    // `role="status"` no toma su nombre del contenido, así que el texto de carga se expone también
    // como `aria-label` — mismo tratamiento que el `Spinner` del design system. El `sr-only`
    // garantiza además que la región viva tenga contenido que anunciar al montarse.
    <div
      role="status"
      aria-busy="true"
      aria-label={t('loading')}
      className="w-full max-w-content space-y-6 p-6"
    >
      <span className="sr-only">{t('loading')}</span>
      <Skeleton variant="text" className="max-w-xs" />
      <Skeleton variant="card" count={2} />
      <Skeleton variant="listRow" count={3} />
    </div>
  );
}
