import { NextResponse, type NextRequest } from 'next/server';

/**
 * Nombres de query params anteriores → nombres públicos actuales, por ruta.
 *
 * Las URLs usaban los nombres internos de la API (`categoryCode`, `priceMin`, …). Ahora llevan
 * nombres cortos y estables; esta tabla mantiene vivos los enlaces ya compartidos o indexados con
 * una redirección permanente (308). Sólo renombra: no valida valores (eso lo hace cada página) y
 * descarta los nombres viejos que ya no tienen equivalente (p. ej. los datos de evento/proveedor
 * que la nueva solicitud de cotización lee de la API).
 */
interface LegacyRule {
  path: RegExp;
  rename: Record<string, string>;
  drop?: readonly string[];
}

const DIRECTORY_RENAMES = {
  categoryCode: 'category',
  locationCode: 'city',
  priceMin: 'minPrice',
  priceMax: 'maxPrice',
};

const LEGACY_RULES: readonly LegacyRule[] = [
  { path: /^\/vendors\/?$/, rename: DIRECTORY_RENAMES },
  { path: /^\/organizer\/vendors\/?$/, rename: DIRECTORY_RENAMES },
  { path: /^\/organizer\/events\/[^/]+\/quotes\/compare\/?$/, rename: { categoryCode: 'category' } },
  // Checklist: página propia y embebido en el dashboard del evento (`?tab=`).
  {
    path: /^\/organizer\/events\/[^/]+(?:\/tasks)?\/?$/,
    rename: { aiGenerated: 'ai', categoryCode: 'category' },
  },
  {
    path: /^\/organizer\/events\/[^/]+\/quotes\/new\/?$/,
    rename: { vendorSlug: 'vendor' },
    drop: [
      'vendorProfileId',
      'serviceCategoryId',
      'vendorName',
      'categoryLabel',
      'eventTitle',
      'eventType',
      'eventDate',
      'locationLabel',
      'currency',
      'guests',
      'source',
    ],
  },
];

/** Redirección 308 a la URL con los nombres actuales, o `null` si la URL ya está al día. */
export function legacyQueryParamsRedirect(req: NextRequest): NextResponse | null {
  const { pathname, searchParams } = req.nextUrl;
  const rule = LEGACY_RULES.find((r) => r.path.test(pathname));
  if (!rule) return null;

  const next = new URLSearchParams(searchParams);
  let changed = false;
  for (const [legacy, current] of Object.entries(rule.rename)) {
    if (!next.has(legacy)) continue;
    const value = next.get(legacy) ?? '';
    next.delete(legacy);
    // Si la URL ya trae el nombre nuevo, gana el nuevo.
    if (!next.has(current) && value) next.set(current, value);
    changed = true;
  }
  for (const legacy of rule.drop ?? []) {
    if (!next.has(legacy)) continue;
    next.delete(legacy);
    changed = true;
  }
  if (!changed) return null;

  const url = req.nextUrl.clone();
  url.search = next.toString();
  return NextResponse.redirect(url, 308);
}
