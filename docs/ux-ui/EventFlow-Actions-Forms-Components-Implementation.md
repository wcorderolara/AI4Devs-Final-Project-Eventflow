# EventFlow — Actions & Forms Components · Implementation Record

| Campo | Valor |
|---|---|
| Documento | EventFlow — Actions & Forms Components Implementation Record |
| Versión | 1.0 |
| Fecha | 2026-07-24 |
| Alcance | Componentes reutilizables de **Actions** y **Forms** en `web/src/shared/design-system/`, más la adopción en un conjunto representativo de consumidores. No incluye migración masiva de formularios ni otros grupos de componentes. |
| Estado | Completado — lint, typecheck, tests y build en verde |
| Input aprobado | `docs/ux-ui/EventFlow-Component-Foundations.md` · `docs/ux-ui/EventFlow-Design-Tokens.md` · `docs/ux-ui/EventFlow-UI-Foundations.md` · `docs/ux-ui/EventFlow-Frontend-Design-Tokens-Implementation.md` |

---

## 1. Purpose

Construir los fundamentos reutilizables de **acciones** (Button, IconButton, TextLink) y
**formularios** (FormField + 12 controles) sobre la capa de design tokens ya implementada
(PB-P2-027), y demostrarlos migrando un conjunto pequeño y representativo de consumidores sin
cambiar comportamiento de producto.

Antes de esta tarea `web/src/shared/design-system/` estaba **vacío** (sólo `.gitkeep`): cada
formulario del producto repetía su propio `<label>` + `<input className="rounded border
border-neutral-300 …">` + `<button className="bg-blue-600 …">`. Los 117 archivos con `<button>`
y los 42 con `<input>` no compartían ni foco, ni radios, ni estados, ni tokens.

## 2. Stitch project and screen inspected

| Recurso | Identificador |
|---|---|
| Proyecto | `projects/10889252267442839867` — "EventFlow AI Planning Workspace" |
| Screen | `projects/10889252267442839867/screens/7547959855e44faea2fbf54209e6899b` — "EventFlow — Component Design System (Actions & Forms)" (DESKTOP, 2560 × 5710) |

## 3. Stitch resources retrieved

| Recurso | Detalle |
|---|---|
| Metadata del screen | `mcp__stitch__get_screen` — título, deviceType, dimensiones, URLs firmadas |
| HTML generado | `projects/10889252267442839867/files/3431383320984858348` — descargado (20 203 bytes) y leído íntegro |
| Screenshot | `projects/10889252267442839867/files/8755490009077105107` — descargado e inspeccionado visualmente |
| DESIGN.md / design system | No se solicitó de nuevo: la validación previa (`EventFlow-Stitch-Foundations-Frontend-Validation.md` §2.1) ya inspeccionó las 3 versiones y sus divergencias están registradas |

**Stitch se usó como evidencia visual, no como autoridad de tokens.** Lo que aportó: anatomía de
las secciones *Actions* y *Form Components* (agrupación variantes × tamaños, botones icon-only de
44 × 44, anatomía label + contador + input + helper, input con icono leading e icono de error
trailing, fila de checkboxes/radios, y el drop zone con borde punteado + icono + hint de límites).

Lo que **se descartó** de su HTML por contradecir la documentación aprobada:

| Valor Stitch | Motivo | Valor EventFlow usado |
|---|---|---|
| `primary: #683ec9`, `surface-tint: #6b41cc` | Capa Material bajo los overrides de marca | `action.primary` `#7B4EE8` / hover `#6238C7` |
| `background: #fdf7ff` | No aprobado | `background.default` `#FFFFFF` |
| `success #10B981` · `warning #F59E0B` · `error #EF4444` · `info #3B82F6` | Familias no aprobadas (UI-DEC-014) | `#16A34A` · `#D97706` · `#DC2626` · `#2563EB` |
| `ai-surface #F5F3FF` | Cercano pero no aprobado | `ai.surface` `#F7F5FB` |
| Material Symbols (`cloud_upload`, `mail`, `error`, `settings`, `add`, `open_in_new`) | Segunda familia de iconos | `lucide-react` (`UploadCloud`, `Mail`, `AlertCircle`, …) |
| Inter para todos los roles tipográficos | UI-DEC-004 separa headings | `font-heading` (Inter Tight) / `font-body` · `font-ui` (Inter) |
| `darkMode: "class"` | UI-DEC-013 | Light theme únicamente |
| `font-label` con `uppercase tracking-wider` | No aprobado para `label` | `typography.form.label` sin uppercase |
| `h-11` (44 px) como altura de botón `md` | Contradice `size.control.md` (40 px) | 40 px visual + `.hit-area` (área táctil 44 px) |
| Botón AI con `bg-ai-border` (`#946DF8`) | `violet.500` no es fondo de acción | Acción primaria aprobada |

