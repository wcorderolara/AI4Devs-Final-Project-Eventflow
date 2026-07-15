// LocalFileStorageAdapter (US-043 / PB-P1-026 / BE-002).
// Persiste el binario en `<FILE_STORAGE_PATH>/<yyyy>/<mm>/<uuid>.<ext>`. `mkdir` es recursivo
// y idempotente; `delete` tolera `ENOENT` para permitir compensación segura del use case.
// Nombre de archivo = UUID v4 (SEC-06): jamás usar `originalname` del multipart para evitar
// path traversal.
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import type { FileStoragePort, SaveFileInput, SaveFileResult } from '../ports/file-storage.port.js';

export interface LocalFileStorageAdapterOptions {
  /** Ruta base absoluta o relativa al cwd donde se persisten los binarios. */
  basePath: string;
  /**
   * Reloj inyectable. Se usa sólo para segmentar el path por yyyy/mm; se pasa como puerto para
   * mantener determinismo en tests (evita `new Date()` puro dentro del adapter).
   */
  now: () => Date;
}

export class LocalFileStorageAdapter implements FileStoragePort {
  constructor(private readonly opts: LocalFileStorageAdapterOptions) {}

  async save(input: SaveFileInput): Promise<SaveFileResult> {
    const now = this.opts.now();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const relative = join(yyyy, mm, `${input.uuid}.${input.extension}`);
    const absolute = join(this.opts.basePath, relative);

    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, input.buffer);

    return { storageUrl: relative };
  }

  async delete(storageUrl: string): Promise<void> {
    const absolute = join(this.opts.basePath, storageUrl);
    try {
      await unlink(absolute);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return;
      }
      logger.warn({ event: 'file_storage.delete_failed', storageUrl, code });
      throw err;
    }
  }
}
