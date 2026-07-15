// EMERGENT (US-040): endpoint de lectura del catálogo `ServiceCategory` activo.
// El wizard `LocationCategoriesStep` (FE-004) necesita listar las categorías activas para el
// multi-select cap 1-3 (D2). El catálogo es curado por admin (BR-SERVICE-003) y de baja
// sensibilidad, por lo que solo requiere sesión válida (cualquier rol autenticado).
import { Router, type Request, type Response } from 'express';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { success } from '../../../shared/response/index.js';

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });

export const serviceCategoriesRouter = Router();

serviceCategoriesRouter.get(
  '/',
  sessionAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await prisma.serviceCategory.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, code: true, label: true },
      orderBy: { label: 'asc' },
    });
    res.status(200).json(success(rows, req.correlationId ?? ''));
  }),
);
