import { http, HttpResponse } from 'msw';

export const healthHandlers = [
  http.get('*/api/v1/health', () => HttpResponse.json({ status: 'ok' })),
];
