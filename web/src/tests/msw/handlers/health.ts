import { http, HttpResponse } from 'msw';

// US-116 · docs/16 §21.3: `/health` y `/health/ready` son la excepción explícita
// al envelope `{ data, meta }` — devuelven un DTO plano (ADR-API-004). El shape
// debe reflejarse en el handler para no "mentir" respecto al backend real
// (US-127 · AC-01 · VR-02).
export const healthResponseFixture = {
  status: 'ok' as const,
  version: 'msw-test',
  uptimeMs: 0,
  timestamp: '2026-07-23T00:00:00.000Z',
};

export const readinessResponseFixture = {
  ...healthResponseFixture,
  dependencies: {
    postgres: 'ok' as const,
    aiProvider: 'mock' as const,
  },
};

export const healthHandlers = [
  http.get('*/api/v1/health', () => HttpResponse.json(healthResponseFixture)),
  http.get('*/api/v1/health/ready', () => HttpResponse.json(readinessResponseFixture)),
];
