'use client';

import { Pause, PencilLine, Play } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image, { type StaticImageData } from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconButton } from '@/shared/design-system';
import { mapToBcp47 } from '@/shared/i18n/format';
import type { Locale } from '@/shared/i18n/config';
import baptismImage from '../assets/baptism.jpg';
import birthdayImage from '../assets/birthday.jpg';
import celebrationImage from '../assets/celebration.jpg';
import corporateImage from '../assets/corporate.jpg';
import weddingImage from '../assets/wedding.jpg';

/**
 * Apoyo visual del hero: carrusel de **eventos de ejemplo** tal como se ven en EventFlow.
 *
 * Cada diapositiva es una unidad: la foto (como una impresión clavada detrás) y la tarjeta del
 * evento con lo que el producto realmente produce — fecha y cuenta regresiva, avance del
 * checklist, presupuesto comprometido y una propuesta de la IA pendiente de revisión. Así el
 * hero muestra el producto, no una foto de stock con un globo de "IA".
 *
 * Los datos son ilustrativos y la tarjeta lo dice ("Evento de ejemplo"): no son clientes ni
 * métricas. Nombres, lugares y sugerencias viven en `common.landing.preview.slides.*`; las cifras
 * son metadata de la diapositiva y se formatean con el locale activo.
 *
 * La fecha se calcula como "hoy + N días" para que la cuenta regresiva nunca quede en el pasado.
 * Es Client Component (autoplay con estado y temporizadores); el índice inicial es `0` en servidor
 * y cliente y el autoplay arranca en un efecto, así que el primer render es determinista.
 */
interface HeroSlide {
  /** Id estable: clave de React, clave de traducción y sufijo de `data-testid`. */
  readonly id: string;
  readonly image: StaticImageData;
  readonly daysAway: number;
  readonly guests: number;
  readonly tasksDone: number;
  readonly tasksTotal: number;
  readonly budget: number;
  readonly currency: 'GTQ' | 'MXN' | 'COP' | 'USD';
  /** Porcentaje del presupuesto ya comprometido con proveedores. */
  readonly committed: number;
}

const SLIDES: readonly HeroSlide[] = [
  { id: 'wedding', image: weddingImage, daysAway: 74, guests: 120, tasksDone: 18, tasksTotal: 31, budget: 85000, currency: 'GTQ', committed: 58 },
  { id: 'celebration', image: celebrationImage, daysAway: 96, guests: 150, tasksDone: 12, tasksTotal: 34, budget: 180000, currency: 'MXN', committed: 41 },
  { id: 'baptism', image: baptismImage, daysAway: 33, guests: 60, tasksDone: 15, tasksTotal: 19, budget: 9500000, currency: 'COP', committed: 72 },
  { id: 'birthday', image: birthdayImage, daysAway: 21, guests: 45, tasksDone: 9, tasksTotal: 14, budget: 22000, currency: 'GTQ', committed: 66 },
  { id: 'corporate', image: corporateImage, daysAway: 52, guests: 80, tasksDone: 7, tasksTotal: 22, budget: 6500, currency: 'USD', committed: 35 },
] as const;

/** Suficiente para leer la tarjeta entera sin que el cambio se sienta apresurado. */
const AUTOPLAY_MS = 6500;

/** La foto ocupa como mucho ~28 rem: le dice al optimizador de Next qué tamaños generar. */
const IMAGE_SIZES = '(min-width: 1024px) 28rem, 75vw';

const DAY_MS = 86_400_000;

