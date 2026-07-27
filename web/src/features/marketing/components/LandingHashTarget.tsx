'use client';

import { useEffect } from 'react';

/**
 * Lleva la vista a la sección indicada por el fragmento de la URL cuando se **llega** a la
 * landing desde otra página pública (`/vendors` → `/#features`).
 *
 * Existe porque el App Router no reproduce ahí el comportamiento nativo del navegador: en una
 * navegación cliente hacia otra ruta el fragmento se escribe en la URL, pero la página se monta
 * en la parte superior y la sección de destino se queda fuera de pantalla. Desde la propia
 * landing (misma ruta, sólo cambia el hash) el navegador ya hace su trabajo y esto no interviene.
 *
 * Además del scroll mueve el **foco** a la sección. Sin eso, un usuario de teclado o de lector de
 * pantalla salta visualmente pero sigue tabulando desde el header: el salto no significa nada
 * para él (WCAG 2.4.3). `tabindex="-1"` temporal hace la sección enfocable sin meterla en el
 * orden de tabulación, y se retira al perder el foco.
 *
 * El desplazamiento hereda `scroll-behavior` del CSS, así que respeta `prefers-reduced-motion`
 * sin comprobarlo aquí; `scroll-margin-top` evita que el header sticky tape el encabezado.
 */
export function LandingHashTarget(): null {
  useEffect(() => {
    function goToHash(): void {
      const { hash } = window.location;
      if (hash.length < 2) return;

      let target: Element | null = null;
      try {
        target = document.querySelector(hash);
      } catch {
        // Un fragmento que no es un selector válido (`#123`, `#a b`) no es un destino nuestro.
        return;
      }
      if (!(target instanceof HTMLElement)) return;

      target.scrollIntoView();

      // El foco se mueve tras el scroll y con `preventScroll` para no pelearse con él.
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }

    // Un frame de margen: la sección tiene que estar en el DOM y con su altura final antes de
    // medir a dónde desplazarse.
    const frame = requestAnimationFrame(goToHash);
    window.addEventListener('hashchange', goToHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', goToHash);
    };
  }, []);

  return null;
}
