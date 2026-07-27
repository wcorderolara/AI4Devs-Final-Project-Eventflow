// Landing pública `/` — alineación con la screen Stitch «EventFlow - Inicio»
// (projects/10889252267442839867 · screens/7af2150dd6684c70be98fea230457b0b).
//
// Estos tests cubren dos cosas distintas: que la página tenga la estructura y la accesibilidad
// que se espera de una home pública, y que **no** haya adoptado el contenido de Stitch que
// EventFlow no puede sostener (métricas, prueba social, precios, demos, assets remotos).
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { LandingPage } from '@/features/marketing';
import enCommon from '@/messages/en/common.json';
import enNavigation from '@/messages/en/navigation.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import esLatamNavigation from '@/messages/es-LATAM/navigation.json';
import type { SessionClaims } from '@/shared/authorization';

const ANONYMOUS: SessionClaims = { isAuthenticated: false, role: null };

function renderLanding(claims: SessionClaims = ANONYMOUS, locale: 'es-LATAM' | 'en' = 'es-LATAM') {
  const messages =
    locale === 'en'
      ? { common: enCommon, navigation: enNavigation }
      : { common: esLatamCommon, navigation: esLatamNavigation };
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <LandingPage claims={claims} />
    </NextIntlClientProvider>,
  );
}

/** Enlaces visibles de la página, con su destino. */
function links(container: HTMLElement): { name: string; href: string }[] {
  return Array.from(container.querySelectorAll('a')).map((a) => ({
    name: (a.textContent ?? '').trim(),
    href: a.getAttribute('href') ?? '',
  }));
}

describe('landing pública — estructura', () => {
  it('renderiza con un único `h1` descriptivo', () => {
    const { container } = renderLanding();
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]?.textContent).toContain('plan accionable');
  });

  it('la jerarquía de encabezados no salta niveles', () => {
    const { container } = renderLanding();
    const levels = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
      Number(h.tagName.slice(1)),
    );
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  it('las secciones aparecen en el orden esperado', () => {
    const { container } = renderLanding();
    const order = Array.from(container.querySelectorAll('[data-testid^="landing-"]'))
      .map((el) => el.getAttribute('data-testid'))
      .filter(
        (id) =>
          id &&
          !id.startsWith('landing-feature-') &&
          !id.startsWith('landing-step-') &&
          !id.startsWith('landing-vendor-'),
      );
    expect(order).toEqual([
      'landing-hero',
      'landing-how-it-works',
      'landing-features',
      'landing-for-vendors',
      'landing-final-cta',
    ]);
  });

  it('las secciones enlazables tienen los `id` que usa el header', () => {
    const { container } = renderLanding();
    for (const id of ['how-it-works', 'features', 'for-vendors']) {
      expect(container.querySelector(`#${id}`), `falta la sección #${id}`).not.toBeNull();
    }
  });

  it('los pasos del flujo se anuncian como lista ordenada; las capacidades, no', () => {
    const { container } = renderLanding();
    expect(container.querySelector('[data-testid="landing-how-it-works"] ol')).not.toBeNull();
    expect(container.querySelector('[data-testid="landing-features"] ol')).toBeNull();
    expect(container.querySelector('[data-testid="landing-features"] ul')).not.toBeNull();
  });

  it('las seis capacidades del MVP y los tres pasos están presentes', () => {
    const { container } = renderLanding();
    for (const key of ['plan', 'checklist', 'budget', 'vendors', 'quotes', 'hitl']) {
      expect(container.querySelector(`[data-testid="landing-feature-${key}"]`)).not.toBeNull();
    }
    for (const key of ['define', 'propose', 'decide']) {
      expect(container.querySelector(`[data-testid="landing-step-${key}"]`)).not.toBeNull();
    }
  });
});

