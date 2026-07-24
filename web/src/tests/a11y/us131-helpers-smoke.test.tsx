// US-131 / PB-P2-019 — Smoke test de los helpers OPS-001 (`auditA11y`, `renderWithProviders`).
// Verifica el contrato base del helper contra fragmentos triviales: no rompe cuando el DOM está
// vacío, detecta violaciones críticas cuando existen, y `renderWithProviders` monta i18n +
// QueryClient sin errores. Es el "hello world" de la suite A11Y: si este smoke falla, ningún
// otro test de la suite arrancará limpio.
import React from 'react';
import { describe, expect, it } from 'vitest';
import { useTranslations } from 'next-intl';
import { auditA11y, formatViolations } from './helpers/axe';
import { renderWithProviders } from './helpers/render-with-intl';

describe('US-131 OPS-001: smoke de helpers axe + render-with-intl', () => {
  it('auditA11y sobre un DOM trivial válido devuelve críticas vacías', async () => {
    const div = document.createElement('div');
    div.innerHTML = '<main><h1>Hola</h1><p>Contenido semántico mínimo.</p></main>';
    const { critical, otherViolations, raw } = await auditA11y(div);
    expect(critical, formatViolations(critical)).toEqual([]);
    // Sanidad: el shape crudo de axe se preserva para trazabilidad.
    expect(raw).toHaveProperty('violations');
    expect(Array.isArray(otherViolations)).toBe(true);
  });

  it('auditA11y detecta violaciones críticas cuando existen (img sin alt)', async () => {
    // `image-alt` es una regla `critical` en axe-core: <img> sin `alt` accesible.
    const div = document.createElement('div');
    div.innerHTML = '<img src="broken.png">';
    const { critical } = await auditA11y(div);
    expect(critical.length).toBeGreaterThan(0);
    expect(critical.some((v) => v.id === 'image-alt')).toBe(true);
  });

  it('renderWithProviders monta NextIntlClientProvider + QueryClientProvider funcionando', () => {
    function Sample(): React.JSX.Element {
      const t = useTranslations('a11y');
      return <p>{t('title')}</p>;
    }
    const { getByText } = renderWithProviders(<Sample />, {
      messages: { a11y: { title: 'Muestra A11Y' } },
      locale: 'es-LATAM',
    });
    expect(getByText('Muestra A11Y')).toBeInTheDocument();
  });
});
