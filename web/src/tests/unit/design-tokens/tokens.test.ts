// PB-P2-027 — Design tokens: la capa TS es la fuente de verdad del sistema visual.
//
// Estos tests fijan los valores APROBADOS en `docs/ux-ui/EventFlow-Design-Tokens.md` para que
// una regresión (p. ej. volver a `primary: colors.blue`) rompa el gate en vez de llegar a
// producción. No validan estética: validan trazabilidad contra el documento normativo.
import { describe, expect, it } from 'vitest';
import {
  ai,
  actionDestructive,
  actionMarketing,
  actionPrimary,
  background,
  borderColor,
  breakpoint,
  color,
  componentAliases,
  elevation,
  feedback,
  focusRing,
  fontFamily,
  fontSize,
  icon,
  layout,
  motion,
  radii,
  surface,
  text,
  tokens,
  zIndex,
} from '@/shared/design-tokens';

describe('PB-P2-027 · primitivos aprobados (Design Tokens §8)', () => {
  it('escala neutral conserva los anclas aprobados (UI-DEC-002)', () => {
    expect(color.neutral[0]).toBe('#FFFFFF');
    expect(color.neutral[50]).toBe('#FAFAFA');
    expect(color.neutral[100]).toBe('#F5F5F5');
    expect(color.neutral[200]).toBe('#E5E5E5');
    expect(color.neutral[300]).toBe('#D4D4D4');
    expect(color.neutral[400]).toBe('#A3A3A3');
    expect(color.neutral[500]).toBe('#737373');
    expect(color.neutral[600]).toBe('#525252');
    expect(color.neutral[700]).toBe('#404040');
    expect(color.neutral[800]).toBe('#262626');
    expect(color.neutral[900]).toBe('#171717');
  });

  it('escala violeta se ancla en #946DF8 con las derivadas accesibles', () => {
    expect(color.violet[50]).toBe('#F5F1FE');
    expect(color.violet[500]).toBe('#946DF8');
    expect(color.violet[600]).toBe('#7B4EE8');
    expect(color.violet[700]).toBe('#6238C7');
    expect(color.violet[800]).toBe('#4A2A99');
  });

  it('lilac y coral conservan sus anclas decorativos', () => {
    expect(color.lilac[300]).toBe('#C4B7E5');
    expect(color.coral[300]).toBe('#EE8C8D');
  });

  it('familias semánticas son independientes de la marca (UI-DEC-014)', () => {
    expect(color.green[600]).toBe('#16A34A');
    expect(color.green[700]).toBe('#15803D');
    expect(color.green[50]).toBe('#ECFDF5');
    expect(color.amber[600]).toBe('#D97706');
    expect(color.amber[700]).toBe('#B45309');
    expect(color.amber[50]).toBe('#FFFBEB');
    expect(color.red[600]).toBe('#DC2626');
    expect(color.red[700]).toBe('#B91C1C');
    expect(color.red[50]).toBe('#FEF2F2');
    expect(color.blue[600]).toBe('#2563EB');
    expect(color.blue[700]).toBe('#1D4ED8');
    expect(color.blue[50]).toBe('#EFF6FF');
  });

  it('NO adopta los valores semánticos de Stitch (Stitch Conflict)', () => {
    const all = JSON.stringify(color).toUpperCase();
    for (const rejected of ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#683EC9', '#FDF7FF']) {
      expect(all, `valor Stitch no aprobado presente: ${rejected}`).not.toContain(rejected);
    }
  });
});

