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
  // US-019 (PB-P1-013, EC-01, VR-03): budget_estimated <= 0 al invocar sugerencia IA → 400.
  INVALID_BUDGET: 'INVALID_BUDGET',
  // US-025 (PB-P1-016): contrato HITL Accept/Edit/Discard. Doc 16 §35.3.
  RECOMMENDATION_NOT_PENDING: 'RECOMMENDATION_NOT_PENDING', // 409 — status no `pending` (EC-01, EC-07)
  RECOMMENDATION_TYPE_NOT_APPLICABLE: 'RECOMMENDATION_TYPE_NOT_APPLICABLE', // 422 — type sin strategy (EC-05)
  EDITED_PAYLOAD_INVALID: 'EDITED_PAYLOAD_INVALID', // 400 — editedPayload no cumple *OutputDto (EC-03)
  SIDE_EFFECT_FAILED: 'SIDE_EFFECT_FAILED', // 500 — strategy applyInTransaction falló (EC-04)
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE', // 413 — body > 256KB (EC-06)
  // US-031 (PB-P1-017): confirmar tareas IA en bloque (HITL bulk). Errores globales del batch.
  BULK_LIMIT_EXCEEDED: 'BULK_LIMIT_EXCEEDED', // 400 — taskIds (post-dedup) > 50 (EC-07)
  EVENT_NOT_MUTABLE: 'EVENT_NOT_MUTABLE', // 409 — event.status ∈ {cancelled, completed, deleted} (EC-09)
  // US-028 (PB-P1-018): creación manual de EventTask (POST /events/:eventId/tasks).
  DUE_DATE_IN_PAST: 'DUE_DATE_IN_PAST', // 400 — due_date < now() - 60s tolerancia (EC-04)
  CATEGORY_NOT_AVAILABLE: 'CATEGORY_NOT_AVAILABLE', // 400 — category_code inexistente o is_active=false (EC-06)
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE', // 415 — Content-Type distinto de application/json (EC-12)
  // US-029 (PB-P1-018): PATCH/DELETE de tareas del checklist.
  EMPTY_PATCH: 'EMPTY_PATCH', // 400 — PATCH content sin ningún campo editable (EC-06)
  INVALID_TRANSITION: 'INVALID_TRANSITION', // 409 — PATCH status contra state machine (EC-02)
  // US-036 (PB-P1-020 R1): CRUD BudgetItem — hard delete + bloqueos + edición categoría.
  ITEM_HAS_COMMITMENT: 'ITEM_HAS_COMMITMENT', // 409 — DELETE bloqueado por amount_committed > 0 (AC-04)
  ITEM_HAS_PENDING_INTENT: 'ITEM_HAS_PENDING_INTENT', // 409 — DELETE bloqueado por BookingIntent.pending (AC-05)
  ITEM_HAS_COMMITMENT_CATEGORY_LOCKED: 'ITEM_HAS_COMMITMENT_CATEGORY_LOCKED', // 409 — PATCH cambia category_code con committed > 0 (AC-02 / D5)
  EVENT_NOT_EDITABLE: 'EVENT_NOT_EDITABLE', // 409 — mutación bloqueada por event.status ∈ {cancelled, completed} (AC-06 / D3)
  INVALID_CATEGORY_CODE: 'INVALID_CATEGORY_CODE', // 400 — category_code no está en whitelist activa (VR-03)
  // US-037 (PB-P1-021): aplicar sugerencia IA de presupuesto (HITL).
  CATEGORY_INACTIVE: 'CATEGORY_INACTIVE', // 409 — alguna categoría referenciada tiene is_active=false (AC-05 / D6)
  CURRENCY_MISMATCH: 'CURRENCY_MISMATCH', // 409 — recommendation.currencyCode != event.currencyCode (AC-08, defensa profunda)
  PAYLOAD_INVALID: 'PAYLOAD_INVALID', // 422 — payload del AIRecommendation corrupto (defensa profunda)
  INVALID_VALUE: 'INVALID_VALUE', // 400 — editedPayload con category no presente en payload original / vacío (EC-04/05)
  // US-040 (PB-P1-024): crear VendorProfile. El vendor ya tiene un perfil (UNIQUE user_id) → 409.
  PROFILE_EXISTS: 'PROFILE_EXISTS',
  // US-041 (PB-P1-024): editar / soft-delete VendorProfile.
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND', // 404 — currentUser sin perfil (NT-10)
  PROFILE_REJECTED: 'PROFILE_REJECTED', // 409 — PATCH bloqueado en status=rejected (EC-03, D3)
  PROFILE_HIDDEN: 'PROFILE_HIDDEN', // 409 — PATCH/DELETE bloqueado en status=hidden (EC-04, D3)
  PROFILE_DELETED: 'PROFILE_DELETED', // 409 — DELETE sobre perfil ya soft-deleted (EC-05)
  INVALID_FIELD: 'INVALID_FIELD', // 400 — body PATCH con campo prohibido (categories/slug/status → EC-01/EC-02, NT-04..06)
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
