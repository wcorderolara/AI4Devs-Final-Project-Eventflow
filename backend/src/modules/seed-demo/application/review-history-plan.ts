// Plan puro (sin Prisma) del historial que sostiene las reseñas seed: qué reserva confirmada de qué
// evento ya realizado respalda cada reseña. Respeta las reglas con las que la app crea una reseña
// (US-065): el autor es el dueño del evento, el evento está completado, existe un `confirmed_intent`
// con el proveedor y hay una sola reseña activa por reserva. Además, un evento tiene a lo sumo una
// reserva confirmada por categoría (`uq_booking_intents_event_category_confirmed`).
import {
  LOCAL_CURRENCY,
  REVIEW_EVENTS,
  REVIEWS,
  VENDORS,
  roundPrice,
  seedCountryOf,
  seedPrice,
  type ReviewEventSeed,
  type SeedCurrency,
  type SeedLocationCode,
} from '../infrastructure/data/latam-data.js';

export interface PlannedHistoryBooking {
  /** Índice en `REVIEWS` de la reseña que respalda esta reserva. */
  reviewIndex: number;
  /** Índice en `VENDORS`. */
  vendorIndex: number;
  /** Monto aceptado, en la moneda del evento. */
  amount: number;
}

export interface PlannedHistoryEvent {
  eventIndex: number;
  seed: ReviewEventSeed;
  locationCode: SeedLocationCode;
  currency: SeedCurrency;
  estimatedBudget: number;
  bookings: PlannedHistoryBooking[];
}

/** Variación determinista del monto cotizado respecto al precio de referencia del paquete. */
const AMOUNT_FACTORS = [1, 0.95, 1.05, 1.1] as const;

export function buildReviewHistoryPlan(): PlannedHistoryEvent[] {
  const vendorIndexByName = new Map(VENDORS.map((v, i) => [v.businessName, i]));
  const seen = new Set<string>();
  const slots = REVIEW_EVENTS.map((seed, eventIndex) => ({
    eventIndex,
    seed,
    locationCode: seed.locationCode,
    categories: new Set<string>(),
    bookings: [] as PlannedHistoryBooking[],
  }));

  const reviews = REVIEWS.map((review, reviewIndex) => {
    if (seen.has(review.comment)) throw new Error(`Reseña seed duplicada: "${review.comment}"`);
    seen.add(review.comment);
    const vendorIndex = vendorIndexByName.get(review.vendor);
    if (vendorIndex === undefined) throw new Error(`Reseña seed de un proveedor inexistente: ${review.vendor}`);
    return { reviewIndex, vendorIndex, vendor: VENDORS[vendorIndex]! };
  });

  const place = ({ reviewIndex, vendorIndex, vendor }: (typeof reviews)[number]) => {
    const country = seedCountryOf(vendor.locationCode);
    const free = slots.filter(
      (s) => seedCountryOf(s.seed.locationCode) === country && !s.categories.has(vendor.categoryCode),
    );
    // Primero un evento en la ciudad del proveedor; si no hay, cualquiera del mismo país.
    const slot = free.find((s) => s.locationCode === vendor.locationCode) ?? free[0];
    if (!slot) {
      throw new Error(`Faltan eventos de historial en ${country} para la categoría ${vendor.categoryCode}`);
    }
    slot.categories.add(vendor.categoryCode);
    // El salón fija la ciudad del evento.
    if (vendor.categoryCode === 'venue') slot.locationCode = vendor.locationCode;
    const currency = LOCAL_CURRENCY[vendor.locationCode];
    const factor = AMOUNT_FACTORS[reviewIndex % AMOUNT_FACTORS.length]!;
    slot.bookings.push({ reviewIndex, vendorIndex, amount: seedPrice(vendor.referencePriceGtq * factor, currency) });
  };
  // Salones primero (definen dónde ocurrió cada evento), luego el resto en el orden de `REVIEWS`.
  reviews.filter((r) => r.vendor.categoryCode === 'venue').forEach(place);
  reviews.filter((r) => r.vendor.categoryCode !== 'venue').forEach(place);

  return slots.map((slot) => {
    const locationCode = slot.locationCode;
    const currency = LOCAL_CURRENCY[locationCode];
    slot.bookings.sort((a, b) => a.reviewIndex - b.reviewIndex);
    const total = slot.bookings.reduce((sum, b) => sum + b.amount, 0);
    return {
      eventIndex: slot.eventIndex,
      seed: slot.seed,
      locationCode,
      currency,
      estimatedBudget: roundPrice(Math.max(total, 1) * 1.25, currency),
      bookings: slot.bookings,
    };
  });
}
