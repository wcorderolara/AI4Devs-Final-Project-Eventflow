// PB-P2-028 — Guardarraíles del design system: el catálogo consume tokens semánticos y
// respeta las restricciones de alcance del MVP (light theme, sin temas por rol, sólo Lucide).
//
// Fuente normativa: docs/ux-ui/EventFlow-Design-Tokens.md §30 y
// docs/ux-ui/EventFlow-Component-Foundations.md §38 (matriz de consumo de tokens).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = 'src/shared/design-system';

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return listFiles(full);
    return full.endsWith('.ts') || full.endsWith('.tsx') ? [full] : [];
  });
}

const sources = listFiles(ROOT);
const read = (file: string): string => readFileSync(file, 'utf8');

describe('PB-P2-028 · design system · consumo de tokens', () => {
  it('el catálogo tiene los componentes de Actions y Forms esperados', () => {
    const names = sources.map((file) => file.split('/').pop());
    for (const expected of [
      'Button.tsx',
      'IconButton.tsx',
      'TextLink.tsx',
      'FormField.tsx',
      'Input.tsx',
      'PasswordInput.tsx',
      'Textarea.tsx',
      'SearchInput.tsx',
      'Select.tsx',
      'MultiSelect.tsx',
      'Checkbox.tsx',
      'RadioGroup.tsx',
      'DateInput.tsx',
      'CurrencyInput.tsx',
      'FileUpload.tsx',
    ]) {
      expect(names, `falta ${expected}`).toContain(expected);
    }
  });

  // PB-P2-029 — grupo Navigation & Feedback.
  it('el catálogo tiene los componentes de Navigation y Feedback esperados', () => {
    const names = sources.map((file) => file.split('/').pop());
    for (const expected of [
      'AppShell.tsx',
      'AppSidebar.tsx',
      'SidebarSection.tsx',
      'SidebarItem.tsx',
      'TopBar.tsx',
      'MobileNavigationDrawer.tsx',
      'MobileNavigationTrigger.tsx',
      'UserMenu.tsx',
      'LanguageSelector.tsx',
      'NotificationButton.tsx',
      'NotificationBadge.tsx',
      'Breadcrumb.tsx',
      'FilterBar.tsx',
      'AppliedFilterChip.tsx',
      'Badge.tsx',
      'StatusBadge.tsx',
      'Alert.tsx',
      'InlineMessage.tsx',
      'Toast.tsx',
      'EmptyState.tsx',
      'ErrorState.tsx',
      'PermissionDeniedState.tsx',
      'Spinner.tsx',
      'Skeleton.tsx',
      'ProgressIndicator.tsx',
    ]) {
      expect(names, `falta ${expected}`).toContain(expected);
    }
  });

  // PB-P2-031 — grupo Data Display & Overlays.
  it('el catálogo tiene los componentes de Data Display y Overlays esperados', () => {
    const names = sources.map((file) => file.split('/').pop());
    for (const expected of [
      'Card.tsx',
      'MetricCard.tsx',
      'Table.tsx',
      'ResponsiveTable.tsx',
      'Pagination.tsx',
      'Tabs.tsx',
      'Accordion.tsx',
      'DescriptionList.tsx',
      'CurrencyDisplay.tsx',
      'Modal.tsx',
      'ConfirmationDialog.tsx',
      'DropdownMenu.tsx',
      'Popover.tsx',
      'Tooltip.tsx',
    ]) {
      expect(names, `falta ${expected}`).toContain(expected);
    }
  });

  // PB-P2-030 — deduplicación: esta tarea extiende el catálogo existente, no lo duplica.
  it('no existe una segunda librería de componentes en paralelo al design system', () => {
    // El prompt de PB-P2-030 proponía `design-system/states/`; el repositorio ya organiza los
    // estados dentro de `feedback/`, así que se conserva esa organización aprobada. Un directorio
    // `states/` significaría dos EmptyState / ErrorState / Skeleton conviviendo.
    expect(readdirSync(ROOT).filter((entry) => statSync(join(ROOT, entry)).isDirectory())).toEqual([
      'actions',
      'ai',
      'data-display',
      'feedback',
      'forms',
      'internal',
      'marketing',
      'navigation',
      'overlays',
    ]);
  });

  // PB-P2-031 — no se crea un Drawer genérico «porque aparece en la documentación»: el único
  // drawer con requisito verificado es el de navegación mobile, ya implementado.
  it('no se duplica el drawer de navegación con un Drawer genérico', () => {
    const names = sources.map((file) => file.split('/').pop());
    expect(names).not.toContain('Drawer.tsx');
    expect(names).toContain('MobileNavigationDrawer.tsx');
  });

  // PB-P2-031 — los overlays reutilizan la primitiva accesible ya instalada en vez de añadir
  // una segunda librería de diálogos/menús.
  it('los overlays se apoyan en la primitiva accesible ya instalada', () => {
    for (const file of [
      'overlays/Modal.tsx',
      'overlays/DropdownMenu.tsx',
      'overlays/Popover.tsx',
    ]) {
      expect(read(`${ROOT}/${file}`), `${file} debe reutilizar Headless UI`).toContain(
        "from '@headlessui/react'",
      );
    }
    // ConfirmationDialog se construye SOBRE Modal: no es un segundo diálogo.
    expect(read(`${ROOT}/overlays/ConfirmationDialog.tsx`)).toContain("from './Modal'");
  });

  // PB-P2-032 — grupo AI & Marketing.
  it('el catálogo tiene los componentes de AI y Marketing esperados', () => {
    const names = sources.map((file) => file.split('/').pop());
    for (const expected of [
      'AILabel.tsx',
      'AIRecommendationCard.tsx',
      'AIRecommendationActions.tsx',
      'AIRecommendationLoading.tsx',
      'MarketingHero.tsx',
      'MarketingSection.tsx',
      'MarketingFeatureCard.tsx',
      'MarketingFeatureGrid.tsx',
      'MarketingCTAGroup.tsx',
    ]) {
      expect(names, `falta ${expected}`).toContain(expected);
    }
  });

  // PB-P2-032 — la familia AI no crea una paleta paralela ni recurre a decoración prohibida.
  it('la familia AI consume `ai.*` y evita glow, degradados y paleta cruda', () => {
    const ai = ['AILabel.tsx', 'AIRecommendationCard.tsx', 'AIRecommendationActions.tsx'].map(
      (file) => read(`${ROOT}/ai/${file}`),
    );
    expect(read(`${ROOT}/ai/AILabel.tsx`)).toContain('bg-ai-surface');
    expect(read(`${ROOT}/ai/AIRecommendationCard.tsx`)).toContain('border-ai');
    for (const source of ai) {
      // Anti-patterns de §31: glow, degradados animados, iconografía sci-fi.
      expect(source).not.toMatch(/\bshadow-\[|drop-shadow-\[|animate-pulse-glow|bg-gradient|blur-/);
      expect(source).not.toMatch(/\b(?:Bot|Wand|Wand2|Rocket)\b/);
    }
  });

  // PB-P2-032 — el marketing reutiliza el Card canónico en vez de abrir un segundo sistema.
  it('MarketingFeatureCard compone el Card canónico', () => {
    const source = read(`${ROOT}/marketing/MarketingFeatureCard.tsx`);
    expect(source).toContain("from '../data-display/Card'");
  });

  // PB-P2-031 — el formateo de moneda tiene una única definición (US-083 QA-004).
  it('CurrencyDisplay delega el formateo en el helper compartido, no lo reimplementa', () => {
    const source = read(`${ROOT}/data-display/CurrencyDisplay.tsx`);
    expect(source).toContain("from '@/shared/i18n/format'");
    // Referenciar el tipo `Intl.NumberFormatOptions` está bien; construir un formateador propio,
    // no: eso sería una segunda implementación del formato de moneda.
    expect(source).not.toMatch(/new\s+Intl\.NumberFormat\s*\(/);
    // Sin conversión de divisa en ninguna forma (BR-BUDGET-007).
    expect(source).not.toMatch(/exchangeRate|convertCurrency|fxRate/i);
  });

  it('ningún componente del catálogo está implementado dos veces', () => {
    const names = sources
      .map((file) => file.split('/').pop() as string)
      .filter((name) => name !== 'index.ts' && /^[A-Z]/.test(name));
    // `internal/Spinner.tsx` es el glifo que envuelve `feedback/Spinner.tsx`: misma familia, no
    // una segunda implementación pública. El resto de nombres debe ser único.
    const publicNames = names.filter((name) => name !== 'Spinner.tsx');
    expect(new Set(publicNames).size, `nombres repetidos en ${publicNames.join(', ')}`).toBe(
      publicNames.length,
    );
  });

  it('los consumidores migrados en PB-P2-030 consumen el design system, no markup propio', () => {
    for (const file of [
      'src/app/(app)/error.tsx',
      'src/app/(app)/loading.tsx',
      'src/features/tasks/quick-action/TaskStatusQuickToggle.tsx',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source, `${file} debe importar del design system`).toContain(
        "from '@/shared/design-system'",
      );
      expect(source, `${file} conserva paleta cruda`).not.toMatch(
        /\b(?:bg|text|border)-(?:neutral|gray|slate|blue|emerald|amber|red)-\d{2,3}\b/,
      );
    }
  });

  it('no se introduce una segunda librería de navegación ni de toasts', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const names = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
    for (const forbidden of [
      'react-hot-toast',
      'react-toastify',
      'sonner',
      'notistack',
      'react-router-dom',
      'react-burger-menu',
      '@material-symbols/svg-400',
      'material-symbols',
      '@fortawesome/fontawesome-svg-core',
    ]) {
      expect(names, `no debe instalarse ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('desktop y mobile comparten un único modelo de navegación', () => {
    const desktop = read(`${ROOT}/navigation/AppSidebar.tsx`);
    const mobile = read(`${ROOT}/navigation/MobileNavigationDrawer.tsx`);
    // Ambos importan `NavigationSection` y delegan en `SidebarSection`: no hay una segunda
    // definición de items ni un árbol de navegación paralelo (Component Foundations §20).
    for (const source of [desktop, mobile]) {
      expect(source).toContain("from './navigationModel'");
      expect(source).toContain('SidebarSection');
    }
  });

  it('el drawer mobile mantiene el focus trap de la primitiva instalada', () => {
    const mobile = read(`${ROOT}/navigation/MobileNavigationDrawer.tsx`);
    expect(mobile).toContain("from '@headlessui/react'");
    expect(mobile).toContain('DialogTitle');
  });

  it('el estado semántico nunca depende sólo del color: hay icono o texto obligatorio', () => {
    const statusBadge = read(`${ROOT}/feedback/StatusBadge.tsx`);
    expect(statusBadge).toContain('children');
    expect(statusBadge).toContain("from 'lucide-react'");
    const alert = read(`${ROOT}/feedback/Alert.tsx`);
    expect(alert).toContain("from 'lucide-react'");
    // Los decorativos no pueden actuar como feedback (UI-DEC-002 / UI-DEC-014).
    for (const source of [statusBadge, alert, read(`${ROOT}/feedback/InlineMessage.tsx`)]) {
      expect(source).not.toMatch(/\b(?:bg|text|border)-(?:lilac|coral)\b/);
    }
  });

  it('ningún componente usa utilidades de paleta cruda de Tailwind', () => {
    // `text-primary`/`border-subtle`… son alias semánticos; lo prohibido es la escala numérica.
    const rawPalette =
      /\b(?:bg|text|border|ring|fill|stroke|from|via|to|accent|outline|divide|placeholder|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|lilac|coral)-\d{2,3}\b/;
    const offenders = sources.filter((file) => rawPalette.test(read(file)));
    expect(offenders, `paleta cruda en ${offenders.join(', ')}`).toEqual([]);
  });

  it('ningún componente hardcodea colores hex ni rgb()', () => {
    const offenders = sources.filter((file) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(read(file)));
    expect(offenders, `color literal en ${offenders.join(', ')}`).toEqual([]);
  });

  it('no se introduce dark mode ni temas por rol', () => {
    const offenders = sources.filter((file) =>
      /\bdark:[a-z-]|prefers-color-scheme|data-theme|organizerTheme|vendorTheme|adminTheme/.test(
        read(file),
      ),
    );
    expect(offenders, `alcance fuera de MVP en ${offenders.join(', ')}`).toEqual([]);
  });

  it('los iconos provienen exclusivamente de lucide-react', () => {
    const iconImports = sources.flatMap((file) =>
      Array.from(read(file).matchAll(/from '([^']+)'/g))
        .map((match) => match[1] as string)
        .filter((source) =>
          /fontawesome|font-awesome|heroicons|react-icons|material-symbols|@mui/.test(source),
        ),
    );
    expect(iconImports).toEqual([]);
    expect(read(`${ROOT}/internal/Spinner.tsx`)).toContain("from 'lucide-react'");
  });

  it('el foco usa el tratamiento canónico focus-visible, nunca `focus:` genérico', () => {
    const interactive = sources.filter((file) =>
      /Button\.tsx|IconButton\.tsx|ActionLink\.tsx|TextLink\.tsx|FieldAction\.tsx|MultiSelect\.tsx|fieldStyles\.ts|actionStyles\.ts/.test(
        file,
      ),
    );
    expect(interactive.length).toBeGreaterThan(0);
    for (const file of interactive) {
      const source = read(file);
      // El tratamiento puede llegar literal o heredarse del módulo de estilos compartido
      // (`actionStyles`/`fieldStyles`), que es donde vive `ACTION_BASE`. Lo que se veta es que
      // un control se quede sin foco canónico, no dónde está escrita la clase.
      expect(source, `${file} debe usar .focus-ring`).toMatch(
        /focus-ring|from '\.\/(?:action|field)Styles'/,
      );
      // `focus:` sin `-visible` está prohibido (Design Tokens §30).
      expect(source, `${file} usa focus: genérico`).not.toMatch(/(?<!focus-visible)\bfocus:[a-z]/);
    }
    // La clase canónica tiene que existir de verdad en el módulo compartido: sin esto, la
    // alternativa de arriba dejaría pasar un `actionStyles` que no la aplicara.
    expect(read(`${ROOT}/actions/actionStyles.ts`)).toMatch(/focus-ring/);
  });

  it('no se añadieron dependencias de UI: sólo las ya instaladas', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const names = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
    for (const forbidden of [
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      '@mui/material',
      'antd',
      'react-select',
      'react-datepicker',
      'react-currency-input-field',
      'react-dropzone',
      '@storybook/react',
    ]) {
      expect(names, `no debe instalarse ${forbidden}`).not.toContain(forbidden);
    }
  });
});
