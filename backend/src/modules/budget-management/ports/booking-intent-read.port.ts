// US-036 (PB-P1-020 / BE-002, R1) — Port de lectura de BookingIntent desde budget-management.
// Preserva la hexagonalidad: `budget-management` NO importa de `booking-intent`; se define aquí
// la interface y el adapter concreto vive en `booking-intent/infrastructure/`.
export interface BookingIntentReadPort {
  /**
   * Retorna una lista (posiblemente vacía) de `BookingIntent.id` para intents con
   * `status = 'pending'` en el `(eventId, serviceCategoryId)`. Se usa `take: 1` en el adapter
   * para reducir el trabajo; solo importa la existencia (≥ 1).
   */
  findPendingByEventAndCategory(input: {
    eventId: string;
    serviceCategoryId: string;
  }): Promise<{ id: string }[]>;
}
