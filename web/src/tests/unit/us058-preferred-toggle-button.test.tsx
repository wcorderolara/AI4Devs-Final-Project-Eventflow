// US-058 (PB-P1-035 / QA-004) — Unit tests DOM + a11y del `PreferredToggleButton`.
// Verifica:
//   - `<button>` con `aria-pressed` que refleja `isPreferred`.
//   - `aria-label` dinámico i18n: "Marcar…" cuando `isPreferred=false`, "Quitar…" cuando true.
//   - `selectable=false` ⇒ botón `aria-disabled` y sin dispatch.
//   - Éxito: `preferFn` recibe el nuevo valor y `onSuccess` se dispara con la vista.
//   - Errores del backend por código estable (`QUOTE_NOT_PREFERABLE`, `QUOTE_NOT_FOUND`, ...)
//     ⇒ `onError` recibe el mensaje i18n correspondiente.
//   - jest-axe: 0 violaciones serias en los 2 estados (isPreferred=true/false).
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import { PreferredToggleButton } from '@/features/quotes/components/PreferredToggleButton';
import { ApiError } from '@/shared/api-client';
import type { PreferQuoteView } from '@/features/quotes';

expect.extend(toHaveNoViolations);

const messages = { organizer: esLatamOrganizer };

function withProviders(children: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

const QUOTE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function viewFrom(isPreferred: boolean): PreferQuoteView {
  return {
    id: QUOTE_ID,
    status: 'sent',
    isPreferred,
    quoteRequestId: 'qr111111-1111-1111-1111-111111111111',
  };
}

describe('US-058 · PreferredToggleButton', () => {
  it('AC-01 render inicial (no preferred): aria-pressed=false, aria-label "Marcar…", texto "Marcar preferred"', () => {
    render(
      withProviders(
        <PreferredToggleButton
          quoteId={QUOTE_ID}
          vendorName="Catering Aurora"
          isPreferred={false}
          selectable
        />,
      ),
    );
    const btn = screen.getByRole('button', {
      name: 'Marcar la cotización de Catering Aurora como preferred',
    });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveTextContent('Marcar preferred');
  });

  it('AC-03 render con isPreferred=true: aria-pressed=true, aria-label "Quitar…", texto "Quitar preferred"', () => {
    render(
      withProviders(
        <PreferredToggleButton
          quoteId={QUOTE_ID}
          vendorName="Catering Aurora"
          isPreferred
          selectable
        />,
      ),
    );
    const btn = screen.getByRole('button', {
      name: 'Quitar la marca preferred de la cotización de Catering Aurora',
    });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveTextContent('Quitar preferred');
  });

  it('EC-01 selectable=false ⇒ aria-disabled=true y disabled; el click no dispara mutación', async () => {
    const preferFn = vi.fn(async () => viewFrom(true));
    render(
      withProviders(
        <PreferredToggleButton
          quoteId={QUOTE_ID}
          vendorName="Catering Aurora"
          isPreferred={false}
          selectable={false}
          preferFn={preferFn}
        />,
      ),
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toBeDisabled();
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(preferFn).not.toHaveBeenCalled();
  });

  it('AC-01 click ⇒ preferFn(isPreferred=true) + onSuccess con la vista', async () => {
    const preferFn = vi.fn(async () => viewFrom(true));
    const onSuccess = vi.fn();
    render(
      withProviders(
        <PreferredToggleButton
          quoteId={QUOTE_ID}
          vendorName="Catering Aurora"
          isPreferred={false}
          selectable
          preferFn={preferFn}
          onSuccess={onSuccess}
        />,
      ),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(preferFn).toHaveBeenCalledWith({ quoteId: QUOTE_ID, isPreferred: true });
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ isPreferred: true }));
  });

  it('AC-03 click con isPreferred=true ⇒ preferFn(isPreferred=false) (toggle)', async () => {
    const preferFn = vi.fn(async () => viewFrom(false));
    const onSuccess = vi.fn();
    render(
      withProviders(
        <PreferredToggleButton
          quoteId={QUOTE_ID}
          vendorName="Catering Aurora"
          isPreferred
          selectable
          preferFn={preferFn}
          onSuccess={onSuccess}
        />,
      ),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(preferFn).toHaveBeenCalledWith({ quoteId: QUOTE_ID, isPreferred: false });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('EC-01 error QUOTE_NOT_PREFERABLE ⇒ onError con mensaje i18n del código', async () => {
    const preferFn = vi.fn(async () => {
      throw new ApiError({
        code: 'QUOTE_NOT_PREFERABLE',
        message: 'ignored',
        status: 409,
        correlationId: 'corr',
      });
    });
    const onError = vi.fn();
    render(
      withProviders(
        <PreferredToggleButton
          quoteId={QUOTE_ID}
          vendorName="Catering Aurora"
          isPreferred={false}
          selectable
          preferFn={preferFn}
          onError={onError}
        />,
      ),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(onError).toHaveBeenCalledWith(
      'Esta cotización ya no puede marcarse: cambió de estado o venció.',
    );
  });

  it('error desconocido ⇒ mensaje UNEXPECTED', async () => {
    const preferFn = vi.fn(async () => {
      throw new Error('boom');
    });
    const onError = vi.fn();
    render(
      withProviders(
        <PreferredToggleButton
          quoteId={QUOTE_ID}
          vendorName="Catering Aurora"
          isPreferred={false}
          selectable
          preferFn={preferFn}
          onError={onError}
        />,
      ),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(onError).toHaveBeenCalledWith('Ocurrió un error inesperado. Intenta nuevamente.');
  });

  it('axe: 0 violaciones serias en isPreferred=false', async () => {
    const { container } = render(
      withProviders(
        <PreferredToggleButton
          quoteId={QUOTE_ID}
          vendorName="Catering Aurora"
          isPreferred={false}
          selectable
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('axe: 0 violaciones serias en isPreferred=true', async () => {
    const { container } = render(
      withProviders(
        <PreferredToggleButton
          quoteId={QUOTE_ID}
          vendorName="Catering Aurora"
          isPreferred
          selectable
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