describe('landing pública — CTA según la sesión', () => {
  it('anónimo: la CTA primaria lleva al alta y la secundaria al directorio público', () => {
    const { container } = renderLanding();
    const hero = container.querySelector('[data-testid="landing-hero"]') as HTMLElement;
    const hrefs = links(hero).map((l) => l.href);
    expect(hrefs).toContain('/register');
    expect(hrefs).toContain('/vendors');
  });

  it.each([
    ['organizer', '/organizer', '/organizer/events'],
    ['vendor', '/vendor', '/vendor/quotes'],
    ['admin', '/admin', '/admin/metrics'],
  ] as const)('%s: la CTA lleva a su workspace', (role, primary, secondary) => {
    const { container } = renderLanding({ isAuthenticated: true, role });
    const hero = container.querySelector('[data-testid="landing-hero"]') as HTMLElement;
    const hrefs = links(hero).map((l) => l.href);
    expect(hrefs).toContain(primary);
    expect(hrefs).toContain(secondary);
  });

  it.each(['organizer', 'vendor', 'admin'] as const)(
    '%s: a un usuario con sesión no se le vuelve a proponer iniciarla',
    (role) => {
      const { container } = renderLanding({ isAuthenticated: true, role });
      const hrefs = links(container).map((l) => l.href);
      expect(hrefs).not.toContain('/login');
      expect(hrefs).not.toContain('/register');
    },
  );

  it('los grupos de CTA tienen nombre accesible', () => {
    renderLanding();
    expect(
      screen.getByRole('group', { name: esLatamCommon.landing.ctaGroupLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: esLatamCommon.landing.finalCta.ctaGroupLabel }),
    ).toBeInTheDocument();
  });

  it('ningún enlace apunta a una ruta no montada', () => {
    const allowed = new Set([
      '/register',
      '/login',
      '/vendors',
      '/organizer',
      '/organizer/events',
      '/vendor',
      '/vendor/quotes',
      '/admin',
      '/admin/metrics',
    ]);
    for (const claims of [
      ANONYMOUS,
      { isAuthenticated: true, role: 'organizer' } as const,
      { isAuthenticated: true, role: 'vendor' } as const,
      { isAuthenticated: true, role: 'admin' } as const,
    ]) {
      const { container, unmount } = renderLanding(claims);
      for (const { href } of links(container)) {
        expect(href.startsWith('#') || allowed.has(href), `destino inesperado: ${href}`).toBe(true);
      }
      unmount();
    }
  });
});

describe('landing pública — contenido no soportado por el producto', () => {
  it('no reproduce las métricas ni la prueba social inventadas de Stitch', () => {
    const { container } = renderLanding();
    const text = container.textContent ?? '';
    for (const claim of [
      '500+',
      '98%',
      'Eventos Exitosos',
      'Satisfacción',
      'Confiado por',
      'Antigua Guatemala',
      'Ciudad de Cayalá',
      'Paseo de la Sexta',
      'Quetzaltenango',
    ]) {
      expect(text, `aparece contenido no respaldado: ${claim}`).not.toContain(claim);
    }
  });

  it('no promete precios, gratuidad, demos ni contacto comercial', () => {
    const { container } = renderLanding();
    expect(container.textContent ?? '').not.toMatch(
      /precios?\b|pricing|gratis|gratuito|demostración|hablar con ventas|garantiz/i,
    );
  });

  it('no promete capacidades fuera del MVP', () => {
    const { container } = renderLanding();
    expect(container.textContent ?? '').not.toMatch(
      /whatsapp|chat en vivo|tiempo real|contrat(o|ación) autom|pago seguro|firma de contrato|app store|google play/i,
    );
  });

  it('no describe una IA autónoma: toda sugerencia queda pendiente de aprobación', () => {
    const { container } = renderLanding();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/la ia (lo )?(planifica|organiza|decide|contrata)/i);
    expect(text).toMatch(/aprobación|apruebas|decides/i);
  });

  it('no referencia ningún asset alojado por Stitch ni imágenes remotas', () => {
    const { container } = renderLanding();
    expect(container.innerHTML).not.toContain('googleusercontent.com');
    // El hero ya sirve fotografías propias (carrusel), así que no puede exigirse «cero imágenes»:
    // lo que se veta es que alguna venga de un origen externo en lugar del repositorio.
    for (const img of Array.from(container.querySelectorAll('img'))) {
      const src = img.getAttribute('src') ?? '';
      expect(src, `imagen de origen remoto: ${src}`).not.toMatch(/^https?:\/\//);
    }
  });

  it('el apoyo visual del hero son las fotografías del repositorio, con texto alternativo', () => {
    const { container } = renderLanding();
    const images = Array.from(container.querySelectorAll('img'));
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      expect(img.getAttribute('alt')?.trim()).toBeTruthy();
    }
  });
});

describe('landing pública — internacionalización', () => {
  it('renderiza el catálogo del locale activo', () => {
    const { container } = renderLanding(ANONYMOUS, 'en');
    const text = container.textContent ?? '';
    expect(text).toContain('actionable plan');
    expect(text).toContain(enCommon.landing.howItWorks.heading);
    expect(text).toContain(enNavigation.public.cta.register);
  });

  it('no queda copy en duro: nada renderiza la ruta de una clave sin traducir', () => {
    const { container } = renderLanding(ANONYMOUS, 'en');
    expect(container.textContent ?? '').not.toMatch(/common\.landing\.|navigation\.public\./);
  });
});
