'use client';

// AIBriefField (US-021 / FE-002 + FE-004). Textarea editable con badge "Sugerido por IA" y
// atributos ARIA. Reutilizable para `brief`, `requirements[]`, `questions[]`, `constraints[]`.
import { useId } from 'react';
import { useTranslations } from 'next-intl';

interface AIBriefFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDirty?: () => void;
  ariaSectionLabel?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  helpText?: string;
  testId?: string;
}

export function AIBriefField({
  label,
  value,
  onChange,
  onDirty,
  ariaSectionLabel,
  rows = 3,
  maxLength = 2000,
  disabled = false,
  helpText,
  testId,
}: AIBriefFieldProps): React.JSX.Element {
  const t = useTranslations('ai.quoteBrief');
  const id = useId();
  const helpId = `${id}-help`;
  const badgeAria = t('badgeAria');

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-neutral-800">
          {label}
        </label>
        <span
          aria-label={badgeAria}
          className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-purple-800"
          data-testid="ai-brief-badge"
        >
          {t('badge')}
        </span>
      </div>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        disabled={disabled}
        onChange={(e): void => {
          onChange(e.target.value);
          onDirty?.();
        }}
        aria-describedby={helpId}
        aria-label={ariaSectionLabel ?? label}
        className="block w-full resize-y rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
        data-testid={testId}
      />
      <p id={helpId} className="text-xs text-neutral-500">
        {helpText ?? t('fieldEditable')}
      </p>
    </div>
  );
}
