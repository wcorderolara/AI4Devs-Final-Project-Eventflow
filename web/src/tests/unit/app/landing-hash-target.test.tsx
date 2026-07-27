// Resolución del fragmento al llegar a la landing desde otra página pública.
//
// El App Router escribe `/#features` en la URL pero monta la página arriba del todo: sin esto,
// quien pulsa «Funcionalidades» desde `/vendors` aterriza en la landing sin ver la sección.
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingHashTarget } from '@/features/marketing';

function setHash(hash: string): void {
  window.history.replaceState(null, '', `/${hash}`);
}

/** jsdom no implementa `scrollIntoView`; se instrumenta para observar el destino. */
function stubScrollIntoView(): ReturnType<typeof vi.fn> {
  const spy = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: spy,
  });
  return spy;
}

/** El efecto espera a un frame antes de medir. */
function flushFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
  setHash('');
  document.body.innerHTML = '';
});

describe('<LandingHashTarget>', () => {
  it('desplaza a la sección indicada por el fragmento', async () => {
    const scrollIntoView = stubScrollIntoView();
    const section = document.createElement('section');
    section.id = 'features';
    document.body.append(section);
    setHash('#features');

    render(<LandingHashTarget />);
    await flushFrame();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(section);
  });

  it('mueve el foco a la sección para que el teclado continúe desde ahí', async () => {
    stubScrollIntoView();
    const section = document.createElement('section');
    section.id = 'for-vendors';
    document.body.append(section);
    setHash('#for-vendors');

    render(<LandingHashTarget />);
    await flushFrame();

    expect(document.activeElement).toBe(section);
    // `tabindex="-1"`: enfocable por programa, pero fuera del orden de tabulación.
    expect(section.getAttribute('tabindex')).toBe('-1');

    // El atributo temporal se retira al perder el foco: no queda basura en el DOM.
    section.dispatchEvent(new FocusEvent('blur'));
    expect(section.hasAttribute('tabindex')).toBe(false);
  });

  it('no hace nada sin fragmento', async () => {
    const scrollIntoView = stubScrollIntoView();
    setHash('');

    render(<LandingHashTarget />);
    await flushFrame();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('ignora un fragmento que no corresponde a ninguna sección', async () => {
    const scrollIntoView = stubScrollIntoView();
    setHash('#no-existe');

    render(<LandingHashTarget />);
    await flushFrame();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('no revienta con un fragmento que no es un selector válido', async () => {
    const scrollIntoView = stubScrollIntoView();
    setHash('#123-no-selector');

    expect(() => render(<LandingHashTarget />)).not.toThrow();
    await flushFrame();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('responde a un cambio de fragmento posterior', async () => {
    const scrollIntoView = stubScrollIntoView();
    const first = document.createElement('section');
    first.id = 'how-it-works';
    const second = document.createElement('section');
    second.id = 'features';
    document.body.append(first, second);
    setHash('#how-it-works');

    render(<LandingHashTarget />);
    await flushFrame();
    expect(scrollIntoView.mock.instances[0]).toBe(first);

    setHash('#features');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(scrollIntoView.mock.instances[1]).toBe(second);
  });
});
