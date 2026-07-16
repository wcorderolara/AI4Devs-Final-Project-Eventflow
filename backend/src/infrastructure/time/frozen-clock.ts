// Adapter — FrozenClock (US-055 / BE-001). Implementación de `ClockPort` con reloj congelado
// para tests deterministas del `ExpireQuoteRequestsJob` y del `ExpireQuotesJob` (US-053) sin
// depender de `Date.now()`. Doc 14 §7.1 / §Jobs.
//
// `advance(days)` mueve el reloj hacia adelante en incrementos exactos de 24h, útil para
// simular corridas diarias sucesivas dentro de una misma suite.
import type { ClockPort } from '../../shared/domain/clock.port.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class FrozenClock implements ClockPort {
  private current: Date;

  constructor(initial: Date) {
    this.current = new Date(initial.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  advance(days: number): void {
    this.current = new Date(this.current.getTime() + days * MS_PER_DAY);
  }
}
