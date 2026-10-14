// PB-P2-027 — Design tokens: la capa TS es la fuente de verdad del sistema visual.
//
// Estos tests fijan los valores APROBADOS en `docs/ux-ui/EventFlow-Design-Tokens.md` (identidad
// "La fiesta, no el software", UI-DEC-002/004/006 rev. 2) para que una regresión —volver al
// violeta o al azul de Tailwind, o a Inter— rompa el gate en vez de llegar a producción.
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
  elevation,
  feedback,
  focusRing,
  fontFamily,
  fontSize,
  icon,
  layout,
  motion,
  platform,
  radii,
  surface,
  text,
  zIndex,
} from '@/shared/design-tokens';

describe('PB-P2-027 · primitivos aprobados (Design Tokens §8, UI-DEC-002 rev. 2)', () => {
  it('neutrales en tinta: blanco puro y texto principal #1E2742', () => {
    expect(color.neutral[0]).toBe('#FFFFFF');
    expect(color.neutral[50]).toBe('#F7F8F6');
    expect(color.neutral[200]).toBe('#E1E4E0');
    expect(color.neutral[300]).toBe('#C9CDCC');
    expect(color.neutral[500]).toBe('#6E7486');
    expect(color.neutral[600]).toBe('#4E5468');
    expect(color.neutral[800]).toBe('#1E2742');
    expect(color.neutral[900]).toBe('#151B30');
  });

  it('marca: bugambilia anclada en #B8235A', () => {
    expect(color.bugambilia[50]).toBe('#FDF0F5');
    expect(color.bugambilia[500]).toBe('#C73668');
    expect(color.bugambilia[600]).toBe('#B8235A');
    expect(color.bugambilia[700]).toBe('#991B4B');
    expect(color.bugambilia[800]).toBe('#78163C');
    // `violet` queda sólo como alias de compatibilidad de la marca.
    expect(color.violet).toBe(color.bugambilia);
  });

  it('jade (dinero/confirmaciones) y cempasúchil (propuestas de la IA)', () => {
    expect(color.jade[600]).toBe('#0E6B58');
    expect(color.jade[700]).toBe('#0B5747');
    expect(color.cempasuchil[50]).toBe('#FFF8E6');
    expect(color.cempasuchil[600]).toBe('#B87A00');
    expect(color.cempasuchil[700]).toBe('#8F5E00');
  });

  it('familias semánticas son independientes de la marca (UI-DEC-014)', () => {
    expect(color.green).toBe(color.jade);
    expect(color.blue).toBe(color.anil);
    expect(color.red).toBe(color.bermellon);
    expect(color.amber[600]).toBe('#D97706');
    expect(color.amber[700]).toBe('#B45309');
    expect(color.bermellon[600]).toBe('#C2361A');
    expect(color.anil[700]).toBe('#2F3E72');
    // El error nunca es la bugambilia de marca: "borrar" no se confunde con la acción principal.
    expect(color.bermellon[600]).not.toBe(color.bugambilia[600]);
  });

  it('NO adopta los valores semánticos de Stitch (Stitch Conflict)', () => {
    const all = JSON.stringify(color).toUpperCase();
    for (const rejected of ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#683EC9', '#FDF7FF']) {
      expect(all, `valor Stitch no aprobado presente: ${rejected}`).not.toContain(rejected);
    }
  });

  it('ya no quedan valores de la paleta por defecto de Tailwind en las familias de feedback', () => {
    const all = JSON.stringify({ g: color.green, r: color.red, b: color.blue }).toUpperCase();
    for (const tailwind of ['#16A34A', '#DC2626', '#2563EB', '#7B4EE8', '#946DF8']) {
      expect(all).not.toContain(tailwind);
    }
  });
});

