// US-035 (PB-P1-020 / FE-004) — Banner de advertencia cuando `over_committed = true`.
import { useTranslations } from 'next-intl';

interface OvercommitWarningProps {
  visible: boolean;
}

export function OvercommitWarning({ visible }: OvercommitWarningProps): React.JSX.Element | null {
  const t = useTranslations('budget.overcommit');
  if (!visible) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
    >
      <p className="font-medium">{t('title')}</p>
      <p className="mt-1">{t('body')}</p>
    </div>
  );
}
