// Cliente API de la feature AI Vendor Categories (US-020 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/vendor-categories. Auth por cookie HTTP-Only vía httpClient.
// El backend filtra estrictamente contra `service_categories_active` y ordena por priority_score desc.
import {
  createAIGenerator,
  type AIGenerationResponse,
} from '@/features/ai/shared/api/createAIGenerator';

export interface VendorCategory {
  service_category_code: string;
  name: string;
  priority_score: number;
  reason: string;
}

export interface VendorCategoriesOutput {
  categories: VendorCategory[];
}

export type GenerateVendorCategoriesResponse = AIGenerationResponse<VendorCategoriesOutput>;

export interface VendorCategoriesInput {
  event_type_code?: string;
  guest_count?: number;
  budget_estimated?: number;
  currency_code?: string;
  city?: string;
  language_code?: string;
  service_categories_active?: string[];
}

/** US-020 / AC-01: genera la lista priorizada de categorías IA para el evento. Timeout de cliente 65s. */
export const aiVendorCategoriesApi = createAIGenerator<
  VendorCategoriesInput,
  VendorCategoriesOutput
>('vendor-categories');
