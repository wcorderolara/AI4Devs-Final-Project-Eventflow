// Metadata SEO de `/`. Server-side y localizada, sin `hreflang` inventados: EventFlow no enruta
// el locale por URL, así que los cuatro idiomas viven en la misma dirección canónica.
import { describe, expect, it, vi } from 'vitest';
// `vi.mock` se iza por encima de los imports, así que la route ya se carga con next-intl y
// `next/headers` mockeados.
import { generateMetadata } from '@/app/(public)/page';
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

let activeLocale: Locale = 'es-LATAM';

vi.mock('next-intl/server', () => ({
  // Sólo se usa el namespace `common.landing.metadata`; el mock resuelve contra el catálogo real
  // para que un cambio de clave rompa el test en vez de pasar en silencio.
  getTranslations: async (namespace: string) => {
    expect(namespace).toBe('common.landing.metadata');
    const metadata = CATALOG[activeLocale].landing.metadata as Record<string, string>;
    return (key: string) => metadata[key] as string;
  },
}));

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined }) }));

describe('generateMetadata de la landing', () => {
  it.each(Object.keys(CATALOG) as Locale[])('genera título y descripción en %s', async (locale) => {
    activeLocale = locale;
    const metadata = await generateMetadata();
    const expected = CATALOG[locale].landing.metadata;

    expect(metadata.title).toBe(expected.title);
    expect(metadata.description).toBe(expected.description);
    expect(metadata.title).toContain('EventFlow');
    // La descripción tiene que caber en un snippet de resultados sin truncarse a mitad de idea.
    expect((metadata.description as string).length).toBeLessThanOrEqual(320);
  });

  it('declara la URL canónica de la home', async () => {
    activeLocale = 'es-LATAM';
    const metadata = await generateMetadata();
    expect(metadata.alternates?.canonical).toBe('/');
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });

  it('el Open Graph reutiliza el copy aprobado y no enlaza una imagen inexistente', async () => {
    activeLocale = 'es-LATAM';
    const metadata = await generateMetadata();
    expect(metadata.openGraph?.title).toBe(esLatamCommon.landing.metadata.title);
    expect(metadata.openGraph?.description).toBe(esLatamCommon.landing.metadata.description);
    expect(metadata.openGraph).not.toHaveProperty('images');
    expect(JSON.stringify(metadata)).not.toContain('googleusercontent.com');
  });

  it('no declara alternates de locale: no hay rutas por idioma que anunciar', async () => {
    activeLocale = 'es-LATAM';
    const metadata = await generateMetadata();
    expect(metadata.alternates?.languages).toBeUndefined();
  });

  it('la metadata no repite afirmaciones sin respaldo', async () => {
    for (const locale of Object.keys(CATALOG) as Locale[]) {
      activeLocale = locale;
      const metadata = await generateMetadata();
      const text = `${metadata.title as string} ${metadata.description as string}`;
      expect(text).not.toMatch(/gratis|free\b|grátis|precios?\b|pricing|garantiz|guarantee/i);
      expect(text).not.toMatch(/\d+\s*%|\d{3,}\+/);
    }
  });
});
