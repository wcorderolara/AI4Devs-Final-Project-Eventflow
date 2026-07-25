/**
 * Parseo y formateo tolerante de montos para `CurrencyInput`.
 *
 * Reglas de negocio que condicionan este módulo (Component Foundations §16 `CurrencyInput`):
 * - **Nunca** hay conversión de moneda (BR-BUDGET-007): sólo se formatea el número.
 * - El valor canónico es **numérico**; la cadena formateada es presentación y no se persiste.
 * - El input acepta tanto `1.234,56` como `1,234.56` porque los cuatro locales soportados
 *   (`es-LATAM`, `es-ES`, `pt`, `en`) no comparten separadores.
 */

function occurrences(text: string, char: string): number {
  let total = 0;
  for (const character of text) if (character === char) total += 1;
  return total;
}

/**
 * Convierte lo que el usuario escribió en un número.
 *
 * Heurística de separadores (necesaria porque los cuatro locales conviven en la misma app):
 * - Si aparecen `,` y `.`, el **último** es el decimal y el otro es agrupación.
 * - Si sólo aparece uno y se repite, es agrupación (`1.234.567`).
 * - Si sólo aparece uno, una vez y con exactamente 3 dígitos detrás, se interpreta como
 *   agrupación (`1.234` → 1234), la lectura mayoritaria al teclear millares.
 * - En cualquier otro caso es el separador decimal (`0,5`, `12.75`).
 *
 * @returns `null` cuando no hay dígitos que interpretar (campo vacío o texto no numérico).
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/\s| | /g, '').replace(/[^0-9,.-]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const commas = occurrences(cleaned, ',');
  const dots = occurrences(cleaned, '.');

  let decimalChar: string | null = null;
  if (commas > 0 && dots > 0) {
    decimalChar = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.';
  } else if (commas === 1 || dots === 1) {
    const char = commas === 1 ? ',' : '.';
    const fraction = cleaned.slice(cleaned.lastIndexOf(char) + 1);
    decimalChar = fraction.length === 3 ? null : char;
  }

  const normalized =
    decimalChar === null
      ? cleaned.replace(/[.,]/g, '')
      : `${cleaned.slice(0, cleaned.lastIndexOf(decimalChar)).replace(/[.,]/g, '')}.${cleaned
          .slice(cleaned.lastIndexOf(decimalChar) + 1)
          .replace(/[.,]/g, '')}`;

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Redondea a la precisión declarada sin arrastrar el ruido binario del float.
 * Se apoya en la representación decimal de `toFixed`, no en aritmética de punto flotante.
 */
export function roundToDecimals(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  return Number(value.toFixed(decimals));
}

/** Formato de lectura (con agrupación) del monto; sin símbolo — el código ISO va como prefijo. */
export function formatAmountForDisplay(value: number, locale: string, decimals: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Formato de edición: sin agrupación, con el separador decimal del locale. */
export function formatAmountForEditing(value: number, locale: string, decimals: number): string {
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}
