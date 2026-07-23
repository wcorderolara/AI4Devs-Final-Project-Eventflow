// US-113 (PB-P2-010 / BE-005). Singleton logger — export canónico del Pino
// logger para consumidores backend. Los módulos nuevos deben importar desde
// AQUÍ (`import { logger } from '@/shared/logger'`) en vez de instanciar
// `pino()` por su cuenta.
//
// El stub console-based legacy en `src/shared/infrastructure/logger/index.ts`
// se mantiene por retrocompatibilidad con los consumidores de US-025/034/068..
// 072/108/109/118..124 y con los 3 tests que hacen `vi.spyOn(console, ...)`.
// Deviation D-01 del execution record documenta la migración gradual.
export { pinoLogger as logger } from './infrastructure/logger/pino-logger.js';
export { correlationContext, getCorrelationId } from './context/correlation-id.js';
