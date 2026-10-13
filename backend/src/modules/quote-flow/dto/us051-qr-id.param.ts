// US-051 (PB-P1-031 / BE-001): DTO Zod del path param `{ id: uuid }` para las rutas
// vendor-scoped. Vive en `dto/` para poder ser importado por el registry OpenAPI sin arrastrar
// dependencias de infra (session auth, prisma, etc.).
import { z } from 'zod';
import { uuidParamsSchema } from '../../../shared/validation/uuid-params.js';

export const us051QrIdParamSchema = uuidParamsSchema('id');
export type Us051QrIdParam = z.infer<typeof us051QrIdParamSchema>;
