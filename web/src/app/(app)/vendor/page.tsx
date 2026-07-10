import { useTranslations } from 'next-intl';

export default function VendorPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.vendor.title')}</h1>
      <p>{t('placeholder.vendor.body')}</p>
    </>
  );
}
