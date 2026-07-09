// US-123 / QA-001 (AC-01, AC-09) — timeout wrapper con fake timers (no espera 60s reales).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { withTimeout } from '../../src/modules/ai-assistance/application/ai-execution/ai-timeout.service.js';
import { AiProviderTimeoutError } from '../../src/shared/domain/errors/ai.errors.js';

afterEach(() => vi.useRealTimers());

describe('US-123 AC-01 — AITimeoutService.withTimeout', () => {
  it('resuelve cuando el provider responde antes del timeout', async () => {
    const result = await withTimeout(() => Promise.resolve('ok'), { timeoutMs: 60000 });
    expect(result).toBe('ok');
  });

  it('lanza AiProviderTimeoutError al exceder el timeout (fake timers, sin esperar 60s)', async () => {
    vi.useFakeTimers();
    const promise = withTimeout(() => new Promise<string>(() => undefined), { timeoutMs: 60000 });
    const assertion = expect(promise).rejects.toBeInstanceOf(AiProviderTimeoutError);
    await vi.advanceTimersByTimeAsync(60000);
    await assertion;
  });

  it('propaga el error del provider si falla antes del timeout', async () => {
    const boom = new Error('provider failure');
    await expect(withTimeout(() => Promise.reject(boom), { timeoutMs: 60000 })).rejects.toBe(boom);
  });

  it('ignora el resultado tardío (no resuelve dos veces)', async () => {
    vi.useFakeTimers();
    let resolveLate: (v: string) => void = () => undefined;
    const promise = withTimeout(() => new Promise<string>((res) => { resolveLate = res; }), { timeoutMs: 1000 });
    const assertion = expect(promise).rejects.toBeInstanceOf(AiProviderTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    resolveLate('too-late'); // llega tarde → debe ignorarse
    await assertion;
  });

  it('el error de timeout incluye timeoutMs en metadata segura', async () => {
    vi.useFakeTimers();
    const promise = withTimeout(() => new Promise<string>(() => undefined), { timeoutMs: 5000 });
    const captured = promise.catch((e) => e);
    await vi.advanceTimersByTimeAsync(5000);
    const err = await captured;
    expect(err).toBeInstanceOf(AiProviderTimeoutError);
    expect((err as AiProviderTimeoutError).meta?.timeoutMs).toBe(5000);
  });
});
