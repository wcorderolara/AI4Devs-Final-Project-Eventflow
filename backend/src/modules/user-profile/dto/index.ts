// Barrel — DTOs de user-profile (US-094 / BE-001).
export * from './update-current-user-profile.request.js';
export * from './change-preferred-language.request.js';
export * from './change-password.request.js';
// AuthUserResponseDto (shape público) vive en shared; re-export por conveniencia del controller.
export {
  AuthUserResponseSchema,
  toAuthUserResponse,
  type AuthUserResponse,
} from '../../../shared/dto/auth-user.response.js';
