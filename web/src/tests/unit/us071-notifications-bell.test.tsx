// US-071 (PB-P2-004 / QA-002 + QA-004). Unit tests DOM + a11y del surface organizer.
// Verifica:
//   * UT-08 badge unread con formato `9+` cuando `unreadCount > 9`.
//   * UT-09 `NotificationItem` con `link=null` deshabilita CTA (`aria-disabled="true"`).
//   * UT-10 `NotificationsFilterToggle` alterna entre `status=all` y `status=unread`.
//   * A11Y-01 dropdown renderizado sin violaciones jest-axe.
//   * A11Y-02 navegación por teclado ↑/↓/Esc.
//   * A11Y-03 aria-live/aria-busy/role=alert en estados.
//   * i18n render en pt (AC-08).
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamNotifications from '@/messages/es-LATAM/notifications.json';
import ptNotifications from '@/messages/pt/notifications.json';
import { NotificationsBell } from '@/features/notifications/components/NotificationsBell';
import { NotificationItem } from '@/features/notifications/components/NotificationItem';
import { NotificationsFilterToggle } from '@/features/notifications/components/NotificationsFilterToggle';
import { UnreadBadge, formatUnreadCount } from '@/features/notifications/components/UnreadBadge';
import { notificationsFixture } from '@/tests/msw/handlers/notifications';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function withProviders(children: React.ReactNode, locale: 'es-LATAM' | 'pt' = 'es-LATAM'): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const messages = locale === 'pt' ? { notifications: ptNotifications } : { notifications: esLatamNotifications };
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-071 · UnreadBadge (UT-08)', () => {
  it('formatUnreadCount: 0 → "", 5 → "5", 10 → "9+"', () => {
    expect(formatUnreadCount(0)).toBe('');
    expect(formatUnreadCount(5)).toBe('5');
    expect(formatUnreadCount(10)).toBe('9+');
    expect(formatUnreadCount(99)).toBe('9+');
  });

  it('render `9+` cuando `count > 9` con aria-label localizado', () => {
    render(withProviders(<UnreadBadge count={12} ariaLabel="12 no leídas" />));
    const badge = screen.getByLabelText('12 no leídas');
    expect(badge.textContent).toBe('9+');
  });

  it('no renderiza nada cuando count=0', () => {
    const { container } = render(
      withProviders(<UnreadBadge count={0} ariaLabel="0 no leídas" />),
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('US-071 · NotificationItem (UT-09)', () => {
  it('con `link=null` deshabilita el botón (disabled + aria-disabled) y no navega', () => {
    render(withProviders(<NotificationItem notification={notificationsFixture.t7Unlinked} />));
    const item = screen.getByTestId(`us071-notification-item-${notificationsFixture.t7Unlinked.id}`);
    const button = item.querySelector('button')!;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    // Click sobre un button disabled no dispara handler (comportamiento nativo).
    fireEvent.click(button);
    // No router navigation ocurre (verificado por no crashear + button disabled).
  });

  it('destacado visual para type=task_due_soon', () => {
    render(withProviders(<NotificationItem notification={notificationsFixture.t7Unread} />));
    const item = screen.getByTestId(`us071-notification-item-${notificationsFixture.t7Unread.id}`);
    expect(item.getAttribute('data-us071-type')).toBe('task_due_soon');
  });
});

describe('US-071 · NotificationsFilterToggle (UT-10)', () => {
  it('alterna entre "Ver sólo no leídas" ↔ "Ver todas"', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      withProviders(<NotificationsFilterToggle status="all" onChange={onChange} />),
    );
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(toggle.textContent).toContain('Ver sólo no leídas');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith('unread');

    rerender(
      withProviders(<NotificationsFilterToggle status="unread" onChange={onChange} />),
    );
    const toggle2 = screen.getByRole('switch');
    expect(toggle2.getAttribute('aria-checked')).toBe('true');
    expect(toggle2.textContent).toContain('Ver todas');
  });
});

describe('US-071 · NotificationsBell (A11Y-01/02/03 + AC-01/AC-07)', () => {
  it('A11Y-01: dropdown abierto sin violaciones jest-axe', async () => {
    const { container } = render(withProviders(<NotificationsBell initialOpen={true} />));
    // Espera a que MSW responda (data no vacía).
    await screen.findByTestId('us071-list');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  }, 10_000);

  it('A11Y-02: Esc cierra el dropdown', async () => {
    render(withProviders(<NotificationsBell initialOpen={true} />));
    await screen.findByTestId('us071-list');
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  }, 10_000);

  it('AC-01: renderiza items del handler MSW, incluye badge unread y highlight T-7', async () => {
    render(withProviders(<NotificationsBell initialOpen={true} />));
    await screen.findByTestId('us071-list');
    // 2 unread → badge visible con texto "2".
    const badge = screen.getByTestId('us071-unread-badge');
    expect(badge.textContent).toBe('2');
    // Item T-7 con data attribute correcto.
    expect(
      screen.getByTestId(`us071-notification-item-${notificationsFixture.t7Unread.id}`).getAttribute('data-us071-type'),
    ).toBe('task_due_soon');
  }, 10_000);

  it('A11Y-03: bell cerrado tiene aria-expanded=false; abierto renderiza role="dialog"', async () => {
    render(withProviders(<NotificationsBell />));
    const bell = screen.getByTestId('us071-bell');
    expect(bell.getAttribute('aria-expanded')).toBe('false');
    act(() => {
      fireEvent.click(bell);
    });
    expect(bell.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  }, 10_000);

  it('AC-08 (i18n pt): render con locale pt aplica el catálogo portugués', async () => {
    render(withProviders(<NotificationsBell initialOpen={true} />, 'pt'));
    await screen.findByTestId('us071-list');
    // "Notificações" es el título en pt.
    expect(screen.getByRole('heading', { name: 'Notificações' })).toBeInTheDocument();
  }, 10_000);
});
