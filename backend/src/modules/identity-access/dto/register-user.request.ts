// Request DTO — Registro de usuario público (US-094 / BE-001; política US-001 / BE-003;
// discriminated union US-002 / BE-001). VR-01..VR-06 de ambas historias. Registro público SOLO
// crea `organizer|vendor` (SEC-02/SEC-06): el discriminador excluye `admin` — un intento de
// `role='admin'` se rechaza con VALIDATION_ERROR y jamás se persiste (Deviation D2).
// Variant organizer: `name` (2..120). Variant vendor: `businessName` (2..150, camelCase por
// Doc 16 §9 — se persiste en `users.name` hasta que US-040 diferencie contacto/comercial).
// Copia disciplinada en `web/src/features/auth/schemas/` (sin paquete compartido en MVP).
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import { passwordSchema, passwordEqualsEmailLocalpart } from '../../../shared/validation/password.js';

const registerCommonFields = {
  email: z.string().email().max(254).toLowerCase(),
  password: passwordSchema,
  phone: z.string().min(1).max(30).optional(),
  // VR-04: aceptación obligatoria de términos y privacidad (solo `true` es válido).
  acceptedTerms: z.literal(true),
  preferredLanguage: z.enum(SUPPORTED_LANGUAGES).optional(),
  captchaToken: z.string().min(1),
};

export const RegisterOrganizerRequestSchema = z
  .object({
    role: z.literal('organizer'),
    // VR-03 (US-001): nombre completo obligatorio, 2-120 caracteres.
    name: z.string().trim().min(2).max(120),
    ...registerCommonFields,
  })
  .strict();

export const RegisterVendorRequestSchema = z
  .object({
    role: z.literal('vendor'),
    // VR-03 (US-002): nombre comercial obligatorio, 2-150 caracteres.
    businessName: z.string().trim().min(2).max(150),
    ...registerCommonFields,
  })
  .strict();

export const RegisterUserRequestSchema = z
  .discriminatedUnion('role', [RegisterOrganizerRequestSchema, RegisterVendorRequestSchema])
  // VR-02 (cross-field, Doc 19 §11.2): la contraseña debe ser distinta del localpart del email.
  .superRefine((data, ctx) => {
    if (passwordEqualsEmailLocalpart(data.password, data.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'La contraseña no puede ser igual a la parte local del email',
      });
    }
  });

export type RegisterUserRequest = z.infer<typeof RegisterUserRequestSchema>;
