/**
 * EventFlow — Design Tokens · capa 2: SEMÁNTICOS
 *
 * Expresan propósito, no apariencia. Es **la capa que consumen** Tailwind, las CSS custom
 * properties y los componentes. Fuente normativa: `docs/ux-ui/EventFlow-Design-Tokens.md` §9–§11.
 *
 * Cada valor referencia un primitivo — nunca se escribe un hex literal aquí.
 */

import {
  alpha,
  amber,
  anil,
  bermellon,
  border,
  breakpoint,
  bugambilia,
  canvas,
  cempasuchil,
  focus,
  icon,
  jade,
  layout,
  motion,
  neutral,
  opacity,
  radius,
  shadow,
  size,
  space,
  zIndex,
} from './primitives';

/* ------------------------------------------------------------------ *
 * Text — Design Tokens §9.1
 * ------------------------------------------------------------------ */

/**
 * `primary` es la tinta `neutral.800` (`#1E2742`), NO `neutral.900`, que queda para
 * `surface.inverse` y la CTA oscura de marketing (UI-DEC-003).
 */
export const text = {
  primary: neutral[800],
  secondary: neutral[600],
  muted: neutral[500],
  disabled: neutral[400],
  inverse: neutral[0],
  link: bugambilia[700],
  linkHover: bugambilia[800],
} as const;

/* ------------------------------------------------------------------ *
 * Background & surface — Design Tokens §9.2, §10.2
 * ------------------------------------------------------------------ */

export const background = {
  /** Fondo principal de la aplicación (UI-DEC-002). */
  default: neutral[0],
  subtle: neutral[50],
  /**
   * Fondo del área de contenido de plataforma, para separar de las cards blancas.
   * Adopta el lienzo cálido del screen Stitch del layout principal (`canvas.bright`) en lugar
   * de `neutral.50`: mismo propósito, el look & feel aprobado del shell.
   */
  page: canvas.bright,
} as const;

export const surface = {
  default: neutral[0],
  subtle: neutral[50],
  /** Modal / drawer / dropdown — se compensa con `shadow.overlay.*`. */
  elevated: neutral[0],
  disabled: neutral[100],
  /** Superficie oscura: CTA de landing, footer inverso. */
  inverse: neutral[900],
  /** Selección / item activo. */
  selected: bugambilia[50],
} as const;

/* ------------------------------------------------------------------ *
 * Border — Design Tokens §9.3, §16
 * ------------------------------------------------------------------ */

export const borderColor = {
  default: neutral[300],
  subtle: neutral[200],
  strong: neutral[700],
  /** Border activo/focus base, previo al focus ring. */
  interactive: bugambilia[500],
  disabled: neutral[200],
  separator: neutral[200],
} as const;

export const borderWidth = border.width;

/* ------------------------------------------------------------------ *
 * Actions — Design Tokens §9.4, §10.1, §10.2
 * ------------------------------------------------------------------ */

/** CTA primaria de plataforma (UI-DEC-003). Bugambilia. */
export const actionPrimary = {
  background: bugambilia[600],
  hover: bugambilia[700],
  active: bugambilia[800],
  foreground: neutral[0],
  disabledBackground: neutral[200],
  disabledForeground: neutral[400],
} as const;

/** Acción secundaria outlined / neutral (UI-DEC-003). */
export const actionSecondary = {
  background: neutral[0],
  hover: neutral[50],
  foreground: neutral[800],
  border: neutral[300],
} as const;

export const actionGhost = {
  hover: alpha.hoverSubtle,
  foreground: neutral[800],
} as const;

/** Acción destructiva (UI-DEC-003, UI-DEC-014). Bermellón, nunca la bugambilia de marca. */
export const actionDestructive = {
  background: bermellon[600],
  hover: bermellon[700],
  foreground: neutral[0],
} as const;

/** CTA oscura de la landing (UI-DEC-003): tinta. */
export const actionMarketing = {
  background: neutral[800],
  hover: neutral[700],
  foreground: neutral[0],
} as const;

/* ------------------------------------------------------------------ *
 * Feedback — Design Tokens §9.5
 * ------------------------------------------------------------------ */

/**
 * Familias semánticas independientes de los colores de marca (UI-DEC-014).
 * El color **nunca** es la única señal: cada estado va acompañado de icono + texto.
 */
export const feedback = {
  success: {
    surface: jade[50],
    border: jade[200],
    text: jade[700],
    icon: jade[600],
    strong: jade[600],
    foreground: jade.foreground,
  },
  warning: {
    surface: amber[50],
    border: amber[200],
    text: amber[700],
    icon: amber[600],
    strong: amber[600],
    foreground: amber.foreground,
  },
  error: {
    surface: bermellon[50],
    border: bermellon[200],
    text: bermellon[700],
    icon: bermellon[600],
    strong: bermellon[600],
    foreground: bermellon.foreground,
  },
  info: {
    surface: anil[50],
    border: anil[200],
    text: anil[700],
    icon: anil[600],
    strong: anil[600],
    foreground: anil.foreground,
  },
} as const;

/* ------------------------------------------------------------------ *
 * AI — Design Tokens §11
 * ------------------------------------------------------------------ */

