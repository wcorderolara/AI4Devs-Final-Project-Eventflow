// Auditoría axe-core de la landing pública completa (header + página + footer), en los cuatro
// locales del MVP y en los cuatro estados de sesión.
//
// Umbral del gate (US-131 / OPS-001): 0 violaciones `critical`. Aquí se endurece a **0
// violaciones de cualquier severidad**, igual que en el resto de suites de PB-P2-028/029/031/032.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AbstractIntlMessages } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { LandingPage } from '@/features/marketing';
import enCommon from '@/messages/en/common.json';
import enNavigation from '@/messages/en/navigation.json';
import esEsCommon from '@/messages/es-ES/common.json';
import esEsNavigation from '@/messages/es-ES/navigation.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import esLatamNavigation from '@/messages/es-LATAM/navigation.json';
import ptCommon from '@/messages/pt/common.json';
import ptNavigation from '@/messages/pt/navigation.json';
import type { SessionClaims } from '@/shared/authorization';
import { Footer, PublicHeader, SkipLink } from '@/shared/navigation';
import { auditA11y, formatViolations } from './helpers/axe';
import { renderWithProviders, type Locale } from './helpers/render-with-intl';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
}));

const CATALOG: Record<Locale, AbstractIntlMessages> = {
  'es-LATAM': { common: esLatamCommon, navigation: esLatamNavigation } as AbstractIntlMessages,
  'es-ES': { common: esEsCommon, navigation: esEsNavigation } as AbstractIntlMessages,
  pt: { common: ptCommon, navigation: ptNavigation } as AbstractIntlMessages,
  en: { common: enCommon, navigation: enNavigation } as AbstractIntlMessages,
};

const ANONYMOUS: SessionClaims = { isAuthenticated: false, role: null };

/** Reproduce la composición real de `(public)/layout.tsx` + `(public)/page.tsx`. */
function PublicSurface({ claims }: { claims: SessionClaims }): React.JSX.Element {
  return (
    <div>
      <SkipLink />
      <PublicHeader claims={claims} />
      <main id="main-content">
        <LandingPage claims={claims} />
      </main>
      <Footer />
    </div>
  );
}

function renderSurface(claims: SessionClaims = ANONYMOUS, locale: Locale = 'es-LATAM') {
  return renderWithProviders(<PublicSurface claims={claims} />, {
    messages: CATALOG[locale],
    locale,
  });
}

describe('landing pública · axe-core', () => {
  it.each(['es-LATAM', 'es-ES', 'pt', 'en'] as const)('sin violaciones en %s', async (locale) => {
    const { container, unmount } = renderSurface(ANONYMOUS, locale);
    const { critical, otherViolations } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
    unmount();
  });

  it.each(['organizer', 'vendor', 'admin'] as const)(
    'sin violaciones con sesión de %s',
    async (role) => {
      const { container, unmount } = renderSurface({ isAuthenticated: true, role });
      const { critical, otherViolations } = await auditA11y(container);
      expect(critical, formatViolations(critical)).toEqual([]);
      expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
      unmount();
    },
  );

  it('sin violaciones con el drawer de navegación abierto', async () => {
    const user = userEvent.setup();
    const { container } = renderSurface();

    await user.click(screen.getByRole('button', { name: esLatamNavigation.topbar.menuOpen }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    const { critical, otherViolations } = await auditA11y(document.body);
    expect(critical, formatViolations(critical)).toEqual([]);
    expect(otherViolations, formatViolations(otherViolations)).toEqual([]);
    expect(container).toBeTruthy();
  });
});

describe('landing pública · landmarks y navegación por teclado', () => {
  it('expone skip-link, banner, main y contentinfo sin duplicar landmarks', () => {
    const { container } = renderSurface();
    expect(screen.getByRole('link', { name: esLatamNavigation.skipLink })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(container.querySelectorAll('header')).toHaveLength(1);
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelectorAll('footer')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('todas las secciones enlazadas desde el header existen en la página', () => {
    const { container } = renderSurface();
    // Las anclas del header son absolutas (`/#features`) para que funcionen también desde
    // `/vendors`; sobre la landing el fragmento debe seguir resolviendo a una sección real.
    const anchors = Array.from(container.querySelectorAll('a[href*="#"]'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((href) => href !== '#main-content');
    expect(anchors.length).toBeGreaterThan(0);
    for (const href of Array.from(new Set(anchors))) {
      const fragment = href.slice(href.indexOf('#'));
      expect(container.querySelector(fragment), `ancla rota: ${href}`).not.toBeNull();
    }
  });

  it('el contenido principal es alcanzable con Tab desde el inicio del documento', async () => {
    const user = userEvent.setup();
    renderSurface();
    await user.tab();
    expect(screen.getByRole('link', { name: esLatamNavigation.skipLink })).toHaveFocus();
  });
});
