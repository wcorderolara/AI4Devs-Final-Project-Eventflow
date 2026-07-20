// US-098 / QA-001..004 — Tests del snapshot OpenAPI (sin BD, sin red). AC-01..05; VR; SEC.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { buildOpenApiDocument, serializeOpenApiDocument } from '../../src/openapi/openapi.js';

const here = dirname(fileURLToPath(import.meta.url));
const committedPath = resolve(here, '../../openapi.json');

type Doc = {
  openapi: string;
  info: { title: string; version: string };
  servers: unknown[];
  tags: unknown[];
  paths: Record<string, Record<string, { operationId?: string; tags?: string[]; responses: Record<string, unknown>; security?: unknown }>>;
  components: { schemas: Record<string, unknown>; responses: Record<string, unknown>; securitySchemes: Record<string, unknown> };
};

const doc = buildOpenApiDocument() as unknown as Doc;

describe('QA-001: generación válida OpenAPI 3.x (AC-01)', () => {
  it('es OpenAPI 3.x con info/servers/tags/paths/components', () => {
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.info.title).toBeTruthy();
    expect(Array.isArray(doc.servers)).toBe(true);
    expect(Array.isArray(doc.tags)).toBe(true);
    expect(Object.keys(doc.paths).length).toBeGreaterThanOrEqual(30);
  });
  it('valida con swagger-parser (redocly-equivalente)', async () => {
    await SwaggerParser.validate(structuredClone(doc) as never);
  });
  it('incluye componentes comunes: ErrorEnvelope, ResponseMeta, Pagination + securitySchemes.cookieAuth (AC-04/05)', () => {
    expect(doc.components.schemas.ErrorEnvelope).toBeDefined();
    expect(doc.components.schemas.ResponseMeta).toBeDefined();
    expect(doc.components.schemas.Pagination).toBeDefined();
    expect(doc.components.securitySchemes.cookieAuth).toBeDefined();
    expect(Object.keys(doc.components.responses)).toEqual(
      expect.arrayContaining(['Unauthorized', 'Forbidden', 'NotFound', 'ValidationError', 'RateLimited']),
    );
  });
});

describe('QA-002: determinismo (AC-01)', () => {
  it('serializar dos veces produce el mismo output', () => {
    expect(serializeOpenApiDocument(buildOpenApiDocument())).toBe(serializeOpenApiDocument(buildOpenApiDocument()));
  });
});

describe('QA-003: sin drift contra el snapshot versionado (AC-03, CT-01)', () => {
  it('backend/openapi.json coincide con el output generado', () => {
    const committed = readFileSync(committedPath, 'utf8');
    expect(serializeOpenApiDocument(buildOpenApiDocument())).toBe(committed);
  });
});

describe('QA-004: contrato/seguridad (AC-05, VR-03/05, SEC)', () => {
  it('todos los paths usan el prefijo /api/v1 (VR-05)', () => {
    const bad = Object.keys(doc.paths).filter((p) => !p.startsWith('/api/v1'));
    expect(bad).toEqual([]);
  });
  it('toda operación tiene operationId, tags y responses (VR-03, EC-03)', () => {
    for (const [path, methods] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        expect(op.operationId, `${method} ${path} sin operationId`).toBeTruthy();
        expect(op.tags?.length, `${method} ${path} sin tags`).toBeGreaterThan(0);
        expect(Object.keys(op.responses).length, `${method} ${path} sin responses`).toBeGreaterThan(0);
      }
    }
  });
  it('endpoints protegidos declaran cookieAuth y respuesta 401 (SEC-03, AUTH-TS-01)', () => {
    const publicOps = new Set([
      'registerUser',
      'loginUser',
      'requestPasswordReset',
      'resetPassword',
      // US-066 (PB-P1-039): listado público paginado de reviews por vendor con optional
      // session auth — anónimo permitido; admin extiende alcance en runtime sin declararse
      // como endpoint autenticado en OpenAPI.
      'listVendorReviews',
    ]);
    for (const methods of Object.values(doc.paths)) {
      for (const op of Object.values(methods)) {
        if (op.operationId && publicOps.has(op.operationId)) {
          expect(op.security, `${op.operationId} público no debe tener security`).toBeUndefined();
        } else {
          expect(op.security, `${op.operationId} protegido sin cookieAuth`).toEqual([{ cookieAuth: [] }]);
          expect(op.responses['401'], `${op.operationId} sin 401`).toBeDefined();
        }
      }
    }
  });
  it('no contiene secretos/PII: sin valores tipo password real, tokens, connection strings (SEC-04, NT-04)', () => {
    const serialized = serializeOpenApiDocument(buildOpenApiDocument());
    expect(serialized).not.toMatch(/Secret1234|postgresql:\/\/|BEGIN (RSA|PRIVATE) KEY|sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{10,}\./);
    expect(serialized).not.toMatch(/@(gmail|hotmail|outlook)\.com|eventflow\.demo/);
  });
});
