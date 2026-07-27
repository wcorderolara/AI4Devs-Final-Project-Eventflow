// Auditoría axe-core del shell autenticado ya compuesto (no de las primitivas por separado, que
// cubre `design-system-navigation-feedback.axe.test.tsx`).
//
// Aquí interesa lo que sólo se ve al montarlo entero: los landmarks del shell conviviendo en la
// misma página, la sidebar con su nombre accesible por rol y el drawer abierto sobre el resto.
// Se audita con los tres roles porque la estructura de navegación cambia (plana vs. agrupada).
//
// Umbral: 0 violaciones `critical` (US-131 / OPS-001).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import type { SessionState } from '@/shared/auth-session';
import type { Role } from '@/shared/authorization';
import { AuthenticatedShell } from '@/shared/navigation';
import commonEs from '@/messages/es-LATAM/common.json';
import navigationEs from '@/messages/es-LATAM/navigation.json';
import { auditA11y, formatViolations } from './helpers/axe';

const pathname = vi.hoisted(() => ({ value: '/organizer' }));
const useSessionMock = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/shared/auth-session', () => ({
  useSession: useSessionMock,
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/shared/auth-session/useSession', () => ({ useSession: useSessionMock }));

const MESSAGES = { navigation: navigationEs, common: commonEs };

function renderShell(role: Role, path: string) {
  pathname.value = path;
  useSessionMock.mockReturnValue({
    user: { id: 'u1', email: 'ana@example.com', displayName: 'Ana' },
    role,
    isAuthenticated: true,
    isLoading: false,
    isError: false,
    refetch: () => {},
  } satisfies SessionState);

  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <NextIntlClientProvider locale="es-LATAM" messages={MESSAGES}>
        <AuthenticatedShell initialRole={role} mainClassName="p-6">
          <h1>Panel</h1>
        </AuthenticatedShell>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const CASES: Array<[Role, string]> = [
  ['organizer', '/organizer/events'],
  ['vendor', '/vendor/quotes'],
  ['admin', '/admin/metrics'],
];

describe('a11y — shell autenticado', () => {
  it.each(CASES)('%s: sin violaciones críticas en desktop', async (role, path) => {
    const { container } = renderShell(role, path);
    const { critical } = await auditA11y(container);
    expect(critical, formatViolations(critical)).toEqual([]);
  });

  it.each(CASES)('%s: sin violaciones críticas con el drawer abierto', async (role, path) => {
    renderShell(role, path);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    // El panel del drawer se monta en un portal fuera de `container`: se audita el documento.
    const { critical } = await auditA11y(document.body);
    expect(critical, formatViolations(critical)).toEqual([]);
  });
});
