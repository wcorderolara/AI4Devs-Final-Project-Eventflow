// App Express de test que lanza cada tipo de error (US-093 / QA-002, SEC-001).
// Monta correlationIdMiddleware primero y errorHandlerMiddleware último, como en producción.
import express, { type Express } from 'express';
import { correlationIdMiddleware } from '../../src/shared/interface/middlewares/correlation-id.middleware.js';
import { errorHandlerMiddleware } from '../../src/shared/interface/middlewares/error-handler.middleware.js';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
  RateLimitError,
} from '../../src/shared/domain/errors/index.js';

export function buildErrorTestApp(): Express {
  const app = express();
  app.use(correlationIdMiddleware);

  app.get('/validation', () => {
    throw new ValidationError('Validation failed', [{ field: 'email', message: 'Invalid email' }]);
  });
  app.get('/auth', () => {
    throw new AuthenticationError();
  });
  app.get('/forbidden', () => {
    throw new AuthorizationError('Insufficient permissions', false);
  });
  app.get('/masked', () => {
    throw new AuthorizationError('Acceso denegado', true);
  });
  app.get('/notfound', () => {
    throw new NotFoundError();
  });
  app.get('/conflict', () => {
    throw new ConflictError();
  });
  app.get('/business', () => {
    throw new BusinessRuleViolationError('BUSINESS_RULE_VIOLATION', 'Regla violada', [
      { field: 'currency', message: 'Inmutable' },
    ]);
  });
  app.get('/ratelimit', () => {
    throw new RateLimitError(30);
  });
  app.get('/internal', () => {
    // Mensaje con datos internos que NUNCA deben filtrarse al cliente.
    throw new Error('DB connection string = postgres://user:pass@host/db at Object.<anonymous>');
  });

  app.use(errorHandlerMiddleware);
  return app;
}
