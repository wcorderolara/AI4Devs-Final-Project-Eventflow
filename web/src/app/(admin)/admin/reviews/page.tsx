import { useTranslations } from 'next-intl';

export default function AdminReviewsPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.adminReviews.title')}</h1>
      <p className="mt-2 text-neutral-600">{t('placeholder.adminReviews.body')}</p>
    </>
  );
}
