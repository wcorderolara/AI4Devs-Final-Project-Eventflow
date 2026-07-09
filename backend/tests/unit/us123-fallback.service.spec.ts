// US-123 / AI-003 (AC-02, AC-03, AC-05) — FallbackService: elegibilidad y allowlist (sólo mock).
import { describe, it, expect } from 'vitest';
import { FallbackService, FALLBACK_ALLOWLIST } from '../../src/modules/ai-assistance/application/ai-execution/fallback.service.js';
import { execConfig } from '../helpers/ai-execution-fixtures.js';

describe('US-123 AC-02/AC-03 — elegibilidad de fallback por config', () => {
  it('elegible con AI_DEMO_MODE=true', () => {
    expect(FallbackService.isFallbackEligible(execConfig({ demoMode: true }))).toBe(true);
  });
  it('elegible con AI_USE_MOCK_FALLBACK=true', () => {
    expect(FallbackService.isFallbackEligible(execConfig({ useMockFallback: true }))).toBe(true);
  });
  it('NO elegible sin flags (producción/no-demo)', () => {
    expect(FallbackService.isFallbackEligible(execConfig())).toBe(false);
  });
});

describe('US-123 AC-05 — allowlist de fallback sólo mock', () => {
  it('mock es target permitido', () => {
    expect(FallbackService.isAllowedFallbackTarget('mock')).toBe(true);
  });
  it('anthropic NO es target permitido', () => {
    expect(FallbackService.isAllowedFallbackTarget('anthropic')).toBe(false);
  });
  it('openai NO es target permitido', () => {
    expect(FallbackService.isAllowedFallbackTarget('openai')).toBe(false);
  });
  it('la allowlist contiene únicamente mock', () => {
    expect([...FALLBACK_ALLOWLIST]).toEqual(['mock']);
  });
});
