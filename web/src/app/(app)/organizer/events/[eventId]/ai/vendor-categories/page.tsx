import { AIRecommendedCategoriesPage } from '@/features/ai/vendor-categories';

// US-020 — lista IA de categorías priorizadas para el evento (click-through al directorio US-045).
export default function OrganizerAIVendorCategoriesRoute({
  params,
}: {
  params: { eventId: string };
}) {
  return <AIRecommendedCategoriesPage eventId={params.eventId} />;
}
