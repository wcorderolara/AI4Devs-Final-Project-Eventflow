// DTOs de la feature profile (US-006 / US-007). Espejo del contrato backend `/api/v1/users/me*`
// (AuthUserResponse, Doc 16 §23). Ninguna respuesta expone `passwordHash` ni secretos (SEC-07).

export type PreferredLanguage = 'es-LATAM' | 'es-ES' | 'pt' | 'en';

/** Shape público de usuario devuelto por `GET/PATCH /users/me*` (AuthUserResponse). */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'organizer' | 'vendor' | 'admin';
  status: 'active' | 'suspended';
  preferredLanguage: PreferredLanguage;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileEnvelopeDTO {
  data: UserProfile;
  meta: { correlationId: string; timestamp?: string };
}

/** Cuerpo de `PATCH /users/me` (whitelist: `name`, `phone`, `preferredLanguage`). */
export interface UpdateProfileRequestDTO {
  name?: string;
  phone?: string | null;
  preferredLanguage?: PreferredLanguage;
}

/** Cuerpo de `POST /users/me/change-password`. */
export interface ChangePasswordRequestDTO {
  currentPassword: string;
  newPassword: string;
}
