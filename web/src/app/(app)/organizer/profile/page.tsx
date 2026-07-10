import { useTranslations } from 'next-intl';

export default function OrganizerProfilePage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.organizerProfile.title')}</h1>
      <p className="mt-2 text-neutral-600">{t('placeholder.organizerProfile.body')}</p>
    </>
  );
}
