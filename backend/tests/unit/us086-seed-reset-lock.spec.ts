// US-086 QA — Unit: SeedResetLock (semáforo in-memory, EC-03).
import { beforeEach, describe, expect, it } from 'vitest';
import { SeedResetLock } from '../../src/modules/seed-demo/application/seed-reset.lock.js';

describe('US-086 — SeedResetLock', () => {
  let lock: SeedResetLock;
  beforeEach(() => {
    lock = new SeedResetLock();
  });

  it('adquiere el lock cuando está libre', () => {
    expect(lock.isLocked()).toBe(false);
    expect(lock.acquire()).toBe(true);
    expect(lock.isLocked()).toBe(true);
  });

  it('rechaza una segunda adquisición mientras está tomado', () => {
    expect(lock.acquire()).toBe(true);
    expect(lock.acquire()).toBe(false);
  });

  it('libera el lock y permite volver a adquirir', () => {
    lock.acquire();
    lock.release();
    expect(lock.isLocked()).toBe(false);
    expect(lock.acquire()).toBe(true);
  });

  it('release es idempotente (liberar un lock libre no lanza)', () => {
    expect(() => lock.release()).not.toThrow();
    expect(lock.isLocked()).toBe(false);
  });
});
