import type { Config } from 'tailwindcss';
import {
  ai,
  actionDestructive,
  actionGhost,
  actionMarketing,
  actionPrimary,
  actionSecondary,
  borderColor,
  breakpoint,
  color,
  elevation,
  feedback,
  focusRing,
  fontFamily,
  fontSize,
  layout,
  letterSpacing,
  lineHeight,
  marketing,
  motion,
  opacity,
  overlay,
  platform,
  radius,
  radii,
  selection,
  size,
  surface,
  text,
  zIndex,
} from './src/shared/design-tokens';

/**
 * Tailwind consume la capa SEMÁNTICA de `src/shared/design-tokens` (Design Tokens §28, §30).
 * Los primitivos sólo se exponen como escalas de marca (`violet`, `lilac`, `coral`) para uso
 * decorativo puntual; los componentes deben preferir siempre las utilidades semánticas.
 *
 * Light theme únicamente: NO se define `darkMode` (UI-DEC-013) ni selectores por rol (UI-DEC-009).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Identidad (UI-DEC-002 rev. 2) ------------------------------------------
        // Escalas de marca para acentos puntuales; los componentes deben preferir las
        // utilidades semánticas (`bg-action-primary`, `text-link`, `bg-ai-surface`, …).
        brand: color.bugambilia,
        jade: color.jade,
        cempasuchil: color.cempasuchil,
        anil: color.anil,
        bermellon: color.bermellon,

        // --- Remapeo de transición (DEPRECATED) -------------------------------------
        // El código de features todavía usa las paletas por defecto de Tailwind escritas a
        // mano (~1,300 clases: `neutral-*`, `red-*`, `blue-*`, `purple-*`…). Se redirigen a
        // la identidad para que ninguna pantalla quede con el "look Tailwind" mientras se
        // migran a utilidades semánticas. No usar estos nombres en código nuevo.
        neutral: color.neutral,
        gray: color.neutral,
        violet: color.bugambilia,
        purple: color.bugambilia,
        indigo: color.anil,
        blue: color.anil,
        sky: color.anil,
        red: color.bermellon,
        rose: color.bermellon,
        green: color.jade,
        emerald: color.jade,
        teal: color.jade,
        /** @deprecated Sin consumidores; alias de compatibilidad. */
        lilac: color.lilac,
        /** @deprecated Sin consumidores; alias de compatibilidad. */
        coral: color.coral,

        // --- Aliases de compatibilidad (DEPRECATED) --------------------------------
        /** @deprecated Usar `bg-action-primary` / `text-link` / `bg-surface-selected`. */
        primary: color.bugambilia,
        /** @deprecated Usar `text-secondary` / `bg-surface-subtle` / `border-subtle`. */
        secondary: color.neutral,
        /** @deprecated Usar `bg-action-destructive` / `text-feedback-error`. */
        danger: color.bermellon,
        /** @deprecated Usar `bg-feedback-success-strong` / `text-feedback-success`. */
        success: color.jade,
      },

      // --- Text ------------------------------------------------------------------
      textColor: {
        primary: text.primary,
        secondary: text.secondary,
        muted: text.muted,
        disabled: text.disabled,
        inverse: text.inverse,
        link: text.link,
        'link-hover': text.linkHover,
        'action-primary-foreground': actionPrimary.foreground,
        'action-destructive-foreground': actionDestructive.foreground,
        'action-marketing-foreground': actionMarketing.foreground,
        'feedback-success': feedback.success.text,
        'feedback-success-icon': feedback.success.icon,
        'feedback-warning': feedback.warning.text,
        'feedback-warning-icon': feedback.warning.icon,
        'feedback-error': feedback.error.text,
        'feedback-error-icon': feedback.error.icon,
        'feedback-info': feedback.info.text,
        'feedback-info-icon': feedback.info.icon,
        'ai-label': ai.label,
        'ai-icon': ai.icon,
        'ai-text': ai.text,
        'sidebar-item-active': platform.sidebarItemActiveForeground,
      },

      // --- Background ------------------------------------------------------------
      backgroundColor: {
        // Cromo del shell autenticado (screen Stitch del layout principal): el lienzo y la
        // topbar comparten `canvas.bright`; la sidebar baja un paso en la rampa.
        page: platform.pageBackground,
        header: platform.headerBackground,
        sidebar: {
          DEFAULT: platform.sidebarBackground,
          footer: platform.sidebarFooterBackground,
        },
        surface: {
          DEFAULT: surface.default,
          subtle: surface.subtle,
          elevated: surface.elevated,
          disabled: surface.disabled,
          inverse: surface.inverse,
          selected: surface.selected,
        },
        'action-primary': {
          DEFAULT: actionPrimary.background,
          hover: actionPrimary.hover,
          active: actionPrimary.active,
          disabled: actionPrimary.disabledBackground,
        },
        'action-secondary': {
          DEFAULT: actionSecondary.background,
          hover: actionSecondary.hover,
        },
        'action-ghost-hover': actionGhost.hover,
        'action-destructive': {
          DEFAULT: actionDestructive.background,
          hover: actionDestructive.hover,
        },
        'action-marketing': {
          DEFAULT: actionMarketing.background,
          hover: actionMarketing.hover,
        },
        'feedback-success': {
          DEFAULT: feedback.success.surface,
          strong: feedback.success.strong,
        },
        'feedback-warning': {
          DEFAULT: feedback.warning.surface,
          strong: feedback.warning.strong,
        },
        'feedback-error': {
          DEFAULT: feedback.error.surface,
          strong: feedback.error.strong,
        },
        'feedback-info': {
          DEFAULT: feedback.info.surface,
          strong: feedback.info.strong,
        },
        'ai-surface': {
          DEFAULT: ai.surface,
          hover: ai.surfaceHover,
        },
        'sidebar-item-hover': platform.sidebarItemHover,
        'sidebar-item-active': platform.sidebarItemActive,
        // Marca de acento del ítem activo: se invierte sobre el relleno violeta.
        'sidebar-item-active-foreground': platform.sidebarItemActiveForeground,
        'marketing-hero': marketing.heroSurface,
        scrim: overlay.scrim,
        'scrim-light': overlay.scrimLight,
        selection: selection.background,
      },

      // --- Borders ---------------------------------------------------------------
      borderColor: {
        default: borderColor.default,
        subtle: borderColor.subtle,
        strong: borderColor.strong,
        interactive: borderColor.interactive,
        disabled: borderColor.disabled,
        separator: borderColor.separator,
        /** Hairline del cromo del shell (sidebar / topbar), `outline-variant` de Stitch. */
        chrome: platform.chromeBorder,
        ai: ai.border,
        'ai-strong': ai.borderStrong,
        'feedback-success': feedback.success.border,
        'feedback-warning': feedback.warning.border,
        'feedback-error': feedback.error.border,
        'feedback-info': feedback.info.border,
        'action-secondary': actionSecondary.border,
      },

      // --- Focus (WCAG 1.4.11 — el offset blanco es mandatorio) -------------------
      ringColor: { focus: focusRing.ringColor },
      ringOffsetColor: { focus: focusRing.ringOffsetColor },
      ringWidth: { focus: focusRing.ringWidth },
      ringOffsetWidth: { focus: focusRing.ringOffset },
      outlineColor: { focus: focusRing.ringColor },

      // --- Typography ------------------------------------------------------------
      fontFamily: {
        // Se copian los arrays porque los tokens son `readonly` (`as const`) y Tailwind
        // espera `string[]` mutable.
        display: [...fontFamily.display],
        heading: [...fontFamily.heading],
        body: [...fontFamily.body],
        ui: [...fontFamily.ui],
      },
      fontSize: {
        display: [
          fontSize.display,
          { lineHeight: lineHeight.tight, letterSpacing: letterSpacing.tight, fontWeight: '600' },
        ],
        h1: [
          fontSize.h1,
          { lineHeight: lineHeight.snug, letterSpacing: letterSpacing.tight, fontWeight: '600' },
        ],
        h2: [
          fontSize.h2,
          { lineHeight: lineHeight.snug, letterSpacing: letterSpacing.normal, fontWeight: '600' },
        ],
        h3: [
          fontSize.h3,
          { lineHeight: lineHeight.snug, letterSpacing: letterSpacing.normal, fontWeight: '600' },
        ],
        'body-lg': [fontSize.bodyLg, { lineHeight: lineHeight.relaxed, fontWeight: '400' }],
        'body-md': [fontSize.bodyMd, { lineHeight: lineHeight.normal, fontWeight: '400' }],
        'body-sm': [fontSize.bodySm, { lineHeight: lineHeight.normal, fontWeight: '400' }],
        label: [fontSize.label, { lineHeight: lineHeight.normal, fontWeight: '500' }],
        caption: [fontSize.caption, { lineHeight: lineHeight.normal, fontWeight: '400' }],
        eyebrow: [
          fontSize.bodySm,
          { lineHeight: lineHeight.normal, letterSpacing: letterSpacing.wide, fontWeight: '700' },
        ],
      },
      letterSpacing: {
        'ef-tight': letterSpacing.tight,
        'ef-normal': letterSpacing.normal,
        'ef-wide': letterSpacing.wide,
      },

      // --- Shape -----------------------------------------------------------------
      // Se AÑADEN aliases semánticos; no se redefinen `rounded`/`rounded-md`/`rounded-lg`
      // para no alterar el render de los ~611 consumidores actuales. La migración de forma
      // pertenece a la fase de componentes (ver README §Migración).
      borderRadius: {
        button: radii.button,
        input: radii.input,
        card: radii.card,
        'card-prominent': radii.cardProminent,
        modal: radii.modal,
        drawer: radii.drawer,
        badge: radii.badge,
        'ef-none': radius.none,
      },

      // --- Elevation -------------------------------------------------------------
      // Idem: se añaden sombras semánticas sin sobrescribir `shadow-sm`/`lg`/`xl`.
      boxShadow: {
        'surface-subtle': elevation.surfaceSubtle,
        'surface-raised': elevation.surfaceRaised,
        'overlay-dropdown': elevation.overlayDropdown,
        'overlay-modal': elevation.overlayModal,
        'marketing-floating': elevation.marketingFloating,
      },

      // --- Layout ----------------------------------------------------------------
      spacing: {
        'page-mobile': layout.pagePaddingMobile,
        'page-tablet': layout.pagePaddingTablet,
        'page-desktop': layout.pagePaddingDesktop,
        sidebar: layout.sidebarWidth,
        header: layout.headerHeight,
        'touch-min': size.touchMinimum,
        'icon-sm': size.iconSm,
        'icon-md': size.iconMd,
        'icon-lg': size.iconLg,
        'gutter-mobile': layout.gridGutterMobile,
        'gutter-tablet': layout.gridGutterTablet,
        'gutter-desktop': layout.gridGutterDesktop,
      },
      maxWidth: {
        marketing: layout.containerMarketingMax,
        form: layout.containerFormMax,
        content: layout.containerContentMax,
      },
      minHeight: { control: size.controlMd, touch: size.touchMinimum },
      minWidth: { touch: size.touchMinimum },
      height: {
        control: size.controlMd,
        'control-lg': size.controlLg,
        header: layout.headerHeight,
      },
      width: { sidebar: layout.sidebarWidth },
      gridTemplateColumns: {
        'ef-mobile': `repeat(${layout.gridColumnsMobile}, minmax(0, 1fr))`,
        'ef-tablet': `repeat(${layout.gridColumnsTablet}, minmax(0, 1fr))`,
        'ef-desktop': `repeat(${layout.gridColumnsDesktop}, minmax(0, 1fr))`,
      },

      // --- Motion ----------------------------------------------------------------
      transitionDuration: {
        instant: motion.duration.instant,
        fast: motion.duration.fast,
        standard: motion.duration.normal,
        slow: motion.duration.slow,
      },
      transitionTimingFunction: {
        standard: motion.easing.standard,
        enter: motion.easing.enter,
        exit: motion.easing.exit,
      },

      // --- Stacking & opacity ----------------------------------------------------
      zIndex: {
        base: zIndex.base,
        sticky: zIndex.sticky,
        dropdown: zIndex.dropdown,
        drawer: zIndex.drawer,
        modal: zIndex.modal,
        toast: zIndex.toast,
        tooltip: zIndex.tooltip,
      },
      opacity: {
        disabled: opacity.disabled,
        muted: opacity.muted,
        decorative: opacity.decorative,
      },
    },
    // Breakpoints explícitos para trazabilidad (TOK-DEC-015). Coinciden con los defaults
    // de Tailwind: el sidebar es visible desde `lg` (1024 px).
    screens: {
      sm: breakpoint.sm,
      md: breakpoint.md,
      lg: breakpoint.lg,
      xl: breakpoint.xl,
      '2xl': breakpoint['2xl'],
    },
  },
  plugins: [],
};

export default config;
