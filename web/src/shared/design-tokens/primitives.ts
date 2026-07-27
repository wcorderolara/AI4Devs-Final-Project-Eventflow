/**
 * EventFlow — Design Tokens · capa 1: PRIMITIVOS
 *
 * Valores crudos sin significado de UI. Fuente normativa:
 * `docs/ux-ui/EventFlow-Design-Tokens.md` §8 (color), §12 (tipografía), §13 (spacing),
 * §14 (sizing), §15 (radius), §16 (borders), §17 (shadows), §18 (layout), §19 (breakpoints),
 * §20 (motion), §21 (focus), §22 (opacity), §23 (z-index), §24 (iconos).
 *
 * REGLA (Design Tokens §6): los componentes **nunca** consumen primitivos directamente.
 * Sólo la capa semántica (`semantic.ts`) los referencia. Ver `README.md`.
 *
 * Light theme únicamente (UI-DEC-013). Sin dark mode. Sin temas por rol (UI-DEC-009).
 */

/* ------------------------------------------------------------------ *
 * Color primitives
 * ------------------------------------------------------------------ */

/**
 * Escala neutral anclada en los valores aprobados `#FFFFFF`, `#525252` y `#262626`
 * (UI-DEC-002). `900` (`#171717`) se reserva a superficie inversa y CTA oscura de
 * marketing (UI-DEC-003) — **no** es el token de texto de cuerpo.
 * Design Tokens §8.1.
 */
export const neutral = {
  0: '#FFFFFF',
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#E5E5E5',
  300: '#D4D4D4',
  400: '#A3A3A3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0A0A0A',
} as const;

/**
 * Escala de **superficies de plataforma** (cromo del shell autenticado).
 *
 * Origen: screen Stitch *EventFlow - Layout Principal (Base)*
 * (`projects/10889252267442839867/screens/d1d8a7612a6a41ba84a183ec9a53f434`), que define el
 * look & feel aprobado del layout principal con una rampa de grises **cálidos** en lugar de
 * blanco puro: el lienzo es `#FCF9F8`, la sidebar se separa por tinte (`#F6F3F2`) y las zonas
 * embebidas / hover suben por la rampa.
 *
 * Sustituye el uso de `neutral.0` / `neutral.50` **sólo en el cromo** (sidebar, topbar, lienzo
 * de contenido). Las cards, inputs y overlays siguen en `neutral.0` (blanco puro), que es
 * precisamente lo que hace legible la jerarquía: contenido blanco sobre lienzo cálido.
 *
 * `outlineVariant` es el hairline violáceo del cromo; `onSurface` / `onSurfaceVariant` son los
 * textos que Stitch pinta sobre estas superficies.
 */
export const canvas = {
  /** `surface` / `background` / `surface-bright` — lienzo de contenido y topbar. */
  bright: '#FCF9F8',
  /** `surface-container-low` — sidebar. */
  low: '#F6F3F2',
  /** `surface-container` — zonas embebidas (pie de sidebar, campos sobre cromo). */
  container: '#F0EDED',
  /** `surface-container-high` — hover de navegación. */
  high: '#EAE7E7',
  /** `surface-container-highest` — presionado / separadores fuertes. */
  highest: '#E4E2E1',
  /** `surface-dim` — límite inferior de la rampa. */
  dim: '#DCD9D9',
  /** `outline-variant` — hairline del cromo. */
  outlineVariant: '#CBC3D6',
  /** `on-surface` — texto sobre el lienzo. */
  onSurface: '#1B1C1C',
  /** `on-surface-variant` — texto secundario sobre el cromo. */
  onSurfaceVariant: '#494454',
} as const;

/**
 * Escala violeta construida alrededor del ancla aprobada `#946DF8` (UI-DEC-002).
 * `600`/`700`/`800` son derivadas porque `500` **no** cumple 4.5:1 sobre blanco
 * (3.62:1) y por tanto está prohibido como texto (Design Tokens §32).
 * Design Tokens §8.2.
 */
export const violet = {
  50: '#F5F1FE',
  100: '#EDE6FE',
  200: '#DACAFC',
  300: '#BFA5FA',
  400: '#A582F9',
  /** Ancla de marca. Sólo acento / borde / fondo con foreground blanco. NUNCA texto. */
  500: '#946DF8',
  600: '#7B4EE8',
  700: '#6238C7',
  800: '#4A2A99',
  900: '#2E1B5C',
} as const;

/**
 * Lila decorativo. Ancla `#C4B7E5` (UI-DEC-002). Uso decorativo y como superficie AI
 * muy clara. **Nunca** como texto ni icono principal (1.87:1 sobre blanco).
 * Design Tokens §8.3.
 */
