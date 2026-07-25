/**
 * Utilidades de accesibilidad compartidas por los componentes del design system.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §37 (matriz WCAG 2.1 AA).
 */

/** Une los ids de `aria-describedby`, descartando los ausentes. `undefined` si no hay ninguno. */
export function describedBy(
  ...ids: ReadonlyArray<string | false | null | undefined>
): string | undefined {
  const list = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  return list.length > 0 ? list.join(' ') : undefined;
}

/** Normaliza el `aria-invalid` de React (`boolean | 'true' | 'false' | …`) a booleano. */
export function isAriaInvalid(value: unknown): boolean {
  return value === true || value === 'true';
}

/**
 * Aviso de desarrollo cuando un control icon-only se monta sin nombre accesible
 * (Component Foundations §11 `IconButton`: `aria-label` o `aria-labelledby` obligatorio).
 * Silencioso en producción; en test y desarrollo emite `console.error` para que sea detectable.
 */
export function warnMissingAccessibleName(component: string): void {
  if (process.env.NODE_ENV === 'production') return;
  // eslint-disable-next-line no-console
  console.error(
    `[EventFlow design-system] ${component}: falta nombre accesible. ` +
      'Un control icon-only requiere `aria-label` o `aria-labelledby` (WCAG 2.1 AA 4.1.2). ' +
      'El Tooltip no sustituye al nombre accesible.',
  );
}
