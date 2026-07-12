// Catálogo base de códigos de error (US-093 / BE-001). ADR-API-002; Doc 14 §18.
// Códigos estables consumidos por el frontend, MSW y agentes IA. Los códigos de negocio
// específicos (CURRENCY_IMMUTABLE, QUOTE_LIMIT_REACHED, etc.) los agregan las historias de feature.
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  // US-094 (PB-P0-004): conflicto específico de email ya registrado (EC-02, NT-02) → 409.
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  // US-095 (PB-P0-004): intento de cambiar `currencyCode` tras crear el evento (AC-05, NT-08) → 409.
  CURRENCY_IMMUTABLE: 'CURRENCY_IMMUTABLE',
  // US-096 (PB-P0-004): límites/estado del flujo Quote/Booking (AC-01, EC-04/05/07).
  MAX_QUOTE_REQUESTS_EXCEEDED: 'MAX_QUOTE_REQUESTS_EXCEEDED', // 409
  DUPLICATE_QUOTE_REQUEST_ACTIVE: 'DUPLICATE_QUOTE_REQUEST_ACTIVE', // 409
  QUOTE_EXPIRED: 'QUOTE_EXPIRED', // 410
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_PROVIDER_TIMEOUT: 'AI_PROVIDER_TIMEOUT',
  // US-097 (PB-P0-004): contrato AI endpoints (Doc 16 §Error Handling).
  MISSING_INPUT: 'MISSING_INPUT', // 400
  UNSUPPORTED_LANGUAGE: 'UNSUPPORTED_LANGUAGE', // 422
  AI_INVALID_OUTPUT: 'AI_INVALID_OUTPUT', // 422
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION', // 422
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE', // 503
  // US-117 (PB-P0-009): provider LLM sin configuración válida (API key/model ausente) → 503.
  AI_PROVIDER_NOT_CONFIGURED: 'AI_PROVIDER_NOT_CONFIGURED', // 503
  // US-121 (PB-P0-010): PromptRegistry versionado (backend-only infra). Codes estables consumidos por
  // use cases futuros (US-122+) y por CI/validation. No mapean a HTTP en US-121 (no hay endpoint).
  PROMPT_NOT_FOUND: 'PROMPT_NOT_FOUND', // resolución sin match (feature/version)
  PROMPT_DUPLICATE_ACTIVE: 'PROMPT_DUPLICATE_ACTIVE', // >1 active por (featureType, languageCode)
  PROMPT_UNSUPPORTED_LANGUAGE: 'PROMPT_UNSUPPORTED_LANGUAGE', // languageCode no soportado
  PROMPT_INVALID_METADATA: 'PROMPT_INVALID_METADATA', // metadata/schema refs/safety incompletos
  PROMPT_HASH_DRIFT: 'PROMPT_HASH_DRIFT', // hash declarado ≠ hash del contenido (disciplina de versión)
  PROMPT_FUTURE_FEATURE_ACTIVE: 'PROMPT_FUTURE_FEATURE_ACTIVE', // prompt Future/P4 marcado active
  // US-122 (PB-P0-010): persistencia AIRecommendation (backend-only infra). Codes estables para
  // logs/tests; no mapean a HTTP en US-122 (no hay endpoint). Consumidos por use cases IA futuros.
  AI_RECOMMENDATION_VALIDATION: 'AI_RECOMMENDATION_VALIDATION', // metadata requerida inválida/faltante
  AI_PROMPT_VERSION_NOT_FOUND: 'AI_PROMPT_VERSION_NOT_FOUND', // promptVersionId ausente/inexistente
  AI_RECOMMENDATION_UNSAFE_PAYLOAD: 'AI_RECOMMENDATION_UNSAFE_PAYLOAD', // payload no sanitizable
  AI_RECOMMENDATION_INVALID_OUTPUT: 'AI_RECOMMENDATION_INVALID_OUTPUT', // output no validado por schema
  AI_RECOMMENDATION_CONTEXT: 'AI_RECOMMENDATION_CONTEXT', // context ID requerido por type faltante
  AI_RECOMMENDATION_PERSISTENCE: 'AI_RECOMMENDATION_PERSISTENCE', // fallo en la capa de persistencia
  // US-123 (PB-P0-011): timeout 60s + fallback Mock controlado (AI execution layer). Codes estables
  // para logs/tests y para que endpoints AI futuros mapeen a HTTP. AI_PROVIDER_TIMEOUT/UNAVAILABLE/
  // NOT_CONFIGURED ya existen (US-097/US-117) y se reutilizan.
  AI_FALLBACK_NOT_ALLOWED: 'AI_FALLBACK_NOT_ALLOWED', // fallback deshabilitado por config/environment
  AI_FALLBACK_FAILED: 'AI_FALLBACK_FAILED', // el MockAIProvider fallback también falló (sin loop)
  AI_CONFIG_INVALID: 'AI_CONFIG_INVALID', // config AI inválida/insegura en bootstrap
  // US-124 (PB-P0-011): validación JSON estricta + retry máx 1 (ADR-AI-007). `AI_INVALID_OUTPUT` ya
  // existe (US-097). Codes estables para logs/tests y mapeo futuro a 422.
  AI_INVALID_OUTPUT_SCHEMA: 'AI_INVALID_OUTPUT_SCHEMA', // output no cumple el schema Zod strict
  AI_OUTPUT_PARSE_ERROR: 'AI_OUTPUT_PARSE_ERROR', // output no parseable (JSON malformado/no-JSON)
  AI_RETRY_LIMIT_EXCEEDED: 'AI_RETRY_LIMIT_EXCEEDED', // se intentó reintentar más de 1 vez
  PERSISTENCE_ERROR: 'PERSISTENCE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Retenido del bootstrap US-091 para 400 de upload / body malformado (no es VALIDATION_ERROR).
  BAD_REQUEST: 'BAD_REQUEST',
  // US-109 (PB-P0-006): captcha en auth (AC-05, VR-01/VR-02, EC-01/EC-02) → 400.
  CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED', // token ausente
  CAPTCHA_INVALID: 'CAPTCHA_INVALID', // inválido/expirado/action mismatch/score bajo/provider error
  // US-001 (PB-P1-001, SEC-01; catálogo US-003): sesión activa en endpoint solo-anónimo → 409.
  ALREADY_AUTHENTICATED: 'ALREADY_AUTHENTICATED',
  // US-005 (PB-P1-003, EC-03): método HTTP no permitido en la ruta (p. ej. GET /auth/logout) → 405.
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  // US-004 (PB-P1-004): catálogo del reset de contraseña (Decisión PO US-004).
  TOKEN_INVALID: 'TOKEN_INVALID', // 400 — token alterado o inexistente (EC-03)
  TOKEN_USED: 'TOKEN_USED', // 400 — token ya consumido, single-use (EC-02)
  GONE_TOKEN_EXPIRED: 'GONE_TOKEN_EXPIRED', // 410 — token expirado, TTL 30 min (EC-01)
  // US-086 (PB-P0-014): reset surgical Demo. Concurrencia → 409; falla parcial → 500.
  SEED_RESET_IN_PROGRESS: 'SEED_RESET_IN_PROGRESS', // ya hay un reset en curso (EC-03)
  SEED_RESET_FAILED: 'SEED_RESET_FAILED', // falla durante limpieza/repoblado (EC-02)
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
