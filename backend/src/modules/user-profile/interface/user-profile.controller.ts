// Controlador de user-profile (US-094 / API-001). AC-03/AC-04. Todas las operaciones actúan SOLO
// sobre el usuario de la sesión (`req.user.id`); nunca se acepta userId desde body/path (§12).
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { toAuthUserResponse } from '../../../shared/dto/auth-user.response.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type {
  UpdateCurrentUserProfileDto,
  ChangePreferredLanguageDto,
  ChangePasswordDto,
} from '../dto/index.js';
import type { GetCurrentUserUseCase } from '../application/get-current-user.use-case.js';
import type { UpdateCurrentUserProfileUseCase } from '../application/update-current-user-profile.use-case.js';
import type { ChangePreferredLanguageUseCase } from '../application/change-preferred-language.use-case.js';
import type { ChangePasswordUseCase } from '../application/change-password.use-case.js';

export interface UserProfileUseCases {
  getCurrentUser: GetCurrentUserUseCase;
  updateProfile: UpdateCurrentUserProfileUseCase;
  changeLanguage: ChangePreferredLanguageUseCase;
  changePassword: ChangePasswordUseCase;
}

/** Extrae el id del usuario autenticado; la ausencia (no debería ocurrir tras sessionAuth) → 401. */
function requireUserId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

export class UserProfileController {
  constructor(private readonly useCases: UserProfileUseCases) {}

  getMe = async (req: Request, res: Response): Promise<void> => {
    const user = await this.useCases.getCurrentUser.execute(requireUserId(req));
    res.status(200).json(success(toAuthUserResponse(user), req.correlationId ?? ''));
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as UpdateCurrentUserProfileDto;
    const user = await this.useCases.updateProfile.execute(requireUserId(req), body);
    res.status(200).json(success(toAuthUserResponse(user), req.correlationId ?? ''));
  };

  changeLanguage = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as ChangePreferredLanguageDto;
    const user = await this.useCases.changeLanguage.execute(requireUserId(req), body.preferredLanguage);
    res.status(200).json(success(toAuthUserResponse(user), req.correlationId ?? ''));
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as ChangePasswordDto;
    await this.useCases.changePassword.execute(requireUserId(req), {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    res.status(204).end();
  };
}
