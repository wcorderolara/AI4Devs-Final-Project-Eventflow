// Barrel de la feature AI Vendor Categories (US-020).
export { AIRecommendedCategoriesPage } from './pages/AIRecommendedCategoriesPage';
export { AIRecommendedCategories } from './components/AIRecommendedCategories';
export { AICategoryCard } from './components/AICategoryCard';
export {
  useGenerateAIVendorCategories,
  aiVendorCategoriesKeys,
} from './hooks/useGenerateAIVendorCategories';
export { aiVendorCategoriesApi } from './api/aiApi';
export type {
  VendorCategory,
  VendorCategoriesInput,
  VendorCategoriesOutput,
  GenerateVendorCategoriesResponse,
} from './api/aiApi';
