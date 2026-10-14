// Logger real (fachada + Pino con los mismos formatters/mixin/redacción) escribiendo a memoria:
// permite verificar la línea JSON que se emitiría a stdout sin tocar el fd 1.
import type { DestinationStream } from 'pino';
import {
  createLogger,
  createPinoLogger,
  type AppLogger,
} from '../../src/shared/infrastructure/logger/index.js';

export interface CapturedLogger {
  logger: AppLogger;
  /** Líneas crudas tal como Pino las escribe al destino. */
  raw: string[];
  /** Líneas parseadas como JSON. */
  lines: () => Record<string, unknown>[];
}

export function captureLogger(): CapturedLogger {
  const raw: string[] = [];
  const destination: DestinationStream = {
    write: (chunk: string) => {
      raw.push(chunk);
    },
  };
  const logger = createLogger(createPinoLogger(destination));
  return { logger, raw, lines: () => raw.map((l) => JSON.parse(l) as Record<string, unknown>) };
}
