// asyncHandler (US-094 / API-001). Envuelve handlers async para propagar errores al
// errorHandlerMiddleware vía `next` (Express 4 no captura rechazos de promesas automáticamente).
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
