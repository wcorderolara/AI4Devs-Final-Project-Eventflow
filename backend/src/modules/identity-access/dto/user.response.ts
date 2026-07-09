// Response DTO — Usuario (US-092 / BE-003). AC-03; VR-05.
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';

export const UserResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['organizer', 'vendor', 'admin']),
    language: z.enum(SUPPORTED_LANGUAGES),
    createdAt: z.string().datetime(),
  })
  .strict();

export type UserResponse = z.infer<typeof UserResponseSchema>;
