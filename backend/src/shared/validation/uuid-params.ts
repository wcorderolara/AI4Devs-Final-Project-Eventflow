// Params de ruta UUID (`:eventId`, `:id`, …). `.strict()` por defecto (ADR-API-003); los endpoints
// que históricamente no eran estrictos encadenan `.strip()`. Mensajes Zod por defecto (`Invalid uuid`).
import { z } from 'zod';

export function uuidParamsSchema<K extends string>(...keys: K[]) {
  const shape = Object.fromEntries(keys.map((k) => [k, z.string().uuid()])) as {
    [P in K]: z.ZodString;
  };
  return z.object(shape).strict();
}

export const EventIdParamSchema = uuidParamsSchema('eventId');
