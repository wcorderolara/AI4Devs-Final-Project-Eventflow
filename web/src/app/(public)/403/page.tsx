import { useTranslations } from 'next-intl';
import { PermissionDeniedState, TextLink } from '@/shared/design-system';

/**
 * Página 403.
 *
 * PB-P2-029: adopta `PermissionDeniedState`. La ruta, el destino de recuperación y las claves
 * i18n existentes no cambian; se añade `errors.forbidden.body` (nueva clave en los 4 locales)
 * porque Component Foundations §29 exige una explicación además del título. El copy **no**
 * nombra el recurso restringido: no confirma su existencia.
 */
export default function ForbiddenPage() {
  const t = useTranslations('errors');
  return (
    <div className="mx-auto w-full max-w-form px-page-mobile py-12 md:px-page-tablet">
      <PermissionDeniedState
        title={t('forbidden.title')}
        description={t('forbidden.body')}
        action={<TextLink href="/">{t('forbidden.cta')}</TextLink>}
      />
    </div>
  );
}
