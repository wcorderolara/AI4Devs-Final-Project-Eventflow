// helmetMiddleware (US-091 / BE-003, Global). ADR-SEC-006; SEC-02, NFR-SEC-007.
// Security headers por defecto (CSP, X-Frame-Options, X-Content-Type-Options, HSTS, etc.).
// El toggle `HELMET_ENABLED` se aplica en `app.ts` al registrar el middleware.
import helmet from 'helmet';
import type { RequestHandler } from 'express';

export const helmetMiddleware: RequestHandler = helmet();
