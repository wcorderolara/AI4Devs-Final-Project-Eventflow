// AverageRating — presentación read-only del promedio del vendor (US-066 / PB-P1-039 / FE-002).
//
// Muestra `rating_avg` con estrellas parcialmente llenas + el conteo total pluralizado
// (`{count, plural, one {# reseña} other {# reseñas}}`). Es un componente **presentacional**:
// no captura input (a diferencia de `StarRating` de US-065). El `aria-label` embudo la lectura
// en una sola frase legible ("4.6 de 5 estrellas basado en 25 reseñas") para screen readers.
//
// Estados:
//   - `ratingAvg === null` o `reviewsCount === 0` ⇒ muestra el texto i18n `empty` sin estrellas.
//   - `ratingAvg` presente ⇒ 5 estrellas con el proporcional al rating (round-half a `.5`).
//
// La visualización de estrellas es puramente decorativa (`aria-hidden`) — el texto accesible
// vive en el `aria-label` del contenedor.
'use client';

import { useTranslations } from 'next-intl';

export interface AverageRatingProps {
  ratingAvg: number | null;
  reviewsCount: number;
  className?: string;
}

const MAX_STARS = 5;

function clampRating(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > MAX_STARS) return MAX_STARS;
  return value;
}

function StarRow({ value }: { value: number }) {
  // Cada estrella tiene tres estados posibles: full, half, empty. Rueda simple sin librería.
  const cells = Array.from({ length: MAX_STARS }, (_, index) => {
    const boundary = index + 1;
    if (value >= boundary) return 'full' as const;
    if (value + 0.5 >= boundary) return 'half' as const;
    return 'empty' as const;
  });
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1">
      {cells.map((cell, index) => (
        <span
          key={index}
          className={
            cell === 'full'
              ? 'text-amber-500'
              : cell === 'half'
                ? 'text-amber-400'
                : 'text-neutral-300'
          }
        >
          {cell === 'full' ? '★' : cell === 'half' ? '⯪' : '☆'}
        </span>
      ))}
    </span>
  );
}

export function AverageRating({ ratingAvg, reviewsCount, className }: AverageRatingProps) {
  const t = useTranslations('vendor.profile.reviews.average');

  if (ratingAvg === null || reviewsCount === 0) {
    return (
      <p
        className={
          className ??
          'flex items-center gap-2 text-sm text-neutral-500'
        }
      >
        <StarRow value={0} />
        <span>{t('empty')}</span>
      </p>
    );
  }

  const value = clampRating(ratingAvg);
  const formatted = value.toFixed(1);
  const ariaLabel = t('ariaLabel', {
    rating: formatted,
    max: MAX_STARS,
    count: reviewsCount,
  });

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={
        className ??
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3'
      }
    >
      <div className="flex items-center gap-2 text-lg">
        <StarRow value={value} />
        <span className="font-semibold text-neutral-900" aria-hidden="true">
          {formatted}
        </span>
      </div>
      <p className="text-sm text-neutral-500" aria-hidden="true">
        {t('summary', { count: reviewsCount })}
      </p>
    </div>
  );
}
