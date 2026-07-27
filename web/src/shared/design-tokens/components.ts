/**
 * EventFlow — Design Tokens · capa 3: ALIAS DE COMPONENTE (limitados)
 *
 * Sólo existen cuando resuelven una ambigüedad importante o representan un patrón global
 * reutilizado. Fuente normativa: `docs/ux-ui/EventFlow-Design-Tokens.md` §27.
 *
 * REGLA (§6): los alias de componente **siempre** referencian semánticos, nunca primitivos.
 *
 * La anatomía completa de cada componente (variantes, estados, composición) pertenece a
 * `docs/ux-ui/EventFlow-Component-Foundations.md` y NO se implementa en esta capa.
 */

import { icon, size, space } from './primitives';
import {
  actionDestructive,
  actionMarketing,
  actionPrimary,
  actionSecondary,
  ai,
  borderColor,
  elevation,
  focusRing,
  platform,
  radii,
  surface,
  text,
} from './semantic';

/** Design Tokens §27.1. */
export const button = {
  primary: {
    background: actionPrimary.background,
    foreground: actionPrimary.foreground,
    hover: actionPrimary.hover,
    active: actionPrimary.active,
    radius: radii.button,
    height: size.controlMd,
  },
  secondary: {
    background: actionSecondary.background,
    foreground: actionSecondary.foreground,
    border: actionSecondary.border,
    hover: actionSecondary.hover,
    radius: radii.button,
    height: size.controlMd,
  },
  destructive: {
    background: actionDestructive.background,
    foreground: actionDestructive.foreground,
    hover: actionDestructive.hover,
    radius: radii.button,
    height: size.controlMd,
  },
  /** Variante contextual de marketing: CTA oscura (CMP-DEC-013). */
  marketing: {
    background: actionMarketing.background,
    foreground: actionMarketing.foreground,
    hover: actionMarketing.hover,
    radius: radii.button,
    height: size.controlLg,
  },
} as const;

/** Design Tokens §27.2. */
export const input = {
  background: surface.default,
  foreground: text.primary,
  border: borderColor.default,
  borderFocus: borderColor.interactive,
  radius: radii.input,
  height: size.controlMd,
  placeholder: text.muted,
  disabledBackground: surface.disabled,
} as const;

/** Design Tokens §27.3. Card = borde + sombra sutil (UI-DEC-007). */
export const card = {
  background: surface.default,
  border: borderColor.subtle,
  radius: radii.card,
  shadow: elevation.surfaceSubtle,
  padding: space[6],
} as const;

/**
 * Design Tokens §27.4.
 *
 * `foreground` es el texto **en reposo**: secundario sobre el cromo tintado, como en el screen
 * Stitch del layout principal. Al pasar el ratón sube a `text.primary` (`hoverForeground`) y en
 * estado activo pasa a `activeForeground` sobre el relleno violeta.
 */
export const sidebarItem = {
  foreground: text.secondary,
  hoverForeground: text.primary,
  hoverBackground: platform.sidebarItemHover,
  activeBackground: platform.sidebarItemActive,
  activeForeground: platform.sidebarItemActiveForeground,
  radius: radii.card,
  focusRing: focusRing.ringColor,
} as const;

/**
 * Design Tokens §27.5 — superficie de recomendación IA.
 * El label textual y el icono son mandatorios junto a estos valores (UI-DEC-010).
 */
export const aiRecommendation = {
  background: ai.surface,
  border: ai.border,
  radius: radii.card,
  label: ai.label,
  icon: ai.icon,
  text: ai.text,
  padding: space[6],
  iconSize: icon.size.sm,
} as const;

export const componentAliases = {
  button,
  input,
  card,
  sidebarItem,
  aiRecommendation,
} as const;

export type ComponentAliases = typeof componentAliases;
