import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './src/tests/msw/server';

// MSW server para toda la suite (Doc 20 / US-106). `onUnhandledRequest: 'error'` evita fugas de red;
// cada test registra sus handlers con `server.use(...)` cuando necesita un caso específico.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
