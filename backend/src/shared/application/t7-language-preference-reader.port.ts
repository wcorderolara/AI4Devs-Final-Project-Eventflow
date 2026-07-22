// US-034 (PB-P2-004 / BE-004). Puerto `T7LanguagePreferenceReader` — lookup del
// idioma preferido del organizer para resolver `Notification.language_code` (D6).
// Vive en `shared/application/` para preservar `boundaries/element-types`
// (ADR-ARCH-001): el consumidor `notifications` no puede importar de
// `identity-access` / `event-planning` — el puerto compartido resuelve el crossing.
//
// Structural: `PrismaOrganizerLanguageLookup` (US-082) ya expone `findPreferredLanguage`
// con la misma firma y sirve como adapter reutilizable sin código adicional.
import type { SupportedLanguage } from '../constants/languages.js';

export interface T7LanguagePreferenceReader {
  findPreferredLanguage(userId: string): Promise<SupportedLanguage | null>;
}
