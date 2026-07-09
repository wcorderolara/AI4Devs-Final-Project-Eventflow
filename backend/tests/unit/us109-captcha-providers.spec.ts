// US-109 / QA-002 — Adapters reales reCAPTCHA/hCaptcha con fetch MOCKEADO (AC-06, EC-03/04/05).
// Ningún test toca la red: el `fetchFn` inyectado devuelve respuestas controladas. Verifica
// mapeo de success/failure, action mismatch, score bajo, expirado/duplicado, timeout y error.
import { describe, it, expect } from 'vitest';
import type { FetchLike, SiteverifyResponse } from '../../src/infrastructure/captcha/siteverify-client.js';
import { RecaptchaProvider } from '../../src/infrastructure/captcha/recaptcha-provider.js';
import { HcaptchaProvider } from '../../src/infrastructure/captcha/hcaptcha-provider.js';

/** fetch fake que responde 200 con el JSON dado. */
function jsonFetch(body: SiteverifyResponse): FetchLike {
  return (() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as unknown as Response)) as FetchLike;
}
/** fetch fake que rechaza con AbortError (simula timeout). */
const timeoutFetch: FetchLike = (() =>
  Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))) as FetchLike;
/** fetch fake que rechaza con error genérico de red. */
const errorFetch: FetchLike = (() => Promise.reject(new Error('ECONNRESET'))) as FetchLike;

describe('US-109 QA-002: RecaptchaProvider (AC-06)', () => {
  it('success + score alto + action correcta → success', async () => {
    const p = new RecaptchaProvider(jsonFetch({ success: true, score: 0.9, action: 'login' }));
    await expect(p.verify({ token: 't', expectedAction: 'login' })).resolves.toMatchObject({
      success: true, outcome: 'success', actionMatched: true,
    });
  });

  it('score por debajo del umbral → score_too_low (EC-04)', async () => {
    const p = new RecaptchaProvider(jsonFetch({ success: true, score: 0.2, action: 'login' }));
    await expect(p.verify({ token: 't', expectedAction: 'login' })).resolves.toMatchObject({
      success: false, outcome: 'score_too_low',
    });
  });

  it('action distinta a la esperada → action_mismatch (EC-03)', async () => {
    const p = new RecaptchaProvider(jsonFetch({ success: true, score: 0.9, action: 'register' }));
    await expect(p.verify({ token: 't', expectedAction: 'login' })).resolves.toMatchObject({
      success: false, outcome: 'action_mismatch',
    });
  });

  it('success=false con timeout-or-duplicate → expired_or_duplicate', async () => {
    const p = new RecaptchaProvider(jsonFetch({ success: false, 'error-codes': ['timeout-or-duplicate'] }));
    await expect(p.verify({ token: 't' })).resolves.toMatchObject({ success: false, outcome: 'expired_or_duplicate' });
  });

  it('success=false genérico → invalid_token', async () => {
    const p = new RecaptchaProvider(jsonFetch({ success: false, 'error-codes': ['invalid-input-response'] }));
    await expect(p.verify({ token: 't' })).resolves.toMatchObject({ success: false, outcome: 'invalid_token' });
  });

  it('timeout del proveedor → provider_timeout (EC-05)', async () => {
    const p = new RecaptchaProvider(timeoutFetch);
    await expect(p.verify({ token: 't' })).resolves.toMatchObject({ success: false, outcome: 'provider_timeout' });
  });

  it('error de red → provider_error', async () => {
    const p = new RecaptchaProvider(errorFetch);
    await expect(p.verify({ token: 't' })).resolves.toMatchObject({ success: false, outcome: 'provider_error' });
  });
});

describe('US-109 QA-002: HcaptchaProvider (AC-06)', () => {
  it('success → success', async () => {
    const p = new HcaptchaProvider(jsonFetch({ success: true }));
    await expect(p.verify({ token: 't' })).resolves.toMatchObject({ success: true, outcome: 'success' });
  });

  it('success=false con expired-input-response → expired_or_duplicate', async () => {
    const p = new HcaptchaProvider(jsonFetch({ success: false, 'error-codes': ['expired-input-response'] }));
    await expect(p.verify({ token: 't' })).resolves.toMatchObject({ success: false, outcome: 'expired_or_duplicate' });
  });

  it('success=false genérico → invalid_token', async () => {
    const p = new HcaptchaProvider(jsonFetch({ success: false }));
    await expect(p.verify({ token: 't' })).resolves.toMatchObject({ success: false, outcome: 'invalid_token' });
  });

  it('timeout → provider_timeout; error de red → provider_error', async () => {
    await expect(new HcaptchaProvider(timeoutFetch).verify({ token: 't' })).resolves.toMatchObject({ outcome: 'provider_timeout' });
    await expect(new HcaptchaProvider(errorFetch).verify({ token: 't' })).resolves.toMatchObject({ outcome: 'provider_error' });
  });
});
