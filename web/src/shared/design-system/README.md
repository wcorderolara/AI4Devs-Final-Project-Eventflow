# EventFlow — Design system (Actions & Forms · Navigation & Feedback)

Componentes compartidos que consumen la capa de tokens de `src/shared/design-tokens`.
Reutilizables por las áreas `organizer`, `vendor` y `admin` **sin temas por rol** (UI-DEC-009).

---

## 1. Autoridad

1. `docs/ux-ui/EventFlow-UI-Foundations.md`
2. `docs/ux-ui/EventFlow-Design-Tokens.md`
3. `docs/ux-ui/EventFlow-Component-Foundations.md` — anatomía, variantes, estados y a11y
4. `src/shared/design-tokens/` — valores implementados
5. Convenciones del frontend existente
6. Pantallas Stitch _Actions & Forms_ y _Navigation & Feedback_ (desktop y móvil) —
   **evidencia visual únicamente**

Los valores generados por Stitch (`primary: #683ec9`, `background: #fdf7ff`, semánticos
`#10B981/#F59E0B/#EF4444/#3B82F6`, Material Symbols, Font Awesome, `darkMode: "class"`) **no son
autoridad** y no se propagan.

## 2. Reglas del catálogo

- **Sólo tokens semánticos.** Prohibidas las utilidades de paleta cruda (`bg-purple-600`,
  `text-neutral-800`, `border-blue-500`). Testeado en `tests/unit/design-system/`.
- **`lucide-react` es la única librería de iconos.**
- **Light theme.** Sin `dark:`, sin `[data-theme]`, sin `prefers-color-scheme`.
- **Sin copy dentro de los componentes.** Todo texto —incluidos los nombres accesibles— llega por
  props desde `next-intl`. Esto mantiene los componentes presentacionales y compatibles con
  `es-LATAM`, `es-ES`, `pt` y `en`.
- **Sin lógica de negocio.** Nada de DTOs, permisos, reglas de moneda ni llamadas de red.
- **`className` es una extensión, no un bypass.** No resuelve conflictos de Tailwind
  (`cx` sólo concatena): para cambiar apariencia, usar las props de variante/tamaño.

## 3. Estructura

```text
shared/design-system/
├── actions/     Button · IconButton · TextLink
├── forms/       FormField · Input · PasswordInput · Textarea · SearchInput · Select ·
│                MultiSelect · Checkbox · RadioGroup · DateInput · CurrencyInput · FileUpload
│                (+ FieldAction, fieldStyles, currencyParsing)
├── navigation/  AppShell · AppSidebar · SidebarSection · SidebarItem · TopBar ·
│                MobileNavigationTrigger · MobileNavigationDrawer · UserMenu ·
│                LanguageSelector · NotificationButton · NotificationBadge · Breadcrumb ·
│                FilterBar · AppliedFilterChip (+ navigationModel)
├── feedback/    Badge · StatusBadge · Alert · InlineMessage · Toast · EmptyState ·
│                ErrorState · PermissionDeniedState · Spinner · Skeleton · ProgressIndicator
└── internal/    cx · a11y · Spinner (glifo)
```

Importar siempre desde el barril: `import { Button, FormField } from '@/shared/design-system';`.

### Navegación: un solo modelo para desktop y mobile

`AppSidebar` y `MobileNavigationDrawer` consumen la misma estructura `NavigationSection[]`, ya
resuelta (label traducido + ruta activa). El adaptador entre el modelo de la aplicación
(`shared/navigation/navItems.ts`) y este modelo presentacional es
`shared/navigation/useNavigationSections`. **No** existe una segunda definición de navegación, y
el design system no conoce rutas, roles ni permisos.

```tsx
<AppShell
  skipLink={<SkipLink />}
  topBar={<Topbar onMenuOpen={open} isMenuOpen={isOpen} drawerId="app-mobile-nav" />}
  sidebar={<Sidebar items={ORGANIZER_NAV_ITEMS} ariaLabel={t('sidebar.organizer.label')} />}
  drawer={<MobileNav items={ORGANIZER_NAV_ITEMS} isOpen={isOpen} onClose={close} … />}
  mainClassName="p-6"
>
  {children}
</AppShell>
```

