// GetCurrentUserUseCase (US-094 / BE-005). AC-03. Resuelve el perfil propio SOLO desde la
// identidad de sesión (`userId` de `req.user`), nunca desde el body/path (§12 Ownership).
import type { UserRepository } from '../../../shared/auth/ports.js';
import type { AuthUser } from '../../../shared/auth/types.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';

export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<AuthUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      // Sesión válida pero usuario inexistente (borrado/revocado) → tratar como no autenticado.
      throw new UnauthorizedError();
    }
    return user;
  }
}
