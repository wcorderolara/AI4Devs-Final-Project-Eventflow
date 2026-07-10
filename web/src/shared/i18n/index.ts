// Barrel export del módulo i18n. NO re-exporta `request.ts` (server-only, lo consume next-intl).
export {
  locales,
  defaultLocale,
  cookieName,
  localeLabels,
  isSupportedLocale,
  type Locale,
} from './config';
export { mapToBcp47, formatDate, formatNumber, formatCurrency } from './format';
export { useLocale, type UseLocaleResult } from './useLocale';
export { attachLocaleHeader } from './attachLocaleHeader';
export { Money, type MoneyProps } from './Money';
export { LocaleSwitcher } from './LocaleSwitcher';
