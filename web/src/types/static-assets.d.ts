/**
 * Declaraciones de los imports estáticos de imagen (`import foto from './foto.jpg'`).
 *
 * Las aporta `next/image-types/global`, que normalmente llega vía `next-env.d.ts`. Ese archivo
 * lo **genera** Next en cada `dev`/`build` y este repositorio lo mantiene ignorado
 * (`web/.gitignore`), así que en CI —donde el typecheck corre sin haber construido antes— no
 * existe: `tsc` no conocía los módulos `*.jpg` y fallaba con TS2307, aunque en local pasara.
 *
 * Este archivo sí se versiona y sólo re-exporta la referencia: no redefine los tipos de Next ni
 * duplica lo que ya declara `next-env.d.ts` cuando está presente.
 */

/// <reference types="next/image-types/global" />

export {};
