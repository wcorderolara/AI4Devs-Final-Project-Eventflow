// US-124 / QA-003 (AC-04, AC-10) — retry policy: retriable sólo para output inválido; timeout/provider
// errors NO son retriables (delegados a US-123).
import { describe, it, expect } from 'vitest';
import {
  isRetryableOutputError,
  AI_MAX_OUTPUT_RETRIES,
} from '../../src/modules/ai-assistance/application/ai-validation/ai-retry-policy.js';
import {
  AiInvalidOutputError,
  AiInvalidOutputSchemaError,
  AiOutputParseError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  AIProviderNotConfiguredError,
} from '../../src/shared/domain/errors/ai.errors.js';

describe('US-124 AC-03 — retry máximo 1', () => {
  it('AI_MAX_OUTPUT_RETRIES es 1', () => {
    expect(AI_MAX_OUTPUT_RETRIES).toBe(1);
  });
});

describe('US-124 AC-04 — clasificación de errores retriables', () => {
  it('output inválido/parse/schema SÍ es retriable', () => {
    expect(isRetryableOutputError(new AiInvalidOutputError())).toBe(true);
    expect(isRetryableOutputError(new AiInvalidOutputSchemaError())).toBe(true);
    expect(isRetryableOutputError(new AiOutputParseError())).toBe(true);
  });

  it('timeout/provider errors NO son retriables (delegados a US-123)', () => {
    expect(isRetryableOutputError(new AiProviderTimeoutError())).toBe(false);
    expect(isRetryableOutputError(new AiProviderUnavailableError())).toBe(false);
    expect(isRetryableOutputError(new AIProviderNotConfiguredError())).toBe(false);
  });

  it('errores genéricos no son retriables', () => {
    expect(isRetryableOutputError(new Error('boom'))).toBe(false);
    expect(isRetryableOutputError(null)).toBe(false);
  });
});
