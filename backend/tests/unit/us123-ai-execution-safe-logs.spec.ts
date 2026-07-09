// US-123 / QA-007, SEC-002 (AC-08, AC-09) — safe logs. Los eventos de timeout/fallback emiten sólo
// metadata whitelisted; nunca prompt/input/output/secrets. Sin red (fake providers).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AIExecutionService } from '../../src/modules/ai-assistance/application/ai-execution/ai-execution.service.js';
import {
  toSafeLogFields,
  AI_FALLBACK_USED_EVENT,
} from '../../src/modules/ai-assistance/application/ai-execution/ai-execution-logger.js';
import { AiProviderUnavailableError } from '../../src/shared/domain/errors/ai.errors.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import { FakeProvider, execConfig, execInput } from '../helpers/ai-execution-fixtures.js';

afterEach(() => vi.restoreAllMocks());

describe('US-123 AC-08 — toSafeLogFields (whitelist)', () => {
  it('sólo incluye campos seguros y descarta cualquier otro', () => {
    // Objeto con campos "sucios" (input/output) que NO deben propagarse al log.
    const dirty = {
      featureType: 'event_plan',
      provider: 'mock',
      fallbackUsed: true,
      timeoutMs: 60000,
      latencyMs: 12,
      originalErrorCode: 'AI_PROVIDER_TIMEOUT',
      correlationId: 'c-1',
      input: { secret: 'x' },
      output: { raw: 'y' },
    } as unknown as Parameters<typeof toSafeLogFields>[1];
    const fields = toSafeLogFields('ai.fallback_used', dirty);
    expect(Object.keys(fields).sort()).toEqual(
      ['correlationId', 'errorCode', 'event', 'fallbackUsed', 'fallbackReason', 'featureType', 'latencyMs', 'originalProvider', 'provider', 'timeoutMs'].sort(),
    );
    expect(JSON.stringify(fields)).not.toContain('secret');
    expect(JSON.stringify(fields)).not.toContain('raw');
  });
});

describe('US-123 SEC-02 — logs de ejecución sin payloads', () => {
  it('el fallback emite ai.fallback_used sin input/output', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const service = new AIExecutionService({
      primaryProvider: new FakeProvider('throw', { error: new AiProviderUnavailableError() }),
      mockProvider: new FakeProvider('resolve', { output: { secretPlan: 'DO-NOT-LOG' }, provider: 'mock' }),
      config: execConfig({ useMockFallback: true }),
    });
    await service.execute(execInput);
    const call = info.mock.calls.find((c) => c[0] === AI_FALLBACK_USED_EVENT);
    expect(call).toBeDefined();
    const dumped = JSON.stringify(call);
    expect(dumped).not.toContain('wedding'); // input
    expect(dumped).not.toContain('DO-NOT-LOG'); // output
    expect(dumped).toContain('event_plan'); // featureType seguro sí
  });

  it('el failure del primario emite warn con errorCode seguro', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const service = new AIExecutionService({
      primaryProvider: new FakeProvider('throw', { error: new AiProviderUnavailableError() }),
      mockProvider: new FakeProvider('resolve'),
      config: execConfig(), // fallback off → error controlado
    });
    await service.execute(execInput).catch(() => undefined);
    const call = warn.mock.calls.find((c) => c[0] === 'ai.provider.failure');
    expect(call).toBeDefined();
    expect(JSON.stringify(call)).toContain('AI_PROVIDER_UNAVAILABLE');
  });
});
