// Registry de endpoints protegidos foundation (US-112 / BE-001). PB-P0-008; VR-01/VR-06.
// Lista EXPLÍCITA y revisable de rutas bajo `/api/v1/*` que exigen sesión válida. Un anónimo debe
// recibir 401 en TODAS ellas (sweep de QA-001). El campo `control` documenta el tipo de restricción
// (auth/role/ownership/assignment) para review; el sweep anónimo sólo depende de `auth`.
//
// EXCLUIDOS (públicos, VR-06): `POST /auth/register|login|password/reset-request|password/reset`
// y `GET /health`. No existen endpoints `/api/v1/admin/*` foundation montados (ver US-112 §AC-05).

export type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';
export type ControlType =
  | 'auth'
  | 'role:organizer'
  | 'role:vendor'
  | 'role:owner'
  | 'role:admin'
  | 'ownership'
  | 'assignment';

export interface ProtectedEndpoint {
  method: HttpMethod;
  /** Path bajo `/api/v1` con placeholders resueltos a un UUID de prueba. */
  path: string;
  control: ControlType;
  module: string;
}

/** UUID placeholder para params de ruta (el anónimo es rechazado por auth antes de usarlo). */
export const PLACEHOLDER_ID = '00000000-0000-4000-8000-000000000000';

const id = PLACEHOLDER_ID;

export const PROTECTED_ENDPOINTS: ProtectedEndpoint[] = [
  // ── identity-access (perfil de sesión) ──
  { method: 'post', path: '/api/v1/auth/logout', control: 'auth', module: 'identity-access' },
  // ── user-profile ──
  { method: 'get', path: '/api/v1/users/me', control: 'auth', module: 'user-profile' },
  { method: 'patch', path: '/api/v1/users/me', control: 'auth', module: 'user-profile' },
  { method: 'patch', path: '/api/v1/users/me/preferred-language', control: 'auth', module: 'user-profile' },
  { method: 'post', path: '/api/v1/users/me/change-password', control: 'auth', module: 'user-profile' },
  // ── event-planning (organizer + ownership) ──
  { method: 'post', path: '/api/v1/events', control: 'role:organizer', module: 'event-planning' },
  { method: 'get', path: '/api/v1/events', control: 'role:organizer', module: 'event-planning' },
  { method: 'get', path: `/api/v1/events/${id}`, control: 'ownership', module: 'event-planning' },
  { method: 'patch', path: `/api/v1/events/${id}`, control: 'ownership', module: 'event-planning' },
  { method: 'post', path: `/api/v1/events/${id}/activate`, control: 'ownership', module: 'event-planning' },
  { method: 'post', path: `/api/v1/events/${id}/cancel`, control: 'ownership', module: 'event-planning' },
  // ── quote-flow (organizer ownership + vendor assignment) ──
  { method: 'get', path: `/api/v1/events/${id}/quote-requests`, control: 'ownership', module: 'quote-flow' },
  { method: 'post', path: `/api/v1/events/${id}/quote-requests`, control: 'ownership', module: 'quote-flow' },
  { method: 'get', path: '/api/v1/vendors/me/quote-requests', control: 'role:vendor', module: 'quote-flow' },
  { method: 'get', path: `/api/v1/quote-requests/${id}`, control: 'ownership', module: 'quote-flow' },
  { method: 'patch', path: `/api/v1/quote-requests/${id}/cancel`, control: 'ownership', module: 'quote-flow' },
  { method: 'patch', path: `/api/v1/quote-requests/${id}/viewed`, control: 'assignment', module: 'quote-flow' },
  { method: 'get', path: `/api/v1/quote-requests/${id}/quote`, control: 'assignment', module: 'quote-flow' },
  { method: 'post', path: `/api/v1/quote-requests/${id}/quote`, control: 'assignment', module: 'quote-flow' },
  { method: 'patch', path: `/api/v1/quotes/${id}`, control: 'assignment', module: 'quote-flow' },
  { method: 'post', path: `/api/v1/quotes/${id}/send`, control: 'assignment', module: 'quote-flow' },
  { method: 'post', path: `/api/v1/quotes/${id}/accept`, control: 'ownership', module: 'quote-flow' },
  { method: 'post', path: `/api/v1/quotes/${id}/reject`, control: 'ownership', module: 'quote-flow' },
  { method: 'post', path: `/api/v1/quotes/${id}/prefer`, control: 'ownership', module: 'quote-flow' },
  // ── booking-intent ──
  { method: 'post', path: '/api/v1/booking-intents', control: 'ownership', module: 'booking-intent' },
  { method: 'get', path: `/api/v1/booking-intents/${id}`, control: 'ownership', module: 'booking-intent' },
  { method: 'post', path: `/api/v1/booking-intents/${id}/confirm`, control: 'ownership', module: 'booking-intent' },
  { method: 'post', path: `/api/v1/booking-intents/${id}/cancel`, control: 'ownership', module: 'booking-intent' },
  // ── ai-assistance (auth + role + ownership/assignment antes de LLMProvider) ──
  { method: 'post', path: `/api/v1/events/${id}/ai/event-plan`, control: 'ownership', module: 'ai-assistance' },
  { method: 'post', path: `/api/v1/events/${id}/ai/checklist`, control: 'ownership', module: 'ai-assistance' },
  { method: 'post', path: `/api/v1/events/${id}/ai/budget-suggestion`, control: 'ownership', module: 'ai-assistance' },
  { method: 'post', path: `/api/v1/events/${id}/ai/vendor-categories`, control: 'ownership', module: 'ai-assistance' },
  { method: 'post', path: `/api/v1/events/${id}/ai/quote-brief`, control: 'ownership', module: 'ai-assistance' },
  { method: 'post', path: `/api/v1/events/${id}/ai/task-prioritization`, control: 'ownership', module: 'ai-assistance' },
  { method: 'post', path: `/api/v1/quote-requests/${id}/ai/comparison-summary`, control: 'ownership', module: 'ai-assistance' },
  { method: 'post', path: '/api/v1/vendors/me/ai/bio', control: 'role:vendor', module: 'ai-assistance' },
  { method: 'get', path: `/api/v1/ai-recommendations/${id}`, control: 'role:owner', module: 'ai-assistance' },
  { method: 'post', path: `/api/v1/ai-recommendations/${id}/apply`, control: 'role:owner', module: 'ai-assistance' },
  { method: 'post', path: `/api/v1/ai-recommendations/${id}/discard`, control: 'role:owner', module: 'ai-assistance' },
  // ── admin-governance (US-016 / PB-P1-010) ──
  { method: 'get', path: `/api/v1/admin/events/${id}`, control: 'role:admin' as const, module: 'admin-governance' },
];

/** Rutas públicas documentadas (NO deben incluirse como protegidas; VR-06). */
export const PUBLIC_ENDPOINTS: { method: HttpMethod; path: string }[] = [
  { method: 'get', path: '/health' },
  { method: 'post', path: '/api/v1/auth/register' },
  { method: 'post', path: '/api/v1/auth/login' },
  { method: 'post', path: '/api/v1/auth/password/reset-request' },
  { method: 'post', path: '/api/v1/auth/password/reset' },
];
