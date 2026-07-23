// US-116 (PB-P2-013). Paths canónicos de los endpoints healthcheck/readiness
// (`docs/16 §21`). Se declaran en `shared/` para poder ser consumidos por
// middlewares de infraestructura (rate-limit, correlation-id, request-logger)
// sin violar la boundary rule ADR-ARCH-001 (shared → shared/config/app-infra
// permitido, shared → module NO permitido).
//
// El módulo `platform-health/domain/types.ts` re-exporta ambos para conveniencia
// de composición dentro del módulo.

/** Paths reservados por US-116. Frozen para prevenir mutaciones accidentales. */
export const HEALTH_PATHS: readonly string[] = Object.freeze(['/health', '/health/ready']);

/** Discriminador para middlewares/tests: ¿este path pertenece a los endpoints US-116? */
export function isHealthPath(path: string): boolean {
  return HEALTH_PATHS.includes(path);
}
