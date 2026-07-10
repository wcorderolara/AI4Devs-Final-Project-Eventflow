import { useTranslations } from 'next-intl';

export default function VendorsPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.vendors.title')}</h1>
      <p>{t('placeholder.vendors.body')}</p>
    </>
  );
}