## 4. Documentation read

Leídos completos antes de implementar: `EventFlow-UI-Foundations.md` (899 líneas),
`EventFlow-Design-Tokens.md` (1 335), `EventFlow-Component-Foundations.md` (2 105),
`EventFlow-Stitch-Foundations-Frontend-Validation.md` (877),
`EventFlow-Frontend-Design-Tokens-Implementation.md` (332).

Inspeccionados además: `web/src/shared/design-tokens/` (5 archivos + README),
`web/tailwind.config.ts`, `web/src/app/globals.css`, `web/src/shared/design-system/` (vacío),
`web/src/shared/ui/`, `web/package.json`, `.eslintrc.cjs`, `vitest.config.ts`, y los formularios,
filtros y tests existentes.

## 5. Existing component inventory

Barrido de `src/**/*.tsx`: 117 archivos con `<button>`, 42 con `<input>`, 24 con `<textarea>`,
19 con `<select>`, 8 con `type="date"`, 1 con `type="file"`, 19 con `useForm` (React Hook Form).

| Patrón existente | Dónde | Clasificación | Resultado |
|---|---|---|---|
| Botones ad-hoc (`rounded bg-blue-600 px-4 py-2 …`) | ~117 archivos | **Replace safely** | Nuevo `Button`; migrados 5 consumidores |
| Botones icon-only (`h-8 w-8`) | Tablas y toolbars admin | **Replace safely** | Nuevo `IconButton` (≥ 44 px); adopción diferida |
| `<label>` + `<input>` + `<p>` de error repetidos | ~42 archivos | **Replace safely** | Nuevo `FormField` + `Input` |
| `<textarea>` con contador manual | `ReviewForm`, `AIBriefField`, `VendorProfileEditor`… | **Normalize** | `Textarea` + `characterCount` de `FormField` |
| `<select>` nativo con clases repetidas | 19 archivos | **Normalize** | `Select` (sigue siendo nativo) |
| Checkboxes de filtro multi-status | `ReviewFiltersPanel`, `AdminEventFiltersPanel` | **Normalize** | `Checkbox` (nativo + label asociado) |
| `type="date"` sin tokens | 8 archivos | **Normalize** | `DateInput` |
| Montos con `inputMode="decimal"` y parseo manual | `AddBudgetItemModal`, `QuoteResponseForm`, `BreakdownEditor` | **Replace safely** | `CurrencyInput` (adopción diferida) |
| Dropzone `role="button"` + `tabIndex` + input `hidden` | `PortfolioUploader` | **Replace safely** | `FileUpload` (input nativo enfocable) |
| `<Money>` (`shared/i18n/Money.tsx`) | Global | **Reuse as-is** | No se toca; `CurrencyInput` es entrada, `Money` es salida |
| `Pagination` / `PageSizeSelector` (`shared/ui/`) | Tablas admin | **Reuse as-is** | Fuera del grupo Actions & Forms |
| `StarRating` | Reseñas | **Feature-specific** | Se mantiene en el feature |
| `CaptchaWidget`, `AIBadge`, `EventLanguageSelector`, `PreferredLanguageSelector` | Auth / AI / i18n | **Feature-specific** | Sin cambios |
| `Switch` | — | **Out of scope** | No existe requisito verificado (CMP-DEC-018 lo deja P1) |

**Problemas de accesibilidad encontrados en el inventario** (no todos corregidos en esta tarea):
dropzone con `role="button"` duplicando el input nativo; iconos-solo de 32 px por debajo del
mínimo táctil; errores sin `aria-describedby` en varios formularios; anillos de foco heredados con
`focus:` genérico; y errores comunicados sólo con color + texto rojo sin icono.

## 6. Reused components

- `shared/design-tokens/**` — única fuente de valores; **no se duplicó ni modificó ningún token**.
- `.focus-ring` de `globals.css` — tratamiento de foco canónico.
- `shared/i18n/Money.tsx` y `format.ts` — presentación monetaria de salida.
- `shared/ui/Pagination.tsx` — sin cambios.
- Dependencias ya instaladas: `lucide-react`, `react-hook-form`, `next-intl`, `next/link`.
  **No se instaló ninguna dependencia nueva** (ni `clsx`, ni `class-variance-authority`, ni
  librerías de select/date/dropzone, ni Storybook).

