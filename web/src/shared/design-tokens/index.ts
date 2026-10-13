/**
 * EventFlow — Design Tokens · punto de entrada único.
 *
 * Fuente de verdad de los valores visuales del frontend. Consumido por:
 * - `tailwind.config.ts` (importa directamente estos objetos — consumo real, no copia).
 * - `src/app/globals.css` (espeja la capa semántica como CSS custom properties; la
 *   sincronización se verifica en `src/tests/unit/design-tokens/integration.test.ts`).
 * - Componentes React que necesiten un valor en TS (p. ej. `strokeWidth` de un icono Lucide).
 *
 * Autoridad: `docs/ux-ui/EventFlow-UI-Foundations.md` → `EventFlow-Design-Tokens.md` →
 * `EventFlow-Component-Foundations.md`. Ver `README.md` para reglas de uso.
 *
 * En JSX, preferir SIEMPRE las utilidades Tailwind semánticas (`bg-action-primary`,
 * `text-primary`, `ring-focus`) sobre importar estos objetos.
 */

export * from './primitives';
export * from './semantic';
