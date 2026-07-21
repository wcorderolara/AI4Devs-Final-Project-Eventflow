// Puerto de lookup del idioma preferido del organizer (US-082 / BE-002; D3).
// Module-local: solo `event-planning` lo consume para resolver el default heredado del campo
// `event.languageCode` cuando el body no lo incluye. Devuelve `null` si el usuario no existe o
// no tiene `preferredLanguage` — el use case aplica el fallback final `es-LATAM` (EC-01).
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface OrganizerLanguageLookup {
  findPreferredLanguage(userId: string): Promise<SupportedLanguage | null>;
}