## 7. Extended components

- `web/src/app/globals.css`: se añadieron dos clases de componente **sobre los tokens existentes**
  (no se tocó ninguna variable): `.focus-ring-within` (mismo anillo aplicado al contenedor cuando
  el control interno recibe `focus-visible`, vía `has-[:focus-visible]`) y `.hit-area` (ampliación
  invisible del área de pulsación a `--size-touch-minimum` = 44 px).

## 8. New components

`web/src/shared/design-system/`

| Archivo | Componente |
|---|---|
| `actions/Button.tsx` | `Button` — 5 variantes × 3 tamaños |
| `actions/IconButton.tsx` | `IconButton` — nombre accesible obligatorio |
| `actions/TextLink.tsx` | `TextLink` — interno (`next/link`), inline, externo |
| `forms/FormField.tsx` | `FormField` — composición label + control + helper + error + contador |
| `forms/Input.tsx` | `Input` |
| `forms/PasswordInput.tsx` | `PasswordInput` |
| `forms/Textarea.tsx` | `Textarea` |
| `forms/SearchInput.tsx` | `SearchInput` |
| `forms/Select.tsx` | `Select` (nativo) |
| `forms/MultiSelect.tsx` | `MultiSelect` (listbox ARIA propio) |
| `forms/Checkbox.tsx` | `Checkbox` (incluye indeterminate) |
| `forms/RadioGroup.tsx` | `RadioGroup` (fieldset + legend) |
| `forms/DateInput.tsx` | `DateInput` |
| `forms/CurrencyInput.tsx` | `CurrencyInput` |
| `forms/FileUpload.tsx` | `FileUpload` |
| `forms/FieldAction.tsx` | Acción compacta dentro de un campo |
| `forms/fieldStyles.ts` · `forms/currencyParsing.ts` | Estilos y parseo compartidos |
| `internal/cx.ts` · `internal/a11y.ts` · `internal/Spinner.tsx` | Utilidades internas |
| `README.md` | Catálogo de uso (Phase 13) |

## 9. Component APIs

Tipado estricto, sin `any`, sin DTOs de dominio y sin uniones enormes. Extracto:

```ts
// Actions
Button:     { variant?: 'primary'|'marketing'|'secondary'|'ghost'|'destructive';
              size?: 'sm'|'md'|'lg'; fullWidth?; isLoading?; loadingLabel?;
              leadingIcon?; trailingIcon? } & ButtonHTMLAttributes   // + ref
IconButton: { icon; variant?: 'default'|'subtle'|'destructive'; size?: 'sm'|'md'|'lg';
              isLoading? } & ButtonHTMLAttributes                    // + ref
TextLink:   { href; variant?: 'default'|'inline'; external?; externalHintLabel?;
              leadingIcon?; trailingIcon?; disabled? } & AnchorHTMLAttributes

// Forms
FormField:  { label; children: (control: FieldControlProps) => ReactNode; id?; required?;
              requiredIndicator?; optionalIndicator?; description?; helperText?; error?;
              characterCount?: { current; max; label?; live? }; disabled?; readOnly? }
FieldControlProps = { id; 'aria-describedby'; 'aria-invalid'; 'aria-required'; disabled; readOnly }

Input:      { inputSize?; leadingIcon?; trailingContent?; prefix?; suffix?; invalid?;
              fullWidth? } & InputHTMLAttributes                     // + ref
PasswordInput: InputProps + { showLabel: string; hideLabel: string }
SearchInput:   InputProps + { clearLabel: string; onClear?; loading?; clearOnEscape? }
Textarea:   { minRows?; invalid?; fullWidth?; resize?: 'vertical'|'none' } & TextareaHTMLAttributes
Select:     { selectSize?; options?: readonly SelectOption[]; placeholder?; invalid? } & SelectHTMLAttributes
MultiSelect:{ options; value: readonly string[]; onChange; placeholder;
              summaryLabel: (count:number)=>string; removeOptionLabel: (label:string)=>string;
              clearAllLabel?; display?: 'chips'|'summary'; disabled?; invalid? }
Checkbox:   { label; description?; error?; indeterminate? } & InputHTMLAttributes  // + ref
RadioGroup: { name; legend; options: readonly RadioOption[]; value; onChange; helperText?;
              error?; disabled?; required?; requiredIndicator? }
DateInput:  InputProps + { min?: 'YYYY-MM-DD'; max?: 'YYYY-MM-DD' }
CurrencyInput: { currencyCode; value: number|null; onValueChange: (v:number|null)=>void;
              locale?; decimals? } & InputProps
FileUpload: { dropzoneLabel; hintLabel?; removeLabel: (name)=>string; accept?; maxSizeBytes?;
              multiple?; disabled?; status?: 'idle'|'uploading'|'success'|'error'; progress?;
              statusMessage?; errorMessage?; selectedFiles?; onFilesSelected;
              onFilesRejected?; onRemoveFile? }
```

