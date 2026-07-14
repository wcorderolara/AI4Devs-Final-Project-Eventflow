'use client';

// Wrapper de la ruta `/organizer/events/[eventId]/ai/vendor-categories` (US-020 / FE-002).
import { AIRecommendedCategories } from '../components/AIRecommendedCategories';

export function AIRecommendedCategoriesPage({ eventId }: { eventId: string }): React.JSX.Element {
  return <AIRecommendedCategories eventId={eventId} />;
}
