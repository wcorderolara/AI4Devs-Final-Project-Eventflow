// Param DTO — `:eventId` de ruta (US-095 / BE-001). Valida UUID antes de tocar la BD.
import { z } from 'zod';
import { EventIdParamSchema } from '../../../shared/validation/uuid-params.js';

export { EventIdParamSchema };

export type EventIdParam = z.infer<typeof EventIdParamSchema>;
