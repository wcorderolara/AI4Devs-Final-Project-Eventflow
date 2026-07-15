// Constantes de dominio del bounded context `attachments` (US-043 / PB-P1-026).
// Se conservan como const literales (no enum runtime) para permitir el uso como discriminante
// en tipos y evitar código adicional. `AttachmentOwnerType` no vive como enum en Prisma
// (Doc 18 §19: patrón polimórfico con `owner_type` string).

export const OWNER_TYPE_VENDOR_WORK = 'vendor_work' as const;
export type AttachmentOwnerType = typeof OWNER_TYPE_VENDOR_WORK;

/** MIME allowlist (D3 / SEC-02). Alineada con la lista D1-D6 de US-043. */
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

/**
 * Regex del `work_label` (D5). Permite letras, dígitos, guion, guion bajo y espacio; 1..80
 * caracteres. La comparación entre grupos usa `LOWER(work_label)` — la persistencia preserva
 * el display original que envió el vendor.
 */
export const WORK_LABEL_REGEX = /^[a-zA-Z0-9\-_ ]{1,80}$/;

/** Tope duro por `(owner_id, LOWER(work_label))` — AC-02 / C-022. */
export const MAX_IMAGES_PER_WORK = 10;

/** Tope duro de `work_labels` activos distintos por vendor — EC-06 / D6. */
export const MAX_DISTINCT_WORK_LABELS = 20;

/** Long-edge del resize server-side (D4). Preserva aspect ratio. */
export const RESIZE_LONG_EDGE_PX = 2048;

/** Quality del encoder JPEG del pipeline sharp (D4). */
export const RESIZE_JPEG_QUALITY = 80;

/** MIME final tras el pipeline sharp (siempre JPEG — D4). */
export const NORMALIZED_MIME = 'image/jpeg' as const;

/** Extensión canónica derivada de `NORMALIZED_MIME`. */
export const NORMALIZED_EXTENSION = 'jpg' as const;
