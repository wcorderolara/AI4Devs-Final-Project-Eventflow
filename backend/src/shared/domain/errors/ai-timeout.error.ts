// Shared kernel — AITimeoutError → HTTP 504 AI_PROVIDER_TIMEOUT (US-093 / BE-003). Doc 14 §18.1.
// Timeout en la llamada al proveedor IA. `timeoutMs` es contexto interno para el log.
import { InfrastructureError } from './infrastructure.error.js';
import { ErrorCodes } from './error-codes.js';

export class AITimeoutError extends InfrastructureError {
  readonly code = ErrorCodes.AI_PROVIDER_TIMEOUT;

  constructor(
    public readonly timeoutMs?: number,
    message = 'AI provider timeout',
  ) {
    super(message);
  }
}
