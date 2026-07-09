// Shared kernel — PrismaPersistenceError → HTTP 500 PERSISTENCE_ERROR (US-093 / BE-003).
// Doc 14 §18.1. Fallo en la capa de persistencia (Prisma). El `originalError` va al log interno;
// el cliente recibe un mensaje genérico (nunca detalles de BD/SQL).
import { InfrastructureError } from './infrastructure.error.js';
import { ErrorCodes } from './error-codes.js';

export class PrismaPersistenceError extends InfrastructureError {
  readonly code = ErrorCodes.PERSISTENCE_ERROR;

  constructor(originalError?: unknown, message = 'Persistence error') {
    super(message, originalError);
  }
}
