// @vitest-environment node
// Enlaces con los nombres de query params anteriores (los de la API) → 308 a los nombres públicos.
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import middleware from '@/middleware';

const EVENT = 'e1111111-1111-4111-8111-111111111111';

function run(path: string): { status: number; location: URL | null } {
  const res = middleware(new NextRequest(`http://localhost:3000${path}`));
  const location = res.headers.get('location');
  return { status: res.status, location: location ? new URL(location) : null };
}

describe('middleware — redirección de query params anteriores', () => {
  it('directorio público: categoryCode/locationCode/priceMin/priceMax → category/city/minPrice/maxPrice', () => {
    const { status, location } = run(
      '/vendors?categoryCode=hora_loca&locationCode=GT-GUA&priceMin=100&priceMax=900&currency=GTQ&cursor=abc',
    );
    expect(status).toBe(308);
    expect(location?.pathname).toBe('/vendors');
    expect(Object.fromEntries(location!.searchParams)).toEqual({
      category: 'hora_loca',
      city: 'GT-GUA',
      minPrice: '100',
      maxPrice: '900',
      currency: 'GTQ',
      cursor: 'abc',
    });
  });

  it('directorio del organizador usa la misma traducción', () => {
    const { status, location } = run('/organizer/vendors?categoryCode=catering');
    expect(status).toBe(308);
    expect(location?.search).toBe('?category=catering');
  });

  it('si la URL ya trae el nombre nuevo, gana el nuevo', () => {
    const { location } = run('/vendors?category=venue&categoryCode=catering');
    expect(location?.search).toBe('?category=venue');
  });

  it('comparador y checklist (página propia y embebido en el dashboard del evento)', () => {
    expect(run(`/organizer/events/${EVENT}/quotes/compare?categoryCode=venue`).location?.search).toBe(
      '?category=venue',
    );
    expect(run(`/organizer/events/${EVENT}/tasks?aiGenerated=true&categoryCode=venue`).location?.search).toBe(
      '?ai=true&category=venue',
    );
    expect(run(`/organizer/events/${EVENT}?tab=tasks&aiGenerated=false`).location?.search).toBe(
      '?tab=tasks&ai=false',
    );
  });

  it('nueva cotización: conserva el proveedor y descarta los datos que ahora vienen de la API', () => {
    const { status, location } = run(
      `/organizer/events/${EVENT}/quotes/new?vendorSlug=flores-de-la-sabana&vendorName=X&eventTitle=Y&serviceCategoryId=z`,
    );
    expect(status).toBe(308);
    expect(location?.search).toBe('?vendor=flores-de-la-sabana');
  });

  it('URLs ya al día y rutas sin reglas no se redirigen', () => {
    expect(run('/vendors?category=venue').status).not.toBe(308);
    expect(run('/vendors').status).not.toBe(308);
    expect(run('/login?categoryCode=x').status).not.toBe(308);
  });
});
