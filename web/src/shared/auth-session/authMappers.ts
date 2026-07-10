import type { AuthSession, AuthSessionResponseDTO } from './types';

/** Mapper puro DTO backend → frontend model (Doc 15 §24). No devolver DTOs crudos al UI. */
export function mapAuthSessionResponseToAuthSession(dto: AuthSessionResponseDTO): AuthSession {
  return {
    user: {
      id: dto.user.id,
      email: dto.user.email,
      displayName: dto.user.displayName,
    },
    role: dto.role,
    locale: dto.locale,
  };
}
