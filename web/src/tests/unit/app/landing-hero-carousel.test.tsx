// Carrusel del hero de la landing — cinco tipos de evento.
//
// Lo que se protege: que imagen y tarjeta pertenezcan **siempre** a la misma diapositiva (el
// fallo más caro de un carrusel es enseñar el texto de un evento sobre la foto de otro), que el
// avance automático se detenga cuando el usuario está interactuando o ha pedido movimiento
// reducido, y que la paginación sea operable con teclado.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingHeroPreview } from '@/features/marketing';
import enCommon from '@/messages/en/common.json';
import esEsCommon from '@/messages/es-ES/common.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import ptCommon from '@/messages/pt/common.json';

const CATALOG = {
  'es-LATAM': esLatamCommon,
  'es-ES': esEsCommon,
  pt: ptCommon,
  en: enCommon,
} as const;

type Locale = keyof typeof CATALOG;

const SLIDE_IDS = ['wedding', 'celebration', 'baptism', 'birthday', 'corporate'] as const;

/** El componente avanza cada 5,5 s; los tests usan timers falsos para no esperar de verdad. */
const AUTOPLAY_MS = 5500;

const preview = (locale: Locale = 'es-LATAM') => CATALOG[locale].landing.preview;

function renderCarousel(locale: Locale = 'es-LATAM') {
  return render(
    <NextIntlClientProvider locale={locale} messages={{ common: CATALOG[locale] }} timeZone="UTC">
      <LandingHeroPreview />
    </NextIntlClientProvider>,
  );
}

/** Diapositiva visible: la única sin `aria-hidden`. */
function activeSlideId(container: HTMLElement): string | null {
  for (const id of SLIDE_IDS) {
    const slide = container.querySelector(`[data-testid="hero-carousel-slide-${id}"]`);
    if (slide?.getAttribute('aria-hidden') !== 'true') return id;
  }
  return null;
}

function cardText(container: HTMLElement): string {
  return container.querySelector('[data-testid="hero-carousel-card"]')?.textContent ?? '';
}

function setReducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe('carrusel del hero — render inicial', () => {
  it('la primera diapositiva es la boda', () => {
    const { container } = renderCarousel();
    expect(activeSlideId(container)).toBe('wedding');
  });

  it('la imagen inicial y la tarjeta corresponden a la boda', () => {
    const { container } = renderCarousel();
    const slide = container.querySelector('[data-testid="hero-carousel-slide-wedding"]');
    const image = within(slide as HTMLElement).getByRole('img');
    expect(image).toHaveAttribute('alt', preview().slides.wedding.imageAlt);
    expect(cardText(container)).toContain(preview().slides.wedding.title);
  });

  it('muestra antetítulo, título y descripción traducidos', () => {
    const { container } = renderCarousel();
    const card = cardText(container);
    expect(card).toContain(preview().slides.wedding.eyebrow);
    expect(card).toContain(preview().slides.wedding.title);
    expect(card).toContain(preview().slides.wedding.description);
  });

  it('sólo la diapositiva activa está expuesta a tecnologías de asistencia', () => {
    const { container } = renderCarousel();
    // Sin esto, un lector de pantalla leería los cinco textos alternativos seguidos.
    const exposed = SLIDE_IDS.filter(
      (id) =>
        container
          .querySelector(`[data-testid="hero-carousel-slide-${id}"]`)
          ?.getAttribute('aria-hidden') !== 'true',
    );
    expect(exposed).toEqual(['wedding']);
  });

  it('sólo la primera imagen se marca como prioritaria', () => {
    const { container } = renderCarousel();
    const eager = Array.from(container.querySelectorAll('img')).filter(
      (img) => img.getAttribute('loading') === 'eager' || img.hasAttribute('fetchpriority'),
    );
    // Precargar las cinco descargaría el carrusel entero antes de mostrar nada.
    expect(eager.length).toBeLessThanOrEqual(1);
  });

  it('la región del carrusel tiene nombre accesible traducido', () => {
    renderCarousel();
    expect(screen.getByRole('region', { name: preview().ariaLabel })).toBeInTheDocument();
  });
});

