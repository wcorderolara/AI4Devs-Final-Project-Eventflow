// Request DTO — Crear Review verificada (US-065 / BE-001). Tech Spec §7 DTOs.
//
// Contrato del body para `POST /api/v1/organizer/reviews`:
//
//   {
//     "event_id":          "<uuid>",
//     "vendor_profile_id": "<uuid>",
//     "rating":            <int 1..5>,
//     "comment":           "<string 0..2000>"   // opcional
//   }
//
// - `event_id` / `vendor_profile_id` (snake_case, contrato del endpoint) validados como UUID.
// - `rating` DEBE ser entero en [1..5] (D8, EC-04, VR-01). Fuera de rango o decimal ⇒
//   `400 VALIDATION_ERROR`.
// - `comment` opcional, longitud [0..2000] (D1, EC-05, VR-02). Ausente o cadena vacía ⇒ `null`
//   persistido por el use case (AC-02).
// - `.strict()` (D8, VR-04) rechaza cualquier campo adicional — cualquier atributo desconocido
//   dispara `400 VALIDATION_ERROR` con `details.unrecognized_keys[*]`.
import { z } from 'zod';

export const CreateReviewRequestSchema = z
  .object({
    event_id: z.string().uuid(),
    vendor_profile_id: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
  })
  .strict();

export type CreateReviewBody = z.infer<typeof CreateReviewRequestSchema>;
