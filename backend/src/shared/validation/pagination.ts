// Query de paginación compartida (US-096 / BE-001). page/pageSize acotados; strict aparte.
import { z } from 'zod';

export const paginationQueryShape = {
  page: z.coerce.number().int().positive().max(10000).optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
};

export interface PaginationInput {
  page: number;
  pageSize: number;
}
