import { formatCurrency } from '@/shared/i18n/format';
import { cx } from '../internal/cx';

/**
 * CurrencyDisplay — presentación de una cifra monetaria.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §26 (`CurrencyDisplay`),
 * BR-EVENT-007 (la moneda del evento es inmutable) y BR-BUDGET-007 (sin conversión).
 * Referencia visual: screen Stitch *Data & Overlays* (columna `Budget (USD)` alineada a la
 * derecha). El tooltip de Stitch menciona un «daily exchange rate»: **no se implementa**, la
 * conversión de divisa está fuera del producto.
 *
 * **No duplica el formateo**: delega en `formatCurrency` de `shared/i18n`, la única definición
 * de `Intl.NumberFormat({ style: 'currency' })` del repositorio (auditado en
 * `tests/unit/i18n/currency-display-audit.test.ts`). Este componente aporta la capa visual y
 * accesible: numeración tabular, código ISO en `title` y descripción para lector de pantalla.
 *
 * `locale` es un locale de EventFlow (`es-LATAM`, `es-ES`, `pt`, `en`); el mapeo a BCP-47 y la
 * degradación ante un valor desconocido los resuelve el helper, no este componente.
 */
export interface CurrencyDisplayProps {
  amount: number;
  /** Código ISO 4217 del evento / cotización. Nunca se sustituye ni se convierte. */
  currencyCode: string;
  locale: string;
  /** `compact` para tarjetas de métrica muy estrechas (`1,2 mil`). */
  notation?: 'standard' | 'compact';
  signDisplay?: Intl.NumberFormatOptions['signDisplay'];
  /**
   * Dígitos decimales. Sólo cuando el dominio lo aprueba (por ejemplo estimaciones de IA sin
   * decimales); por defecto manda la convención de la moneda.
   */
  fractionDigits?: { minimum?: number; maximum?: number };
  /**
   * Fuerza el código ISO en el texto visible en lugar del símbolo. Se usa cuando el símbolo es
   * ambiguo en el locale activo (`$` en `en`). La decisión pertenece al consumidor.
   */
  showCurrencyCode?: boolean;
  /**
   * Nombre accesible completo, ya traducido (`500 quetzales guatemaltecos`). Sin él se compone
   * `<cifra formateada> <código ISO>`, que sigue siendo inequívoco para el lector de pantalla.
   */
  accessibleLabel?: string;
  /**
   * Overrides puntuales de `Intl` para casos ya aprobados por el dominio (por ejemplo las vistas
   * de IA sin decimales). `style`, `currency` y `currencyDisplay` quedan fuera a propósito: los
   * dos primeros son la moneda inmutable del evento y el tercero se decide con
   * `showCurrencyCode`.
   */
  formatOptions?: Omit<Intl.NumberFormatOptions, 'style' | 'currency' | 'currencyDisplay'>;
  /**
   * `inherit` (por defecto) toma el color del contenedor —lo correcto dentro de una celda o un
   * párrafo—; `secondary` atenúa la cifra en usos de metadato.
   */
  tone?: 'inherit' | 'primary' | 'secondary';
  className?: string;
  'data-testid'?: string;
}

const TONE: Record<NonNullable<CurrencyDisplayProps['tone']>, string> = {
  inherit: '',
  primary: 'text-primary',
  secondary: 'text-secondary',
};

export function CurrencyDisplay({
  amount,
  currencyCode,
  locale,
  notation = 'standard',
  signDisplay,
  fractionDigits,
  showCurrencyCode = false,
  accessibleLabel,
  formatOptions,
  tone = 'inherit',
  className,
  'data-testid': testId,
}: CurrencyDisplayProps): React.JSX.Element {
  const formatted = formatCurrency(amount, currencyCode, locale, {
    ...formatOptions,
    ...(notation === 'compact' ? { notation: 'compact' } : {}),
    ...(signDisplay ? { signDisplay } : {}),
    ...(fractionDigits?.minimum !== undefined
      ? { minimumFractionDigits: fractionDigits.minimum }
      : {}),
    ...(fractionDigits?.maximum !== undefined
      ? { maximumFractionDigits: fractionDigits.maximum }
      : {}),
    ...(showCurrencyCode ? { currencyDisplay: 'code' as const } : {}),
  });

  // Si el texto visible ya contiene el código ISO, repetirlo en el nombre accesible sólo añade
  // ruido; en caso contrario se anexa para que `Q1,000.00` no se lea como una cifra sin moneda.
  const label =
    accessibleLabel ??
    (formatted.includes(currencyCode) ? undefined : `${formatted} ${currencyCode}`);

  return (
    <span
      // `title` con el ISO: desambigua el símbolo al pasar el cursor sin ocupar espacio (US-083).
      title={currencyCode}
      aria-label={label}
      data-testid={testId}
      data-currency={currencyCode}
      className={cx('tabular-nums', TONE[tone], className)}
    >
      {formatted}
    </span>
  );
}
