// Magic-bytes validator (US-043 / PB-P1-026 / BE-003).
// Verifica el header binario contra las firmas conocidas de JPEG / PNG / WebP y compara con el
// MIME declarado por el header HTTP (Content-Type de la parte multipart). Rechaza cualquier
// inconsistencia (MIME spoofing, THR-008 / SEC-02 / NT-07).
//
// Referencia de firmas:
//   JPEG → FF D8 FF
//   PNG  → 89 50 4E 47 0D 0A 1A 0A
//   WebP → "RIFF" (bytes 0..3) + "WEBP" (bytes 8..11)
//
// Implementado sin depender de `file-type` para minimizar superficie y dependencias.
import type { AllowedImageMime } from '../domain/constants.js';
import { ALLOWED_IMAGE_MIME } from '../domain/constants.js';

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_RIFF = Buffer.from('RIFF', 'ascii');
const WEBP_WEBP = Buffer.from('WEBP', 'ascii');

/**
 * Detecta el MIME real del buffer inspeccionando su prefijo. Devuelve `null` cuando ninguna
 * firma coincide (o el buffer es demasiado corto). No lanza; el use case decide qué hacer con
 * el resultado.
 */
export function detectImageMime(buffer: Buffer): AllowedImageMime | null {
  if (buffer.length >= JPEG_MAGIC.length && buffer.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
    return 'image/jpeg';
  }
  if (buffer.length >= PNG_MAGIC.length && buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).equals(WEBP_RIFF) &&
    buffer.subarray(8, 12).equals(WEBP_WEBP)
  ) {
    return 'image/webp';
  }
  return null;
}

export interface MagicBytesInput {
  buffer: Buffer;
  /** MIME declarado por el header multipart de la parte `file`. */
  headerMime: string;
}

export interface MagicBytesOk {
  ok: true;
  detectedMime: AllowedImageMime;
}

export interface MagicBytesFail {
  ok: false;
  reason: 'header_not_allowed' | 'magic_bytes_unknown' | 'header_magic_mismatch';
}

export type MagicBytesResult = MagicBytesOk | MagicBytesFail;

/**
 * Valida el par (header MIME, magic-bytes). Rechaza:
 * - MIME del header fuera del allowlist;
 * - buffer sin firma conocida;
 * - header MIME que no coincide con el MIME detectado (spoofing / mislabeled).
 */
export function validateImageMagicBytes(input: MagicBytesInput): MagicBytesResult {
  const declared = input.headerMime.toLowerCase();
  if (!ALLOWED_IMAGE_MIME.includes(declared as AllowedImageMime)) {
    return { ok: false, reason: 'header_not_allowed' };
  }
  const detected = detectImageMime(input.buffer);
  if (detected === null) {
    return { ok: false, reason: 'magic_bytes_unknown' };
  }
  if (detected !== declared) {
    return { ok: false, reason: 'header_magic_mismatch' };
  }
  return { ok: true, detectedMime: detected };
}
