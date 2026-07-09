// ChangePasswordUseCase (US-094 / BE-005). Cambio de contraseña autenticado: verifica la
// contraseña actual antes de actualizar el hash (SEC-05). Fallo de verificación → 401 genérico.
import type { UserRepository, PasswordHasher } from '../../../shared/auth/ports.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';

export class ChangePasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const user = await this.users.findByIdWithSecret(userId);
    if (!user) throw new UnauthorizedError();

    const ok = await this.hasher.verify(input.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.users.updatePasswordHash(userId, passwordHash);
  }
}