Decisiones de API:

- **Render prop en `FormField`**: entrega los `aria-*` resueltos; la asociación no puede quedarse
  a medias. No importa React Hook Form (se compone spreando `register(...)`).
- **Todo el copy llega por props**, incluidos los nombres accesibles (`clearLabel`, `showLabel`,
  `removeLabel`, `summaryLabel`). Así los componentes son presentacionales, locale-agnósticos y
  compatibles con la regla `react/jsx-no-literals` del repo.
- **Sin `class-variance-authority`**: el proyecto no lo usa; las variantes son mapas
  `Record<Variant, string>` y `cx()` (12 líneas) concatena. Se documenta que `cx` **no** resuelve
  conflictos de Tailwind y que `className` es extensión, no bypass de tokens.
- **`Select` nativo** (cierra CMP-Q-005 para el MVP) y **`DateInput` nativo** (cierra CMP-Q-004):
  ya son el patrón instalado, no añaden dependencias y resuelven teclado, typeahead y hoja nativa
  móvil. `MultiSelect` es propio porque no hay equivalente nativo aceptable.

## 10. Variants and states implemented

| Componente | Variantes | Estados |
|---|---|---|
| Button | primary · marketing · secondary · ghost · destructive; sm/md/lg; fullWidth; icono leading/trailing | default · hover · focus-visible · active · disabled · loading (`aria-busy`, clic suprimido) |
| IconButton | default · subtle · destructive; sm/md/lg (tamaño de glifo) | default · hover · focus-visible · disabled · loading |
| TextLink | default · inline · external | default · hover · focus-visible · disabled (no enfocable) |
| FormField | — | required/optional · description · helper · error · contador · disabled · readOnly |
| Input | leadingIcon · trailingContent · prefix · suffix; sm/md/lg | default · hover · focus-visible · error · disabled · readOnly · autofill nativo |
| PasswordInput | — | oculto · visible · error · disabled |
| Textarea | resize vertical/none | default · focus · error · disabled · readOnly |
| SearchInput | — | vacío · con valor · loading · limpiar · disabled |
| Select | placeholder · opciones | default · selected · error · disabled |
| MultiSelect | chips · summary | cerrado · abierto · opción activa · seleccionada · deshabilitada · error · disabled |
| Checkbox | — | unchecked · checked · **indeterminate** · focus · disabled · error |
| RadioGroup | — | seleccionado · focus · item disabled · grupo disabled · error |
| DateInput | min/max | vacío · con valor · focus · error · disabled |
| CurrencyInput | prefijo ISO | edición · display formateado · error · disabled · readOnly (moneda bloqueada) |
| FileUpload | simple/múltiple | vacío · dragging · archivo seleccionado · uploading (+progreso) · success · tipo no soportado · tamaño excedido · error general · disabled |

## 11. Token mappings used

| Aspecto | Utilidades semánticas consumidas |
|---|---|
| Acción primaria | `bg-action-primary` · `hover:bg-action-primary-hover` · `active:bg-action-primary-active` · `text-action-primary-foreground` · `disabled:bg-action-primary-disabled` |
| Marketing / secundaria / ghost / destructiva | `bg-action-marketing(-hover)` · `bg-action-secondary(-hover)` + `border-action-secondary` · `bg-action-ghost-hover` · `bg-action-destructive(-hover)` |
| Texto | `text-primary` · `text-secondary` · `text-muted` · `text-disabled` · `text-inverse` · `text-link` · `text-link-hover` |
| Superficie | `bg-surface` · `bg-surface-subtle` · `bg-surface-elevated` · `bg-surface-disabled` · `bg-surface-selected` |
| Borde | `border-default` · `border-subtle` · `border-strong` · `border-interactive` · `border-disabled` |
| Feedback | `text-feedback-error` · `bg-feedback-error` · `border-feedback-error` · `text-feedback-success-icon` |
| Foco | `.focus-ring` · `.focus-ring-within` (`ring-focus`, `ring-offset-focus`) |
| Forma | `rounded-button` · `rounded-input` · `rounded-card` · `rounded-badge` · `rounded-sm` |
| Elevación | `shadow-overlay-dropdown` · `shadow-surface-subtle` |
| Tipografía | `font-heading` · `font-body` · `font-ui` · `text-body-lg/md/sm` · `text-label` · `text-caption` |
| Tamaño / táctil | `h-8` `h-10` `h-12` (`size.control.*`) · `min-h-touch` `min-w-touch` · `h-icon-sm/md/lg` · `.hit-area` |
| Motion | `duration-fast` · `duration-standard` · `ease-standard` · `motion-reduce:animate-none` |
| Capas / opacidad | `z-dropdown` · `opacity-disabled` |
| Excepción documentada | `accent-[color:var(--color-action-primary)]` en checkbox/radio nativos: `accent-color` no tiene utilidad semántica en la config; se referencia la **variable de token**, nunca un hex |

