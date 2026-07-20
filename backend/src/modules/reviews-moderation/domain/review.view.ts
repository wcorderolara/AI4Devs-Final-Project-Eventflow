// Vista de dominio Review (US-065). Serializable — todas las fechas se emiten en ISO 8601 UTC.
// Se preserva `bookingIntentId` porque forma parte del schema físico (US-090); el contrato
// público del endpoint acepta `event_id + vendor_profile_id` y la use case deriva el
// `bookingIntentId` desde el `BookingIntent.confirmed_intent` correspondiente al par.
//
// `status` se tipa literalmente (sin importar el enum Prisma) para preservar la disciplina
// domain-agnostic (ADR-ARCH-002): el domain no depende de SDKs de infraestructura.

export type ReviewStatusLiteral = 'published' | 'hidden' | 'removed';

export interface ReviewView {
  id: string;
  eventId: string;
  vendorProfileId: string;
  bookingIntentId: string;
  authorUserId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatusLiteral;
  createdAt: string;
  updatedAt: string;
}