### Feedback: el color nunca es la única señal

`StatusBadge`, `Alert`, `InlineMessage` y `Toast` exigen texto visible y añaden un glifo por tono.
Las regiones vivas (`role="alert"` / `role="status"`) son **opt-in** (`live`): sólo cuando el
mensaje aparece dinámicamente. Un error crítico debe seguir visible en la página aunque el toast
desaparezca (CMP-DEC-022).

---

## 4. Ejemplos de uso

Todos los ejemplos son genéricos de EventFlow. `t` es `useTranslations(...)` de `next-intl`.

### Button

```tsx
<Button onClick={onSave}>{t('actions.save')}</Button>                     {/* primary */}
<Button variant="secondary" onClick={onCancel}>{t('actions.cancel')}</Button>
<Button variant="ghost" size="sm">{t('actions.skip')}</Button>
<Button variant="marketing" size="lg">{t('landing.cta')}</Button>          {/* CTA oscura */}
<Button variant="destructive" leadingIcon={<Trash2 />}>
  {t('actions.deleteDraft')}
</Button>

{/* Loading: bloquea la acción, marca aria-busy y no desplaza el layout */}
<Button type="submit" isLoading={mutation.isPending} loadingLabel={t('actions.saving')}>
  {t('actions.save')}
</Button>

{/* Mobile: acción primaria a ancho completo */}
<Button fullWidth>{t('actions.continue')}</Button>
```

### IconButton

```tsx
{/* `aria-label` es obligatorio: en desarrollo y test se emite un error si falta. */}
<IconButton icon={<Plus />} aria-label={t('tasks.addAria')} />
<IconButton icon={<Trash2 />} aria-label={t('tasks.deleteAria')} variant="destructive" />
```

### TextLink

```tsx
<TextLink href="/organizer/events">{t('nav.events')}</TextLink>
<TextLink href="/help" variant="inline">{t('help.link')}</TextLink>
<TextLink href="https://example.org" external externalHintLabel={t('common.opensInNewTab')}>
  {t('help.externalGuide')}
</TextLink>
```

### FormField + Input

```tsx
<FormField
  label={t('event.nameLabel')}
  required
  requiredIndicator="*"
  helperText={t('event.nameHelp')}
  characterCount={{ current: name.length, max: 80 }}
>
  {(field) => <Input {...field} {...register('name')} />}
</FormField>;

{
  /* Con error: activa aria-invalid y asocia el mensaje por aria-describedby */
}
<FormField label={t('auth.emailLabel')} error={errors.email && t(errors.email.message)}>
  {(field) => <Input {...field} type="email" autoComplete="email" {...register('email')} />}
</FormField>;

{
  /* Con adornos */
}
<FormField label={t('quote.guestsLabel')}>
  {(field) => <Input {...field} type="number" suffix={t('quote.guestsUnit')} />}
</FormField>;
```

`FormField` usa **render prop**: entrega `id`, `aria-describedby`, `aria-invalid`,
`aria-required`, `disabled` y `readOnly` ya resueltos. Se compone con React Hook Form
spreadando `register(...)` **después** de `{...field}`; `FormField` no importa RHF.

### PasswordInput

```tsx
<FormField label={t('security.newPassword')} helperText={t('security.passwordHint')}>
  {(field) => (
    <PasswordInput
      {...field}
      autoComplete="new-password"
      showLabel={t('security.showPassword')}
      hideLabel={t('security.hidePassword')}
      {...register('newPassword')}
    />
  )}
</FormField>
```

Añade una parada de tabulación (el toggle). Al adoptarlo en un formulario existente, revisar los
tests de orden de foco.

### SearchInput

```tsx
<FormField label={t('directory.searchLabel')}>
  {(field) => (
    <SearchInput
      {...field}
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onClear={() => setQuery('')}
      clearLabel={t('directory.clearSearch')}
      loading={isFetching}
    />
  )}
</FormField>
```

