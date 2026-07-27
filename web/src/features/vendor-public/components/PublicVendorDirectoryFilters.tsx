'use client';

// Isla cliente del directorio público: la única pieza de la página que necesita interacción.
// El listado lo renderiza el servidor (SEO + funciona sin JavaScript); esto sólo traduce el
// formulario a una nueva URL, que es la fuente de verdad de los filtros.
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { VendorFilters, type VendorFiltersValue } from '@/features/vendor-directory';

export interface PublicVendorDirectoryFiltersProps {
  /** Filtros ya aplicados, leídos de la URL por el Server Component. */
  value: VendorFiltersValue;
}

const EMPTY: VendorFiltersValue = {
  categoryCode: '',
  locationCode: '',
  priceMin: '',
  priceMax: '',
  currency: '',
};

function toSearchParams(value: VendorFiltersValue): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(value)) {
    const trimmed = raw.trim();
    if (trimmed) params.set(key, trimmed);
  }
  return params.toString();
}

export function PublicVendorDirectoryFilters({
  value,
}: PublicVendorDirectoryFiltersProps): React.JSX.Element {
  const router = useRouter();
  // Borrador local: se puede teclear sin relanzar la búsqueda en cada pulsación.
  const [draft, setDraft] = useState<VendorFiltersValue>(value);

  // Si la URL cambia por fuera (atrás/adelante del navegador, enlace de paginación), el
  // formulario tiene que reflejar lo que realmente está aplicado.
  useEffect(() => setDraft(value), [value]);

  function apply(next: VendorFiltersValue): void {
    const qs = toSearchParams(next);
    // Sin cursor: cambiar los filtros empieza una búsqueda nueva, no continúa la paginación.
    router.push(qs ? `/vendors?${qs}` : '/vendors');
  }

  return (
    <VendorFilters
      value={draft}
      onChange={setDraft}
      onSubmit={() => apply(draft)}
      onReset={() => {
        setDraft(EMPTY);
        apply(EMPTY);
      }}
    />
  );
}
