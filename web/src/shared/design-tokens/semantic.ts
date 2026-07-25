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
  blue,
  border,
  breakpoint,
  coral,
  focus,
  green,
  icon,
  layout,
  lilac,
  motion,
  neutral,
  opacity,
  radius,
  red,
  shadow,
  size,
  space,
  violet,
  zIndex,
} from './primitives';

/* ------------------------------------------------------------------ *
 * Text — Design Tokens §9.1
 * ------------------------------------------------------------------ */

/**
 * `primary` es `neutral.800` (`#262626`), NO `neutral.900`.
 * `#171717` está reservado a `surface.inverse` y a la CTA oscura de marketing (UI-DEC-003).
 */
export const text = {
  primary: neutral[800],
  secondary: neutral[600],
  muted: neutral[500],
  disabled: neutral[400],
  inverse: neutral[0],
  link: violet[700],
  linkHover: violet[800],
} as const;

/* ------------------------------------------------------------------ *
 * Background & surface — Design Tokens §9.2, §10.2
 * ------------------------------------------------------------------ */

export const background = {
  /** Fondo principal de la aplicación (UI-DEC-002). */
  default: neutral[0],
  subtle: neutral[50],
  /** Fondo del área de contenido de plataforma, para separar de las cards blancas. */
  page: neutral[50],
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
  selected: violet[50],
} as const;

/* ------------------------------------------------------------------ *
 * Border — Design Tokens §9.3, §16
 * ------------------------------------------------------------------ */

export const borderColor = {
  default: neutral[300],
  subtle: neutral[200],
  strong: neutral[700],
  /** Border activo/focus base, previo al focus ring. */
  interactive: violet[500],
  disabled: neutral[200],
  separator: neutral[200],
} as const;

export const borderWidth = border.width;

/* ------------------------------------------------------------------ *
 * Actions — Design Tokens §9.4, §10.1, §10.2
 * ------------------------------------------------------------------ */

/** CTA primaria de plataforma (UI-DEC-003). Violeta, nunca azul. */
export const actionPrimary = {
  background: violet[600],
  hover: violet[700],
  active: violet[800],
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

/** Acción destructiva (UI-DEC-003, UI-DEC-014). Rojo semántico, nunca coral. */
export const actionDestructive = {
  background: red[600],
  hover: red[700],
  foreground: neutral[0],
} as const;

/** CTA oscura de la landing (UI-DEC-003). */
export const actionMarketing = {
  background: neutral[900],
  hover: neutral[800],
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
    surface: green[50],
    border: green[200],
    text: green[700],
    icon: green[600],
    strong: green[600],
    foreground: green.foreground,
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
    surface: red[50],
    border: red[200],
    text: red[700],
    icon: red[600],
    strong: red[600],
    foreground: red.foreground,
  },
  info: {
    surface: blue[50],
    border: blue[200],
    text: blue[700],
    icon: blue[600],
    strong: blue[600],
    foreground: blue.foreground,
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
 * `border` se mantiene en `violet.500` (3.35:1 sobre `ai.surface`, cumple 3:1 no textual).
 * CMP-Q-003 mantiene abierta la validación visual; promoverlo a `violet.600` sigue siendo
 * PROVISIONAL y no se aplica en esta implementación.
 */
export const ai = {
  surface: lilac[50],
  surfaceHover: lilac[100],
  border: violet[500],
  borderStrong: violet[700],
  text: neutral[800],
  icon: violet[700],
  label: violet[700],
  pending: violet[500],
  accepted: feedback.success.strong,
  edited: feedback.info.strong,
  rejected: neutral[500],
  fallback: feedback.warning.strong,
  error: feedback.error.strong,
} as const;

/* ------------------------------------------------------------------ *
 * Platform & marketing aliases — Design Tokens §10
 * ------------------------------------------------------------------ */

export const platform = {
  sidebarBackground: neutral[0],
  sidebarItemHover: alpha.hoverSubtle,
  sidebarItemActive: violet[50],
  sidebarItemActiveForeground: violet[700],
  pageBackground: neutral[50],
} as const;

export const marketing = {
  ctaBackground: actionMarketing.background,
  ctaHover: actionMarketing.hover,
  ctaForeground: actionMarketing.foreground,
  accentLilac: lilac[300],
  accentCoral: coral[300],
  heroSurface: neutral[50],
} as const;

/* ------------------------------------------------------------------ *
 * Focus, selection, overlay — Design Tokens §9.6, §9.7, §9.8, §21
 * ------------------------------------------------------------------ */

export const focusRing = focus;

export const selection = {
  background: violet[100],
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
