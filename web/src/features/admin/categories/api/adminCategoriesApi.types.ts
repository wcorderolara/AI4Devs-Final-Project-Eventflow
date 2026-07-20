// Tipos de API — admin categories (US-075 / FE-005). Paridad EXACTA con el response
// wire snake_case del backend (`toServiceCategoryView` en
// `backend/src/modules/service-catalog/application/service-category.view.ts`).

export type CategoryLocale = 'es-LATAM' | 'es-ES' | 'en' | 'pt';

export interface AdminCategoryNode {
  id: string;
  code: string;
  label: string;
  description: string | null;
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string> | null;
  parent_id: string | null;
  sort_order: number;
  depth_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminCategoryTreeNode extends AdminCategoryNode {
  children: AdminCategoryTreeNode[];
}

export interface AdminCategoriesListDTO {
  tree: AdminCategoryTreeNode[];
  flat: AdminCategoryNode[];
}

export interface AdminCategoriesListEnvelope {
  data: AdminCategoriesListDTO;
  meta: { correlationId: string; timestamp?: string };
}

// ── Bodies ─────────────────────────────────────────────────────────────────

export interface CreateCategoryBodyDTO {
  code: string;
  name_i18n: Record<string, string>;
  description_i18n?: Record<string, string>;
  parent_id?: string | null;
  sort_order?: number;
  reason?: string;
}

export interface UpdateCategoryBodyDTO {
  name_i18n?: Record<string, string>;
  description_i18n?: Record<string, string>;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
  reason?: string;
}

export interface DeleteCategoryBodyDTO {
  reason: string;
}

export interface AdminCategoryEnvelope {
  data: AdminCategoryNode;
  meta: { correlationId: string; timestamp?: string };
}