`clearOnEscape` está desactivado por defecto: dentro de un modal o un drawer, `Esc` pertenece al
overlay.

### Select

```tsx
<FormField label={t('events.filters.status')}>
  {(field) => (
    <Select
      {...field}
      value={status ?? ''}
      onChange={(event) => setStatus(event.target.value || undefined)}
      placeholder={t('events.filters.allStatuses')}
      options={EVENT_STATUSES.map((value) => ({ value, label: t(`events.status.${value}`) }))}
    />
  )}
</FormField>
```

### MultiSelect

El componente es genérico: **las opciones son datos del feature**.

```tsx
const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: t('events.status.draft') }, // Borrador
  { value: 'active', label: t('events.status.active') }, // Activo
  { value: 'completed', label: t('events.status.completed') }, // Completado
  { value: 'cancelled', label: t('events.status.cancelled') }, // Cancelado
];

<FormField label={t('events.filters.statuses')}>
  {(field) => (
    <MultiSelect
      {...field}
      options={EVENT_STATUS_OPTIONS}
      value={statuses}
      onChange={setStatuses}
      placeholder={t('events.filters.allStatuses')}
      summaryLabel={(count) => t('events.filters.selectedCount', { count })}
      removeOptionLabel={(label) => t('events.filters.removeStatus', { label })}
      clearAllLabel={t('events.filters.clearAll')}
    />
  )}
</FormField>;
```

Teclado: `↓`/`Enter` abre · `↑`/`↓`/`Home`/`End` navegan · `Enter`/`Espacio` alternan ·
`Esc` cierra y devuelve el foco al trigger · clic fuera cierra.

### Checkbox y RadioGroup

```tsx
<Checkbox
  label={t('terms.accept')}
  description={t('terms.scope')}
  checked={accepted}
  onChange={(event) => setAccepted(event.target.checked)}
  error={showError ? t('terms.required') : undefined}
/>

{/* Estado mixto de un grupo padre */}
<Checkbox label={t('filters.allStatuses')} indeterminate={someSelected} />

<RadioGroup
  name="event-status"
  legend={t('events.statusLegend')}
  value={status}
  onChange={setStatus}
  helperText={t('events.statusHelp')}
  options={[
    { value: 'draft', label: t('events.status.draft') },
    { value: 'active', label: t('events.status.active') },
  ]}
/>
```

### DateInput

```tsx
<FormField label={t('events.dateLabel')} helperText={t('events.dateHelp')}>
  {(field) => <DateInput {...field} min={todayIso} max={maxIso} {...register('eventDate')} />}
</FormField>
```

Para un rango, se usan dos `DateInput` y **un solo** mensaje de error cruzado asociado a ambos
por `aria-describedby` (patrón implementado en `ReviewFiltersPanel`).

### CurrencyInput

```tsx
{
  /* La moneda del evento es inmutable (BR-EVENT-007): el código ISO es un prefijo, no un selector. */
}
<FormField label={t('budget.plannedLabel')} helperText={t('budget.noConversionHelp')}>
  {(field) => (
    <CurrencyInput
      {...field}
      currencyCode={event.currencyCode} /* GTQ, USD, … */
      locale={activeLocale}
      value={amountPlanned}
      onValueChange={setAmountPlanned} /* siempre numérico: nunca la cadena formateada */
    />
  )}
</FormField>;
```

Acepta `1.234,56` y `1,234.56`; formatea al perder el foco. **Nunca convierte** moneda
(BR-BUDGET-007).

### FileUpload

