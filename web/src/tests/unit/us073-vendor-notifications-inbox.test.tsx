// US-073 (PB-P2-009 / QA-002 + QA-004) — Unit tests DOM + a11y de la bandeja
// unificada vendor.
//
// Cubre:
//   * UT-04 `getVariantForType('quote_rejected') === 'destructive'`.
//   * UT-05 `getVariantForType('unknown_type') === 'neutral'` (fallback EC-05).
//   * UT-06 `NotificationItem` con `variant='destructive'` renderiza clases
//     rojas + icono + `aria-label` combinado con el variant.
//   * UT-07 `NotificationItem` con `variant='warning'` (quote_expired) renderiza
//     ámbar + icono ⏱ + texto complementario visible.
//   * UT-08 (EC-05) `NotificationItem` con type desconocido cae a `neutral` +
//     copy genérico "Notificación".
//   * UT-09 `NotificationItem` con `link=null` sigue deshabilitando el CTA
//     (regresión US-071 EC-03).
//   * A11Y-01 dropdown vendor con 4 tipos distintos sin violaciones jest-axe.
//   * A11Y-02 anti color-only — cada variant renderiza (a) clase de color +
//     (b) icono visible + (c) texto complementario visible. Verificado por
//     presencia de icono y texto, no sólo por clase CSS.
//   * A11Y-03 render en pt de las 5 variants (i18n × locale).
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamNotifications from '@/messages/es-LATAM/notifications.json';
import ptNotifications from '@/messages/pt/notifications.json';
import { NotificationItem } from '@/features/notifications/components/NotificationItem';
import {
  getVariantForType,
  TYPE_TO_VARIANT,
  type ItemVariant,
} from '@/features/notifications/components/variantMapping';
import type { NotificationDto } from '@/features/notifications/api/notificationsApi';

expect.extend(toHaveNoViolations);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function withProviders(
  children: React.ReactNode,
  locale: 'es-LATAM' | 'pt' = 'es-LATAM',
): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const messages =
    locale === 'pt'
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

const QUOTE_ID = '11111111-1111-4111-8111-111111111111';

function notif(overrides: Partial<NotificationDto> & { id: string; type: string }): NotificationDto {
  return {
    id: overrides.id,
    type: overrides.type,
    title: overrides.title ?? 'Título demo',
    body: overrides.body ?? '',
    status: overrides.status ?? 'read',
    // NOTA: `link` puede ser `null` intencionalmente (EC-03). Se comprueba con
    // `in overrides` para permitir override explícito a `null` sin caer al default.
    link: 'link' in overrides ? overrides.link! : `/vendor/quotes/${QUOTE_ID}`,
    channel: overrides.channel ?? 'in_app',
    languageCode: overrides.languageCode ?? 'es-LATAM',
    sent_at: overrides.sent_at ?? '2026-07-22T14:00:00.000Z',
    read_at: overrides.read_at ?? null,
    emailSimulated: false,
  };
}

describe('US-073 · variantMapping (UT-04, UT-05)', () => {
  it('UT-04: cada tipo canónico del D4 tiene el variant esperado', () => {
    expect(getVariantForType('quote_rejected')).toBe('destructive');
    expect(getVariantForType('quote_expired')).toBe('warning');
    expect(getVariantForType('quote_request_received')).toBe('info');
    expect(getVariantForType('quote_received')).toBe('info');
    expect(getVariantForType('booking_confirmed')).toBe('success');
    expect(getVariantForType('task_due_soon')).toBe('info');
  });

  it('UT-05: type desconocido cae al fallback neutral (EC-05)', () => {
    expect(getVariantForType('unknown_type_future_us')).toBe('neutral');
    expect(getVariantForType('')).toBe('neutral');
  });

  it('TYPE_TO_VARIANT es inmutable (Object.freeze) para evitar mutaciones accidentales', () => {
    expect(Object.isFrozen(TYPE_TO_VARIANT)).toBe(true);
  });
});

