import { describe, expect, it, vi } from 'vitest';
import { httpGet } from '@/shared/api-client';

describe('MSW catch-all', () => {
  it('endpoint sin handler dedicado → 501 NOT_MOCKED (TS-14)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(httpGet('/unmocked-endpoint')).rejects.toMatchObject({
      code: 'NOT_MOCKED',
      status: 501,
    });
  });
});
