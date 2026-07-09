// Shared kernel — ClockPort: puerto inyectable para el tiempo (US-090 / BE-001).
// Doc 14 §7.1. Permite tests deterministas sin depender de `Date.now()` real.
// La implementación concreta (SystemClock) pertenece a src/shared/infrastructure/.
export interface ClockPort {
  now(): Date;
}
