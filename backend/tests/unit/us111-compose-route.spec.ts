// US-111 / QA-001 — Invariantes de composición de rutas (AC-02, AC-07).
// El helper debe emitir SIEMPRE el orden canónico sin importar el orden de las claves del spec,
// de modo que un cambio inseguro (validation antes de auth, handler no-último) sea imposible.
import { describe, it, expect } from 'vitest';
import type { RequestHandler } from 'express';
import {
  composeProtectedRoute,
  composePublicSensitiveRoute,
} from '../../src/shared/interface/http/compose-route.js';

// Handlers identificables por nombre para aserciones de orden.
const auth = (() => {}) as RequestHandler;
const role = (() => {}) as RequestHandler;
const ownership = (() => {}) as RequestHandler;
const policy = (() => {}) as RequestHandler;
const rateLimit = (() => {}) as RequestHandler;
const validation = (() => {}) as RequestHandler;
const handler = (() => {}) as RequestHandler;
const captcha = (() => {}) as RequestHandler;

describe('US-111 QA-001: composeProtectedRoute (AC-02)', () => {
  it('emite el orden canónico auth → role → ownership → policy → rateLimit → validation → handler', () => {
    // Claves en orden DESORDENADO a propósito: el helper debe reordenarlas.
    const chain = composeProtectedRoute({ handler, validation, role, auth, policy, ownership, rateLimit });
    expect(chain).toEqual([auth, role, ownership, policy, rateLimit, validation, handler]);
  });

  it('auth siempre es el primero y handler siempre el último', () => {
    const chain = composeProtectedRoute({ auth, validation, handler });
    expect(chain[0]).toBe(auth);
    expect(chain[chain.length - 1]).toBe(handler);
    // validation nunca precede a auth.
    expect(chain.indexOf(validation)).toBeGreaterThan(chain.indexOf(auth));
  });

  it('omite slots opcionales ausentes', () => {
    expect(composeProtectedRoute({ auth, handler })).toEqual([auth, handler]);
  });

  it('soporta ownership/policy como arreglos, preservando su posición', () => {
    const own2 = (() => {}) as RequestHandler;
    const chain = composeProtectedRoute({ auth, role, ownership: [ownership, own2], validation, handler });
    expect(chain).toEqual([auth, role, ownership, own2, validation, handler]);
  });
});

describe('US-111 QA-001: composePublicSensitiveRoute (AC-03)', () => {
  it('emite rateLimit → captcha → validation → handler y no incluye auth', () => {
    const chain = composePublicSensitiveRoute({ handler, validation, captcha, rateLimit });
    expect(chain).toEqual([rateLimit, captcha, validation, handler]);
    expect(chain).not.toContain(auth);
  });

  it('handler siempre último aunque falten controles', () => {
    const chain = composePublicSensitiveRoute({ handler });
    expect(chain).toEqual([handler]);
  });
});
