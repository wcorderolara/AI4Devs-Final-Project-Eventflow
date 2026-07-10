import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.register.title')}</h1>
      <p>{t('placeholder.register.body')}</p>
    </>
  );
}
