// API client — vendor-services (US-044 / PB-P1-027 / FE-003).
// Namespace `vendorsApi.services.*` — 4 métodos: list, create, update, deactivate.
import { httpDelete, httpGet, httpPatch, httpPost } from '@/shared/api-client';
import type {
  CreateVendorServiceInput,
  UpdateVendorServiceInput,
  VendorServiceEnvelope,
  VendorServiceListEnvelope,
  VendorServiceView,
} from './vendorServicesApi.types';
import { toVendorServiceView } from './vendorServicesApi.types';

export const vendorServicesApi = {
  async list(): Promise<VendorServiceView[]> {
    const envelope = await httpGet<VendorServiceListEnvelope>(`/vendors/me/services`);
    return envelope.data.items.map(toVendorServiceView);
  },

  async create(input: CreateVendorServiceInput): Promise<VendorServiceView> {
    const envelope = await httpPost<VendorServiceEnvelope, CreateVendorServiceInput>(
      `/vendors/me/services`,
      { body: input },
    );
    return toVendorServiceView(envelope.data);
  },

  async update(id: string, input: UpdateVendorServiceInput): Promise<VendorServiceView> {
    const envelope = await httpPatch<VendorServiceEnvelope, UpdateVendorServiceInput>(
      `/vendors/me/services/${id}`,
      { body: input },
    );
    return toVendorServiceView(envelope.data);
  },

  async deactivate(id: string): Promise<void> {
    await httpDelete<void>(`/vendors/me/services/${id}`);
  },
};