describe('carrusel del hero — paginación manual', () => {
  it('las cinco paginaciones son botones reales con label traducido', () => {
    renderCarousel();
    for (const id of SLIDE_IDS) {
      const control = screen.getByRole('button', { name: preview().controls[id] });
      expect(control.tagName).toBe('BUTTON');
      expect(control).toHaveAttribute('type', 'button');
    }
  });

  it('seleccionar una diapositiva cambia imagen y tarjeta a la vez', async () => {
    const user = userEvent.setup();
    const { container } = renderCarousel();

    await user.click(screen.getByRole('button', { name: preview().controls.baptism }));

    expect(activeSlideId(container)).toBe('baptism');
    expect(cardText(container)).toContain(preview().slides.baptism.title);
    expect(cardText(container)).toContain(preview().slides.baptism.description);
  });

  it('la tarjeta nunca queda desincronizada de la imagen', async () => {
    const user = userEvent.setup();
    const { container } = renderCarousel();

    for (const id of SLIDE_IDS) {
      await user.click(screen.getByRole('button', { name: preview().controls[id] }));
      expect(activeSlideId(container)).toBe(id);
      expect(cardText(container)).toContain(preview().slides[id].title);
      // Y ninguna otra tarjeta: el texto mostrado es exclusivamente el de la activa.
      for (const other of SLIDE_IDS.filter((candidate) => candidate !== id)) {
        expect(cardText(container)).not.toContain(preview().slides[other].title);
      }
    }
  });

  it('la diapositiva activa se marca con `aria-current`, no sólo con color', async () => {
    const user = userEvent.setup();
    renderCarousel();

    expect(screen.getByRole('button', { name: preview().controls.wedding })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await user.click(screen.getByRole('button', { name: preview().controls.corporate }));

    expect(screen.getByRole('button', { name: preview().controls.corporate })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: preview().controls.wedding })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('la paginación se activa con teclado', async () => {
    const user = userEvent.setup();
    const { container } = renderCarousel();

    screen.getByRole('button', { name: preview().controls.birthday }).focus();
    await user.keyboard('{Enter}');
    expect(activeSlideId(container)).toBe('birthday');

    screen.getByRole('button', { name: preview().controls.celebration }).focus();
    await user.keyboard(' ');
    expect(activeSlideId(container)).toBe('celebration');
  });
});

describe('carrusel del hero — avance automático', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('avanza solo a la siguiente diapositiva', async () => {
    const { container } = renderCarousel();
    expect(activeSlideId(container)).toBe('wedding');

    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS);
    await waitFor(() => expect(activeSlideId(container)).toBe('celebration'));
  });

  it('vuelve a la primera tras la última (bucle continuo)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = renderCarousel();

    const control = screen.getByRole('button', { name: preview().controls.corporate });
    await user.click(control);
    expect(activeSlideId(container)).toBe('corporate');

    // El clic deja el foco en el botón, y el foco dentro del carrusel pausa el avance a
    // propósito. Se retira para observar el ciclo automático.
    control.blur();

    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS);
    await waitFor(() => expect(activeSlideId(container)).toBe('wedding'));
  });

  it('reinicia el temporizador tras una selección manual', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = renderCarousel();

    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS - 600);
    const control = screen.getByRole('button', { name: preview().controls.baptism });
    await user.click(control);
    control.blur();

    // Quedaban 600 ms del ciclo anterior: si no se reiniciara, ya habría saltado.
    await vi.advanceTimersByTimeAsync(900);
    expect(activeSlideId(container)).toBe('baptism');

    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS);
    await waitFor(() => expect(activeSlideId(container)).toBe('birthday'));
  });

  it('se detiene mientras el puntero está encima y se reanuda al salir', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = renderCarousel();
    const carousel = screen.getByTestId('hero-carousel');

    await user.hover(carousel);
    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS * 2);
    expect(activeSlideId(container)).toBe('wedding');

    await user.unhover(carousel);
    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS);
    await waitFor(() => expect(activeSlideId(container)).toBe('celebration'));
  });

  it('se detiene mientras el foco está dentro del carrusel', async () => {
    const { container } = renderCarousel();

    // Tabular hasta la paginación deja el foco dentro: el carrusel no debe moverse bajo los pies
    // de quien lo está explorando con teclado.
    screen.getByRole('button', { name: preview().controls.wedding }).focus();
    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS * 2);
    expect(activeSlideId(container)).toBe('wedding');
  });

  it('el botón de pausa detiene el avance y el de reanudar lo devuelve', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = renderCarousel();

    // WCAG 2.2.2: en táctil no hay hover, así que el control visible es el único mecanismo.
    await user.click(screen.getByRole('button', { name: preview().pause }));
    const resume = screen.getByRole('button', { name: preview().resume });
    expect(resume).toHaveAttribute('aria-pressed', 'true');

    resume.blur();
    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS * 2);
    expect(activeSlideId(container)).toBe('wedding');

    await user.click(resume);
    screen.getByRole('button', { name: preview().pause }).blur();
    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS);
    await waitFor(() => expect(activeSlideId(container)).toBe('celebration'));
  });

  it('limpia el temporizador al desmontarse', async () => {
    const clearInterval = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderCarousel();

    unmount();

    expect(clearInterval).toHaveBeenCalled();
    clearInterval.mockRestore();
  });
});

