// Puerto de almacenamiento binario (US-043 / PB-P1-026 / BE-002). El adapter concreto vive en
// `infrastructure/`. En MVP sólo existe `LocalFileStorageAdapter`; futuros adapters (`s3`, `gcs`)
// se agregarán sin cambiar el use case.

export interface SaveFileInput {
  /** Buffer ya procesado por el pipeline sharp; el adapter no debe re-decodificar. */
  buffer: Buffer;
  /** UUID v4 usado como filename para evitar path traversal vía `originalname` (SEC-06). */
  uuid: string;
  /** Extensión canónica final del archivo (por ejemplo `jpg`). */
  extension: string;
  /** MIME final tras el pipeline sharp (información, no reescritura). */
  mime: string;
}

export interface SaveFileResult {
  /**
   * Identificador de storage. Formato del `LocalFileStorageAdapter`:
   * `<yyyy>/<mm>/<uuid>.<ext>` relativo a `FILE_STORAGE_PATH`. NO se expone directamente al
   * cliente como filesystem path; la descarga irá por endpoint autenticado (US futura).
   */
  storageUrl: string;
}

export interface FileStoragePort {
  save(input: SaveFileInput): Promise<SaveFileResult>;
  /**
   * Elimina el binario referenciado por `storageUrl`. Idempotente: `ENOENT` no falla (permite
   * compensación segura del use case si la transacción de DB falla después del write).
   */
  delete(storageUrl: string): Promise<void>;
}
