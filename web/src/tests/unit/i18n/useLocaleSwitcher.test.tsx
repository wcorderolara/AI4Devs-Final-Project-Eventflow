// US-081 QA-001 — Tests unitarios del hook `useLocaleSwitcher`. Cubre:
//   AC-01 authenticated: cookie inmediata + refresh + PATCH async.
//   AC-02 anonymous: cookie inmediata + refresh, sin PATCH.
//   AC-03 optimistic rollback: 5xx → cookie revertida + error='SAVE_FAILED'.
//   Idempotencia (no-op cuando el locale actual coincide).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLocaleSwitcher } from '@/shared/i18n/useLocaleSwitcher';
import { server } from '@/tests/msw/server';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn() }),
}));

const mockSessionState = {
  user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
  role: 'organizer' as const,
  isAuthenticated: true,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};
vi.mock('@/shared/auth-session/useSession', () => ({
  useSession: () => mockSessionState,
}));

afterEach(() => {
  refresh.mockClear();
  document.cookie = 'eventflow_locale=; path=/; max-age=0';
  mockSessionState.isAuthenticated = true;
});

function wrapper({ children, locale = 'es-LATAM' }: { children: ReactNode; locale?: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <NextIntlClientProvider locale={locale} messages={{ common: {} }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}

describe('useLocaleSwitcher', () => {
  it('AC-01 authenticated: cookie + refresh + PATCH exitoso deja error=null', async () => {
    let patchCalled = false;
    server.use(
      http.patch('*/api/v1/users/me/preferred-language', async ({ request }) => {
        patchCalled = true;
        const body = (await request.json()) as { preferredLanguage?: string };
        expect(body.preferredLanguage).toBe('en');
        return HttpResponse.json(
          { data: { preferredLanguage: 'en' }, meta: { correlationId: 'r' } },
          { status: 200 },
        );
      }),
    );

    const { result } = renderHook(() => useLocaleSwitcher(), {
      wrapper: ({ children }) => wrapper({ children, locale: 'es-LATAM' }),
    });

    act(() => result.current.switchLocale('en'));

    expect(document.cookie).toContain('eventflow_locale=en');
    expect(refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(patchCalled).toBe(true));
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('AC-02 anonymous: cookie + refresh sin disparar PATCH', async () => {
    mockSessionState.isAuthenticated = false;
    let patchCalled = false;
    server.use(
      http.patch('*/api/v1/users/me/preferred-language', () => {
        patchCalled = true;
        return HttpResponse.json({}, { status: 200 });
      }),
    );

    const { result } = renderHook(() => useLocaleSwitcher(), {
      wrapper: ({ children }) => wrapper({ children, locale: 'es-LATAM' }),
    });

    act(() => result.current.switchLocale('pt'));

    expect(document.cookie).toContain('eventflow_locale=pt');
    expect(refresh).toHaveBeenCalledTimes(1);
    // Espera un turno de microtask para descartar side effects async.
    await new Promise((r) => setTimeout(r, 20));
    expect(patchCalled).toBe(false);
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('AC-03 rollback: 5xx revierte la cookie y expone error=SAVE_FAILED', async () => {
    server.use(
      http.patch('*/api/v1/users/me/preferred-language', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' }, meta: { correlationId: 'r' } },
          { status: 500 },
        ),
      ),
    );

    const { result } = renderHook(() => useLocaleSwitcher(), {
      wrapper: ({ children }) => wrapper({ children, locale: 'es-LATAM' }),
    });

    act(() => result.current.switchLocale('en'));
    // Cookie optimista.
    expect(document.cookie).toContain('eventflow_locale=en');
    expect(refresh).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(result.current.error).toBe('SAVE_FAILED'));
    // Cookie revertida al locale previo.
    expect(document.cookie).toContain('eventflow_locale=es-LATAM');
    // refresh se llama de nuevo tras el rollback.
    expect(refresh).toHaveBeenCalledTimes(2);

    // clearError() descarta el estado.
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it('no-op si el locale seleccionado es el actual', async () => {
    const { result } = renderHook(() => useLocaleSwitcher(), {
      wrapper: ({ children }) => wrapper({ children, locale: 'pt' }),
    });

    act(() => result.current.switchLocale('pt'));

    expect(document.cookie).not.toContain('eventflow_locale=pt');
    expect(refresh).not.toHaveBeenCalled();
  });
});
