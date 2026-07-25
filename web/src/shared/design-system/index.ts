/**
 * EventFlow — design system (componentes compartidos).
 *
 * Capa que consume `shared/design-tokens`. Ver `README.md` para el catálogo de uso.
 * Los barriles sólo re-exportan hacia arriba (`forms`/`actions`/`navigation`/`feedback` no se
 * importan entre sí a través de este archivo) para no introducir ciclos; cuando un componente
 * necesita otro de un grupo distinto lo importa por su ruta de archivo.
 */
export * from './actions';
export * from './forms';
export * from './navigation';
export * from './feedback';
