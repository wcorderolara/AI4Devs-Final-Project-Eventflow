// Express factory (US-089 / BE-003; pipeline real US-091 / BE-004).
// Exporta `app` SIN llamar `listen` (obligatorio per Doc 14 §8.1): permite que Supertest
// importe la app sin abrir un puerto. El bootstrap del proceso (`listen`, `$connect`) vive en
// `server.ts`. Los middlewares globales se registran en el orden EXACTO de Doc 14 §8.2 (AC-08).
import express, { type Request, type Response, type Express, Router } from 'express';
import { config } from './config/env.js';
import { correlationIdMiddleware } from './shared/interface/middlewares/correlation-id.middleware.js';
import { requestLoggerMiddleware } from './shared/interface/middlewares/request-logger.middleware.js';
import { jsonBodyParserMiddleware } from './shared/interface/middlewares/json-body-parser.middleware.js';
import { corsMiddleware } from './shared/interface/middlewares/cors.middleware.js';
import { helmetMiddleware } from './shared/interface/middlewares/helmet.middleware.js';
import { rateLimitMiddleware } from './shared/interface/middlewares/rate-limit.middleware.js';
import { notFoundMiddleware } from './shared/interface/middlewares/not-found.middleware.js';
import { errorHandlerMiddleware } from './shared/interface/middlewares/error-handler.middleware.js';

/** Construye y configura la aplicación Express. */
export function createApp(): Express {
  const app = express();

  // ── Middlewares globales — orden Doc 14 §8.2 (AC-08) ──────────────────────
  app.use(correlationIdMiddleware); // 1. correlación (primero: base de observabilidad)
  app.use(requestLoggerMiddleware); // 2. logging (necesita el correlationId)
  app.use(jsonBodyParserMiddleware); // 3. body JSON con límite
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

  // 7. Router de API versionada. Vacío en esta US; las rutas se agregan en feature stories.
  const apiV1 = Router();
  app.use('/api/v1', apiV1);

  app.use(notFoundMiddleware); // 8. penúltimo: 404 catch-all
  app.use(errorHandlerMiddleware); // 9. último: error envelope (4 args)

  return app;
}

const app = createApp();

export default app;
