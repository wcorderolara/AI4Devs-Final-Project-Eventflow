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
      /Button\.tsx|IconButton\.tsx|TextLink\.tsx|FieldAction\.tsx|MultiSelect\.tsx|fieldStyles\.ts/.test(
        file,
      ),
    );
    expect(interactive.length).toBeGreaterThan(0);
    for (const file of interactive) {
      const source = read(file);
      expect(source, `${file} debe usar .focus-ring`).toMatch(/focus-ring/);
      // `focus:` sin `-visible` está prohibido (Design Tokens §30).
      expect(source, `${file} usa focus: genérico`).not.toMatch(/(?<!focus-visible)\bfocus:[a-z]/);
    }
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
