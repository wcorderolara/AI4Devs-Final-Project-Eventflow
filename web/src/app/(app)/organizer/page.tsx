import { useTranslations } from 'next-intl';

export default function OrganizerPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.organizer.title')}</h1>
      <p>{t('placeholder.organizer.body')}</p>
    </>
  );
}
