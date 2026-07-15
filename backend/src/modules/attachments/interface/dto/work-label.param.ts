// DTO Zod del path param `:workLabel` (US-043 / PB-P1-026 / BE-007). D5 / VR-05.
// La comparación entre grupos es case-insensitive (LOWER); la persistencia preserva el display.
import { z } from 'zod';
import { WORK_LABEL_REGEX } from '../../domain/constants.js';

export const WorkLabelParamSchema = z
  .object({
    workLabel: z
      .string()
      .min(1)
      .max(80)
      .regex(WORK_LABEL_REGEX, 'INVALID_WORK_LABEL'),
  })
  .strict();

export type WorkLabelParam = z.infer<typeof WorkLabelParamSchema>;
