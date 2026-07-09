// Shared kernel — UnauthorizedError → HTTP 401 (US-091 / BE-001; re-basado en US-093 / BE-002).
// Alias histórico de AuthenticationError (code AUTHENTICATION_REQUIRED). Lo lanzan authMiddleware,
// roleMiddleware y ownershipMiddleware; el mapeo HTTP lo hace errorHandlerMiddleware.
import { AuthenticationError } from './authentication.error.js';

export class UnauthorizedError extends AuthenticationError {}
