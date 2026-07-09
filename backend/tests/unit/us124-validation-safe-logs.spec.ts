// US-124 / QA-007, AI-002, SEED-001 (AC-08, AC-09, AC-10) — safe logs + contract tests MockAIProvider.
// Los eventos de validación/retry emiten sólo metadata whitelisted (sin raw output); las fixtures del
// MockAIProvider cumplen los mismos schemas Zod strict que el output real. Sin red.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ValidatedAIExecutionService } from '../../src/modules/ai-assistance/application/ai-validation/validated-ai-execution.service.js';
import { AIOutputValidationService } from '../../src/modules/ai-assistance/application/ai-validation/ai-output-validation.service.js';
import {
  AI_OUTPUT_VALIDATION_FAILED_EVENT,
  AI_OUTPUT_RETRY_ATTEMPTED_EVENT,
} from '../../src/modules/ai-assistance/application/ai-validation/ai-validation-logger.js';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { AI_FEATURE_TYPES } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';

afterEach(() => vi.restoreAllMocks());

const VALID = { summary: 'Plan', phases: [{ name: 'F1', tasks: ['t1'] }] };
const INVALID = { summary: 'x', raw: 'RAW-OUTPUT-LEAK' };

describe('US-124 AC-09 — safe logs de validación/retry', () => {
  it('emite validation_failed y retry_attempted sin raw output', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const service = new ValidatedAIExecutionService();
    await service
      .execute({ featureType: 'event_plan', correlationId: 'c-9', provider: 'openai' }, { generate: async () => INVALID })
      .catch(() => undefined);
    const events = warn.mock.calls.map((c) => c[0]);
    expect(events).toContain(AI_OUTPUT_VALIDATION_FAILED_EVENT);
    expect(events).toContain(AI_OUTPUT_RETRY_ATTEMPTED_EVENT);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('RAW-OUTPUT-LEAK');
    expect(JSON.stringify(warn.mock.calls)).toContain('ai.event_plan.output.v1'); // schemaName seguro sí
  });

  it('el log incluye correlationId y retryCount pero no payload', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const service = new ValidatedAIExecutionService();
    await service.execute({ featureType: 'event_plan', correlationId: 'c-42' }, { generate: async () => INVALID }).catch(() => undefined);
    const failedCall = warn.mock.calls.find((c) => c[0] === AI_OUTPUT_VALIDATION_FAILED_EVENT);
    expect(failedCall?.[1]).toMatchObject({ correlationId: 'c-42', retryCount: 0 });
  });
});

describe('US-124 AI-002 — contract tests MockAIProvider vs schemas', () => {
  const provider = new MockAIProvider();
  const validation = new AIOutputValidationService();

  it('cada feature: el output del MockAIProvider pasa el schema strict', async () => {
    for (const feature of AI_FEATURE_TYPES) {
      const result = await provider.generate({ feature, input: { x: 1 }, languageCode: 'es-LATAM' });
      expect(() => validation.validate(feature, result.output)).not.toThrow();
    }
  });

  it('SEED-001: fixture forzada inválida dispara retry/error determinístico', async () => {
    const service = new ValidatedAIExecutionService();
    const outputs = [INVALID, VALID];
    let i = 0;
    const r = await service.execute({ featureType: 'event_plan' }, { generate: async () => outputs[i++] });
    expect(r.metadata.retryCount).toBe(1);
  });
});
