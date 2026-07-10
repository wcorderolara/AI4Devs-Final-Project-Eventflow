import { useTranslations } from 'next-intl';

export default function OrganizerNotificationsPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.organizerNotifications.title')}</h1>
      <p className="mt-2 text-neutral-600">{t('placeholder.organizerNotifications.body')}</p>
    </>
  );
}
