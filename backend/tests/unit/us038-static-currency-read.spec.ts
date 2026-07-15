// US-038 (PB-P1-022 / QA-001 UT-06) — Tests unitarios del adapter estático de
// `CurrencyReadPort`. Cobertura de códigos MVP, CLP/JPY forward-compat y fallback (null) para
// códigos fuera del mapa (dispara log warning en el use case, EC-05 / VR-02).
import { describe, it, expect } from 'vitest';
import { StaticCurrencyReadAdapter } from '../../src/modules/budget-management/infrastructure/static-currency-read.adapter.js';

describe('US-038 QA-001 — StaticCurrencyReadAdapter (BE-002)', () => {
  const adapter = new StaticCurrencyReadAdapter();

  it.each(['GTQ', 'EUR', 'MXN', 'COP', 'USD'])('resuelve %s ⇒ decimal_places=2 (enum MVP)', async (code) => {
    const result = await adapter.findByCode(code);
    expect(result).toEqual({ code, decimal_places: 2 });
  });

  it('resuelve CLP ⇒ decimal_places=0 (forward-compat cuando el enum lo incluya)', async () => {
    expect(await adapter.findByCode('CLP')).toEqual({ code: 'CLP', decimal_places: 0 });
  });

  it('resuelve JPY ⇒ decimal_places=0 (forward-compat)', async () => {
    expect(await adapter.findByCode('JPY')).toEqual({ code: 'JPY', decimal_places: 0 });
  });

  it('normaliza case: "usd" ⇒ USD', async () => {
    expect(await adapter.findByCode('usd')).toEqual({ code: 'USD', decimal_places: 2 });
  });

  it('UT-06 código fuera del mapa ⇒ null (dispara fallback defensivo en use case)', async () => {
    expect(await adapter.findByCode('XXX')).toBeNull();
  });
});
