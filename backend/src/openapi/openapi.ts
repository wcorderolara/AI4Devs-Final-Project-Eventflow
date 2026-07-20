// Registry y documento OpenAPI 3.x del contrato REST `/api/v1` (US-098 / PB-P0-005).
// Fuente única: los schemas Zod de los DTOs (US-092..097). NO define endpoints; documenta los
// existentes. Determinista: sin timestamps ni valores host-specific. Tooling, no runtime del server.
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Request/Response DTOs (fuente del contrato).
import {
  RegisterUserRequestSchema,
  LoginUserRequestSchema,
  PasswordResetRequestSchema,
  PasswordResetSchema,
} from '../modules/identity-access/dto/index.js';
import { AuthUserResponseSchema } from '../shared/dto/auth-user.response.js';
import {
  UpdateCurrentUserProfileSchema,
  ChangePreferredLanguageSchema,
  ChangePasswordSchema,
} from '../modules/user-profile/dto/index.js';
import {
  CreateEventRequestSchema,
  UpdateEventRequestSchema,
  ListEventsQuerySchema,
  EventResponseSchema,
  EventIdParamSchema,
} from '../modules/event-planning/dto/index.js';
import {
  CreateQuoteRequestRequestSchema,
  CreateQuoteRequestBodySchema,
  UpdateQuoteRequestBodySchema,
  ListQuoteRequestsQuerySchema,
  QuoteRequestResponseSchema,
  QuoteResponseSchema,
  EventIdParamSchema as QfEventIdParamSchema,
  QuoteRequestIdParamSchema,
  QuoteIdParamSchema,
} from '../modules/quote-flow/dto/index.js';
// US-051 (PB-P1-031 / BE-005): path param `{ id: uuid }` para las rutas vendor-scoped.
import { us051QrIdParamSchema as Us051IdParamSchema } from '../modules/quote-flow/dto/us051-qr-id.param.js';
// US-052 (PB-P1-031 / BE-003): body schema del endpoint respond.
import { respondQuoteRequestBodySchema as RespondQuoteRequestBodySchema } from '../modules/quote-flow/dto/respond-quote.us052.request.js';
// US-054 (PB-P1-032 / BE-001): body opcional `{ reason?: string [0..500] }` del endpoint reject.
import { rejectQuoteBodySchema as RejectQuoteBodySchema } from '../modules/quote-flow/dto/reject-quote.us054.request.js';
// US-056 (PB-P1-034 / BE-001): body opcional del endpoint cancel de QuoteRequest.
import { cancelQuoteRequestBodySchema as CancelQuoteRequestBodySchema } from '../modules/quote-flow/dto/cancel-quote-request.us056.request.js';
// US-057 (PB-P1-035 / BE-001/003): query DTO + response shape del comparador de Quotes.
import {
  CompareQuotesEventIdParamSchema,
  CompareQuotesQuerySchema,
} from '../modules/quote-flow/dto/compare-quotes.us057.query.js';
import { CompareQuotesResponseSchema } from '../modules/quote-flow/dto/compare-quotes.us057.response.js';
// US-058 (PB-P1-035 / BE-001): body del endpoint toggle preferred.
import { preferQuoteBodySchema as PreferQuoteBodySchema } from '../modules/quote-flow/dto/prefer-quote.us058.request.js';
import {
  CreateBookingIntentRequestSchema,
  CancelBookingIntentRequestSchema,
  ConfirmBookingIntentBodySchema,
  BookingIntentResponseSchema,
  BookingIntentIdParamSchema,
} from '../modules/booking-intent/dto/index.js';
// US-065 (PB-P1-038 / BE-004): endpoint atómico crear Review verificada + denormalize
// VendorProfile.rating_avg/reviews_count + fan-out review.published al vendor.
import { CreateReviewRequestSchema } from '../modules/reviews-moderation/interface/create-review.dto.js';
import { ReviewResponseSchema } from '../modules/reviews-moderation/interface/review.response.js';
import {
  AiBaseRequestSchema,
  ApplyAiRecommendationSchema,
  EventIdParamSchema as AiEventIdParamSchema,
  QuoteRequestIdParamSchema as AiQuoteRequestIdParamSchema,
  AiRecommendationIdParamSchema,
} from '../modules/ai-assistance/dto/index.js';
import {
  AdminEventReadResponseSchema,
  AdminEventIdOpenApiParamSchema,
} from '../modules/admin-governance/dto/index.js';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ── Security scheme: cookie de sesión HTTP-only firmada (ADR-SEC-002, US-094) ──
registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'eventflow_session',
  description: 'Cookie de sesión HTTP-only firmada emitida por POST /auth/login.',
});

