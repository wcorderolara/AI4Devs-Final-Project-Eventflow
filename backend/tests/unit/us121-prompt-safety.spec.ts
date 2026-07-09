// US-121 / QA-006 + SEC-001 (AC-06, AC-09, AC-10) — safety constraints, bloqueo Future/P4 y
// escaneo de secrets/PII. Verifica JSON-only, HITL, user content boundary, no autonomous decisions,
// que Future/P4 no puede estar active, y que el escáner detecta secrets/PII inyectados.
import { describe, it, expect } from 'vitest';
import { PromptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry.js';
import { promptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/index.js';
import { PromptFutureFeatureActiveError } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry-errors.js';
import { REQUIRED_SAFETY_CONSTRAINTS } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-template.js';
import {
  scanTemplateForSecretsAndPii,
  scanTemplatesForSecretsAndPii,
} from '../../src/modules/ai-assistance/infrastructure/prompt-registry/secret-pii-scan.js';
import { FUTURE_FEATURE_TYPES } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/mvp-feature-allowlist.js';
import { makeTemplate } from '../helpers/prompt-fixtures.js';

describe('US-121 AC-06 — safety constraints obligatorias en prompts active', () => {
  it('todo prompt active tiene todas las safety constraints en true', () => {
    for (const t of promptRegistry.all().filter((x) => x.status === 'active')) {
      for (const key of REQUIRED_SAFETY_CONSTRAINTS) {
        expect(t.safetyConstraints[key]).toBe(true);
      }
    }
  });

  it('systemInstructions de prompts active contienen JSON-only, HITL y user content boundary', () => {
    for (const t of promptRegistry.all().filter((x) => x.status === 'active')) {
      const text = t.systemInstructions.toLowerCase();
      expect(text).toContain('json');
      expect(text).toContain('human-in-the-loop');
      expect(text).toContain('user content boundary');
      // sin lenguaje de decisiones autónomas / claims vinculantes
      expect(text).toContain('do not make autonomous decisions');
      expect(text).toContain('do not produce binding legal');
    }
  });
});

describe('US-121 AC-09 — Future/P4 no puede estar active', () => {
  it('vendor_bio está clasificada como Future/P4', () => {
    expect(FUTURE_FEATURE_TYPES).toContain('vendor_bio');
  });

  it('marcar una feature Future como active => PromptFutureFeatureActiveError', () => {
    expect(() =>
      PromptRegistry.build([
        makeTemplate({ promptKey: 'vendor_bio.es-LATAM', featureType: 'vendor_bio', status: 'active', inputSchemaRef: 'ai.vendor_bio.input.v1', outputSchemaRef: 'ai.vendor_bio.output.v1' }),
      ]),
    ).toThrow(PromptFutureFeatureActiveError);
  });

  it('vendor_bio existe como draft y NO se resuelve como active', () => {
    const draft = promptRegistry.all().find((t) => t.featureType === 'vendor_bio');
    expect(draft?.status).toBe('draft');
  });
});

describe('US-121 SEC-001 (AC-06) — escaneo de secrets y PII real', () => {
  it('los templates del registry no contienen secrets ni PII real', () => {
    expect(scanTemplatesForSecretsAndPii(promptRegistry.all())).toEqual([]);
  });

  it('detecta una API key inyectada', () => {
    const bad = makeTemplate({ systemInstructions: 'Use key sk-abcdefghij0123456789ABCDEFG to auth.' });
    const findings = scanTemplateForSecretsAndPii(bad);
    expect(findings.map((f) => f.pattern)).toContain('openai_api_key');
  });

  it('detecta un email real (PII) pero ignora dominios sintéticos (example.com)', () => {
    const real = makeTemplate({ developerRules: ['contact juan.perez@gmail.com'] });
    expect(scanTemplateForSecretsAndPii(real).map((f) => f.pattern)).toContain('real_email');
    const synthetic = makeTemplate({ developerRules: ['contact user@example.com'] });
    expect(scanTemplateForSecretsAndPii(synthetic)).toEqual([]);
  });

  it('el finding no expone el valor coincidente, sólo el nombre del patrón', () => {
    const bad = makeTemplate({ systemInstructions: 'password="supersecret123"' });
    const findings = scanTemplateForSecretsAndPii(bad);
    expect(findings.length).toBeGreaterThan(0);
    expect(JSON.stringify(findings)).not.toContain('supersecret123');
  });
});
