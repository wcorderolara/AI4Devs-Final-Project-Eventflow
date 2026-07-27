import { CalendarCheck, ScrollText, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@/shared/i18n';
import { Logo } from './Logo';
import { SkipLink } from './SkipLink';

/**
 * `AuthSplitShell` — shell a dos columnas para la ruta de autenticación con foco (`/login`).
 *
 * Referencia visual: screen Stitch *EventFlow — Iniciar Sesión (Foco)*
 * (`projects/10889252267442839867/screens/0c1f9189e86047aba9968767820217e3`).
 *
 * De Stitch se toma la **anatomía**: panel narrativo a la izquierda (sólo `lg+`), columna de
 * formulario a la derecha con el selector de idioma arriba y el formulario centrado en un ancho
 * legible. **No** se toma:
 *
 * - La fotografía de stock alojada en Google (`lh3.googleusercontent.com`): no se enlaza contenido
 *   de Stitch desde producción, no existe un asset aprobado equivalente y esta tarea no genera
 *   imágenes. El panel se resuelve con la escala de marca violeta (uso decorativo permitido,
 *   Design Tokens §8.2) y un acento suave.
 * - El copy publicitario del mock ("diseñada para coordinadores que buscan la perfección…"): el
 *   panel reutiliza el copy **aprobado** de la landing (`common.landing.*`), que sólo afirma
 *   capacidades que el MVP tiene hoy. No se introduce ninguna promesa nueva.
 * - Los enlaces de pie *Privacidad / Términos / Ayuda*: esas rutas no existen (los links legales
 *   están marcados como Future en `Footer`), y no se inventan destinos.
 *
 * Jerarquía de encabezados: el panel **no** contiene ningún `h*`; el único `h1` de la página es el
 * título del formulario. El panel es contenido complementario (`aside`), no decoración vacía, así
 * que no se oculta a las tecnologías de asistencia.
 */
const PANEL_FEATURES = [
  { key: 'plan', icon: <CalendarCheck aria-hidden="true" className="h-icon-md w-icon-md" /> },
  { key: 'vendors', icon: <Store aria-hidden="true" className="h-icon-md w-icon-md" /> },
  { key: 'quotes', icon: <ScrollText aria-hidden="true" className="h-icon-md w-icon-md" /> },
] as const;

export interface AuthSplitShellProps {
  children: React.ReactNode;
}

export function AuthSplitShell({ children }: AuthSplitShellProps): React.JSX.Element {
  const t = useTranslations('common.landing');
  const tNav = useTranslations('navigation');

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <SkipLink />

      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-violet-700 via-violet-800 to-violet-900 p-page-desktop lg:flex lg:w-1/2 lg:flex-col lg:justify-center">
        {/* Acento decorativo único: sin patrón pesado (UI Foundations §decoración). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-badge bg-violet-500/30 blur-3xl"
        />

        <div className="relative w-full max-w-marketing">
          <Logo size="lg" tone="inverse" />

          {/* `p`, no `h*`: el `h1` de la página pertenece al formulario. */}
          <p className="mt-10 text-balance font-heading text-h1 font-semibold leading-tight text-inverse">
            {/* El titular de la landing marca con `<em>` la parte que allí va resaltada en
                violeta. Aquí el panel ya es violeta sólido, así que se conserva el énfasis
                semántico sin recolorear: sobre este fondo, el acento de marca no llegaría a
                contraste (y `lilac` tiene prohibido usarse como texto — UI-DEC-002/014). */}
            {t.rich('heading', { em: (chunks) => <em className="not-italic">{chunks}</em> })}
          </p>

          <ul className="mt-10 flex flex-col gap-4">
            {PANEL_FEATURES.map((feature) => (
              <li key={feature.key} className="flex items-start gap-3 text-inverse">
                <span className="mt-0.5 shrink-0 opacity-muted">{feature.icon}</span>
                <span className="font-body text-body-lg">{t(`features.${feature.key}.title`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="absolute bottom-page-desktop left-page-desktop font-ui text-caption text-inverse opacity-muted">
          {/* El año va como string: como número, `Intl` lo agrupa por millares en `en` ("2,026"). */}
          {tNav('footer.copyright', { year: '2026' })}
        </p>
      </aside>

      <div className="flex flex-1 flex-col bg-surface lg:w-1/2">
        <div className="flex items-center justify-between gap-4 p-page-mobile md:px-page-tablet">
          {/* En `lg+` la marca vive en el panel; aquí sólo estorbaría (composición Stitch). */}
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ms-auto">
            <LanguageSelector />
          </div>
        </div>

        <main
          id="main-content"
          className="flex flex-1 flex-col justify-center px-page-mobile py-8 md:px-page-tablet lg:px-page-desktop"
        >
          {/* 440 px: ancho del formulario en la referencia Stitch, dentro de `max-w-form`. */}
          <div className="mx-auto w-full max-w-[27.5rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
