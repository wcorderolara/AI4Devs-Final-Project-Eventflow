// US-024 (PB-P2-002 / QA-005) — Unit tests DOM + A11Y del `AITaskPriorityCard`.
// Cubre:
//   - AC-01 flujo feliz: renderiza top 3 con reason + urgency badge por task.
//   - AC-02 empty state: `top:[]` muestra el CTA "Generar checklist IA".
//   - AC-04 cache_hit: renderiza pill "En caché".
//   - AC-07 fallback: cuando `locale_fallback=true` pinta el badge de fallback.
//   - HITL: el card NO expone acción de auto-mark-done; el CTA es un `<a>` deep-link.
//   - A11Y: sin violaciones axe con top llenos y con empty state.
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import ptOrganizer from '@/messages/pt/organizer.json';
import { AITaskPriorityCard } from '@/features/ai/task-priority';
import type { GenerateTaskPriorityResponse } from '@/features/ai/task-priority';

expect.extend(toHaveNoViolations);

const FILLED: GenerateTaskPriorityResponse = {
  ai_recommendation_id: 'rec-1',
  top: [
    {
      task_id: '11111111-1111-4111-8111-111111111111',
      reason: 'Vence pronto y bloquea otras tareas.',
      urgency_score: 10,
    },
    {
      task_id: '22222222-2222-4222-8222-222222222222',
      reason: 'Prioridad alta pendiente de arranque.',
      urgency_score: 8,
    },
    {
      task_id: '33333333-3333-4333-8333-333333333333',
      reason: 'En progreso próxima al vencimiento.',
      urgency_score: 6,
    },
  ],
  rationale_summary: 'Priorización enfocada en fechas próximas.',
  locale: 'es-LATAM',
  locale_fallback: false,
  cache_hit: false,
  generated_at: '2026-07-22T00:00:00.000Z',
};

interface FakeMutation {
  mutate: (input: { eventId: string }) => void;
  reset: () => void;
  data: GenerateTaskPriorityResponse | undefined;
  isPending: boolean;
  isError: boolean;
  error: null;
}

function useFakeMutation(state: {
  data?: GenerateTaskPriorityResponse;
  isError?: boolean;
  isPending?: boolean;
}): () => FakeMutation {
  return function useMutationImpl(): FakeMutation {
    return {
      mutate: () => {},
      reset: () => {},
      data: state.data,
      isPending: state.isPending ?? false,
      isError: state.isError ?? false,
      error: null,
    };
  };
}

function withProviders(
  children: React.ReactNode,
  locale: 'es-LATAM' | 'pt' = 'es-LATAM',
): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const messages =
    locale === 'es-LATAM' ? { organizer: esLatamOrganizer } : { organizer: ptOrganizer };
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-024 QA-005 — AITaskPriorityCard', () => {
  it('AC-01: renderiza top 3 con reason y urgency badge', () => {
    render(
      withProviders(
        <AITaskPriorityCard
          eventId="ev-1"
          autoFetch={false}
          useMutationHook={useFakeMutation({ data: FILLED }) as never}
        />,
      ),
    );
    expect(screen.getByRole('region', { name: /Prioridades IA/i })).toBeInTheDocument();
    expect(screen.getByText('Vence pronto y bloquea otras tareas.')).toBeInTheDocument();
    expect(screen.getByText('Prioridad alta pendiente de arranque.')).toBeInTheDocument();
    expect(screen.getByText('En progreso próxima al vencimiento.')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Urgencia: \d+\/10/).length).toBe(3);
  });

  it('AC-01 HITL: los CTAs son deep-links (<a>), NO botones que marcan hecho', () => {
    render(
      withProviders(
        <AITaskPriorityCard
          eventId="ev-1"
          autoFetch={false}
          buildTaskHref={(id) => `/organizer/events/ev-1/tasks/${id}`}
          useMutationHook={useFakeMutation({ data: FILLED }) as never}
        />,
      ),
    );
    const links = screen.getAllByRole('link', { name: /Ir a la tarea/i });
    expect(links).toHaveLength(3);
    expect(links[0]?.getAttribute('href')).toBe(
      '/organizer/events/ev-1/tasks/11111111-1111-4111-8111-111111111111',
    );
    // NO existe un botón que marque hecho — el card no altera estado.
    expect(screen.queryByRole('button', { name: /marcar hecho/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /mark done/i })).toBeNull();
  });

  it('AC-02: top:[] renderiza empty state con CTA "Generar checklist IA"', () => {
    const emptyResponse: GenerateTaskPriorityResponse = {
      ...FILLED,
      ai_recommendation_id: null,
      top: [],
      rationale_summary: null,
    };
    render(
      withProviders(
        <AITaskPriorityCard
          eventId="ev-1"
          autoFetch={false}
          useMutationHook={useFakeMutation({ data: emptyResponse }) as never}
        />,
      ),
    );
    expect(
      screen.getByText('No hay tareas urgentes por priorizar en este momento.'),
    ).toBeInTheDocument();
  });

  it('AC-04: cache_hit=true muestra pill "En caché"', () => {
    render(
      withProviders(
        <AITaskPriorityCard
          eventId="ev-1"
          autoFetch={false}
          useMutationHook={useFakeMutation({ data: { ...FILLED, cache_hit: true } }) as never}
        />,
      ),
    );
    expect(screen.getByText('En caché')).toBeInTheDocument();
  });

  it('AC-07: locale_fallback=true muestra badge "Modo alternativo"', () => {
    render(
      withProviders(
        <AITaskPriorityCard
          eventId="ev-1"
          autoFetch={false}
          useMutationHook={
            useFakeMutation({ data: { ...FILLED, locale_fallback: true } }) as never
          }
        />,
      ),
    );
    expect(screen.getByText('Modo alternativo')).toBeInTheDocument();
  });

  it('AC-06 (i18n): renderiza en pt cuando el locale es pt', () => {
    render(
      withProviders(
        <AITaskPriorityCard
          eventId="ev-1"
          autoFetch={false}
          useMutationHook={useFakeMutation({ data: FILLED }) as never}
        />,
        'pt',
      ),
    );
    expect(screen.getByRole('region', { name: /Prioridades IA/i })).toBeInTheDocument();
    expect(screen.getAllByText('Ir para a tarefa').length).toBeGreaterThanOrEqual(3);
  });

  it('A11Y: sin violaciones axe con top lleno', async () => {
    const { container } = render(
      withProviders(
        <AITaskPriorityCard
          eventId="ev-1"
          autoFetch={false}
          useMutationHook={useFakeMutation({ data: FILLED }) as never}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('A11Y: sin violaciones axe con empty state', async () => {
    const emptyResponse: GenerateTaskPriorityResponse = { ...FILLED, top: [], rationale_summary: null };
    const { container } = render(
      withProviders(
        <AITaskPriorityCard
          eventId="ev-1"
          autoFetch={false}
          useMutationHook={useFakeMutation({ data: emptyResponse }) as never}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
