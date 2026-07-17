// Errores de dominio del endpoint `PATCH /api/v1/quotes/:quoteId/preferred` (US-058 / BE-003).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details`.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * Quote no es preferable: `status ≠ 'sent'` (EC-01, VR-03) o Quote vencida (`valid_until <
 * clock.now()`). Emite `409 QUOTE_NOT_PREFERABLE` con `details.current_status` (o `expired`
 * cuando la ventana de validez ya pasó).
 */
export class QuoteNotPreferableError extends AppError {
  readonly code = ErrorCodes.QUOTE_NOT_PREFERABLE;
  constructor(
    public readonly currentStatus: string,
    message = 'Quote is not preferable in its current state',
  ) {
    super(message);
  }
}
