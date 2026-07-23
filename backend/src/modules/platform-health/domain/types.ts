// US-116 (PB-P2-013 / BE-002). DTOs canonical del contrato `docs/16 §21.3`.

export type HealthResponseDto = {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptimeMs: number;
  timestamp: string; // ISO-8601 UTC
};

export type AiProviderStatus = 'ok' | 'mock' | 'down';

export type ReadyDependencies = {
  postgres: 'ok' | 'down';
  aiProvider: AiProviderStatus;
};

export type ReadyResponseDto = HealthResponseDto & {
  dependencies: ReadyDependencies;
};

// Re-export desde `shared/constants/health-paths.ts` para conveniencia del módulo.
// La constante canónica vive en `shared/` para que los 3 middlewares (rate-limit,
// correlation-id, request-logger) puedan consumirla sin cross-module import
// (ADR-ARCH-001 · boundary rule).
export { HEALTH_PATHS, isHealthPath } from '../../../shared/constants/health-paths.js';
