// US-071 (PB-P2-004 / BE-005). Controller delgado del surface de notificaciones.
// Composición de la ruta (auth → validation → handler) vive en `notifications.routes.ts`.
//
// Contrato del envelope: `success(data, correlationId, pagination)` estándar
// (`docs/16 §Success envelope`). `data` incluye `items` + `unreadCount`; la meta
// `pagination` reporta `page/pageSize/total/totalPages`.
import type { Request, Response } from 'express';
import { success, type PaginationMeta } from '../../../../shared/response/index.js';
import { UnauthorizedError } from '../../../../shared/domain/errors/unauthorized.error.js';
import type { ListMyNotificationsUseCase } from '../../application/list-my-notifications.use-case.js';
import { listNotificationsQuerySchema } from './list-notifications.query.schema.js';

export class NotificationsController {
  constructor(private readonly useCase: ListMyNotificationsUseCase) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();

    // Zod aplica defaults `page=1`, `pageSize=10`, `status='all'`, `channel='in_app'`.
    // Errores → 400 vía ValidationError (mapeado por error handler global).
    const query = listNotificationsQuerySchema.parse(req.query);

    const result = await this.useCase.execute({
      userId: actor.id,
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      channel: query.channel,
    });

    const paginationMeta: PaginationMeta = {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / result.pageSize),
    };

    res
      .status(200)
      .json(
        success(
          { items: result.items, unreadCount: result.unreadCount },
          req.correlationId ?? '',
          paginationMeta,
        ),
      );
  };
}
