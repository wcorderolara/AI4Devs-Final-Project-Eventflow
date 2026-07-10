import { useTranslations } from 'next-intl';

/**
 * Placeholder de login (US-105). El formulario real (RHF + Zod + submit a `POST /auth/login`)
 * lo entrega US-AUTH-*.
 *
 * SEC requirement (EC-04, US-105): el handler de login DEBE validar el query param `from` como
 * ruta **interna** antes de usarlo en `router.push`, para prevenir open redirect. Regex sugerido:
 * `^/[a-zA-Z0-9_/\-?=&]*$`. Descartar cualquier `from` absoluto (http/https/`//`).
 */
export default function LoginPage() {
  const t = useTranslations('navigation');
  return (
    <>
      <h1 className="text-2xl font-bold">{t('placeholder.login.title')}</h1>
      <p>{t('placeholder.login.body')}</p>
    </>
  );
}
