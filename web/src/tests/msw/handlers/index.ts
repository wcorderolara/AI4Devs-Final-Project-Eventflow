import { http, HttpResponse } from 'msw';
import { aiHandlers } from './ai';
import { authHandlers } from './auth';
import { eventsHandlers } from './events';
import { healthHandlers } from './health';
import { profileHandlers } from './profile';
import { tasksHandlers } from './tasks';

// Catch-all: cualquier `/api/v1/*` sin handler dedicado → 501 visible (falla ruidosamente).
// DEBE ir al final del array; cada feature agrega su handler ANTES de este.
const catchAllHandlers = [
  http.all('*/api/v1/*', () => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('MSW: unhandled /api/v1 request → 501 NOT_MOCKED');
    }
    return HttpResponse.json(
      { error: { code: 'NOT_MOCKED', message: 'No MSW handler for this request' } },
      { status: 501 },
    );
  }),
];

export const handlers = [
  ...profileHandlers,
  ...eventsHandlers,
  ...tasksHandlers,
  ...aiHandlers,
  ...authHandlers,
  ...healthHandlers,
  ...catchAllHandlers,
];