describe('PB-P2-027 · semánticos aprobados (Design Tokens §9–§11)', () => {
  it('texto en tinta (#1E2742 / #4E5468), nunca la superficie inversa como cuerpo', () => {
    expect(text.primary).toBe('#1E2742');
    expect(text.secondary).toBe('#4E5468');
    expect(text.muted).toBe('#6E7486');
    expect(text.inverse).toBe('#FFFFFF');
    expect(text.link).toBe('#991B4B');
    expect(text.linkHover).toBe('#78163C');
    expect(text.primary).not.toBe('#151B30');
  });

  it('la acción primaria es bugambilia, no azul ni violeta de Tailwind (FC-01)', () => {
    expect(actionPrimary.background).toBe('#B8235A');
    expect(actionPrimary.hover).toBe('#991B4B');
    expect(actionPrimary.active).toBe('#78163C');
    expect(actionPrimary.foreground).toBe('#FFFFFF');
    expect(actionPrimary.background).not.toBe('#2563EB');
    expect(actionPrimary.background).not.toBe('#7C3AED');
  });

  it('CTA de marketing en tinta y destructive en bermellón', () => {
    expect(actionMarketing.background).toBe('#1E2742');
    expect(actionMarketing.hover).toBe('#363C52');
    expect(actionMarketing.foreground).toBe('#FFFFFF');
    expect(actionDestructive.background).toBe('#C2361A');
    expect(actionDestructive.hover).toBe('#9F2B15');
    expect(actionDestructive.foreground).toBe('#FFFFFF');
  });

  it('background y surfaces de contenido parten de blanco puro', () => {
    expect(background.default).toBe('#FFFFFF');
    expect(surface.default).toBe('#FFFFFF');
    expect(surface.subtle).toBe('#F7F8F6');
    expect(surface.inverse).toBe('#151B30');
    expect(surface.selected).toBe('#FDF0F5');
  });

  it('el cromo del shell es papel algodón; el contenido blanco se lee encima', () => {
    expect(color.canvas.bright).toBe('#F5F6F2');
    expect(color.canvas.low).toBe('#ECEEE8');
    expect(color.canvas.container).toBe('#E4E7E0');
    expect(color.canvas.high).toBe('#DDE0D8');
    expect(color.canvas.outlineVariant).toBe('#D3D7CE');

    expect(platform.pageBackground).toBe(color.canvas.bright);
    expect(platform.headerBackground).toBe(color.canvas.bright);
    expect(platform.sidebarBackground).toBe(color.canvas.low);
    expect(platform.sidebarFooterBackground).toBe(color.canvas.container);
    expect(platform.sidebarItemHover).toBe(color.canvas.high);
    expect(platform.chromeBorder).toBe(color.canvas.outlineVariant);
    // Ítem activo sobrio: tinte de bugambilia con texto oscuro, no un bloque relleno.
    expect(platform.sidebarItemActive).toBe(color.bugambilia[50]);
    expect(platform.sidebarItemActiveForeground).toBe(color.bugambilia[800]);
    expect(background.page).toBe(color.canvas.bright);
    expect(surface.default).toBe('#FFFFFF');
  });

  it('bordes exponen default/subtle/strong/interactive', () => {
    expect(borderColor.default).toBe('#C9CDCC');
    expect(borderColor.subtle).toBe('#E1E4E0');
    expect(borderColor.strong).toBe('#363C52');
    expect(borderColor.interactive).toBe('#C73668');
  });

  it('feedback expone surface/border/text/icon por familia', () => {
    for (const status of ['success', 'warning', 'error', 'info'] as const) {
      expect(Object.keys(feedback[status])).toEqual(
        expect.arrayContaining(['surface', 'border', 'text', 'icon', 'strong', 'foreground']),
      );
    }
    expect(feedback.success.text).toBe('#0B5747');
    expect(feedback.warning.text).toBe('#B45309');
    expect(feedback.error.text).toBe('#9F2B15');
    expect(feedback.info.text).toBe('#2F3E72');
  });
});

describe('PB-P2-027 · tokens AI (Design Tokens §11 / UI-DEC-010)', () => {
  it('las propuestas de la IA son un borrador en cempasúchil, no la escala purple de Tailwind', () => {
    expect(ai.surface).toBe('#FFF8E6');
    expect(ai.border).toBe('#B87A00');
    expect(ai.label).toBe('#8F5E00');
    expect(ai.icon).toBe('#8F5E00');
    expect(ai.text).toBe('#1E2742');
    expect(ai.pending).toBe('#B87A00');
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

  it('el borde de la IA cumple 3:1 no textual: cempasúchil 600, no el 500 decorativo', () => {
    expect(ai.border).toBe(color.cempasuchil[600]);
    expect(ai.border).not.toBe(color.cempasuchil[500]);
  });
});

describe('PB-P2-027 · foco, forma, elevación, layout, motion, z-index', () => {
  it('focus ring canónico: 2px #991B4B con offset blanco de 2px (TOK-DEC-016)', () => {
    expect(focusRing.ringWidth).toBe('2px');
    expect(focusRing.ringStyle).toBe('solid');
    expect(focusRing.ringColor).toBe('#991B4B');
    expect(focusRing.ringOffset).toBe('2px');
    expect(focusRing.ringOffsetColor).toBe('#FFFFFF');
  });

  it('radios aprobados (UI-DEC-006 rev. 2): esquinas de papel, más contenidas', () => {
    expect(radii.button).toBe('6px');
    expect(radii.input).toBe('6px');
    expect(radii.card).toBe('8px');
    expect(radii.cardProminent).toBe('12px');
    expect(radii.modal).toBe('12px');
    expect(radii.drawer).toBe('12px');
    expect(radii.badge).toBe('9999px');
  });

  it('sombras aprobadas exactas (Design Tokens §17)', () => {
    // Sombras teñidas de tinta (#151B30), no negro neutro.
    expect(elevation.surfaceSubtle).toBe('0 1px 2px rgba(21, 27, 48, 0.04)');
    expect(elevation.surfaceRaised).toBe('0 2px 6px rgba(21, 27, 48, 0.06)');
    expect(elevation.overlayDropdown).toBe(
      '0 8px 16px rgba(21, 27, 48, 0.08), 0 2px 4px rgba(21, 27, 48, 0.04)',
    );
    expect(elevation.overlayModal).toBe(
      '0 20px 40px rgba(21, 27, 48, 0.12), 0 8px 16px rgba(21, 27, 48, 0.06)',
    );
    expect(elevation.marketingFloating).toBe(
      '0 30px 60px -20px rgba(21, 27, 48, 0.15), 0 10px 20px -10px rgba(21, 27, 48, 0.08)',
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
    expect([layout.gridColumnsDesktop, layout.gridColumnsTablet, layout.gridColumnsMobile]).toEqual(
      [12, 8, 4],
    );
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
  it('familias aprobadas (UI-DEC-004 rev. 2): Bodoni Moda (display) y Figtree (UI)', () => {
    expect(fontFamily.display[0]).toBe('var(--font-display)');
    expect(fontFamily.display.join(' ')).toContain('Bodoni Moda');
    expect(fontFamily.display).toContain('serif');
    expect(fontFamily.heading[0]).toBe('var(--font-sans)');
    expect(fontFamily.body.join(' ')).toContain('Figtree');
    expect(fontFamily.body[0]).toBe('var(--font-sans)');
    expect(fontFamily.body.join(' ')).not.toContain('Inter');
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
});
