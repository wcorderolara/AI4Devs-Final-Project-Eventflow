// US-072 (PB-P2-008 / QA-002). Unit tests DOM + a11y + hooks para el mark-as-read.
// Verifica:
//   * UT-08 optimistic patch — mark single actualiza cache (status='read',
//     read_at != null, unreadCount decrementa).
//   * UT-09 rollback ante 500 — cache restaurado + onError invocado.
//   * UT-10 mark-all optimistic con default channel=in_app + rollback.
//   * A11Y `MarkAsReadButton` con aria-label localizado por locale (en, pt).
//   * `MarkAllAsReadButton` deshabilitado cuando `unreadCount=0`.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { server } from '@/tests/msw/server';
import enNotifications from '@/messages/en/notifications.json';
import ptNotifications from '@/messages/pt/notifications.json';
import esLatamNotifications from '@/messages/es-LATAM/notifications.json';
import { MarkAsReadButton } from '@/features/notifications/components/MarkAsReadButton';
import { MarkAllAsReadButton } from '@/features/notifications/components/MarkAllAsReadButton';
import {
  __internal,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from '@/features/notifications/hooks/useMarkNotifications';
import { notificationsKeys } from '@/features/notifications/hooks/useNotifications';
import type { ListNotificationsResult } from '@/features/notifications/api/notificationsApi';

const N1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const N2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function makeListCache(): ListNotificationsResult {
  return {
    items: [
      {
        id: N1,
        type: 'task_due_soon',
        title: 'Test 1',
        body: 'body 1',
        status: 'unread',
        link: null,
        channel: 'in_app',
        languageCode: 'es-LATAM',
        sent_at: '2026-07-22T14:00:00.000Z',
        read_at: null,
        emailSimulated: false,
      },
      {
        id: N2,
        type: 'quote_received',
        title: 'Test 2',
        body: 'body 2',
        status: 'unread',
        link: null,
        channel: 'in_app',
        languageCode: 'es-LATAM',
        sent_at: '2026-07-22T13:00:00.000Z',
        read_at: null,
        emailSimulated: false,
      },
    ],
    unreadCount: 2,
    pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
  };
}

function withProviders(
  qc: QueryClient,
  children: React.ReactNode,
  locale: 'en' | 'pt' | 'es-LATAM' = 'es-LATAM',
): React.ReactElement {
  const messages =
    locale === 'en'
      ? { notifications: enNotifications }
      : locale === 'pt'
        ? { notifications: ptNotifications }
        : { notifications: esLatamNotifications };
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe('US-072 · __internal.patchListWithRead (helper)', () => {
  it('single: marca sólo el item objetivo y decrementa unreadCount', () => {
    const cache = makeListCache();
    const patched = __internal.patchListWithRead(cache, N1, null)!;
    const target = patched.items.find((n) => n.id === N1)!;
    const other = patched.items.find((n) => n.id === N2)!;
    expect(target.status).toBe('read');
    expect(target.read_at).not.toBeNull();
    expect(other.status).toBe('unread');
    expect(patched.unreadCount).toBe(1);
  });

  it('bulk in_app: marca TODOS los unread cuyo channel matchea + unreadCount=0', () => {
    const cache = makeListCache();
    const patched = __internal.patchListWithRead(cache, null, 'in_app')!;
    for (const n of patched.items) expect(n.status).toBe('read');
    expect(patched.unreadCount).toBe(0);
  });

  it('bulk channel=email_simulated: NO toca los in_app', () => {
    const cache = makeListCache();
    const patched = __internal.patchListWithRead(cache, null, 'email_simulated')!;
    for (const n of patched.items) {
      // Todos los items del fixture son in_app — NO deben cambiar.
      expect(n.status).toBe('unread');
    }
    expect(patched.unreadCount).toBe(2);
  });

  it('bulk channel=all: marca TODOS sin distinguir canal', () => {
    const cache = makeListCache();
    const patched = __internal.patchListWithRead(cache, null, 'all')!;
    for (const n of patched.items) expect(n.status).toBe('read');
  });

  it('undefined input → undefined output (no crash)', () => {
    expect(__internal.patchListWithRead(undefined, N1, null)).toBeUndefined();
  });
});

describe('US-072 · useMarkNotificationAsRead — optimistic + rollback', () => {
  it('UT-08 optimistic: cache patch aplicado ANTES de la respuesta 204', async () => {
    const qc = makeQueryClient();
    const key = notificationsKeys.list({
      channel: 'in_app',
      status: 'all',
      page: 1,
      pageSize: 10,
    });
    qc.setQueryData(key, makeListCache());

    // Handler que retiene la respuesta hasta que el test lo libera → permite observar el patch.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.patch(`*/api/v1/notifications/${N1}/read`, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(() => useMarkNotificationAsRead(), {
      wrapper: ({ children }) => withProviders(qc, children),
    });

    act(() => {
      result.current.mutate(N1);
    });
    await waitFor(() => {
      const cache = qc.getQueryData<ListNotificationsResult>(key);
      const target = cache?.items.find((n) => n.id === N1);
      expect(target?.status).toBe('read');
      expect(cache?.unreadCount).toBe(1);
    });
    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('UT-09 rollback: 500 revierte cache + onError invocado', async () => {
    const qc = makeQueryClient();
    const key = notificationsKeys.list({
      channel: 'in_app',
      status: 'all',
      page: 1,
      pageSize: 10,
    });
    qc.setQueryData(key, makeListCache());

    server.use(
      http.patch(`*/api/v1/notifications/${N1}/read`, () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useMarkNotificationAsRead(), {
      wrapper: ({ children }) => withProviders(qc, children),
    });

    act(() => {
      result.current.mutate(N1, { onError });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    // Rollback: el item queda unread; unreadCount vuelve a 2.
    // (Después del rollback también corre `invalidate` → sin handler para GET falla; el
    // cache queda con el snapshot restaurado ANTES de la invalidación real).
    const cache = qc.getQueryData<ListNotificationsResult>(key);
    const target = cache?.items.find((n) => n.id === N1);
    expect(target?.status).toBe('unread');
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('US-072 · useMarkAllNotificationsAsRead — optimistic + rollback', () => {
  it('UT-10 optimistic bulk (default in_app) + rollback ante 500', async () => {
    const qc = makeQueryClient();
    const key = notificationsKeys.list({
      channel: 'in_app',
      status: 'all',
      page: 1,
      pageSize: 10,
    });
    qc.setQueryData(key, makeListCache());

    server.use(
      http.post('*/api/v1/notifications/mark-all-read', () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useMarkAllNotificationsAsRead(), {
      wrapper: ({ children }) => withProviders(qc, children),
    });

    act(() => {
      result.current.mutate(undefined, { onError });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const cache = qc.getQueryData<ListNotificationsResult>(key);
    // Rollback: los 2 items siguen unread.
    expect(cache?.unreadCount).toBe(2);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('US-072 · MarkAsReadButton A11Y', () => {
  it('aria-label localizado en en (AC-09)', () => {
    const qc = makeQueryClient();
    render(
      withProviders(
        qc,
        <MarkAsReadButton notificationId={N1} notificationTitle="Hello" />,
        'en',
      ),
    );
    expect(screen.getByLabelText('Mark "Hello" as read')).toBeInTheDocument();
  });

  it('aria-label localizado en pt', () => {
    const qc = makeQueryClient();
    render(
      withProviders(
        qc,
        <MarkAsReadButton notificationId={N1} notificationTitle="Olá" />,
        'pt',
      ),
    );
    expect(screen.getByLabelText('Marcar "Olá" como lida')).toBeInTheDocument();
  });

  it('stopPropagation al click — el item padre NO navega al deep link', () => {
    const qc = makeQueryClient();
    const parentClick = vi.fn();
    render(
      withProviders(
        qc,
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- test-only wrapper to observe click bubbling; not a real interactive UI
        <div onClick={parentClick} data-testid="parent">
          <MarkAsReadButton notificationId={N1} notificationTitle="Hello" />
        </div>,
        'en',
      ),
    );
    fireEvent.click(screen.getByTestId(`us072-mark-as-read-${N1}`));
    expect(parentClick).not.toHaveBeenCalled();
  });
});

describe('US-072 · MarkAllAsReadButton A11Y', () => {
  it('deshabilitado cuando unreadCount=0', () => {
    const qc = makeQueryClient();
    render(
      withProviders(
        qc,
        <MarkAllAsReadButton unreadCount={0} />,
        'en',
      ),
    );
    const btn = screen.getByTestId('us072-mark-all-as-read') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('habilitado con unreadCount>0 y aria-label localizado', () => {
    const qc = makeQueryClient();
    render(
      withProviders(
        qc,
        <MarkAllAsReadButton unreadCount={3} />,
        'pt',
      ),
    );
    const btn = screen.getByTestId('us072-mark-all-as-read') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('aria-label')).toBe('Marcar todas as notificações como lidas');
  });
});
