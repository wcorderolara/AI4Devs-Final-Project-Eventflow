// API client — admin categories (US-075 / FE-005). Paridad EXACTA con el contrato
// backend (Tech Spec §7). Todas las mutaciones devuelven la categoría actualizada.
import { httpDeleteData, httpGetData, httpPatchData, httpPostData } from '@/shared/api-client';
import type {
  AdminCategoriesListDTO,
  AdminCategoryNode,
  CreateCategoryBodyDTO,
  DeleteCategoryBodyDTO,
  UpdateCategoryBodyDTO,
} from './adminCategoriesApi.types';

export const adminCategoriesApi = {
  /** GET /admin/service-categories → tree + flat incluyendo `is_active=false`. */
  async list(): Promise<AdminCategoriesListDTO> {
    return httpGetData<AdminCategoriesListDTO>('/admin/service-categories');
  },

  /** POST /admin/service-categories → 201 con categoría creada. */
  async create(body: CreateCategoryBodyDTO): Promise<AdminCategoryNode> {
    return httpPostData<AdminCategoryNode, CreateCategoryBodyDTO>('/admin/service-categories', {
      body,
    });
  },

  /** PATCH /admin/service-categories/:id → 200 con categoría actualizada. */
  async update(id: string, body: UpdateCategoryBodyDTO): Promise<AdminCategoryNode> {
    return httpPatchData<AdminCategoryNode, UpdateCategoryBodyDTO>(
      `/admin/service-categories/${encodeURIComponent(id)}`,
      { body },
    );
  },

  /** DELETE /admin/service-categories/:id — soft delete con `reason` requerido. */
  async softDelete(id: string, body: DeleteCategoryBodyDTO): Promise<AdminCategoryNode> {
    return httpDeleteData<AdminCategoryNode>(
      `/admin/service-categories/${encodeURIComponent(id)}`,
      { body },
    );
  },
};
