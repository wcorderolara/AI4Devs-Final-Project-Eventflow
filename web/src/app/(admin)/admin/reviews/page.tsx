// US-067 (PB-P1-040 / FE-001..004): panel admin de moderación de reseñas. Server Component
// que monta la tabla client (`ReviewModerationTable`) — el fetch de reviews vive en TanStack
// dentro del cliente.
import { ReviewModerationTable } from '@/features/admin/reviews';

export default function AdminReviewsPage(): React.JSX.Element {
  return <ReviewModerationTable />;
}
