'use client';

import { Pause, Play, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image, { type StaticImageData } from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { IconButton } from '@/shared/design-system';
import baptismImage from '../assets/baptism.jpg';
import birthdayImage from '../assets/birthday.jpg';
import celebrationImage from '../assets/celebration.jpg';
import corporateImage from '../assets/corporate.jpg';
import weddingImage from '../assets/wedding.jpg';

/**
 * Apoyo visual del hero de la landing: carrusel de cinco tipos de evento.
 *
 * Cada diapositiva es **una sola unidad**: fotografía + tarjeta flotante. Nunca se muestra la
 * tarjeta de un evento sobre la foto de otro — ambas se derivan del mismo índice activo, así que
 * no pueden desincronizarse.
 *
 * Las fotografías son sólo el fondo: el texto, el icono y los controles se renderizan con React
 * sobre ellas. Nada se incrusta en los archivos de imagen.
 *
 * **Todo el copy vive en el catálogo i18n** (`common.landing.preview`). Aquí sólo hay metadata
 * técnica: el id estable de la diapositiva y su import de imagen. El id es además la clave de
 * traducción, de modo que añadir un evento es añadir una entrada aquí y su bloque en los cuatro
 * catálogos — no hay una tercera lista que mantener sincronizada.
 *
 * Es Client Component porque el autoplay necesita estado y temporizadores. El índice inicial es
 * `0` tanto en servidor como en cliente y el autoplay arranca en un efecto, así que el primer
 * render es determinista y no hay desajuste de hidratación.
 */
interface HeroSlide {
  /** Id estable: clave de React, clave de traducción y sufijo de `data-testid`. */
  readonly id: string;
  readonly image: StaticImageData;
}

const SLIDES: readonly HeroSlide[] = [
  { id: 'wedding', image: weddingImage },
  { id: 'celebration', image: celebrationImage },
  { id: 'baptism', image: baptismImage },
  { id: 'birthday', image: birthdayImage },
  { id: 'corporate', image: corporateImage },
] as const;

/** Suficiente para leer la tarjeta entera sin que el cambio se sienta apresurado. */
const AUTOPLAY_MS = 5500;

/**
 * Anchura reservada del hueco de la imagen en cada breakpoint. Le dice al optimizador de Next
 * qué tamaños generar: sin esto serviría el original (varios MB, hasta 8192 px de alto).
 */
const IMAGE_SIZES = '(min-width: 1024px) 40vw, (min-width: 640px) 60vw, 100vw';

export function LandingHeroPreview(): React.JSX.Element {
  const t = useTranslations('common.landing.preview');

  const [activeIndex, setActiveIndex] = useState(0);
  /** Pausa explícita del usuario (control visible). Persiste hasta que la revierte. */
  const [isPaused, setIsPaused] = useState(false);
  /** Pausa temporal por puntero encima o foco dentro. Se revierte sola al salir. */
  const [isInteracting, setIsInteracting] = useState(false);
  /**
   * Arranca en `false` para que el primer render coincida con el del servidor; el efecto lo
   * corrige antes de que ningún temporizador llegue a disparar.
   */
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  /**
   * `true` sólo tras una interacción manual. Gobierna si el estado de diapositiva se anuncia:
   * durante el avance automático la región vive en `off` para no interrumpir al lector de
   * pantalla en cada cambio (APG carousel).
   */
  const [announceStatus, setAnnounceStatus] = useState(false);


  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = (): void => setPrefersReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Con movimiento reducido no hay avance automático en absoluto: el usuario ha pedido
  // explícitamente que nada se mueva solo (WCAG 2.3.3). La paginación manual sigue intacta.
  const isPlaying = !isPaused && !isInteracting && !prefersReducedMotion;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
    // `activeIndex` en las dependencias reinicia el temporizador tras una selección manual: la
    // diapositiva recién elegida se ve el intervalo completo, no el resto del anterior.
  }, [isPlaying, activeIndex]);

  const goToSlide = useCallback((index: number): void => {
    setActiveIndex(index);
    setAnnounceStatus(true);
  }, []);

  /**
   * `onFocus`/`onBlur` de React burbujean (mapean a `focusin`/`focusout` del DOM), así que un
   * único par de handlers en el contenedor cubre todos los controles del carrusel.
   */
  const handleFocusOut = useCallback((event: React.FocusEvent<HTMLDivElement>): void => {
    // `relatedTarget` es el elemento que recibe el foco; si sigue dentro, no se ha salido.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsInteracting(false);
  }, []);

  const activeSlide = SLIDES[activeIndex] as HeroSlide;

  return (
    <div
      // `region` con `aria-roledescription` es el patrón de carrusel de APG: se anuncia como
      // «carrusel» sin inventar un rol que no existe en ARIA.
      role="region"
      aria-roledescription="carousel"
      aria-label={t('ariaLabel')}
      data-testid="hero-carousel"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocus={() => setIsInteracting(true)}
      onBlur={handleFocusOut}
      // Entre `sm` y `lg` el hero es de una sola columna: a ancho completo, una fotografía
      // vertical ocuparía toda la pantalla y aplastaría al copy. Se limita el ancho y se centra
      // para conservar la composición editorial sin que domine. Desde `lg` vuelve a haber dos
      // columnas y ocupa la suya entera.
      className="mx-auto w-full sm:max-w-md lg:max-w-none"
    >
      {/* Marco exterior: superficie neutra tenue y radio grande. La proporción se fija por
          breakpoint, así que el hueco está reservado y cambiar de diapositiva no mueve nada. */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card-prominent bg-surface-subtle shadow-marketing-floating sm:aspect-[4/5]">
        {SLIDES.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={slide.id}
              // Las inactivas salen del árbol de accesibilidad: sin esto, un lector de pantalla
              // leería los cinco textos alternativos seguidos como si fueran una galería.
              aria-hidden={!isActive}
              data-active={isActive || undefined}
              data-testid={`hero-carousel-slide-${slide.id}`}
              className={`absolute inset-0 transition-opacity duration-slow ease-standard motion-reduce:transition-none ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={slide.image}
                alt={t(`slides.${slide.id}.imageAlt`)}
                fill
                sizes={IMAGE_SIZES}
                // Sólo la primera es LCP; precargar las cinco sería descargar todo el carrusel
                // antes de que se vea nada.
                priority={index === 0}
                placeholder="blur"
                className="object-cover"
              />
            </div>
          );
        })}

        {/* Tarjeta flotante. Posicionada en absoluto en todos los breakpoints: así el alto del
            hero no depende de lo larga que sea la descripción traducida y una diapositiva no
            puede empujar a la siguiente. */}
        <div className="absolute inset-x-3 bottom-3 sm:inset-x-5 sm:bottom-5 sm:max-w-[22rem]">
          <div
            data-testid="hero-carousel-card"
            className="rounded-card bg-surface p-4 shadow-overlay-dropdown sm:p-5"
          >
            <p className="flex items-center gap-2 font-ui text-caption font-semibold text-ai-label">
              {/* Decorativo: el propio antetítulo ya dice que es una sugerencia de IA. */}
              <Sparkles aria-hidden="true" className="h-icon-sm w-icon-sm shrink-0 text-ai-icon" />
              {t(`slides.${activeSlide.id}.eyebrow`)}
            </p>
            {/* No es un heading: el carrusel no forma parte del esquema de encabezados de la
                página, y anunciarlo como tal llevaría a un lector de pantalla hasta un apoyo
                visual creyendo que es una sección. */}
            <p className="mt-2 font-heading text-body-md font-semibold text-primary">
              {t(`slides.${activeSlide.id}.title`)}
            </p>
            <p className="mt-1 font-body text-body-sm text-secondary">
              {t(`slides.${activeSlide.id}.description`)}
            </p>
          </div>
        </div>
      </div>

      {/* Controles bajo el marco: no tapan la fotografía y siempre tienen contraste suficiente,
          sea cual sea la imagen que haya debajo. */}
      <div className="mt-4 flex items-center justify-center gap-1">
        <ul className="flex items-center gap-1" data-testid="hero-carousel-pagination">
          {SLIDES.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={slide.id} className="flex">
                <button
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={t(`controls.${slide.id}`)}
                  // `aria-current` comunica cuál está activa sin depender del color (UI-DEC-014).
                  aria-current={isActive ? 'true' : undefined}
                  data-testid={`hero-carousel-dot-${slide.id}`}
                  className="focus-ring hit-area inline-flex min-h-touch min-w-touch items-center justify-center rounded-button"
                >
                  {/* La inactiva es el mismo violeta atenuado con `opacity.decorative`, no un
                      gris propio: `border.default` no existe como utilidad de fondo y añadir un
                      token sólo para un punto de paginación no se sostiene. */}
                  <span
                    aria-hidden="true"
                    className={`block h-2 rounded-badge bg-action-primary transition-all duration-fast ease-standard motion-reduce:transition-none ${
                      isActive ? 'w-6' : 'w-2 opacity-decorative'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        {/*
         * Control de pausa visible. No es decoración: WCAG 2.2.2 (nivel A) exige un mecanismo
         * para detener el movimiento automático que dura más de cinco segundos, y pausar al
         * pasar el puntero no sirve en una pantalla táctil, donde no hay hover.
         *
         * Se oculta cuando el sistema ya pide movimiento reducido: ahí no hay avance automático
         * que pausar y el botón no haría nada.
         */}
        {prefersReducedMotion ? null : (
          <IconButton
            icon={isPaused ? <Play /> : <Pause />}
            variant="subtle"
            size="sm"
            aria-label={isPaused ? t('resume') : t('pause')}
            aria-pressed={isPaused}
            data-testid="hero-carousel-toggle"
            onClick={() => setIsPaused((paused) => !paused)}
          />
        )}
      </div>

      {/*
       * Estado de la diapositiva para tecnologías de asistencia. `polite` sólo cuando el avance
       * automático está detenido: durante la reproducción, anunciar cada cambio interrumpiría la
       * lectura de la página cada cinco segundos y medio.
       */}
      <p
        className="sr-only"
        aria-live={isPlaying ? 'off' : 'polite'}
        data-testid="hero-carousel-status"
      >
        {announceStatus || !isPlaying
          ? t('slideStatus', { current: activeIndex + 1, total: SLIDES.length })
          : ''}
      </p>
    </div>
  );
}
