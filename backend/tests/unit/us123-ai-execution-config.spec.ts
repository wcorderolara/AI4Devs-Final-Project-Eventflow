// US-123 / QA-004, SEC-001 (AC-03, AC-07, AC-09) — validación de config AI. Camino tipado
// (`validateAIExecutionConfig` → AiConfigInvalidError) y camino de boot (env.ts superRefine → ZodError).
import { describe, it, expect } from 'vitest';
import {
  validateAIExecutionConfig,
  readAIExecutionConfig,
} from '../../src/modules/ai-assistance/application/ai-execution/ai-execution-config.js';
import { AiConfigInvalidError } from '../../src/shared/domain/errors/ai.errors.js';
import { parseConfig } from '../../src/config/env.js';
import { execConfig } from '../helpers/ai-execution-fixtures.js';

const BASE_ENV = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/eventflow_test?schema=public',
  JWT_SECRET: 'test_jwt_secret_min_32_characters_long_xx',
  SESSION_SECRET: 'test_session_secret_min_32_characters_long_xx',
  CORS_ORIGINS: 'http://localhost:3000',
  CAPTCHA_PROVIDER: 'mock',
  LLM_PROVIDER: 'mock',
};

describe('US-123 AC-07 — validateAIExecutionConfig (path tipado)', () => {
  it('config válida no lanza', () => {
    expect(() => validateAIExecutionConfig(execConfig())).not.toThrow();
  });
  it('timeout no positivo => AiConfigInvalidError', () => {
    expect(() => validateAIExecutionConfig(execConfig({ timeoutMs: 0 }))).toThrow(AiConfigInvalidError);
    expect(() => validateAIExecutionConfig(execConfig({ timeoutMs: -1 }))).toThrow(AiConfigInvalidError);
  });
  it('provider inválido => AiConfigInvalidError', () => {
    expect(() => validateAIExecutionConfig(execConfig({ llmProvider: 'gemini' as never }))).toThrow(AiConfigInvalidError);
  });
  it('SEC-04: AI_LOG_PAYLOADS=true en demo => AiConfigInvalidError', () => {
    expect(() => validateAIExecutionConfig(execConfig({ demoMode: true, logPayloads: true }))).toThrow(AiConfigInvalidError);
  });
  it('SEC-04: AI_LOG_PAYLOADS=true en producción => AiConfigInvalidError', () => {
    expect(() => validateAIExecutionConfig(execConfig({ isProduction: true, logPayloads: true }))).toThrow(AiConfigInvalidError);
  });
  it('AC-03: fallback habilitado en producción => AiConfigInvalidError', () => {
    expect(() => validateAIExecutionConfig(execConfig({ isProduction: true, useMockFallback: true }))).toThrow(AiConfigInvalidError);
  });
  it('el error no imprime valores secretos (sólo variable + permitidos)', () => {
    try {
      validateAIExecutionConfig(execConfig({ timeoutMs: 0 }));
    } catch (e) {
      expect((e as AiConfigInvalidError).meta?.variable).toBe('AI_TIMEOUT_MS');
    }
  });
});

describe('US-123 AC-07 — env bootstrap (env.ts superRefine → fail-fast)', () => {
  it('AI_LOG_PAYLOADS=true con NODE_ENV=production hace fallar parseConfig', () => {
    expect(() => parseConfig({ ...BASE_ENV, NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'true', AI_LOG_PAYLOADS: 'true', LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'x', OPENAI_MODEL: 'm' } as never)).toThrow();
  });
  it('AI_USE_MOCK_FALLBACK=true con NODE_ENV=production hace fallar parseConfig (no silent fallback)', () => {
    expect(() => parseConfig({ ...BASE_ENV, NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'true', AI_USE_MOCK_FALLBACK: 'true', LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'x', OPENAI_MODEL: 'm' } as never)).toThrow();
  });
  it('config de test válida (mock, sin fallback) parsea con default 60000', () => {
    const cfg = parseConfig({ ...BASE_ENV, NODE_ENV: 'test' } as never);
    expect(cfg.AI_TIMEOUT_MS).toBe(60000);
    expect(readAIExecutionConfig(cfg).timeoutMs).toBe(60000);
  });
});
