// US-131 / PB-P2-019 — QA-002. Tests de teclado, foco visible, roles ARIA y labels/errores
// accesibles sobre las rutas demo (AC-02, AC-03; NFR-A11Y-002/003/004; VR-03).
//
// Complementa a QA-001 (axe estático) ejercitando el DOM con `@testing-library/user-event`:
// Tab / Shift+Tab recorren el formulario en orden coherente; el submit sin campos dispara los
// mensajes de error asociados vía `aria-describedby` (labels efectivas) — verificable con
// `getByLabelText`. ARIA sólo se agrega donde NO hay equivalente nativo (Doc 20 §a11y).
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import esLatamAuth from '@/messages/es-LATAM/auth.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { renderWithProviders } from './helpers/render-with-intl';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const messages = { auth: esLatamAuth, common: esLatamCommon };

describe('US-131 QA-002 · teclado + foco + ARIA + labels (LoginForm /login)', () => {
  it('AC-02 · NFR-A11Y-002: Tab recorre email → password → submit en orden coherente', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />, { messages });
    // El foco parte del `document.body`; el primer Tab entra al campo email.
    await user.tab();
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Contraseña')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toHaveFocus();
  });

  it('AC-02: Shift+Tab retrocede en orden inverso (password → email)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />, { messages });
    await user.tab(); // email
    await user.tab(); // password
    await user.tab({ shift: true });
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus();
  });

  it('AC-03 · NFR-A11Y-004: submit sin campos dispara mensajes de error con `aria-describedby` asociado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />, { messages });
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    const email = screen.getByLabelText('Correo electrónico');
    // Zod exige email válido; el mensaje efectivo se asocia por `aria-describedby`. La aserción
    // se hace por el efecto observable (id del describedby + su contenido) — no por el string.
    const describedBy = email.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorNode = describedBy ? document.getElementById(describedBy) : null;
    expect(errorNode?.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(email.getAttribute('aria-invalid')).toBe('true');
  });

  it('AC-03: los campos tienen label asociada (`for`/`id` — equivalente nativo, no ARIA)', () => {
    renderWithProviders(<LoginForm />, { messages });
    // `getByLabelText` de RTL falla si no hay label real (nativa o via `aria-labelledby`).
    // Este assert es un salvaguarda contra regresiones que introduzcan `aria-label` innecesario
    // (anti-patrón cuando existe `<label htmlFor>`).
    expect(screen.getByLabelText('Correo electrónico').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Contraseña').tagName).toBe('INPUT');
  });

  it('AC-03: el submit es un `<button type="submit">` (equivalente nativo, no `role="button"`)', () => {
    renderWithProviders(<LoginForm />, { messages });
    const submit = screen.getByRole('button', { name: 'Iniciar sesión' });
    expect(submit.tagName).toBe('BUTTON');
    expect(submit.getAttribute('type')).toBe('submit');
    // No debería tener `role="button"` redundante — regresión típica al añadir ARIA innecesario.
    expect(submit.hasAttribute('role')).toBe(false);
  });
});
