// Catálogo base de códigos de error (US-093 / BE-001). ADR-API-002; Doc 14 §18.
// Códigos estables consumidos por el frontend, MSW y agentes IA. Los códigos de negocio
// específicos (CURRENCY_IMMUTABLE, QUOTE_LIMIT_REACHED, etc.) los agregan las historias de feature.
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_PROVIDER_TIMEOUT: 'AI_PROVIDER_TIMEOUT',
  PERSISTENCE_ERROR: 'PERSISTENCE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Retenido del bootstrap US-091 para 400 de captcha / upload (no es VALIDATION_ERROR).
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
