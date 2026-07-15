// US-035 (PB-P1-020 / FE-005) — Empty state con deeplinks a US-019 (sugerir IA)
// y a US-036 (agregar manual). Ambos apuntan a rutas ya existentes.
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface EmptyBudgetStateProps {
  eventId: string;
  aiSuggestionEnabled?: boolean;
}

export function EmptyBudgetState({ eventId, aiSuggestionEnabled = true }: EmptyBudgetStateProps): React.JSX.Element {
  const t = useTranslations('budget.empty');
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center"
      data-testid="budget-empty"
    >
      <p className="text-sm text-neutral-700">{t('body')}</p>
      <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {aiSuggestionEnabled ? (
          <Link
            href={`/organizer/events/${eventId}/ai/budget`}
            className="rounded bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800"
          >
            {t('cta.ai')}
          </Link>
        ) : null}
        <Link
          href={`/organizer/events/${eventId}/budget?add=1`}
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800"
        >
          {t('cta.manual')}
        </Link>
      </div>
    </div>
  );
}
