// US-122 / QA-005, SEC-001 (AC-06, AC-10) — sanitizer/minimización de inputPayload. Verifica que
// secrets, tokens, cookies, credenciales y PII de contacto se remueven a cualquier profundidad y
// que el payload persistido queda minimizado.
import { describe, it, expect } from 'vitest';
import {
  sanitizeInputPayload,
  isSensitivePayloadKey,
} from '../../src/modules/ai-assistance/application/ai-recommendation-payload-sanitizer.js';
import { AIRecommendationUnsafePayloadError } from '../../src/modules/ai-assistance/domain/errors/ai-recommendation-persistence.errors.js';

describe('US-122 AC-06 — redacción de campos sensibles', () => {
  it('remueve secrets/tokens/cookies/apiKey/password de nivel superior', () => {
    const out = sanitizeInputPayload({
      eventType: 'wedding',
      apiKey: 'sk-should-not-persist',
      password: 'p4ss',
      authToken: 'Bearer abc',
      cookie: 'sid=123',
    });
    expect(out).toEqual({ eventType: 'wedding' });
  });

  it('remueve PII de contacto (email, phone, address)', () => {
    const out = sanitizeInputPayload({ name: 'Evento X', email: 'a@gmail.com', phone: '+50588887777', address: 'Calle 1' });
    expect(out).toEqual({ name: 'Evento X' });
  });

  it('redacta campos sensibles anidados a cualquier profundidad', () => {
    const out = sanitizeInputPayload({
      event: { title: 'Boda', organizer: { name: 'Ana', email: 'ana@gmail.com', creditCard: '4111111111111111' } },
    });
    expect(out).toEqual({ event: { title: 'Boda', organizer: { name: 'Ana' } } });
  });

  it('no persiste el valor de un secret inyectado', () => {
    const out = sanitizeInputPayload({ note: 'ok', secretValue: 'TOPSECRET' });
    expect(JSON.stringify(out)).not.toContain('TOPSECRET');
  });

  it('minimiza: poda anidamiento excesivo (> profundidad máxima)', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: 'too-deep' } } } } } } };
    const out = sanitizeInputPayload(deep);
    expect(JSON.stringify(out)).not.toContain('too-deep');
  });

  it('input no-objeto => AIRecommendationUnsafePayloadError', () => {
    expect(() => sanitizeInputPayload('a string' as unknown)).toThrow(AIRecommendationUnsafePayloadError);
    expect(() => sanitizeInputPayload([1, 2, 3] as unknown)).toThrow(AIRecommendationUnsafePayloadError);
    expect(() => sanitizeInputPayload(null)).toThrow(AIRecommendationUnsafePayloadError);
  });

  it('isSensitivePayloadKey detecta claves conocidas (case-insensitive)', () => {
    expect(isSensitivePayloadKey('API_KEY')).toBe(true);
    expect(isSensitivePayloadKey('userEmail')).toBe(true);
    expect(isSensitivePayloadKey('eventType')).toBe(false);
  });
});
