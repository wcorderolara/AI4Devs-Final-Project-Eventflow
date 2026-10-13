// API client — vendor-services (US-044 / PB-P1-027 / FE-003).
// Namespace `vendorsApi.services.*` — 4 métodos: list, create, update, deactivate.
import { httpDelete, httpGetData, httpPatchData, httpPostData } from '@/shared/api-client';
import type {
  CreateVendorServiceInput,
  UpdateVendorServiceInput,
  VendorServiceDTO,
  VendorServiceView,
} from './vendorServicesApi.types';
import { toVendorServiceView } from './vendorServicesApi.types';

export const vendorServicesApi = {
  async list(): Promise<VendorServiceView[]> {
    const data = await httpGetData<{ items: VendorServiceDTO[] }>(`/vendors/me/services`);
    return data.items.map(toVendorServiceView);
  },

  async create(input: CreateVendorServiceInput): Promise<VendorServiceView> {
    const dto = await httpPostData<VendorServiceDTO, CreateVendorServiceInput>(
      `/vendors/me/services`,
      { body: input },
    );
    return toVendorServiceView(dto);
  },

  async update(id: string, input: UpdateVendorServiceInput): Promise<VendorServiceView> {
    const dto = await httpPatchData<VendorServiceDTO, UpdateVendorServiceInput>(
      `/vendors/me/services/${id}`,
      { body: input },
    );
    return toVendorServiceView(dto);
  },

  async deactivate(id: string): Promise<void> {
    await httpDelete<void>(`/vendors/me/services/${id}`);
  },
};
