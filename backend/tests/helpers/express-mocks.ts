// Helpers de mock para tests unitarios de middlewares (US-091). Sin `any`.
import type { Request, Response } from 'express';

export interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
  setHeader(key: string, value: string): void;
  on(event: string, cb: () => void): MockResponse;
  emit(event: string): void;
}

export function createMockRequest(init: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    method: 'GET',
    path: '/',
    ...init,
  } as unknown as Request;
}

export function createMockResponse(): MockResponse {
  const listeners: Record<string, Array<() => void>> = {};
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    on(event, cb) {
      (listeners[event] ??= []).push(cb);
      return this;
    },
    emit(event) {
      (listeners[event] ?? []).forEach((cb) => cb());
    },
  };
  return res;
}

export function asResponse(res: MockResponse): Response {
  return res as unknown as Response;
}
