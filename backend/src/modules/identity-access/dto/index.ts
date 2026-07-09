// Barrel — DTOs de identity-access (US-092 / BE-003; ampliado US-094 / BE-001).
export * from './register-user.request.js';
export * from './login-user.request.js';
export * from './password-reset-request.request.js';
export * from './password-reset.request.js';
export * from './user.response.js';
// AuthUserResponseDto es el shape público canónico y vive en shared (lo comparten
// identity-access y user-profile). Se re-exporta aquí por conveniencia de los controllers.
export {
  AuthUserResponseSchema,
  toAuthUserResponse,
  type AuthUserResponse,
} from '../../../shared/dto/auth-user.response.js';
