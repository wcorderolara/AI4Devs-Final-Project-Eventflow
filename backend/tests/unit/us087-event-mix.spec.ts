// US-087 QA-001 — Unit: helper de fecha relativa dinámica (EC-03).
import { describe, expect, it } from 'vitest';
import { relativeSeedDate } from '../../src/modules/seed-demo/application/seed-demo-data.use-case.js';

describe('US-087 — relativeSeedDate', () => {
  it('EC-03: calcula hoy − 2 días (dinámico, respecto al reloj)', () => {
    const now = new Date();
    const twoDaysAgo = relativeSeedDate(-2);
    const diffDays = Math.round((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - twoDaysAgo.getTime()) / 86_400_000);
    expect(diffDays).toBe(2);
  });

  it('normaliza a medianoche UTC (00:00:00)', () => {
    const d = relativeSeedDate(-2);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);
  });

  it('offset 0 = hoy a medianoche UTC', () => {
    const today = relativeSeedDate(0);
    const now = new Date();
    expect(today.getUTCDate()).toBe(now.getUTCDate());
  });
});
