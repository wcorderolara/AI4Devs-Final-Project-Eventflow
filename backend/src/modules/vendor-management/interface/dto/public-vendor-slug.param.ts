// Path param DTO — perfil público SEO del vendor (US-046 / BE-001, §7 Tech Spec).
// Regex `^[a-z0-9\-]+$`, longitud [1..200] (D6/EC-03). Es el mismo alfabeto usado por el
// slug auto-generado en US-040 (`vendor_profiles.slug`). `.strict()` es intrínseco al schema
// de path porque express expone `req.params` con las claves de la ruta únicamente.
import { z } from 'zod';

const SLUG_RE = /^[a-z0-9-]+$/;

export const PublicVendorSlugParamSchema = z
  .object({
    slug: z.string().min(1).max(200).regex(SLUG_RE, 'slug must match ^[a-z0-9-]+$'),
  })
  .strict();

export type PublicVendorSlugParam = z.infer<typeof PublicVendorSlugParamSchema>;
