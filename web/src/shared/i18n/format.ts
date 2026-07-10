import type { Locale } from './config';

// Mapeo de la etiqueta lógica interna `es-LATAM` al tag BCP-47 estándar `es-419` (Español de
// Latinoamérica), requerido por `Intl.*` y por el atributo `lang` del `<html>` (Doc 15 §31.3,
// Documentation Alignment §16). El resto de locales ya son tags BCP-47 válidos.
const BCP47_MAP: Record<Locale, string> = {
  'es-LATAM': 'es-419',
  'es-ES': 'es-ES',
  pt: 'pt',
  en: 'en',
};

/** Convierte un `Locale` interno a su tag BCP-47 efectivo para `Intl.*` / `<html lang>`. */
export function mapToBcp47(locale: Locale): string {
  return BCP47_MAP[locale];
}

export function formatDate(
  date: Date | string,
  locale: Locale,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(mapToBcp47(locale), opts ?? { dateStyle: 'medium' }).format(value);
}

export function formatNumber(
  value: number,
  locale: Locale,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(mapToBcp47(locale), opts).format(value);
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale: Locale,
  opts?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(mapToBcp47(locale), {
      style: 'currency',
      currency,
      ...opts,
    }).format(amount);
  } catch {
    // EC-05: currency no soportada por ICU (RangeError) → formato genérico, sin crash.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`formatCurrency: currency inválida "${currency}", usando formato genérico`);
    }
    return `${amount} ${currency}`;
  }
}
