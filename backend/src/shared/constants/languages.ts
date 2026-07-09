// Idiomas soportados (US-092 / BE-003). Fuente de verdad: enum `LanguageCode` del schema Prisma
// (US-099, prisma/schema.prisma). Default de negocio: `es-LATAM`.
export const SUPPORTED_LANGUAGES = ['es-LATAM', 'es-ES', 'pt', 'en'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Mapeo entre el código de idioma del contrato API (`es-LATAM`, con guion) y el valor del enum
// del Prisma Client (`es_LATAM`, con guion bajo — el `@map` solo afecta el valor almacenado en BD).
// US-094 / BE-003: el repositorio traduce en la frontera de persistencia.
export const API_TO_PRISMA_LANGUAGE = {
  'es-LATAM': 'es_LATAM',
  'es-ES': 'es_ES',
  pt: 'pt',
  en: 'en',
} as const satisfies Record<SupportedLanguage, string>;

export const PRISMA_TO_API_LANGUAGE = {
  es_LATAM: 'es-LATAM',
  es_ES: 'es-ES',
  pt: 'pt',
  en: 'en',
} as const satisfies Record<string, SupportedLanguage>;

export type PrismaLanguage = keyof typeof PRISMA_TO_API_LANGUAGE;
