'use client';

// BookingDisclaimer (US-063 / PB-P1-037 / FE-001). Client Component compartido reusado por
// `CreateBookingDialog` (US-060) y `ConfirmBookingDialog` (US-061) — Decisión D4.
//
// Responsabilidad única: renderizar el copy legal del disclaimer (versión `v1` — Decisión D3 + D7)
// junto a un checkbox con label accesible que propaga el estado a través del callback
// `onAcceptedChange`. El componente NO envía el request al backend; el diálogo padre orquesta
// la mutación y decide cuándo la CTA se habilita (`disabled={!accepted}`) — server enforcement
// bilateral en `POST /booking-intents` (create) y `POST /booking-intents/:id/confirm`
// (confirm, US-063 D1).
//
// Accesibilidad (Decisión D4 + AC-A11Y):
//   - `role="region"` + `aria-labelledby` conecta el heading del disclaimer con el bloque completo.
//   - Checkbox `<input type="checkbox">` con `<label htmlFor>` explícito para lectores de pantalla.
//   - `aria-describedby` en el checkbox apunta al párrafo con el copy legal (que el screen reader
//     lea el copy después del label, sin duplicarlo).
//   - Version badge visible (footer) — permite auditoría legal manual sin abrir DevTools.
//   - Compatible con navegación por teclado (checkbox nativo — no requiere ARIA custom).
//
// El componente puede recibir un `checkboxRef` opcional para que el dialog padre gestione el foco
// inicial (patrón usado por `CreateBookingDialog` — el disclaimer es el primer control obligatorio).
import { forwardRef, useCallback, useEffect, useId } from 'react';
import { useTranslations } from 'next-intl';
import {
  BOOKING_DISCLAIMER_COPY_VERSION,
  type BookingDisclaimerMode,
} from '../shared/disclaimer';

export interface BookingDisclaimerProps {
  /** `create` (organizer, US-060) o `confirm` (vendor, US-061). Reservado para variantes futuras. */
  mode: BookingDisclaimerMode;
  /** Se dispara con `true` cuando el usuario marca el checkbox; con `false` cuando lo desmarca. */
  onAcceptedChange: (accepted: boolean) => void;
  /** Estado controlado desde el padre (patrón single source of truth). */
  accepted: boolean;
  /** Deshabilita el checkbox mientras el diálogo padre procesa el submit. */
  disabled?: boolean;
  /**
   * ID del párrafo con el copy legal — usado por el dialog padre para agregarlo al
   * `aria-describedby` del `<div role="dialog">` (redundancia semántica benéfica: el screen reader
   * anuncia el copy tanto al abrir el dialog como al enfocar el checkbox).
   */
  bodyIdRef?: (id: string) => void;
}

export const BookingDisclaimer = forwardRef<HTMLInputElement, BookingDisclaimerProps>(
  function BookingDisclaimer(props, checkboxRef): JSX.Element {
    const { mode, onAcceptedChange, accepted, disabled = false, bodyIdRef } = props;
    const t = useTranslations('booking.disclaimer.v1');

    const regionId = useId();
    const titleId = useId();
    const bodyId = useId();
    const checkboxId = useId();

    // Notificar al dialog padre el id del párrafo — el padre lo agrega a su `aria-describedby`.
    // `useEffect` con dependencias estables evita un ciclo si el padre guarda el id en useState
    // (setState en render ⇒ re-render infinito). `useId` es estable por instancia, así que este
    // efecto corre una sola vez en el mount y en teoría nunca más.
    useEffect(() => {
      if (bodyIdRef) bodyIdRef(bodyId);
    }, [bodyIdRef, bodyId]);

    const onChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        onAcceptedChange(event.target.checked);
      },
      [onAcceptedChange],
    );

    return (
      <section
        id={regionId}
        aria-labelledby={titleId}
        data-mode={mode}
        data-disclaimer-version={BOOKING_DISCLAIMER_COPY_VERSION}
        className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"
      >
        <h3 id={titleId} className="text-sm font-semibold text-amber-900">
          {t('title')}
        </h3>
        <p id={bodyId} className="mt-1 text-xs text-amber-900">
          {t('body')}
        </p>
        <div className="mt-3 flex items-start gap-2">
          <input
            ref={checkboxRef}
            id={checkboxId}
            type="checkbox"
            checked={accepted}
            onChange={onChange}
            disabled={disabled}
            aria-describedby={bodyId}
            className="mt-0.5 h-4 w-4"
          />
          <label htmlFor={checkboxId} className="flex-1 text-xs font-medium text-amber-950">
            {t('checkbox')}
          </label>
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-amber-800/70">
          {t('versionBadge', { version: BOOKING_DISCLAIMER_COPY_VERSION })}
        </p>
      </section>
    );
  },
);
