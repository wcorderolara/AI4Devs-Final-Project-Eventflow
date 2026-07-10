import { useTranslations } from 'next-intl';

export default function ForgotPasswordPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.forgotPassword.title')}</h1>
      <p>{t('placeholder.forgotPassword.body')}</p>
    </>
  );
}
