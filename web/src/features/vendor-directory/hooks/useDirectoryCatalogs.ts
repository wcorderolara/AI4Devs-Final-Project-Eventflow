'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { httpGetData } from '@/shared/api-client';

/**
 * Catálogos que alimentan los filtros del directorio: categorías de servicio y ubicaciones.
 * Ambos endpoints son públicos y de sólo lectura (decisión PO 2026-10-14), así que sirven igual
 * al visitante anónimo de `/vendors` que al organizador autenticado.
 */
interface ServiceCategoryNode {
  code: string;
  label: string;
  name_i18n?: Record<string, string> | null;
  children?: ServiceCategoryNode[];
}

interface LocationDTO {
  id: string;
  code: string | null;
  country: string;
  region: string | null;
  city: string | null;
}

export interface CategoryOptionGroup {
  /** Categoría padre (también seleccionable). */
  code: string;
  label: string;
  children: Array<{ code: string; label: string }>;
}

export interface LocationOptionGroup {
  country: string;
  options: Array<{ code: string; label: string }>;
}

const STALE_MS = 5 * 60_000;

export function useDirectoryCatalogs(): {
  categories: CategoryOptionGroup[] | undefined;
  locations: LocationOptionGroup[] | undefined;
} {
  const locale = useLocale();

  const categories = useQuery({
    // Misma raíz que invalida la administración de categorías (`['service-categories']`).
    queryKey: ['service-categories', 'directory-filters'],
    queryFn: () => httpGetData<{ tree: ServiceCategoryNode[] }>('/service-categories'),
    staleTime: STALE_MS,
    retry: false,
  });

  const locations = useQuery({
    queryKey: ['locations', 'directory-filters'],
    queryFn: () => httpGetData<LocationDTO[]>('/locations'),
    staleTime: STALE_MS,
    retry: false,
  });

  const name = (node: ServiceCategoryNode): string => node.name_i18n?.[locale] ?? node.label;

  return {
    categories: categories.data?.tree.map((node) => ({
      code: node.code,
      label: name(node),
      children: (node.children ?? []).map((child) => ({ code: child.code, label: name(child) })),
    })),
    locations: locations.data
      ? groupByCountry(locations.data.filter((loc): loc is LocationDTO & { code: string } => !!loc.code))
      : undefined,
  };
}

function groupByCountry(rows: Array<LocationDTO & { code: string }>): LocationOptionGroup[] {
  const groups = new Map<string, LocationOptionGroup>();
  for (const loc of rows) {
    const group = groups.get(loc.country) ?? { country: loc.country, options: [] };
    group.options.push({ code: loc.code, label: loc.city ?? loc.region ?? loc.code });
    groups.set(loc.country, group);
  }
  return Array.from(groups.values());
}
