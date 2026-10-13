// Listado admin de usuarios (`GET /api/v1/admin/users`). Lectura pura, cursor keyset por
// createdAt+id (desc). Guards: sessionAuth + roleMiddleware(['admin']). Filtros opcionales:
// role, status, q (email/name contains). Sin AdminAction (lectura).
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { PrismaClient, type Prisma } from '@prisma/client';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { requireSession, requireRole } from '../../../infrastructure/auth-composition.js';
import { success } from '../../../shared/response/index.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import { encodeCursor, tryDecodeCursor } from '../../../shared/pagination/cursor.js';

const prisma = new PrismaClient();

const QuerySchema = z.object({
  role: z.enum(['organizer', 'vendor', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Cursor `{ createdAt, id }`; uno inválido se ignora (primera página), no es 400.
const CursorSchema = z.object({ createdAt: z.string(), id: z.string() });

export const adminUsersRouter = Router();
adminUsersRouter.use(requireSession, requireRole('admin'));

adminUsersRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = QuerySchema.parse(req.query);
    const cursor = tryDecodeCursor(parsed.cursor, CursorSchema);

    const where: Prisma.UserWhereInput = {};
    if (parsed.role) where.role = parsed.role;
    if (parsed.status) where.status = parsed.status;
    if (parsed.q) {
      where.OR = [
        { email: { contains: parsed.q, mode: 'insensitive' } },
        { fullName: { contains: parsed.q, mode: 'insensitive' } },
      ];
    }
    if (cursor) {
      where.OR = [
        ...(where.OR ?? []),
        { createdAt: { lt: new Date(cursor.createdAt) } },
        { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
      ];
    }

    const items = await prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: parsed.limit + 1,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        phone: true,
        preferredLanguage: true,
        isSeed: true,
        createdAt: true,
      },
    });

    const hasMore = items.length > parsed.limit;
    const page = hasMore ? items.slice(0, parsed.limit) : items;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null;

    logger.info({
      event: 'admin.users.viewed',
      actorUserId: req.user?.id,
      correlationId: req.correlationId ?? null,
      count: page.length,
      filters: { role: parsed.role, status: parsed.status, q: parsed.q ? '[redacted]' : undefined },
    });

    res.status(200).json(
      success(
        {
          items: page.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.fullName,
            role: u.role,
            status: u.status,
            phone: u.phone,
            preferredLanguage: u.preferredLanguage,
            isSeed: u.isSeed,
            createdAt: u.createdAt.toISOString(),
          })),
          pagination: { nextCursor, pageSize: page.length },
        },
        req.correlationId ?? '',
      ),
    );
  }),
);
