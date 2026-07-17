// US-096 / QA-001 — Unit tests de policies y DTOs Quote/Booking (sin BD). AC-01/08/09/10; VR.
import { describe, it, expect } from 'vitest';
import {
  canEditQuote,
  canSendQuote,
  canDecideQuote,
  isQuoteExpired,
  defaultValidUntil,
  canMarkViewed,
  canCancelQuoteRequest,
  QUOTE_VALIDITY_DAYS,
} from '../../src/modules/quote-flow/domain/quote-policies.js';
import { canConfirmBooking, canCancelBooking } from '../../src/modules/booking-intent/domain/booking-policies.js';
import {
  CreateQuoteRequestRequestSchema,
  CreateQuoteRequestBodySchema,
  UpdateQuoteRequestBodySchema,
} from '../../src/modules/quote-flow/dto/index.js';
import {
  CreateBookingIntentRequestSchema,
  CancelBookingIntentRequestSchema,
} from '../../src/modules/booking-intent/dto/index.js';

describe('Quote policies (AC-08/AC-09, EC-06/EC-07)', () => {
  it('canEditQuote/canSendQuote solo en draft', () => {
    expect(canEditQuote('draft')).toBe(true);
    expect(canEditQuote('sent')).toBe(false);
    expect(canSendQuote('draft')).toBe(true);
    expect(canSendQuote('accepted')).toBe(false);
  });
  it('canDecideQuote solo en sent', () => {
    expect(canDecideQuote('sent')).toBe(true);
    expect(canDecideQuote('draft')).toBe(false);
    expect(canDecideQuote('accepted')).toBe(false);
  });
  it('isQuoteExpired por estado o ventana vencida', () => {
    const now = new Date('2026-07-09T00:00:00Z');
    expect(isQuoteExpired('expired', null, now)).toBe(true);
    expect(isQuoteExpired('sent', new Date('2026-07-08T00:00:00Z'), now)).toBe(true);
    expect(isQuoteExpired('sent', new Date('2026-07-10T00:00:00Z'), now)).toBe(false);
    expect(isQuoteExpired('sent', null, now)).toBe(false);
  });
  it('defaultValidUntil = createdAt + 15 días (VR-07)', () => {
    const created = new Date('2026-07-01T00:00:00.000Z');
    const vu = defaultValidUntil(created);
    expect(vu.toISOString().slice(0, 10)).toBe('2026-07-16');
    expect(QUOTE_VALIDITY_DAYS).toBe(15);
  });
  it('QuoteRequest: canMarkViewed(sent), canCancel(no terminal)', () => {
    expect(canMarkViewed('sent')).toBe(true);
    expect(canMarkViewed('viewed')).toBe(false);
    expect(canCancelQuoteRequest('sent')).toBe(true);
    expect(canCancelQuoteRequest('cancelled')).toBe(false);
    expect(canCancelQuoteRequest('expired')).toBe(false);
  });
});

describe('Booking policies (AC-11/AC-12)', () => {
  it('confirm solo pending; cancel pending/confirmed_intent', () => {
    expect(canConfirmBooking('pending')).toBe(true);
    expect(canConfirmBooking('confirmed_intent')).toBe(false);
    expect(canCancelBooking('pending')).toBe(true);
    expect(canCancelBooking('confirmed_intent')).toBe(true);
    expect(canCancelBooking('cancelled')).toBe(false);
  });
});

const uuid = '11111111-1111-4111-8111-111111111111';

describe('CreateQuoteRequestRequestSchema (AC-01, VR-02)', () => {
  const valid = {
    vendorProfileId: uuid,
    serviceCategoryId: uuid,
    brief: { summary: 'Boda', requirements: ['catering'], questions: ['¿disponible?'] },
  };
  it('acepta brief válido', () => {
    expect(CreateQuoteRequestRequestSchema.safeParse(valid).success).toBe(true);
  });
  it('rechaza summary vacío o requirements/questions vacíos (VR-02)', () => {
    expect(CreateQuoteRequestRequestSchema.safeParse({ ...valid, brief: { ...valid.brief, summary: '' } }).success).toBe(false);
    expect(CreateQuoteRequestRequestSchema.safeParse({ ...valid, brief: { ...valid.brief, requirements: [] } }).success).toBe(false);
    expect(CreateQuoteRequestRequestSchema.safeParse({ ...valid, brief: { ...valid.brief, questions: [] } }).success).toBe(false);
  });
  it('rechaza campos desconocidos', () => {
    expect(CreateQuoteRequestRequestSchema.safeParse({ ...valid, hacker: 1 }).success).toBe(false);
  });
});

describe('CreateQuoteRequestBodySchema / Update (AC-07/08, VR-06)', () => {
  const valid = {
    totalPrice: '1500.00',
    breakdown: [{ label: 'Servicio', amount: '1500.00' }],
    conditions: 'Anticipo 50%',
    currencyCode: 'GTQ',
  };
  it('acepta quote válido', () => {
    expect(CreateQuoteRequestBodySchema.safeParse(valid).success).toBe(true);
  });
  it('rechaza breakdown vacío / totalPrice no decimal', () => {
    expect(CreateQuoteRequestBodySchema.safeParse({ ...valid, breakdown: [] }).success).toBe(false);
    expect(CreateQuoteRequestBodySchema.safeParse({ ...valid, totalPrice: 'x' }).success).toBe(false);
  });
  it('update acepta subset y rechaza vacío', () => {
    expect(UpdateQuoteRequestBodySchema.safeParse({ totalPrice: '2000.00' }).success).toBe(true);
    expect(UpdateQuoteRequestBodySchema.safeParse({}).success).toBe(false);
  });
});

describe('Booking DTOs (AC-10/AC-12, VR-10, EC-08)', () => {
  // US-060 (PB-P1-036 / BE-001): el DTO original camelCase (`{quoteId}`) fue reemplazado por
  // el body snake_case con disclaimer (`{quote_id, disclaimer_accepted:true}`). El schema legacy
  // se re-exporta como alias del nuevo — DEV-03 del execution record de US-060.
  it('create exige quote_id uuid + disclaimer_accepted booleano', () => {
    expect(
      CreateBookingIntentRequestSchema.safeParse({ quote_id: uuid, disclaimer_accepted: true }).success,
    ).toBe(true);
    expect(
      CreateBookingIntentRequestSchema.safeParse({ quote_id: uuid, disclaimer_accepted: false }).success,
    ).toBe(true);
    expect(
      CreateBookingIntentRequestSchema.safeParse({ quote_id: 'x', disclaimer_accepted: true }).success,
    ).toBe(false);
    expect(
      CreateBookingIntentRequestSchema.safeParse({ quote_id: uuid }).success,
    ).toBe(false);
  });
  it('cancel exige cancellationReason no vacío (VR-10)', () => {
    expect(CancelBookingIntentRequestSchema.safeParse({ cancellationReason: 'no disponible' }).success).toBe(true);
    expect(CancelBookingIntentRequestSchema.safeParse({ cancellationReason: '   ' }).success).toBe(false);
    expect(CancelBookingIntentRequestSchema.safeParse({}).success).toBe(false);
  });
});