describe('PB-P2-027 · semánticos aprobados (Design Tokens §9–§11)', () => {
  it('texto usa #262626 / #525252 y NO #171717 como cuerpo', () => {
    expect(text.primary).toBe('#262626');
    expect(text.secondary).toBe('#525252');
    expect(text.muted).toBe('#737373');
    expect(text.disabled).toBe('#A3A3A3');
    expect(text.inverse).toBe('#FFFFFF');
    expect(text.link).toBe('#6238C7');
    expect(text.linkHover).toBe('#4A2A99');
    expect(text.primary).not.toBe('#171717');
  });

  it('la acción primaria es VIOLETA, no azul (FC-01)', () => {
    expect(actionPrimary.background).toBe('#7B4EE8');
    expect(actionPrimary.hover).toBe('#6238C7');
    expect(actionPrimary.active).toBe('#4A2A99');
    expect(actionPrimary.foreground).toBe('#FFFFFF');
    // Regresión explícita: la escala azul de Tailwind queda prohibida como acción primaria.
    expect(actionPrimary.background).not.toBe('#2563EB');
  });

  it('CTA de marketing es oscura y destructive es rojo semántico', () => {
    expect(actionMarketing.background).toBe('#171717');
    expect(actionMarketing.hover).toBe('#262626');
    expect(actionMarketing.foreground).toBe('#FFFFFF');
    expect(actionDestructive.background).toBe('#DC2626');
    expect(actionDestructive.hover).toBe('#B91C1C');
    expect(actionDestructive.foreground).toBe('#FFFFFF');
  });

  it('background y surfaces parten de blanco puro (UI-DEC-002)', () => {
    expect(background.default).toBe('#FFFFFF');
    expect(surface.default).toBe('#FFFFFF');
    expect(surface.subtle).toBe('#FAFAFA');
    expect(surface.disabled).toBe('#F5F5F5');
    expect(surface.inverse).toBe('#171717');
    expect(surface.selected).toBe('#F5F1FE');
  });

  it('bordes exponen default/subtle/strong/interactive', () => {
    expect(borderColor.default).toBe('#D4D4D4');
    expect(borderColor.subtle).toBe('#E5E5E5');
    expect(borderColor.strong).toBe('#404040');
    expect(borderColor.interactive).toBe('#946DF8');
  });

  it('feedback expone surface/border/text/icon por familia', () => {
    for (const status of ['success', 'warning', 'error', 'info'] as const) {
      expect(Object.keys(feedback[status])).toEqual(
        expect.arrayContaining(['surface', 'border', 'text', 'icon', 'strong', 'foreground']),
      );
    }
    expect(feedback.success.text).toBe('#15803D');
    expect(feedback.warning.text).toBe('#B45309');
    expect(feedback.error.text).toBe('#B91C1C');
    expect(feedback.info.text).toBe('#1D4ED8');
  });
});

describe('PB-P2-027 · tokens AI (Design Tokens §11 / UI-DEC-010)', () => {
  it('usa la superficie lilac y el violeta aprobados, no la escala purple de Tailwind', () => {
    expect(ai.surface).toBe('#F7F5FB');
    expect(ai.border).toBe('#946DF8');
    expect(ai.label).toBe('#6238C7');
    expect(ai.icon).toBe('#6238C7');
    expect(ai.text).toBe('#262626');
    expect(ai.pending).toBe('#946DF8');
    // Regresión: `purple-50` / `purple-700` de Tailwind quedan fuera del sistema.
    expect(ai.surface).not.toBe('#FAF5FF');
    expect(ai.label).not.toBe('#6B21A8');
  });

  it('los estados AI reutilizan las familias de feedback, sin paletas paralelas', () => {
    expect(ai.accepted).toBe(feedback.success.strong);
    expect(ai.edited).toBe(feedback.info.strong);
    expect(ai.fallback).toBe(feedback.warning.strong);
    expect(ai.error).toBe(feedback.error.strong);
  });

  it('no existen tokens de glow ni gradiente animado (UI-DEC-010)', () => {
    const keys = Object.keys(ai).join(' ').toLowerCase();
    expect(keys).not.toMatch(/glow|gradient|animate/);
  });

  it('ai.border se mantiene en violet-500 (CMP-Q-003 sigue provisional)', () => {
    expect(ai.border).toBe(color.violet[500]);
    expect(ai.border).not.toBe(color.violet[600]);
  });
});