```tsx
<FileUpload
  dropzoneLabel={selectedFile?.name ?? t('portfolio.dropzone.placeholder')}
  hintLabel={t('portfolio.dropzone.helper')}
  removeLabel={(name) => t('portfolio.dropzone.remove', { name })}
  accept="image/jpeg,image/png,image/webp" /* los límites los aporta el feature */
  maxSizeBytes={5 * 1024 * 1024}
  status={isPending ? 'uploading' : error ? 'error' : 'idle'}
  statusMessage={isPending ? t('portfolio.actions.uploading') : undefined}
  errorMessage={error ? t(`portfolio.errors.${error}`) : undefined}
  selectedFiles={selectedFile ? [{ name: selectedFile.name, size: selectedFile.size }] : []}
  onFilesSelected={(files) => setSelectedFile(files[0] ?? null)}
  onFilesRejected={(rejections) =>
    setError(rejections[0]?.reason === 'size' ? 'FILE_TOO_LARGE' : 'INVALID_MIME')
  }
  onRemoveFile={() => setSelectedFile(null)}
/>
```

Es presentacional: **no sube nada**. La red, el progreso real y el mapeo de errores del backend
pertenecen al feature.

### AppSidebar · SidebarSection · SidebarItem

```tsx
// El modelo llega ya resuelto (label traducido + `active`); el design system no traduce ni
// consulta el pathname.
<AppSidebar
  ariaLabel={t('sidebar.admin.label')}
  sections={sections}
  header={<Badge variant="role">{t('workspace.admin')}</Badge>}
/>
```

`SidebarItem` marca la ruta con `aria-current="page"` y **no** se apoya sólo en el color: añade
peso tipográfico y una barra de acento. El badge de contador aporta su propio nombre accesible.

### MobileNavigationDrawer + MobileNavigationTrigger

```tsx
<MobileNavigationTrigger
  label={t('topbar.menuOpen')}
  isOpen={isOpen}
  onOpen={open}
  controls="app-mobile-nav"
/>
<MobileNavigationDrawer
  open={isOpen}
  onClose={close}
  ariaLabel={t('sidebar.organizer.label')}
  title={t('mobile.title')}
  closeLabel={t('mobile.close')}
  sections={sections}
  panelId="app-mobile-nav"
  footer={<UserAccountBlock />}
/>
```

Focus trap, `Escape`, clic fuera, retorno de foco al trigger y bloqueo del scroll del body los
aporta el `Dialog` de Headless UI ya instalado. **No** es la sidebar encogida: es un panel propio
con objetivos táctiles de 44 px y zona de cuenta al pie.

### TopBar · UserMenu · LanguageSelector · NotificationButton

```tsx
<TopBar
  menuTrigger={<MobileNavigationTrigger … />}
  brand={<Logo size="sm" />}
  title={pageTitle}
  breadcrumb={<Breadcrumb ariaLabel={t('breadcrumb.label')} items={crumbs} />}
  actions={
    <>
      <NotificationButton label={t('notifications.aria', { count })} count={count} />
      <LanguageSelector label={t('languageSelector.label')} value={locale} options={locales} onChange={switchLocale} />
      <UserMenu triggerLabel={t('userMenu.label')} name={name} email={email} roleLabel={role} items={items} />
    </>
  }
/>
```

`NotificationButton` recibe el **nombre accesible completo** ya interpolado: el plural lo resuelve
`next-intl`, no el componente. `UserMenu` no inventa rutas — sólo pinta los `items` recibidos.

### FilterBar + AppliedFilterChip

```tsx
<FilterBar
  ariaLabel={t('filters.formAriaLabel')}
  search={<SearchInput … />}
  applyLabel={t('filters.apply')}
  onClear={reset}
  clearLabel={t('filters.reset')}
  appliedLabel={t('filters.appliedFilters')}
  appliedFilters={chips}
  onSubmit={submit}
>
  {/* Controles específicos del dominio, compuestos con Actions & Forms */}
</FilterBar>
```

`collapsible` + `toggleLabel` colapsan los controles tras un disclosure por debajo de `lg`
manteniendo visibles la búsqueda, los chips y las acciones.

### Alert · InlineMessage · Toast

```tsx
<Alert variant="warning" title={t('budget.overTitle')} live>
  {t('budget.overBody')}
</Alert>

<InlineMessage tone="error" live id={errorId}>{t('filters.errorRange')}</InlineMessage>

<Toast variant="success" onDismiss={dismiss} dismissLabel={t('common.close')}>
  {t('events.published')}
</Toast>
```