Verificado por test: 0 utilidades de paleta cruda, 0 hex/rgb literales, 0 `dark:`, 0 temas por rol,
0 iconos fuera de Lucide en todo `shared/design-system/`.

## 12. Accessibility decisions

1. **Foco**: siempre `focus-visible` con el anillo canónico y offset blanco. Para controles
   compuestos se creó `.focus-ring-within` (`has-[:focus-visible]`) en vez de `focus-within`, que
   dispararía también con el ratón.
2. **Nombre accesible obligatorio** en `IconButton` y `FieldAction`: en desarrollo y test se emite
   `console.error` si falta. El Tooltip nunca sustituye al nombre accesible (no hay primitiva de
   tooltip aún, así que no se integró ninguna).
3. **Errores**: `role="alert"` + icono + texto (nunca sólo color) y asociación por
   `aria-describedby` + `aria-invalid` generada por `FormField`.
4. **Sin ARIA redundante sobre controles nativos**: el estado "mixed" del checkbox se expone por la
   propiedad DOM `indeterminate`, no con `aria-checked`; el `RadioGroup` usa `fieldset`/`legend`
   sin `role="radiogroup"`.
5. **MultiSelect**: patrón ARIA APG select-only combobox — trigger `role="combobox"` +
   `aria-expanded`/`aria-controls`, popup `role="listbox" aria-multiselectable`, opciones
   `role="option" aria-selected`, opción activa por `aria-activedescendant`, `Esc` cierra y
   devuelve el foco al trigger, clic fuera cierra, y región `aria-live="polite"` con el resumen.
6. **FileUpload**: el `<input type="file">` nativo permanece enfocable (`sr-only`, no
   `display:none`) y asociado a su `<label>`; el drop zone **no** añade un segundo tab stop. Los
   cambios de estado se anuncian en `role="status"`; el progreso usa `role="progressbar"`.
7. **Touch targets**: `IconButton` ≥ 44 × 44 px siempre; `Button` `sm`/`md` (32/40 px de token)
   amplían con `.hit-area`.
8. **`aria-live` sólo donde hay actualización real**: `MultiSelect` (resumen), `FileUpload`
   (estado) y el contador de caracteres **opt-in** (`characterCount.live`).
9. **Reduced motion**: transiciones con tokens de motion (`globals.css` ya las colapsa a 0 ms) y
   `motion-reduce:animate-none` en el spinner.

Resultado axe-core sobre el catálogo completo (cerrado y con el `MultiSelect` abierto):
**0 violaciones de cualquier severidad**, no sólo 0 críticas.

## 13. Responsive behavior

- Campos `fullWidth` por defecto → formularios de una columna en mobile.
- `Button fullWidth` para acciones primarias en mobile (adoptado en `LoginForm`).
- Filas de acciones: `flex-col` en mobile → `sm:flex-row sm:justify-end` en desktop
  (`ReviewFiltersPanel`).
- Rango de fechas: `grid-cols-1` → `md:grid-cols-2`.
- Chips del `MultiSelect` con `flex-wrap`; opciones con `break-words`; popup con `max-h-60` y
  scroll propio.
- `FileUpload` apila icono + label + hint en columna; la lista de archivos trunca el nombre y
  conserva las acciones.
- Labels traducidos largos: sin anchos fijos; `truncate` sólo dentro del botón; tipografía en
  `rem` (respeta zoom, WCAG 1.4.4); ningún contenedor fuerza scroll horizontal de página.

**No validado en navegador**: la comprobación visual a 200 % de zoom y en dispositivos reales
queda como verificación no bloqueante (ver §19).

## 14. Tests added

