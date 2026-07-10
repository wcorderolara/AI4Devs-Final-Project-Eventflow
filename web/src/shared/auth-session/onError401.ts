import type { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';

const PROTECTED_PREFIXES = ['/organizer', '/vendor', '/admin'];

export interface OnError401Deps {
  queryClient: QueryClient;
  redirect: (to: string) => void;
  pathname: string;
  search?: string;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Handler global del `QueryCache.onError` (AC-06):
 * - 401 sobre query distinta de `['me']` → invalida `['me']`, limpia cache (SEC-10) y redirige a
 *   `/login?from=<path>` **solo** si el path está en `(app)`/`(admin)`.
 * - 401 sobre `['me']` → sesión anónima, sin redirect (evita loop).
 * - 403 → solo log dev (la guarda UX del middleware US-105 ya cubre).
 */
export function handleQueryError(
  error: unknown,
  query: { queryKey: readonly unknown[] },
  deps: OnError401Deps,
): void {
  if (!(error instanceof ApiError)) return;

  const queryKey = query.queryKey;
  const isMeQuery = Array.isArray(queryKey) && queryKey[0] === 'me';

  if (error.status === 401) {
    if (isMeQuery) return;
    deps.queryClient.invalidateQueries({ queryKey: ['me'] });
    deps.queryClient.clear();
    if (isProtectedPath(deps.pathname)) {
      const from = encodeURIComponent(deps.pathname + (deps.search ?? ''));
      deps.redirect(`/login?from=${from}`);
    }
    return;
  }

  if (error.status === 403 && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('queryClient.403', { pathname: deps.pathname });
  }
}
