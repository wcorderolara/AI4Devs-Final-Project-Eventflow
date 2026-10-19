/**
 * Navegación completa del navegador (no soft-navigation de Next). Para salidas de sesión: descarta
 * el Router Cache, los layouts ya renderizados y el estado en memoria de una sola vez. Módulo propio
 * para poder sustituirlo en tests (jsdom no implementa la navegación).
 */
export function hardRedirect(path: string): void {
  window.location.replace(path);
}
