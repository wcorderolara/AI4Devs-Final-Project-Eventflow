'use client';

import type { Locale } from './config';
import { formatCurrency } from './format';
import { useLocale } from './useLocale';

export interface MoneyProps {
  amount: number;
  currency: string;
  /** Sobrescribe el locale activo (opcional). */
  locale?: Locale;
}

/**
 * Muestra un monto con `Intl.NumberFormat(locale, { style: 'currency', currency })`.
 * SIN conversión automática de moneda (Doc 15 §32.1/§32.2). La UX completa de currency lock
 * visible vive en la historia de creación de evento.
 */
export function Money({ amount, currency, locale }: MoneyProps): React.JSX.Element {
  const active = useLocale();
  const effectiveLocale = locale ?? active.locale;
  return <span>{formatCurrency(amount, currency, effectiveLocale)}</span>;
}