export const lilac = {
  50: '#F7F5FB',
  100: '#EFEBF6',
  200: '#DBD1EC',
  300: '#C4B7E5',
  400: '#A691D5',
} as const;

/**
 * Coral decorativo. Ancla `#EE8C8D` (UI-DEC-002). **Nunca** como error, destructive,
 * texto ni icono principal (2.39:1 sobre blanco).
 * Design Tokens §8.4.
 */
export const coral = {
  50: '#FEF3F3',
  100: '#FDE5E5',
  200: '#F9C4C5',
  300: '#EE8C8D',
  400: '#D96667',
} as const;

/** Familia success (UI-DEC-014). Independiente de los colores de marca. Design Tokens §8.5. */
export const green = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  600: '#16A34A',
  700: '#15803D',
  foreground: '#FFFFFF',
} as const;

/** Familia warning (UI-DEC-014). Design Tokens §8.5. */
export const amber = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  600: '#D97706',
  700: '#B45309',
  foreground: '#FFFFFF',
} as const;

/** Familia error / destructive (UI-DEC-014). Design Tokens §8.5. */
export const red = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  600: '#DC2626',
  700: '#B91C1C',
  foreground: '#FFFFFF',
} as const;

/** Familia info (UI-DEC-014). Design Tokens §8.5. */
export const blue = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  600: '#2563EB',
  700: '#1D4ED8',
  foreground: '#FFFFFF',
} as const;

/** Transparencias para overlays, hover ghost y scrims. Design Tokens §8.6. */
export const alpha = {
  overlay60: 'rgba(23, 23, 23, 0.60)',
  overlay40: 'rgba(23, 23, 23, 0.40)',
  hoverSubtle: 'rgba(23, 23, 23, 0.04)',
  hoverStrong: 'rgba(23, 23, 23, 0.08)',
  violetSubtle: 'rgba(148, 109, 248, 0.08)',
  decorativeScrim: 'rgba(255, 255, 255, 0.70)',
} as const;

/** Agrupador de todas las escalas cromáticas primitivas. */
export const color = {
  neutral,
  canvas,
  violet,
  lilac,
  coral,
  green,
  amber,
  red,
  blue,
  alpha,
} as const;

/* ------------------------------------------------------------------ *
 * Typography primitives
 * ------------------------------------------------------------------ */

/**
 * Familias aprobadas (UI-DEC-004). Los nombres reales de fuente los inyecta
 * `next/font/google` en `src/app/layout.tsx` como CSS variables; aquí se declara
 * la cadena de fallback para que un fallo de carga no rompa métricas.
 * Design Tokens §12.1.
 */
export const fontFamily = {
  heading: ['var(--font-inter-tight)', 'Inter Tight', 'system-ui', 'sans-serif'],
  body: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
  ui: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
} as const;

/** Pesos aprobados. Design Tokens §12.2. */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Escala tipográfica rem-first (respeta zoom del navegador, WCAG 1.4.4).
 * Design Tokens §12.3. `caption` (12 px) es el mínimo del sistema.
 */
export const fontSize = {
  display: '3.75rem',
  h1: '2.5rem',
  h2: '2rem',
  h3: '1.5rem',
  bodyLg: '1.125rem',
  bodyMd: '1rem',
  bodySm: '0.875rem',
  label: '0.875rem',
  caption: '0.75rem',
} as const;

/** Design Tokens §12.3. */
export const lineHeight = {
  tight: '1.1',
  snug: '1.25',
  none: '1',
  normal: '1.5',
  relaxed: '1.6',
} as const;

/** Design Tokens §12.3. */
export const letterSpacing = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.06em',
} as const;

/* ------------------------------------------------------------------ *
 * Space, size, radius, border
 * ------------------------------------------------------------------ */

/**
 * Escala de spacing base-4 con las excepciones aprobadas de 2 px y 6 px.
 * Design Tokens §13.1. NOTA: no reemplaza la escala de Tailwind (que ya es base-4 y
 * coincide); se expone para los aliases semánticos de layout y para consumidores TS.
 */
export const space = {
  0: '0px',
  1: '2px',
  2: '4px',
  3: '6px',
  4: '8px',
  5: '12px',
  6: '16px',
  7: '20px',
  8: '24px',
  9: '32px',
  10: '40px',
  11: '48px',
  12: '64px',
  13: '80px',
  14: '96px',
} as const;

/** Design Tokens §14. `touchMinimum` es mandatorio en cualquier control (UI-DEC-015). */
export const size = {
  controlSm: '32px',
  controlMd: '40px',
  controlLg: '48px',
  iconSm: '16px',
  iconMd: '20px',
  iconLg: '24px',
  touchMinimum: '44px',
  avatarSm: '24px',
  avatarMd: '40px',
  avatarLg: '64px',
} as const;

/** Design Tokens §15.1 (UI-DEC-006). */
export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

