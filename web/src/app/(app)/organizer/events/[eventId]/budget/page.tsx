import { BudgetPage } from '@/features/budget';

// US-035/US-036 (PB-P1-020) — Ruta del presupuesto del evento (view + CRUD).
export default function OrganizerBudgetRoute({
  params,
}: {
  params: { eventId: string };
}) {
  return <BudgetPage eventId={params.eventId} />;
}
