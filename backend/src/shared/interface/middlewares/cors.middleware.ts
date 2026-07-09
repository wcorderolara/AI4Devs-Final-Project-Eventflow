// corsMiddleware (US-091 / BE-003, Global; US-108 / BE-001). ADR-SEC-006; SEC-01.
// Allowlist explícita desde `CORS_ORIGINS`; sin wildcard con credenciales (bloqueado fail-fast en
// boot por `config.superRefine`, EC-04). `credentials` desde `CORS_CREDENTIALS` (default true; VR-04
// exige true para `SameSite=None`). Un origin fuera de la allowlist produce ForbiddenError → 403.
import cors from 'cors';
import type { RequestHandler } from 'express';
import { config } from '../../../config/env.js';
import { ForbiddenError } from '../../domain/errors/forbidden.error.js';

const allowlist = config.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const corsMiddleware: RequestHandler = cors({
  origin: (origin, callback) => {
    // Requests sin Origin (curl, same-origin, health checks) se permiten.
    if (origin === undefined || allowlist.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new ForbiddenError('Origin not allowed'));
  },
  credentials: config.CORS_CREDENTIALS,
  optionsSuccessStatus: 204,
});
