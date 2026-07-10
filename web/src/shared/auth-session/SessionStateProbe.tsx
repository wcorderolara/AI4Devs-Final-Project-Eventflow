'use client';

import { useSession } from './useSession';

/**
 * Sonda de estado de sesión para E2E/demo (US-106 AC-10). Expone el estado de `useSession()` vía
 * `data-testid` sin UI visible (`sr-only`). Los layouts reales por rol llegan en US-107.
 */
export function SessionStateProbe(): React.JSX.Element {
  const { isAuthenticated, isLoading, role } = useSession();
  const state = isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'anonymous';
  return (
    <div className="sr-only">
      <span data-testid="session-state">{state}</span>
      <span data-testid="session-role">{role ?? ''}</span>
    </div>
  );
}
