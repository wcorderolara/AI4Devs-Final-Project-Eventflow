// Logger de eventos estructurados parametrizado (US-094/096/108/109 OBS-001). Emite
// `{ event, ...campos }` al logger central con el nivel que decide `level(event)`. Con `fields`
// solo se emiten esos campos (whitelist de metadatos seguros: nunca sid, token ni secretos).
import { logger } from '../../shared/infrastructure/logger/index.js';

export type EventLogLevel = 'info' | 'warn' | 'error';

export function createEventLogger<E extends string, D extends object>(spec: {
  level: (event: E) => EventLogLevel;
  fields?: readonly (keyof D)[];
}): (event: E, data?: D) => void {
  return (event, data = {} as D) => {
    const safe = spec.fields
      ? Object.fromEntries(spec.fields.map((f) => [f, data[f]]))
      : data;
    logger[spec.level(event)]({ event, ...safe });
  };
}
