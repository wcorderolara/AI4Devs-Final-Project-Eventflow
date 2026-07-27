import { useTranslations } from 'next-intl';
import { Logo } from './Logo';

/**
 * Footer público (Server Component). MVP: logo + copyright. Links legales → Future.
 *
 * El footer de la screen Stitch tiene cuatro columnas (*Producto · Compañía · Recursos* con
 * Precios, Casos de Éxito, Carreras, Prensa, Blog…). **No se reproduce**: ninguna de esas páginas
 * existe y un footer lleno de enlaces muertos es peor que uno corto y honesto.
 *
 * Consume tokens semánticos (`border-subtle`, `text-muted`, ancho de marketing) en lugar de la
 * paleta cruda de Tailwind con la que se escribió originalmente.
 */
export function Footer() {
  const t = useTranslations('navigation');
  return (
    <footer className="border-t border-subtle px-page-mobile py-8 sm:px-page-tablet">
      <div className="mx-auto flex max-w-marketing flex-wrap items-center justify-between gap-4">
        <Logo size="sm" />
        <p className="font-body text-body-sm text-muted">{t('footer.copyright', { year: 2026 })}</p>
      </div>
    </footer>
  );
}
