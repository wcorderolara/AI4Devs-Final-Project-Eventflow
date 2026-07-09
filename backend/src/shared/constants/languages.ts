// Idiomas soportados (US-092 / BE-003). Fuente de verdad: enum `LanguageCode` del schema Prisma
// (US-099, prisma/schema.prisma). Default de negocio: `es-LATAM`.
export const SUPPORTED_LANGUAGES = ['es-LATAM', 'es-ES', 'pt', 'en'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
