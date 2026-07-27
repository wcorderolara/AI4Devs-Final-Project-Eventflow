// PB-P2-027 — Contraste WCAG 2.1 AA de la paleta aprobada (NFR-A11Y-005 · UI-DEC-015).
//
// Reemplaza la validación de tokens ad hoc por la de la capa `design-tokens`: las combinaciones
// se leen de los tokens reales, de modo que cambiar un token y romper el contraste falla aquí.
//
// Método: fórmula oficial de luminancia relativa sRGB de WCAG 2.1 (la misma que usa axe).
// jsdom no puede correr la regla `color-contrast` de axe (requiere `<canvas>` para muestrear
// píxeles), por eso se calcula de forma determinista sobre los valores de token.
//
// Umbrales: 4.5:1 texto normal (1.4.3) · 3:1 texto grande y elementos no textuales (1.4.11).
import { describe, expect, it } from 'vitest';
import {
  ai,
  actionDestructive,
  actionMarketing,
  actionPrimary,
  background,
  color,
  feedback,
  focusRing,
  platform,
  surface,
  text,
} from '@/shared/design-tokens';

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const toLin = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function contrastRatio(fg: string, bg: string): number {
  const lums = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => b - a);
  return (lums[0]! + 0.05) / (lums[1]! + 0.05);
}

describe('PB-P2-027 · combinaciones aprobadas cumplen WCAG 2.1 AA', () => {
  const combos: Array<{ label: string; fg: string; bg: string; min: number }> = [
    {
      label: 'text.primary sobre background.default',
      fg: text.primary,
      bg: background.default,
      min: 4.5,
    },
    {
      label: 'text.secondary sobre background.default',
      fg: text.secondary,
      bg: background.default,
      min: 4.5,
    },
    {
      label: 'text.muted sobre background.default',
      fg: text.muted,
      bg: background.default,
      min: 4.5,
    },
    {
      label: 'text.link sobre background.default',
      fg: text.link,
      bg: background.default,
      min: 4.5,
    },
    {
      label: 'action.primary.foreground sobre action.primary.background (CTA violeta)',
      fg: actionPrimary.foreground,
      bg: actionPrimary.background,
      min: 4.5,
    },
    {
      label: 'action.primary.foreground sobre action.primary.hover',
      fg: actionPrimary.foreground,
      bg: actionPrimary.hover,
      min: 4.5,
    },
    {
      label: 'marketing CTA foreground sobre marketing CTA background',
      fg: actionMarketing.foreground,
      bg: actionMarketing.background,
      min: 4.5,
    },
    {
      label: 'destructive foreground sobre destructive background',
      fg: actionDestructive.foreground,
      bg: actionDestructive.background,
      min: 4.5,
    },
    {
      label: 'feedback.success.text sobre su surface',
      fg: feedback.success.text,
      bg: feedback.success.surface,
      min: 4.5,
    },
    {
      label: 'feedback.warning.text sobre su surface',
      fg: feedback.warning.text,
      bg: feedback.warning.surface,
      min: 4.5,
    },
    {
      label: 'feedback.error.text sobre su surface',
      fg: feedback.error.text,
      bg: feedback.error.surface,
      min: 4.5,
    },
    {
      label: 'feedback.info.text sobre su surface',
      fg: feedback.info.text,
      bg: feedback.info.surface,
      min: 4.5,
    },
    { label: 'ai.text sobre ai.surface', fg: ai.text, bg: ai.surface, min: 4.5 },
    { label: 'ai.label sobre ai.surface', fg: ai.label, bg: ai.surface, min: 4.5 },
    {
      label: 'sidebar item activo: foreground sobre su superficie',
      fg: platform.sidebarItemActiveForeground,
      bg: platform.sidebarItemActive,
      min: 4.5,
    },
    {
      label: 'text.inverse sobre surface.inverse',
      fg: text.inverse,
      bg: surface.inverse,
      min: 4.5,
    },
    // No textuales (WCAG 1.4.11 · 3:1)
    {
      label: 'focus.ring sobre fondo blanco (no textual)',
      fg: focusRing.ringColor,
      bg: background.default,
      min: 3,
    },
    { label: 'ai.border sobre ai.surface (no textual)', fg: ai.border, bg: ai.surface, min: 3 },
    {
      label: 'offset blanco del focus ring sobre la CTA violeta (no textual)',
      fg: focusRing.ringOffsetColor,
      bg: actionPrimary.background,
      min: 3,
    },
  ];

  it.each(combos)('$label ≥ $min:1', ({ fg, bg, min }) => {
    const ratio = contrastRatio(fg, bg);
    expect(
      ratio,
      `Contraste ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1 (mínimo ${min}:1)`,
    ).toBeGreaterThanOrEqual(min);
  });
});

describe('PB-P2-027 · combinaciones prohibidas por el sistema (Design Tokens §32)', () => {
  // Estas NO deben usarse jamás como texto: el test documenta y fija la prohibición.
  const forbidden: Array<{ label: string; fg: string }> = [
    { label: 'violet.500 como texto sobre blanco', fg: color.violet[500] },
    { label: 'lilac.300 como texto sobre blanco', fg: color.lilac[300] },
    { label: 'coral.300 como texto sobre blanco', fg: color.coral[300] },
  ];

  it.each(forbidden)('$label NO alcanza 4.5:1 — prohibido como texto', ({ fg }) => {
    expect(contrastRatio(fg, background.default)).toBeLessThan(4.5);
  });

  it('el focus ring SIN offset blanco no cumple sobre la CTA violeta: el offset es mandatorio', () => {
    expect(contrastRatio(focusRing.ringColor, actionPrimary.background)).toBeLessThan(3);
    // Mitigación aprobada (TOK-DEC-016): el offset blanco aporta la separación requerida.
    expect(
      contrastRatio(focusRing.ringOffsetColor, actionPrimary.background),
    ).toBeGreaterThanOrEqual(3);
  });
});
