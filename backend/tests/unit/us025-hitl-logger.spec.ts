// US-025 (PB-P1-016) / SEC-002 + QA-004 — Redacción PII en logs HITL. Cuando el `editedPayload`
// contiene PII (email, teléfono E.164, dirección), el logger reemplaza el contenido por `[REDACTED]`
// y registra `pii_categories` únicamente. Base regex reutilizada de `detectOrganizerPii` (US-021).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HitlLogger } from '../../src/modules/ai-assistance/application/hitl/hitl-logger.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';

describe('US-025 / SEC-002 — HitlLogger redacta PII antes de emitir', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('emite `ai.recommendation.applied` con metadata segura (info)', () => {
    const l = new HitlLogger();
    l.emit('ai.recommendation.applied', {
      correlationId: 'c1',
      actorId: 'u1',
      type: 'event_plan',
      languageCode: 'es-LATAM',
      recommendationId: 'r1',
      edited: false,
      latencyMs: 42,
      appliedEntityType: 'Event',
      appliedEntityId: 'e1',
    });
    expect(infoSpy).toHaveBeenCalledOnce();
    const payload = infoSpy.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.event).toBe('ai.recommendation.applied');
    expect(payload.correlation_id).toBe('c1');
    expect(payload.language_code).toBe('es-LATAM');
    expect(payload.latency_ms).toBe(42);
    expect(payload.applied_entity_type).toBe('Event');
  });

  it('emite `ai.recommendation.apply_failed` como warn con error_code', () => {
    const l = new HitlLogger();
    l.emit('ai.recommendation.apply_failed', {
      actorId: 'u1',
      type: 'checklist',
      recommendationId: 'r1',
      errorCode: 'SIDE_EFFECT_FAILED',
    });
    expect(warnSpy).toHaveBeenCalledOnce();
    const payload = warnSpy.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.event).toBe('ai.recommendation.apply_failed');
    expect(payload.error_code).toBe('SIDE_EFFECT_FAILED');
  });

  it('redacta `editedPayload` con PII (email) → [REDACTED] + pii_categories', () => {
    const l = new HitlLogger();
    l.emit('ai.recommendation.payload_invalid', {
      actorId: 'u1',
      type: 'event_plan',
      recommendationId: 'r1',
      editedPayload: { note: 'contact: organizer@example.com' },
    });
    const payload = warnSpy.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.edited_payload).toBe('[REDACTED]');
    expect(payload.pii_categories).toContain('email');
    // El contenido crudo NUNCA debe aparecer.
    expect(JSON.stringify(payload)).not.toContain('organizer@example.com');
  });

  it('redacta `editedPayload` con PII (teléfono E.164) → [REDACTED] + phone', () => {
    const l = new HitlLogger();
    l.emit('ai.recommendation.payload_invalid', {
      actorId: 'u1',
      type: 'checklist',
      recommendationId: 'r1',
      editedPayload: { message: 'Llamar al +52 55 1234 5678 para confirmar' },
    });
    const payload = warnSpy.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.edited_payload).toBe('[REDACTED]');
    expect(payload.pii_categories).toContain('phone');
    expect(JSON.stringify(payload)).not.toContain('+52 55 1234 5678');
  });

  it('sin PII: `editedPayload` se marca como [REDACTED] igualmente (política siempre-oculta)', () => {
    const l = new HitlLogger();
    l.emit('ai.recommendation.payload_invalid', {
      actorId: 'u1',
      type: 'event_plan',
      recommendationId: 'r1',
      editedPayload: { summary: 'plan neutro sin PII', phases: [] },
    });
    const payload = warnSpy.mock.calls[0]![0] as Record<string, unknown>;
    // La política es no loguear el contenido nunca (siempre `[REDACTED]`), aun sin PII.
    expect(payload.edited_payload).toBe('[REDACTED]');
    expect(payload.pii_categories).toBeUndefined();
  });
});
