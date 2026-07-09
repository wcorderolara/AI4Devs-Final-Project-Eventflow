// Barrel — jerarquía de errores del shared kernel (US-093 / BE-001..003).
export { ErrorCodes, type ErrorCode } from './error-codes.js';

// Base
export { AppError } from './app.error.js';
export { InfrastructureError } from './infrastructure.error.js';
export { UnexpectedError } from './unexpected.error.js';

// DomainError — jerarquía canónica
export { ValidationError } from './validation.error.js';
export { AuthenticationError } from './authentication.error.js';
export { AuthorizationError } from './authorization.error.js';
export { NotFoundError } from './not-found.error.js';
export { ConflictError } from './conflict.error.js';
export { BusinessRuleViolationError } from './business-rule-violation.error.js';
export { RateLimitError } from './rate-limit.error.js';
export { BadRequestError } from './bad-request.error.js';

// Alias históricos (US-091) re-basados por herencia
export { UnauthorizedError } from './unauthorized.error.js';
export { ForbiddenError } from './forbidden.error.js';
export { TooManyRequestsError } from './too-many-requests.error.js';

// InfrastructureError — subclases
export { AIProviderError } from './ai-provider.error.js';
export { AITimeoutError } from './ai-timeout.error.js';
export { ExternalIntegrationError } from './external-integration.error.js';
export { PrismaPersistenceError } from './prisma-persistence.error.js';
