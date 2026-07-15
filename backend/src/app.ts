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
import { bulkConfirmRouter } from './modules/task-management/bulk-confirm/interface/http/bulk-confirm.routes.js';
import { eventTasksListRouter } from './modules/task-management/list/interface/http/list-event-tasks.routes.js';
import { eventTasksCreateRouter } from './modules/task-management/create/interface/http/create-event-task.routes.js';
import { eventTasksMutateRouter } from './modules/task-management/mutate/interface/http/mutate-event-task.routes.js';
import { seedDemoRouter, isSeedDemoEnabled } from './modules/seed-demo/interface/seed-demo.routes.js';
import { adminEventsRouter } from './modules/admin-governance/interface/admin-events.routes.js';
import { budgetRouter, budgetItemMutationRouter } from './modules/budget-management/interface/index.js';
import {
  vendorProfileRouter,
  serviceCategoriesRouter,
  vendorServiceRouter,
} from './modules/vendor-management/interface/index.js';
import { portfolioRouter } from './modules/attachments/interface/index.js';

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
  // US-031 (PB-P1-017): bulk confirm HITL a nivel `/api/v1` y ANTES de event-planning
  // (por `/events/:eventId/tasks/confirm-bulk`). No invoca al LLM.
  apiV1.use(bulkConfirmRouter);
  // US-027 (PB-P1-018): listado paginado del checklist a nivel `/api/v1` y ANTES de
  // event-planning (por `/events/:eventId/tasks`). Endpoint de lectura pura.
  apiV1.use(eventTasksListRouter);
  // US-028 (PB-P1-018): creación manual de EventTask (`POST /events/:eventId/tasks`). Se monta
  // ANTES de `eventPlanningRouter` por el mismo motivo que US-027 — captura antes que catch-alls
  // de `/events/*`. No invoca al LLM (BR-AI-008: `ai_generated=false` server-controlled).
  apiV1.use(eventTasksCreateRouter);
  // US-029 (PB-P1-018): mutaciones sobre EventTask individual (PATCH content, PATCH status,
  // DELETE soft) bajo `/events/:eventId/tasks/:taskId(...)`. Se monta ANTES de eventPlanning
  // por el mismo motivo que US-027/028. No invoca al LLM.
  apiV1.use(eventTasksMutateRouter);
  // US-035 (PB-P1-020, R1): vista del presupuesto (`GET /events/:eventId/budget`). Se monta
  // ANTES de `eventPlanningRouter` por el mismo motivo — captura `/events/:eventId/budget`
  // sin colisionar con catch-alls de `/events/*`. Lectura pura; no invoca mutaciones.
  apiV1.use(budgetRouter);
  // US-036 (PB-P1-020, R1): mutaciones sobre BudgetItem (`POST/PATCH/DELETE
  // /events/:eventId/budget/items[/:itemId]`). Se monta ANTES de `eventPlanningRouter` por el
  // mismo motivo. Cada mutación se envuelve en `prisma.$transaction` para recomputar totales
  // materializados de `Budget` (BLK-E, compromiso R1 US-035). Hard delete (schema `BudgetItem`
  // no declara `deletedAt`); auditoría vía log estructurado `budget.item.deleted`.
  apiV1.use(budgetItemMutationRouter);
  apiV1.use('/booking-intents', bookingIntentRouter);
  // US-040 (PB-P1-024): creación del VendorProfile por el propio vendor. Contrato
  // `POST /api/v1/vendors/me` (Doc 16 §M07). Solo rol `vendor` (organizer/admin → 403; sin
  // sesión → 401). El endpoint público del directorio de vendors vive en US futura.
  // US-044 (PB-P1-027): CRUD del catálogo `VendorService` del vendor. Contrato
  // `GET/POST/PATCH/DELETE /api/v1/vendors/me/services[/:id]` (Doc 16 §M07). Sólo rol `vendor`
  // (organizer/admin → 403; sin sesión → 401). Se monta ANTES de `/vendors` (vendorProfileRouter
  // captura `/vendors/me`) para que `/vendors/me/services*` tenga match específico primero.
  apiV1.use('/vendors/me/services', vendorServiceRouter);
  apiV1.use('/vendors', vendorProfileRouter);
  // US-043 (PB-P1-026): upload de imágenes del portafolio del vendor. Contrato
  // `POST /api/v1/vendors/me/portfolio/works/:workLabel/images` (Doc 16 §M07). Sólo rol
  // `vendor` (organizer/admin → 403; sin sesión → 401). Se monta DESPUÉS de
  // `vendorProfileRouter` porque comparte el prefijo `/vendors/me` — Express recorre routers en
  // orden y este es específico al sub-path `/me/portfolio`.
  apiV1.use('/vendors/me/portfolio', portfolioRouter);
  // US-040 (EMERGENT): catálogo de ServiceCategory activas, requerido por el wizard vendor
  // (FE-004). Curado por admin (BR-SERVICE-003); solo requiere sesión válida.
  apiV1.use('/service-categories', serviceCategoriesRouter);
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
