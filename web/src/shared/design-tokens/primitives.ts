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
 * Identidad visual "La fiesta, no el software" (UI-DEC-002 rev. 2 / UI-DEC-004 rev. 2).
 *
 * La paleta sale del mundo de las celebraciones latinoamericanas, no del catálogo de Tailwind:
 * tinta de invitación, papel algodón, bugambilia, jade y cempasúchil. Las familias de feedback
 * (`anil`, `bermellon`) se derivan de los mismos tintes para que la UI no tenga islas de azul o
 * rojo "de framework". Contrastes verificados en `docs/ux-ui/EventFlow-Design-Tokens.md` §8.
 */

/**
 * Tinta: neutrales con un leve tinte azul de tinta de imprenta. `800` (`#1E2742`) es el texto
 * principal; `900` la superficie inversa. Design Tokens §8.1.
 */
export const neutral = {
  0: '#FFFFFF',
  50: '#F7F8F6',
  100: '#EFF1EE',
  200: '#E1E4E0',
  300: '#C9CDCC',
  400: '#9CA1AA',
  500: '#6E7486',
  600: '#4E5468',
  700: '#363C52',
  800: '#1E2742',
  900: '#151B30',
  950: '#0C1020',
} as const;

/**
 * Papel: rampa del cromo del shell autenticado (lienzo, sidebar, zonas embebidas). Papel
 * algodón frío en lugar de gris cálido; el contenido blanco se lee encima por contraste.
 */
export const canvas = {
  /** Lienzo de contenido y topbar. */
  bright: '#F5F6F2',
  /** Sidebar. */
  low: '#ECEEE8',
  /** Zonas embebidas (pie de sidebar, campos sobre cromo). */
  container: '#E4E7E0',
  /** Hover de navegación. */
  high: '#DDE0D8',
  /** Presionado / separadores fuertes. */
  highest: '#D5D9CF',
  /** Límite inferior de la rampa. */
  dim: '#CBCFC4',
  /** Hairline del cromo. */
  outlineVariant: '#D3D7CE',
  /** Texto sobre el lienzo. */
  onSurface: '#1E2742',
  /** Texto secundario sobre el cromo. */
  onSurfaceVariant: '#4E5468',
} as const;

/**
 * Bugambilia: acento de marca (CTAs, fecha del evento, foco). `600` (`#B8235A`) mide 5.9:1 sobre
 * blanco, así que también sirve como texto de enlace; `500` y menores son sólo fondo/acento.
 */
export const bugambilia = {
  50: '#FDF0F5',
  100: '#FADDE8',
  200: '#F4B8CF',
  300: '#EA88AC',
  400: '#DA5585',
  500: '#C73668',
  600: '#B8235A',
  700: '#991B4B',
  800: '#78163C',
  900: '#561029',
  950: '#330918',
} as const;

/** Jade: dinero y confirmaciones (presupuesto, reservas, success). Design Tokens §8.5. */
export const jade = {
  50: '#EAF5F1',
  100: '#CFE9E0',
  200: '#A1D3C2',
  300: '#6CB8A0',
  400: '#3A9A7F',
  500: '#1A8068',
  600: '#0E6B58',
  700: '#0B5747',
  800: '#094437',
  900: '#073228',
  950: '#031D17',
  foreground: '#FFFFFF',
} as const;

/**
 * Cempasúchil: lo que la IA propone y aún espera tu revisión (human-in-the-loop). Nunca texto
 * por debajo de `700`. Design Tokens §11.
 */
export const cempasuchil = {
  50: '#FFF8E6',
  100: '#FEEDBF',
  200: '#FCD98A',
  300: '#F7C14F',
  400: '#EEAA1C',
  500: '#E09A00',
  600: '#B87A00',
  700: '#8F5E00',
  800: '#6A4600',
  900: '#4A3100',
  950: '#2B1C00',
} as const;

/** Añil (tinte índigo de los textiles): familia info. Design Tokens §8.5. */
export const anil = {
  50: '#EEF1F8',
  100: '#DCE2F1',
  200: '#BCC6E4',
  300: '#93A2D1',
  400: '#6C7FBA',
  500: '#4F62A3',
  600: '#3D4F8C',
  700: '#2F3E72',
  800: '#243058',
  900: '#1A2340',
  950: '#0F1527',
  foreground: '#FFFFFF',
} as const;

