// ChangePreferredLanguageUseCase (US-094 / BE-005). AC-04; VR-05.
// Atajo de UpdateProfile limitado al idioma preferido del usuario de la sesión.
import type { UserRepository } from '../../../shared/auth/ports.js';
import type { AuthUser } from '../../../shared/auth/types.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export class ChangePreferredLanguageUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(userId: string, preferredLanguage: SupportedLanguage): Promise<AuthUser> {
    return this.users.updateProfile(userId, { preferredLanguage });
  }
}
