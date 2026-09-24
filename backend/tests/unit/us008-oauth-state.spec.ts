// US-008 (PB-P4-001 / BE-002, SEC-03) — Servicio state+nonce anti-CSRF.
// Cubre generación aleatoria única, `safeEqual` (comparación en tiempo constante) y el parseo
// defensivo de la cookie firmada (ausente/malformada → null). La validación end-to-end de
// `state inválido → 400` vive en QA-001/QA-003 (nivel endpoint).
import type { Request } from 'express';
import { describe, it, expect } from 'vitest';
import {
  generateStateNonce,
  readOAuthStateCookie,
  safeEqual,
  OAUTH_STATE_COOKIE_NAME,
} from '../../src/infrastructure/security/oauth-state-cookie.js';

function reqWithSignedCookie(value: unknown): Request {
  return { signedCookies: { [OAUTH_STATE_COOKIE_NAME]: value } } as unknown as Request;
}

describe('US-008 BE-002 — state/nonce', () => {
  it('genera state y nonce distintos y de longitud suficiente (256 bits base64url)', () => {
    const a = generateStateNonce();
    const b = generateStateNonce();
    expect(a.state).not.toBe(a.nonce);
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
    // 32 bytes en base64url ≈ 43 chars.
    expect(a.state.length).toBeGreaterThanOrEqual(43);
    expect(a.nonce.length).toBeGreaterThanOrEqual(43);
  });

  it('safeEqual: true para iguales, false para distintos o longitudes diferentes', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true);
    expect(safeEqual('abc123', 'abc124')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('readOAuthStateCookie: parsea la cookie firmada válida', () => {
    const value = JSON.stringify({ state: 's1', nonce: 'n1' });
    expect(readOAuthStateCookie(reqWithSignedCookie(value))).toEqual({ state: 's1', nonce: 'n1' });
  });

  it('readOAuthStateCookie: null ante ausencia, no-string, JSON malformado o shape inválido', () => {
    expect(readOAuthStateCookie(reqWithSignedCookie(undefined))).toBeNull();
    expect(readOAuthStateCookie(reqWithSignedCookie(123))).toBeNull();
    expect(readOAuthStateCookie(reqWithSignedCookie('{not json'))).toBeNull();
    expect(readOAuthStateCookie(reqWithSignedCookie(JSON.stringify({ state: 's' })))).toBeNull();
  });
});
