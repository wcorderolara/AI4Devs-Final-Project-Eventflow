// Express factory (US-089 / BE-003; pipeline real US-091 / BE-004).
// Exporta `app` SIN llamar `listen` (obligatorio per Doc 14 §8.1): permite que Supertest
// importe la app sin abrir un puerto. El bootstrap del proceso (`listen`, `$connect`) vive en
// `server.ts`. Los middlewares globales se registran en el orden EXACTO de Doc 14 §8.2 (AC-08).
import express, { type Request, type Response, type Express, Router } from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { correlationIdMiddleware } from './shared/interface/middlewares/correlation-id.middleware.js';
import { requestLoggerMiddleware } from './shared/interface/middlewares/request-logger.middleware.js';
import { jsonBodyParserMiddleware } from './shared/interface/middlewares/json-body-parser.middleware.js';
import { corsMiddleware } from './shared/interface/middlewares/cors.middleware.js';
import { helmetMiddleware } from './shared/interface/middlewares/helmet.middleware.js';
import { rateLimitMiddleware } from './shared/interface/middlewares/rate-limit.middleware.js';
import { notFoundMiddleware } from './shared/interface/middlewares/not-found.middleware.js';
import { errorHandlerMiddleware } from './shared/interface/middlewares/error-handler.middleware.js';
import { identityAccessRouter } from './modules/identity-access/interface/identity-access.routes.js';
import { userProfileRouter } from './modules/user-profile/interface/user-profile.routes.js';
import { eventPlanningRouter } from './modules/event-planning/interface/events.routes.js';
import {
  eventTypesRouter,
  locationsRouter,
} from './modules/event-planning/interface/catalog.routes.js';
import { quoteFlowRouter } from './modules/quote-flow/interface/quote-flow.routes.js';
import { bookingIntentRouter } from './modules/booking-intent/interface/booking-intent.routes.js';
import { aiAssistanceRouter } from './modules/ai-assistance/interface/ai.routes.js';
import { seedDemoRouter, isSeedDemoEnabled } from './modules/seed-demo/interface/seed-demo.routes.js';
import { adminEventsRouter } from './modules/admin-governance/interface/admin-events.routes.js';

/** Construye y configura la aplicación Express. */
export function createApp(): Express {
  const app = express();

  // ── Middlewares globales — orden Doc 14 §8.2 (AC-08) ──────────────────────
  app.use(correlationIdMiddleware); // 1. correlación (primero: base de observabilidad)
  app.use(requestLoggerMiddleware); // 2. logging (necesita el correlationId)
  app.use(jsonBodyParserMiddleware); // 3. body JSON con límite
  // 3b. cookie-parser firmado con SESSION_SECRET (US-094 / SEC-001, ADR-SEC-002): habilita
  // `req.signedCookies` para la auth por cookie de sesión HTTP-only.
  app.use(cookieParser(config.SESSION_SECRET));
  app.use(corsMiddleware); // 4. CORS (antes de auth para preflight)
  if (config.HELMET_ENABLED) {
    app.use(helmetMiddleware); // 5. security headers (toggle HELMET_ENABLED, default true)
  }
  app.use(rateLimitMiddleware); // 6. rate limit global laxo

  // Health check público, no versionado (Doc 16 §180), sin auth. Después de correlación para
  // que la respuesta incluya `x-correlation-id`. Response shape per Doc 16 §192.
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      version: process.env.npm_package_version ?? '0.0.0',
      uptimeMs: Math.floor(process.uptime() * 1000),
    });
  });

  // 7. Router de API versionada. Las rutas se agregan por feature story.
  const apiV1 = Router();
  // US-094 / API-001: contrato AUTH y perfil propio bajo `/api/v1`.
  apiV1.use('/auth', identityAccessRouter);
  apiV1.use('/users', userProfileRouter);
  // US-096: quote-flow se monta a nivel de `/api/v1` y ANTES de event-planning para capturar
  // `/events/:eventId/quote-requests` (los demás `/events/*` caen a event-planning).
  apiV1.use(quoteFlowRouter);
  // US-097: ai-assistance también a nivel `/api/v1` y ANTES de event-planning (por `/events/:id/ai/*`).
  apiV1.use(aiAssistanceRouter);
  apiV1.use('/booking-intents', bookingIntentRouter);
  apiV1.use('/events', eventPlanningRouter); // US-095 / API-001
  apiV1.use('/event-types', eventTypesRouter); // US-009 / catálogo
  apiV1.use('/locations', locationsRouter); // US-009 / catálogo
  // US-086 (PB-P0-014): reset surgical Demo. La ruta `/admin/seed/*` SOLO se monta cuando
  // `SEED_DEMO_ENABLED=true`; con el flag apagado no existe (404 natural, THR-012 / EC-01).
  if (isSeedDemoEnabled()) {
    apiV1.use('/admin/seed', seedDemoRouter);
  }
  // US-016 (PB-P1-010): lectura admin de eventos con auditoría (`GET /admin/events/:id`).
  // Bloquea explícitamente PATCH/DELETE/POST sobre el mismo recurso con `403 FORBIDDEN_WRITE`.
  apiV1.use('/admin/events', adminEventsRouter);
  app.use('/api/v1', apiV1);

  app.use(notFoundMiddleware); // 8. penúltimo: 404 catch-all
  app.use(errorHandlerMiddleware); // 9. último: error envelope (4 args)

  return app;
}

const app = createApp();

export default app;
