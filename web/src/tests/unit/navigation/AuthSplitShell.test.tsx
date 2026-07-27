// Shell a dos columnas de `/login` (referencia Stitch «EventFlow — Iniciar Sesión (Foco)»).
// Verifica la anatomía que la pantalla necesita y las restricciones que no puede romper:
// skip-link, landmark `#main-content`, jerarquía de headings intacta y cero assets remotos.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import esLatamNavigation from '@/messages/es-LATAM/navigation.json';
import { AuthSplitShell } from '@/shared/navigation';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

function renderShell() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider
      locale="es-LATAM"
      messages={{ common: esLatamCommon, navigation: esLatamNavigation }}
      timeZone="UTC"
    >
      <QueryClientProvider client={queryClient}>
        <AuthSplitShell>
          <h1>Inicia sesión</h1>
        </AuthSplitShell>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('<AuthSplitShell>', () => {
  it('expone skip-link, landmark principal y el selector de idioma', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Saltar al contenido principal' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('el panel narrativo no introduce headings: el único `h1` es el de la página', () => {
    const { container } = renderShell();
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Inicia sesión');
  });

  it('reutiliza copy aprobado de la landing, sin afirmaciones nuevas', () => {
    const { container } = renderShell();
    // El titular trae markup de énfasis (`<em>`) para la landing: se compara el texto renderizado,
    // y de paso se verifica que el markup se interpreta en vez de imprimirse literal.
    const plainHeading = esLatamCommon.landing.heading.replace(/<\/?em>/g, '');
    expect(container).toHaveTextContent(plainHeading);
    expect(container.innerHTML).not.toContain('&lt;em&gt;');
    expect(screen.getByText(esLatamCommon.landing.features.plan.title)).toBeInTheDocument();
  });

  it('no enlaza ningún asset remoto (nada alojado por Stitch llega a producción)', () => {
    const { container } = renderShell();
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(container.innerHTML).not.toContain('googleusercontent.com');
  });
});
