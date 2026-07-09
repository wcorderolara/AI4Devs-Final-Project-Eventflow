// Shared kernel — ExternalIntegrationError → HTTP 502 (US-093 / BE-003). Doc 14 §18.1.
// Fallo de un sistema externo (no IA). `service` identifica el sistema para el log interno.
import { InfrastructureError } from './infrastructure.error.js';
import { ErrorCodes } from './error-codes.js';

export class ExternalIntegrationError extends InfrastructureError {
  readonly code = ErrorCodes.AI_PROVIDER_ERROR;

  constructor(
    public readonly service: string,
    message = 'External integration error',
  ) {
    super(message);
  }
}
