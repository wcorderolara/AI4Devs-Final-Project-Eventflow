import { httpGetData, httpPostData } from '@/shared/api-client';
import type { SeedResetInput, SeedResetReportDTO, SeedStatusDTO } from './adminSeedApi.types';

export const adminSeedApi = {
  async status(): Promise<SeedStatusDTO> {
    return httpGetData<SeedStatusDTO>('/admin/seed/status');
  },
  async reset(input: SeedResetInput = {}): Promise<SeedResetReportDTO> {
    const body: SeedResetInput = {};
    if (input.reason && input.reason.trim().length > 0) body.reason = input.reason.trim();
    return httpPostData<SeedResetReportDTO, SeedResetInput>('/admin/seed/reset', {
      body,
    });
  },
};
