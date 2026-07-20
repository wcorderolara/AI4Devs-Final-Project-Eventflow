// Barrel export — US-075 (PB-P1-042). Panel admin CRUD `ServiceCategory`.
export { CategoriesPanel } from './components/CategoriesPanel';
export { CategoryTreeView } from './components/CategoryTreeView';
export { CategoryFormDialog } from './components/CategoryFormDialog';
export { CategoryDeleteDialog } from './components/CategoryDeleteDialog';
export * from './api/adminCategoriesApi.types';
export { adminCategoriesApi } from './api/adminCategoriesApi';
export {
  adminCategoriesKeys,
  useAdminCategoriesList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './hooks/adminCategoriesQueries';
