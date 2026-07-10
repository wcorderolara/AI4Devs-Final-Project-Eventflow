import { describe, expect, it } from 'vitest';
import { parseErrorEnvelope } from '@/shared/api-client';

describe('parseErrorEnvelope', () => {
  it('parsea un envelope válido', () => {
    expect(parseErrorEnvelope({ error: { code: 'X', message: 'm' } })).toEqual({ code: 'X', message: 'm' });
  });

  it('acepta details opcional', () => {
    const parsed = parseErrorEnvelope({ error: { code: 'X', message: 'm', details: { field: 'email' } } });
    expect(parsed?.details).toEqual({ field: 'email' });
  });

  it('retorna null para estructuras inválidas', () => {
    expect(parseErrorEnvelope({ message: 'no error key' })).toBeNull();
    expect(parseErrorEnvelope({ error: { code: 123 } })).toBeNull();
    expect(parseErrorEnvelope('plain text')).toBeNull();
    expect(parseErrorEnvelope(null)).toBeNull();
  });
});
