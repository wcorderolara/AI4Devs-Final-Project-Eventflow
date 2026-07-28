// US-140 (PB-P3-001) — Tests de integración del panel de reset surgical del entorno Demo.
//
// Cubre (QA-001/QA-002, con MSW real sobre el httpClient → hooks → componentes):
//   - EC-01/THR-012: 404 del backend (flag off) → control oculto + aviso neutro; NO revela el
//     endpoint ni el flag `SEED_DEMO_ENABLED` (no se muestra `errors.statusLoad`).
//   - AC-01: estado Demo → render de conteos + control de reset visible.
//   - AC-01/AC-03: flujo confirmar → `202` + `ResetReport` con `correlationId` visible.
//   - VR-02: confirmación explícita obligatoria (submit bloqueado hasta escribir el token).
//   - EC-02/EC-03: `409` → mensaje "reset en curso" localizado + `correlationId`, sin filtrar el
//     texto crudo del backend.
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/tests/msw/server';
import esLatamAdmin from '@/messages/es-LATAM/admin.json';
import { SeedDemoPanel } from '@/features/admin/seed';

const seed = esLatamAdmin.seed;
const messages = { admin: esLatamAdmin };

const STATUS_URL = '*/api/v1/admin/seed/status';
const RESET_URL = '*/api/v1/admin/seed/reset';

const STATUS_OK = {
  data: {
    lastRunAt: '2026-07-20T10:00:00.000Z',
    preset: 'full',
    recordCount: { Event: 3, User: 5 },
  },
  meta: { correlationId: 'corr-status', timestamp: '2026-07-20T10:00:00.000Z' },
};

const RESET_REPORT = {
  entitiesDeleted: { Event: 3 },
  entitiesReseeded: { Event: 3 },
  seedVersion: 'seed-v1',
  correlationId: 'corr-reset-123',
  durationMs: 842,
};

function withProviders(node: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="es-LATAM" messages={messages} timeZone="UTC">
        {node}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

async function openDialogAndConfirm(): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: seed.actions.reset }));
  const confirmInput = await screen.findByLabelText(/para confirmar/i);
  await user.type(confirmInput, 'RESET');
  await user.click(screen.getByRole('button', { name: seed.reset.confirm }));
  return user;
}

afterEach(() => cleanup());

describe('US-140 · SeedDemoPanel', () => {
  it('EC-01/THR-012: 404 oculta el control y muestra aviso neutro sin revelar el endpoint', async () => {
    server.use(
      http.get(STATUS_URL, () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Not Found' } }, { status: 404 }),
      ),
    );

    render(withProviders(<SeedDemoPanel />));

    expect(await screen.findByText(seed.unavailable.title)).toBeInTheDocument();
    // El control de reset NO se expone fuera de Demo.
    expect(screen.queryByRole('button', { name: seed.actions.reset })).not.toBeInTheDocument();
    // No se filtra el mensaje que revela `SEED_DEMO_ENABLED`.
    expect(screen.queryByText(seed.errors.statusLoad)).not.toBeInTheDocument();
  });

  it('AC-01: en Demo renderiza conteos y expone el control de reset', async () => {
    server.use(http.get(STATUS_URL, () => HttpResponse.json(STATUS_OK)));

    render(withProviders(<SeedDemoPanel />));

    expect(await screen.findByRole('button', { name: seed.actions.reset })).toBeInTheDocument();
    expect(await screen.findByText('User')).toBeInTheDocument();
    expect(screen.getByText('Event')).toBeInTheDocument();
  });

  it('AC-01/AC-03: confirmar dispara el reset y muestra el reporte con correlationId', async () => {
    server.use(http.get(STATUS_URL, () => HttpResponse.json(STATUS_OK)));
    server.use(
      http.post(RESET_URL, () =>
        HttpResponse.json(
          { data: RESET_REPORT, meta: { correlationId: 'corr-reset-123', timestamp: 'x' } },
          { status: 202 },
        ),
      ),
    );

    render(withProviders(<SeedDemoPanel />));
    await openDialogAndConfirm();

    expect(await screen.findByText(seed.report.title)).toBeInTheDocument();
    expect(screen.getByText(/corr-reset-123/)).toBeInTheDocument();
  });

  it('VR-02: el submit está bloqueado hasta escribir el token de confirmación', async () => {
    server.use(http.get(STATUS_URL, () => HttpResponse.json(STATUS_OK)));

    render(withProviders(<SeedDemoPanel />));
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: seed.actions.reset }));

    const submit = screen.getByRole('button', { name: seed.reset.confirm });
    expect(submit).toBeDisabled();

    await user.type(await screen.findByLabelText(/para confirmar/i), 'RESET');
    expect(submit).toBeEnabled();
  });

  it('EC-02/EC-03: 409 muestra "reset en curso" localizado + correlationId, sin texto crudo', async () => {
    server.use(http.get(STATUS_URL, () => HttpResponse.json(STATUS_OK)));
    server.use(
      http.post(RESET_URL, () =>
        HttpResponse.json(
          { error: { code: 'seed_reset_in_progress', message: 'raw backend message' } },
          { status: 409, headers: { 'X-Correlation-Id': 'corr-409' } },
        ),
      ),
    );

    render(withProviders(<SeedDemoPanel />));
    await openDialogAndConfirm();

    expect(await screen.findByText(seed.reset.errorInProgress)).toBeInTheDocument();
    expect(screen.getByText(/corr-409/)).toBeInTheDocument();
    // No se filtra el mensaje crudo del backend (SEC-04 / EC-03).
    expect(screen.queryByText(/raw backend message/)).not.toBeInTheDocument();
  });
});
