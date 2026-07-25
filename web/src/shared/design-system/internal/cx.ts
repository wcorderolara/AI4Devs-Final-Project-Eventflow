/**
 * Concatenador mínimo de clases para el design system.
 *
 * No se instala `clsx` ni `class-variance-authority`: el sistema de variantes de EventFlow es
 * cerrado (mapas `Record<Variant, string>` en cada componente) y no necesita una librería.
 *
 * IMPORTANTE: no resuelve conflictos de Tailwind (no es `tailwind-merge`). El `className` del
 * consumidor se concatena al final, pero la utilidad ganadora la decide el orden de la hoja de
 * estilos, no el orden de las clases. Preferir siempre las props de variante/tamaño sobre
 * `className` para cambiar apariencia (ver `README.md` §API).
 */
export function cx(...parts: ReadonlyArray<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
