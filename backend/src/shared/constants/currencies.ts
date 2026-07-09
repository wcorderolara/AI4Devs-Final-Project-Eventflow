// Monedas soportadas (US-092 / BE-004). Fuente de verdad: enum `CurrencyCode` del schema Prisma
// (US-099, prisma/schema.prisma). Se mantiene alineado con la BD; no hardcodear en los schemas.
export const SUPPORTED_CURRENCIES = ['GTQ', 'EUR', 'MXN', 'COP', 'USD'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
