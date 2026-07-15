'use client';

// LanguagesStep (US-040 / FE-005, AC-01/AC-05). Multi-select de idiomas soportados.
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import {
  SUPPORTED_LANGUAGES,
  languagesSchema,
  type LanguagesValues,
  type SupportedLanguage,
} from '../schemas/vendorProfileWizardSchema';

interface LanguagesStepProps {
  initialValues: LanguagesValues;
  onNext: (values: LanguagesValues) => void;
  onBack: () => void;
}

export function LanguagesStep({
  initialValues,
  onNext,
  onBack,
}: LanguagesStepProps): React.JSX.Element {
  const t = useTranslations('vendor.profile');
  const tLang = useTranslations('vendor.languages');
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LanguagesValues>({
    resolver: zodResolver(languagesSchema),
    defaultValues: initialValues,
    mode: 'onSubmit',
  });

  const selected = watch('languages');

  const toggle = (lang: SupportedLanguage): void => {
    const set = new Set(selected);
    if (set.has(lang)) set.delete(lang);
    else set.add(lang);
    setValue('languages', Array.from(set), { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium">{t('steps.languages.label')}</legend>
        <p className="mt-1 text-xs text-neutral-500">{t('steps.languages.help')}</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <label
              key={lang}
              className="flex items-center gap-2 rounded border border-neutral-300 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                value={lang}
                checked={selected.includes(lang)}
                onChange={() => toggle(lang)}
              />
              <span>{tLang(lang)}</span>
            </label>
          ))}
        </div>
        {errors.languages && (
          <p role="alert" aria-live="polite" className="mt-1 text-sm text-red-700">
            {t(`validation.${errors.languages.message ?? 'languagesRequired'}`)}
          </p>
        )}
      </fieldset>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="rounded border border-neutral-300 px-4 py-2 text-sm">
          {t('wizard.back')}
        </button>
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          {t('wizard.next')}
        </button>
      </div>
    </form>
  );
}
