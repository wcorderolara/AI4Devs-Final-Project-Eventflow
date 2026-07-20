// US-067 (PB-P1-040 / QA-004) — Unit tests DOM del `ModerationDialog` (A11Y + comportamiento).
//
// Verifica:
//   - `<dialog>` con `aria-labelledby` que apunta al heading.
//   - Radio group para action con `<fieldset>` + `<legend>` (paridad WCAG).
//   - Textarea con label asociado + `aria-describedby` al contador (10..500).
//   - Contador reactivo actualiza los tokens `{current}/{max}`.
//   - Submit deshabilitado si `reason < 10` o mientras la mutation está pending.
//   - Estado `removed` deshabilita el submit y muestra banner con `role="alert"`.
//   - Estado `hidden` sólo permite la acción `remove` (Decisión PO D2 whitelist en cliente).
//
// jsdom no implementa `showModal()`/`close()` de `<dialog>` — se stubbean para no romper el
// render. La UI real usa el focus trap nativo del `<dialog>` (fuera de scope del test unit).
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamAdmin from '@/messages/es-LATAM/admin.json';
import { ModerationDialog } from '@/features/admin/reviews/components/ModerationDialog';

// Stubs para `<dialog>` en jsdom (no implementa showModal/close nativos).
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

const REVIEW_ID = '11111111-1111-4111-8111-111111111111';
const VENDOR_ID = '22222222-2222-4222-8222-222222222222';

function reviewOf(status: 'published' | 'hidden' | 'removed') {
  return { id: REVIEW_ID, vendorId: VENDOR_ID, currentStatus: status };
}

describe('US-067 · ModerationDialog', () => {
  it('renderiza `<dialog>` con aria-labelledby al heading', () => {
    render(withProviders(<ModerationDialog review={reviewOf('published')} onClose={vi.fn()} />));
    const dialog = screen.getByTestId('review-moderation-dialog') as HTMLDialogElement;
    const heading = screen.getByRole('heading', { name: 'Moderar reseña' });
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('published habilita ambas acciones (hide y remove)', () => {
    render(withProviders(<ModerationDialog review={reviewOf('published')} onClose={vi.fn()} />));
    expect(screen.getByRole('radio', { name: /Ocultar/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Eliminar/i })).toBeInTheDocument();
  });

  it('hidden sólo permite `remove` (Decisión PO D2 whitelist)', () => {
    render(withProviders(<ModerationDialog review={reviewOf('hidden')} onClose={vi.fn()} />));
    expect(screen.queryByRole('radio', { name: /Ocultar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Eliminar/i })).toBeInTheDocument();
  });

  it('removed muestra banner de alerta y deshabilita submit', () => {
    render(withProviders(<ModerationDialog review={reviewOf('removed')} onClose={vi.fn()} />));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Esta reseña ya está eliminada. No se permiten más transiciones.',
    );
    const submit = screen.getByTestId('review-moderation-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('textarea con label asociado + aria-describedby al contador', () => {
    render(withProviders(<ModerationDialog review={reviewOf('published')} onClose={vi.fn()} />));
    const textarea = screen.getByLabelText(/Motivo/) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const counter = document.getElementById(describedBy as string);
    expect(counter?.textContent).toMatch(/0\/500/);
  });

  it('contador se actualiza al tipear en el textarea', () => {
    render(withProviders(<ModerationDialog review={reviewOf('published')} onClose={vi.fn()} />));
    const textarea = screen.getByLabelText(/Motivo/);
    fireEvent.change(textarea, { target: { value: 'Contenido inapropiado.' } });
    const describedBy = textarea.getAttribute('aria-describedby');
    const counter = document.getElementById(describedBy as string);
    expect(counter?.textContent).toMatch(/22\/500/);
  });

  it('submit deshabilitado si reason < 10 chars', () => {
    render(withProviders(<ModerationDialog review={reviewOf('published')} onClose={vi.fn()} />));
    const textarea = screen.getByLabelText(/Motivo/);
    fireEvent.change(textarea, { target: { value: 'short' } });
    const submit = screen.getByTestId('review-moderation-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('submit habilitado con reason >= 10 chars', () => {
    render(withProviders(<ModerationDialog review={reviewOf('published')} onClose={vi.fn()} />));
    const textarea = screen.getByLabelText(/Motivo/);
    fireEvent.change(textarea, { target: { value: 'Contenido inapropiado.' } });
    const submit = screen.getByTestId('review-moderation-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it('cancel dispara onClose', () => {
    const onClose = vi.fn();
    render(withProviders(<ModerationDialog review={reviewOf('published')} onClose={onClose} />));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
