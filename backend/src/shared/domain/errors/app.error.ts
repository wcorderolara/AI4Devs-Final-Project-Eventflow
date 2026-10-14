// Shared kernel — AppError: raíz de la jerarquía de errores de dominio (US-090 / BE-002).
// Doc 14 §7.1. Toda clase de error de dominio del proyecto debe extender de `AppError`.
// Cada subclase declara su mapeo HTTP (`httpStatus` + `httpDetails()`, o `toHttp()` en los casos
// especiales: masking, mensaje fijo, Retry-After). El errorHandlerMiddleware solo lo serializa.
export interface ErrorDetail {
  field: string;
  message: string;
}

/** Mapeo HTTP de un error: lo que el errorHandlerMiddleware serializa y loguea. */
export interface HttpErrorMapping {
  status: number;
  code: string;
  message: string;
  details?: ErrorDetail[];
  /** 404 que enmascara un 403 (no-revelación); se loguea como `authorization_masked_as_404`. */
  masked?: boolean;
  /** Emite la cabecera `Retry-After`. */
  retryAfterSeconds?: number;
}

export abstract class AppError extends Error {
  abstract readonly code: string;
  /** Status HTTP; 400 por defecto para errores de dominio sin mapeo propio. */
  readonly httpStatus: number = 400;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  toHttp(): HttpErrorMapping {
    const details = this.httpDetails();
    return { status: this.httpStatus, code: this.code, message: this.message, ...(details && { details }) };
  }

  /** `details[]` del envelope de error (ninguno por defecto). */
  protected httpDetails(): ErrorDetail[] | undefined {
    return undefined;
  }
}
