// API client — admin categories (US-075 / FE-005). Paridad EXACTA con el contrato
// backend (Tech Spec §7). Todas las mutaciones devuelven la categoría actualizada.
import { httpDelete, httpGet, httpPatch, httpPost } from '@/shared/api-client';
import type {
  AdminCategoriesListDTO,
  AdminCategoriesListEnvelope,
  AdminCategoryEnvelope,
  AdminCategoryNode,
  CreateCategoryBodyDTO,
  DeleteCategoryBodyDTO,
  UpdateCategoryBodyDTO,
} from './adminCategoriesApi.types';

export const adminCategoriesApi = {
  /** GET /admin/service-categories → tree + flat incluyendo `is_active=false`. */
  async list(): Promise<AdminCategoriesListDTO> {
    const envelope = await httpGet<AdminCategoriesListEnvelope>('/admin/service-categories');
    return envelope.data;
  },

  /** POST /admin/service-categories → 201 con categoría creada. */
  async create(body: CreateCategoryBodyDTO): Promise<AdminCategoryNode> {
    const envelope = await httpPost<AdminCategoryEnvelope, CreateCategoryBodyDTO>(
      '/admin/service-categories',
      { body },
    );
    return envelope.data;
  },

  /** PATCH /admin/service-categories/:id → 200 con categoría actualizada. */
  async update(id: string, body: UpdateCategoryBodyDTO): Promise<AdminCategoryNode> {
    const envelope = await httpPatch<AdminCategoryEnvelope, UpdateCategoryBodyDTO>(
      `/admin/service-categories/${encodeURIComponent(id)}`,
      { body },
    );
    return envelope.data;
  },

  /** DELETE /admin/service-categories/:id — soft delete con `reason` requerido. */
  async softDelete(id: string, body: DeleteCategoryBodyDTO): Promise<AdminCategoryNode> {
    const envelope = await httpDelete<AdminCategoryEnvelope>(
      `/admin/service-categories/${encodeURIComponent(id)}`,
      { body },
    );
    return envelope.data;
  },
};
