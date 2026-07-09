// Helper failure() — construye el error envelope canónico (US-093 / BE-004). ADR-API-002; VR-03.
// Overloads: `details[]` es OBLIGATORIO para VALIDATION_ERROR y BUSINESS_RULE_VIOLATION;
// opcional para el resto. Falla la compilación si se omite en los dos códigos que lo requieren.
import { ErrorCodes, type ErrorCode } from '../domain/errors/error-codes.js';
import type { ErrorEnvelope, ErrorDetail } from './types.js';

type DetailRequiredCode = typeof ErrorCodes.VALIDATION_ERROR | typeof ErrorCodes.BUSINESS_RULE_VIOLATION;

export function failure(
  code: DetailRequiredCode,
  message: string,
  details: ErrorDetail[],
  correlationId: string,
): ErrorEnvelope;
export function failure(
  code: Exclude<ErrorCode, DetailRequiredCode>,
  message: string,
  details: ErrorDetail[] | undefined,
  correlationId: string,
): ErrorEnvelope;
export function failure(
  code: ErrorCode,
  message: string,
  details: ErrorDetail[] | undefined,
  correlationId: string,
): ErrorEnvelope {
  const error: ErrorEnvelope['error'] = { code, message, correlationId };
  if (details && details.length > 0) {
    error.details = details;
  }
  return { error };
}
