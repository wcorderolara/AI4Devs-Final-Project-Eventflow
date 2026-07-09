// Request DTO base para endpoints de generación AI (US-097 / BE-001). VR-02/VR-03.
// `input` requerido (objeto); `languageCode` validado en use case (para UNSUPPORTED_LANGUAGE 422);
// `preferMock` honrado solo en demo/testing (VR-04). Prohíbe texto de prompt arbitrario (VR-09).
import { z } from 'zod';

export const AiBaseRequestSchema = z
  .object({
    input: z.record(z.unknown()),
    languageCode: z.string().optional(),
    preferMock: z.boolean().optional(),
  })
  .strict();

export type AiBaseRequest = z.infer<typeof AiBaseRequestSchema>;
