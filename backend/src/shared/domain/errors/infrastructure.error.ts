// Shared kernel — InfrastructureError: raíz de errores de infraestructura (US-093 / BE-003).
// Doc 14 §18.1. Fallos de sistemas externos (IA, persistencia, integraciones). Semántica distinta
// a DomainError. El `originalError` se guarda para el log interno; NUNCA se expone al cliente.
export abstract class InfrastructureError extends Error {
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
