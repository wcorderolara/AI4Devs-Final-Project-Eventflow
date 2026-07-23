// US-116 (PB-P2-013 / BE-006). Router del módulo `platform-health`.
//
// Rutas (§7.8 · docs/16 §21.2):
//   GET  /health         → 200 (`HealthResponseDto`).
//   GET  /health/ready   → 200 (`ReadyResponseDto`) o 503.
//   ALL  {/health, /health/ready}  → 405 (EC-07 · VR-03) sin body.
//
// El wire y el composition root viven en `app.ts` — este archivo expone `buildPlatformHealthRouter`
// como builder puro para permitir DI real en tests (Supertest instancia el router con probes
// falseados sin bootear el app completo).
import { Router } from 'express';
import type { HealthController } from './health.controller.js';

export function buildPlatformHealthRouter(controller: HealthController): Router {
  const router = Router();
  router.get('/health', controller.getHealth);
  router.get('/health/ready', controller.getReadiness);
  // EC-07: métodos distintos a GET → 405 sin body (VR-03).
  router.all('/health', (_req, res) => {
    res.status(405).end();
  });
  router.all('/health/ready', (_req, res) => {
    res.status(405).end();
  });
  return router;
}
