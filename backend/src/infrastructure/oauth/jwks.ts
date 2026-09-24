// JWKS provider para verificación del `id_token` de Google (US-008 / BE-001). Convierte cada JWK
// pública (por `kid`) en un `KeyObject` de `node:crypto` (`createPublicKey({ format: 'jwk' })`),
// evitando agregar dependencias nuevas (jose/jwks-rsa). El `GoogleJwksProvider` cachea las claves
// por `kid` y las refresca ante un `kid` desconocido (rotación de Google) respetando el TTL del
// header `Cache-Control: max-age`. Un `StaticJwksProvider` habilita tests deterministas sin red.
import { createPublicKey, type KeyObject, type JsonWebKey } from 'node:crypto';
import type { FetchLike } from '../captcha/siteverify-client.js';

/** JWK RSA pública mínima (RFC 7517) tal como la publica Google en su certs endpoint. */
export interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

/** Fuente de claves públicas por `kid`. `refresh=true` fuerza recarga (kid desconocido/rotación). */
export interface JwksProvider {
  getKey(kid: string, refresh?: boolean): Promise<KeyObject | null>;
}

/** Convierte una JWK RSA en un `KeyObject` público verificable por `jsonwebtoken`. */
export function jwkToKeyObject(jwk: Jwk): KeyObject {
  return createPublicKey({ key: jwk as unknown as JsonWebKey, format: 'jwk' });
}

/** URL pública de las JWK de Google (OIDC). Constante del proveedor (no configurable). */
export const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

/** Provider estático (tests / mock): mapa fijo de `kid` → `KeyObject`. Sin red. */
export class StaticJwksProvider implements JwksProvider {
  constructor(private readonly keys: Map<string, KeyObject>) {}

  getKey(kid: string): Promise<KeyObject | null> {
    return Promise.resolve(this.keys.get(kid) ?? null);
  }
}

/**
 * Provider que descarga las JWK de Google y las cachea por `kid` con TTL (del `Cache-Control`).
 * Ante un `kid` no cacheado o expirado, refresca una vez. `fetchFn` es inyectable (tests sin red).
 */
export class GoogleJwksProvider implements JwksProvider {
  private cache = new Map<string, KeyObject>();
  private expiresAtMs = 0;

  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly nowMs: () => number = () => Date.now(),
    private readonly jwksUri: string = GOOGLE_JWKS_URI,
  ) {}

  async getKey(kid: string, refresh = false): Promise<KeyObject | null> {
    const expired = this.nowMs() >= this.expiresAtMs;
    if (refresh || expired || !this.cache.has(kid)) {
      await this.reload();
    }
    return this.cache.get(kid) ?? null;
  }

  /** Descarga y reconstruye el cache; deriva el TTL del header `Cache-Control: max-age`. */
  private async reload(): Promise<void> {
    const res = await this.fetchFn(this.jwksUri, { method: 'GET' });
    if (!res.ok) throw new Error(`jwks_fetch_failed:${res.status}`);
    const body = (await res.json()) as { keys?: Jwk[] };
    const keys = body.keys ?? [];
    const next = new Map<string, KeyObject>();
    for (const jwk of keys) {
      if (jwk.kty === 'RSA' && jwk.kid) {
        try {
          next.set(jwk.kid, jwkToKeyObject(jwk));
        } catch {
          // JWK malformada → se ignora (no debe tumbar la verificación de otras claves).
        }
      }
    }
    this.cache = next;
    this.expiresAtMs = this.nowMs() + this.parseMaxAgeMs(res.headers.get('cache-control'));
  }

  /** Extrae `max-age` (ms) del header; default 3600 s si no está presente. */
  private parseMaxAgeMs(cacheControl: string | null): number {
    const match = cacheControl?.match(/max-age=(\d+)/i);
    const seconds = match ? Number(match[1]) : 3600;
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 3600 * 1000;
  }
}
