import { useTranslations } from 'next-intl';

export default function VendorProfilePage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.vendorProfile.title')}</h1>
      <p className="mt-2 text-neutral-600">{t('placeholder.vendorProfile.body')}</p>
    </>
  );
}
