import { useTranslations } from 'next-intl';

export default function VendorPortfolioPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.vendorPortfolio.title')}</h1>
      <p className="mt-2 text-neutral-600">{t('placeholder.vendorPortfolio.body')}</p>
    </>
  );
}
