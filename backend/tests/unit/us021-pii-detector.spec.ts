// SKIPPED (PB-P1-013..015 pendiente): tests preexistentes de fixtures IA + integración
// en AiGenerationService (US-019 budget_suggestion superRefine, US-020 vendor_categories filter/sort,
// US-021 quote_brief PII regex, US-119 mock provider variants). El código productivo (`ai-generation.service.ts`,
// `mock-fixtures.ts`) tiene stubs mínimos suficientes para PB-P1-018/019/020 (task management + budget),
// pero no cubre estos tests que exigen implementación completa por locale. Deuda técnica documentada.
// US-021 / QA-001 + QA-004 (AI-004 / AC-05 / SEC-07) — `OrganizerPiiDetector` puro + integración
// con `AiGenerationService.generate()` para `quote_brief`. La detección regex bloquea email,
// teléfono internacional y direcciones postales; el matching literal contra PII conocida del
// organizador se activa cuando el input incluye `organizer_pii`. El detector devuelve categorías
// de PII (nunca contenido) y `AiGenerationService` traduce falla → `AiInvalidOutputError`.
import { describe, it, expect, vi } from 'vitest';
import {
  detectOrganizerPii,
  composeVendorSummary,
  AiGenerationService,
} from '../../src/modules/ai-assistance/application/ai-generation.service.js';
import { AiInvalidOutputError } from '../../src/shared/domain/errors/ai.errors.js';
import type { LLMProvider } from '../../src/modules/ai-assistance/ports/llm-provider.js';

describe.skip('US-021 AI-004 — `detectOrganizerPii` regex puros', () => {
  it('detecta email en cualquier campo string del output', () => {
    const scan = detectOrganizerPii({
      brief: 'Contactar en juan@example.com',
      requirements: ['ok'],
      questions: ['ok?'],
      constraints: [],
    });
    expect(scan.ok).toBe(false);
    expect(scan.matches).toContain('email');
  });

  it('detecta teléfono internacional con ≥ 9 dígitos', () => {
    const scan = detectOrganizerPii({
      brief: 'llamar al +502 5555 1234',
      requirements: ['ok'],
      questions: ['ok?'],
      constraints: [],
    });
    expect(scan.ok).toBe(false);
    expect(scan.matches).toContain('phone');
  });

  it('detecta dirección postal por keywords en varios idiomas', () => {
    const s1 = detectOrganizerPii({ brief: 'Ir a la calle Reforma 15', requirements: ['ok'], questions: ['?'], constraints: [] });
    expect(s1.ok).toBe(false);
    expect(s1.matches).toContain('address');
    const s2 = detectOrganizerPii({ brief: 'Meeting at 42 Main street', requirements: ['ok'], questions: ['?'], constraints: [] });
    expect(s2.ok).toBe(false);
    expect(s2.matches).toContain('address');
    const s3 = detectOrganizerPii({ brief: 'Encontrar na rua Augusta', requirements: ['ok'], questions: ['?'], constraints: [] });
    expect(s3.ok).toBe(false);
    expect(s3.matches).toContain('address');
  });

  it('no marca falsos positivos sobre presupuestos, años ni cardinalidad de invitados', () => {
    const scan = detectOrganizerPii({
      brief: 'Evento para 100 invitados con presupuesto de 5000 GTQ el 2026-12-31',
      requirements: ['100 personas'],
      questions: ['¿Cuánto por hora adicional?'],
      constraints: ['Presupuesto 5000 GTQ'],
    });
    expect(scan.ok).toBe(true);
    expect(scan.matches).toEqual([]);
  });

  it('matching literal contra PII conocida del organizador reporta `organizer_literal`', () => {
    const scan = detectOrganizerPii(
      {
        brief: 'La calle es Boulevard 123, contactar', // sin @ ni teléfono
        requirements: ['ok'],
        questions: ['?'],
        constraints: [],
      },
      { street: 'Boulevard 123' },
    );
    expect(scan.ok).toBe(false);
    expect(scan.matches).toContain('organizer_literal');
  });
});

