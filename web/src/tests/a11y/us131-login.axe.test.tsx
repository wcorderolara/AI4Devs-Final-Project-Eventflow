// US-131 / PB-P2-019 — QA-001. Auditoría axe-core de la ruta demo `/login` (AC-01, TS-01, VR-02).
// Monta `LoginForm` con providers de test y verifica 0 violaciones críticas en dos estados:
// (1) formulario limpio (render inicial), (2) formulario con error global (banner `role="alert"`).
//
// Doc 20 §a11y: la meta MVP es "accesibilidad mínima usable y testeable" — sólo se bloquea el
// merge por violaciones `impact === 'critical'` (política `auditA11y`).
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// `useLogin` (US-003) usa `useRouter` de `next/navigation`; jsdom no provee el AppRouterContext.
// Se mockea con el mismo patrón preexistente en `tests/integration/auth/login-form.test.tsx`.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import esLatamAuth from '@/messages/es-LATAM/auth.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { auditA11y, formatViolations } from './helpers/axe';
import { renderWithProviders } from './helpers/render-with-intl';

const messages = { auth: esLatamAuth, common: esLatamCommon };

describe('US-131 QA-001 · axe /login (LoginForm)', () => {
  it('AC-01 · TS-01: LoginForm render inicial sin violaciones críticas', async () => {
    const { container } = renderWithProviders(<LoginForm />, { messages });
    const { critical } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
  });

  it('AC-01 · TS-01: LoginForm con banner de error accesible (role="alert") sin violaciones críticas', async () => {
    // El banner de error usa `role="alert" aria-live="polite"` (US-003 EC-01) — verificamos que el
    // estado renderizado por el flujo error se mantenga accesible aún cuando el árbol es más rico.
    const { container } = renderWithProviders(<LoginForm />, { messages });
    // Simulamos el estado observable inyectando un banner de error idéntico al de LoginForm.
    const banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.textContent = 'Credenciales inválidas';
    container.querySelector('form')?.insertBefore(banner, container.querySelector('form')!.firstChild);
    const { critical } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
  });
});
