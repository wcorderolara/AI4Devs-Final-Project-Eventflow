// Shared kernel — EventLanguageNotEditableError → HTTP 409 EVENT_LANGUAGE_NOT_EDITABLE (US-082).
// AC-04, VR-03: `event.languageCode` no puede modificarse cuando el evento está en un estado
// terminal (`completed` o `cancelled`). Se distingue del bloqueo genérico BUSINESS_RULE_VIOLATION
// para que el FE muestre el mensaje/estado apropiado del selector.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class EventLanguageNotEditableError extends AppError {
  readonly code = ErrorCodes.EVENT_LANGUAGE_NOT_EDITABLE;
  readonly details: { currentStatus: 'completed' | 'cancelled' };

  constructor(currentStatus: 'completed' | 'cancelled') {
    super(`Event language cannot be edited in status ${currentStatus}`);
    this.details = { currentStatus };
  }
}
