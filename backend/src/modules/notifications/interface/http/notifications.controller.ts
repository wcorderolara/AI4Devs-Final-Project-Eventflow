// US-071 (PB-P2-004 / BE-005). Controller delgado del surface de notificaciones.
// Composición de la ruta (auth → validation → handler) vive en `notifications.routes.ts`.
//
// Contrato del envelope: `success(data, correlationId, pagination)` estándar
// (`docs/16 §Success envelope`). `data` incluye `items` + `unreadCount`; la meta
// `pagination` reporta `page/pageSize/total/totalPages`.
//
// US-072 (PB-P2-008 / BE-005): agrega `markAsRead` (PATCH single) y
// `markAllAsRead` (POST bulk). Ambos responden `204 No Content` sin envelope
// (D5). Zod aplica default `channel='in_app'` (D4). `NotFoundError` sube al
// error-handler global que emite `404 RESOURCE_NOT_FOUND` uniforme (AC-04/AC-05
// política de no-revelación docs/19).
import type { Request, Response } from 'express';
import { success, type PaginationMeta } from '../../../../shared/response/index.js';
import { UnauthorizedError } from '../../../../shared/domain/errors/unauthorized.error.js';
import type { ListMyNotificationsUseCase } from '../../application/list-my-notifications.use-case.js';
import type { MarkNotificationAsReadUseCase } from '../../application/mark-notification-as-read.use-case.js';
import type { MarkAllNotificationsAsReadUseCase } from '../../application/mark-all-notifications-as-read.use-case.js';
import { listNotificationsQuerySchema } from './list-notifications.query.schema.js';
import type {
  MarkAllReadQuery,
  NotificationIdParam,
} from './mark-notifications.schemas.js';

export interface NotificationsControllerDeps {
  list: ListMyNotificationsUseCase;
  markAsRead: MarkNotificationAsReadUseCase;
  markAllAsRead: MarkAllNotificationsAsReadUseCase;
}

export class NotificationsController {
  private readonly listUseCase: ListMyNotificationsUseCase;
  private readonly markAsReadUseCase: MarkNotificationAsReadUseCase;
  private readonly markAllAsReadUseCase: MarkAllNotificationsAsReadUseCase;

  constructor(deps: NotificationsControllerDeps) {
    this.listUseCase = deps.list;
    this.markAsReadUseCase = deps.markAsRead;
    this.markAllAsReadUseCase = deps.markAllAsRead;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();

    // Zod aplica defaults `page=1`, `pageSize=10`, `status='all'`, `channel='in_app'`.
    // Errores → 400 vía ValidationError (mapeado por error handler global).
    const query = listNotificationsQuerySchema.parse(req.query);

    const result = await this.listUseCase.execute({
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

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();
    // `validateRequestMiddleware` pobló `req.validated.params` con el schema
    // aplicado — Zod se corre en el pipeline de middleware para que fallos
    // devuelvan 400 uniforme.
    const { notificationId } = req.validated?.params as NotificationIdParam;
    await this.markAsReadUseCase.execute({
      notificationId,
      actorUserId: actor.id,
    });
    res.status(204).end();
  };

  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();
    const { channel } = req.validated?.query as MarkAllReadQuery;
    await this.markAllAsReadUseCase.execute({
      actorUserId: actor.id,
      channel,
      correlationId: req.correlationId,
    });
    res.status(204).end();
  };
}
