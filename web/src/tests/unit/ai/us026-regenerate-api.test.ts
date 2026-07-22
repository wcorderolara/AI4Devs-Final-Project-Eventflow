// US-026 (PB-P2-003 / FE-002) — Unit tests para `aiRegenerateApi.regenerate` contra el MSW
// handler. Cubre 201 happy + shape del contrato §7.
import { describe, it, expect } from 'vitest';
import { aiRegenerateApi } from '@/features/ai/regenerate';
import { aiRegenerateFixture } from '@/tests/msw/handlers/ai';

describe('US-026 FE-002 — aiRegenerateApi.regenerate', () => {
  it('201 happy: retorna el shape del contrato §7', async () => {
    const res = await aiRegenerateApi.regenerate({
      recommendationId: 'aa000000-0000-4000-8000-000000000000',
    });
    expect(res).toEqual(aiRegenerateFixture);
    expect(res.parent_recommendation_id).toBe(res.root_recommendation_id);
  });

  it('feedback opcional: envía body con feedback si se pasa', async () => {
    const res = await aiRegenerateApi.regenerate({
      recommendationId: 'aa000000-0000-4000-8000-000000000001',
      feedback: 'menos formal',
    });
    expect(res.recommendation_type).toBe('event_plan');
  });
});
