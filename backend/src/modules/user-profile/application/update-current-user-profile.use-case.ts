// UpdateCurrentUserProfileUseCase (US-094 / BE-005). AC-04; VR-08.
// Actualiza SOLO campos permitidos (name/phone/preferredLanguage) del usuario de la sesión.
// El schema estricto ya rechazó email/role/status/hash; aquí no se aceptan por construcción.
import type { UserRepository } from '../../../shared/auth/ports.js';
import type { AuthUser, UpdateProfileInput } from '../../../shared/auth/types.js';

export class UpdateCurrentUserProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(userId: string, fields: UpdateProfileInput): Promise<AuthUser> {
    return this.users.updateProfile(userId, fields);
  }
}
