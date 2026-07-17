// US-064 (PB-P1-037 / QA-003 / FE-003) — Unit tests de la invalidación cross-domain
// Booking → Budget. Verifica que `useConfirmBookingIntent` y `useCancelBookingIntent`, cuando
// se les pasa `eventId`, invalidan la queryKey canónica `['event', eventId, 'budget']` post-
// mutation exitosa (AC-01 auto-refresh + EC-01 cancel revert).
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { bookingIntentsHandlers } from '@/tests/msw/handlers/booking-intents';
import { useConfirmBookingIntent } from '@/features/booking/hooks/vendorBookingsQueries';
import { useCancelBookingIntent } from '@/features/booking/hooks/bookingsQueries';
import { budgetQueryKey } from '@/features/budget/view/api/budgetApi';

const server = setupServer(...bookingIntentsHandlers);

beforeEach(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  server.close();
});

const EVENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000064';
const INTENT_ID = '99999999-9999-9999-9999-000000000061';

function buildClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('US-064 · useConfirmBookingIntent — cross-domain budget invalidation', () => {
  it('AC-01: con `eventId` invoca `invalidateQueries` sobre la queryKey canónica del budget', async () => {
    const client = buildClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useConfirmBookingIntent({ eventId: EVENT_ID }), {
      wrapper: wrapperFor(client),
    });
    result.current.mutate({ bookingIntentId: INTENT_ID, disclaimerAccepted: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // La invalidación del budget debe usar la queryKey canónica.
    const budgetCall = spy.mock.calls.find(
      (call) => JSON.stringify(call[0]?.queryKey) === JSON.stringify(budgetQueryKey(EVENT_ID)),
    );
    expect(budgetCall).toBeDefined();
  });

  it('AC-01: sin `eventId` NO invalida la query del budget (preserva compat US-061)', async () => {
    const client = buildClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useConfirmBookingIntent(), {
      wrapper: wrapperFor(client),
    });
    result.current.mutate({ bookingIntentId: INTENT_ID, disclaimerAccepted: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const budgetCall = spy.mock.calls.find(
      (call) => JSON.stringify(call[0]?.queryKey) === JSON.stringify(budgetQueryKey(EVENT_ID)),
    );
    expect(budgetCall).toBeUndefined();
  });
});

describe('US-064 · useCancelBookingIntent — cross-domain budget invalidation', () => {
  it('EC-01: con `eventId` invalida la queryKey del budget para forzar el re-fetch post-cancel', async () => {
    const client = buildClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCancelBookingIntent({ eventId: EVENT_ID }), {
      wrapper: wrapperFor(client),
    });
    result.current.mutate({ bookingIntentId: INTENT_ID });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const budgetCall = spy.mock.calls.find(
      (call) => JSON.stringify(call[0]?.queryKey) === JSON.stringify(budgetQueryKey(EVENT_ID)),
    );
    expect(budgetCall).toBeDefined();
  });
});
