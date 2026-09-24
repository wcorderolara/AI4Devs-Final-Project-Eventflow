// US-008 (PB-P4-001 / BE-001, SEC-001) — Verificación del `id_token` en `GoogleOAuthProvider`.
// Usa un par RSA REAL generado en el test para firmar `id_token`s y una JWK derivada de la clave
// pública (sin red). Cubre: firma válida (happy), firma inválida (otra clave), `aud`/`iss`
// incorrectos, `exp` vencido, `nonce` mismatch, `email_verified=false`, `alg` inesperado y cacheo
// de JWK por `kid` (NT-01/NT-02/NT-03, VR-01/VR-02, SEC-01..03). DoD BE-001.
import { generateKeyPairSync, type KeyObject } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, it, expect, vi } from 'vitest';
import { GoogleOAuthProvider, GOOGLE_ISSUERS } from '../../src/infrastructure/oauth/google-oauth-provider.js';
import { StaticJwksProvider, type JwksProvider } from '../../src/infrastructure/oauth/jwks.js';
import { OAuthVerificationError } from '../../src/shared/domain/errors/oauth.errors.js';

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const KID = 'test-kid-1';

// Par RSA de test (2048). `generateKeyPairSync` sin encoding devuelve `KeyObject`s directamente;
// la clave pública se registra en el JwksProvider por `kid`.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKeyObject: KeyObject = publicKey;
const jwks = new StaticJwksProvider(new Map([[KID, publicKeyObject]]));

/** Firma un `id_token` RS256 con claims arbitrarios y `kid` de test. */
function signIdToken(claims: Record<string, unknown>, opts: { kid?: string } = {}): string {
  return jwt.sign(claims, privateKey, {
    algorithm: 'RS256',
    keyid: opts.kid ?? KID,
  });
}

const baseClaims = {
  sub: 'google-sub-123',
  email: 'user@gmail.com',
  email_verified: true,
  name: 'Test User',
  nonce: 'nonce-abc',
  aud: CLIENT_ID,
  iss: GOOGLE_ISSUERS[0],
  exp: Math.floor(Date.now() / 1000) + 600,
};

function makeProvider(jwksProvider: JwksProvider = jwks): GoogleOAuthProvider {
  return new GoogleOAuthProvider(
    { clientId: CLIENT_ID, clientSecret: 'secret', redirectUri: 'http://localhost:3000/api/v1/auth/google/callback' },
    jwksProvider,
  );
}

describe('US-008 BE-001 — GoogleOAuthProvider.verifyIdToken', () => {
  it('happy: firma válida + claims correctos → identidad verificada', async () => {
    const token = signIdToken(baseClaims);
    const identity = await makeProvider().verifyIdToken(token, { expectedNonce: 'nonce-abc' });
    expect(identity).toEqual({
      sub: 'google-sub-123',
      email: 'user@gmail.com',
      emailVerified: true,
      name: 'Test User',
    });
  });

  it('normaliza el email a lowercase', async () => {
    const token = signIdToken({ ...baseClaims, email: 'User@Gmail.com' });
    const identity = await makeProvider().verifyIdToken(token, { expectedNonce: 'nonce-abc' });
    expect(identity.email).toBe('user@gmail.com');
  });

  it('NT-01 (VR-01): id_token expirado → OAuthVerificationError', async () => {
    const token = signIdToken({ ...baseClaims, exp: Math.floor(Date.now() / 1000) - 10 });
    await expect(makeProvider().verifyIdToken(token, { expectedNonce: 'nonce-abc' })).rejects.toBeInstanceOf(
      OAuthVerificationError,
    );
  });

  it('VR-01: firma inválida (otra clave) → rechazo', async () => {
    const { privateKey: otherKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const token = jwt.sign(baseClaims, otherKey, { algorithm: 'RS256', keyid: KID });
    await expect(makeProvider().verifyIdToken(token, { expectedNonce: 'nonce-abc' })).rejects.toBeInstanceOf(
      OAuthVerificationError,
    );
  });

  it('SEC-02: `aud` incorrecto → rechazo', async () => {
    const token = signIdToken({ ...baseClaims, aud: 'otro-cliente' });
    await expect(makeProvider().verifyIdToken(token, { expectedNonce: 'nonce-abc' })).rejects.toBeInstanceOf(
      OAuthVerificationError,
    );
  });

  it('SEC-02: `iss` incorrecto → rechazo', async () => {
    const token = signIdToken({ ...baseClaims, iss: 'https://evil.example.com' });
    await expect(makeProvider().verifyIdToken(token, { expectedNonce: 'nonce-abc' })).rejects.toBeInstanceOf(
      OAuthVerificationError,
    );
  });

  it('SEC-03: `nonce` mismatch (replay) → rechazo', async () => {
    const token = signIdToken(baseClaims);
    await expect(makeProvider().verifyIdToken(token, { expectedNonce: 'otro-nonce' })).rejects.toBeInstanceOf(
      OAuthVerificationError,
    );
  });

  it('NT-03 (VR-02): email_verified=false → rechazo', async () => {
    const token = signIdToken({ ...baseClaims, email_verified: false });
    await expect(makeProvider().verifyIdToken(token, { expectedNonce: 'nonce-abc' })).rejects.toBeInstanceOf(
      OAuthVerificationError,
    );
  });

  it('SEC-01: `alg` distinto de RS256 (p. ej. HS256) → rechazo sin verificar', async () => {
    const hsToken = jwt.sign(baseClaims, 'shared-secret', { algorithm: 'HS256', keyid: KID });
    await expect(makeProvider().verifyIdToken(hsToken, { expectedNonce: 'nonce-abc' })).rejects.toBeInstanceOf(
      OAuthVerificationError,
    );
  });

  it('kid desconocido → refresca el JwksProvider una vez y luego rechaza si sigue ausente', async () => {
    const getKey = vi.fn().mockResolvedValue(null);
    const failingJwks: JwksProvider = { getKey };
    const token = signIdToken(baseClaims);
    await expect(makeProvider(failingJwks).verifyIdToken(token, { expectedNonce: 'nonce-abc' })).rejects.toBeInstanceOf(
      OAuthVerificationError,
    );
    // Primer intento sin refresh, segundo con refresh=true (rotación de Google).
    expect(getKey).toHaveBeenCalledTimes(2);
    expect(getKey).toHaveBeenNthCalledWith(2, KID, true);
  });
});
