// Shared kernel — AIProviderError → HTTP 502 AI_PROVIDER_ERROR (US-093 / BE-003). Doc 14 §18.1.
// Fallo upstream del proveedor IA. El `originalError` va al log interno, nunca al cliente.
// Lo lanzan las historias de features IA (PB-P0-009, PB-P0-011).
import { InfrastructureError } from './infrastructure.error.js';
import { ErrorCodes } from './error-codes.js';

export class AIProviderError extends InfrastructureError {
  readonly code = ErrorCodes.AI_PROVIDER_ERROR;

  constructor(message = 'AI provider error', originalError?: unknown) {
    super(message, originalError);
  }
}
