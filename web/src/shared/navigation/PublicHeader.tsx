import { Compass, LayoutGrid, Route, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { SessionClaims } from '@/shared/authorization';
import { ActionLink } from '@/shared/design-system';
import type { NavigationSection } from '@/shared/design-system/navigation/navigationModel';
import { LanguageSelector } from '@/shared/i18n';
import { Logo } from './Logo';
import { PublicMobileMenu } from './PublicMobileMenu';
import { getPublicHeaderCtas, PUBLIC_NAV_LINKS } from './publicNavigation';

/**
 * PublicHeader — cromo de las superficies públicas (landing y directorio).
 *
 * Referencia visual: screen Stitch *EventFlow - Inicio* (barra sticky: marca a la izquierda,
 * anclas al centro, acción secundaria de texto + acción primaria rellena a la derecha).
 *
 * Es un **Server Component**: recibe los claims ya resueltos y decide en el servidor qué CTA
 * mostrar, de modo que el HTML inicial ya trae la acción correcta. Un usuario con sesión nunca
 * ve un «Iniciar sesión» que luego desaparece al hidratar.
 *
 * El rol **no se deduce de la URL**: llega en `claims`, resueltos por `getServerSessionClaims()`
 * a partir de las mismas cookies que ya usa `roleGuardMiddleware`.
 *
 * De Stitch se toma la anatomía. **No** se toman sus destinos: «Solutions» y «Pricing» no existen
 * en EventFlow y no se inventan páginas para rellenar la barra (ver el registro de implementación).
 */

/** Iconos del drawer mobile. Decorativos: el label visible es quien nombra el destino. */
const NAV_ICONS: Record<string, React.ReactNode> = {
  '/#how-it-works': <Route />,
  '/#features': <LayoutGrid />,
  '/#for-vendors': <Store />,
  '/vendors': <Compass />,
};

export interface PublicHeaderProps {
  claims: SessionClaims;
}

export function PublicHeader({ claims }: PublicHeaderProps): React.JSX.Element {
  const t = useTranslations('navigation');
  const { primary, secondary } = getPublicHeaderCtas(claims);

  const mobileSections: readonly NavigationSection[] = [
    {
      id: 'public',
      label: t('public.nav.label'),
      labelHidden: true,
      items: PUBLIC_NAV_LINKS.map((link) => ({
        href: link.href,
        label: t(link.labelKey),
        icon: NAV_ICONS[link.href],
        // Un ancla de la landing no necesita prefetch propio: el destino es `/`, que ya está
        // en caché cuando se llega desde ella.
        prefetch: link.href.includes('#') ? false : undefined,
      })),
    },
  ];

  return (
    <header className="sticky top-0 z-sticky border-b border-subtle bg-surface">
      <div className="mx-auto flex h-header w-full max-w-marketing items-center justify-between gap-4 px-page-mobile sm:px-page-tablet">
        <div className="flex items-center gap-3">
          <PublicMobileMenu
            triggerLabel={t('topbar.menuOpen')}
            closeLabel={t('mobile.close')}
            title={t('mobile.title')}
            navLabel={t('public.nav.label')}
            sections={mobileSections}
            footer={
              <div className="flex flex-col gap-3">
                <ActionLink href={primary.href} variant="primary" fullWidth>
                  {t(primary.labelKey)}
                </ActionLink>
                {secondary ? (
                  <ActionLink href={secondary.href} variant="secondary" fullWidth>
                    {t(secondary.labelKey)}
                  </ActionLink>
                ) : null}
                {/* El selector de idioma vive aquí en móvil: en la barra no cabe junto a la
                    marca y la acción primaria, y sacrificarlo no es opción en un producto de
                    cuatro locales. */}
                <div className="pt-1 sm:hidden">
                  <LanguageSelector />
                </div>
              </div>
            }
          />
          <Logo />
        </div>

        <nav aria-label={t('public.nav.label')} className="hidden items-center gap-6 lg:flex">
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              // `min-h-touch` aunque el enlace sea de texto: el área de pulsación se mide en la
              // caja, no en la altura de la línea (Component Foundations §10).
              className="focus-ring inline-flex min-h-touch items-center rounded-button font-ui text-body-sm font-medium text-secondary transition-colors duration-fast ease-standard hover:text-link"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Bajo `sm` el selector se mueve al pie del drawer: la barra no da para marca +
              idioma + acción primaria sin provocar scroll horizontal. */}
          <span className="hidden sm:inline-flex">
            <LanguageSelector />
          </span>
          {/* La acción secundaria se oculta en móvil: ya está en el pie del drawer, y repetirla
              aquí dejaría la barra sin espacio para la primaria. */}
          {secondary ? (
            <ActionLink href={secondary.href} variant="ghost" className="hidden sm:inline-flex">
              {t(secondary.labelKey)}
            </ActionLink>
          ) : null}
          <ActionLink href={primary.href} variant="primary">
            {t(primary.labelKey)}
          </ActionLink>
        </div>
      </div>
    </header>
  );
}
