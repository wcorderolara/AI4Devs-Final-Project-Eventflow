import { httpGet, httpPost } from '@/shared/api-client';
import type {
  SeedResetEnvelope,
  SeedResetInput,
  SeedResetReportDTO,
  SeedStatusDTO,
  SeedStatusEnvelope,
} from './adminSeedApi.types';

export const adminSeedApi = {
  async status(): Promise<SeedStatusDTO> {
    const envelope = await httpGet<SeedStatusEnvelope>('/admin/seed/status');
    return envelope.data;
  },
  async reset(input: SeedResetInput = {}): Promise<SeedResetReportDTO> {
    const body: SeedResetInput = {};
    if (input.reason && input.reason.trim().length > 0) body.reason = input.reason.trim();
    const envelope = await httpPost<SeedResetEnvelope, SeedResetInput>('/admin/seed/reset', {
      body,
    });
    return envelope.data;
  },
};