describe('PB-P2-027 · foco, forma, elevación, layout, motion, z-index', () => {
  it('focus ring canónico: 2px #6238C7 con offset blanco de 2px (TOK-DEC-016)', () => {
    expect(focusRing.ringWidth).toBe('2px');
    expect(focusRing.ringStyle).toBe('solid');
    expect(focusRing.ringColor).toBe('#6238C7');
    expect(focusRing.ringOffset).toBe('2px');
    expect(focusRing.ringOffsetColor).toBe('#FFFFFF');
  });

  it('radios aprobados (UI-DEC-006)', () => {
    expect(radii.button).toBe('8px');
    expect(radii.input).toBe('8px');
    expect(radii.card).toBe('12px');
    expect(radii.cardProminent).toBe('16px');
    expect(radii.modal).toBe('16px');
    expect(radii.drawer).toBe('16px');
    expect(radii.badge).toBe('9999px');
  });

  it('sombras aprobadas exactas (Design Tokens §17)', () => {
    expect(elevation.surfaceSubtle).toBe('0 1px 2px rgba(23, 23, 23, 0.04)');
    expect(elevation.surfaceRaised).toBe('0 2px 6px rgba(23, 23, 23, 0.06)');
    expect(elevation.overlayDropdown).toBe(
      '0 8px 16px rgba(23, 23, 23, 0.08), 0 2px 4px rgba(23, 23, 23, 0.04)',
    );
    expect(elevation.overlayModal).toBe(
      '0 20px 40px rgba(23, 23, 23, 0.12), 0 8px 16px rgba(23, 23, 23, 0.06)',
    );
    expect(elevation.marketingFloating).toBe(
      '0 30px 60px -20px rgba(15, 13, 26, 0.15), 0 10px 20px -10px rgba(15, 13, 26, 0.08)',
    );
  });

  it('layout y breakpoints aprobados (UI-DEC-012 / TOK-DEC-015)', () => {
    expect(layout.containerMarketingMax).toBe('1280px');
    expect(layout.containerFormMax).toBe('720px');
    expect(layout.containerContentMax).toBe('1440px');
    expect(layout.sidebarWidth).toBe('256px');
    expect(layout.headerHeight).toBe('64px');
    expect(layout.pagePaddingMobile).toBe('16px');
    expect(layout.pagePaddingTablet).toBe('32px');
    expect(layout.pagePaddingDesktop).toBe('48px');
    expect([layout.gridColumnsDesktop, layout.gridColumnsTablet, layout.gridColumnsMobile]).toEqual([
      12, 8, 4,
    ]);
    expect(breakpoint).toEqual({
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    });
  });

  it('motion y z-index aprobados', () => {
    expect(motion.duration).toEqual({
      instant: '0ms',
      fast: '120ms',
      normal: '200ms',
      slow: '320ms',
    });
    expect(zIndex).toEqual({
      base: '0',
      sticky: '10',
      dropdown: '100',
      drawer: '200',
      modal: '300',
      toast: '400',
      tooltip: '500',
    });
  });

  it('iconografía: tamaños 16/20/24, strokes 1.5/2 y touch target 44px', () => {
    expect(icon.size).toEqual({ sm: '16px', md: '20px', lg: '24px' });
    expect(icon.stroke).toEqual({ default: 1.5, strong: 2 });
    expect(icon.minTouchTarget).toBe('44px');
  });
});

describe('PB-P2-027 · tipografía y arquitectura de capas', () => {
  it('familias aprobadas: Inter Tight (headings) e Inter (body/UI)', () => {
    expect(fontFamily.heading.join(' ')).toContain('Inter Tight');
    expect(fontFamily.heading[0]).toBe('var(--font-inter-tight)');
    expect(fontFamily.body.join(' ')).toContain('Inter');
    expect(fontFamily.body[0]).toBe('var(--font-inter)');
    // Fallback obligatorio para que un fallo de carga no rompa métricas.
    expect(fontFamily.body).toContain('system-ui');
  });

  it('escala tipográfica aprobada, con 12px como mínimo del sistema', () => {
    expect(fontSize.display).toBe('3.75rem');
    expect(fontSize.h1).toBe('2.5rem');
    expect(fontSize.h2).toBe('2rem');
    expect(fontSize.h3).toBe('1.5rem');
    expect(fontSize.bodyLg).toBe('1.125rem');
    expect(fontSize.bodyMd).toBe('1rem');
    expect(fontSize.bodySm).toBe('0.875rem');
    expect(fontSize.label).toBe('0.875rem');
    expect(fontSize.caption).toBe('0.75rem');
    const remValues = Object.values(fontSize).map((v) => Number.parseFloat(v));
    expect(Math.min(...remValues)).toBe(0.75);
  });

  it('expone las tres capas y los alias de componente referencian semánticos', () => {
    expect(Object.keys(tokens)).toEqual(['primitives', 'semantic', 'components']);
    expect(componentAliases.button.primary.background).toBe(actionPrimary.background);
    expect(componentAliases.input.border).toBe(borderColor.default);
    expect(componentAliases.card.radius).toBe(radii.card);
    expect(componentAliases.sidebarItem.activeForeground).toBe('#6238C7');
    expect(componentAliases.aiRecommendation.background).toBe(ai.surface);
    expect(componentAliases.aiRecommendation.border).toBe(ai.border);
  });
});
