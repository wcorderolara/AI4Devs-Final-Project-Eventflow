// US-082 QA-001 (FE) — Unit tests del `EventLanguageSelector`. Verifica renderizado de las 4
// opciones con nombre nativo (fuente única `localeLabels` de US-104), estado `disabled` para
// eventos completed/cancelled (AC-04) y forwarding de props/ref propio de un `<select>`.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EventLanguageSelector } from '@/features/events/components/EventLanguageSelector';

describe('<EventLanguageSelector>', () => {
  it('renderiza las 4 opciones con etiqueta nativa', () => {
    render(<EventLanguageSelector defaultValue="es-LATAM" />);
    expect(screen.getByRole('option', { name: 'Español (LATAM)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Español (España)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Português' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
  });

  it('respeta value/defaultValue como en cualquier <select>', () => {
    render(<EventLanguageSelector defaultValue="pt" data-testid="sel" />);
    expect((screen.getByTestId('sel') as HTMLSelectElement).value).toBe('pt');
  });

  it('disabled bloquea interacción y refleja el atributo (AC-04)', async () => {
    const onChange = vi.fn();
    render(<EventLanguageSelector defaultValue="es-LATAM" disabled onChange={onChange} />);
    const sel = screen.getByRole('combobox') as HTMLSelectElement;
    expect(sel).toBeDisabled();
    await userEvent.selectOptions(sel, 'pt').catch(() => {
      // userEvent en jsdom no dispara change sobre selects disabled — comportamiento esperado.
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reenvía ref al elemento <select> (integración RHF register)', () => {
    const ref = createRef<HTMLSelectElement>();
    render(<EventLanguageSelector ref={ref} defaultValue="en" />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    expect(ref.current?.value).toBe('en');
  });
});