/**
 * Tokens que soportan el patrón human-in-the-loop (UI-DEC-010; NFR-AI-001).
 *
 * Reglas mandatorias (§11.1):
 * - Los tokens visuales SIEMPRE se acompañan de icono + label "Sugerencia de IA".
 * - Los estados (`accepted`, `edited`, `rejected`, `fallback`, `error`) **reutilizan**
 *   las familias de feedback; no existen paletas AI paralelas.
 * - No existen tokens de glow ni gradientes animados.
 * - Al aceptarse, el contenido deja de consumir `ai.*` y pasa al lenguaje visual normal.
 *
 * Lo que propone la IA se pinta como un borrador "a lápiz" en cempasúchil: pendiente de tu
 * revisión. `border` usa `cempasuchil.600` (3.6:1 sobre `ai.surface`, cumple 3:1 no textual);
 * label e icono `700` (5.5:1).
 */
export const ai = {
  surface: cempasuchil[50],
  surfaceHover: cempasuchil[100],
  border: cempasuchil[600],
  borderStrong: cempasuchil[700],
  text: neutral[800],
  icon: cempasuchil[700],
  label: cempasuchil[700],
  pending: cempasuchil[600],
  accepted: feedback.success.strong,
  edited: feedback.info.strong,
  rejected: neutral[500],
  fallback: feedback.warning.strong,
  error: feedback.error.strong,
} as const;

/* ------------------------------------------------------------------ *
 * Platform & marketing aliases — Design Tokens §10
 * ------------------------------------------------------------------ */

/**
 * Cromo del shell autenticado (sidebar, topbar, lienzo de contenido).
 *
 * El cromo es papel (`canvas.*`) y se mantiene sobrio: la audacia de la identidad vive en el
 * contenido (la fecha del evento), no en la navegación. El ítem activo es un tinte suave de
 * bugambilia con texto bugambilia oscuro, peso semibold y la marca vertical de acento.
 *
 * Contraste verificado (WCAG 2.1 AA):
 * - `sidebarItemActiveForeground` (`#78163C`) sobre `sidebarItemActive` (`#FDF0F5`): 10.6:1.
 * - Texto secundario (`#4E5468`) sobre `sidebarBackground` (`#ECEEE8`): 6.7:1.
 * - Texto primario (`#1E2742`) sobre `pageBackground` (`#F5F6F2`): 14.0:1.
 *
 * El estado activo no depende sólo del color (UI-DEC-014).
 */
export const platform = {
  /** Sidebar: tinte cálido que la separa del lienzo sin necesidad de sombra. */
  sidebarBackground: canvas.low,
  /** Pie de la sidebar (bloque de identidad): un paso más en la rampa. */
  sidebarFooterBackground: canvas.container,
  sidebarItemHover: canvas.high,
  sidebarItemActive: bugambilia[50],
  sidebarItemActiveForeground: bugambilia[800],
  /** Topbar: mismo lienzo que el contenido; el hairline es el único separador. */
  headerBackground: canvas.bright,
  /** Hairline del cromo (`outline-variant` de Stitch). */
  chromeBorder: canvas.outlineVariant,
  pageBackground: canvas.bright,
} as const;

export const marketing = {
  ctaBackground: actionMarketing.background,
  ctaHover: actionMarketing.hover,
  ctaForeground: actionMarketing.foreground,
  accentLilac: cempasuchil[300],
  accentCoral: bugambilia[300],
  heroSurface: neutral[50],
} as const;

/* ------------------------------------------------------------------ *
 * Focus, selection, overlay — Design Tokens §9.6, §9.7, §9.8, §21
 * ------------------------------------------------------------------ */

export const focusRing = focus;

export const selection = {
  background: bugambilia[100],
  foreground: neutral[800],
} as const;

export const overlay = {
  scrim: alpha.overlay60,
  scrimLight: alpha.overlay40,
} as const;

/* ------------------------------------------------------------------ *
 * Shape, elevation, layout, motion — aliases semánticos
 * ------------------------------------------------------------------ */

/** Design Tokens §15.2 (UI-DEC-006). */
export const radii = {
  button: radius.md,
  input: radius.md,
  card: radius.lg,
  cardProminent: radius.xl,
  modal: radius.xl,
  drawer: radius.xl,
  badge: radius.full,
} as const;

/** Design Tokens §17. */
export const elevation = {
  surfaceSubtle: shadow.surfaceSubtle,
  surfaceRaised: shadow.surfaceRaised,
  overlayDropdown: shadow.overlayDropdown,
  overlayModal: shadow.overlayModal,
  marketingFloating: shadow.marketingFloating,
} as const;

export const semantic = {
  text,
  background,
  surface,
  borderColor,
  borderWidth,
  actionPrimary,
  actionSecondary,
  actionGhost,
  actionDestructive,
  actionMarketing,
  feedback,
  ai,
  platform,
  marketing,
  focusRing,
  selection,
  overlay,
  radii,
  elevation,
  layout,
  breakpoint,
  motion,
  opacity,
  zIndex,
  icon,
  space,
  size,
} as const;

export type Semantic = typeof semantic;
export type FeedbackStatus = keyof typeof feedback;
