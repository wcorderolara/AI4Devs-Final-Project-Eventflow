// Shared kernel — CorrelationId (branded type) para trazabilidad de solicitudes (US-090 / BE-001).
// Doc 14 §7.1. El middleware que genera y propaga el CorrelationId por request es US-091.
import { randomUUID } from 'node:crypto';

export type CorrelationId = string & { readonly _brand: 'CorrelationId' };

export const CorrelationId = {
  from: (value: string): CorrelationId => value as CorrelationId,
  generate: (): CorrelationId => randomUUID() as CorrelationId,
};
