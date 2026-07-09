// Shared kernel — BusinessRuleViolationError → HTTP 422 (US-093 / BE-002). Doc 14 §18.1.
// El `code` es un código de catálogo específico del feature (e.g., CURRENCY_IMMUTABLE) o el base
// `BUSINESS_RULE_VIOLATION`. `details[]` es opcional pero típicamente requerido por la regla.
import { AppError } from './app.error.js';

export class BusinessRuleViolationError extends AppError {
  readonly code: string;

  constructor(
    code: string,
    message: string,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.code = code;
  }
}
