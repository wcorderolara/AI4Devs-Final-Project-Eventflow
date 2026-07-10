import { useTranslations } from 'next-intl';

export default function OrganizerEventsPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.organizerEvents.title')}</h1>
      <p className="mt-2 text-neutral-600">{t('placeholder.organizerEvents.body')}</p>
    </>
  );
}