// ── Componentes comunes (US-093 envelope) ────────────────────────────────────
registry.register(
  'ErrorEnvelope',
  z
    .object({
      error: z
        .object({
          code: z.string(),
          message: z.string(),
          details: z.array(z.object({ field: z.string(), message: z.string() }).strict()).optional(),
          correlationId: z.string(),
        })
        .strict(),
    })
    .strict(),
);

const ResponseMeta = registry.register(
  'ResponseMeta',
  z.object({ correlationId: z.string(), timestamp: z.string().datetime() }).strict(),
);

const Pagination = registry.register(
  'Pagination',
  z
    .object({
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    })
    .strict(),
);

const AiMeta = registry.register(
  'AiMeta',
  z
    .object({
      provider: z.string(),
      promptVersion: z.string(),
      latencyMs: z.number(),
      fallbackUsed: z.boolean(),
      languageCode: z.string(),
    })
    .strict(),
);

// Respuestas comunes de error como components.responses (AC-04).
const ERROR_RESPONSES: Record<string, string> = {
  BadRequest: 'Solicitud inválida (p. ej. MISSING_INPUT, captcha).',
  Unauthorized: 'Autenticación requerida.',
  Forbidden: 'Rol o permiso insuficiente.',
  NotFound: 'Recurso no encontrado (o enmascarado por seguridad).',
  MethodNotAllowed: 'Método HTTP no permitido en esta ruta (US-005 EC-03).',
  Conflict: 'Conflicto de estado (p. ej. EMAIL_TAKEN, límites de quote).',
  Gone: 'Recurso expirado (QUOTE_EXPIRED).',
  ValidationError: 'Error de validación de DTO.',
  RateLimited: 'Límite de tasa excedido.',
  ProviderUnavailable: 'Proveedor no disponible o timeout (AI).',
  InternalError: 'Error interno del servidor.',
};
for (const [name, description] of Object.entries(ERROR_RESPONSES)) {
  registry.registerComponent('responses', name, {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
type ZodAny = z.ZodTypeAny;

function envelope(data: ZodAny): ZodAny {
  return z.object({ data, meta: ResponseMeta }).strict();
}
function listEnvelope(item: ZodAny): ZodAny {
  return z.object({ data: z.array(item), pagination: Pagination, meta: ResponseMeta }).strict();
}
function jsonBody(schema: ZodAny) {
  return { content: { 'application/json': { schema } } };
}
function okResponse(schema: ZodAny, description = 'OK') {
  return { description, content: { 'application/json': { schema } } };
}
const HTTP_TO_RESPONSE: Record<number, string> = {
  400: 'BadRequest',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'NotFound',
  405: 'MethodNotAllowed',
  409: 'Conflict',
  410: 'Gone',
  422: 'ValidationError',
  429: 'RateLimited',
  503: 'ProviderUnavailable',
  500: 'InternalError',
};
function errorRefs(codes: number[]): Record<number, { $ref: string }> {
  const out: Record<number, { $ref: string }> = {};
  for (const c of codes) out[c] = { $ref: `#/components/responses/${HTTP_TO_RESPONSE[c]}` };
  return out;
}

const cookieAuth = [{ cookieAuth: [] }];

/** Prefijo canónico versionado. Todos los paths documentados lo incluyen (AC-05, VR-05). */
const API_PREFIX = '/api/v1';

interface OpParams {
  method: 'get' | 'post' | 'patch' | 'delete' | 'put';
  path: string;
  operationId: string;
  tags: string[];
  summary: string;
  secured: boolean;
  params?: z.AnyZodObject;
  query?: z.AnyZodObject;
  body?: ZodAny;
  success: { status: number; schema?: ZodAny; description?: string };
  errors: number[];
}

function op(o: OpParams): void {
  const responses: RouteConfig['responses'] = {};
  responses[o.success.status] = o.success.schema
    ? okResponse(o.success.schema, o.success.description)
    : { description: o.success.description ?? 'No Content' };
  Object.assign(responses, errorRefs(o.errors));
  registry.registerPath({
    method: o.method,
    path: `${API_PREFIX}${o.path}`,
    operationId: o.operationId,
    tags: o.tags,
    summary: o.summary,
    ...(o.secured ? { security: cookieAuth } : {}),
    request: {
      ...(o.params ? { params: o.params } : {}),
      ...(o.query ? { query: o.query } : {}),
      ...(o.body ? { body: jsonBody(o.body) } : {}),
    },
    responses,
  });
}

// ── AUTH (público) ────────────────────────────────────────────────────────────
op({ method: 'post', path: '/auth/register', operationId: 'registerUser', tags: ['Auth'], summary: 'Registrar organizer o vendor (emite cookie de sesión)', secured: false, body: RegisterUserRequestSchema, success: { status: 201, schema: envelope(AuthUserResponseSchema), description: 'Usuario creado. Emite `Set-Cookie` con la sesión HTTP-only firmada (US-001 AC-01). Errores 409: EMAIL_TAKEN | ALREADY_AUTHENTICATED.' }, errors: [400, 409, 422, 429] });
op({ method: 'post', path: '/auth/login', operationId: 'loginUser', tags: ['Auth'], summary: 'Iniciar sesión (emite cookie; captcha condicional N=3)', secured: false, body: LoginUserRequestSchema, success: { status: 200, schema: envelope(AuthUserResponseSchema), description: 'Login OK. Emite `Set-Cookie` (HttpOnly, SameSite=Lax, Max-Age=30d). `captchaToken` solo se exige tras 3 fallos consecutivos por IP+email (US-003). Errores 409: ALREADY_AUTHENTICATED.' }, errors: [400, 401, 409, 422, 429] });
op({ method: 'post', path: '/auth/logout', operationId: 'logoutUser', tags: ['Auth'], summary: 'Cerrar sesión (204; revoca sesión y limpia cookie con Max-Age=0)', secured: true, success: { status: 204, description: 'Sesión revocada. `Set-Cookie` de limpieza (Max-Age=0, flags canónicos). Endpoint estricto: sin sesión → 401 (US-005).' }, errors: [401, 405] });
op({ method: 'post', path: '/auth/password/reset-request', operationId: 'requestPasswordReset', tags: ['Auth'], summary: 'Solicitar reset de contraseña (202 genérico anti-enumeración)', secured: false, body: PasswordResetRequestSchema, success: { status: 202, schema: envelope(z.object({ message: z.string() }).strict()), description: 'Respuesta genérica SIEMPRE (exista o no el email — SEC-POL-AUTH-005). Token ≥32 bytes, TTL 30 min (US-004), entregado por email simulado. Rate limit 3/email/h.' }, errors: [400, 422, 429] });
op({ method: 'post', path: '/auth/password/reset', operationId: 'resetPassword', tags: ['Auth'], summary: 'Aplicar reset con token (single-use)', secured: false, body: PasswordResetSchema, success: { status: 204, description: 'Contraseña actualizada (argon2id). Errores 400: TOKEN_INVALID | TOKEN_USED · 410: GONE_TOKEN_EXPIRED (US-004). Rate limit 5/IP/10min.' }, errors: [400, 410, 422, 429] });

// ── USERS (perfil propio) ──────────────────────────────────────────────────────
op({ method: 'get', path: '/users/me', operationId: 'getCurrentUser', tags: ['Users'], summary: 'Obtener perfil propio', secured: true, success: { status: 200, schema: envelope(AuthUserResponseSchema) }, errors: [401] });
op({ method: 'patch', path: '/users/me', operationId: 'updateCurrentUser', tags: ['Users'], summary: 'Actualizar perfil propio', secured: true, body: UpdateCurrentUserProfileSchema, success: { status: 200, schema: envelope(AuthUserResponseSchema) }, errors: [400, 401] });
op({ method: 'patch', path: '/users/me/preferred-language', operationId: 'changePreferredLanguage', tags: ['Users'], summary: 'Cambiar idioma preferido', secured: true, body: ChangePreferredLanguageSchema, success: { status: 200, schema: envelope(AuthUserResponseSchema) }, errors: [400, 401] });
op({ method: 'post', path: '/users/me/change-password', operationId: 'changePassword', tags: ['Users'], summary: 'Cambiar contraseña', secured: true, body: ChangePasswordSchema, success: { status: 204 }, errors: [400, 401] });

// ── EVENTS ─────────────────────────────────────────────────────────────────────
op({ method: 'post', path: '/events', operationId: 'createEvent', tags: ['Events'], summary: 'Crear evento (draft)', secured: true, body: CreateEventRequestSchema, success: { status: 201, schema: envelope(EventResponseSchema) }, errors: [400, 401, 403, 404, 422] });
op({ method: 'get', path: '/events', operationId: 'listMyEvents', tags: ['Events'], summary: 'Listar eventos propios', secured: true, query: ListEventsQuerySchema, success: { status: 200, schema: listEnvelope(EventResponseSchema) }, errors: [401, 403, 422] });
op({ method: 'get', path: '/events/{eventId}', operationId: 'getEvent', tags: ['Events'], summary: 'Obtener evento propio', secured: true, params: EventIdParamSchema, success: { status: 200, schema: envelope(EventResponseSchema) }, errors: [401, 403, 404] });
op({ method: 'patch', path: '/events/{eventId}', operationId: 'updateEvent', tags: ['Events'], summary: 'Actualizar evento', secured: true, params: EventIdParamSchema, body: UpdateEventRequestSchema, success: { status: 200, schema: envelope(EventResponseSchema) }, errors: [400, 401, 404, 409, 422] });
op({ method: 'post', path: '/events/{eventId}/activate', operationId: 'activateEvent', tags: ['Events'], summary: 'Activar evento (draft→active)', secured: true, params: EventIdParamSchema, success: { status: 200, schema: envelope(EventResponseSchema) }, errors: [401, 404, 422] });
op({ method: 'post', path: '/events/{eventId}/cancel', operationId: 'cancelEvent', tags: ['Events'], summary: 'Cancelar evento', secured: true, params: EventIdParamSchema, success: { status: 200, schema: envelope(EventResponseSchema) }, errors: [401, 404, 422] });

// ── ADMIN GOVERNANCE — Events (US-016 / PB-P1-010) ─────────────────────────────
op({ method: 'get', path: '/admin/events/{id}', operationId: 'adminGetEvent', tags: ['Admin'], summary: 'Ver evento (admin, read-only, auditado)', secured: true, params: AdminEventIdOpenApiParamSchema, success: { status: 200, schema: envelope(AdminEventReadResponseSchema) }, errors: [400, 401, 403, 404] });
op({ method: 'patch', path: '/admin/events/{id}', operationId: 'adminEventPatchForbidden', tags: ['Admin'], summary: 'Bloqueado: escritura admin no permitida (AC-02)', secured: true, params: AdminEventIdOpenApiParamSchema, success: { status: 403, description: 'FORBIDDEN_WRITE' }, errors: [401, 403] });
op({ method: 'delete', path: '/admin/events/{id}', operationId: 'adminEventDeleteForbidden', tags: ['Admin'], summary: 'Bloqueado: escritura admin no permitida (AC-02)', secured: true, params: AdminEventIdOpenApiParamSchema, success: { status: 403, description: 'FORBIDDEN_WRITE' }, errors: [401, 403] });

// ── QUOTE-FLOW ──────────────────────────────────────────────────────────────────
op({ method: 'get', path: '/events/{eventId}/quote-requests', operationId: 'listEventQuoteRequests', tags: ['QuoteRequests'], summary: 'Listar QuoteRequests del evento', secured: true, params: QfEventIdParamSchema, query: ListQuoteRequestsQuerySchema, success: { status: 200, schema: listEnvelope(QuoteRequestResponseSchema) }, errors: [401, 403, 404, 422] });
op({ method: 'post', path: '/events/{eventId}/quote-requests', operationId: 'createQuoteRequest', tags: ['QuoteRequests'], summary: 'Crear QuoteRequest', secured: true, params: QfEventIdParamSchema, body: CreateQuoteRequestRequestSchema, success: { status: 201, schema: envelope(QuoteRequestResponseSchema) }, errors: [401, 403, 404, 409, 422] });
op({ method: 'get', path: '/quote-requests/{quoteRequestId}', operationId: 'getQuoteRequest', tags: ['QuoteRequests'], summary: 'Obtener QuoteRequest', secured: true, params: QuoteRequestIdParamSchema, success: { status: 200, schema: envelope(QuoteRequestResponseSchema) }, errors: [401, 403, 404] });
// US-056 (PB-P1-034 / BE-005): body opcional `{ reason?: string [0..500] }` + emisión de 2
// Notifications atómicas al vendor por `QuoteEventNotificationService`. Añade 400
// (`INVALID_CANCELLATION_REASON`) y 409 (`QR_NOT_CANCELLABLE`, `QR_HAS_CONFIRMED_BOOKING`).
op({ method: 'patch', path: '/quote-requests/{quoteRequestId}/cancel', operationId: 'cancelQuoteRequest', tags: ['QuoteRequests'], summary: 'Cancelar QuoteRequest (organizer)', secured: true, params: QuoteRequestIdParamSchema, body: CancelQuoteRequestBodySchema, success: { status: 200, schema: envelope(QuoteRequestResponseSchema) }, errors: [400, 401, 403, 404, 409, 422] });
// US-057 (PB-P1-035 / BE-005): comparador de Quotes por categoría (organizer, sólo lectura).
op({ method: 'get', path: '/events/{id}/quotes/compare', operationId: 'compareQuotes', tags: ['QuoteRequests'], summary: 'Comparar Quotes por categoría (organizer)', secured: true, params: CompareQuotesEventIdParamSchema, query: CompareQuotesQuerySchema, success: { status: 200, schema: envelope(CompareQuotesResponseSchema) }, errors: [400, 401, 403, 404] });
op({ method: 'get', path: '/vendors/me/quote-requests', operationId: 'listVendorQuoteRequests', tags: ['QuoteRequests'], summary: 'Listar QuoteRequests asignados (vendor)', secured: true, query: ListQuoteRequestsQuerySchema, success: { status: 200, schema: listEnvelope(QuoteRequestResponseSchema) }, errors: [401, 403, 422] });
op({ method: 'patch', path: '/quote-requests/{quoteRequestId}/viewed', operationId: 'markQuoteRequestViewed', tags: ['QuoteRequests'], summary: 'Marcar QuoteRequest como visto (vendor, legado US-096)', secured: true, params: QuoteRequestIdParamSchema, success: { status: 204 }, errors: [401, 403, 404, 422] });
// US-051 (PB-P1-031): endpoints vendor-scoped detalle + mark-viewed transaccional.
op({ method: 'get', path: '/vendor/quote-requests/{id}', operationId: 'getVendorQuoteRequest', tags: ['QuoteRequests'], summary: 'Detalle de QuoteRequest (vendor)', secured: true, params: Us051IdParamSchema, success: { status: 200, schema: envelope(QuoteRequestResponseSchema) }, errors: [400, 401, 403, 404] });
op({ method: 'post', path: '/vendor/quote-requests/{id}/mark-viewed', operationId: 'markVendorQuoteRequestViewed', tags: ['QuoteRequests'], summary: 'Marcar QuoteRequest como visto transaccional (vendor)', secured: true, params: Us051IdParamSchema, success: { status: 200, schema: envelope(QuoteRequestResponseSchema) }, errors: [400, 401, 403, 404] });
// US-052 (PB-P1-031): respuesta single-shot con Quote + 2 notifications atómicas.
op({ method: 'post', path: '/vendor/quote-requests/{id}/respond', operationId: 'respondVendorQuoteRequest', tags: ['QuoteRequests'], summary: 'Responder QuoteRequest con Quote (single-shot, vendor)', secured: true, params: Us051IdParamSchema, body: RespondQuoteRequestBodySchema, success: { status: 201, schema: envelope(QuoteResponseSchema) }, errors: [400, 401, 403, 404, 409] });
op({ method: 'get', path: '/quote-requests/{quoteRequestId}/quote', operationId: 'getQuoteForRequest', tags: ['Quotes'], summary: 'Obtener el Quote actual del QuoteRequest', secured: true, params: QuoteRequestIdParamSchema, success: { status: 200, schema: envelope(QuoteResponseSchema) }, errors: [401, 403, 404] });
op({ method: 'post', path: '/quote-requests/{quoteRequestId}/quote', operationId: 'createQuote', tags: ['Quotes'], summary: 'Crear Quote draft (vendor)', secured: true, params: QuoteRequestIdParamSchema, body: CreateQuoteRequestBodySchema, success: { status: 201, schema: envelope(QuoteResponseSchema) }, errors: [401, 403, 404, 409, 422] });
op({ method: 'patch', path: '/quotes/{quoteId}', operationId: 'updateQuote', tags: ['Quotes'], summary: 'Editar Quote draft (vendor)', secured: true, params: QuoteIdParamSchema, body: UpdateQuoteRequestBodySchema, success: { status: 200, schema: envelope(QuoteResponseSchema) }, errors: [401, 403, 404, 422] });
op({ method: 'post', path: '/quotes/{quoteId}/send', operationId: 'sendQuote', tags: ['Quotes'], summary: 'Enviar Quote (vendor)', secured: true, params: QuoteIdParamSchema, success: { status: 200, schema: envelope(QuoteResponseSchema) }, errors: [401, 403, 404, 422] });
op({ method: 'post', path: '/quotes/{quoteId}/accept', operationId: 'acceptQuote', tags: ['Quotes'], summary: 'Aceptar Quote (organizer)', secured: true, params: QuoteIdParamSchema, success: { status: 200, schema: envelope(QuoteResponseSchema) }, errors: [401, 403, 404, 410, 422] });
// US-054 (PB-P1-032 / BE-005): body opcional `{ reason?: string [0..500] }` + emisión de 2
// Notifications atómicas al vendor por `QuoteEventNotificationService` (refactor US-056).
// Añade 400 (INVALID_REJECTION_REASON) y 409 (QUOTE_NOT_REJECTABLE) al contrato.
op({ method: 'post', path: '/quotes/{quoteId}/reject', operationId: 'rejectQuote', tags: ['Quotes'], summary: 'Rechazar Quote (organizer)', secured: true, params: QuoteIdParamSchema, body: RejectQuoteBodySchema, success: { status: 200, schema: envelope(QuoteResponseSchema) }, errors: [400, 401, 403, 404, 409, 422] });
// US-058 (PB-P1-035 / BE-004): endpoint legacy — delega en el nuevo UC transaccional con
// `{is_preferred: true}` (DEV-01 del execution record). Reajusta la lista de errores para
// incluir 409 QUOTE_NOT_PREFERABLE que ahora sí puede emitir.
op({ method: 'post', path: '/quotes/{quoteId}/prefer', operationId: 'preferQuote', tags: ['Quotes'], summary: 'Marcar Quote como preferido (organizer, legacy)', secured: true, params: QuoteIdParamSchema, success: { status: 200, schema: envelope(QuoteResponseSchema) }, errors: [401, 403, 404, 409, 422] });
// US-058 (PB-P1-035 / BE-004): endpoint canónico — body `{is_preferred: boolean}` para toggle
// idempotente (AC-01..04) + notifs bilaterales + UNIQUE parcial DB.
op({ method: 'patch', path: '/quotes/{quoteId}/preferred', operationId: 'preferredQuote', tags: ['Quotes'], summary: 'Toggle Quote.is_preferred (organizer)', secured: true, params: QuoteIdParamSchema, body: PreferQuoteBodySchema, success: { status: 200, schema: envelope(QuoteResponseSchema) }, errors: [400, 401, 403, 404, 409] });

// ── BOOKING-INTENT ──────────────────────────────────────────────────────────────
// US-060 (PB-P1-036 / BE-004): endpoint atómico — aceptación de Quote + INSERT BookingIntent +
// 2 Notifications al vendor dentro de una única `prisma.$transaction`. Body snake_case con
// `disclaimer_accepted:true` requerido. Errores: 400 (VALIDATION_ERROR/DISCLAIMER_REQUIRED),
// 401, 403, 404 (QUOTE_NOT_FOUND uniforme), 409 (QUOTE_NOT_ACCEPTABLE/QUOTE_EXPIRED/
// BOOKING_INTENT_ALREADY_EXISTS).
op({ method: 'post', path: '/booking-intents', operationId: 'createBookingIntent', tags: ['BookingIntents'], summary: 'US-060 · Aceptar Quote + crear BookingIntent atómicamente (organizer)', secured: true, body: CreateBookingIntentRequestSchema, success: { status: 201, schema: envelope(BookingIntentResponseSchema) }, errors: [400, 401, 403, 404, 409] });
op({ method: 'get', path: '/booking-intents/{bookingIntentId}', operationId: 'getBookingIntent', tags: ['BookingIntents'], summary: 'Obtener BookingIntent', secured: true, params: BookingIntentIdParamSchema, success: { status: 200, schema: envelope(BookingIntentResponseSchema) }, errors: [401, 403, 404] });
// US-061 (PB-P1-036 / BE-003): confirm atómico + sync cross-domain BudgetItem.committed
// (US-039) + fan-out de 2 notifs al organizer con `event='booking_intent.confirmed'`.
// Idempotente sobre `status='confirmed_intent'` (AC-03).
// US-063 (PB-P1-037 / BE-005 / D1): el body pasa a exigir `{disclaimer_accepted:true}` para paridad
// de enforcement server-side con US-060 (create). Bypass o `false` ⇒ `400 DISCLAIMER_REQUIRED`.
// La UPDATE persiste `disclaimer_accepted_at_confirm` + `disclaimer_copy_version_confirm` como
// audit legal bilateral (Decisiones D2 + D7).
op({ method: 'post', path: '/booking-intents/{bookingIntentId}/confirm', operationId: 'confirmBookingIntent', tags: ['BookingIntents'], summary: 'US-061/US-063 · Confirmar BookingIntent (vendor asignado) + UPDATE committed + disclaimer audit bilateral', secured: true, params: BookingIntentIdParamSchema, body: ConfirmBookingIntentBodySchema, success: { status: 200, schema: envelope(BookingIntentResponseSchema) }, errors: [400, 401, 403, 404, 409] });
// US-062 (PB-P1-036 / BE-003+005): cancel bilateral (organizer o vendor) + revert atómico
// condicional del `BudgetItem.committed` (US-039 revert) + fan-out de 2 notifs a la contraparte
// con `event='booking_intent.cancelled'`. Body opcional `{reason?:string(0..500)}`.
op({ method: 'post', path: '/booking-intents/{bookingIntentId}/cancel', operationId: 'cancelBookingIntent', tags: ['BookingIntents'], summary: 'US-062 · Cancelar BookingIntent (bilateral) + revert committed condicional', secured: true, params: BookingIntentIdParamSchema, body: CancelBookingIntentRequestSchema, success: { status: 200, schema: envelope(BookingIntentResponseSchema) }, errors: [400, 401, 403, 404, 409] });

// ── REVIEWS (ORGANIZER) ──────────────────────────────────────────────────────
// US-065 (PB-P1-038 / BE-004): creación atómica de Review verificada — 1 tx: INSERT review +
// UPDATE denormalize VendorProfile + 2 notifs review.published al vendor + log observability.
// 401, 403 (FORBIDDEN | REVIEW_NOT_ELIGIBLE con reason ∈ {no_booking, event_not_completed,
// window_expired, already_reviewed}), 404 RESOURCE_NOT_FOUND uniforme, 400 VALIDATION_ERROR.
op({ method: 'post', path: '/organizer/reviews', operationId: 'createOrganizerReview', tags: ['Reviews'], summary: 'US-065 · Crear Review verificada + denormalize atómico + notif vendor', secured: true, body: CreateReviewRequestSchema, success: { status: 201, schema: envelope(ReviewResponseSchema) }, errors: [400, 401, 403, 404] });

// ── AI ASSISTANCE ────────────────────────────────────────────────────────────────
const AiGenerationResponse = envelope(
  z
    .object({
      recommendationId: z.string().uuid(),
      type: z.string(),
      status: z.string(),
      output: z.record(z.unknown()),
      aiMeta: AiMeta,
      createdAt: z.string().datetime(),
    })
    .strict(),
);
const AiDetailResponse = envelope(
  z
    .object({
      recommendationId: z.string().uuid(),
      type: z.string(),
      status: z.string(),
      eventId: z.string().uuid().nullable(),
      vendorProfileId: z.string().uuid().nullable(),
      quoteRequestId: z.string().uuid().nullable(),
      input: z.record(z.unknown()),
      output: z.record(z.unknown()),
      aiMeta: AiMeta.nullable(),
      createdAt: z.string().datetime(),
    })
    .strict(),
);

for (const [path, opId, summary] of [
  ['event-plan', 'aiGenerateEventPlan', 'Generar plan de evento (AI-001)'],
  ['checklist', 'aiGenerateChecklist', 'Generar checklist (AI-002)'],
  ['budget-suggestion', 'aiGenerateBudgetSuggestion', 'Generar sugerencia de presupuesto (AI-003)'],
  ['vendor-categories', 'aiRecommendVendorCategories', 'Recomendar categorías de vendor (AI-004)'],
  ['quote-brief', 'aiGenerateQuoteBrief', 'Generar quote brief (AI-005)'],
  ['task-prioritization', 'aiPrioritizeTasks', 'Priorizar tareas (AI-008)'],
] as const) {
  op({ method: 'post', path: `/events/{eventId}/ai/${path}`, operationId: opId, tags: ['AI'], summary, secured: true, params: AiEventIdParamSchema, body: AiBaseRequestSchema, success: { status: 200, schema: AiGenerationResponse }, errors: [400, 401, 403, 404, 422, 429, 503] });
}
op({ method: 'post', path: '/quote-requests/{quoteRequestId}/ai/comparison-summary', operationId: 'aiCompareQuotes', tags: ['AI'], summary: 'Generar comparación de cotizaciones (AI-006)', secured: true, params: AiQuoteRequestIdParamSchema, body: AiBaseRequestSchema, success: { status: 200, schema: AiGenerationResponse }, errors: [400, 401, 403, 404, 422, 429, 503] });
op({ method: 'post', path: '/vendors/me/ai/bio', operationId: 'aiGenerateVendorBio', tags: ['AI'], summary: 'Generar bio de vendor (AI-007)', secured: true, body: AiBaseRequestSchema, success: { status: 200, schema: AiGenerationResponse }, errors: [400, 401, 403, 422, 429, 503] });
op({ method: 'get', path: '/ai-recommendations/{aiRecommendationId}', operationId: 'getAiRecommendation', tags: ['AI'], summary: 'Obtener AIRecommendation', secured: true, params: AiRecommendationIdParamSchema, success: { status: 200, schema: AiDetailResponse }, errors: [401, 403, 404] });
op({ method: 'post', path: '/ai-recommendations/{aiRecommendationId}/apply', operationId: 'applyAiRecommendation', tags: ['AI'], summary: 'Aplicar AIRecommendation (human-in-the-loop)', secured: true, params: AiRecommendationIdParamSchema, body: ApplyAiRecommendationSchema, success: { status: 200, schema: AiDetailResponse }, errors: [401, 403, 404, 422] });
op({ method: 'post', path: '/ai-recommendations/{aiRecommendationId}/discard', operationId: 'discardAiRecommendation', tags: ['AI'], summary: 'Descartar AIRecommendation', secured: true, params: AiRecommendationIdParamSchema, success: { status: 204 }, errors: [401, 403, 404, 422] });

// ── Documento ────────────────────────────────────────────────────────────────
export const OPENAPI_TAGS = ['Auth', 'Users', 'Events', 'QuoteRequests', 'Quotes', 'BookingIntents', 'AI'] as const;

export function buildOpenApiDocument(): Record<string, unknown> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'EventFlow REST API',
      version: '1.0.0',
      description:
        'Contrato REST MVP de EventFlow bajo /api/v1 (PB-P0-004). Snapshot generado desde schemas Zod (US-098). Fuente canónica: backend/openapi.json.',
    },
    servers: [{ url: '/', description: 'Host root (los paths incluyen el prefijo /api/v1)' }],
    tags: OPENAPI_TAGS.map((name) => ({ name })),
    security: [],
  }) as unknown as Record<string, unknown>;
}

/** Ordena claves de objetos recursivamente para una salida byte-estable (determinismo, AC-01). */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) sorted[key] = sortKeysDeep(obj[key]);
    return sorted;
  }
  return value;
}

/** Serializa el documento de forma determinista (claves ordenadas, 2 espacios, newline final). */
export function serializeOpenApiDocument(doc: Record<string, unknown>): string {
  return `${JSON.stringify(sortKeysDeep(doc), null, 2)}\n`;
}
