// PR-5 / US-122 SEC-001 — Regresión del sanitizer de persistencia sobre las keys REALES de input IA.
// Desde PR-5 todo `inputPayload` generado pasa por `sanitizeInputPayload` (match por substring), así
// que ninguna key que usen las features (FE, use cases US-022/US-024, hints del mock, regeneración)
// puede caer por accidente en la denylist: US-059 lee `category_code`, US-022 `quote_ids_snapshot`,
// US-026 re-genera desde el input persistido.
import { describe, it, expect } from 'vitest';
import {
  sanitizeInputPayload,
  isSensitivePayloadKey,
} from '../../src/modules/ai-assistance/application/ai-recommendation-payload-sanitizer.js';

// Keys enviadas por el FE (event-plan, checklist, budget-suggestion, vendor-categories, quote-brief).
const FRONTEND_KEYS = [
  'eventTypeCode', 'eventDate', 'guestCount', 'budgetEstimated', 'currencyCode', 'city', 'days_to_event',
  'event_type_code', 'guest_count', 'budget_estimated', 'currency_code', 'language_code', 'service_category_code',
];
// Keys armadas por los use cases (US-022 quote_compare_summary, US-024 task_priority) y sus items.
const USE_CASE_KEYS = [
  'category_code', 'category_name', 'quotes', 'quote_id', 'vendor_business_name', 'vendor_rating_avg',
  'total_price', 'valid_until', 'breakdown', 'conditions', 'status', 'is_preferred', 'quote_ids_snapshot',
  'prompt_version', 'event_id', 'tasks', 'task_id', 'title', 'due_date', 'task_ids_snapshot', 'signature',
];
// Hints del MockAIProvider y clave auditable de regeneración (US-026).
const HINT_KEYS = ['__quote_ids', '__task_ids', '__scenarioSeed', '__promptVersionId', '__simulate', '__regeneration_feedback'];

describe('PR-5 — sanitizer de persistencia no borra keys de input de las features IA', () => {
  it.each([...FRONTEND_KEYS, ...USE_CASE_KEYS, ...HINT_KEYS])('%s no es sensible', (key) => {
    expect(isSensitivePayloadKey(key)).toBe(false);
  });

  it('un input US-022 representativo se persiste íntegro', () => {
    const input = {
      category_code: 'catering',
      category_name: 'Catering',
      quotes: [
        { quote_id: 'q1', vendor_business_name: 'Banquetes SA', vendor_rating_avg: 4.5, total_price: '100.00', valid_until: '2027-01-01', breakdown: [{ label: 'Menú', amount: '100.00' }], conditions: 'Anticipo 50%', status: 'sent', is_preferred: false },
      ],
      quote_ids_snapshot: ['q1'],
      prompt_version: 'v1',
      __quote_ids: ['q1'],
    };
    expect(sanitizeInputPayload(input)).toEqual(input);
  });

  it('un input US-024 representativo se persiste íntegro', () => {
    const input = {
      event_id: 'e1',
      tasks: [{ task_id: 't1', title: 'Reservar salón', due_date: null, status: 'pending' }],
      task_ids_snapshot: ['t1'],
      signature: 'sig',
      prompt_version: 'v1',
      __task_ids: ['t1'],
      __regeneration_feedback: 'más breve',
    };
    expect(sanitizeInputPayload(input)).toEqual(input);
  });

  it('sigue redactando PII/credenciales', () => {
    expect(sanitizeInputPayload({ guests: 1, email: 'a@b.c', apiKey: 'k', venue_address: 'x' })).toEqual({ guests: 1 });
  });
});