describe('carrusel del hero — movimiento reducido', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('no avanza solo cuando el sistema pide movimiento reducido', async () => {
    setReducedMotion(true);
    const { container } = renderCarousel();

    await vi.advanceTimersByTimeAsync(AUTOPLAY_MS * 3);
    expect(activeSlideId(container)).toBe('wedding');
  });

  it('la paginación manual sigue funcionando con movimiento reducido', async () => {
    setReducedMotion(true);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = renderCarousel();

    await user.click(screen.getByRole('button', { name: preview().controls.corporate }));
    expect(activeSlideId(container)).toBe('corporate');
    expect(cardText(container)).toContain(preview().slides.corporate.title);
  });

  it('oculta el control de pausa: no hay movimiento automático que pausar', () => {
    setReducedMotion(true);
    renderCarousel();
    expect(screen.queryByRole('button', { name: preview().pause })).not.toBeInTheDocument();
  });
});

describe('carrusel del hero — internacionalización', () => {
  it.each(['es-LATAM', 'es-ES', 'pt', 'en'] as const)(
    'resuelve todas las claves en %s',
    (locale) => {
      const { container } = renderCarousel(locale);
      const text = container.textContent ?? '';

      // Ninguna ruta de clave cruda visible (`common.landing.preview.…`, `slides.wedding.title`).
      expect(text).not.toMatch(/common\.landing|preview\.|slides\.|controls\./);

      expect(text).toContain(preview(locale).slides.wedding.eyebrow);
      expect(text).toContain(preview(locale).slides.wedding.title);
      expect(text).toContain(preview(locale).slides.wedding.description);
    },
  );

  it.each(['es-LATAM', 'es-ES', 'pt', 'en'] as const)(
    'cada diapositiva tiene las cuatro claves y una etiqueta de paginación en %s',
    (locale) => {
      const catalog = preview(locale);
      for (const id of SLIDE_IDS) {
        const slide = catalog.slides[id];
        for (const key of ['eyebrow', 'title', 'description', 'imageAlt'] as const) {
          expect(slide[key], `${locale}/${id}.${key}`).toBeTruthy();
        }
        expect(catalog.controls[id], `${locale}/controls.${id}`).toBeTruthy();
      }
      for (const key of ['ariaLabel', 'pause', 'resume', 'slideStatus'] as const) {
        expect(catalog[key], `${locale}/${key}`).toBeTruthy();
      }
    },
  );

  it.each(['es-LATAM', 'es-ES', 'pt', 'en'] as const)(
    'los textos alternativos son distintos entre diapositivas en %s',
    (locale) => {
      const alts = SLIDE_IDS.map((id) => preview(locale).slides[id].imageAlt);
      // Un `alt` repetido haría indistinguibles dos fotografías para quien no las ve.
      expect(new Set(alts).size).toBe(SLIDE_IDS.length);
    },
  );
});

describe('carrusel del hero — estabilidad de layout', () => {
  it('las cinco diapositivas ocupan el mismo hueco reservado', () => {
    const { container } = renderCarousel();
    const slides = SLIDE_IDS.map(
      (id) => container.querySelector(`[data-testid="hero-carousel-slide-${id}"]`) as HTMLElement,
    );
    // Todas apiladas en el mismo contenedor con proporción fija: cambiar de diapositiva no puede
    // alterar el alto del hero.
    const classes = slides.map((slide) => slide.className.replace(/opacity-\S+/, ''));
    expect(new Set(classes).size).toBe(1);
    for (const slide of slides) expect(slide.className).toContain('absolute inset-0');
  });

  it('la tarjeta está fuera del flujo: su longitud no empuja el layout', () => {
    const { container } = renderCarousel();
    const card = container.querySelector('[data-testid="hero-carousel-card"]');
    // Una descripción más larga en otro idioma no puede cambiar el alto del hero.
    expect(card?.parentElement?.className).toContain('absolute');
  });
});
