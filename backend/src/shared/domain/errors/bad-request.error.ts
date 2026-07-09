// Shared kernel — BadRequestError → HTTP 400 (US-091 / BE-001).
// Captcha inválido, body malformado, tipo/tamaño de archivo inválido.
import { AppError } from './app.error.js';

export class BadRequestError extends AppError {
  readonly code = 'BAD_REQUEST';

  constructor(message = 'Bad request') {
    super(message);
  }
}
