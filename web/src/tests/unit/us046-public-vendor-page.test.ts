// Página `/vendors/[slug]`: sólo un 404 del backend es "no existe" (404 uniforme, D6). Un 429/5xx
// es una falla transitoria: no puede convertirse en 404 (el proveedor "desaparecería" y ISR lo
// cachearía); se lanza para que lo atienda el error boundary con reintento.
import { describe, expect, it, vi } from 'vitest';

// `cache` existe en el React de Server Components que trae Next, no en el React 18 de jsdom.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: <T extends (...args: never[]) => unknown>(fn: T) => fn };
});

import PublicVendorPage from '@/app/(public)/vendors/[slug]/page';

describe('US-046 · página pública del proveedor', () => {
  it('404 del backend → notFound() (404 uniforme)', async () => {
    await expect(PublicVendorPage({ params: { slug: 'slug-desconocido' } })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('429 del backend → error transitorio, no 404', async () => {
    const outcome = PublicVendorPage({ params: { slug: 'slug-rate-limited' } });
    await expect(outcome).rejects.toThrow('public vendor profile unavailable');
  });

  it('200 → renderiza el perfil', async () => {
    await expect(PublicVendorPage({ params: { slug: 'banquetes-el-quetzal' } })).resolves.toBeTruthy();
  });
});
