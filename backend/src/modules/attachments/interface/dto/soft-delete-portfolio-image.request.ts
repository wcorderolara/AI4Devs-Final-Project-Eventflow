// DTOs — soft delete portfolio image (US-048 / PB-P1-026 / BE-001). D2 / EC-05.
// El body es opcional; cuando viene, `deletion_reason` debe ser 1..500 chars y `.strict()`
// rechaza extras. El path param se valida como UUID por `imageIdParam` (VR-01).
import { z } from 'zod';

export const ImageIdParamSchema = z.object({ imageId: z.string().uuid() });
export type ImageIdParam = z.infer<typeof ImageIdParamSchema>;

export const SoftDeletePortfolioImageBodySchema = z
  .object({
    deletion_reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export type SoftDeletePortfolioImageBody = z.infer<typeof SoftDeletePortfolioImageBodySchema>;
