// Adapter — SystemClock (US-094 / BE-002). Implementa ClockPort para inyección determinista
// en use cases (tests pueden sustituir por un clock fijo). Doc 14 §7.1.
import type { ClockPort } from '../../shared/domain/clock.port.js';

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
