'use client';

// StarRating (US-065 / PB-P1-038 / FE-001). Componente accesible reutilizable — Doc UX §Reviews.
//
// Contrato de accesibilidad (WAI-ARIA APG — Radio Group):
//   - `<div role="radiogroup" aria-labelledby={labelId}>` contiene las 5 estrellas.
//   - Cada estrella es `<button type="button" role="radio" aria-checked>` con `aria-label`
//     localizado (ej. "3 de 5 estrellas") y `tabIndex` roving (solo el seleccionado o el 1º
//     recibe `tabIndex=0`; el resto `tabIndex=-1` — APG pattern).
//   - Navegación con teclado: `ArrowRight`/`ArrowUp` incrementa (1→5, wrap), `ArrowLeft`/`ArrowDown`
//     decrementa (5→1, wrap). `Home` = 1, `End` = 5. `Space`/`Enter` confirma la selección.
//   - Cambios se comunican al padre vía `onChange(value)`. Sin `value` seleccionado el group
//     expone `aria-valuenow="0"` sobre el contenedor para lectores de pantalla.
//
// La representación visual (SVG estrellas llenas/vacías) es puramente decorativa (`aria-hidden`).
// El texto significativo vive en el `aria-label` de cada `role="radio"`.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface StarRatingProps {
  /** Id del label externo (ej. "Puntuación") — enlaza `aria-labelledby` del radiogroup. */
  labelId: string;
  /** Valor actual (1..5) o `null` cuando no hay selección. */
  value: number | null;
  /** Se dispara con cada selección válida. */
  onChange: (value: number) => void;
  /** Deshabilita interacción (mientras la mutation está `isPending`). */
  disabled?: boolean;
  /** Clase Tailwind opcional para el contenedor. */
  className?: string;
}

const STARS = [1, 2, 3, 4, 5] as const;

export function StarRating({
  labelId,
  value,
  onChange,
  disabled = false,
  className,
}: StarRatingProps) {
  const t = useTranslations('organizer.review.starRating');
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [focused, setFocused] = useState<number>(value ?? 1);

  useEffect(() => {
    if (value != null) setFocused(value);
  }, [value]);

  const select = useCallback(
    (next: number) => {
      if (disabled) return;
      const clamped = Math.min(5, Math.max(1, next));
      setFocused(clamped);
      onChange(clamped);
      buttonsRef.current[clamped - 1]?.focus();
    },
    [disabled, onChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          event.preventDefault();
          select(focused >= 5 ? 1 : focused + 1);
          return;
        case 'ArrowLeft':
        case 'ArrowDown':
          event.preventDefault();
          select(focused <= 1 ? 5 : focused - 1);
          return;
        case 'Home':
          event.preventDefault();
          select(1);
          return;
        case 'End':
          event.preventDefault();
          select(5);
          return;
        case ' ':
        case 'Enter':
          event.preventDefault();
          select(focused);
          return;
        default:
          return;
      }
    },
    [disabled, focused, select],
  );

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      onKeyDown={handleKeyDown}
      className={className}
      // WAI-ARIA APG (Radio Group): el propio grupo no participa en el tab order —
      // el roving tabIndex vive en los `role="radio"` internos. `tabIndex={-1}`
      // deja el nodo programáticamente enfocable sin exponerlo al Tab natural.
      tabIndex={-1}
    >
      {STARS.map((star) => {
        const isSelected = value === star;
        const isVisiblyFilled = value != null && star <= value;
        const isFocusStop = value != null ? isSelected : star === 1;
        return (
          <button
            key={star}
            ref={(node) => {
              buttonsRef.current[star - 1] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={t('optionLabel', { value: star })}
            tabIndex={isFocusStop ? 0 : -1}
            disabled={disabled}
            onClick={() => select(star)}
            onFocus={() => setFocused(star)}
            data-testid={`star-rating-option-${star}`}
            data-selected={isSelected ? 'true' : 'false'}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width={28}
              height={28}
              viewBox="0 0 24 24"
              fill={isVisiblyFilled ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
