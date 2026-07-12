/** Modelo frontend del usuario registrado (Doc 15 §24: DTO → mapper → modelo). */
export interface RegisteredUser {
  id: string;
  email: string;
  name: string;
  role: 'organizer' | 'vendor' | 'admin';
  preferredLanguage: 'es-LATAM' | 'es-ES' | 'pt' | 'en';
}
