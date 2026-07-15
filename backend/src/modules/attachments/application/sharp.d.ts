// Shim ambient para `sharp` (US-043 / PB-P1-026). Se declara sin `@types/sharp` para minimizar
// dependencias devDep — el subset que consumimos vive en `sharp-pipeline.ts` (`SharpModule`).
// El módulo real se resuelve en runtime vía `import('sharp')`. Este shim sólo permite el
// typecheck cuando `sharp` no está instalado localmente (CI corre `npm install` primero).
declare module 'sharp' {
  const sharp: unknown;
  export default sharp;
}
