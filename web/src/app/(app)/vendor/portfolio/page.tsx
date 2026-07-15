'use client';

// Página `/vendor/portfolio` (US-043 / PB-P1-026 / FE-001).
// Renderiza `PortfolioUploader` + `WorkGrid`. El listado remoto lo entrega una US futura;
// mientras tanto, el grid opera sobre la memoria local que se acumula con cada upload.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  PortfolioUploader,
  WorkGrid,
  type PortfolioImageView,
} from '@/features/vendor-portfolio';

export default function VendorPortfolioPage(): JSX.Element {
  const t = useTranslations('vendor.portfolio');
  const [images, setImages] = useState<PortfolioImageView[]>([]);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-neutral-600">{t('subtitle')}</p>
      </header>
      <PortfolioUploader
        onUploaded={(view) => setImages((prev) => [...prev, view])}
      />
      <WorkGrid
        images={images}
        onImageDeleted={(imageId) => setImages((prev) => prev.filter((img) => img.id !== imageId))}
      />
    </section>
  );
}