/**
 * Bermellón: error y acciones destructivas. Deliberadamente más naranja que la bugambilia para
 * que "borrar" nunca se confunda con la acción principal. Design Tokens §8.5.
 */
export const bermellon = {
  50: '#FDF2EE',
  100: '#FBE1D8',
  200: '#F6C0AE',
  300: '#EE977B',
  400: '#E2694A',
  500: '#D44A2A',
  600: '#C2361A',
  700: '#9F2B15',
  800: '#7C2211',
  900: '#58180C',
  950: '#340D06',
  foreground: '#FFFFFF',
} as const;

/** Familia warning (UI-DEC-014). Se conserva el ámbar: distinto del cempasúchil de la IA. */
export const amber = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  600: '#D97706',
  700: '#B45309',
  foreground: '#FFFFFF',
} as const;

/** @deprecated Alias de compatibilidad: la marca ya no es violeta. Usar `bugambilia`. */
export const violet = bugambilia;
/** @deprecated Alias de compatibilidad. Usar `cempasuchil` (superficies de IA / acento cálido). */
export const lilac = {
  50: cempasuchil[50],
  100: cempasuchil[100],
  200: cempasuchil[200],
  300: cempasuchil[300],
  400: cempasuchil[400],
} as const;
/** @deprecated Alias de compatibilidad. Usar `bugambilia` (acento decorativo claro). */
export const coral = {
  50: bugambilia[50],
  100: bugambilia[100],
  200: bugambilia[200],
  300: bugambilia[300],
  400: bugambilia[400],
} as const;
/** Familia success = jade. */
export const green = jade;
/** Familia error / destructive = bermellón. */
export const red = bermellon;
/** Familia info = añil. */
export const blue = anil;

/** Transparencias para overlays, hover ghost y scrims (tinta, no negro). Design Tokens §8.6. */
export const alpha = {
  overlay60: 'rgba(21, 27, 48, 0.60)',
  overlay40: 'rgba(21, 27, 48, 0.40)',
  hoverSubtle: 'rgba(21, 27, 48, 0.04)',
  hoverStrong: 'rgba(21, 27, 48, 0.08)',
  violetSubtle: 'rgba(184, 35, 90, 0.08)',
  decorativeScrim: 'rgba(255, 255, 255, 0.70)',
} as const;

/** Agrupador de todas las escalas cromáticas primitivas. */
export const color = {
  neutral,
  canvas,
  bugambilia,
  jade,
  cempasuchil,
  anil,
  bermellon,
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
 * Familias (UI-DEC-004 rev. 2). `display` es Bodoni Moda, la letra de las invitaciones impresas:
 * sólo para los momentos grandes (titular de la landing, nombre y fecha del evento). Todo lo
 * demás es Figtree. Los nombres reales los inyecta `next/font/google` en `src/app/layout.tsx`.
 * Design Tokens §12.1.
 */
export const fontFamily = {
  display: ['var(--font-display)', 'Bodoni Moda', 'Didot', 'Georgia', 'serif'],
  heading: ['var(--font-sans)', 'Figtree', 'system-ui', 'sans-serif'],
  body: ['var(--font-sans)', 'Figtree', 'system-ui', 'sans-serif'],
  ui: ['var(--font-sans)', 'Figtree', 'system-ui', 'sans-serif'],
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
  md: '6px',
  lg: '8px',
  xl: '12px',
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
  surfaceSubtle: '0 1px 2px rgba(21, 27, 48, 0.04)',
  surfaceRaised: '0 2px 6px rgba(21, 27, 48, 0.06)',
  overlayDropdown: '0 8px 16px rgba(21, 27, 48, 0.08), 0 2px 4px rgba(21, 27, 48, 0.04)',
  overlayModal: '0 20px 40px rgba(21, 27, 48, 0.12), 0 8px 16px rgba(21, 27, 48, 0.06)',
  marketingFloating:
    '0 30px 60px -20px rgba(21, 27, 48, 0.15), 0 10px 20px -10px rgba(21, 27, 48, 0.08)',
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
  ringColor: bugambilia[700],
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
