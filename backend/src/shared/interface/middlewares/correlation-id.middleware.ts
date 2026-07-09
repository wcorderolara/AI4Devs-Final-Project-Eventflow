// correlationIdMiddleware (US-091 / BE-003, Global). Doc 14 §16.
// Lee `x-correlation-id` del request o genera un UUID; lo propaga a `req.correlationId` y lo
// devuelve como cabecera de respuesta. Nunca lanza — siempre llama `next()`.
import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

export const correlationIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.headers['x-correlation-id'];
  const correlationId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
};