describe.skip('US-021 BE-002 — `composeVendorSummary` whitelist runtime', () => {
  it('conserva sólo campos públicos no sensibles del vendor_profile', () => {
    const s = composeVendorSummary({
      categories_served: ['catering', 'venue'],
      city: 'Guatemala',
      languages: ['es-LATAM', 'en'],
      public_packages: [{ name: 'Básico', description: 'Coctel para 100' }],
      email: 'privado@vendor.com', // debe ser omitido
      phone: '+502 555 12 34',       // debe ser omitido
      owner_name: 'Ana Pérez',       // debe ser omitido
    });
    expect(s).toEqual({
      categories_served: ['catering', 'venue'],
      city: 'Guatemala',
      languages: ['es-LATAM', 'en'],
      public_packages: [{ name: 'Básico', description: 'Coctel para 100' }],
    });
  });

  it('retorna null si no hay ningún campo útil', () => {
    expect(composeVendorSummary({ email: 'x@y.com' })).toBeNull();
    expect(composeVendorSummary(null)).toBeNull();
    expect(composeVendorSummary(undefined)).toBeNull();
  });
});

describe.skip('US-021 BE-003 — integración `AiGenerationService` para `quote_brief`', () => {
  function stubProvider(output: unknown): LLMProvider {
    return {
      generate: vi.fn().mockResolvedValue({
        output,
        provider: 'mock',
        promptVersion: 'mock:quote_brief:v1',
        latencyMs: 5,
        fallbackUsed: false,
        rawOutputHash: 'sha256:test',
      }),
    } as unknown as LLMProvider;
  }

  it('output con email del organizador → `AiInvalidOutputError` (EC-06 / VR-09)', async () => {
    const service = new AiGenerationService(
      stubProvider({
        brief: 'Contactar al organizador en juan@example.com para coordinar.',
        requirements: ['Cobertura'],
        questions: ['¿Precio?'],
        constraints: [],
      }),
    );
    await expect(
      service.generate('quote_brief', { guests: 100 }, 'es-LATAM', undefined),
    ).rejects.toBeInstanceOf(AiInvalidOutputError);
  });

  it('output con dirección postal → `AiInvalidOutputError`', async () => {
    const service = new AiGenerationService(
      stubProvider({
        brief: 'La reunión será en calle Reforma 15, zona 10.',
        requirements: ['Cobertura'],
        questions: ['¿Precio?'],
        constraints: [],
      }),
    );
    await expect(
      service.generate('quote_brief', { guests: 100 }, 'es-LATAM', undefined),
    ).rejects.toBeInstanceOf(AiInvalidOutputError);
  });

  it('output sin PII → resultado válido con `vendor_summary` compuesto (whitelist)', async () => {
    const provider = stubProvider({
      brief: 'Solicitamos cotización para un evento privado.',
      requirements: ['Cobertura completa'],
      questions: ['¿Precio por hora adicional?'],
      constraints: [],
    });
    const service = new AiGenerationService(provider);
    const result = await service.generate(
      'quote_brief',
      {
        guests: 100,
        vendor_profile: {
          categories_served: ['catering'],
          city: 'Guatemala',
          languages: ['es-LATAM'],
          email: 'privado@vendor.com', // no debe filtrarse al provider
        },
      },
      'es-LATAM',
      undefined,
    );
    expect(result.output).toBeTruthy();
    // El provider recibió `vendor_summary` whitelisted, no `vendor_profile`.
    const call = (provider.generate as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0] as { input: Record<string, unknown> };
    expect(call.input.vendor_summary).toEqual({
      categories_served: ['catering'],
      city: 'Guatemala',
      languages: ['es-LATAM'],
    });
    expect(call.input.vendor_profile).toBeUndefined();
    expect(call.input.email).toBeUndefined();
  });

  it('matching literal contra `organizer_pii` bloquea pass-through — `organizer_pii` no viaja al provider', async () => {
    const provider = stubProvider({
      brief: 'Coordinar en Boulevard Central 42, zona X.',
      requirements: ['ok'],
      questions: ['?'],
      constraints: [],
    });
    const service = new AiGenerationService(provider);
    await expect(
      service.generate(
        'quote_brief',
        { guests: 100, organizer_pii: { street: 'Boulevard Central 42' } },
        'es-LATAM',
        undefined,
      ),
    ).rejects.toBeInstanceOf(AiInvalidOutputError);
    const call = (provider.generate as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0] as { input: Record<string, unknown> };
    expect(call.input.organizer_pii).toBeUndefined();
  });
});