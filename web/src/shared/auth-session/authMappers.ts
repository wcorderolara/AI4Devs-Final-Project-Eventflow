import type { AuthSession, UsersMeEnvelopeDTO } from './types';

/** Mapper puro DTO backend → frontend model (Doc 15 §24). No devolver DTOs crudos al UI. */
export function mapUsersMeEnvelopeToAuthSession(dto: UsersMeEnvelopeDTO): AuthSession {
  return {
    user: {
      id: dto.data.id,
      email: dto.data.email,
      displayName: dto.data.name,
    },
    role: dto.data.role,
    locale: dto.data.preferredLanguage,
  };
}
