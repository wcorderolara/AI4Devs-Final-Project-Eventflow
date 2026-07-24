// US-131 / PB-P2-019 — QA-001. Auditoría axe-core de la ruta demo `/organizer/events/new` (AC-01,
// TS-01, VR-02). Monta `CreateEventWizard` (US-009) con providers de test + MSW y verifica 0
// violaciones críticas en el step inicial. El wizard tiene 3 pasos; el step 0 concentra los
// controles con label/aria-current a auditar.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import esLatamEvents from '@/messages/es-LATAM/events.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import { CreateEventWizard } from '@/features/events/components/CreateEventWizard';
import { auditA11y, formatViolations } from './helpers/axe';
import { renderWithProviders } from './helpers/render-with-intl';

// `useEventsMutations` usa `useRouter` para navegar tras crear el evento — mock consistente con
// tests preexistentes de eventos.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const messages = { events: esLatamEvents, common: esLatamCommon };

describe('US-131 QA-001 · axe /organizer/events/new (CreateEventWizard)', () => {
  it('AC-01 · TS-01: step 0 (tipo/fecha/ubicación) sin violaciones críticas', async () => {
    const { container } = renderWithProviders(<CreateEventWizard />, { messages });
    // El wizard dispara `useEventTypes` y `useLocations` — MSW responde con fixtures (US-106).
    // Esperamos a que el select de tipo popule sus opciones para auditar el DOM estable.
    await waitFor(() => {
      const options = container.querySelectorAll('#event-type option');
      // El select renderiza el placeholder + 6 tipos del fixture MSW (`eventTypesFixture`).
      expect(options.length).toBeGreaterThanOrEqual(2);
    });
    const { critical } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
  });
});