/** Design Tokens §16.1 / §16.2. */
export const border = {
  width: { none: '0px', default: '1px', strong: '2px' },
  style: { solid: 'solid' },
} as const;

/* ------------------------------------------------------------------ *
 * Shadow, layout, breakpoint, motion, focus, opacity, zIndex, icon
 * ------------------------------------------------------------------ */

/**
 * Sistema de elevación restringido a 5 sombras (UI-DEC-007, TOK-DEC-014).
 * En plataforma la sombra **nunca** es el único separador: se combina con borde.
 * Design Tokens §17.
 */
export const shadow = {
  none: 'none',
  surfaceSubtle: '0 1px 2px rgba(23, 23, 23, 0.04)',
  surfaceRaised: '0 2px 6px rgba(23, 23, 23, 0.06)',
  overlayDropdown: '0 8px 16px rgba(23, 23, 23, 0.08), 0 2px 4px rgba(23, 23, 23, 0.04)',
  overlayModal: '0 20px 40px rgba(23, 23, 23, 0.12), 0 8px 16px rgba(23, 23, 23, 0.06)',
  marketingFloating:
    '0 30px 60px -20px rgba(15, 13, 26, 0.15), 0 10px 20px -10px rgba(15, 13, 26, 0.08)',
} as const;

/** Design Tokens §18 (UI-DEC-012). */
export const layout = {
  containerMarketingMax: '1280px',
  containerFormMax: '720px',
  containerContentMax: '1440px',
  sidebarWidth: '256px',
  headerHeight: '64px',
  pagePaddingMobile: space[6],
  pagePaddingTablet: space[9],
  pagePaddingDesktop: space[11],
  gridColumnsMobile: 4,
  gridColumnsTablet: 8,
  gridColumnsDesktop: 12,
  gridGutterMobile: space[6],
  gridGutterTablet: space[7],
  gridGutterDesktop: space[8],
} as const;

/**
 * Variante collapsed del sidebar.
 * PROVISIONAL / NO USADO — TOK-DEC-023 y CMP-DEC-005 la difieren fuera del MVP.
 * Se declara sólo para dejar constancia de la decisión; no se expone a Tailwind
 * y ningún componente debe consumirla en el MVP.
 */
export const provisional = {
  /** @deprecated Provisional, fuera del alcance MVP. No consumir. */
  sidebarWidthCollapsed: null,
} as const;

/**
 * Breakpoints mobile-first (TOK-DEC-015). Coinciden con los defaults de Tailwind;
 * se declaran explícitamente para trazabilidad. Sidebar visible desde `lg`.
 * Design Tokens §19.
 */
export const breakpoint = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/** Design Tokens §20.1 / §20.2. */
export const motion = {
  duration: { instant: '0ms', fast: '120ms', normal: '200ms', slow: '320ms' },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

/**
 * Focus ring canónico (TOK-DEC-016). El offset **blanco** es mandatorio: sin él, el
 * anillo sobre una CTA violeta mide 1.41:1 y falla WCAG 1.4.11 (Design Tokens §32).
 * Se implementa siempre con `focus-visible`, nunca con `focus` genérico.
 */
export const focus = {
  ringWidth: '2px',
  ringStyle: 'solid',
  ringColor: violet[700],
  ringOffset: '2px',
  ringOffsetColor: neutral[0],
} as const;

/** Design Tokens §22. Nunca aplicar opacity a texto crítico. */
export const opacity = {
  disabled: '0.6',
  muted: '0.7',
  overlay: '0.6',
  hover: '0.9',
  decorative: '0.4',
} as const;

/** Design Tokens §23. Orden: content < sticky < dropdown < drawer < modal < toast < tooltip. */
export const zIndex = {
  base: '0',
  sticky: '10',
  dropdown: '100',
  drawer: '200',
  modal: '300',
  toast: '400',
  tooltip: '500',
} as const;

/**
 * Iconografía. Librería única ratificada: `lucide-react`
 * (Frontend Architecture Doc 15; cierra UI-Q-002 / TOK-Q-005 / CMP-Q-001).
 * Design Tokens §24.
 */
export const icon = {
  size: { sm: size.iconSm, md: size.iconMd, lg: size.iconLg },
  stroke: { default: 1.5, strong: 2 },
  /** Área táctil mínima de un control icon-only (UI-DEC-015). */
  minTouchTarget: size.touchMinimum,
} as const;

export const primitives = {
  color,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  space,
  size,
  radius,
  border,
  shadow,
  layout,
  breakpoint,
  motion,
  focus,
  opacity,
  zIndex,
  icon,
} as const;

export type Primitives = typeof primitives;
export type NeutralStep = keyof typeof neutral;
export type VioletStep = keyof typeof violet;
