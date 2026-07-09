// Shared kernel — AppError: raíz de la jerarquía de errores de dominio (US-090 / BE-002).
// Doc 14 §7.1. Toda clase de error de dominio del proyecto debe extender de `AppError`.
// El mapping de errores a status HTTP ocurre en el errorHandlerMiddleware (US-091).
export abstract class AppError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