describe('US-073 · NotificationItem con variant (UT-06..UT-08 + A11Y-02 anti color-only)', () => {
  it('UT-06: variant=destructive renderiza clases rojas + icono + label localizado', () => {
    render(
      withProviders(
        <NotificationItem
          notification={notif({
            id: 'nr1',
            type: 'quote_rejected',
            title: 'Cotización rechazada',
          })}
        />,
      ),
    );
    const item = screen.getByTestId('us071-notification-item-nr1');
    expect(item.getAttribute('data-us073-variant')).toBe('destructive');
    // Anti color-only: presencia de icono (aria-hidden) + label complementario
    // VISIBLE con el aria copy del variant.
    const icon = screen.getByTestId('us073-variant-icon-nr1');
    const label = screen.getByTestId('us073-variant-label-nr1');
    expect(icon.textContent).toBe('✗');
    expect(label.textContent).toBe('Rechazo');
    // aria-label del button combina variant + título (WCAG anti color-only).
    const button = item.querySelector('button')!;
    expect(button.getAttribute('aria-label')).toContain('Rechazo');
    expect(button.getAttribute('aria-label')).toContain('Cotización rechazada');
  });

  it('UT-07: variant=warning (quote_expired) renderiza icono ⏱ + label "Aviso"', () => {
    render(
      withProviders(
        <NotificationItem
          notification={notif({
            id: 'nw1',
            type: 'quote_expired',
            title: 'Cotización expirada',
          })}
        />,
      ),
    );
    expect(screen.getByTestId('us073-variant-icon-nw1').textContent).toBe('⏱');
    expect(screen.getByTestId('us073-variant-label-nw1').textContent).toBe('Aviso');
  });

  it('UT-08 (EC-05): type desconocido → variant neutral + label "Notificación"', () => {
    render(
      withProviders(
        <NotificationItem
          notification={notif({
            id: 'nu1',
            type: 'future_type_not_mapped',
            title: 'Algo nuevo',
            link: null,
          })}
        />,
      ),
    );
    const item = screen.getByTestId('us071-notification-item-nu1');
    expect(item.getAttribute('data-us073-variant')).toBe('neutral');
    expect(screen.getByTestId('us073-variant-label-nu1').textContent).toBe('Notificación');
  });

  it('UT-09 (regresión US-071 EC-03): link=null deshabilita CTA y no navega', () => {
    render(
      withProviders(
        <NotificationItem
          notification={notif({
            id: 'nd1',
            type: 'quote_rejected',
            title: 'Sin link',
            link: null,
          })}
        />,
      ),
    );
    const item = screen.getByTestId('us071-notification-item-nd1');
    const button = item.querySelector('button')!;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    // No crash: click sobre disabled no navega (comportamiento nativo).
  });

  it('UT-10: variant explícito override el derivado por type', () => {
    render(
      withProviders(
        <NotificationItem
          notification={notif({
            id: 'no1',
            type: 'quote_rejected', // → destructive por default
            title: 'Override',
          })}
          variant="success"
        />,
      ),
    );
    const item = screen.getByTestId('us071-notification-item-no1');
    expect(item.getAttribute('data-us073-variant')).toBe('success');
  });
});

describe('US-073 · A11Y — anti color-only + Axe (A11Y-01, A11Y-02)', () => {
  const variants: Array<{ type: string; expected: ItemVariant; expectedIcon: string; expectedLabel: string }> = [
    { type: 'quote_rejected', expected: 'destructive', expectedIcon: '✗', expectedLabel: 'Rechazo' },
    { type: 'quote_expired', expected: 'warning', expectedIcon: '⏱', expectedLabel: 'Aviso' },
    { type: 'quote_request_received', expected: 'info', expectedIcon: '\u{1F4E9}', expectedLabel: 'Información' },
    { type: 'booking_confirmed', expected: 'success', expectedIcon: '✓', expectedLabel: 'Confirmación' },
  ];

  it.each(variants)(
    'A11Y-02 anti color-only: type=$type combina color (data-us073-variant=$expected) + icono ($expectedIcon) + texto ($expectedLabel)',
    ({ type, expected, expectedIcon, expectedLabel }) => {
      const id = `av-${type}`;
      render(
        withProviders(
          <NotificationItem notification={notif({ id, type, title: `t-${type}` })} />,
        ),
      );
      const item = screen.getByTestId(`us071-notification-item-${id}`);
      expect(item.getAttribute('data-us073-variant')).toBe(expected);
      expect(screen.getByTestId(`us073-variant-icon-${id}`).textContent).toBe(expectedIcon);
      expect(screen.getByTestId(`us073-variant-label-${id}`).textContent).toBe(expectedLabel);
    },
  );

  it('A11Y-01: lista con 4 tipos vendor renderiza sin violaciones críticas jest-axe', async () => {
    const { container } = render(
      withProviders(
        <ul>
          {variants.map(({ type }) => (
            <NotificationItem
              key={type}
              notification={notif({ id: `a-${type}`, type, title: `Aviso ${type}` })}
            />
          ))}
        </ul>,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('US-073 · i18n (AC-08) — variants localizados en pt', () => {
  it('label del variant se localiza al locale pt (Rejeição / Aviso / Informação / Confirmação / Notificação)', () => {
    const rows: Array<{ type: string; expected: string }> = [
      { type: 'quote_rejected', expected: 'Rejeição' },
      { type: 'quote_expired', expected: 'Aviso' },
      { type: 'quote_request_received', expected: 'Informação' },
      { type: 'booking_confirmed', expected: 'Confirmação' },
      { type: 'unknown_type_pt', expected: 'Notificação' },
    ];
    for (const { type, expected } of rows) {
      const id = `pt-${type}`;
      const { unmount } = render(
        withProviders(
          <NotificationItem notification={notif({ id, type, title: `t-${type}` })} />,
          'pt',
        ),
      );
      expect(screen.getByTestId(`us073-variant-label-${id}`).textContent).toBe(expected);
      unmount();
    }
  });
});
