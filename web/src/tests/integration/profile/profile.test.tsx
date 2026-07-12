// US-006 / US-007 — feature profile: ver perfil (AC-01), editar datos básicos (AC-02), cambiar
// idioma con aplicación inmediata (US-007 AC-01/AC-02), cambiar contraseña (AC-04) incluyendo
// validación de confirmación cliente y error 401 = contraseña actual incorrecta (EC-02) + axe.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from '@/features/profile';
import esLatamNavigation from '@/messages/es-LATAM/navigation.json';
import esLatamProfile from '@/messages/es-LATAM/profile.json';
import { authenticatedMeHandler } from '@/tests/msw/handlers/profile';
import { server } from '@/tests/msw/server';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn() }),
}));

afterEach(() => {
  refresh.mockClear();
});

function renderProfile() {
  server.use(authenticatedMeHandler);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider
      locale="es-LATAM"
      messages={{ profile: esLatamProfile, navigation: esLatamNavigation }}
    >
      <QueryClientProvider client={queryClient}>
        <ProfilePage />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('US-006 — ver y editar perfil', () => {
  it('AC-01: renderiza el perfil con email de solo lectura', async () => {
    renderProfile();
    expect(await screen.findByDisplayValue('Ana Pérez')).toBeInTheDocument();
    const email = screen.getByLabelText('Correo electrónico') as HTMLInputElement;
    expect(email.value).toBe('ana@eventflow.test');
    expect(email).toHaveAttribute('readonly');
  });

  it('AC-02: editar el nombre muestra el aviso de éxito', async () => {
    const user = userEvent.setup();
    renderProfile();
    const name = await screen.findByLabelText('Nombre');
    await user.clear(name);
    await user.type(name, 'Ana María');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Perfil actualizado.')).toBeInTheDocument();
  });

  it('AC-04: contraseñas que no coinciden bloquean el submit (validación cliente)', async () => {
    const user = userEvent.setup();
    renderProfile();
    await screen.findByLabelText('Nombre');
    await user.type(screen.getByLabelText('Contraseña actual'), 'actual12345');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'nuevaClave12');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'distinta9999');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  });

  it('AC-04/EC-02: 401 en change-password → mensaje de contraseña actual incorrecta', async () => {
    server.use(
      http.post('*/api/v1/users/me/change-password', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }, meta: { correlationId: 'r' } },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderProfile();
    await screen.findByLabelText('Nombre');
    await user.type(screen.getByLabelText('Contraseña actual'), 'malaClave12');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'nuevaClave12');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nuevaClave12');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña actual es incorrecta.');
  });
});

describe('US-007 — cambio inmediato de idioma', () => {
  it('AC-02: seleccionar otro idioma persiste y refresca la UI', async () => {
    const user = userEvent.setup();
    renderProfile();
    const select = (await screen.findByLabelText('Idioma preferido')) as HTMLSelectElement;
    await user.selectOptions(select, 'en');
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(document.cookie).toContain('eventflow_locale=en');
  });
});

describe('US-006 QA — accesibilidad', () => {
  it('sin violaciones críticas/serias de axe', async () => {
    const { container } = renderProfile();
    await screen.findByLabelText('Nombre');
    const results = await axe(container);
    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });
});
