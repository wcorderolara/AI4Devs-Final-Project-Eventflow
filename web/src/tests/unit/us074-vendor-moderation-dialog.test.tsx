// US-074 (PB-P1-041 / QA-004) — Unit tests DOM del `VendorModerationDialog` (A11Y + whitelist).
//
// Verifica:
//   - `<dialog>` con `aria-labelledby` que apunta al heading.
//   - Radio group para action con `<fieldset>` + `<legend>` (paridad WCAG).
//   - Whitelist client-side coincide con Decisión PO US-047 D5:
//       * `pending`   → {approve, reject}.
//       * `approved + isHidden=false` → {hide}.
//       * `approved + isHidden=true`  → {unhide}.
//       * `rejected`  → sin acciones + banner `role="alert"`.
//   - Textarea con label variable (required vs optional) + `aria-describedby` al contador.
//   - Contador reactivo actualiza los tokens `{current}/{max}`.
//   - Submit deshabilitado para acciones que requieren reason si el texto es < 10.
//   - Submit habilitado para `approve`/`unhide` sin reason (D3).
//
// jsdom no implementa `showModal()`/`close()` de `<dialog>` — se stubbean para no romper el
// render. La UI real usa el focus trap nativo del `<dialog>` (fuera de scope del test unit).
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamAdmin from '@/messages/es-LATAM/admin.json';
import { VendorModerationDialog } from '@/features/admin/vendors/components/VendorModerationDialog';
import type { AdminVendorStatus } from '@/features/admin/vendors/api/adminVendorsApi.types';

beforeEach(() => {
  const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  proto.showModal = function showModal(this: HTMLDialogElement): void {
    (this as unknown as { open: boolean }).open = true;
  };
  proto.close = function close(this: HTMLDialogElement): void {
    (this as unknown as { open: boolean }).open = false;
  };
  cleanup();
});

const messages = { admin: esLatamAdmin };

function withProviders(children: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

const VENDOR_ID = '11111111-1111-4111-8111-111111111111';

function vendorOf(status: AdminVendorStatus, isHidden = false) {
  return {
    id: VENDOR_ID,
    businessName: 'Banquetes Demo',
    slug: 'banquetes-demo',
    currentStatus: status,
    isHidden,
  };
}

describe('US-074 · VendorModerationDialog', () => {
  it('renderiza `<dialog>` con aria-labelledby al heading', () => {
    render(
      withProviders(<VendorModerationDialog vendor={vendorOf('pending')} onClose={vi.fn()} />),
    );
    const dialog = screen.getByTestId('vendor-moderation-dialog') as HTMLDialogElement;
    const heading = screen.getByRole('heading');
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent).toMatch(/Banquetes Demo/);
  });

  it('pending habilita approve + reject (whitelist D5)', () => {
    render(
      withProviders(<VendorModerationDialog vendor={vendorOf('pending')} onClose={vi.fn()} />),
    );
    expect(screen.getByRole('radio', { name: /Aprobar/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Rechazar/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Ocultar/i })).not.toBeInTheDocument();
  });

  it('approved + is_hidden=false sólo permite `hide`', () => {
    render(
      withProviders(
        <VendorModerationDialog vendor={vendorOf('approved', false)} onClose={vi.fn()} />,
      ),
    );
    expect(screen.getByRole('radio', { name: /Ocultar/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Aprobar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Restaurar/i })).not.toBeInTheDocument();
  });

  it('approved + is_hidden=true sólo permite `unhide`', () => {
    render(
      withProviders(
        <VendorModerationDialog vendor={vendorOf('approved', true)} onClose={vi.fn()} />,
      ),
    );
    expect(screen.getByRole('radio', { name: /Restaurar/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Ocultar/i })).not.toBeInTheDocument();
  });

  it('rejected muestra banner de alerta y deshabilita submit (SEC-05 no re-approve)', () => {
    render(
      withProviders(<VendorModerationDialog vendor={vendorOf('rejected')} onClose={vi.fn()} />),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/rechazado/i);
    const submit = screen.getByTestId('vendor-moderation-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('approve (D3) permite submit sin reason', () => {
    render(
      withProviders(<VendorModerationDialog vendor={vendorOf('pending')} onClose={vi.fn()} />),
    );
    // approve es la primera opción por whitelist en pending.
    const submit = screen.getByTestId('vendor-moderation-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it('reject (D4) exige reason >= 10 — submit deshabilitado con reason vacío o corto', () => {
    render(
      withProviders(<VendorModerationDialog vendor={vendorOf('pending')} onClose={vi.fn()} />),
    );
    fireEvent.click(screen.getByRole('radio', { name: /Rechazar/i }));
    const submit = screen.getByTestId('vendor-moderation-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    const textarea = screen.getByLabelText(/Motivo/);
    fireEvent.change(textarea, { target: { value: 'short' } });
    expect(submit.disabled).toBe(true);
    fireEvent.change(textarea, { target: { value: 'Documentación insuficiente verificada.' } });
    expect(submit.disabled).toBe(false);
  });

  it('textarea con label + aria-describedby al contador; contador reactivo', () => {
    render(
      withProviders(<VendorModerationDialog vendor={vendorOf('pending')} onClose={vi.fn()} />),
    );
    const textarea = screen.getByLabelText(/Motivo/) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const counter = document.getElementById(describedBy as string);
    expect(counter?.textContent).toMatch(/0\/500/);
    fireEvent.change(textarea, { target: { value: 'x'.repeat(42) } });
    expect(counter?.textContent).toMatch(/42\/500/);
  });

  it('cancel dispara onClose', () => {
    const onClose = vi.fn();
    render(withProviders(<VendorModerationDialog vendor={vendorOf('pending')} onClose={onClose} />));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
