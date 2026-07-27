import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Los imports estáticos de imagen (`import foto from './foto.jpg'`) los procesa el loader de
 * Next, que devuelve un `StaticImageData` con `src`, `width`, `height` y `blurDataURL`. Vite no
 * hace eso: entrega la ruta como string, y `next/image` con `placeholder="blur"` falla pidiendo
 * el `blurDataURL` que falta.
 *
 * Este plugin reproduce la forma del objeto en test. No es un sistema de assets paralelo: es el
 * equivalente de test del loader que ya existe en el build, igual que `jsdom` lo es del navegador.
 * Las dimensiones son un valor fijo cualquiera — ningún test afirma nada sobre ellas; lo que sí
 * se ejercita es que el componente reciba la misma forma de dato que en producción.
 */
function staticImageStub(): Plugin {
  const IMAGE = /\.(?:jpe?g|png|webp|avif|gif)$/;
  return {
    name: 'eventflow:static-image-stub',
    enforce: 'pre',
    load(id) {
      const [path] = id.split('?');
      if (!path || !IMAGE.test(path)) return null;
      const data = {
        src: `/_next/static/media/${basename(path)}`,
        height: 1600,
        width: 1200,
        blurDataURL: `data:image/png;base64,${Buffer.from(basename(path)).toString('base64')}`,
        blurWidth: 8,
        blurHeight: 11,
      };
      return `export default ${JSON.stringify(data)};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), staticImageStub()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Vitest corre unit/integration/contract/a11y (`*.test.ts(x)`). El E2E Playwright usa
    // `*.spec.ts`. US-131 (PB-P2-019) suma `src/tests/a11y/**` — auditorías axe-core + tests de
    // teclado/foco/ARIA/contraste; el gate bloquea el merge ante violaciones críticas.
    include: ['src/tests/{unit,integration,contract,a11y}/**/*.test.{ts,tsx}'],
    // Base URL absoluta para que el httpClient construya URLs que MSW (`*/api/v1/*`) intercepta.
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
