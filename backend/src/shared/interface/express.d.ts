// Augmentación de tipos de Express (US-091 / BE-002).
// Extiende `Request` con los campos que pobla el pipeline de middlewares, para acceder a
// `req.correlationId`, `req.user` y `req.validated` sin `as any` en middlewares y feature stories.
import 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- augmentación requerida del namespace Express
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: { id: string; role: string };
      validated?: { body?: unknown; params?: unknown; query?: unknown };
      // US-094 (SEC-001): id de la sesión resuelta desde la cookie firmada (para logout).
      sessionId?: string;
    }
  }
}

export {};
