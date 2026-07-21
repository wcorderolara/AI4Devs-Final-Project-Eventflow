// US-025 (PB-P1-016) / QA-001 + QA-004 — Unit tests: `AIRecommendationOwnershipPolicy`.
// Matriz 6 escenarios: organizer dueño OK, organizer ajeno 404, vendor dueño OK, vendor ajeno 404,
// admin 403 (FR-ADMIN-010), recomendación inexistente 404 no-revelación (SEC-08).
import { describe, it, expect } from 'vitest';
import { AIRecommendationOwnershipPolicy } from '../../src/modules/ai-assistance/application/hitl/ownership.policy.js';
import { OwnershipDeniedError } from '../../src/modules/ai-assistance/domain/errors/hitl.errors.js';
import type { AiRecommendationView } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';

const policy = new AIRecommendationOwnershipPolicy();

const OWNER_ID = 'owner-1';
const OTHER_ID = 'other-2';

function rec(overrides: Partial<AiRecommendationView> = {}): AiRecommendationView {
  return {
    id: 'rec-1',
    type: 'event_plan',
    status: 'pending',
    requestedByUserId: OWNER_ID,
    eventId: null,
    vendorProfileId: null,
    quoteRequestId: null,
    input: {},
    output: {},
    aiMeta: null,
    // US-084 (BE-004): columnas denormalizadas obligatorias en el view.
    locale: 'es-LATAM',
    localeFallback: false,
    createdAt: '2026-07-13T00:00:00Z',
    ...overrides,
  };
}

describe('US-025 / QA-001 — AIRecommendationOwnershipPolicy', () => {
  it('organizer dueño → OK', () => {
    expect(() =>
      policy.assertOwnership({ recommendation: rec(), actor: { id: OWNER_ID, role: 'organizer' } }),
    ).not.toThrow();
  });

  it('vendor dueño → OK', () => {
    expect(() =>
      policy.assertOwnership({
        recommendation: rec({ type: 'vendor_bio', requestedByUserId: OWNER_ID }),
        actor: { id: OWNER_ID, role: 'vendor' },
      }),
    ).not.toThrow();
  });

  it('organizer ajeno → OwnershipDeniedError(not_owner) → 404 no-revelación', () => {
    expect(() =>
      policy.assertOwnership({ recommendation: rec(), actor: { id: OTHER_ID, role: 'organizer' } }),
    ).toThrow(OwnershipDeniedError);
    try {
      policy.assertOwnership({ recommendation: rec(), actor: { id: OTHER_ID, role: 'organizer' } });
    } catch (e) {
      expect((e as OwnershipDeniedError).reason).toBe('not_owner');
    }
  });

  it('vendor ajeno → OwnershipDeniedError(not_owner)', () => {
    try {
      policy.assertOwnership({
        recommendation: rec({ type: 'vendor_bio' }),
        actor: { id: OTHER_ID, role: 'vendor' },
      });
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(OwnershipDeniedError);
      expect((e as OwnershipDeniedError).reason).toBe('not_owner');
    }
  });

  it('admin → OwnershipDeniedError(admin_excluded) → 403 FR-ADMIN-010', () => {
    try {
      policy.assertOwnership({ recommendation: rec(), actor: { id: 'admin-x', role: 'admin' } });
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(OwnershipDeniedError);
      expect((e as OwnershipDeniedError).reason).toBe('admin_excluded');
    }
  });

  it('recomendación inexistente + organizer → OwnershipDeniedError(not_owner) [no-revelación]', () => {
    try {
      policy.assertOwnership({ recommendation: null, actor: { id: OWNER_ID, role: 'organizer' } });
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(OwnershipDeniedError);
      expect((e as OwnershipDeniedError).reason).toBe('not_owner');
    }
  });

  it('no-revelación: recomendación inexistente y ajena producen la MISMA firma (not_owner)', () => {
    const errors: OwnershipDeniedError[] = [];
    for (const scenario of [
      { recommendation: null, actor: { id: OWNER_ID, role: 'organizer' as const } },
      { recommendation: rec(), actor: { id: OTHER_ID, role: 'organizer' as const } },
    ]) {
      try {
        policy.assertOwnership(scenario);
      } catch (e) {
        errors.push(e as OwnershipDeniedError);
      }
    }
    expect(errors).toHaveLength(2);
    expect(errors[0]!.reason).toBe(errors[1]!.reason);
    expect(errors[0]!.code).toBe(errors[1]!.code);
  });

  it('admin sobre recomendación inexistente: admin_excluded prevalece', () => {
    try {
      policy.assertOwnership({ recommendation: null, actor: { id: 'admin-x', role: 'admin' } });
      throw new Error('expected throw');
    } catch (e) {
      expect((e as OwnershipDeniedError).reason).toBe('admin_excluded');
    }
  });
});
