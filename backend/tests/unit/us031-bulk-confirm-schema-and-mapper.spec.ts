// US-031 (PB-P1-017) / QA-001 — Unit tests del schema Zod y del mapper de resultado.
// VR-01..03 + EC-07 + EC-08 + mapping de `error.code` a mensaje humano.
import { describe, it, expect } from 'vitest';
import {
  confirmAITasksBulkBodySchema,
  confirmAITasksBulkParamsSchema,
} from '../../src/modules/task-management/bulk-confirm/interface/http/confirm-bulk.schema.js';
import { mapOutcomeToResult } from '../../src/modules/task-management/bulk-confirm/application/bulk-confirm-result.mapper.js';

const validUuid = '11111111-1111-1111-1111-111111111111';

describe('confirmAITasksBulkParamsSchema — US-031 VR-01', () => {
  it('acepta UUID v4 válido', () => {
    const r = confirmAITasksBulkParamsSchema.safeParse({ eventId: validUuid });
    expect(r.success).toBe(true);
  });
  it('rechaza formato inválido', () => {
    const r = confirmAITasksBulkParamsSchema.safeParse({ eventId: 'not-uuid' });
    expect(r.success).toBe(false);
  });
});

describe('confirmAITasksBulkBodySchema — US-031 VR-02..03 / EC-07..08', () => {
  it('acepta arreglo de 1..200 UUIDs', () => {
    const r = confirmAITasksBulkBodySchema.safeParse({ taskIds: [validUuid] });
    expect(r.success).toBe(true);
  });
  it('EC-08 rechaza taskIds vacío (min 1)', () => {
    const r = confirmAITasksBulkBodySchema.safeParse({ taskIds: [] });
    expect(r.success).toBe(false);
  });
  it('rechaza UUID inválido en el arreglo', () => {
    const r = confirmAITasksBulkBodySchema.safeParse({ taskIds: ['not-uuid'] });
    expect(r.success).toBe(false);
  });
  it('EC-07 rechaza payloads absurdos (>200) — el límite 50 post-dedup vive en el use case', () => {
    const many = Array.from({ length: 201 }, () => validUuid);
    const r = confirmAITasksBulkBodySchema.safeParse({ taskIds: many });
    expect(r.success).toBe(false);
  });
});

describe('mapOutcomeToResult — US-031 BE-004', () => {
  it('accepted:true → sin `error`', () => {
    expect(mapOutcomeToResult('id-1', { accepted: true })).toEqual({ taskId: 'id-1', accepted: true });
  });
  it.each([
    ['TASK_NOT_FOUND', 'Task not found.'],
    ['TASK_NOT_IN_EVENT', 'Task does not belong to this event.'],
    ['TASK_NOT_AI', 'Task is not AI-generated.'],
    ['TASK_NOT_PENDING', 'Task is no longer pending.'],
  ] as const)('mapea code %s con mensaje humano', (code, message) => {
    const r = mapOutcomeToResult('id-1', { accepted: false, code });
    expect(r.accepted).toBe(false);
    expect(r.error).toEqual({ code, message });
  });
});
