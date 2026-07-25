// PB-P2-027 — Integración del sistema de tokens con sus tres consumidores:
// CSS custom properties (`globals.css`), Tailwind (`tailwind.config.ts`) y el código de producto.
//
// Objetivo: impedir la deriva. Si un valor se cambia en TS pero no en CSS (o al revés), o si
// reaparece una escala prohibida, estos tests fallan.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../../../tailwind.config';
import {
  ai,
  actionDestructive,
  actionMarketing,
  actionPrimary,
  borderColor,
  elevation,
  feedback,
  focusRing,
  layout,
  radii,
  surface,
  text,
} from '@/shared/design-tokens';

// Vitest se ejecuta con `cwd` en la raíz del frontend (`web/`), donde vive `vitest.config.ts`.
const webRoot = `${process.cwd()}/`;
const read = (rel: string): string => readFileSync(`${webRoot}${rel}`, 'utf-8');

/** Lista recursiva de archivos bajo `dir` (relativo a `webRoot`) que terminen en `exts`. */
function listFiles(dir: string, exts: readonly string[]): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(`${webRoot}${rel}`, { withFileTypes: true })) {
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else if (exts.some((e) => entry.name.endsWith(e))) out.push(next);
    }
  };
  walk(dir);
  return out;
}

const globalsCss = read('src/app/globals.css');
/**
 * `globals.css` sin comentarios. Las aserciones "no existe selector X" deben mirar CSS real:
 * los comentarios del archivo mencionan `.dark` / `[data-role]` justamente para documentar que
 * NO se usan, y harían falsos positivos.
 */
