'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { PublicVendorPortfolioImageDTO } from '../api/vendorPublicApi.types';

interface Props {
  workLabel: string;
  images: PublicVendorPortfolioImageDTO[];
  /** Texto alternativo de cada imagen, ya traducido (mismo orden que `images`). */
  alts: string[];
}

/**
 * Cuadrícula de un trabajo del portafolio + visor a pantalla completa.
 *
 * La cuadrícula destaca la primera foto (2×2). Cada miniatura es un botón que abre el visor en esa
 * foto; el visor muestra la imagen grande con su **pie de crédito** (autor, licencia y fuente):
 * las fotos de licencia libre (CC BY / CC BY-SA) exigen la atribución junto a la imagen.
 *
 * Visor: `Dialog` de Headless UI (foco atrapado, Escape cierra, devuelve el foco), flechas del
 * teclado para navegar y contador "3 de 10".
 */
export function PortfolioWorkGallery({ workLabel, images, alts }: Props): React.JSX.Element {
  const t = useTranslations('publicVendor.gallery');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const total = images.length;
  const current = openIndex === null ? null : images[openIndex];

  const go = (delta: number): void =>
    setOpenIndex((i) => (i === null ? i : (i + delta + total) % total));

  // Flechas del teclado mientras el visor está abierto (Escape lo resuelve el Dialog).
  const isOpen = openIndex !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight') setOpenIndex((i) => (i === null ? i : (i + 1) % total));
      if (e.key === 'ArrowLeft') setOpenIndex((i) => (i === null ? i : (i - 1 + total) % total));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, total]);

  return (
    <>
      <ul className="grid auto-rows-[9rem] grid-cols-2 gap-2 sm:auto-rows-[11rem] sm:grid-cols-4">
        {images.map((image, idx) => (
          <li
            key={image.url}
            // Con 3 fotos, las dos pequeñas se apilan junto a la destacada y completan el bloque.
            className={idx === 0 ? 'col-span-2 row-span-2' : total === 3 ? 'sm:col-span-2' : undefined}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(idx)}
              aria-label={t('open', { index: idx + 1, total, work: workLabel })}
              className="focus-ring group block h-full w-full overflow-hidden bg-surface-subtle"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={alts[idx] ?? ''}
                loading={idx === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover transition-transform duration-slow ease-standard group-hover:scale-[1.02] motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={openIndex !== null} onClose={() => setOpenIndex(null)} className="relative z-modal">
        <div className="fixed inset-0 bg-neutral-950/75" aria-hidden="true" />
        <div className="fixed inset-0 flex flex-col">
          <DialogPanel className="flex h-full flex-col text-inverse">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <DialogTitle className="font-display text-[1.25rem] font-medium">
                {workLabel}
                <span className="ml-3 font-ui text-body-sm text-neutral-300">
                  {t('counter', { index: (openIndex ?? 0) + 1, total })}
                </span>
              </DialogTitle>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label={t('close')}
                className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full text-inverse hover:bg-white/10"
              >
                <X aria-hidden="true" className="h-icon-lg w-icon-lg" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20">
              {current ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.url}
                  alt={alts[openIndex ?? 0] ?? ''}
                  className="max-h-full max-w-full object-contain"
                />
              ) : null}
              {total > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={t('previous')}
                    className="focus-ring absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-inverse hover:bg-black/60 sm:left-6"
                  >
                    <ChevronLeft aria-hidden="true" className="h-icon-lg w-icon-lg" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={t('next')}
                    className="focus-ring absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-inverse hover:bg-black/60 sm:right-6"
                  >
                    <ChevronRight aria-hidden="true" className="h-icon-lg w-icon-lg" />
                  </button>
                </>
              ) : null}
            </div>

            {/* Pie de crédito: obligatorio para las fotos de licencia libre. */}
            <div className="min-h-[3.5rem] px-4 py-4 text-center font-ui text-body-sm text-neutral-300 sm:px-6">
              {current?.credit ? <CreditLine credit={current.credit} /> : null}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function CreditLine({ credit }: { credit: NonNullable<PublicVendorPortfolioImageDTO['credit']> }) {
  const t = useTranslations('publicVendor.gallery');
  const license = credit.licenseUrl ? (
    <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="focus-ring underline underline-offset-2 hover:text-inverse">
      {credit.license}
    </a>
  ) : (
    credit.license
  );
  const host = credit.source ? safeHost(credit.source) : null;

  return (
    <p>
      {credit.author
        ? t.rich('creditBy', { author: credit.author, license: () => license })
        : t.rich('creditLicense', { license: () => license })}
      {credit.source ? (
        <>
          {' '}
          <a href={credit.source} target="_blank" rel="noopener noreferrer" className="focus-ring underline underline-offset-2 hover:text-inverse">
            {host?.includes('wikimedia') ? t('sourceCommons') : t('source')}
          </a>
        </>
      ) : null}
    </p>
  );
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
