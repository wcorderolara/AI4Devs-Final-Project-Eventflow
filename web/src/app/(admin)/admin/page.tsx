import { useTranslations } from 'next-intl';

export default function AdminPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.admin.title')}</h1>
      <p>{t('placeholder.admin.body')}</p>
    </>
  );
}
