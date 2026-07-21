// US-084 (PB-P1-049 / BE-001) — LOCALE_LABEL + composeLocaleInstruction.
// Helper compartido para que los AI adapters inyecten al inicio del prompt una instrucción
// explícita de idioma con el nombre "humano" del locale (más efectiva empíricamente que pasar
// solo el código ISO en el prompt system). Ver AC-02 y §7 del Technical Spec.
//
// Diseño:
//   - Puro (sin side-effects), síncrono, sin dependencias externas.
//   - Cerrado sobre `SupportedLanguage` (whitelist canónica US-092). Cualquier ampliación de
//     idiomas requiere extender ambos mapas: `SUPPORTED_LANGUAGES` (constants) y este mapa.
//   - `composeLocaleInstruction` termina en `\n\n` para separar la directiva del resto del
//     system prompt sin que el LLM la pegue accidentalmente al contenido semántico.
import { type SupportedLanguage } from '../constants/languages.js';

export const LOCALE_LABEL: Record<SupportedLanguage, string> = {
  'es-LATAM': 'español latinoamericano',
  'es-ES': 'español de España',
  pt: 'português brasileiro',
  en: 'English',
};

/**
 * Devuelve la directiva sistémica de idioma que se prepende al prompt del provider IA.
 * El formato es intencional: `IMPORTANTE:` gana atención en modelos modernos y `\n\n` cierra la
 * directiva antes del contenido específico de la feature.
 */
export function composeLocaleInstruction(locale: SupportedLanguage): string {
  return `IMPORTANTE: Responde estrictamente en ${LOCALE_LABEL[locale]}. No mezcles idiomas.\n\n`;
}
