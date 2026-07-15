// Sharp resize pipeline (US-043 / PB-P1-026 / BE-004).
// `processImage(buffer)` aplica: long-edge ≤ 2048 px (`sharp.resize({ withoutEnlargement: true })`),
// JPEG quality 80, mantiene aspect ratio. Rechaza binarios corruptos con `InvalidImageError`.
//
// `sharp` es un módulo nativo. La firma `import` es asíncrona/dinámica para tolerar entornos
// donde el binario aún no está instalado (tests unit que mockean el módulo por resolver).
// En producción `sharp` debe estar instalado — se declara en `backend/package.json` como dep.
import { InvalidImageError } from '../domain/attachment.errors.js';
import { RESIZE_JPEG_QUALITY, RESIZE_LONG_EDGE_PX } from '../domain/constants.js';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  mime: 'image/jpeg';
}

/**
 * Contrato mínimo del subset de sharp que consumimos. Se declara aquí para permitir mocks
 * livianos sin depender del paquete real desde tests unit.
 */
export interface SharpModule {
  (input: Buffer): SharpInstance;
}

interface SharpInstance {
  metadata(): Promise<{ width?: number; height?: number }>;
  rotate(): SharpInstance;
  resize(opts: { width: number; height: number; fit: 'inside'; withoutEnlargement: true }): SharpInstance;
  jpeg(opts: { quality: number; mozjpeg?: boolean }): SharpInstance;
  toBuffer(): Promise<Buffer>;
}

let cachedSharp: SharpModule | null = null;

async function loadSharp(): Promise<SharpModule> {
  if (cachedSharp !== null) return cachedSharp;
  // Import dinámico: no falla en el bootstrap si `sharp` no está en el entorno actual (tests unit
  // que inyectan un fake vía `setSharpForTesting`). En runtime del backend real siempre está.
  const mod = (await import('sharp')) as unknown as { default?: SharpModule } | SharpModule;
  const resolved =
    typeof mod === 'function' ? (mod as SharpModule) : ((mod as { default?: SharpModule }).default ?? null);
  if (resolved === null) {
    throw new Error('sharp module could not be resolved');
  }
  cachedSharp = resolved;
  return resolved;
}

/** Inyector para tests unit — nunca debe usarse desde runtime del backend. */
export function setSharpForTesting(mock: SharpModule | null): void {
  cachedSharp = mock;
}

/**
 * Aplica el pipeline de normalización. La rotación (`rotate()`) respeta la orientación EXIF y
 * la elimina — necesario para que `metadata()` tras el resize reporte width/height coherentes
 * con el binario servido.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  try {
    const sharp = await loadSharp();
    const buffer = await sharp(input)
      .rotate()
      .resize({
        width: RESIZE_LONG_EDGE_PX,
        height: RESIZE_LONG_EDGE_PX,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: RESIZE_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    const meta = await sharp(buffer).metadata();
    if (typeof meta.width !== 'number' || typeof meta.height !== 'number') {
      throw new InvalidImageError('Processed image is missing dimensions');
    }
    return { buffer, width: meta.width, height: meta.height, mime: 'image/jpeg' };
  } catch (err) {
    if (err instanceof InvalidImageError) throw err;
    throw new InvalidImageError('The uploaded image could not be processed');
  }
}
