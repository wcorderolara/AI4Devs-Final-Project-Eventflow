'use client';

// US-083 (PB-P1-048 / FE-001, FE-002) — Componente `Money` (referencia `<MoneyDisplay>` en la
// User Story) para render consistente de cifras monetarias en toda la UI. Cubre AC-01..AC-03:
//   - AC-01 símbolo nativo (`Intl.NumberFormat`) + `title` con el código ISO.
//   - AC-01/A11Y `aria-label` con el nombre completo de la moneda en el locale activo
//     (`common.currency.<code>`).
//   - AC-02 el formato depende del locale del usuario, no del `event.language` (D4).
//   - AC-03 el símbolo ambiguo `$` (USD en `en`) se desambigua a "USD 500.00" via
//     `currencyDisplay: 'code'` de `Intl.NumberFormat`.
// EC-05: currency malformada → helper `formatCurrency` degrada a formato genérico sin crash.
import { useLocale as useNextIntlLocale, useTranslations } from 'next-intl';
import { defaultLocale, isSupportedLocale, type Locale } from './config';
import { formatCurrency } from './format';

export interface MoneyProps {
  amount: number;
  currency: string;
  /**
   * Sobrescribe el locale activo. Acepta cualquier `string` para compatibilidad con superficies
   * que reciben `locale` como prop tipada `string`; si el valor no está en la whitelist se
   * degrada al locale activo (defensivo, no lanza).
   */
  locale?: Locale | string;
  className?: string;
  /**
   * Overrides puntuales de `Intl.NumberFormatOptions` (por ejemplo `maximumFractionDigits: 0`
   * para vistas IA sin decimales). No usar para forzar `currencyDisplay`; ese se resuelve
   * internamente por AC-03 (USD ambiguo en `en`).
   */
  formatOptions?: Omit<Intl.NumberFormatOptions, 'style' | 'currency' | 'currencyDisplay'>;
}

// `$` es ambiguo en `en`: USD, MXN y COP comparten glifo con otras monedas del mundo. Con
// `currencyDisplay: 'code'` Intl imprime el ISO code ("USD", "MXN", "COP") en vez del símbolo.
// Solo aplica en `en`; en locales `es-*`/`pt` los formatos ya son inequívocos (MX$, COL$, US$).
const AMBIGUOUS_IN_EN = new Set(['USD', 'MXN', 'COP']);

export function Money({ amount, currency, locale, className, formatOptions }: MoneyProps): React.JSX.Element {
  // Consumimos `useLocale` de next-intl directamente (no el hook custom `useLocale` que además
  // devuelve `setLocale` y depende de `useRouter`) — `<Money>` no necesita mutar la locale y así
  // se puede renderizar en tests sin un App Router montado.
  const activeRaw = useNextIntlLocale();
  const activeLocale: Locale = isSupportedLocale(activeRaw) ? activeRaw : defaultLocale;
  const effectiveLocale: Locale = isSupportedLocale(locale ?? null) ? (locale as Locale) : activeLocale;
  const tCurrency = useTranslations('common.currency');

  const useCodeDisplay = effectiveLocale === 'en' && AMBIGUOUS_IN_EN.has(currency);
  const intlOpts: Intl.NumberFormatOptions | undefined = useCodeDisplay
    ? { ...formatOptions, currencyDisplay: 'code' }
    : formatOptions;
  const formatted = formatCurrency(amount, currency, effectiveLocale, intlOpts);

  // Nombre completo para screen reader. Si el key no existe en messages (currency no soportada
  // o test sin providers), degrada silenciosamente al código ISO — nunca lanza.
  let currencyName: string = currency;
  try {
    const translated = tCurrency(currency);
    // next-intl retorna el key completo (`common.currency.XY`) cuando no encuentra traducción.
    if (translated && !translated.includes('common.currency')) {
      currencyName = translated;
    }
  } catch {
    // key ausente en modo estricto → conservar `currency` como fallback.
  }

  return (
    <span
      className={className}
      title={currency}
      aria-label={`${amount} ${currencyName}`}
    >
      {formatted}
    </span>
  );
}