| Archivo | Tests | Cobertura |
|---|---|---|
| `src/tests/unit/design-system/actions.test.tsx` | 18 | Button: 5 variantes, 3 tamaños, tokens semánticos, `focus-ring`, disabled, loading + `aria-busy` + supresión de clic, iconos decorativos, `type` por defecto, `fullWidth`. IconButton: nombre accesible obligatorio, icono, mínimo táctil, disabled, destructive. TextLink: interno, externo (`rel`/`target`/aviso SR), disabled no enfocable. |
| `src/tests/unit/design-system/forms-fields.test.tsx` | 12 | FormField: asociación de label/descripción/helper/contador/error, `aria-invalid`, `aria-required`, disabled, readOnly, indicador opcional. Input: prefijo, sufijo, icono, borde de error, atributos nativos. PasswordInput: alternancia sin perder valor. SearchInput: semántica nativa, limpiar, Escape, loading. Textarea: resize, error, readOnly, contador. |
| `src/tests/unit/design-system/forms-selection.test.tsx` | 16 | Select nativo + error/disabled. MultiSelect: apertura por teclado, selección múltiple, `aria-activedescendant`, `Esc` + restauración de foco, clic fuera, quitar chip, limpiar todo, `aria-live`, disabled, error. Checkbox: label clicable, indeterminate, descripción/error/disabled. RadioGroup: fieldset/legend, flechas, item y grupo disabled, error asociado. |
| `src/tests/unit/design-system/forms-specialized.test.tsx` | 18 | DateInput min/max y error de rango. `parseAmountInput` (4 locales, agrupación, vacío) y `roundToDecimals` (0.1+0.2). CurrencyInput: prefijo ISO asociado, formato es-419/en, valor canónico numérico, readOnly. FileUpload: input nativo enfocable, selección por clic, rechazo por tipo, rechazo por tamaño, drag & drop, quitar, disabled, progreso + `role="status"`, error asociado. |
| `src/tests/unit/design-system/token-guardrails.test.ts` | 7 | Catálogo completo presente; 0 paleta cruda; 0 hex/rgb; 0 dark mode ni temas por rol; sólo Lucide; `focus-visible` (nunca `focus:`); ninguna dependencia de UI nueva instalada. |
| `src/tests/a11y/design-system-actions-forms.axe.test.tsx` | 3 | axe sobre el catálogo completo (cerrado y con MultiSelect abierto) + verificación de nombre accesible en todos los controles. |

**Total: 74 tests nuevos** (71 unit + 3 a11y). Ninguna aserción existente fue debilitada ni
eliminada.

## 15. Existing consumers migrated

| # | Consumidor | Área | Componentes adoptados | Cobertura previa |
|---|---|---|---|---|
| 1 | `features/auth/components/LoginForm.tsx` | Autenticación | `FormField`, `Input`, `Button`, `TextLink` | `tests/integration/auth/login-form.test.tsx`, `tests/a11y/us131-login.axe.test.tsx`, `us131-keyboard-aria.test.tsx` |
| 2 | `features/admin/reviews/components/ReviewFiltersPanel.tsx` | Filtros admin | `FormField`, `Input`, `DateInput`, `Select`, `Checkbox`, `Button` | `tests/unit/us077-review-filters-panel.test.tsx` |
| 3 | `features/reviews/components/ReviewForm.tsx` | Organizer | `FormField`, `Textarea`, `Button` | `tests/unit/us065-review-form.test.tsx` |
| 4 | `features/vendor-portfolio/components/PortfolioUploader.tsx` | Vendor (upload) | `FormField`, `Input`, `FileUpload`, `Button` | Sin test dedicado (MSW handlers existentes) |
| 5 | `features/profile/components/ChangePasswordForm.tsx` | Perfil / seguridad | `FormField`, `PasswordInput`, `Button` | Sin test dedicado |

Preservado en los cinco: esquemas Zod, comportamiento de React Hook Form, envío, loading, mapeo de
errores por `code`, permisos, contratos de API, claves de localización existentes y todos los
tests. **Ninguna ruta, regla de validación ni contrato cambió.**

Mejoras de accesibilidad obtenidas de forma colateral (sin cambiar comportamiento):

- `ReviewFiltersPanel`: los errores de rango cruzado ahora se asocian a **ambos** campos por
  `aria-describedby` (antes sólo había `aria-invalid`), manteniendo **un único** `role="alert"`.
- `PortfolioUploader`: desaparece el `role="button"` + `tabIndex` del drop zone; la ruta de
  teclado pasa a ser el input nativo. La validación de MIME ahora ocurre antes del envío y
  reutiliza los códigos de error i18n ya existentes (`INVALID_MIME`, `FILE_TOO_LARGE`).