`live` es opt-in: sin él no se crea región viva (evita anuncios en el render inicial). En `error`
se usa `role="alert"`; en el resto, `role="status"`.

### EmptyState · ErrorState · PermissionDeniedState

```tsx
<EmptyState
  icon={<CalendarX />}
  title={t('events.empty.title')}
  description={t('events.empty.body')}
  primaryAction={<Button onClick={create}>{t('events.empty.cta')}</Button>}
/>

<ErrorState
  title={t('errors.loadTitle')}
  description={t('errors.loadBody')}
  onRetry={refetch}
  retryLabel={t('common.retry')}
  correlationId={correlationId}
  correlationLabel={t('errors.reference')}
/>

<PermissionDeniedState
  title={t('errors.forbidden.title')}
  description={t('errors.forbidden.body')}
  action={<TextLink href="/">{t('errors.forbidden.cta')}</TextLink>}
/>
```

`ErrorState` sólo acepta texto ya preparado por el feature: por diseño no hay forma de filtrar un
stack trace, la respuesta cruda de la API ni el error del proveedor de IA.

### Spinner · Skeleton · ProgressIndicator

```tsx
<Spinner size="sm" label={t('common.loading')} inline />
<Skeleton variant="tableRow" count={5} />
<ProgressIndicator label={t('checklist.progress.label')} value={percentage} valueText={formatted} />
<ProgressIndicator label={t('ai.generating')} />   {/* indeterminado: sin porcentaje inventado */}
```

`Skeleton` va siempre `aria-hidden`: el estado de carga lo comunica la región contenedora.

---

## 5. Accesibilidad (contrato)

| Requisito           | Cómo se cumple                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Foco visible        | `.focus-ring` / `.focus-ring-within` (`focus-visible`, offset blanco)                    |
| Nombre accesible    | Label visible vía `FormField`; `aria-label` obligatorio en `IconButton`/`FieldAction`    |
| Error asociado      | `aria-describedby` + `aria-invalid` generados por `FormField`                            |
| Estado ≠ sólo color | Los errores llevan icono + texto                                                         |
| Touch target        | `IconButton` ≥ 44 px; `Button` `sm`/`md` amplían con `.hit-area`                         |
| Teclado             | Controles nativos donde existen; `MultiSelect` implementa el patrón listbox de ARIA APG  |
| Anuncios            | `role="alert"` en errores; `role="status"` en `FileUpload`; `aria-live` en `MultiSelect` |
| Reduced motion      | Transiciones con tokens de motion; el spinner usa `motion-reduce:animate-none`           |
| Landmarks           | `AppShell` monta un único `<main>`; `AppSidebar` y el drawer, `<nav>` con nombre         |
| Ruta activa         | `aria-current="page"` + peso tipográfico + barra de acento (no sólo color)               |
| Focus trap          | Drawer y menús vía Headless UI: `Escape`, clic fuera y retorno de foco al trigger        |
| Regiones vivas      | Opt-in (`live`): sin anuncios redundantes en el render inicial                           |
| Reflow              | `AppShell` usa `overflow-x-clip`: el shell nunca provoca scroll horizontal de página     |

## 6. Qué **no** está aquí

`Switch` (sin requisito verificado), los overlays genéricos (Modal, ConfirmationDialog, Drawer,
DropdownMenu, Popover, Tooltip), `Table` / `DataTable`, `Card`, `MetricCard`, `Tabs`, `Accordion`,
`Timeline`, `NotFoundState`, `Stepper` y la familia AI.

Tampoco hay **provider ni cola de toasts**: `Toast` es el primitivo presentacional; el portal, el
apilamiento y el ciclo de vida dependen del grupo de overlays. Ver el implementation record
(`docs/ux-ui/EventFlow-Navigation-Feedback-Components-Implementation.md`) para el siguiente grupo
sugerido.
