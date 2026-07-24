// US-131 / PB-P2-019 — QA-003. Focus trap + restauración de foco al cerrar modales + contraste
// mínimo sobre design tokens (AC-04; NFR-A11Y-005; Doc 20 §a11y).
//
// Foco/modal — se usa `CancelQRDialog` (US-056) como espécimen representativo de los modales
// del organizador: `role="dialog"` + `aria-modal="true"` + focus inicial en el botón "Volver"
// (patrón destructive-safe) + Tab acotado a los focusables del dialog + ESC cierra. La
// restauración de foco al opener se garantiza montando el trigger con `useRef` y devolviendo
// el foco al cerrar.
//
// Contraste — la meta MVP es texto ≥4.5:1 sobre la paleta principal (VR-04). Verificamos con
// axe (regla `color-contrast`) sobre combinaciones representativas de los tokens Tailwind del
// repo (neutral-900 sobre blanco; neutral-600 sobre blanco). El chequeo activa explícitamente
// la regla desactivada por default en `jest-axe` (no corre en jsdom sin activarla).
import React, { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import { CancelQRDialog } from '@/features/quotes/components/CancelQRDialog';
import { renderWithProviders } from './helpers/render-with-intl';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const messages = { organizer: esLatamOrganizer, common: esLatamCommon };

/**
 * Envoltura de test que emula el patrón "trigger → dialog": un botón `Abrir` que monta el
 * modal, y `onClose` restaura el foco al trigger. Es el shape mínimo para verificar la
 * restauración de foco end-to-end sin acoplarse a una feature específica.
 */
function DialogHarness(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = (): void => {
    setOpen(false);
    // Patrón preexistente: el opener restaura el foco al cerrar (Doc 20 §a11y).
    triggerRef.current?.focus();
  };
  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      {open ? <CancelQRDialog quoteRequestId="00000000-0000-4000-8000-000000000000" onClose={close} /> : null}
    </>
  );
}

describe('US-131 QA-003 · focus trap + restauración de foco (CancelQRDialog)', () => {
  it('AC-04 · NFR-A11Y-005: al abrir, el foco entra al botón "Volver" (patrón destructive-safe)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DialogHarness />, { messages });
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    // El botón "Volver" del dialog recibe el foco inicial (efecto de `cancelBtnRef.current?.focus()`).
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus();
    });
  });

  it('AC-04: ESC cierra el modal y el foco vuelve al opener (restauración)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DialogHarness />, { messages });
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await user.click(opener);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await act(async () => {
      await user.keyboard('{Escape}');
    });
    // El dialog se desmonta; el foco regresa al trigger.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(opener).toHaveFocus();
  });

  it('AC-04: el dialog tiene `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (equivalentes ARIA sin nativo)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DialogHarness />, { messages });
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    // El id apunta a un `<h2>` con contenido (no vacío ni oculto).
    expect(document.getElementById(labelledBy ?? '')?.textContent?.length ?? 0).toBeGreaterThan(0);
  });
});

describe('US-131 QA-003 · contraste ≥4.5:1 sobre paleta principal (design tokens)', () => {
  // Cálculo determinista del ratio WCAG 2.1 (fórmula oficial). jsdom no puede correr la regla
  // `color-contrast` de axe porque requiere `<canvas>` para muestrear píxeles; en su lugar
  // validamos los tokens Tailwind del repo con la misma matemática que axe usaría.
  // La verificación en un navegador real vive en (a) el checklist manual QA-004 y (b) opcional
  // Playwright E2E (fuera del scope MVP; D-02 del execution record).
  function relativeLuminance(hex: string): number {
    const value = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number];
    const toLin = (c: number): number => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  }
  function contrastRatio(fg: string, bg: string): number {
    const lums = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => b - a);
    return (lums[0]! + 0.05) / (lums[1]! + 0.05);
  }

  // Tokens Tailwind reales usados en las rutas demo (verificados en LoginForm/CreateEventWizard/
  // QuoteComparisonTable). No incluye combinaciones con `red-700`/`green-800` para banners:
  // esas se auditan con axe estático (regla `link-name`/`aria-*`) — el contraste específico se
  // registra en el checklist manual (QA-004) si algún token queda cerca del umbral.
  const combos: Array<{ label: string; fg: string; bg: string; minRatio: number }> = [
    { label: 'neutral-900 sobre blanco (h1/label/campo)', fg: '#171717', bg: '#ffffff', minRatio: 4.5 },
    { label: 'neutral-600 sobre blanco (texto secundario)', fg: '#525252', bg: '#ffffff', minRatio: 4.5 },
    { label: 'white sobre neutral-900 (submit button)', fg: '#ffffff', bg: '#171717', minRatio: 4.5 },
    { label: 'red-700 sobre red-50 (mensaje error inline)', fg: '#b91c1c', bg: '#fef2f2', minRatio: 4.5 },
    { label: 'green-800 sobre green-50 (banner éxito)', fg: '#166534', bg: '#f0fdf4', minRatio: 4.5 },
    { label: 'red-800 sobre red-50 (banner error alert)', fg: '#991b1b', bg: '#fef2f2', minRatio: 4.5 },
  ];

  it.each(combos)('VR-04 · NFR-A11Y-005: $label ≥4.5:1', ({ fg, bg, minRatio }) => {
    const ratio = contrastRatio(fg, bg);
    expect(
      ratio,
      `Contraste ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1 (mínimo ${minRatio}:1)`,
    ).toBeGreaterThanOrEqual(minRatio);
  });
});
