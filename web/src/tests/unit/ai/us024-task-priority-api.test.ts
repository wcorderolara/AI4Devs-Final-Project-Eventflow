// US-024 (PB-P2-002 / FE-002) — Unit tests para `aiTaskPriorityApi.generate` contra los MSW
// handlers. Cubre 200 happy + shape del contrato (`top`, `cache_hit`, `locale`, `generated_at`).
import { describe, it, expect } from 'vitest';
import {
  aiTaskPriorityApi as api,
  type GenerateTaskPriorityResponse,
} from '@/features/ai/task-priority';
import { aiTaskPriorityFixture as fixture } from '@/tests/msw/handlers/ai';

describe('US-024 FE-002 — aiTaskPriorityApi.generate', () => {
  it('200 happy: retorna el shape del contrato §7', async () => {
    const res: GenerateTaskPriorityResponse = await api.generate({ eventId: 'ev-1' });
    expect(res).toEqual(fixture);
    expect(res.top.length).toBeLessThanOrEqual(3);
    expect(res.cache_hit).toBe(false);
    expect(res.locale_fallback).toBe(false);
    expect(res.generated_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('llama al endpoint dedicado /events/:eventId/ai/task-priority', async () => {
    // Si el handler no matcheara, la mutación fallaría (msw dispararía onUnhandledRequest).
    const res = await api.generate({ eventId: 'ev-2', preferMock: true });
    expect(res.top[0]?.task_id).toBeDefined();
  });
});
