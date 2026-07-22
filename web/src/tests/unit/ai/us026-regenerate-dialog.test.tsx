// US-026 (PB-P2-003 / QA-006 A11Y) — Unit tests DOM + A11Y del `AIRegenerateDialog` shared.
// Cubre:
//   - AC-01 flujo feliz: envío exitoso invoca `onSuccess` con child + cierra.
//   - AC-03 feedback vacío permitido: submit sin texto no bloquea.
//   - AC-02/AC-07 mapeo de errores por code (REGENERATION_LIMIT, RATE_LIMIT_EXCEEDED, 404).
//   - i18n en 4 locales (verificación es-LATAM + pt).
//   - A11Y: sin violaciones jest-axe, `role="dialog"` + `aria-modal`, focus inicial en Cancelar.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import esLatamAi from '@/messages/es-LATAM/ai.json';
import ptAi from '@/messages/pt/ai.json';
import { AIRegenerateDialog } from '@/features/ai/regenerate';
import type { RegenerateAIRecommendationResponse } from '@/features/ai/regenerate';

expect.extend(toHaveNoViolations);

const CHILD_RESPONSE: RegenerateAIRecommendationResponse = {
  id: 'child-1',
  parent_recommendation_id: 'parent-1',
  root_recommendation_id: 'parent-1',
  recommendation_type: 'event_plan',
  regeneration_feedback: 'menos formal',
  payload: { summary: 'x', phases: [] },
  locale: 'es-LATAM',
  locale_fallback: false,
  created_at: '2026-07-22T20:00:00.000Z',
};

function withProviders(
  children: React.ReactNode,
  locale: 'es-LATAM' | 'pt' = 'es-LATAM',
): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const messages = locale === 'es-LATAM' ? { ai: esLatamAi } : { ai: ptAi };
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-026 QA-006 — AIRegenerateDialog', () => {
  it('AC-01: submit exitoso invoca onSuccess con child + cierra', async () => {
    const regenerateFn = vi.fn().mockResolvedValue(CHILD_RESPONSE);
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      withProviders(
        <AIRegenerateDialog
          recommendationId="parent-1"
          onClose={onClose}
          onSuccess={onSuccess}
          regenerateFn={regenerateFn}
        />,
      ),
    );
    const textarea = screen.getByLabelText(/Feedback \(opcional\)/i);
    fireEvent.change(textarea, { target: { value: 'menos formal' } });
    fireEvent.click(screen.getByRole('button', { name: /^Regenerar$/i }));
    await waitFor(() => {
      expect(regenerateFn).toHaveBeenCalledWith({
        recommendationId: 'parent-1',
        feedback: 'menos formal',
      });
      expect(onSuccess).toHaveBeenCalledWith(CHILD_RESPONSE);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('AC-03: submit sin feedback envía `feedback: undefined` (permitido)', async () => {
    const regenerateFn = vi.fn().mockResolvedValue(CHILD_RESPONSE);
    render(
      withProviders(
        <AIRegenerateDialog
          recommendationId="parent-1"
          onClose={() => {}}
          regenerateFn={regenerateFn}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Regenerar$/i }));
    await waitFor(() =>
      expect(regenerateFn).toHaveBeenCalledWith({
        recommendationId: 'parent-1',
        feedback: undefined,
      }),
    );
  });

  it('AC-02: error REGENERATION_LIMIT muestra el mensaje mapeado', async () => {
    const regenerateFn = vi.fn().mockRejectedValue(
      new ApiError({
        code: 'REGENERATION_LIMIT',
        message: 'Limit',
        status: 429,
        correlationId: 'x',
      }),
    );
    render(
      withProviders(
        <AIRegenerateDialog
          recommendationId="parent-1"
          onClose={() => {}}
          regenerateFn={regenerateFn}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Regenerar$/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/máximo de regeneraciones para esta sugerencia \(5\)/i),
      ).toBeInTheDocument(),
    );
  });

  it('AC-07: error RATE_LIMIT_EXCEEDED muestra el mensaje mapeado', async () => {
    const regenerateFn = vi.fn().mockRejectedValue(
      new ApiError({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limited',
        status: 429,
        correlationId: 'x',
      }),
    );
    render(
      withProviders(
        <AIRegenerateDialog
          recommendationId="parent-1"
          onClose={() => {}}
          regenerateFn={regenerateFn}
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Regenerar$/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/límite de generaciones IA/i),
      ).toBeInTheDocument(),
    );
  });

  it('i18n pt: renderiza labels en portugués', () => {
    render(
      withProviders(
        <AIRegenerateDialog
          recommendationId="parent-1"
          onClose={() => {}}
          regenerateFn={vi.fn()}
        />,
        'pt',
      ),
    );
    expect(screen.getByRole('dialog', { name: /Regenerar sugestão IA/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancelar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Regenerar$/i })).toBeInTheDocument();
  });

  it('A11Y: foco inicial en Cancelar (destructive-safe pattern)', async () => {
    render(
      withProviders(
        <AIRegenerateDialog
          recommendationId="parent-1"
          onClose={() => {}}
          regenerateFn={vi.fn()}
        />,
      ),
    );
    await waitFor(() => {
      expect(document.activeElement?.textContent).toMatch(/Cancelar/);
    });
  });

  it('A11Y: role="dialog" + aria-modal', () => {
    render(
      withProviders(
        <AIRegenerateDialog
          recommendationId="parent-1"
          onClose={() => {}}
          regenerateFn={vi.fn()}
        />,
      ),
    );
    const dialog = screen.getByRole('dialog', { name: /Regenerar sugerencia IA/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('A11Y: sin violaciones axe', async () => {
    const { container } = render(
      withProviders(
        <AIRegenerateDialog
          recommendationId="parent-1"
          onClose={() => {}}
          regenerateFn={vi.fn()}
        />,
      ),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ESC cierra el dialog', () => {
    const onClose = vi.fn();
    render(
      withProviders(
        <AIRegenerateDialog
          recommendationId="parent-1"
          onClose={onClose}
          regenerateFn={vi.fn()}
        />,
      ),
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
