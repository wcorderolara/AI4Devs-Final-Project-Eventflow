import type { AuthUserEnvelopeDTO } from '../api/authApi.types';
import type { RegisteredUser } from '../types';

/** Mapper puro DTO → modelo frontend (Doc 15 §24: ningún componente consume DTO crudo). */
export function mapAuthUserEnvelopeToRegisteredUser(dto: AuthUserEnvelopeDTO): RegisteredUser {
  return {
    id: dto.data.id,
    email: dto.data.email,
    name: dto.data.name,
    role: dto.data.role,
    preferredLanguage: dto.data.preferredLanguage,
  };
}
