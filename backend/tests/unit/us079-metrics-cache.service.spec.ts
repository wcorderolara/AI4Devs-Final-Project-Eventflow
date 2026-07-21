// US-079 (PB-P1-045) / QA-001 — Unit tests del `MetricsCacheService`.
// Cubre: get vacío → null, set + get dentro de TTL → data, get tras expirar → null +
// self-eviction, invalidate manual y clear.
import { describe, expect, it, vi } from 'vitest';
import { MetricsCacheService } from '../../src/modules/admin-governance/infrastructure/metrics-cache.service.js';

function withMockClock(startMs: number) {
  const state = { now: startMs };
  const clock = { now: () => state.now };
  const advance = (deltaMs: number) => {
    state.now += deltaMs;
  };
  return { clock, advance };
}

describe('MetricsCacheService', () => {
  it('get returns null when key does not exist', () => {
    const cache = new MetricsCacheService();
    expect(cache.get('missing')).toBeNull();
  });

  it('get returns stored data while inside TTL window', () => {
    const { clock, advance } = withMockClock(1_000);
    const cache = new MetricsCacheService(clock);
    cache.set('k', { total: 5 }, 60_000);
    expect(cache.get<{ total: number }>('k')).toEqual({ total: 5 });
    advance(59_000);
    expect(cache.get<{ total: number }>('k')).toEqual({ total: 5 });
  });

  it('get returns null and evicts entry once TTL has elapsed', () => {
    const { clock, advance } = withMockClock(1_000);
    const cache = new MetricsCacheService(clock);
    cache.set('k', { total: 5 }, 60_000);
    advance(60_000);
    expect(cache.get('k')).toBeNull();
    // The eviction is idempotent: second get is still null and no exception is thrown.
    expect(cache.get('k')).toBeNull();
  });

  it('invalidate removes a specific key without touching others', () => {
    const cache = new MetricsCacheService();
    cache.set('a', 1, 60_000);
    cache.set('b', 2, 60_000);
    cache.invalidate('a');
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe(2);
  });

  it('clear removes every entry', () => {
    const cache = new MetricsCacheService();
    cache.set('a', 1, 60_000);
    cache.set('b', 2, 60_000);
    cache.clear();
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  it('defaults to system Date.now() when no clock injected', () => {
    const spy = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    try {
      const cache = new MetricsCacheService();
      cache.set('k', 'v', 500);
      spy.mockReturnValue(10_100);
      expect(cache.get('k')).toBe('v');
      spy.mockReturnValue(11_000);
      expect(cache.get('k')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
