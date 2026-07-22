// Dashboards por rol (`GET /organizer/metrics`, `GET /vendor/metrics`). Cada endpoint es un
// agregado sólo-lectura scoped al actor autenticado (organizer.userId / vendorProfile.userId).
// El admin ya tiene su propio dashboard global (`/admin/metrics`); estos son análogos para los
// otros dos roles del MVP. Sin cache (los KPIs son personales; el cost es bajo con índices).
import { Router, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';

const prisma = new PrismaClient();

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);
const vendorOnly = roleMiddleware(['vendor']);

/** Rango temporal: inicio de esta semana (lunes 00:00 UTC) hasta el domingo 23:59:59 UTC. */
function currentWeekRange(now: Date): { start: Date; end: Date } {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const daysFromMonday = (day + 6) % 7;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - daysFromMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

// ── /api/v1/organizer/metrics ────────────────────────────────────────────────

export const organizerMetricsRouter = Router();
organizerMetricsRouter.use(sessionAuth, organizerOnly);

organizerMetricsRouter.get(
  '/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();
    const now = new Date();
    const { start: weekStart, end: weekEnd } = currentWeekRange(now);

    const [
      totalEvents,
      eventsByStatus,
      eventsThisWeek,
      pendingTasks,
      quoteRequestsSent,
      quotesReceived,
      quotesAccepted,
      confirmedBookings,
      reviewsWritten,
      unreadNotifications,
    ] = await Promise.all([
      prisma.event.count({ where: { userId } }),
      prisma.event.groupBy({ by: ['status'], where: { userId }, _count: true }),
      prisma.event.count({
        where: { userId, eventDate: { gte: weekStart, lte: weekEnd } },
      }),
      prisma.eventTask.count({
        where: { event: { userId }, status: { in: ['pending', 'in_progress'] } },
      }),
      prisma.quoteRequest.count({
        where: { event: { userId } },
      }),
      prisma.quote.count({
        where: { quoteRequest: { event: { userId } }, status: 'sent' },
      }),
      prisma.quote.count({
        where: { quoteRequest: { event: { userId } }, status: 'accepted' },
      }),
      prisma.bookingIntent.count({
        where: { createdBy: userId, status: 'confirmed_intent' },
      }),
      prisma.review.count({ where: { authorId: userId } }),
      prisma.notification.count({ where: { userId, status: 'unread' } }),
    ]);

    const byStatus: Record<string, number> = { draft: 0, active: 0, completed: 0, cancelled: 0 };
    for (const g of eventsByStatus) byStatus[g.status] = g._count;

    logger.info({
      event: 'organizer.metrics.viewed',
      actorUserId: userId,
      correlationId: req.correlationId ?? null,
    });

    res.setHeader('Cache-Control', 'private, max-age=30');
    res.status(200).json(
      success(
        {
          events: {
            total: totalEvents,
            byStatus,
            thisWeek: eventsThisWeek,
          },
          tasks: { pending: pendingTasks },
          quotes: {
            requestsSent: quoteRequestsSent,
            received: quotesReceived,
            accepted: quotesAccepted,
          },
          bookings: { confirmed: confirmedBookings },
          reviews: { written: reviewsWritten },
          notifications: { unread: unreadNotifications },
          weekRange: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
          generatedAt: now.toISOString(),
        },
        req.correlationId ?? '',
      ),
    );
  }),
);

// ── /api/v1/vendor/metrics ───────────────────────────────────────────────────

export const vendorMetricsRouter = Router();
vendorMetricsRouter.use(sessionAuth, vendorOnly);

vendorMetricsRouter.get(
  '/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        ratingAvg: true,
        reviewsCount: true,
        businessName: true,
      },
    });

    // Sin VendorProfile el vendor aún no completó onboarding: devolvemos zeros + flag.
    if (!vendor) {
      res.status(200).json(
        success(
          {
            hasProfile: false,
            profile: null,
            quotes: { newRequests: 0, awaitingResponse: 0, respondedAwaitingDecision: 0 },
            bookings: { thisWeek: 0, totalCompleted: 0 },
            reviews: { total: 0, ratingAvg: null, published: 0, hidden: 0, removed: 0 },
            notifications: { unread: 0 },
            generatedAt: new Date().toISOString(),
          },
          req.correlationId ?? '',
        ),
      );
      return;
    }

    const vendorProfileId = vendor.id;
    const now = new Date();
    const { start: weekStart, end: weekEnd } = currentWeekRange(now);

    const [
      newRequests,
      awaitingResponse,
      respondedAwaitingDecision,
      confirmedThisWeek,
      totalCompleted,
      reviewsByStatus,
      unreadNotifications,
    ] = await Promise.all([
      // Solicitudes que aún no ha visto (status=sent y viewedAt=null).
      prisma.quoteRequest.count({
        where: { vendorProfileId, status: 'sent', viewedAt: null },
      }),
      // Solicitudes en las que aún no ha respondido (sent/viewed sin quote creado).
      prisma.quoteRequest.count({
        where: {
          vendorProfileId,
          status: { in: ['sent', 'viewed'] },
        },
      }),
      // Quotes enviados/editados a la espera de decisión del organizer.
      prisma.quote.count({
        where: { vendorProfileId, status: 'sent' },
      }),
      // Bookings confirmados cuyo evento cae esta semana.
      prisma.bookingIntent.count({
        where: {
          vendorProfileId,
          status: 'confirmed_intent',
          event: { eventDate: { gte: weekStart, lte: weekEnd } },
        },
      }),
      // Bookings confirmados con evento ya completado (histórico).
      prisma.bookingIntent.count({
        where: {
          vendorProfileId,
          status: 'confirmed_intent',
          event: { status: 'completed' },
        },
      }),
      prisma.review.groupBy({ by: ['status'], where: { vendorProfileId }, _count: true }),
      prisma.notification.count({ where: { userId, status: 'unread' } }),
    ]);

    const reviewsStatus = { published: 0, hidden: 0, removed: 0 };
    for (const g of reviewsByStatus) {
      if (g.status === 'published') reviewsStatus.published = g._count;
      else if (g.status === 'hidden') reviewsStatus.hidden = g._count;
      else if (g.status === 'removed') reviewsStatus.removed = g._count;
    }
    const reviewsTotal = reviewsStatus.published + reviewsStatus.hidden + reviewsStatus.removed;

    logger.info({
      event: 'vendor.metrics.viewed',
      actorUserId: userId,
      vendorProfileId,
      correlationId: req.correlationId ?? null,
    });

    res.setHeader('Cache-Control', 'private, max-age=30');
    res.status(200).json(
      success(
        {
          hasProfile: true,
          profile: {
            id: vendor.id,
            businessName: vendor.businessName,
            status: vendor.status,
            ratingAvg: vendor.ratingAvg !== null ? Number(vendor.ratingAvg) : null,
            reviewsCount: vendor.reviewsCount,
          },
          quotes: {
            newRequests,
            awaitingResponse,
            respondedAwaitingDecision,
          },
          bookings: {
            thisWeek: confirmedThisWeek,
            totalCompleted,
          },
          reviews: {
            total: reviewsTotal,
            ratingAvg: vendor.ratingAvg !== null ? Number(vendor.ratingAvg) : null,
            published: reviewsStatus.published,
            hidden: reviewsStatus.hidden,
            removed: reviewsStatus.removed,
          },
          notifications: { unread: unreadNotifications },
          weekRange: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
          generatedAt: now.toISOString(),
        },
        req.correlationId ?? '',
      ),
    );
  }),
);