const globalsCssCode = globalsCss.replace(/\/\*[\s\S]*?\*\//g, '');
const layoutTsx = read('src/app/layout.tsx');
const packageJson = JSON.parse(read('package.json')) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

/** Extrae el valor de una CSS custom property declarada en `:root`. */
function cssVar(name: string): string | undefined {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(globalsCss);
  return match?.[1]?.trim();
}

describe('PB-P2-027 · CSS custom properties sincronizadas con la capa TS', () => {
  // Si este mapa falla, TS y CSS divergieron: corregir el que esté desalineado con
  // `docs/ux-ui/EventFlow-Design-Tokens.md`, nunca "ajustar el test".
  const mapping: Array<[string, string]> = [
    ['--color-text-primary', text.primary],
    ['--color-text-secondary', text.secondary],
    ['--color-text-muted', text.muted],
    ['--color-text-disabled', text.disabled],
    ['--color-text-link', text.link],
    ['--color-surface-default', surface.default],
    ['--color-surface-subtle', surface.subtle],
    ['--color-surface-inverse', surface.inverse],
    ['--color-surface-selected', surface.selected],
    ['--color-border-default', borderColor.default],
    ['--color-border-subtle', borderColor.subtle],
    ['--color-border-strong', borderColor.strong],
    ['--color-border-interactive', borderColor.interactive],
    ['--color-action-primary', actionPrimary.background],
    ['--color-action-primary-hover', actionPrimary.hover],
    ['--color-action-primary-active', actionPrimary.active],
    ['--color-action-destructive', actionDestructive.background],
    ['--color-action-marketing', actionMarketing.background],
    ['--color-feedback-success-text', feedback.success.text],
    ['--color-feedback-warning-text', feedback.warning.text],
    ['--color-feedback-error-text', feedback.error.text],
    ['--color-feedback-info-text', feedback.info.text],
    ['--color-ai-surface', ai.surface],
    ['--color-ai-border', ai.border],
    ['--color-ai-label', ai.label],
    ['--color-ai-icon', ai.icon],
    ['--color-ai-text', ai.text],
    ['--focus-ring-color', focusRing.ringColor],
    ['--focus-ring-offset-color', focusRing.ringOffsetColor],
    ['--focus-ring-width', focusRing.ringWidth],
    ['--focus-ring-offset', focusRing.ringOffset],
    ['--radius-button', radii.button],
    ['--radius-card', radii.card],
    ['--radius-modal', radii.modal],
    ['--radius-badge', radii.badge],
    ['--shadow-surface-subtle', elevation.surfaceSubtle],
    ['--layout-sidebar-width', layout.sidebarWidth],
    ['--layout-header-height', layout.headerHeight],
    ['--layout-container-form-max', layout.containerFormMax],
  ];

  it.each(mapping)('%s coincide con el token TS', (name, expected) => {
    const actual = cssVar(name);
    expect(actual, `${name} ausente en globals.css`).toBeDefined();
    expect(actual?.toLowerCase()).toBe(expected.toLowerCase());
  });

  it('declara reduced-motion y el tratamiento canónico de foco', () => {
    expect(globalsCss).toContain('prefers-reduced-motion: reduce');
    expect(globalsCss).toContain('.focus-ring');
    expect(globalsCss).toContain('focus-visible:ring-focus');
    expect(globalsCss).toContain('focus-visible:ring-offset-focus');
  });

  it('el body consume los tokens de fondo, texto y familia tipográfica', () => {
    expect(globalsCss).toMatch(/background-color:\s*var\(--color-background-default\)/);
    expect(globalsCss).toMatch(/color:\s*var\(--color-text-primary\)/);
    expect(globalsCss).toContain("theme('fontFamily.body')");
  });
});

describe('PB-P2-027 · Tailwind expone las utilidades semánticas', () => {
  const extend = tailwindConfig.theme?.extend ?? {};

  it('la acción primaria de Tailwind es violeta, no azul (FC-01)', () => {
    const bg = extend.backgroundColor as Record<string, Record<string, string>>;
    expect(bg['action-primary']?.DEFAULT).toBe('#7B4EE8');
    expect(bg['action-primary']?.hover).toBe('#6238C7');
    // El alias de compatibilidad `primary` ya NO es la escala azul de Tailwind.
    const colors = extend.colors as Record<string, Record<string, string>>;
    expect(colors.primary?.[600]).toBe('#7B4EE8');
    expect(colors.primary?.[600]).not.toBe('#2563eb');
  });

  it('expone text/border/ring semánticos', () => {
    const textColor = extend.textColor as Record<string, string>;
    expect(textColor.primary).toBe('#262626');
    expect(textColor.secondary).toBe('#525252');
    expect(textColor.muted).toBe('#737373');
    expect(textColor.link).toBe('#6238C7');
    expect(textColor['ai-label']).toBe('#6238C7');

    const border = extend.borderColor as Record<string, string>;
    expect(border.default).toBe('#D4D4D4');
    expect(border.subtle).toBe('#E5E5E5');
    expect(border.ai).toBe('#946DF8');

    expect((extend.ringColor as Record<string, string>).focus).toBe('#6238C7');
    expect((extend.ringOffsetColor as Record<string, string>).focus).toBe('#FFFFFF');
  });

  it('expone fuentes, radios, sombras, z-index y breakpoints aprobados', () => {
    const families = extend.fontFamily as Record<string, string[]>;
    expect(families.heading?.join(' ')).toContain('Inter Tight');
    expect(families.body?.join(' ')).toContain('Inter');

    const radius = extend.borderRadius as Record<string, string>;
    expect(radius.button).toBe('8px');
    expect(radius.card).toBe('12px');
    expect(radius.modal).toBe('16px');

    const shadows = extend.boxShadow as Record<string, string>;
    expect(shadows['surface-subtle']).toBe(elevation.surfaceSubtle);
    expect(shadows['overlay-modal']).toBe(elevation.overlayModal);

    expect((extend.zIndex as Record<string, string>).modal).toBe('300');
    expect(tailwindConfig.theme?.screens).toMatchObject({ lg: '1024px', xl: '1280px' });
  });
});

describe('PB-P2-027 · restricciones de alcance MVP', () => {
  it('NO introduce dark mode (UI-DEC-013)', () => {
    expect(tailwindConfig.darkMode).toBeUndefined();
    expect(globalsCssCode).not.toMatch(/\.dark\b|\[data-theme|prefers-color-scheme/);
    const sources = listFiles('src', ['.ts', '.tsx']);
    const offenders = sources.filter((f) => /\bdark:[a-z-]/.test(read(f)));
    expect(offenders, `variantes dark: encontradas en ${offenders.join(', ')}`).toEqual([]);
  });

  it('NO introduce temas por rol (UI-DEC-009)', () => {
    expect(globalsCssCode).not.toMatch(/\[data-role|\.role-(organizer|vendor|admin)/);
    const tokenSource = ['primitives', 'semantic', 'components']
      .map((f) => read(`src/shared/design-tokens/${f}.ts`))
      .join('\n');
    expect(tokenSource).not.toMatch(/organizerTheme|vendorTheme|adminTheme|theme\.role/);
  });

  it('NO instala Font Awesome; lucide-react sigue siendo la única librería de iconos', () => {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const names = Object.keys(deps);
    expect(names.filter((n) => /fortawesome|font-awesome/i.test(n))).toEqual([]);
    expect(deps['lucide-react']).toBeDefined();
    expect(
      names.filter((n) => /^(@heroicons|react-icons|@mui\/icons|material-symbols)/.test(n)),
    ).toEqual([]);
  });

  it('las fuentes aprobadas se cargan con next/font (sin <link> a red)', () => {
    expect(layoutTsx).toContain("from 'next/font/google'");
    expect(layoutTsx).toMatch(/Inter\s*,\s*Inter_Tight|Inter_Tight/);
    expect(layoutTsx).toContain('--font-inter');
    expect(layoutTsx).toContain('--font-inter-tight');
    expect(layoutTsx).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });
});

describe('PB-P2-027 · consumidores migrados', () => {
  const productionSources = [
    ...listFiles('src/app', ['.tsx']),
    ...listFiles('src/features', ['.tsx']),
    ...listFiles('src/shared', ['.tsx']),
  ];

  it('no quedan clases `brand-*` inexistentes en código de producción', () => {
    const offenders = productionSources.filter((f) =>
      /\b(bg|text|border|ring)-brand-/.test(read(f)),
    );
    expect(offenders, `clases brand-* en ${offenders.join(', ')}`).toEqual([]);
  });

  it('no queda ningún anillo de foco `purple-400` (falla WCAG 1.4.11 · 2.64:1)', () => {
    const offenders = productionSources.filter((f) => /ring-purple-400/.test(read(f)));
    expect(offenders, `focus ring no accesible en ${offenders.join(', ')}`).toEqual([]);
  });

  it('QuoteRequestForm usa la acción y el foco semánticos', () => {
    const src = read('src/features/quotes/components/QuoteRequestForm.tsx');
    expect(src).toContain('bg-action-primary');
    expect(src).toContain('hover:bg-action-primary-hover');
    expect(src).toContain('focus-ring');
    expect(src).not.toContain('brand-');
  });

  it('el shell de navegación consume tokens semánticos', () => {
    // PB-P2-029: la apariencia del item de navegación y de la sidebar vive ahora en el design
    // system (`shared/design-system/navigation`); `shared/navigation` conserva sólo la
    // traducción, la ruta activa y el modelo. Las aserciones se mantienen intactas y apuntan al
    // archivo que ahora consume cada token.
    const sidebarItem = read('src/shared/design-system/navigation/SidebarItem.tsx');
    expect(sidebarItem).toContain('bg-sidebar-item-active');
    expect(sidebarItem).toContain('text-sidebar-item-active');
    expect(sidebarItem).toContain('focus-ring');
    expect(sidebarItem).not.toContain('primary-50');

    const navLink = read('src/shared/navigation/NavLink.tsx');
    expect(navLink).toContain('SidebarItem');
    expect(navLink).not.toContain('primary-50');

    const appSidebar = read('src/shared/design-system/navigation/AppSidebar.tsx');
    expect(appSidebar).toContain('w-sidebar');
    expect(appSidebar).toContain('border-subtle');

    const skipLink = read('src/shared/navigation/SkipLink.tsx');
    expect(skipLink).toContain('bg-action-primary');
  });

  it('AIBadge (superficie AI representativa) consume la familia ai.* con icono + label', () => {
    const src = read('src/features/ai/event-plan/components/AIBadge.tsx');
    expect(src).toContain('bg-ai-surface');
    expect(src).toContain('border-ai');
    expect(src).toContain('text-ai-label');
    expect(src).toContain('text-ai-icon');
    // UI-DEC-010: la distinción no puede depender sólo del color.
    expect(src).toContain('Sparkles');
    expect(src).toContain("from 'lucide-react'");
    expect(src).toContain('badgeSuggested');
    expect(src).not.toMatch(/purple-\d/);
  });
});