export function LandingHeroPreview(): React.JSX.Element {
  const t = useTranslations('common.landing.preview');
  const bcp47 = mapToBcp47(useLocale() as Locale);

  const [activeIndex, setActiveIndex] = useState(0);
  /** Pausa explícita del usuario (control visible). Persiste hasta que la revierte. */
  const [isPaused, setIsPaused] = useState(false);
  /** Pausa temporal por puntero encima o foco dentro. Se revierte sola al salir. */
  const [isInteracting, setIsInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  /** `true` sólo tras una interacción manual: gobierna si el estado de diapositiva se anuncia. */
  const [announceStatus, setAnnounceStatus] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = (): void => setPrefersReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Con movimiento reducido no hay avance automático (WCAG 2.3.3); la paginación manual sigue.
  const isPlaying = !isPaused && !isInteracting && !prefersReducedMotion;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
    // `activeIndex` reinicia el temporizador tras una selección manual.
  }, [isPlaying, activeIndex]);

  const goToSlide = useCallback((index: number): void => {
    setActiveIndex(index);
    setAnnounceStatus(true);
  }, []);

  const handleFocusOut = useCallback((event: React.FocusEvent<HTMLDivElement>): void => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsInteracting(false);
  }, []);

  const formatters = useMemo(
    () => ({
      day: new Intl.DateTimeFormat(bcp47, { day: 'numeric' }),
      month: new Intl.DateTimeFormat(bcp47, { month: 'long' }),
      year: new Intl.DateTimeFormat(bcp47, { year: 'numeric' }),
      money: (currency: HeroSlide['currency']) =>
        new Intl.NumberFormat(bcp47, { style: 'currency', currency, maximumFractionDigits: 0 }),
    }),
    [bcp47],
  );

  const slide = SLIDES[activeIndex] as HeroSlide;
  const eventDate = new Date(Date.now() + slide.daysAway * DAY_MS);
  const taskPercent = Math.round((slide.tasksDone / slide.tasksTotal) * 100);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t('ariaLabel')}
      data-testid="hero-carousel"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocus={() => setIsInteracting(true)}
      onBlur={handleFocusOut}
      className="mx-auto w-full max-w-[34rem] lg:max-w-none"
    >
      {/* Escena: la foto como impresión detrás (derecha, inclinada) y la tarjeta del evento
          delante. El alto está reservado, así que cambiar de diapositiva no mueve el layout. */}
      <div className="relative h-[36rem] sm:h-[38rem]">
        <div className="absolute right-0 top-0 h-[24rem] w-[74%] rotate-[2.5deg] bg-surface p-2 pb-8 shadow-overlay-dropdown sm:h-[29rem] sm:w-[70%]">
          <div className="relative h-full w-full overflow-hidden bg-surface-subtle">
            {SLIDES.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  key={item.id}
                  aria-hidden={!isActive}
                  data-active={isActive || undefined}
                  data-testid={`hero-carousel-slide-${item.id}`}
                  className={`absolute inset-0 transition-opacity duration-slow ease-standard motion-reduce:transition-none ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Image
                    src={item.image}
                    alt={t(`slides.${item.id}.imageAlt`)}
                    fill
                    sizes={IMAGE_SIZES}
                    priority={index === 0}
                    placeholder="blur"
                    className="object-cover"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Tarjeta del evento. No usa headings: es un apoyo visual, no una sección de la página. */}
        <div
          data-testid="hero-carousel-card"
          className="absolute bottom-0 left-0 w-[94%] border border-subtle bg-surface p-6 shadow-marketing-floating sm:w-[78%] sm:p-7"
        >
          <p className="font-ui text-caption text-muted">{t('sampleLabel')}</p>

          <div className="mt-3 flex items-start gap-5">
            {/* Bloque de fecha de invitación: el día manda. */}
            <div className="shrink-0 border-r border-subtle pr-5 text-center" suppressHydrationWarning>
              <p className="font-display text-[3.5rem] font-medium leading-none text-link" suppressHydrationWarning>
                {formatters.day.format(eventDate)}
              </p>
              <p className="mt-1 font-display text-body-md italic text-primary" suppressHydrationWarning>
                {formatters.month.format(eventDate)}
              </p>
              <p className="font-ui text-caption text-muted" suppressHydrationWarning>
                {formatters.year.format(eventDate)}
              </p>
            </div>

            <div className="min-w-0">
              <p className="font-display text-[1.625rem] font-medium leading-tight text-primary">
                {t(`slides.${slide.id}.title`)}
              </p>
              <p className="mt-1 font-ui text-body-sm text-secondary">
                {t(`slides.${slide.id}.place`)}
              </p>
              <p className="mt-2 font-ui text-body-sm font-semibold text-link">
                {t('countdown', { days: slide.daysAway })}
                <span className="font-normal text-secondary">
                  {' '}
                  {t('guests', { count: slide.guests })}
                </span>
              </p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-5">
            <div>
              <dt className="font-ui text-caption text-muted">{t('checklist')}</dt>
              <dd className="mt-1 font-ui text-body-sm font-semibold text-primary">
                {t('checklistProgress', { done: slide.tasksDone, total: slide.tasksTotal })}
              </dd>
              <dd aria-hidden="true" className="mt-2 h-1 bg-surface-disabled">
                <span className="block h-full bg-action-primary" style={{ width: `${taskPercent}%` }} />
              </dd>
            </div>
            <div>
              <dt className="font-ui text-caption text-muted">{t('budget')}</dt>
              <dd className="mt-1 font-ui text-body-sm font-semibold text-primary">
                {formatters.money(slide.currency).format(slide.budget)}
              </dd>
              <dd className="mt-2">
                <span aria-hidden="true" className="block h-1 bg-surface-disabled">
                  <span className="block h-full bg-feedback-success-strong" style={{ width: `${slide.committed}%` }} />
                </span>
                <span className="mt-1 block font-ui text-caption text-feedback-success">
                  {t('budgetCommitted', { percent: slide.committed })}
                </span>
              </dd>
            </div>
          </dl>

          {/* Propuesta de la IA: borrador "a lápiz" en cempasúchil, pendiente de revisión. */}
          <div className="mt-6 border border-dashed border-ai bg-ai-surface p-4">
            <p className="flex items-center gap-2 font-ui text-caption font-semibold text-ai-label">
              <PencilLine aria-hidden="true" className="h-icon-sm w-icon-sm shrink-0 text-ai-icon" />
              {t('aiLabel')}
            </p>
            <p className="mt-1 font-body text-body-sm text-ai-text">
              {t(`slides.${slide.id}.description`)}
            </p>
            <p className="mt-2 font-ui text-caption text-secondary">{t('pending')}</p>
          </div>
        </div>
      </div>

      {/* Controles bajo la escena: no tapan nada y siempre tienen contraste suficiente. */}
      <div className="mt-6 flex items-center justify-center gap-1 lg:justify-start">
        <ul className="flex items-center gap-1" data-testid="hero-carousel-pagination">
          {SLIDES.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={item.id} className="flex">
                <button
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={t(`controls.${item.id}`)}
                  aria-current={isActive ? 'true' : undefined}
                  data-testid={`hero-carousel-dot-${item.id}`}
                  className="focus-ring hit-area inline-flex min-h-touch min-w-touch items-center justify-center rounded-button"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-0.5 transition-all duration-fast ease-standard motion-reduce:transition-none ${
                      isActive ? 'w-8 bg-action-primary' : 'w-4 bg-surface-inverse opacity-decorative'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        {/* WCAG 2.2.2: control visible para detener el avance automático (no hay hover en táctil). */}
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

      <p className="sr-only" aria-live={isPlaying ? 'off' : 'polite'} data-testid="hero-carousel-status">
        {announceStatus || !isPlaying
          ? t('slideStatus', { current: activeIndex + 1, total: SLIDES.length })
          : ''}
      </p>
    </div>
  );
}
