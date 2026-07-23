// US-127 · PB-P2-015 · FE-001
// Esquemas Zod de contrato de la API (fuente de verdad de forma para los tests
// de contrato del frontend). Reflejan el envelope canónico `{ data, meta }` /
// `{ error }` documentado en docs/16 §13 y en `backend/openapi.json` (US-098).
//
// Estos esquemas se usan para validar las respuestas mockeadas por MSW (AC-02)
// y para detectar drift cuando un DTO cambia sin sincronizar el frontend (AC-03).
// La derivación desde OpenAPI vive en `./openapi-source.ts` (AC-04).

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Envelope primitives
// -----------------------------------------------------------------------------

// `meta.correlationId` es obligatorio en respuestas de éxito (ADR-API-004,
// docs/16 §13). `timestamp` está presente en todas las respuestas 2xx del
// snapshot OpenAPI vigente.
export const responseMetaSchema = z.object({
  correlationId: z.string().min(1),
  timestamp: z.string().datetime().or(z.string().min(1)),
});

/** Envelope de éxito parametrizado por el schema del `data`. */
export const successEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
    meta: responseMetaSchema,
  });

/** Envelope de error canónico (ProblemDetails-like). */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    correlationId: z.string().min(1).optional(),
    details: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        }),
      )
      .optional(),
  }),
});

// -----------------------------------------------------------------------------
// Auth · User (docs/16 §Auth · AuthUserResponse)
// -----------------------------------------------------------------------------

export const preferredLanguageSchema = z.enum(['es-LATAM', 'es-ES', 'pt', 'en']);
export const userRoleSchema = z.enum(['organizer', 'vendor', 'admin']);
export const userStatusSchema = z.enum(['active', 'suspended']);

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema,
  status: userStatusSchema,
  preferredLanguage: preferredLanguageSchema,
  phone: z.string().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const authUserEnvelope = successEnvelope(authUserSchema);

// -----------------------------------------------------------------------------
// Auth · Password reset request (docs/16 · US-004)
// -----------------------------------------------------------------------------

export const passwordResetRequestEnvelope = successEnvelope(
  z.object({ message: z.string().min(1) }),
);

// -----------------------------------------------------------------------------
// Platform Health (docs/16 §21 · US-116)
// -----------------------------------------------------------------------------

// `/health` y `/health/ready` son la excepción explícita al envelope canónico
// (ver `backend/src/modules/platform-health/infrastructure/http/health.controller.ts`
// y ADR-API-004). DTO plano sin `data`/`meta`.

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  version: z.string().min(1),
  uptimeMs: z.number().int().nonnegative(),
  timestamp: z.string().datetime().or(z.string().min(1)),
});

export const readinessDependencyStatusSchema = z.enum(['ok', 'down', 'mock']);

export const readinessResponseSchema = healthResponseSchema.extend({
  dependencies: z.object({
    postgres: readinessDependencyStatusSchema,
    aiProvider: readinessDependencyStatusSchema,
  }),
});

// -----------------------------------------------------------------------------
// Registry — mapea endpoint clave → schema esperado (usado por QA-003 OpenAPI
// best-effort y por los tests de contrato al iterar sobre la lista).
// -----------------------------------------------------------------------------

export interface KeyEndpoint {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly successStatus: number;
  /** Schema del cuerpo 2xx esperado, o `null` si el contrato es "sin body" (204). */
  readonly successSchema: z.ZodTypeAny | null;
  /** Códigos de error documentados en el contrato para este endpoint (AC-01/SEC-04). */
  readonly errorStatuses: readonly number[];
  /**
   * `true` si el endpoint es una excepción explícita al snapshot OpenAPI
   * (documentado en ADR-API-004 y docs/16 §21.3). Ej.: `/health` y `/health/ready`
   * devuelven DTO plano y no viven en `backend/openapi.json`. Los tests QA-003
   * omiten estos endpoints de la verificación de OpenAPI para no marcar drift
   * falso positivo.
   */
  readonly openApiExempt?: boolean;
}

export const KEY_ENDPOINTS: readonly KeyEndpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/health',
    successStatus: 200,
    successSchema: healthResponseSchema,
    errorStatuses: [],
    openApiExempt: true, // ADR-API-004 · DTO plano · docs/16 §21.3.
  },
  {
    method: 'GET',
    path: '/api/v1/users/me',
    successStatus: 200,
    successSchema: authUserEnvelope,
    errorStatuses: [401],
  },
  {
    method: 'POST',
    path: '/api/v1/auth/register',
    successStatus: 201,
    successSchema: authUserEnvelope,
    errorStatuses: [400, 409, 422, 429],
  },
  {
    method: 'POST',
    path: '/api/v1/auth/login',
    successStatus: 200,
    successSchema: authUserEnvelope,
    errorStatuses: [400, 401, 409, 422, 429],
  },
  {
    method: 'POST',
    path: '/api/v1/auth/logout',
    successStatus: 204,
    successSchema: null,
    errorStatuses: [401, 405],
  },
  {
    method: 'POST',
    path: '/api/v1/auth/password/reset-request',
    successStatus: 202,
    successSchema: passwordResetRequestEnvelope,
    errorStatuses: [400, 422, 429],
  },
  {
    method: 'POST',
    path: '/api/v1/auth/password/reset',
    successStatus: 204,
    successSchema: null,
    errorStatuses: [400, 410, 422, 429],
  },
];
