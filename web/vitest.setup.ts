import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/tests/msw/server';

// jsdom no implementa ResizeObserver y Headless UI (Menu) lo requiere al interactuar
// (US-005: test del logout en UserMenu). Stub no-op estándar, solo si falta en el entorno.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// MSW server para toda la suite (Doc 20 / US-106). `onUnhandledRequest: 'error'` evita fugas de red;
// cada test registra sus handlers con `server.use(...)` cuando necesita un caso específico.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
