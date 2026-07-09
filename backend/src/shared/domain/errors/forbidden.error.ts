// Shared kernel — ForbiddenError → HTTP 403 (US-091 / BE-001; re-basado en US-093 / BE-002).
// Subclase de AuthorizationError (code FORBIDDEN, maskedAs404=false). La lanzan roleMiddleware y
// corsMiddleware. El mapeo HTTP lo hace errorHandlerMiddleware.
import { AuthorizationError } from './authorization.error.js';

export class ForbiddenError extends AuthorizationError {
  constructor(message = 'Insufficient permissions') {
    super(message, false);
  }
}