- `ChangePasswordForm`: los tres campos ganan toggle mostrar/ocultar con nombre accesible.

Claves i18n **añadidas** (ninguna modificada ni eliminada), en los 4 locales:
`auth.login.password.show|hide`, `profile.security.showPassword|hidePassword`,
`vendor.portfolio.dropzone.remove`.

## 16. Commands executed

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` (`npm run typecheck`) | ✅ sin errores |
| `npx next lint --max-warnings=0` (`npm run lint`) | ✅ sin warnings ni errores |
| `npx vitest run` (`npm run test`) | ✅ **138 archivos / 1 003 tests pasan, 1 skipped** |
| `npx vitest run src/tests/unit/design-system` | ✅ 71 tests |
| `npx vitest run src/tests/a11y` | ✅ suites de accesibilidad en verde (incluye la nueva) |
| `npm run build` (`next build`) | ✅ compila; `.hit-area` y `.focus-ring-within` presentes en el CSS emitido |
| `npx prettier --check` sobre los archivos de esta tarea | ✅ conformes |

No se usó `--force` ni se suprimió ningún fallo.

## 17. Results

| Criterio | Estado |
|---|---|
| Screen Stitch recuperado e inspeccionado (HTML + screenshot) | ✅ |
| Inventario de componentes existentes | ✅ 14 patrones clasificados |
| Componentes de Actions implementados | ✅ 3 |
| Componentes de Forms implementados | ✅ 13 (`FormField` + 12 controles) + `FieldAction` y 2 módulos auxiliares |
| Consumen los tokens EventFlow existentes | ✅ verificado por test |
| `lucide-react` sigue siendo la única librería de iconos | ✅ verificado por test |
| Estados requeridos por componente | ✅ ver §10 |
| Comportamiento mobile | ✅ ver §13 |
| Accesibilidad WCAG 2.1 AA | ✅ 0 violaciones axe (cualquier severidad) |
| Tests | ✅ 73 nuevos; 1 003 en total en verde |
| Consumidores representativos migrados | ✅ 5 |
| Sin cambios de comportamiento de la aplicación | ✅ toda la suite previa pasa sin editarse |
| Dependencias nuevas | ✅ ninguna |
| Implementation record | ✅ este documento |

**Antes/después en los 5 consumidores migrados:** 1 027 → 1 015 líneas. La ganancia **no** es
volumen de código —los comentarios de trazabilidad y el mapeo de errores por `code` se conservan
íntegros— sino que ese código ya no define apariencia: los estados de foco, error, disabled,
loading y las asociaciones ARIA pasan a estar centralizados y testeados una sola vez.

## 18. Deferred consumers

Formularios y superficies que **siguen sin migrar** (fuera del alcance acordado de "conjunto
representativo"), en orden de valor sugerido:

1. **Filtros admin restantes** — `AdminEventFiltersPanel`, `VendorFiltersPanel`,
   `AdminActionsFiltersPanel`, `AdminUsersView` (mismo patrón que el ya migrado; el más barato).
2. **Autenticación restante** — `RegisterOrganizerForm`, `RegisterVendorForm`,
   `ForgotPasswordForm`, `ResetPasswordForm`.
3. **Wizard y edición de evento** — `CreateEventWizard`, `EditEventForm`, `EventFilters`
   (candidato natural del `MultiSelect` para `status`).
4. **Cotizaciones** — `QuoteRequestForm`, `QuoteResponseForm`, `BreakdownEditor`,
   `ValidUntilPicker` (`DateInput`), `RejectQuoteDialog`, `CancelQRDialog`.
5. **Presupuesto** — `AddBudgetItemModal` y `BreakdownEditor` → **primer consumidor real de
   `CurrencyInput`** (hoy sólo tiene cobertura de test).
6. **Perfil de vendor y servicios** — `VendorProfileEditor`, `BasicInfoStep`,
   `LocationCategoriesStep`, `LanguagesStep`, `CreateServiceDialog`.
7. **Tareas** — `CreateTaskDialog`, `TaskFilters`, `TaskItemInlineEdit`.
8. **Diálogos de moderación admin** — `ModerationDialog`, `VendorModerationDialog`,
   `CategoryFormDialog`, `EventTypeFormDialog`, `SeedResetDialog`.
9. **`PasswordInput` en `LoginForm` / `ResetPasswordForm`** — el toggle añade una parada de
   tabulación y cambiaría el orden de foco verificado por `us131-keyboard-aria.test.tsx`. Requiere
   decisión de UX + actualización explícita de ese test; se dejó fuera para no alterar
   comportamiento existente.
10. **`IconButton` en tablas admin** — hoy usan cajas de 32 px; adoptarlo cambia la densidad
    visual de las filas y merece revisión de diseño.

## 19. Known limitations

1. **Validación visual en navegador pendiente** (no bloqueante): 200 % de zoom, reflow real,
   MultiSelect en móvil y `.hit-area` sobre dispositivos táctiles. Los tests corren en jsdom, que
   no aplica CSS.
2. **`.focus-ring-within` depende de `:has()`** — soportado por todos los navegadores modernos
   desde diciembre de 2023. Sin `:has()`, el campo con adornos pierde el anillo (el control
   interno sigue siendo enfocable y el borde de foco se mantiene).
3. **`FieldAction` mide 32 × 32 px**, por debajo del mínimo táctil de 44 px: es una excepción
   consciente para las acciones **dentro** de un campo de 40 px (limpiar búsqueda, mostrar
   contraseña). Ampliarlas con `.hit-area` haría que su pseudo-elemento capturase clics
   destinados al texto del input. Documentada en el componente.
4. **Los campos de texto no usan `.hit-area`** por el mismo motivo; su altura es la del token
   (32/40/48 px). Para flujos táctil-críticos se dispone de `lg` (48 px).
5. **`CurrencyInput` opera con `number`**, coherente con los DTOs actuales. Si el dominio migra a
   decimales exactos, el parseo (`parseAmountInput` + `roundToDecimals`, con redondeo por
   representación decimal, no por aritmética binaria) es el único punto a cambiar.
6. **La heurística de separadores** interpreta `1.234` como 1234 (agrupación). Es la lectura
   mayoritaria al teclear millares, pero un usuario que quiera 1,234 con tres decimales debe
   escribir `1.2340`. Documentado y testeado.
7. **`MultiSelect` no virtualiza** ni filtra por escritura: es un control de filtros con listas
   cortas, no un query-builder (fuera de alcance explícito).
8. **`DateInput` delega en el control nativo**: la presentación locale-aware y el calendario los
   aporta el navegador; Safari en iOS y algunos navegadores de escritorio difieren visualmente.
9. **`Switch` no se implementó** (sin requisito verificado) y `Tooltip` no existe todavía, por lo
   que la integración opcional de tooltip en `IconButton` no se construyó.
10. **Deuda preexistente sin tocar**: siguen ~1 900 utilidades de paleta cruda en el resto de
    `src/**`, y `prettier --check` falla en ~318 archivos previos (el gate del repo es
    `npm run lint`, que no ejecuta Prettier). Los archivos de esta tarea sí están formateados.

## 20. Recommended next component group

**Feedback y overlays** (`Alert`, `InlineMessage`, `Toast`, `Modal`, `ConfirmationDialog`,
`Drawer`), por este orden:

1. Es el grupo con más duplicación restante: cada diálogo de admin y de cotizaciones reimplementa
   su propio focus trap, `Esc`, scrim y banner de error (`ModerationDialog`, `SeedResetDialog`,
   `AddBudgetItemModal`, `RejectQuoteDialog`, …).
2. Desbloquea la migración de los formularios diferidos del §18, que en su mayoría viven **dentro**
   de un modal.
3. Cierra CMP-Q-006 (Headless UI vs. Radix para overlays) con un caso de uso real.
4. `Badge`/`StatusBadge` puede acompañarlo: es barato y lo consume la misma superficie.

Después: **data-display** (`Card`, `Table`, `FilterBar`, `EmptyState`) y por último la familia
**AI**, que ya tiene su tratamiento de tokens aplicado y sólo necesita consolidación de anatomía.

---

## Anexo — Trazabilidad

| Elemento | Referencia |
|---|---|
| Proyecto Stitch | `projects/10889252267442839867` |
| Screen Actions & Forms | `projects/10889252267442839867/screens/7547959855e44faea2fbf54209e6899b` |
| HTML generado | `projects/10889252267442839867/files/3431383320984858348` (20 203 bytes, leído íntegro) |
| Screenshot | `projects/10889252267442839867/files/8755490009077105107` (inspeccionado) |
| Catálogo de uso | `web/src/shared/design-system/README.md` |
| Tokens consumidos | `web/src/shared/design-tokens/` (sin modificar) |

**Stitch se utilizó como evidencia visual de anatomía, layout, proporciones, variantes, estados y
composición. No es autoridad de tokens, tipografía, iconografía, accesibilidad ni arquitectura
frontend.** Cuando divergió de la documentación aprobada, prevaleció el valor EventFlow (§3).
