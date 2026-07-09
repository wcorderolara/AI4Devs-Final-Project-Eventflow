// Tests de integración (Supertest) — US-092 / QA-002 (IT-01, IT-02, IT-04).
// IT-03/IT-05 dependen de endpoints de eventos (PB-P0-004) → `it.todo`.
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';

const app = createApp();

// Captcha en modo mock acepta '__test__' (US-091). El registro real lo exige (US-094 / SEC-002).
const validRegister = {
  email: 'user@example.com',
  password: 'Secret1234',
  name: 'Ana',
  role: 'organizer',
  captchaToken: '__test__',
} as const;

describe('US-092 QA-002 — Integration (Supertest)', () => {
  it('IT-01: POST /api/v1/auth/register válido pasa validación Zod y captcha (US-094 lo implementa)', async () => {
    // Actualizado por US-094: el endpoint ya no es placeholder 501. Con body y captcha válidos la
    // request supera validación+captcha y llega al use case; el resultado depende de la BD
    // (201 con BD; 500 sin BD en este entorno), pero NUNCA es un error de validación.
    const res = await request(app).post('/api/v1/auth/register').send(validRegister);
    expect(res.status).not.toBe(400);
    expect(res.body?.error?.code).not.toBe('VALIDATION_ERROR');
  });

  it('IT-02: POST /api/v1/auth/register con email inválido → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...validRegister, email: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const details = res.body.error.details as Array<{ field: string; message: string }>;
    expect(details.some((d) => d.field === 'body.email')).toBe(true);
  });

  it('IT-04: POST /api/v1/auth/register con campo inesperado → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...validRegister, extra: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.todo('IT-03: POST /api/v1/events con body válido pasa validación (requiere endpoints PB-P0-004)');
  it.todo('IT-05: GET /api/v1/events?status=invalid → 400 VALIDATION_ERROR (requiere endpoints PB-P0-004)');
});
