import type { AuthUserDTO } from '../api/authApi.types';
import type { RegisteredUser } from '../types';

/** Mapper puro DTO → modelo frontend (Doc 15 §24: ningún componente consume DTO crudo). */
export function mapAuthUserToRegisteredUser(user: AuthUserDTO): RegisteredUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
  };
}
