// authMiddleware (US-091 / BE-005, Por ruta). ADR-SEC-001; AC-02; VR-01.
// Verifica el JWT de `Authorization: Bearer <token>` con `JWT_SECRET`; popula `req.user`.
// Token ausente/inválido/expirado → UnauthorizedError → 401 (NUNCA 403). No consulta la BD.
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/env.js';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error.js';
import { logger } from '../../infrastructure/logger/index.js';

function extractBearer(header: string | undefined): string | undefined {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return undefined;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : undefined;
}

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req.headers['authorization']);
  if (token === undefined) {
    logger.warn({ correlationId: req.correlationId, event: 'AUTH_FAILURE', reason: 'Missing token' });
    next(new UnauthorizedError());
    return;
  }

  try {
    const decoded: unknown = jwt.verify(token, config.JWT_SECRET);
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof (decoded as Record<string, unknown>).id !== 'string' ||
      typeof (decoded as Record<string, unknown>).role !== 'string'
    ) {
      throw new Error('Invalid token payload');
    }
    const payload = decoded as { id: string; role: string };
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    logger.warn({
      correlationId: req.correlationId,
      event: 'AUTH_FAILURE',
      reason: err instanceof Error ? err.message : 'Invalid token',
    });
    next(new UnauthorizedError());
  }
};
