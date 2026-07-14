// US-031 (PB-P1-017 / BE-005) — Controller thin del bulk confirm HITL.
// La composición de la ruta (auth → role → validation → handler) vive en `bulk-confirm.routes.ts`.
// Este controller delega íntegramente al `ConfirmAITasksBulkUseCase` y envuelve la respuesta con
// el helper de éxito estándar `{ data, meta }`.
import type { Request, Response } from 'express';
import { success } from '../../../../../shared/response/success.js';
import type { ConfirmAITasksBulkUseCase } from '../../application/confirm-ai-tasks-bulk.use-case.js';
import type {
  ConfirmAITasksBulkBody,
  ConfirmAITasksBulkParams,
} from './confirm-bulk.schema.js';

export class ConfirmAITasksBulkController {
  constructor(private readonly useCase: ConfirmAITasksBulkUseCase) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    const validated = req.validated as {
      params: ConfirmAITasksBulkParams;
      body: ConfirmAITasksBulkBody;
    };
    const actor = req.user!; // el sessionAuth garantiza `req.user` — organizer-only por role guard.
    const result = await this.useCase.execute({
      actor: { id: actor.id, role: actor.role },
      eventId: validated.params.eventId,
      taskIds: validated.body.taskIds,
      correlationId: req.correlationId,
    });
    res.status(200).json(success(result, req.correlationId ?? ''));
  };
}
